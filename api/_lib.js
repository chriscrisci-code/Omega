import { timingSafeEqual } from "node:crypto";
import { Redis } from "@upstash/redis";

export const PACKS = {
  pack5: { credits: 5, env: "STRIPE_PRICE_PACK5" },
  pack50: { credits: 50, env: "STRIPE_PRICE_PACK50" },
};

export const PAY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function pack(sku) {
  const row = PACKS[sku];
  if (!row) return null;
  const price = String(process.env[row.env] || "").trim();
  if (!price.startsWith("price_")) return null;
  return { sku, credits: row.credits, price };
}

export function isPayId(value) {
  return PAY_ID.test(String(value || ""));
}

export function redis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("missing kv");
  return new Redis({ url, token });
}

export function noStore(res) {
  res.setHeader("cache-control", "no-store");
}

export function clientIp(req) {
  const raw = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "";
  return String(raw).split(",")[0].trim() || "local";
}

const FREE_PLAY_ZONE = "America/New_York";
const FREE_PLAY_START_MIN = 15 * 60;
const FREE_PLAY_END_MIN = 16 * 60;
export const FREE_PLAY_KEY = "freeplay:public";

function easternParts(now = Date.now(), extra = {}) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: FREE_PLAY_ZONE,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    ...extra,
  }).formatToParts(new Date(now));
  const get = (type) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

export function isEasternFreePlay(now = Date.now()) {
  const { hour, minute } = easternParts(now);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
  const mins = hour * 60 + minute;
  return mins >= FREE_PLAY_START_MIN && mins < FREE_PLAY_END_MIN;
}

export function easternYmd(now = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FREE_PLAY_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}

export function nextEasternMidnight(now = Date.now()) {
  const start = easternYmd(now);
  if (!start) return now + 24 * 60 * 60 * 1000;
  const rolled = (ms) => easternYmd(ms) !== start;
  let t = now;
  for (let i = 0; i < 48 * 4; i += 1) {
    t += 15 * 60 * 1000;
    if (!rolled(t)) continue;
    let lo = t - 15 * 60 * 1000;
    let hi = t;
    while (hi - lo > 1000) {
      const mid = Math.floor((lo + hi) / 2);
      if (rolled(mid)) hi = mid;
      else lo = mid;
    }
    return hi;
  }
  return now + 24 * 60 * 60 * 1000;
}

export function parsePublicUntil(raw) {
  if (raw == null || raw === false || raw === 0 || raw === "0") return 0;
  if (typeof raw === "string") {
    try {
      return parsePublicUntil(JSON.parse(raw));
    } catch {
      const n = Number(raw);
      return Number.isFinite(n) && n > Date.now() ? n : 0;
    }
  }
  if (typeof raw === "number") return raw > Date.now() ? raw : 0;
  if (typeof raw === "object") {
    const until = Number(raw.until);
    return Number.isFinite(until) && until > Date.now() ? until : 0;
  }
  if (raw === true || raw === 1 || raw === "1") return nextEasternMidnight();
  return 0;
}

export function operatorSecret() {
  return String(process.env.OPERATOR_SECRET || process.env.AUTH_SECRET || "").trim();
}

export function operatorAuthorized(req) {
  const want = operatorSecret();
  const got = String(req.headers["x-2dsg-operator"] || "").trim();
  if (!want || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export function requestOrigin(req) {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim();
  const proto = String(req.headers["x-forwarded-proto"] || "https")
    .split(",")[0]
    .trim();
  if (!host) return "https://www.2dsg.space";
  return `${proto}://${host}`;
}

function sessionKey(id) {
  return `pay:session:${id}`;
}

function pendingKey(payId) {
  return `pay:pending:${payId}`;
}

export async function grantPaidSession(store, session) {
  const paid = session?.payment_status === "paid";
  if (!paid) return { ok: false, reason: "unpaid" };
  const sku = String(session.metadata?.sku || "");
  const item = pack(sku);
  const payId = String(session.metadata?.payId || session.client_reference_id || "");
  const accountId = String(session.metadata?.accountId || "");
  if (!item) return { ok: false, reason: "meta" };
  const id = String(session.id || "");
  if (!id.startsWith("cs_")) return { ok: false, reason: "session" };

  const { addAccountCredits, isAccountId, linkedAccount } = await import("./_auth.js");
  const linked = isAccountId(accountId) ? accountId : await linkedAccount(store, payId);
  if (!linked && !isPayId(payId)) return { ok: false, reason: "meta" };

  const rec = { payId, accountId: linked, credits: item.credits, sku, delivered: 0 };
  const wrote = await store.set(sessionKey(id), rec, { nx: true });
  if (!wrote) return { ok: true, payId, accountId: linked, credits: item.credits, fresh: false };
  if (linked) {
    await addAccountCredits(store, linked, item.credits);
    rec.delivered = item.credits;
    await store.set(sessionKey(id), rec);
  } else {
    await store.sadd(pendingKey(payId), id);
  }
  return { ok: true, payId, accountId: linked, credits: item.credits, fresh: true };
}

export async function claimCredits(store, payId) {
  if (!isPayId(payId)) return 0;
  const ids = (await store.smembers(pendingKey(payId))) || [];
  let credits = 0;
  for (const id of ids) {
    const rec = await store.get(sessionKey(id));
    if (!rec || rec.payId !== payId) continue;
    const add = Math.max(0, Math.floor(Number(rec.credits) || 0) - Math.floor(Number(rec.delivered) || 0));
    if (add > 0) {
      rec.delivered = Math.floor(Number(rec.delivered) || 0) + add;
      await store.set(sessionKey(id), rec);
      credits += add;
    }
    await store.srem(pendingKey(payId), id);
  }
  return credits;
}
