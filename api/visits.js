import { clientIp, easternYmd, hashIp, noStore, redis } from "./_lib.js";

const RATE_KEY = "visits:rate:";
const RATE_MAX = 240;
const RATE_WINDOW = 3600;
const ID_RE = /^[0-9a-zA-Z_-]{8,80}$/;
const DAY_TTL = 4 * 24 * 3600;

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

async function bumpDay(store, key) {
  const n = await store.incr(key);
  if (n === 1) await store.expire(key, DAY_TTL);
  return n;
}

async function skipped(store, id) {
  if (!id) return false;
  return Boolean(await store.get(`visits:skip:${id}`));
}

function empty(day = "") {
  return {
    day,
    phone: { today: 0, all: 0 },
    desktop: { today: 0, all: 0 },
    ip: { today: 0, all: 0 },
    remind: { today: 0, all: 0 },
    play: {
      today: { games: 0, players: 0, ms: 0 },
      all: { games: 0, players: 0, ms: 0 },
    },
  };
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
    ip: {
      today: await tally(store, `visits:day:${day}:ip`),
      all: await tally(store, "visits:all:ip"),
    },
    remind: {
      today: await tally(store, `visits:day:${day}:remind`),
      all: await tally(store, "visits:all:remind"),
    },
    play: {
      today: {
        games: await tally(store, `play:day:${day}:games`),
        players: await tally(store, `play:day:${day}:players`),
        ms: (await tally(store, `play:day:${day}:sec`)) * 1000,
      },
      all: {
        games: await tally(store, "play:all:games"),
        players: await tally(store, "play:all:players"),
        ms: (await tally(store, "play:all:sec")) * 1000,
      },
    },
  };
}

async function markVisit(store, req, id, kind) {
  const day = easternYmd();
  const fresh = await store.set(`visits:seen:${day}:${id}`, 1, { nx: true, ex: 172800 });
  if (fresh) {
    await store.incr(`visits:all:${kind}`);
    await bumpDay(store, `visits:day:${day}:${kind}`);
  }
  const ip = hashIp(clientIp(req));
  const ipDay = await store.set(`visits:ipday:${day}:${ip}`, 1, { nx: true, ex: 172800 });
  if (ipDay) await bumpDay(store, `visits:day:${day}:ip`);
  const ipAll = await store.set(`visits:ipseen:${ip}`, 1, { nx: true });
  if (ipAll) await store.incr("visits:all:ip");
}

async function markPlay(store, id, run, ms) {
  const day = easternYmd();
  const sec = Math.max(0, Math.min(60, Math.floor(Number(ms) / 1000)));
  if (run) {
    const freshRun = await store.set(`play:run:${run}`, 1, { nx: true, ex: 172800 });
    if (freshRun) {
      await store.incr("play:all:games");
      await bumpDay(store, `play:day:${day}:games`);
    }
  }
  const playerDay = await store.set(`play:player:${day}:${id}`, 1, { nx: true, ex: 172800 });
  if (playerDay) await bumpDay(store, `play:day:${day}:players`);
  const playerAll = await store.set(`play:ever:${id}`, 1, { nx: true });
  if (playerAll) await store.incr("play:all:players");
  if (sec > 0) {
    await store.incrby("play:all:sec", sec);
    const daySec = `play:day:${day}:sec`;
    const n = await store.incrby(daySec, sec);
    if (n === sec) await store.expire(daySec, DAY_TTL);
  }
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
    if (await skipped(store, id)) return res.status(200).json(await snapshot(store));

    if (body.play) {
      await markPlay(store, id, visitorId(body.run), body.ms);
    } else {
      await markVisit(store, req, id, kindOf(req, body));
    }
    return res.status(200).json(await snapshot(store));
  } catch (err) {
    console.error("[visits]", err);
    if (req.method === "GET") {
      return res.status(200).json(empty());
    }
    return res.status(500).json({ error: "store" });
  }
}
