import { missiles, shipLevels, xp } from "../config.js";
import { guessProfile, normalizeBinds } from "../input/bindings.js";
import { DEFAULT_SHIP_ID, PLAYABLE_SHIP_IDS, resolveShipId } from "../ships/catalog.js";

const KEY = "vector-game-save";

export const SCORE_SLOTS = 8;
export const SAVE_SLOT_COUNT = 5;
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

const DEFAULT_ACES = [
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

const empty = {
  highScore: 0,
  xp: 0,
  maxWave: 1,
  shipId: DEFAULT_SHIP_ID,
  macro: [],
  highScores: DEFAULT_SCORES,
  dailyScores: [],
  aceScores: DEFAULT_ACES,
  dailyAce: [],
  loadout: {
    gun: 1,
    missile: 1,
    emp: 1,
    shield: 1,
    gunship: 0,
    points: 0,
    bank: 0,
    ammo: 6,
  },
  checkpoint: null,
  slots: [null, null, null, null, null],
  settings: {
    fullscreen: false,
    difficulty: "easy",
    controls: "",
    profile: "",
    binds: null,
    music: 0.2,
    song: 2,
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

function clampMusic(value) {
  if (value == null || value === "") return 0.2;
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.2;
  return Math.max(0, Math.min(1, n));
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

function clampLevel(value, max) {
  return Math.max(1, Math.min(max, Math.floor(Number(value) || 1)));
}

export function missileAmmoCap(level) {
  const n = clampLevel(level, shipLevels.missile || 7);
  return n * (missiles.ammoPerLevel || 6);
}

export function normalizeLoadout(data) {
  const src = data && typeof data === "object" ? data : {};
  const missile = clampLevel(src.missile, shipLevels.missile || 7);
  const cap = missileAmmoCap(missile);
  const ammo =
    src.ammo == null || src.ammo === ""
      ? cap
      : Math.max(0, Math.min(cap, Math.floor(Number(src.ammo) || 0)));
  return {
    gun: clampLevel(src.gun, shipLevels.gun || 5),
    missile,
    emp: clampLevel(src.emp, shipLevels.emp || 4),
    shield: clampLevel(src.shield, shipLevels.shield || 4),
    gunship: Math.max(0, Math.min(shipLevels.gunship || 2, Math.floor(Number(src.gunship) || 0))),
    points: Math.max(0, Math.floor(Number(src.points) || 0)),
    bank: Math.max(0, Math.floor(Number(src.bank) || 0) % (xp.orePerPoint || 5)),
    ammo,
  };
}

export function normalizeHulls(data) {
  if (!data || typeof data !== "object") return {};
  const out = {};
  for (const id of PLAYABLE_SHIP_IDS) {
    if (!data[id]) continue;
    const row = normalizeLoadout(data[id]);
    out[id] = { gun: row.gun, missile: row.missile, emp: row.emp, shield: row.shield, gunship: row.gunship };
  }
  return out;
}

const CASTLE_NAMES = new Set(["NORTH", "EAST", "SOUTH", "WEST"]);

export function normalizeCheckpoint(data) {
  if (!data || typeof data !== "object" || data.active === false) return null;
  const lives = Math.max(0, Math.floor(Number(data.lives) || 0));
  if (lives < 1) return null;
  const seen = (Array.isArray(data.seen) ? data.seen : ["NORTH"])
    .map((name) => String(name || "").toUpperCase())
    .filter((name) => CASTLE_NAMES.has(name));
  return {
    active: true,
    wave: Math.max(1, Math.floor(Number(data.wave) || 1)),
    rest: Boolean(data.rest),
    score: Math.max(0, Math.floor(Number(data.score) || 0)),
    lives,
    cargo: Math.max(0, Math.floor(Number(data.cargo) || 0)),
    shipId: resolveShipId(data.shipId),
    loadout: normalizeLoadout(data.loadout),
    hulls: normalizeHulls(data.hulls),
    hubOre: Math.max(0, Math.floor(Number(data.hubOre) || 0)),
    seen: seen.length ? seen : ["NORTH"],
    arriveWait: Math.max(1, Number(data.arriveWait) || 180),
    baseUnlockIn: Math.max(0, Number(data.baseUnlockIn) || 0),
    nextLifeAt: Math.max(0, Math.floor(Number(data.nextLifeAt) || 0)),
    castlesArmed: Boolean(data.castlesArmed),
    bountyUnits: Math.max(0, Math.floor(Number(data.bountyUnits) || 0)),
  };
}

function clipThumb(value) {
  const text = String(value || "");
  if (!text.startsWith("data:image/")) return "";
  if (text.length > 140000) return "";
  return text;
}

export function makeSlot(checkpoint, thumb = "") {
  const cp = normalizeCheckpoint(checkpoint);
  if (!cp) return null;
  return {
    checkpoint: cp,
    thumb: clipThumb(thumb),
    wave: cp.wave,
    shipId: cp.shipId,
  };
}

export function normalizeSlot(data) {
  if (!data || typeof data !== "object") return null;
  return makeSlot(data.checkpoint || data, data.thumb);
}

export function normalizeSlots(list, fallback = null) {
  const src = Array.isArray(list) ? list : [];
  const slots = Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => normalizeSlot(src[i]));
  if (!slots[0] && fallback) slots[0] = makeSlot(fallback);
  return slots;
}

function migrateCheckpoint(data) {
  const saved = normalizeCheckpoint(data?.checkpoint);
  if (saved) return saved;
  const loadout = normalizeLoadout(data?.loadout);
  const progressed =
    loadout.gun > 1 || loadout.missile > 1 || loadout.emp > 1 || loadout.shield > 1 || loadout.points > 0;
  if (!progressed) return null;
  return normalizeCheckpoint({
    active: true,
    wave: Math.max(1, Math.floor(Number(data?.maxWave) || 1)),
    lives: 3,
    shipId: data?.shipId,
    loadout,
    seen: ["NORTH"],
  });
}

function withControls(settings, src) {
  const controls = settings.controls;
  const profile = ["mouse", "gamepad", "laptop", "phone"].includes(src?.profile)
    ? src.profile
    : guessProfile(controls, false);
  settings.profile = profile;
  settings.binds = normalizeBinds(profile, src?.binds);
  return settings;
}

function normalize(data) {
  if (!data || typeof data !== "object") {
    return {
      ...empty,
      settings: withControls({ ...empty.settings }, null),
      loadout: { ...empty.loadout },
      checkpoint: null,
      slots: normalizeSlots(null),
      macro: [],
      highScores: normalizeHighScores(null),
      dailyScores: normalizeDailyScores(null),
      aceScores: normalizeAceScores(null),
      dailyAce: normalizeDailyAce(null),
    };
  }
  const highScores = normalizeHighScores(data.highScores);
  const dailyScores = normalizeDailyScores(data.dailyScores);
  const aceScores = normalizeAceScores(data.aceScores);
  const dailyAce = normalizeDailyAce(data.dailyAce);
  return {
    highScore: Math.max(Number(data.highScore) || 0, highScores[0]?.score || 0),
    xp: Math.max(0, Math.floor(Number(data.xp) || 0)),
    maxWave: Math.max(1, Math.floor(Number(data.maxWave) || 1)),
    shipId: resolveShipId(data.shipId, Math.max(0, Math.floor(Number(data.xp) || 0))),
    loadout: normalizeLoadout(data.loadout),
    checkpoint: null,
    slots: normalizeSlots(data.slots, Array.isArray(data.slots) ? null : migrateCheckpoint(data)),
    macro: normalizeMacro(data.macro),
    highScores,
    dailyScores,
    aceScores,
    dailyAce,
    settings: withControls(
      {
        fullscreen: Boolean(data.settings?.fullscreen),
        difficulty: data.settings?.difficulty === "hard" || data.settings?.difficulty === "medium" ? data.settings.difficulty : "easy",
        controls: data.settings?.controls === "phone" || data.settings?.controls === "desktop" ? data.settings.controls : "",
        music: data.settings?.song === 2 ? clampMusic(data.settings?.music) : 0.2,
        song: 2,
      },
      data.settings,
    ),
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
