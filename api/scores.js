import { Redis } from "@upstash/redis";
import { applyScoreToBoards, emptyGlobalBoards, normalizeGlobalBoards } from "../src/game/storage/boards.js";

const KEY = "omega:boards";
const RATE_KEY = "omega:scores:rate:";
const RATE_MAX = 40;
const RATE_WINDOW = 3600;

function redis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("missing kv");
  return new Redis({ url, token });
}

function clientIp(req) {
  const raw = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "";
  return String(raw).split(",")[0].trim() || "local";
}

async function loadBoards(store) {
  const raw = await store.get(KEY);
  const boards = raw ? normalizeGlobalBoards(raw) : emptyGlobalBoards();
  if (!raw) await store.set(KEY, boards);
  return boards;
}

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (req.method === "OPTIONS") {
    res.setHeader("allow", "GET, POST, OPTIONS");
    return res.status(204).end();
  }

  try {
    const store = redis();
    if (req.method === "GET") {
      return res.status(200).json({ boards: await loadBoards(store) });
    }

    if (req.method !== "POST") {
      res.setHeader("allow", "GET, POST, OPTIONS");
      return res.status(405).json({ error: "method" });
    }

    const ip = clientIp(req);
    const hits = await store.incr(RATE_KEY + ip);
    if (hits === 1) await store.expire(RATE_KEY + ip, RATE_WINDOW);
    if (hits > RATE_MAX) return res.status(429).json({ error: "rate" });

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const boards = applyScoreToBoards(await loadBoards(store), body.name, body.score, body.ace);
    await store.set(KEY, boards);
    return res.status(200).json({ boards });
  } catch (err) {
    console.error("[scores]", err);
    return res.status(500).json({ error: "store" });
  }
}
