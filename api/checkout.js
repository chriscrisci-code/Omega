import Stripe from "stripe";
import { loadAccount, readCookie } from "./_auth.js";
import { isPayId, noStore, pack, redis, requestOrigin } from "./_lib.js";

const RATE_KEY = "pay:checkout:rate:";
const RATE_MAX = 20;
const RATE_WINDOW = 3600;

function clientIp(req) {
  const raw = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "";
  return String(raw).split(",")[0].trim() || "local";
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

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return res.status(503).json({ error: "stripe" });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const item = pack(body.sku);
  const payId = String(body.payId || "");
  if (!item || !isPayId(payId)) return res.status(400).json({ error: "pack" });

  try {
    const store = redis();
    const ip = clientIp(req);
    const hits = await store.incr(RATE_KEY + ip);
    if (hits === 1) await store.expire(RATE_KEY + ip, RATE_WINDOW);
    if (hits > RATE_MAX) return res.status(429).json({ error: "rate" });

    const origin = requestOrigin(req);
    const account = await loadAccount(store, readCookie(req));
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: account?.id || payId,
      customer_email: account?.email || undefined,
      line_items: [{ price: item.price, quantity: 1 }],
      success_url: `${origin}/?paid={CHECKOUT_SESSION_ID}`,
      cancel_url: origin,
      metadata: {
        sku: item.sku,
        payId,
        credits: String(item.credits),
        ...(account ? { accountId: account.id } : {}),
      },
      custom_text: {
        submit: { message: "ALL CREDIT PURCHASES ARE FINAL." },
      },
    });
    if (!session.url) return res.status(500).json({ error: "session" });
    return res.status(200).json({ url: session.url, id: session.id });
  } catch (err) {
    console.error("[checkout]", err);
    return res.status(500).json({ error: "stripe" });
  }
}
