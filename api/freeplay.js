import {
  FREE_PLAY_KEY,
  isEasternFreePlay,
  noStore,
  operatorAuthorized,
  operatorSecret,
  parsePublicOn,
  redis,
} from "./_lib.js";

const RATE_KEY = "freeplay:rate:";
const RATE_MAX = 30;
const RATE_WINDOW = 3600;

function clientIp(req) {
  const raw = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "";
  return String(raw).split(",")[0].trim() || "local";
}

function payload(publicOn, now = Date.now()) {
  const hour = isEasternFreePlay(now);
  const on = Boolean(publicOn);
  return {
    freePlay: on || hour,
    publicOn: on,
    hour,
    until: 0,
  };
}

function stickyRecord(raw) {
  return raw && typeof raw === "object" && raw.on === true;
}

async function readOn(store) {
  try {
    const raw = await store.get(FREE_PLAY_KEY);
    const on = parsePublicOn(raw);
    if (on && !stickyRecord(raw)) await store.set(FREE_PLAY_KEY, { on: true });
    return on;
  } catch {
    return false;
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
      return res.status(200).json(payload(await readOn(redis())));
    } catch {
      return res.status(200).json(payload(false));
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

    if (on) await store.set(FREE_PLAY_KEY, { on: true });
    else await store.del(FREE_PLAY_KEY);
    return res.status(200).json(payload(await readOn(store)));
  } catch (err) {
    console.error("[freeplay]", err);
    return res.status(500).json({ error: "store" });
  }
}
