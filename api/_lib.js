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

const FREE_PLAY_ZONE = "America/New_York";
const FREE_PLAY_START_MIN = 15 * 60;
const FREE_PLAY_END_MIN = 16 * 60;

export function isEasternFreePlay(now = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: FREE_PLAY_ZONE,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
  const mins = hour * 60 + minute;
  return mins >= FREE_PLAY_START_MIN && mins < FREE_PLAY_END_MIN;
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
