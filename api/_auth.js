import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { claimCredits, isPayId } from "./_lib.js";

export const COOKIE = "2dsg_acct";
const LINK_MS = 15 * 60 * 1000;
const COOKIE_MS = 90 * 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return EMAIL_RE.test(email) && email.length <= 120 ? email : "";
}

export function isAccountId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function secret() {
  return String(process.env.AUTH_SECRET || "").trim();
}

function emailKey(email) {
  return `acct:email:${email}`;
}

function acctKey(id) {
  return `acct:${id}`;
}

function linkKey(token) {
  return `auth:link:${token}`;
}

function payLinkKey(payId) {
  return `pay:link:${payId}`;
}

function sign(value) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function readCookie(req) {
  if (!secret()) return "";
  const raw = String(req.headers.cookie || "");
  const hit = raw.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
  if (!hit) return "";
  const token = hit.slice(COOKIE.length + 1);
  const dot = token.lastIndexOf(".");
  if (dot < 1) return "";
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expect = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "";
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!isAccountId(payload.id) || Number(payload.exp) < Date.now()) return "";
    return payload.id;
  } catch {
    return "";
  }
}

export function cookieHeader(accountId, origin) {
  const payload = Buffer.from(JSON.stringify({ id: accountId, exp: Date.now() + COOKIE_MS }), "utf8").toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  const secure = String(origin || "").startsWith("https:");
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(COOKIE_MS / 1000)}${secure ? "; Secure" : ""}`;
}

export function clearCookieHeader(origin) {
  const secure = String(origin || "").startsWith("https:");
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export async function loadAccount(store, id) {
  if (!isAccountId(id)) return null;
  const raw = await store.get(acctKey(id));
  if (!raw || typeof raw !== "object") return null;
  return {
    id,
    email: normalizeEmail(raw.email),
    credits: Math.max(0, Math.min(199, Math.floor(Number(raw.credits) || 0))),
    payIds: Array.isArray(raw.payIds) ? raw.payIds.filter(isPayId) : [],
  };
}

export async function saveAccount(store, acct) {
  await store.set(acctKey(acct.id), {
    email: acct.email,
    credits: acct.credits,
    payIds: acct.payIds,
  });
}

export async function getOrCreateAccount(store, email) {
  const existing = await store.get(emailKey(email));
  if (isAccountId(existing)) {
    const acct = await loadAccount(store, existing);
    if (acct) return acct;
  }
  const id = randomUUID();
  const acct = { id, email, credits: 0, payIds: [] };
  await saveAccount(store, acct);
  await store.set(emailKey(email), id);
  return acct;
}

export async function addAccountCredits(store, accountId, n) {
  const acct = await loadAccount(store, accountId);
  if (!acct) return null;
  const add = Math.max(0, Math.floor(Number(n) || 0));
  acct.credits = Math.max(0, Math.min(199, acct.credits + add));
  await saveAccount(store, acct);
  return acct;
}

export async function spendAccountCredit(store, accountId) {
  const acct = await loadAccount(store, accountId);
  if (!acct || acct.credits < 1) return null;
  acct.credits -= 1;
  await saveAccount(store, acct);
  return acct;
}

export async function linkedAccount(store, payId) {
  if (!isPayId(payId)) return "";
  const id = await store.get(payLinkKey(payId));
  return isAccountId(id) ? id : "";
}

export async function mergeGuest(store, acct, payId, localCredits) {
  const guest = await claimCredits(store, payId);
  const linked = await linkedAccount(store, payId);
  const already = Boolean(linked) && linked === acct.id;
  const extra = already ? 0 : Math.max(0, Math.min(199, Math.floor(Number(localCredits) || 0)));
  acct.credits = Math.max(0, Math.min(199, acct.credits + guest + extra));
  if (isPayId(payId) && !acct.payIds.includes(payId)) acct.payIds.push(payId);
  if (isPayId(payId)) await store.set(payLinkKey(payId), acct.id);
  await saveAccount(store, acct);
  return acct;
}

export async function createMagicLink(store, email) {
  const token = randomBytes(24).toString("base64url");
  await store.set(linkKey(token), { email, exp: Date.now() + LINK_MS }, { ex: 20 * 60 });
  return token;
}

export async function takeMagicLink(store, token) {
  const rec = await store.get(linkKey(token));
  if (!rec) return "";
  await store.del(linkKey(token));
  if (Number(rec.exp) < Date.now()) return "";
  return normalizeEmail(rec.email);
}

export async function sendMagicMail(origin, email, token) {
  const key = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.RESEND_FROM || "").trim();
  if (!key || !from) throw new Error("mail");
  const { Resend } = await import("resend");
  const resend = new Resend(key);
  const url = `${origin}/?auth=${encodeURIComponent(token)}`;
  const result = await resend.emails.send({
    from,
    to: email,
    subject: "2DSG sign in",
    text: `Sign in to 2DSG (link expires in 15 minutes):\n${url}\n\nIf you did not request this, ignore the email.`,
  });
  if (result.error) throw new Error(result.error.message || "mail");
}
