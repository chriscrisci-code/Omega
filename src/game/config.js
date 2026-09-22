/** Tune feel, colors, and Steam-ready defaults here. */

export const settings = {
  resolutionCap: 4,
  background: 0x05060a,
};

export const colors = {
  cyan: 0x66e0ff,
  cyanHot: 0xc8f8ff,
  magenta: 0xff4d9a,
  magentaHot: 0xffb3d6,
  orange: 0xff9a3c,
  orangeHot: 0xffe0b0,
  amber: 0xffc266,
  lime: 0x4dff7a,
  limeHot: 0xb4ffc8,
  white: 0xffffff,
};

export const ship = {
  radius: 14,
  turnSpeed: 2.15,
  thrust: 460,
  drag: 0.58,
  maxSpeed: 520,
  invulnTime: 2.1,
  respawnDelay: 1.15,
  lives: 3,
};

export const shield = {
  radius: 30,
  max: 2,
  drain: 0.42,
  recharge: 0.08,
  hitShot: 0.12,
  hitBody: 0.22,
  lock: 0.4,
};

export const emp = {
  grow: 0.72,
  fade: 0.28,
  stun: 15,
  cooldown: 8,
};

export const camera = {
  posTau: 0.16,
  rotTau: 0.52,
  zoom: 0.56,
};

/** Distant + lattice. factor 0.25 and spacing 500 tile cleanly on the 16000 torus. */
export const farGrid = {
  spacing: 500,
  factor: 0.25,
  size: 8,
  alpha: 0.27,
  glow: 0.095,
  color: 0x6eb4c8,
  cells: 24,
};

/** Which HUD marker kinds are shown. Later this becomes a player filter. */
export const hudFilters = {
  hub: true,
  base: true,
  enemy: true,
  raider: true,
  destroyer: true,
};

/** 16000² torus. Hub at center. Cardinal castles sit 5120 out. Warp hops 2560 in 1s. */
export const world = {
  width: 16000,
  height: 16000,
};

export const warp = {
  range: 2560,
  duration: 1,
  cooldown: 2.4,
  stopShort: 160,
};

export const bullets = {
  speed: 980,
  life: 1.25,
  cooldown: 0.08,
  max: 10,
  radius: 4,
  streak: 16,
};

export const missiles = {
  speed: 520,
  topSpeed: 1040,
  ramp: 1.8,
  life: 30,
  cooldown: 0.38,
  max: 8,
  radius: 5,
  turn: 4.6,
  cone: 0.62,
  damage: 3,
  trailFade: 5,
  trailAlpha: 0.22,
  trailGap: 14,
};

export const castle = {
  shieldHits: [6, 5, 4],
  coreHits: 8,
  spawnMax: 3,
  spawnEvery: 5.5,
  screenEvery: 5,
  screenHunters: 3,
  screenDestroyerEvery: 14,
  hunterHits: 2,
  arriveEvery: 180,
  arriveShrink: 0.75,
  arriveFloor: 18,
  starSpeed: 240,
  starTop: 360,
  starRamp: 2.8,
  starTurn: 1.65,
  starLife: 22,
  starEvery: 6.4,
  starMax: 16,
  starRadius: 7,
};

export const destroyer = {
  hits: 48,
  laserTime: 3,
  laserRecharge: 5,
  laserRange: 780,
  laserCone: 0.4,
  shieldHits: 100,
  shieldMissileHits: 10,
  pierce: 0.22,
  ricochet: 0.42,
  turn: 0.2,
  fromWave: 4,
  playtest: false,
};

export const raid = {
  max: 4,
  every: 11,
  first: 7,
  hits: 3,
  warn: 1700,
  hubHits: 18,
  hubShieldHits: [5, 4, 4],
  regenDelay: 2.2,
  regenEvery: 0.5,
  ramEvery: 0.85,
};

export const assault = {
  rest: 144,
  wave1: 210,
  wave2: 85,
  wave3: 95,
  grow: 28,
  w1Hunters: 2,
  w1HunterEvery: 14,
  w1RaidMax: 12,
  w1RaidEvery: 5.2,
  w2PerCastle: 2,
};

export const ore = {
  drops: { 3: 3, 2: 2, 1: 1 },
  radius: 8,
  life: 48,
  pickup: 24,
  magnet: 180,
  drift: 22,
};

export const hubUpgrades = [
  { ore: 8, id: "ring", name: "RING" },
  { ore: 16, id: "ports", name: "PORTS" },
  { ore: 28, id: "turrets", name: "TURRETS" },
  { ore: 44, id: "armor", name: "ARMOR" },
  { ore: 64, id: "scaffold", name: "SCAFFOLD" },
];

export const rocks = {
  startCount: 4,
  fieldCount: 36,
  maxLarge: 8,
  splitKick: 90,
  scores: { 3: 20, 2: 50, 1: 100 },
  radii: { 3: 46, 2: 28, 1: 16 },
  hits: { 3: 4, 2: 3, 1: 2 },
};

export const particles = {
  poolSize: 3500,
  textureSize: 64,
};

export const bloom = {
  threshold: 0.28,
  bloomScale: 1.45,
  brightness: 1.08,
  blur: 6,
  quality: 4,
  resolution: 1,
};

export const extraLifeEvery = 10000;

export const debris = {
  rockLife: 1.25,
  shipLife: 1.45,
  rockKick: 210,
  shipKick: 260,
};

const copy = (value) => JSON.parse(JSON.stringify(value));

const EASY = {
  ship: copy(ship),
  shield: copy(shield),
  emp: copy(emp),
  castle: copy(castle),
  raid: copy(raid),
  rocks: copy(rocks),
  assault: copy(assault),
};

export const DIFFS = [
  { id: "easy", name: "EASY" },
  { id: "medium", name: "MEDIUM" },
  { id: "hard", name: "HARD" },
];

export function applyDifficulty(id) {
  const key = id === "hard" || id === "medium" ? id : "easy";
  Object.assign(ship, copy(EASY.ship));
  Object.assign(shield, copy(EASY.shield));
  Object.assign(emp, copy(EASY.emp));
  Object.assign(castle, copy(EASY.castle));
  Object.assign(raid, copy(EASY.raid));
  Object.assign(rocks, copy(EASY.rocks));
  Object.assign(assault, copy(EASY.assault));

  if (key === "medium") {
    castle.spawnMax = 5;
    castle.spawnEvery = 4;
    castle.hunterHits = 3;
    castle.shieldHits = [8, 6, 5];
    castle.coreHits = 11;
    castle.arriveEvery = 120;
    castle.arriveFloor = 12;
    castle.starEvery = 4.4;
    castle.starSpeed = 300;
    castle.starTop = 440;
    castle.starTurn = 2.1;
    raid.max = 6;
    raid.every = 7.5;
    raid.first = 5;
    raid.hits = 4;
    raid.hubHits = 24;
    raid.hubShieldHits = [6, 5, 5];
    raid.regenEvery = 0.65;
    assault.rest = 114;
    assault.wave1 = 180;
    assault.w1RaidMax = 16;
    assault.w1RaidEvery = 4.4;
    assault.grow = 32;
    rocks.startCount = 6;
    rocks.fieldCount = 44;
    rocks.hits = { 3: 5, 2: 4, 1: 2 };
    return { id: key, extraLifeEvery: 10000 };
  }

  if (key === "hard") {
    castle.spawnMax = 7;
    castle.spawnEvery = 2.8;
    castle.hunterHits = 4;
    castle.shieldHits = [10, 8, 6];
    castle.coreHits = 14;
    castle.arriveEvery = 75;
    castle.arriveFloor = 8;
    castle.arriveShrink = 0.7;
    castle.starEvery = 2.8;
    castle.starSpeed = 380;
    castle.starTop = 540;
    castle.starTurn = 2.6;
    raid.max = 8;
    raid.every = 5;
    raid.first = 3;
    raid.hits = 5;
    raid.hubHits = 32;
    raid.hubShieldHits = [8, 6, 6];
    raid.regenEvery = 0.85;
    assault.rest = 84;
    assault.wave1 = 165;
    assault.w1Hunters = 3;
    assault.w1RaidMax = 20;
    assault.w1RaidEvery = 3.6;
    assault.grow = 36;
    rocks.startCount = 8;
    rocks.fieldCount = 52;
    rocks.maxLarge = 10;
    rocks.hits = { 3: 6, 2: 4, 1: 3 };
    return { id: key, extraLifeEvery: 10000 };
  }

  return { id: "easy", extraLifeEvery: 10000 };
}
