import {
  FREE_PLAY_KEY,
  isEasternFreePlay,
  nextEasternMidnight,
  noStore,
  operatorAuthorized,
  operatorSecret,
  parsePublicUntil,
  redis,
} from "./_lib.js";

const RATE_KEY = "freeplay:rate:";
const RATE_MAX = 30;
const RATE_WINDOW = 3600;

function clientIp(req) {
  const raw = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "";
  return String(raw).split(",")[0].trim() || "local";
}

function payload(until, now = Date.now()) {
  const hour = isEasternFreePlay(now);
  const publicOn = until > now;
  return {
    freePlay: publicOn || hour,
    publicOn,
    hour,
    until: publicOn ? until : 0,
  };
}

async function readUntil(store) {
  try {
    return parsePublicUntil(await store.get(FREE_PLAY_KEY));
  } catch {
    return 0;
  }
}

export default async function handler(req, res) {
  noStore(res);
  if (req.method === "OPTIONS") {
    res.setHeader("allow", "GET, POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method === "GET") {
    try {
      return res.status(200).json(payload(await readUntil(redis())));
    } catch {
      return res.status(200).json(payload(0));
    }
  }

  if (req.method !== "POST") {
    res.setHeader("allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "method" });
  }

  if (!operatorSecret()) return res.status(503).json({ error: "operator" });
  if (!operatorAuthorized(req)) return res.status(401).json({ error: "key" });

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  if (!body || typeof body !== "object") body = {};
  const on = Boolean(body.on);

  try {
    const store = redis();
    const ip = clientIp(req);
    const hits = await store.incr(RATE_KEY + ip);
    if (hits === 1) await store.expire(RATE_KEY + ip, RATE_WINDOW);
    if (hits > RATE_MAX) return res.status(429).json({ error: "rate" });

    if (on) await store.set(FREE_PLAY_KEY, { until: nextEasternMidnight() });
    else await store.del(FREE_PLAY_KEY);
    return res.status(200).json(payload(await readUntil(store)));
  } catch (err) {
    console.error("[freeplay]", err);
    return res.status(500).json({ error: "store" });
  }
}
