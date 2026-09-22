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

const empty = {
  highScore: 0,
  shipId: "WEDGE",
  macro: [],
  highScores: DEFAULT_SCORES,
  settings: {
    fullscreen: false,
    difficulty: "easy",
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

export function normalizeHighScores(list) {
  const rows = (Array.isArray(list) ? list : [])
    .map((row) => ({
      name: cleanName(row?.name),
      score: Math.max(0, Math.floor(Number(row?.score) || 0)),
    }))
    .filter((row) => row.score > 0);
  const merged = rows.length ? rows : DEFAULT_SCORES.map((row) => ({ ...row }));
  merged.sort((a, b) => b.score - a.score);
  return merged.slice(0, SCORE_SLOTS);
}

export function scoreQualifies(score, table) {
  const value = Math.max(0, Math.floor(Number(score) || 0));
  if (value <= 0) return false;
  if (table.length < SCORE_SLOTS) return true;
  return value > table[table.length - 1].score;
}

export function insertHighScore(table, name, score) {
  const next = normalizeHighScores([...table, { name, score }]);
  return next;
}

function normalize(data) {
  if (!data || typeof data !== "object") {
    return { ...empty, settings: { ...empty.settings }, macro: [], highScores: normalizeHighScores(null) };
  }
  const highScores = normalizeHighScores(data.highScores);
  return {
    highScore: Math.max(Number(data.highScore) || 0, highScores[0]?.score || 0),
    shipId: typeof data.shipId === "string" && data.shipId ? data.shipId : "WEDGE",
    macro: normalizeMacro(data.macro),
    highScores,
    settings: {
      fullscreen: Boolean(data.settings?.fullscreen),
      difficulty: data.settings?.difficulty === "hard" || data.settings?.difficulty === "medium" ? data.settings.difficulty : "easy",
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
