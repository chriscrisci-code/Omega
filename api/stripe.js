import Stripe from "stripe";
import { grantPaidSession, noStore, redis } from "./_lib.js";

export const config = {
  api: { bodyParser: false },
};

async function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  noStore(res);
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return res.status(405).json({ error: "method" });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  const hook = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !hook) return res.status(503).json({ error: "stripe" });

  let event;
  try {
    const stripe = new Stripe(secret);
    const body = await rawBody(req);
    event = stripe.webhooks.constructEvent(body, req.headers["stripe-signature"], hook);
  } catch (err) {
    console.error("[stripe] signature", err);
    return res.status(400).json({ error: "sig" });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await grantPaidSession(redis(), event.data.object);
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[stripe]", err);
    return res.status(500).json({ error: "store" });
  }
}
