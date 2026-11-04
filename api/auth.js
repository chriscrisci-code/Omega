import {
  clearCookieHeader,
  cookieHeader,
  createMagicLink,
  getOrCreateAccount,
  loadAccount,
  mergeGuest,
  normalizeEmail,
  readCookie,
  sendMagicMail,
  takeMagicLink,
} from "./_auth.js";
import { noStore, redis, requestOrigin } from "./_lib.js";

function queryOf(req) {
  if (req.query && typeof req.query === "object") return req.query;
  try {
    return Object.fromEntries(new URL(req.url, "http://local").searchParams);
  } catch {
    return {};
  }
}

function clientIp(req) {
  const raw = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "";
  return String(raw).split(",")[0].trim() || "local";
}

export default async function handler(req, res) {
  noStore(res);
  if (req.method === "OPTIONS") {
    res.setHeader("allow", "GET, POST, DELETE, OPTIONS");
    return res.status(204).end();
  }

  const origin = requestOrigin(req);
  if (!process.env.AUTH_SECRET) return res.status(503).json({ error: "auth" });

  try {
    const store = redis();

    if (req.method === "GET") {
      const query = queryOf(req);
      const token = String(query.token || query.auth || "");
      if (token) {
        const email = await takeMagicLink(store, token);
        if (!email) return res.status(400).json({ error: "link" });
        const acct = await getOrCreateAccount(store, email);
        await mergeGuest(store, acct, query.payId, query.credits);
        res.setHeader("Set-Cookie", cookieHeader(acct.id, origin));
        return res.status(200).json({ email: acct.email, credits: acct.credits });
      }
      const id = readCookie(req);
      const acct = await loadAccount(store, id);
      if (!acct) return res.status(200).json({ guest: true });
      return res.status(200).json({ email: acct.email, credits: acct.credits });
    }

    if (req.method === "POST") {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const email = normalizeEmail(body.email);
      if (!email) return res.status(400).json({ error: "email" });
      const ip = clientIp(req);
      const hits = await store.incr(`auth:rate:${ip}`);
      if (hits === 1) await store.expire(`auth:rate:${ip}`, 3600);
      if (hits > 12) return res.status(429).json({ error: "rate" });
      const token = await createMagicLink(store, email);
      await sendMagicMail(origin, email, token);
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      res.setHeader("Set-Cookie", clearCookieHeader(origin));
      return res.status(200).json({ guest: true });
    }

    res.setHeader("allow", "GET, POST, DELETE, OPTIONS");
    return res.status(405).json({ error: "method" });
  } catch (err) {
    console.error("[auth]", err);
    const missing = String(err?.message || "") === "mail";
    return res.status(missing ? 503 : 500).json({ error: missing ? "mail" : "auth" });
  }
}
