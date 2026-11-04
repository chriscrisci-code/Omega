import { isEasternFreePlay, noStore } from "./_lib.js";

export default function handler(req, res) {
  noStore(res);
  if (req.method === "OPTIONS") {
    res.setHeader("allow", "GET, OPTIONS");
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    res.setHeader("allow", "GET, OPTIONS");
    return res.status(405).json({ error: "method" });
  }
  return res.status(200).json({ freePlay: isEasternFreePlay() });
}
