import { normalizeEmail } from "./_auth.js";
import { clientIp, easternYmd, noStore, redis, requestOrigin } from "./_lib.js";

const RATE_KEY = "remind:rate:";
const MAIL_KEY = "remind:mail:";
const RATE_MAX = 8;
const MAIL_MAX = 3;
const RATE_WINDOW = 3600;

async function markRemind(store) {
  const day = easternYmd();
  await store.incr("visits:all:remind");
  const dayKey = `visits:day:${day}:remind`;
  const hits = await store.incr(dayKey);
  if (hits === 1) await store.expire(dayKey, 4 * 24 * 3600);
}

async function sendRemindMail(origin, email) {
  const key = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.RESEND_FROM || "").trim();
  if (!key || !from) throw new Error("mail");
  const { Resend } = await import("resend");
  const resend = new Resend(key);
  const url = origin || "https://www.2dsg.space";
  const result = await resend.emails.send({
    from,
    to: email,
    subject: "Play 2DSG on your computer",
    text: `2DSG is a neon vector arcade built for desktop.\n\nOpen this on your computer:\n${url}\n`,
  });
  if (result.error) throw new Error(result.error.message || "mail");
}

export default async function handler(req, res) {
  noStore(res);
  if (req.method === "OPTIONS") {
    res.setHeader("allow", "POST, OPTIONS");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("allow", "POST, OPTIONS");
    return res.status(405).json({ error: "method" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  if (!body || typeof body !== "object") body = {};
  const email = normalizeEmail(body.email);
  if (!email) return res.status(400).json({ error: "email" });

  try {
    const store = redis();
    const ip = clientIp(req);
    const hits = await store.incr(RATE_KEY + ip);
    if (hits === 1) await store.expire(RATE_KEY + ip, RATE_WINDOW);
    if (hits > RATE_MAX) return res.status(429).json({ error: "rate" });

    const mails = await store.incr(MAIL_KEY + email);
    if (mails === 1) await store.expire(MAIL_KEY + email, RATE_WINDOW);
    if (mails > MAIL_MAX) return res.status(429).json({ error: "rate" });

    await sendRemindMail(requestOrigin(req), email);
    await markRemind(store);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[remind]", err);
    const missing = String(err?.message || "") === "mail";
    return res.status(missing ? 503 : 500).json({ error: missing ? "mail" : "send" });
  }
}
