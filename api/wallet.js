import { loadAccount, readCookie, spendAccountCredit } from "./_auth.js";
import { noStore, redis } from "./_lib.js";

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
  if (!process.env.AUTH_SECRET) return res.status(503).json({ error: "auth" });

  try {
    const id = readCookie(req);
    if (!id) return res.status(401).json({ error: "auth" });
    const store = redis();
    const acct = await spendAccountCredit(store, id);
    if (!acct) {
      const now = await loadAccount(store, id);
      return res.status(409).json({ error: "credits", credits: now?.credits || 0 });
    }
    return res.status(200).json({ email: acct.email, credits: acct.credits });
  } catch (err) {
    console.error("[wallet]", err);
    return res.status(500).json({ error: "store" });
  }
}
