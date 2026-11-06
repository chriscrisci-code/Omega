import { clientIp, easternYmd, noStore, redis } from "./_lib.js";

const RATE_KEY = "visits:rate:";
const RATE_MAX = 60;
const RATE_WINDOW = 3600;
const ID_RE = /^[0-9a-zA-Z_-]{8,80}$/;

function kindOf(req, body) {
  if (body.phone === true) return "phone";
  if (body.phone === false) return "desktop";
  return /Mobi|Android|iPhone|iPad|iPod/i.test(String(req.headers["user-agent"] || "")) ? "phone" : "desktop";
}

function visitorId(value) {
  const id = String(value || "").trim();
  return ID_RE.test(id) ? id : "";
}

async function tally(store, key) {
  return Math.max(0, Math.floor(Number(await store.get(key)) || 0));
}

async function snapshot(store) {
  const day = easternYmd();
  return {
    day,
    phone: {
      today: await tally(store, `visits:day:${day}:phone`),
      all: await tally(store, "visits:all:phone"),
    },
    desktop: {
      today: await tally(store, `visits:day:${day}:desktop`),
      all: await tally(store, "visits:all:desktop"),
    },
    remind: {
      today: await tally(store, `visits:day:${day}:remind`),
      all: await tally(store, "visits:all:remind"),
    },
  };
}

export default async function handler(req, res) {
  noStore(res);
  if (req.method === "OPTIONS") {
    res.setHeader("allow", "GET, POST, OPTIONS");
    return res.status(204).end();
  }

  try {
    const store = redis();
    if (req.method === "GET") {
      return res.status(200).json(await snapshot(store));
    }
    if (req.method !== "POST") {
      res.setHeader("allow", "GET, POST, OPTIONS");
      return res.status(405).json({ error: "method" });
    }

    const ip = clientIp(req);
    const hits = await store.incr(RATE_KEY + ip);
    if (hits === 1) await store.expire(RATE_KEY + ip, RATE_WINDOW);
    if (hits > RATE_MAX) return res.status(429).json({ error: "rate" });

    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    if (!body || typeof body !== "object") body = {};
    const id = visitorId(body.id);
    if (!id) return res.status(400).json({ error: "id" });

    const kind = kindOf(req, body);
    const day = easternYmd();
    const fresh = await store.set(`visits:seen:${day}:${id}`, 1, { nx: true, ex: 172800 });
    if (fresh) {
      await store.incr(`visits:all:${kind}`);
      const dayKey = `visits:day:${day}:${kind}`;
      const dayHits = await store.incr(dayKey);
      if (dayHits === 1) await store.expire(dayKey, 4 * 24 * 3600);
    }
    return res.status(200).json(await snapshot(store));
  } catch (err) {
    console.error("[visits]", err);
    if (req.method === "GET") {
      return res.status(200).json({
        day: "",
        phone: { today: 0, all: 0 },
        desktop: { today: 0, all: 0 },
        remind: { today: 0, all: 0 },
      });
    }
    return res.status(500).json({ error: "store" });
  }
}
