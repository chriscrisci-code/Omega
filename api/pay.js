import Stripe from "stripe";
import { loadAccount, readCookie } from "./_auth.js";
import { claimCredits, grantPaidSession, isPayId, noStore, redis } from "./_lib.js";

export default async function handler(req, res) {
  noStore(res);
  if (req.method === "OPTIONS") {
    res.setHeader("allow", "GET, OPTIONS");
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    res.setHeader("allow", "GET, OPTIONS");
    return res.status(405).json({ error: "method" });
  }

  const query = req.query && typeof req.query === "object" ? req.query : Object.fromEntries(new URL(req.url, "http://local").searchParams);
  const payId = String(query.payId || "");
  const sessionId = String(query.session || "");
  if (payId && !isPayId(payId)) return res.status(400).json({ error: "payId" });

  try {
    const store = redis();
    const accountId = readCookie(req);
    if (sessionId.startsWith("cs_") && process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const metaPay = String(session.metadata?.payId || session.client_reference_id || "");
      const metaAcct = String(session.metadata?.accountId || "");
      const match = (payId && metaPay === payId) || (accountId && metaAcct === accountId);
      if (match) await grantPaidSession(store, session);
    }
    const added = isPayId(payId) && !accountId ? await claimCredits(store, payId) : 0;
    const acct = await loadAccount(store, accountId);
    return res.status(200).json({
      credits: added,
      account: acct ? { email: acct.email, credits: acct.credits } : null,
    });
  } catch (err) {
    console.error("[pay]", err);
    return res.status(500).json({ error: "store" });
  }
}
