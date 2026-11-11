/** Editable SFX / bed patches. Overrides live in localStorage for the operator lab. */

export const SFX_STORE_KEY = "vector-game-sfx";

const RT2 = Math.SQRT2;

export const VOICE_DEFAULTS = {
  gun: { delay: 0, dur: 0.14, attack: 0.0015, noisePeak: 0.42, cutoff: 1400, endCutoff: 280, q: 0.85, type: "lowpass", thump: 78, thumpPeak: 0.2, thumpDur: 0.09, rate: 1, flange: false },
  tone: { delay: 0, type: "sine", freq: 220, glide: 0, dur: 0.12, peak: 0.12, attack: 0.004 },
  whoosh: { delay: 0, from: 900, to: 180, dur: 0.28, peak: 0.22, q: 0.8 },
  chime: { delay: 0, freq: 880, dur: 0.16, peak: 0.1 },
  stab: { delay: 0, root: 196, dur: 0.28, peak: 0.12 },
};

export const VOICE_FIELDS = {
  gun: [
    { key: "delay", min: 0, max: 2, step: 0.01 },
    { key: "dur", min: 0.02, max: 2.5, step: 0.01 },
    { key: "attack", min: 0.0005, max: 0.08, step: 0.0005 },
    { key: "noisePeak", min: 0, max: 1, step: 0.01 },
    { key: "cutoff", min: 40, max: 8000, step: 10 },
    { key: "endCutoff", min: 20, max: 6000, step: 10 },
    { key: "q", min: 0.1, max: 8, step: 0.05 },
    { key: "type", options: ["lowpass", "bandpass", "highpass"] },
    { key: "thump", min: 0, max: 400, step: 1 },
    { key: "thumpPeak", min: 0, max: 1, step: 0.01 },
    { key: "thumpDur", min: 0.01, max: 1.2, step: 0.01 },
    { key: "rate", min: 0.25, max: 4, step: 0.01 },
    { key: "flange", options: [false, true, "hot"] },
  ],
  tone: [
    { key: "delay", min: 0, max: 2, step: 0.01 },
    { key: "type", options: ["sine", "triangle", "square", "sawtooth"] },
    { key: "freq", min: 20, max: 4000, step: 1 },
    { key: "glide", min: 0, max: 4000, step: 1 },
    { key: "dur", min: 0.02, max: 2.5, step: 0.01 },
    { key: "peak", min: 0, max: 1, step: 0.005 },
    { key: "attack", min: 0.0005, max: 0.12, step: 0.0005 },
  ],
  whoosh: [
    { key: "delay", min: 0, max: 2, step: 0.01 },
    { key: "from", min: 40, max: 8000, step: 10 },
    { key: "to", min: 20, max: 8000, step: 10 },
    { key: "dur", min: 0.04, max: 2.5, step: 0.01 },
    { key: "peak", min: 0, max: 1, step: 0.01 },
    { key: "q", min: 0.1, max: 8, step: 0.05 },
  ],
  chime: [
    { key: "delay", min: 0, max: 2, step: 0.01 },
    { key: "freq", min: 80, max: 4000, step: 1 },
    { key: "dur", min: 0.04, max: 1.2, step: 0.01 },
    { key: "peak", min: 0, max: 1, step: 0.005 },
  ],
  stab: [
    { key: "delay", min: 0, max: 2, step: 0.01 },
    { key: "root", min: 40, max: 800, step: 1 },
    { key: "dur", min: 0.06, max: 1.2, step: 0.01 },
    { key: "peak", min: 0, max: 1, step: 0.005 },
  ],
};

export const SFX_PATCHES = {
  rail: {
    name: "RAIL",
    voices: [
      { kind: "whoosh", from: 3400, to: 240, dur: 0.28, peak: 0.3, q: 0.55 },
      { kind: "tone", type: "sine", freq: 1860, glide: 180, dur: 0.22, peak: 0.1, attack: 0.001 },
      { kind: "gun", dur: 0.7, attack: 0.001, noisePeak: 0.34, cutoff: 2600, endCutoff: 70, q: 0.46, thump: 34, thumpPeak: 0.42, thumpDur: 0.72 },
      { kind: "whoosh", delay: 0.04, from: 1600, to: 60, dur: 1.7, peak: 0.2, q: 0.36 },
      { kind: "tone", type: "sine", freq: 78, glide: 26, dur: 1.45, peak: 0.16, attack: 0.01 },
      { kind: "tone", delay: 0.05, type: "triangle", freq: 210, glide: 48, dur: 1.85, peak: 0.09, attack: 0.016 },
      { kind: "tone", delay: 0.08, type: "sine", freq: 420, glide: 70, dur: 1.15, peak: 0.05, attack: 0.02 },
    ],
  },
  thud: {
    name: "THUD",
    voices: [
      { kind: "gun", dur: 0.2, noisePeak: 0.28, cutoff: 700, endCutoff: 140, q: 0.7, thump: 55, thumpPeak: 0.32, thumpDur: 0.16, flange: true },
    ],
  },
  click: {
    name: "CLICK",
    voices: [
      { kind: "gun", dur: 0.035, attack: 0.0004, noisePeak: 0.14, cutoff: 4800, endCutoff: 1600, q: 1.6, type: "highpass", thump: 0, thumpPeak: 0, thumpDur: 0.02 },
      { kind: "tone", type: "square", freq: 2400, dur: 0.028, peak: 0.04, attack: 0.0003 },
    ],
  },
  turret: {
    name: "TURRET",
    voices: [
      {
        kind: "gun",
        dur: 0.2,
        noisePeak: 0.26,
        cutoff: 700 * RT2,
        endCutoff: 140 * RT2,
        q: 0.7,
        thump: 55 * RT2,
        thumpPeak: 0.28,
        thumpDur: 0.16,
        rate: RT2,
        flange: "hot",
      },
    ],
  },
  enemy: {
    name: "ENEMY",
    voices: [
      { kind: "gun", dur: 0.08, attack: 0.001, noisePeak: 0.22, cutoff: 2100, endCutoff: 420, q: 1.1, type: "bandpass", thump: 140, thumpPeak: 0.08, thumpDur: 0.04 },
    ],
  },
  missile: {
    name: "MSL",
    voices: [
      { kind: "whoosh", from: 640, to: 260, dur: 1.05, peak: 0.18, q: 0.58 },
      { kind: "gun", dur: 0.08, noisePeak: 0.12, cutoff: 480, endCutoff: 140, thump: 70, thumpPeak: 0.1, thumpDur: 0.06 },
    ],
  },
  star: {
    name: "STAR",
    voices: [
      { kind: "tone", type: "square", freq: 250, dur: 0.5, peak: 0.055, attack: 0.012 },
    ],
  },
  boom: {
    name: "BOOM",
    voices: [
      { kind: "gun", dur: 0.28, attack: 0.002, noisePeak: 0.4, cutoff: 900, endCutoff: 90, q: 0.5, thump: 48, thumpPeak: 0.28, thumpDur: 0.22 },
    ],
  },
  warp: {
    name: "WARP",
    voices: [
      { kind: "whoosh", from: 280, to: 1600, dur: 1, peak: 0.22, q: 0.55 },
      { kind: "tone", type: "sine", freq: 80, glide: 260, dur: 1, peak: 0.1, attack: 0.04 },
    ],
  },
  laser: {
    name: "LASER",
    voices: [
      { kind: "tone", type: "sine", freq: 1880, dur: 0.08, peak: 0.12, attack: 0.004 },
    ],
  },
  emp: {
    name: "EMP",
    voices: [
      { kind: "whoosh", from: 400, to: 90, dur: 0.55, peak: 0.24, q: 0.45 },
      { kind: "tone", type: "triangle", freq: 180, glide: 55, dur: 0.6, peak: 0.1, attack: 0.03 },
      { kind: "gun", dur: 0.18, noisePeak: 0.16, cutoff: 1800, endCutoff: 300, q: 1.2, type: "bandpass", thumpPeak: 0 },
    ],
  },
  hole: {
    name: "HOLE",
    voices: [
      { kind: "whoosh", from: 220, to: 40, dur: 0.9, peak: 0.26, q: 0.4 },
      { kind: "tone", type: "sine", freq: 70, glide: 28, dur: 1.1, peak: 0.14, attack: 0.05 },
      { kind: "gun", dur: 0.28, noisePeak: 0.14, cutoff: 900, endCutoff: 80, q: 0.7, type: "lowpass", thump: 36, thumpPeak: 0.2, thumpDur: 0.28 },
    ],
  },
  main: {
    name: "MAIN",
    voices: [
      { kind: "gun", dur: 0.42, attack: 0.05, noisePeak: 0.1, cutoff: 620, endCutoff: 280, q: 0.45, thump: 58, thumpPeak: 0.05, thumpDur: 0.4 },
    ],
  },
  side: {
    name: "SIDE",
    voices: [
      { kind: "gun", dur: 0.42, attack: 0.05, noisePeak: 0.035, cutoff: 1600, endCutoff: 700, q: 0.45, thump: 0, thumpPeak: 0, thumpDur: 0.4 },
    ],
  },
  hit: {
    name: "HIT",
    voices: [
      { kind: "gun", dur: 0.05, attack: 0.0008, noisePeak: 0.22, cutoff: 1600, endCutoff: 400, q: 1.2, type: "bandpass", thump: 180, thumpPeak: 0.06, thumpDur: 0.03 },
    ],
  },
  rock: {
    name: "ROCK",
    voices: [
      { kind: "gun", dur: 0.26, attack: 0.002, noisePeak: 0.38, cutoff: 780, endCutoff: 110, q: 0.55, thump: 42, thumpPeak: 0.24, thumpDur: 0.2 },
    ],
  },
  die: {
    name: "DIE",
    voices: [
      { kind: "gun", dur: 0.4, attack: 0.003, noisePeak: 0.36, cutoff: 600, endCutoff: 70, q: 0.4, thump: 38, thumpPeak: 0.3, thumpDur: 0.32 },
      { kind: "tone", type: "sine", freq: 160, glide: 40, dur: 0.45, peak: 0.12, attack: 0.01 },
    ],
  },
  spawn: {
    name: "SPAWN",
    voices: [
      { kind: "chime", freq: 980, dur: 0.12, peak: 0.07 },
      { kind: "gun", dur: 0.08, noisePeak: 0.1, cutoff: 2400, endCutoff: 800, q: 0.8, type: "bandpass", thumpPeak: 0 },
    ],
  },
  ore: {
    name: "ORE",
    voices: [
      { kind: "chime", freq: 1240, dur: 0.14, peak: 0.11 },
    ],
  },
  dump: {
    name: "DUMP",
    voices: [
      { kind: "chime", freq: 660, dur: 0.18, peak: 0.09 },
      { kind: "tone", type: "sine", freq: 110, glide: 70, dur: 0.16, peak: 0.08 },
    ],
  },
  up: {
    name: "UP",
    voices: [
      { kind: "chime", freq: 740, dur: 0.2, peak: 0.1 },
      { kind: "chime", freq: 980, dur: 0.22, peak: 0.08 },
      { kind: "tone", type: "sine", freq: 220, glide: 440, dur: 0.28, peak: 0.08, attack: 0.01 },
    ],
  },
  dock: {
    name: "DOCK",
    voices: [
      { kind: "gun", dur: 0.12, noisePeak: 0.16, cutoff: 500, endCutoff: 120, q: 0.7, thump: 90, thumpPeak: 0.22, thumpDur: 0.1 },
      { kind: "tone", type: "triangle", freq: 180, glide: 90, dur: 0.14, peak: 0.08 },
    ],
  },
  launch: {
    name: "LAUNCH",
    voices: [
      { kind: "whoosh", from: 200, to: 900, dur: 0.22, peak: 0.14, q: 0.55 },
      { kind: "gun", dur: 0.1, noisePeak: 0.12, cutoff: 700, endCutoff: 220, thump: 70, thumpPeak: 0.1, thumpDur: 0.08 },
    ],
  },
  warn: {
    name: "WARN",
    voices: [
      { kind: "tone", type: "triangle", freq: 390, dur: 0.16, peak: 0.12, attack: 0.006 },
      { kind: "tone", delay: 0.16, type: "triangle", freq: 270, dur: 0.2, peak: 0.1, attack: 0.006 },
      { kind: "whoosh", from: 900, to: 300, dur: 0.28, peak: 0.1, q: 0.9 },
    ],
  },
  hub: {
    name: "HUB",
    voices: [
      { kind: "gun", dur: 0.14, noisePeak: 0.24, cutoff: 1100, endCutoff: 180, q: 0.9, thump: 64, thumpPeak: 0.18, thumpDur: 0.1 },
    ],
  },
  on: {
    name: "ON",
    voices: [
      { kind: "whoosh", from: 280, to: 900, dur: 0.16, peak: 0.12, q: 0.7 },
      { kind: "tone", type: "sine", freq: 240, glide: 420, dur: 0.14, peak: 0.08 },
    ],
  },
  off: {
    name: "OFF",
    voices: [
      { kind: "whoosh", from: 800, to: 220, dur: 0.14, peak: 0.1, q: 0.7 },
      { kind: "tone", type: "sine", freq: 360, glide: 140, dur: 0.12, peak: 0.07 },
    ],
  },
  block: {
    name: "BLOCK",
    voices: [
      { kind: "gun", dur: 0.07, attack: 0.0008, noisePeak: 0.18, cutoff: 2400, endCutoff: 700, q: 1.6, type: "bandpass", thump: 220, thumpPeak: 0.08, thumpDur: 0.04 },
    ],
  },
  pop: {
    name: "POP",
    voices: [
      { kind: "gun", dur: 0.16, noisePeak: 0.26, cutoff: 1400, endCutoff: 180, q: 0.8, thump: 90, thumpPeak: 0.16, thumpDur: 0.1 },
      { kind: "tone", type: "sine", freq: 300, glide: 80, dur: 0.18, peak: 0.08 },
    ],
  },
  castle: {
    name: "CASTLE",
    voices: [
      { kind: "whoosh", from: 180, to: 520, dur: 0.35, peak: 0.16, q: 0.5 },
      { kind: "tone", type: "triangle", freq: 140, glide: 280, dur: 0.32, peak: 0.09, attack: 0.02 },
    ],
  },
  life: {
    name: "LIFE",
    voices: [
      { kind: "chime", freq: 880, dur: 0.18, peak: 0.1 },
      { kind: "chime", freq: 1320, dur: 0.22, peak: 0.08 },
    ],
  },
  stab: {
    name: "STAB",
    voices: [
      { kind: "stab", root: 196, dur: 0.28, peak: 0.12 },
    ],
  },
};

export const SFX_GROUPS = [
  { name: "GUNS", ids: ["thud", "rail", "turret", "enemy", "click"] },
  { name: "SPECIAL", ids: ["missile", "star", "warp", "emp", "hole", "laser"] },
  { name: "THRUST", ids: ["main", "side"] },
  { name: "HITS", ids: ["hit", "rock", "boom", "die", "hub"] },
  { name: "ORE", ids: ["spawn", "ore", "dump", "up"] },
  { name: "STATION", ids: ["dock", "launch", "warn", "castle"] },
  { name: "SHIELD", ids: ["on", "off", "block", "pop"] },
  { name: "SHIP", ids: ["life", "stab"] },
];

export const BED_FIELDS = {
  engine: [
    { key: "mainGain", min: 0, max: 0.4, step: 0.001 },
    { key: "mainCutoff", min: 80, max: 2000, step: 10 },
    { key: "mainSpan", min: 0, max: 2000, step: 10 },
    { key: "manGain", min: 0, max: 0.2, step: 0.001 },
    { key: "manCutoff", min: 200, max: 4000, step: 10 },
    { key: "manSpan", min: 0, max: 2000, step: 10 },
    { key: "rumbleGain", min: 0, max: 0.2, step: 0.001 },
    { key: "shieldGain", min: 0, max: 0.4, step: 0.001 },
    { key: "shieldCutoff", min: 200, max: 4000, step: 10 },
    { key: "shieldSpan", min: 0, max: 2000, step: 10 },
    { key: "humGain", min: 0, max: 0.2, step: 0.001 },
    { key: "warpGain", min: 0, max: 0.6, step: 0.001 },
    { key: "warpCutoff", min: 80, max: 2000, step: 10 },
    { key: "warpSpan", min: 0, max: 4000, step: 10 },
  ],
  laser: [
    { key: "hissPeak", min: 0, max: 0.5, step: 0.005 },
    { key: "hissFreq", min: 400, max: 8000, step: 10 },
    { key: "buzzPeak", min: 0, max: 0.4, step: 0.005 },
    { key: "buzzFreq", min: 200, max: 4000, step: 10 },
  ],
  rail: [
    { key: "hissIdle", min: 0, max: 0.3, step: 0.001 },
    { key: "hissCharge", min: 0, max: 0.3, step: 0.001 },
    { key: "hissReady", min: 0, max: 0.3, step: 0.001 },
    { key: "hissFreqIdle", min: 200, max: 4000, step: 10 },
    { key: "hissFreqSpan", min: 0, max: 5000, step: 10 },
    { key: "hissFreqReady", min: 400, max: 8000, step: 10 },
    { key: "coilIdle", min: 0, max: 0.2, step: 0.001 },
    { key: "coilReady", min: 0, max: 0.2, step: 0.001 },
    { key: "coilFreqIdle", min: 40, max: 2000, step: 5 },
    { key: "coilFreqSpan", min: 0, max: 2000, step: 5 },
    { key: "coilFreqReady", min: 80, max: 4000, step: 5 },
    { key: "holdPeak", min: 0, max: 0.3, step: 0.001 },
  ],
};

export const BED_PATCHES = {
  engine: {
    name: "ENGINE",
    mainGain: 0.065,
    mainCutoff: 340,
    mainSpan: 380,
    manGain: 0.02,
    manCutoff: 1100,
    manSpan: 700,
    rumbleGain: 0.027,
    shieldGain: 0.09,
    shieldCutoff: 820,
    shieldSpan: 420,
    humGain: 0.045,
    warpGain: 0.2,
    warpCutoff: 380,
    warpSpan: 1500,
  },
  laser: {
    name: "LASER BED",
    hissPeak: 0.11,
    hissFreq: 4200,
    buzzPeak: 0.07,
    buzzFreq: 1760,
  },
  rail: {
    name: "RAIL BED",
    hissIdle: 0.03,
    hissCharge: 0.08,
    hissReady: 0.075,
    hissFreqIdle: 820,
    hissFreqSpan: 2300,
    hissFreqReady: 3400,
    coilIdle: 0.058,
    coilReady: 0.016,
    coilFreqIdle: 170,
    coilFreqSpan: 780,
    coilFreqReady: 760,
    holdPeak: 0.075,
  },
};

let cachedStore = null;

function blankStore() {
  return { sfx: {}, beds: {} };
}

export function loadSfxStore() {
  if (cachedStore) return cachedStore;
  try {
    const data = JSON.parse(localStorage.getItem(SFX_STORE_KEY) || "null");
    cachedStore = data && typeof data === "object"
      ? { sfx: data.sfx && typeof data.sfx === "object" ? data.sfx : {}, beds: data.beds && typeof data.beds === "object" ? data.beds : {} }
      : blankStore();
  } catch {
    cachedStore = blankStore();
  }
  return cachedStore;
}

export function saveSfxStore(next) {
  cachedStore = {
    sfx: next?.sfx && typeof next.sfx === "object" ? next.sfx : {},
    beds: next?.beds && typeof next.beds === "object" ? next.beds : {},
  };
  localStorage.setItem(SFX_STORE_KEY, JSON.stringify(cachedStore));
}

export function bustSfxCache() {
  cachedStore = null;
}

function cloneVoice(voice) {
  return { ...voice };
}

export function defaultPatch(id) {
  const spec = SFX_PATCHES[id];
  if (!spec) return null;
  return { name: spec.name, voices: spec.voices.map(cloneVoice) };
}

export function patchFor(id) {
  const base = defaultPatch(id);
  if (!base) return null;
  const over = loadSfxStore().sfx[id];
  if (!over?.voices || !Array.isArray(over.voices)) return base;
  return {
    name: base.name,
    voices: base.voices.map((voice, i) => ({ ...voice, ...(over.voices[i] || {}) })),
  };
}

export function defaultBed(id) {
  const spec = BED_PATCHES[id];
  if (!spec) return null;
  const { name, ...rest } = spec;
  return { name, ...rest };
}

export function bedFor(id) {
  const base = defaultBed(id);
  if (!base) return null;
  const over = loadSfxStore().beds[id];
  if (!over || typeof over !== "object") return base;
  return { ...base, ...over };
}

export function patchDirty(id) {
  return Boolean(loadSfxStore().sfx[id]);
}

export function bedDirty(id) {
  return Boolean(loadSfxStore().beds[id]);
}

export function writePatch(id, patch) {
  const store = loadSfxStore();
  const next = { sfx: { ...store.sfx }, beds: { ...store.beds } };
  next.sfx[id] = { voices: (patch.voices || []).map(cloneVoice) };
  saveSfxStore(next);
}

export function writeBed(id, bed) {
  const store = loadSfxStore();
  const next = { sfx: { ...store.sfx }, beds: { ...store.beds } };
  const { name, ...rest } = bed;
  next.beds[id] = { ...rest };
  saveSfxStore(next);
}

export function resetPatch(id) {
  const store = loadSfxStore();
  if (!store.sfx[id]) return;
  const sfx = { ...store.sfx };
  delete sfx[id];
  saveSfxStore({ sfx, beds: store.beds });
}

export function resetBed(id) {
  const store = loadSfxStore();
  if (!store.beds[id]) return;
  const beds = { ...store.beds };
  delete beds[id];
  saveSfxStore({ sfx: store.sfx, beds });
}

export function resetAllSfx() {
  saveSfxStore(blankStore());
}

export function dumpAllPatches() {
  const out = { sfx: {}, beds: {} };
  for (const id of Object.keys(SFX_PATCHES)) out.sfx[id] = patchFor(id);
  for (const id of Object.keys(BED_PATCHES)) out.beds[id] = bedFor(id);
  return out;
}

export function firePatch(audio, patch) {
  if (!patch?.voices?.length) return;
  const t0 = audio.now();
  for (const voice of patch.voices) {
    const at = t0 + (Number(voice.delay) || 0);
    const kind = voice.kind;
    if (kind === "gun") audio.gun({ ...voice, at });
    else if (kind === "tone") audio.tone({ ...voice, at });
    else if (kind === "whoosh") audio.whoosh({ ...voice, at });
    else if (kind === "chime") audio.chime({ ...voice, at });
    else if (kind === "stab") audio.stab({ ...voice, at });
  }
}

export const SFX = Object.fromEntries(
  Object.keys(SFX_PATCHES).map((id) => [
    id,
    {
      name: SFX_PATCHES[id].name,
      fire: (audio) => firePatch(audio, patchFor(id)),
    },
  ]),
);

export const BULLET_SOUNDS = [{ id: "thud", name: "THUD", fire: SFX.thud.fire }];

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === SFX_STORE_KEY) bustSfxCache();
  });
}
