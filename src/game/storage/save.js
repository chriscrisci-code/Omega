import { shipLevels } from "../config.js";

const KEY = "vector-game-save";

export const SCORE_SLOTS = 8;
export const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const DEFAULT_SCORES = [
  { name: "ACE", score: 75000 },
  { name: "MAX", score: 60000 },
  { name: "REX", score: 48000 },
  { name: "ZOE", score: 36000 },
  { name: "KAI", score: 28000 },
  { name: "NIX", score: 20000 },
  { name: "BOB", score: 14000 },
  { name: "DOT", score: 8000 },
];

const DEFAULT_STREAKS = [
  { name: "ACE", score: 36 },
  { name: "MAX", score: 28 },
  { name: "REX", score: 22 },
  { name: "ZOE", score: 18 },
  { name: "KAI", score: 14 },
  { name: "NIX", score: 11 },
  { name: "BOB", score: 8 },
  { name: "DOT", score: 5 },
];

export const SCORE_BOARDS = [
  { id: "all", title: "ALL TIME" },
  { id: "daily", title: "DAILY" },
  { id: "streak", title: "KILL STREAK" },
];

const empty = {
  highScore: 0,
  maxWave: 1,
  shipId: "WEDGE",
  macro: [],
  highScores: DEFAULT_SCORES,
  dailyScores: [],
  killStreaks: DEFAULT_STREAKS,
  loadout: {
    gun: 1,
    missile: 1,
    emp: 1,
    shield: 1,
    points: 0,
    bank: 0,
  },
  settings: {
    fullscreen: false,
    difficulty: "easy",
    controls: "",
  },
};

const MACRO_IDS = new Set(["shield-on", "shield-off", "warp", "emp", "missile", "fire", "cycle"]);

function normalizeMacro(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((id) => MACRO_IDS.has(id)).slice(0, 12);
}

function cleanName(name) {
  const letters = String(name || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3)
    .padEnd(3, "A");
  return letters;
}

export function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
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

export function normalizeStreaks(list) {
  return rankRows(list, DEFAULT_STREAKS).map(({ name, score }) => ({ name, score }));
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

export function insertStreak(table, name, score) {
  return normalizeStreaks([...table, { name, score }]);
}

function clampLevel(value, max) {
  return Math.max(1, Math.min(max, Math.floor(Number(value) || 1)));
}

export function normalizeLoadout(data) {
  const src = data && typeof data === "object" ? data : {};
  return {
    gun: clampLevel(src.gun, shipLevels.gun || 5),
    missile: clampLevel(src.missile, shipLevels.missile || 7),
    emp: clampLevel(src.emp, shipLevels.emp || 4),
    shield: clampLevel(src.shield, shipLevels.shield || 4),
    points: Math.max(0, Math.floor(Number(src.points) || 0)),
    bank: Math.max(0, Math.floor(Number(src.bank) || 0) % 3),
  };
}

function normalize(data) {
  if (!data || typeof data !== "object") {
    return {
      ...empty,
      settings: { ...empty.settings },
      loadout: { ...empty.loadout },
      macro: [],
      highScores: normalizeHighScores(null),
      dailyScores: normalizeDailyScores(null),
      killStreaks: normalizeStreaks(null),
    };
  }
  const highScores = normalizeHighScores(data.highScores);
  const dailyScores = normalizeDailyScores(data.dailyScores);
  const killStreaks = normalizeStreaks(data.killStreaks);
  return {
    highScore: Math.max(Number(data.highScore) || 0, highScores[0]?.score || 0),
    maxWave: Math.max(1, Math.floor(Number(data.maxWave) || 1)),
    shipId: typeof data.shipId === "string" && data.shipId ? data.shipId : "WEDGE",
    loadout: normalizeLoadout(data.loadout),
    macro: normalizeMacro(data.macro),
    highScores,
    dailyScores,
    killStreaks,
    settings: {
      fullscreen: Boolean(data.settings?.fullscreen),
      difficulty: data.settings?.difficulty === "hard" || data.settings?.difficulty === "medium" ? data.settings.difficulty : "easy",
      controls: data.settings?.controls === "phone" || data.settings?.controls === "desktop" ? data.settings.controls : "",
    },
  };
}

/** Browser adapter. A Steam/desktop shell can swap this for cloud or file I/O. */
export const localStorageAdapter = {
  load() {
    try {
      return normalize(JSON.parse(localStorage.getItem(KEY) || "null"));
    } catch {
      return normalize(null);
    }
  },
  save(data) {
    localStorage.setItem(KEY, JSON.stringify(normalize(data)));
  },
};
