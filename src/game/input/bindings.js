export const ACTIONS = [
  { id: "thrust", name: "THRUST" },
  { id: "reverse", name: "REVERSE" },
  { id: "strafeL", name: "STRAFE L" },
  { id: "strafeR", name: "STRAFE R" },
  { id: "turnL", name: "TURN L" },
  { id: "turnR", name: "TURN R" },
  { id: "aim", name: "AIM" },
  { id: "fire", name: "FIRE" },
  { id: "shield", name: "SHIELD" },
  { id: "warp", name: "WARP" },
  { id: "emp", name: "EMP" },
  { id: "missile", name: "MISSILE" },
  { id: "map", name: "MAP" },
  { id: "home", name: "HOME" },
  { id: "fullscreen", name: "FULLSCREEN" },
  { id: "quit", name: "END RUN" },
];

export const PROFILES = ["mouse", "gamepad", "laptop", "phone"];

export const PROFILE_NAMES = {
  mouse: "MOUSE",
  gamepad: "PAD",
  laptop: "LAPTOP",
  phone: "PHONE",
};

const KEY_NAMES = {
  Space: "SPACE",
  ShiftLeft: "L SHIFT",
  ShiftRight: "R SHIFT",
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
  Escape: "ESC",
  Enter: "ENTER",
};

const PAD_NAMES = ["A", "B", "X", "Y", "LB", "RB", "LT", "RT", "VIEW", "MENU", "L3", "R3", "UP", "DOWN", "LEFT", "RIGHT"];

const GESTURE_NAMES = {
  flickFwd: "FLICK FWD",
  flickBack: "FLICK BACK",
  stickFire: "STICK TAP FIRE",
  stickMove: "LEFT STICK",
  stickTurn: "RIGHT STICK",
  doubleTap: "DOUBLE TAP",
  twoFinger: "TWO FINGER",
};

function key(c) {
  return { t: "key", c };
}

function mouse(b) {
  return { t: "mouse", b };
}

function wheel(d) {
  return { t: "wheel", d };
}

function pad(b) {
  return { t: "pad", b };
}

function axis(a, s) {
  return { t: "axis", a, s };
}

function aim(m) {
  return { t: "aim", m };
}

function gesture(g) {
  return { t: "gesture", g };
}

function corner(c) {
  return { t: "corner", c };
}

const KEYS = {
  thrust: [key("KeyW"), key("ArrowUp")],
  reverse: [key("KeyS"), key("ArrowDown")],
  strafeL: [key("KeyA")],
  strafeR: [key("KeyD")],
  turnL: [key("KeyQ"), key("ArrowLeft")],
  turnR: [key("KeyE"), key("ArrowRight")],
  map: [key("KeyM")],
  home: [key("KeyH")],
  fullscreen: [key("KeyF")],
  quit: [key("Escape")],
};

export const DEFAULTS = {
  mouse: {
    ...KEYS,
    aim: [aim("mouse")],
    fire: [mouse(0), key("Space")],
    shield: [mouse(2), key("ShiftLeft"), key("ShiftRight")],
    warp: [wheel(-1)],
    emp: [wheel(1)],
    missile: [mouse(1)],
  },
  gamepad: {
    ...KEYS,
    aim: [aim("heading")],
    thrust: [...KEYS.thrust, axis(1, -1), pad(7)],
    reverse: [...KEYS.reverse, axis(1, 1)],
    strafeL: [...KEYS.strafeL, axis(0, -1)],
    strafeR: [...KEYS.strafeR, axis(0, 1)],
    turnL: [...KEYS.turnL, axis(2, -1), pad(4), pad(14)],
    turnR: [...KEYS.turnR, axis(2, 1), pad(5), pad(15)],
    fire: [pad(2), pad(6), key("Space")],
    shield: [pad(1), key("ShiftLeft")],
    warp: [pad(3), wheel(-1)],
    emp: [pad(0), wheel(1)],
    missile: [pad(5)],
    map: [...KEYS.map, pad(8)],
    home: [...KEYS.home],
  },
  laptop: {
    ...KEYS,
    aim: [aim("heading")],
    fire: [mouse(0), key("Space")],
    shield: [mouse(2), key("ShiftLeft"), key("ShiftRight"), gesture("doubleTap")],
    warp: [wheel(-1)],
    emp: [wheel(1)],
    missile: [mouse(1), gesture("twoFinger"), corner("tr")],
    map: [...KEYS.map, corner("tl")],
    home: [...KEYS.home, corner("br")],
  },
  phone: {
    thrust: [gesture("stickMove")],
    reverse: [gesture("stickMove")],
    strafeL: [gesture("stickMove")],
    strafeR: [gesture("stickMove")],
    turnL: [gesture("stickTurn")],
    turnR: [gesture("stickTurn")],
    aim: [aim("heading")],
    fire: [gesture("stickFire"), key("Space")],
    shield: [gesture("doubleTap"), key("ShiftLeft")],
    warp: [gesture("flickFwd")],
    emp: [gesture("flickBack")],
    missile: [gesture("twoFinger")],
    map: [key("KeyM")],
    home: [key("KeyH")],
    fullscreen: [key("KeyF")],
    quit: [key("Escape")],
  },
};

export function guessProfile(controls, padConnected) {
  if (controls === "phone") return "phone";
  if (padConnected) return "gamepad";
  const touch = (navigator.maxTouchPoints || 0) > 0;
  const fine = window.matchMedia?.("(pointer: fine)")?.matches ?? true;
  const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  if (mobile) return "phone";
  if (touch && fine) return "laptop";
  return "mouse";
}

export function cloneBinds(profile) {
  const src = DEFAULTS[profile] || DEFAULTS.mouse;
  const out = {};
  for (const row of ACTIONS) out[row.id] = (src[row.id] || []).map((bind) => ({ ...bind }));
  return out;
}

export function bindId(bind) {
  if (!bind || !bind.t) return "";
  if (bind.t === "key") return `key:${bind.c}`;
  if (bind.t === "mouse") return `mouse:${bind.b}`;
  if (bind.t === "wheel") return `wheel:${bind.d}`;
  if (bind.t === "pad") return `pad:${bind.b}`;
  if (bind.t === "axis") return `axis:${bind.a}:${bind.s}`;
  if (bind.t === "aim") return `aim:${bind.m}`;
  if (bind.t === "gesture") return `gesture:${bind.g}`;
  if (bind.t === "corner") return `corner:${bind.c}`;
  return bind.t;
}

export function cleanBind(bind) {
  if (!bind || typeof bind !== "object") return null;
  if (bind.t === "key" && typeof bind.c === "string") return { t: "key", c: bind.c };
  if (bind.t === "mouse" && Number.isFinite(bind.b)) return { t: "mouse", b: Math.max(0, Math.floor(bind.b)) };
  if (bind.t === "wheel" && (bind.d === -1 || bind.d === 1)) return { t: "wheel", d: bind.d };
  if (bind.t === "pad" && Number.isFinite(bind.b)) return { t: "pad", b: Math.max(0, Math.floor(bind.b)) };
  if (bind.t === "axis" && Number.isFinite(bind.a) && (bind.s === -1 || bind.s === 1)) {
    return { t: "axis", a: Math.max(0, Math.floor(bind.a)), s: bind.s };
  }
  if (bind.t === "aim" && (bind.m === "mouse" || bind.m === "heading")) return { t: "aim", m: bind.m };
  if (bind.t === "gesture" && GESTURE_NAMES[bind.g]) return { t: "gesture", g: bind.g };
  if (bind.t === "corner" && ["tl", "tr", "bl", "br"].includes(bind.c)) return { t: "corner", c: bind.c };
  return null;
}

export function normalizeBinds(profile, data) {
  const id = PROFILES.includes(profile) ? profile : "mouse";
  const next = cloneBinds(id);
  if (!data || typeof data !== "object") return next;
  for (const row of ACTIONS) {
    if (!Array.isArray(data[row.id])) continue;
    const list = data[row.id].map(cleanBind).filter(Boolean);
    const seen = new Set();
    next[row.id] = list.filter((bind) => {
      const key = bindId(bind);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  return next;
}

export function prettyKey(code) {
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  return String(code || "").replace(/^Key/, "").replace(/^Digit/, "");
}

export function labelBind(bind) {
  if (!bind) return "";
  if (bind.t === "key") return prettyKey(bind.c);
  if (bind.t === "mouse") return ["L CLICK", "WHEEL BTN", "R CLICK"][bind.b] || `M${bind.b}`;
  if (bind.t === "wheel") return bind.d < 0 ? "WHEEL FWD" : "WHEEL BACK";
  if (bind.t === "pad") return PAD_NAMES[bind.b] ? `PAD ${PAD_NAMES[bind.b]}` : `PAD ${bind.b}`;
  if (bind.t === "axis") return `AXIS ${bind.a}${bind.s < 0 ? "-" : "+"}`;
  if (bind.t === "aim") return bind.m === "mouse" ? "MOUSE" : "HEADING";
  if (bind.t === "gesture") return GESTURE_NAMES[bind.g] || bind.g;
  if (bind.t === "corner") return `CORNER ${String(bind.c || "").toUpperCase()}`;
  return "";
}

export function aimMode(binds) {
  return binds?.aim?.some((bind) => bind.t === "aim" && bind.m === "mouse") ? "mouse" : "heading";
}
