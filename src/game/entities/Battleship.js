import { Container, Graphics } from "pixi.js";
import { battleship as cfg, colors, station as stationCfg } from "../config.js";
import { wrap } from "../math.js";
import { strokeGlow, strokeLine } from "../render/textures.js";
import { kitFor, kitWeapon } from "../ships/kits.js";

function acrpShotHits() {
  return Math.max(1, kitWeapon(kitFor("ACRP33"), "noseGun")?.hits || 200);
}

const CY = -(stationCfg.hub + 128);

function boxPts(x, y, w, h) {
  const hw = w * 0.5;
  const hh = h * 0.5;
  return [x - hw, y - hh, x + hw, y - hh, x + hw, y + hh, x - hw, y + hh];
}

function shift(pts, ox, oy) {
  const out = [];
  for (let i = 0; i < pts.length; i += 2) out.push(pts[i] + ox, pts[i + 1] + oy);
  return out;
}

function paintPlate(g, color, hot, w, h) {
  g.clear();
  const hw = w * 0.5;
  const hh = h * 0.5;
  const cut = Math.min(12, hw * 0.22);
  strokeGlow(g, [-hw + cut, -hh, hw - cut, -hh, hw, -hh + cut, hw, hh - cut, hw - cut, hh, -hw + cut, hh, -hw, hh - cut, -hw, -hh + cut], color, hot, 1.2);
  strokeGlow(g, boxPts(0, 0, w * 0.62, h * 0.42), color, colors.white, 0.8);
  strokeLine(g, [-hw * 0.7, 0, hw * 0.7, 0], color, hot, 0.85);
}

function hullOutline() {
  return [
    540, 0,
    508, 10,
    460, 20,
    400, 30,
    320, 38,
    240, 42,
    160, 46,
    80, 48,
    10, 52,
    -70, 58,
    -150, 66,
    -230, 78,
    -310, 84,
    -390, 80,
    -450, 68,
    -450, -68,
    -390, -80,
    -310, -84,
    -230, -78,
    -150, -66,
    -70, -58,
    10, -52,
    80, -48,
    160, -46,
    240, -42,
    320, -38,
    400, -30,
    460, -20,
    508, -10,
  ];
}

function wing(side) {
  const s = side < 0 ? -1 : 1;
  return [
    -40, 50 * s,
    70, 50 * s,
    78, 62 * s,
    70, 86 * s,
    20, 88 * s,
    -90, 86 * s,
    -118, 72 * s,
    -110, 54 * s,
    -70, 50 * s,
  ];
}

function engine(side) {
  const s = side < 0 ? -1 : 1;
  return [
    -448, 18 * s,
    -448, 58 * s,
    -470, 66 * s,
    -540, 58 * s,
    -540, 22 * s,
    -500, 16 * s,
  ];
}

function paintHull(g, color, hot, ox, oy) {
  g.clear();
  const put = (pts) => shift(pts, ox, oy);
  strokeGlow(g, put(hullOutline()), color, hot, 1.55);
  strokeGlow(g, put(wing(-1)), color, hot, 1.35);
  strokeGlow(g, put(wing(1)), color, hot, 1.35);
  strokeGlow(g, put(engine(-1)), color, hot, 1.35);
  strokeGlow(g, put(engine(1)), color, hot, 1.35);

  const inner = [
    420, 16,
    240, 26,
    40, 30,
    -160, 38,
    -320, 48,
    -320, -48,
    -160, -38,
    40, -30,
    240, -26,
    420, -16,
  ];
  strokeGlow(g, put(inner), color, hot, 1.05);

  const decks = [
    [360, 0, 88, 22],
    [268, 0, 72, 26],
    [184, 0, 70, 28],
    [100, 0, 68, 30],
    [20, 0, 72, 32],
    [-60, 0, 70, 34],
    [-140, 0, 74, 36],
    [-230, 0, 86, 40],
    [-320, 0, 78, 36],
  ];
  for (const [x, y, w, h] of decks) strokeGlow(g, put(boxPts(x, y, w, h)), color, hot, 0.95);

  const bays = [
    [-10, -72, 56, 22],
    [-10, 72, 56, 22],
    [-70, -70, 48, 20],
    [-70, 70, 48, 20],
    [-490, -40, 42, 18],
    [-490, 40, 42, 18],
    [-512, -40, 28, 14],
    [-512, 40, 28, 14],
  ];
  for (const [x, y, w, h] of bays) strokeGlow(g, put(boxPts(x, y, w, h)), color, hot, 0.9);

  strokeGlow(g, put(boxPts(200, 0, 36, 16)), colors.white, colors.white, 0.85);
  strokeGlow(g, put(boxPts(-200, 0, 40, 16)), color, colors.white, 0.85);

  const guns = [
    [150, -54, 150, -72, 188, -72, 188, -64, 150, -64],
    [150, 54, 150, 72, 188, 72, 188, 64, 150, 64],
  ];
  for (const gun of guns) strokeGlow(g, put(gun), color, hot, 1.05);

  const ribs = [
    [400, -28, 400, 28],
    [240, -40, 240, 40],
    [80, -46, 80, 46],
    [-80, -58, -80, 58],
    [-240, -78, -240, 78],
    [-400, -78, -400, 78],
    [320, -20, 80, -28],
    [320, 20, 80, 28],
    [-40, -34, -280, -46],
    [-40, 34, -280, 46],
    [-450, -18, -450, 18],
  ];
  for (const line of ribs) strokeLine(g, put(line), color, hot, 0.85);
}

function plateSlots() {
  return [
    { lx: 360, ly: CY, w: 132, h: 48 },
    { lx: 180, ly: CY, w: 118, h: 46 },
    { lx: -20, ly: CY - 74, w: 108, h: 42 },
    { lx: -20, ly: CY + 74, w: 108, h: 42 },
    { lx: -230, ly: CY, w: 128, h: 52 },
    { lx: -430, ly: CY, w: 136, h: 56 },
  ];
}

export class Battleship {
  constructor(station) {
    this.station = station;
    this.kind = "battleship";
    this.name = "BATTLESHIP";
    this.color = colors.magenta;
    this.hotColor = colors.magentaHot;
    this.alive = false;
    this.building = false;
    this.wrecked = false;
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.radius = 140;
    this.maxHp = (cfg.acrpShots || 10) * acrpShotHits();
    this.hp = this.maxHp;
    this.view = new Container();
    this.keel = new Graphics();
    this.view.addChild(this.keel);
    this.plates = [];
    this.hits = [];
    this.worldLayer = null;
    this.buildPlates();
    this.buildHits();
    this.paintKeel(false);
    this.view.visible = false;
  }

  mount(layer) {
    this.worldLayer = layer;
  }

  buildPlates() {
    const slots = plateSlots();
    const count = Math.min(cfg.plates, slots.length);
    for (let i = 0; i < count; i += 1) {
      const slot = slots[i];
      const g = new Graphics();
      paintPlate(g, this.color, this.hotColor, slot.w, slot.h);
      g.position.set(slot.lx, slot.ly);
      this.view.addChild(g);
      this.plates.push({
        slot: i,
        lx: slot.lx,
        ly: slot.ly,
        w: slot.w,
        h: slot.h,
        graphic: g,
        installed: true,
        towedBy: null,
        x: 0,
        y: 0,
        rot: 0,
        vx: 0,
        vy: 0,
        spin: 0,
      });
    }
  }

  paintKeel(on) {
    if (!on) {
      this.keel.clear();
      return;
    }
    paintHull(this.keel, this.color, this.hotColor, 0, CY);
  }

  buildHits() {
    this.hits = plateSlots().map((slot) => ({
      lx: slot.lx,
      ly: slot.ly,
      radius: Math.max(slot.w, slot.h) * 0.68,
      x: 0,
      y: 0,
      alive: false,
      kind: "battleship",
      name: this.name,
      color: this.color,
      hotColor: this.hotColor,
      ship: this,
    }));
  }

  sync() {
    if (!this.station) return;
    const at = this.station.localToWorld(0, CY);
    this.x = at.x;
    this.y = at.y;
    this.rotation = this.station.rotation;
    const live = this.alive && this.hp > 0;
    for (const hit of this.hits) {
      const pos = this.station.localToWorld(hit.lx, hit.ly);
      hit.x = pos.x;
      hit.y = pos.y;
      hit.alive = live;
    }
  }

  hitParts() {
    if (!this.alive || this.hp <= 0) return [];
    this.sync();
    return this.hits;
  }

  wound(amount = 1) {
    if (!this.alive) return false;
    this.hp -= amount;
    this.keel.alpha = 0.42 + 0.58 * Math.max(0, this.hp / this.maxHp);
    return this.hp <= 0;
  }

  resetHull() {
    this.wrecked = false;
    this.hp = this.maxHp;
    this.alive = true;
    this.keel.alpha = 1;
  }

  localToWorld(lx, ly) {
    return this.station.localToWorld(lx, ly);
  }

  slotWorld(plate) {
    return this.localToWorld(plate.lx, plate.ly);
  }

  seat(plate) {
    plate.installed = true;
    plate.towedBy = null;
    plate.vx = 0;
    plate.vy = 0;
    plate.spin = 0;
    this.view.addChild(plate.graphic);
    plate.graphic.position.set(plate.lx, plate.ly);
    plate.graphic.rotation = 0;
    plate.graphic.visible = true;
  }

  release(plate) {
    const at = this.slotWorld(plate);
    const out = 160 + plate.slot * 36;
    const a = Math.atan2(plate.ly, plate.lx + 0.01) + this.station.rotation;
    plate.installed = false;
    plate.towedBy = null;
    plate.x = at.x + Math.cos(a + 0.6) * out;
    plate.y = at.y + Math.sin(a + 0.6) * out;
    plate.rot = this.station.rotation + plate.slot * 0.2;
    plate.vx = Math.cos(a) * 10;
    plate.vy = Math.sin(a) * 10;
    plate.spin = (plate.slot % 2 === 0 ? 1 : -1) * 0.12;
    this.worldLayer?.addChild(plate.graphic);
    plate.graphic.visible = true;
  }

  hide() {
    this.building = false;
    this.alive = false;
    this.hp = 0;
    for (const hit of this.hits) hit.alive = false;
    this.view.visible = false;
    this.paintKeel(false);
    for (const plate of this.plates) {
      plate.installed = true;
      plate.towedBy = null;
      plate.graphic.visible = false;
      this.view.addChild(plate.graphic);
      plate.graphic.position.set(plate.lx, plate.ly);
    }
  }

  startYard() {
    this.building = true;
    this.resetHull();
    this.view.visible = true;
    this.paintKeel(true);
    for (const plate of this.plates) {
      if (plate.slot < cfg.startPlates) this.seat(plate);
      else this.release(plate);
    }
  }

  wreck() {
    this.wrecked = true;
    this.hide();
  }

  complete() {
    this.building = false;
    this.resetHull();
    this.view.visible = true;
    this.paintKeel(true);
    for (const plate of this.plates) this.seat(plate);
  }

  setBuild(wave, force = false) {
    if (wave < cfg.fromWave) this.hide();
    else if (this.wrecked && !force) return;
    else if (force || !this.building) this.startYard();
  }

  loosePlates() {
    return this.plates.filter((plate) => !plate.installed);
  }

  dropTow(crane) {
    for (const plate of this.plates) {
      if (plate.towedBy !== crane) continue;
      plate.towedBy = null;
      plate.vx += Math.cos(crane.rotation) * 36;
      plate.vy += Math.sin(crane.rotation) * 36;
    }
  }

  tickLoose(dt, space) {
    if (!this.building) return;
    for (const plate of this.plates) {
      if (plate.installed) continue;
      if (plate.towedBy?.alive) {
        const crane = plate.towedBy;
        plate.x = crane.x - Math.cos(crane.rotation) * 140;
        plate.y = crane.y - Math.sin(crane.rotation) * 140;
        plate.rot += plate.spin * dt * 0.2;
        plate.vx = crane.vx;
        plate.vy = crane.vy;
      } else {
        plate.towedBy = null;
        plate.x += plate.vx * dt;
        plate.y += plate.vy * dt;
        plate.rot += plate.spin * dt;
        plate.vx *= 0.992;
        plate.vy *= 0.992;
      }
      wrap(plate, space.width, space.height);
    }
  }

  loosePieces() {
    return this.loosePlates();
  }
}
