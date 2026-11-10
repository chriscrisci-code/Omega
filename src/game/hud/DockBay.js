import { ship as shipCfg } from "../config.js";
import { catalogMiniSvg, DEFAULT_SHIP_ID, PLAYABLE_SHIP_IDS, SHIP_CATALOG, shipUnlockAt, unlockedShipIds } from "../ships/catalog.js";
import { kitFor } from "../ships/kits.js";
import { vectorTextSvg } from "./vectorText.js";

const CYAN = "#66e0ff";
const HOT = "#c8f8ff";
const DIM = "#6d8a99";

const SPECIAL_NAMES = {
  aiTurrets: "AI TURRETS",
  wingmen: "WINGMEN",
  pulseShield: "PULSE SHIELD",
  multiHull: "MULTI HULL",
  gunshipWing: "GUNSHIP WING",
};

function kitLines(id, loadout = {}) {
  const kit = kitFor(id);
  const stats = kit.stats || {};
  const weapons = kit.weapons || {};
  const speedMul = stats.speedMul ?? 1;
  const turnMul = stats.turnMul ?? 1;
  const levels = loadout.levels || {};
  const max = loadout.max || {};
  const ammo = loadout.ammoName || (weapons.rockets ? "RKT" : "MSL");
  const nose = weapons.noseGun;
  const missiles = weapons.missiles;
  const turrets = weapons.turrets;
  const tags = [];
  if (nose && typeof nose === "object" && nose.charge) tags.push(nose.burst === "rocket" ? "RAIL ROCKET" : "RAIL GUN");
  else if (nose) tags.push("NOSE GUN");
  if (weapons.rockets) tags.push("ROCKETS");
  else if (missiles && typeof missiles === "object" && missiles.volley > 1) tags.push(`TWIN ${ammo}`);
  else if (missiles) tags.push(ammo === "RKT" ? "ROCKETS" : "MISSILES");
  if (turrets?.mounts?.length) tags.push(`${turrets.mounts.length} TURRETS`);
  for (const special of kit.specials || []) {
    if (SPECIAL_NAMES[special]) tags.push(SPECIAL_NAMES[special]);
  }
  const rail = nose && typeof nose === "object" && nose.charge;
  const mul = (value) => `${Number(value || 1).toFixed((value || 1) % 1 ? 1 : 0)}X`;
  const load = [
    { name: "GUN", level: levels.gun || 1, cap: max.gun || 0 },
    { name: "AMMO", level: levels.ammo || 1, cap: max.ammo || 0, sub: true },
    { name: ammo, level: levels.missile || 1, cap: max.missile || 0 },
    { name: "TYPE", level: levels.missileType || 1, cap: max.missileType || 1, sub: true },
    { name: "EMP", level: levels.emp || 1, cap: max.emp || 0 },
    { name: "CHARGES", level: levels.charges || 1, cap: max.charges || 0, sub: true },
    { name: "SHD", level: levels.shield || 1, cap: max.shield || 0 },
    { name: "REGEN", level: levels.regen || 1, cap: max.regen || 0, sub: true },
    {
      name: "GSHP",
      level: loadout.showGunship ? levels.gunship || 0 : 0,
      cap: loadout.showGunship ? max.gunship || 0 : 0,
      blank: !loadout.showGunship,
    },
  ];
  return {
    name: SHIP_CATALOG.find((item) => item.id === id)?.name || id,
    ratings: [
      { name: "SPEED", value: String(Math.round((shipCfg.maxSpeed || 520) * speedMul)), fill: speedMul / 1.28 },
      { name: "MANEUVER", value: String(Math.round(turnMul * 100)), fill: turnMul },
      { name: "TURN SPEED", value: String(Math.round((shipCfg.turnSpeed || 2.15) * turnMul * (180 / Math.PI))), fill: turnMul },
    ],
    facts: [
      { name: "HULL", value: String(stats.hullHits || 1) },
      { name: "SHIELD", value: mul(stats.shieldMul) },
      { name: "EMP CAP", value: String(stats.empCap || 4) },
      { name: "RAIL HIT", value: rail ? String(nose.hits) : "-" },
      { name: "RAIL CHARGE", value: rail ? `${Number(nose.charge).toFixed(2)}S` : "-" },
    ],
    load,
    tags,
  };
}

function statRow(label, value, fill, extraClass = "") {
  const bar = fill == null
    ? ""
    : `<div class="dock-stat-bar" aria-hidden="true"><span style="width:${Math.max(6, Math.min(100, fill * 100))}%"></span></div>`;
  const cls = extraClass ? ` dock-stat ${extraClass}` : " dock-stat";
  return `<div class="${cls.trim()}">${vectorTextSvg(label, 9, DIM, CYAN, "left")}${bar}${vectorTextSvg(value, 9, CYAN, HOT, "right")}</div>`;
}

function paint(node, text, size, color, hot, align = "center") {
  if (!node) return;
  node.innerHTML = vectorTextSvg(text, size, color, hot, align);
}

export class DockBay {
  constructor() {
    this.root = document.querySelector("#dock-bay");
    this.inspect = document.querySelector("#dock-inspect");
    this.hero = document.querySelector("#dock-hero");
    this.stats = document.querySelector("#dock-stats");
    this.ships = document.querySelector("#dock-ships");
    this.ups = document.querySelector("#dock-ups");
    this.onPickShip = null;
    this.onBuy = null;
    this.onSeat = null;
    this.onBay = null;
    this.shipId = DEFAULT_SHIP_ID;
    this.upKey = "";
    this.upState = { points: 0, levels: { gun: 1, ammo: 1, missile: 1, missileType: 1, emp: 1, charges: 1, shield: 1, regen: 1 }, costs: {}, max: {} };
    this.rosterKey = "";
    this.unlocked = new Set(unlockedShipIds(0));
    this.seat = null;
    this.seats = document.querySelector("#dock-seats");
    this.bayBack = document.querySelector("#dock-bay-back");

    paint(document.querySelector("#dock-title"), "BAY", 7, CYAN, HOT, "center");
    this.setHint();
    paint(this.bayBack, "BAY", 12, CYAN, HOT, "center");
    this.buildSeats();

    this.buildShips();
    this.setUpgrades({ points: 0, levels: { gun: 1, ammo: 1, missile: 1, missileType: 1, emp: 1, charges: 1, shield: 1, regen: 1 }, costs: {}, max: {} });
    this.root?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const seat = event.target instanceof Element ? event.target.closest(".dock-seat") : null;
      if (seat?.dataset.id) {
        this.onSeat?.(seat.dataset.id);
        return;
      }
      if (event.target instanceof Element && event.target.closest("#dock-bay-back")) {
        this.onBay?.();
        return;
      }
      const up = event.target instanceof Element ? event.target.closest(".dock-up") : null;
      if (up?.dataset.id) this.onBuy?.(up.dataset.id);
      const ship = event.target instanceof Element ? event.target.closest(".dock-ship") : null;
      if (ship?.dataset.id) this.onPickShip?.(ship.dataset.id);
    });
  }

  setRoster(unlocked, xp = 0) {
    const ids = Array.isArray(unlocked) && unlocked.length ? unlocked : unlockedShipIds(0);
    const key = `${ids.join(",")}|${Math.max(0, Math.floor(Number(xp) || 0))}`;
    if (key === this.rosterKey && this.ships?.childElementCount) {
      this.setState(this.shipId);
      return;
    }
    this.rosterKey = key;
    this.unlocked = new Set(ids);
    this.buildShips(ids, xp);
    this.setState(this.shipId);
  }

  buildShips(unlocked = unlockedShipIds(0), xp = 0) {
    if (!this.ships) return;
    this.ships.innerHTML = "";
    const open = new Set(unlocked);
    const list = PLAYABLE_SHIP_IDS.map((id) => {
      const spec = SHIP_CATALOG.find((item) => item.id === id) || null;
      const need = shipUnlockAt(id);
      const free = open.has(id);
      return { id, name: spec?.name || id, spec, free, need };
    });
    for (const item of list) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `dock-ship${item.free ? "" : " is-lock"}`;
      button.dataset.id = item.id;
      const label = item.free ? item.name : `${Math.round(item.need / 1000)}K`;
      const color = item.free ? DIM : "#4a5d68";
      const hot = item.free ? CYAN : DIM;
      button.innerHTML = `${catalogMiniSvg(item.spec, 28, color, hot)}${vectorTextSvg(label, 5, color, hot, "center")}`;
      this.ships.appendChild(button);
    }
  }

  setUpgrades(state) {
    this.upState = state || this.upState;
    this.paintInspect();
    if (!this.ups) return;
    const levels = state.levels || {};
    const costs = state.costs || {};
    const max = state.max || {};
    const points = state.points || 0;
    const cols = [
      { id: "gun", name: "GUN", sub: { id: "ammo", name: "AMMO" } },
      { id: "missile", name: state.ammoName || "MSL", sub: { id: "missileType", name: "TYPE" } },
      { id: "emp", name: "EMP", sub: { id: "charges", name: "CHARGES" } },
      { id: "shield", name: "SHD", sub: { id: "regen", name: "REGEN" } },
    ];
    if (state.showGunship) cols.push({ id: "gunship", name: "GSHP" });
    const levelOf = (id) => (id === "gunship" ? levels.gunship || 0 : levels[id] || 1);
    const stamp = (row) => `${row.id}:${levelOf(row.id)}:${costs[row.id] || 0}:${max[row.id] || 0}`;
    const key = `${state.ammoName || "MSL"}|${state.showGunship ? 1 : 0}|${points}|${cols.map((col) => `${stamp(col)}${col.sub ? `|${stamp(col.sub)}` : ""}`).join("|")}`;
    if (key === this.upKey && this.ups.childElementCount) return;
    this.upKey = key;
    this.ups.innerHTML = "";
    const paintBtn = (row) => {
      const level = levelOf(row.id);
      const cap = max[row.id] || level;
      const cost = costs[row.id] || 0;
      const top = level >= cap;
      const need = top ? 0 : cost;
      const can = !top && points >= need && need > 0;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `dock-up${can ? " is-on" : ""}${top ? " is-max" : ""}`;
      btn.dataset.id = row.id;
      const price = top ? "MAX" : `${need} LP`;
      btn.innerHTML = `${vectorTextSvg(`${row.name}  ${level}`, 12, can ? CYAN : DIM, can ? HOT : CYAN, "center")}${vectorTextSvg(price, 10, can ? CYAN : DIM, can ? HOT : CYAN, "center")}`;
      return btn;
    };
    for (const col of cols) {
      const wrap = document.createElement("div");
      wrap.className = "dock-up-col";
      wrap.appendChild(paintBtn(col));
      if (col.sub) wrap.appendChild(paintBtn(col.sub));
      this.ups.appendChild(wrap);
    }
  }

  buildSeats() {
    if (!this.seats) return;
    this.seats.innerHTML = "";
    this.seats.hidden = true;
  }

  setHint() {
    paint(document.querySelector("#dock-hint"), "LOADOUT BUY  THRUST LAUNCH", 6, DIM, CYAN, "center");
  }

  setSeat(id) {
    this.seat = id || null;
    this.root?.classList.remove("is-gunning");
    this.setHint();
    this.paintHero();
  }

  paintHero() {
    this.paintInspect();
  }

  paintInspect() {
    const open = this.root && !this.root.classList.contains("is-hidden") && !this.seat;
    if (!open) {
      this.inspect?.classList.add("is-hidden");
      if (this.hero) this.hero.innerHTML = "";
      if (this.stats) this.stats.innerHTML = "";
      return;
    }
    const spec = SHIP_CATALOG.find((item) => item.id === this.shipId) || null;
    const sheet = kitLines(this.shipId, this.upState);
    if (this.hero) this.hero.innerHTML = catalogMiniSvg(spec, 350);
    if (this.stats) {
      const ratings = sheet.ratings.map((row) => statRow(row.name, row.value, row.fill)).join("");
      const facts = sheet.facts.map((row) => statRow(row.name, row.value)).join("");
      const load = sheet.load.map((row) => statRow(row.name, row.blank ? "-" : row.cap ? `${row.level} / ${row.cap}` : String(row.level), null, row.sub ? "is-sub" : "")).join("");
      const tags = sheet.tags.map((tag) => `<div class="dock-tag">${vectorTextSvg(tag, 7, DIM, CYAN, "left")}</div>`).join("");
      this.stats.innerHTML = `<div class="dock-sheet"><div class="dock-sheet-col">${vectorTextSvg(sheet.name, 16, CYAN, HOT, "left")}<div class="dock-stat-block">${ratings}<div class="dock-stat-gap"></div>${facts}</div></div><div class="dock-sheet-col">${vectorTextSvg("LOADOUT", 10, DIM, CYAN, "left")}<div class="dock-stat-block">${load}${tags ? `<div class="dock-tags">${tags}</div>` : ""}</div></div></div>`;
    }
    this.inspect?.classList.remove("is-hidden");
  }

  setState(shipId) {
    this.shipId = shipId;
    this.ships?.querySelectorAll(".dock-ship").forEach((node) => {
      node.classList.toggle("is-on", node.dataset.id === shipId);
    });
    this.paintHero();
  }

  show(shipId) {
    this.root?.classList.remove("is-hidden");
    this.setState(shipId);
  }

  hide() {
    this.root?.classList.add("is-hidden");
    this.setSeat(null);
  }
}
