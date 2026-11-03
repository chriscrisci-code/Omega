export const SCORE_SLOTS = 8;

export const DEFAULT_SCORES = [
  { name: "ACE", score: 75000 },
  { name: "MAX", score: 60000 },
  { name: "REX", score: 48000 },
  { name: "ZOE", score: 36000 },
  { name: "KAI", score: 28000 },
  { name: "NIX", score: 20000 },
  { name: "BOB", score: 14000 },
  { name: "DOT", score: 8000 },
];

export const DEFAULT_ACES = [
  { name: "ACE", score: 48 },
  { name: "MAX", score: 36 },
  { name: "REX", score: 28 },
  { name: "ZOE", score: 22 },
  { name: "KAI", score: 16 },
  { name: "NIX", score: 12 },
  { name: "BOB", score: 8 },
  { name: "DOT", score: 4 },
];

export const SCORE_BOARDS = [
  { id: "all", title: "ALL TIME" },
  { id: "daily", title: "DAILY" },
  { id: "ace", title: "ALL TIME TOP ACE" },
  { id: "aceDaily", title: "TODAY'S TOP ACE" },
];

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function cleanName(name) {
  const letters = String(name || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3)
    .padEnd(3, "A");
  return letters;
}

function rankRows(list, fallback) {
  const rows = (Array.isArray(list) ? list : [])
    .map((row) => ({
      name: cleanName(row?.name),
      score: Math.max(0, Math.floor(Number(row?.score) || 0)),
      day: typeof row?.day === "string" ? row.day : "",
    }))
    .filter((row) => row.score > 0);
  const merged = rows.length || !fallback ? rows : fallback.map((row) => ({ ...row }));
  merged.sort((a, b) => b.score - a.score);
  return merged.slice(0, SCORE_SLOTS);
}

export function normalizeHighScores(list) {
  return rankRows(list, DEFAULT_SCORES).map(({ name, score }) => ({ name, score }));
}

export function normalizeDailyScores(list) {
  const day = todayKey();
  return rankRows(list, null)
    .filter((row) => row.day === day)
    .map(({ name, score, day: when }) => ({ name, score, day: when }));
}

export function normalizeAceScores(list) {
  return rankRows(list, DEFAULT_ACES).map(({ name, score }) => ({ name, score }));
}

export function normalizeDailyAce(list) {
  const day = todayKey();
  return rankRows(list, null)
    .filter((row) => row.day === day)
    .map(({ name, score, day: when }) => ({ name, score, day: when }));
}

export function padScoreRows(list) {
  const rows = (Array.isArray(list) ? list : []).map((row) => ({
    name: cleanName(row?.name),
    score: Math.max(0, Math.floor(Number(row?.score) || 0)),
  }));
  while (rows.length < SCORE_SLOTS) rows.push({ name: "---", score: 0 });
  return rows.slice(0, SCORE_SLOTS);
}

export function scoreQualifies(score, table) {
  const value = Math.max(0, Math.floor(Number(score) || 0));
  if (value <= 0) return false;
  if (table.length < SCORE_SLOTS) return true;
  return value > table[table.length - 1].score;
}

export function insertHighScore(table, name, score) {
  return normalizeHighScores([...table, { name, score }]);
}

export function insertDailyScore(table, name, score) {
  return normalizeDailyScores([...table, { name, score, day: todayKey() }]);
}

export function insertAceScore(table, name, score) {
  return normalizeAceScores([...table, { name, score }]);
}

export function insertDailyAce(table, name, score) {
  return normalizeDailyAce([...table, { name, score, day: todayKey() }]);
}

export function emptyGlobalBoards() {
  return {
    all: normalizeHighScores(null),
    daily: normalizeDailyScores(null),
    ace: normalizeAceScores(null),
    aceDaily: normalizeDailyAce(null),
  };
}

export function normalizeGlobalBoards(data) {
  if (!data || typeof data !== "object") return emptyGlobalBoards();
  return {
    all: normalizeHighScores(data.all),
    daily: normalizeDailyScores(data.daily),
    ace: normalizeAceScores(data.ace),
    aceDaily: normalizeDailyAce(data.aceDaily),
  };
}

export function applyScoreToBoards(boards, name, score, ace) {
  const next = normalizeGlobalBoards(boards);
  const initials = cleanName(name);
  const points = Math.max(0, Math.floor(Number(score) || 0));
  const acePoints = Math.max(0, Math.floor(Number(ace) || 0));
  if (points > 0) {
    next.all = insertHighScore(next.all, initials, points);
    next.daily = insertDailyScore(next.daily, initials, points);
  }
  if (acePoints > 0) {
    next.ace = insertAceScore(next.ace, initials, acePoints);
    next.aceDaily = insertDailyAce(next.aceDaily, initials, acePoints);
  }
  return next;
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function withTimeout(ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(timer) };
}

export async function fetchGlobalBoards() {
  const wait = withTimeout(8000);
  try {
    const res = await fetch("/api/scores", { method: "GET", signal: wait.signal });
    if (!res.ok) return null;
    const body = await readJson(res);
    if (!body?.boards) return null;
    return normalizeGlobalBoards(body.boards);
  } catch {
    return null;
  } finally {
    wait.done();
  }
}

export async function submitGlobalScore(name, score, ace) {
  const wait = withTimeout(8000);
  try {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, score, ace }),
      signal: wait.signal,
    });
    if (!res.ok) return null;
    const body = await readJson(res);
    if (!body?.boards) return null;
    return normalizeGlobalBoards(body.boards);
  } catch {
    return null;
  } finally {
    wait.done();
  }
}
