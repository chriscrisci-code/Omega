import { Container, Graphics } from "pixi.js";
import { castle, colors, corvette as corvetteCfg, crane as craneCfg, destroyer as destroyerConfig, raid } from "../config.js";
import { turnToward, wrap, wrapCoord, wrapDelta } from "../math.js";
import { strokeGlow, strokeLine } from "../render/textures.js";

export const HUNTER = [12, 0, -8, 6, -4, 0, -8, -6];
export const RAIDER = [15, 0, -5, 8, -11, 0, -5, -8];
function scaleXY(pts, sx, sy = sx) {
  const out = [];
  for (let i = 0; i < pts.length; i += 2) out.push(pts[i] * sx, pts[i + 1] * sy);
  return out;
}

function boxPts(x, y, w, h) {
  const hw = w * 0.5;
  const hh = h * 0.5;
  return [x - hw, y - hh, x + hw, y - hh, x + hw, y + hh, x - hw, y + hh];
}

function ringPts(sides, radius, turn = 0) {
  const points = [];
  for (let i = 0; i < sides; i += 1) {
    const a = turn + (i / sides) * Math.PI * 2;
    points.push(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  return points;
}

/** Battleship silhouette at corvette scale. */
const CV_SX = 0.072;
const CV_SY = 0.16;
const cv = (pts) => scaleXY(pts, CV_SX, CV_SY);

export const CORVETTE = cv([
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
]);
const CORVETTE_INNER = cv([
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
]);
const CORVETTE_WINGS = [
  cv([-40, 50, 70, 50, 78, 62, 70, 86, 20, 88, -90, 86, -118, 72, -110, 54, -70, 50]),
  cv([-40, -50, 70, -50, 78, -62, 70, -86, 20, -88, -90, -86, -118, -72, -110, -54, -70, -50]),
];
const CORVETTE_ENGINES = [
  cv([-448, 18, -448, 58, -470, 66, -540, 58, -540, 22, -500, 16]),
  cv([-448, -18, -448, -58, -470, -66, -540, -58, -540, -22, -500, -16]),
];
const CORVETTE_DECKS = [
  [360, 0, 88, 22],
  [184, 0, 70, 28],
  [20, 0, 72, 32],
  [-140, 0, 74, 36],
  [-320, 0, 78, 36],
].map(([x, y, w, h]) => cv(boxPts(x, y, w, h)));
const CORVETTE_GUNS = [
  cv([150, -54, 150, -72, 188, -72, 188, -64, 150, -64]),
  cv([150, 54, 150, 72, 188, 72, 188, 64, 150, 64]),
];
const CORVETTE_BRIDGES = [cv(boxPts(200, 0, 36, 16)), cv(boxPts(-200, 0, 40, 16))];
const CORVETTE_LINES = [
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
].map((line) => cv(line));
const CRANE_BARGE = [18, 7, -16, 9, -22, 0, -16, -9, 18, -7];
export const CRANE = [78, 58, -54, 52, -64, 0, -54, -52, 58, -38];

function shiftPoly(pts, dx, dy, scale = 1) {
  const out = [];
  for (let i = 0; i < pts.length; i += 2) out.push(pts[i] * scale + dx, pts[i + 1] * scale + dy);
  return out;
}
export const DESTROYER = [
  40, 13,
  52, 6,
  52, -6,
  40, -13,
  -68, -13,
  -68, 13,
];
const DESTROYER_BODY = [40, 13, -40, 13, -40, -13, 40, -13];
const DESTROYER_AFT = [-40, 13, -68, 13, -68, -13, -40, -13];
const DESTROYER_NOSE = [40, 13, 52, 6, 52, -6, 40, -13];
const DESTROYER_INNER = [28, 7, -22, 7, -22, -7, 28, -7];
const DESTROYER_CORE = [12, 4, -8, 4, -8, -4, 12, -4];
const DESTROYER_ENGINES = [
  [-68, 11, -78, 11, -78, 4, -68, 4],
  [-68, -11, -78, -11, -78, -4, -68, -4],
];
const DESTROYER_LINES = [
  [40, 13, 40, -13],
  [-40, 13, -40, -13],
  [-68, 13, -68, -13],
  [0, 13, 0, 7],
  [0, -13, 0, -7],
];

function roleOf(options) {
  if (options.role === "raider") return "raider";
  if (options.role === "destroyer") return "destroyer";
  if (options.role === "corvette") return "corvette";
  if (options.role === "crane") return "crane";
  return "hunter";
}

export class Enemy {
  constructor(x, y, home, color, options = {}) {
    this.home = home;
    this.color = color;
    this.hotColor = home.hotColor;
    this.role = roleOf(options);
    this.kind = this.role === "raider" ? "raider" : this.role === "destroyer" ? "destroyer" : this.role === "corvette" ? "corvette" : this.role === "crane" ? "crane" : "enemy";
    this.name = this.role === "raider" ? "RAIDER" : this.role === "destroyer" ? "DESTROYER" : this.role === "corvette" ? "CORVETTE" : this.role === "crane" ? "CRANE" : "HUNTER";
    this.hull = this.role === "raider" ? RAIDER : this.role === "destroyer" ? DESTROYER : this.role === "corvette" ? CORVETTE : this.role === "crane" ? CRANE : HUNTER;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.rotation = 0;
    this.radius = this.role === "raider" ? 13 : this.role === "destroyer" ? 56 : this.role === "corvette" ? corvetteCfg.radius : this.role === "crane" ? 52 : 11;
    this.hp = this.role === "raider" ? raid.hits : this.role === "destroyer" ? destroyerConfig.hits : this.role === "corvette" ? corvetteCfg.hits : this.role === "crane" ? craneCfg.hp : castle.hunterHits;
    this.job = null;
    this.maxHp = this.hp;
    this.cooldown = this.role === "raider" ? 0.9 : this.role === "destroyer" ? 1.25 : this.role === "corvette" ? 0.7 : 0.6;
    this.ramCool = 0;
    this.dodgeUntil = 0;
    this.dodgeSign = 1;
    this.veer = 0;
    this.evadeHold = 0;
    this.evadeHeading = 0;
    this.warping = false;
    this.warpT = 0;
    this.warpDur = 1;
    this.warpCool = 0;
    this.warpArmed = false;
    this.didWarp = false;
    this.stunned = 0;
    this.laserCharge = 0;
    this.laserOn = false;
    this.laserCool = 0;
    this.shieldMax = this.role === "destroyer" ? destroyerConfig.shieldHits : this.role === "corvette" ? corvetteCfg.shieldHits : 0;
    this.shieldHp = this.shieldMax;
    this.shieldHurt = 0;
    this.shieldRegen = 0;
    this.gunSign = 1;
    this.flashes = [];
    this.alive = true;

    this.view = new Container();
    this.g = new Graphics();
    this.flashG = new Graphics();
    this.laserG = new Graphics();
    this.shieldG = new Graphics();
    this.view.addChild(this.laserG, this.shieldG, this.g, this.flashG);
    this.paintHull();
    this.paintShield();
  }

  turretLocal(side = 1) {
    return side > 0 ? { x: 28, y: 0 } : { x: -54, y: 0 };
  }

  turretWorld(side = 1) {
    const local = this.turretLocal(side);
    const c = Math.cos(this.rotation);
    const s = Math.sin(this.rotation);
    return {
      x: this.x + local.x * c - local.y * s,
      y: this.y + local.x * s + local.y * c,
    };
  }

  addHitFlash(wx, wy, width, height, life = 0.07) {
    const dx = wrapDelta(wx - this.x, width);
    const dy = wrapDelta(wy - this.y, height);
    const c = Math.cos(-this.rotation);
    const s = Math.sin(-this.rotation);
    this.flashes.push({
      x: dx * c - dy * s,
      y: dx * s + dy * c,
      life,
      maxLife: life,
    });
    this.paintFlashes();
  }

  tickFlashes(dt) {
    if (!this.flashes.length) return;
    this.flashes = this.flashes.filter((flash) => {
      flash.life -= dt;
      return flash.life > 0;
    });
    this.paintFlashes();
  }

  paintFlashes() {
    this.flashG.clear();
    for (const flash of this.flashes) {
      const t = Math.max(0, flash.life / (flash.maxLife || 0.07));
      const reach = 12 + t * 24;
      this.flashG.circle(flash.x, flash.y, reach * 1.25);
      this.flashG.stroke({ width: 14, color: colors.white, alpha: 0.12 * t });
      this.flashG.circle(flash.x, flash.y, reach * 0.85);
      this.flashG.stroke({ width: 7, color: this.hotColor, alpha: 0.28 * t });
      this.flashG.circle(flash.x, flash.y, reach * 0.4);
      this.flashG.stroke({ width: 2.4, color: colors.white, alpha: 0.4 * t });
    }
  }

  paintHull() {
    this.g.clear();
    if (this.role === "crane") {
      const g = this.g;
      const color = this.color;
      const hot = this.hotColor;
      const scale = 1.55;
      const spread = 32;
      strokeGlow(g, shiftPoly(CRANE_BARGE, 0, -spread, scale), color, hot, 1.5);
      strokeGlow(g, shiftPoly(CRANE_BARGE, 0, spread, scale), color, hot, 1.5);
      strokeGlow(g, shiftPoly([16, 2.2, -14, 3, -14, -3, 16, -2.2], 0, -spread, scale), color, hot, 1.05);
      strokeGlow(g, shiftPoly([16, 2.2, -14, 3, -14, -3, 16, -2.2], 0, spread, scale), color, hot, 1.05);
      for (const y of [-12, 0, 12]) strokeLine(g, [-26, y, 26, y], color, hot, 1.05);
      for (const x of [-18, 0, 18]) strokeLine(g, [x, -28, x, 28], color, hot, 1);
      strokeLine(g, [-26, -12, 26, 12], color, hot, 0.95);
      strokeLine(g, [-26, 12, 26, -12], color, hot, 0.95);
      g.circle(0, 0, 9);
      g.stroke({ width: 2.2, color, alpha: 0.2 });
      g.circle(0, 0, 9);
      g.stroke({ width: 1.25, color: hot });
      g.circle(0, 0, 4);
      g.stroke({ width: 1, color: colors.white, alpha: 0.8 });
      strokeLine(g, [-8, 6, 6, 58], color, hot, 1.45);
      strokeLine(g, [8, 6, 18, 58], color, hot, 1.45);
      strokeLine(g, [-8, 6, 8, 6], color, hot, 1.15);
      for (let i = 1; i <= 5; i += 1) {
        const t = i / 6;
        strokeLine(
          g,
          [-8 + 14 * t, 6 + 52 * t, 8 + 10 * t, 6 + 52 * t],
          color,
          hot,
          0.95,
        );
      }
      strokeLine(g, [6, 58, 18, 58], color, hot, 1.35);
      strokeLine(g, [12, 58, 12, 78], color, hot, 1.25);
      g.circle(12, 82, 3.6);
      g.stroke({ width: 1.2, color: colors.white, alpha: 0.9 });
      return;
    }
    if (this.role === "corvette") {
      strokeGlow(this.g, CORVETTE, this.color, this.hotColor, 1.5);
      for (const wing of CORVETTE_WINGS) strokeGlow(this.g, wing, this.color, this.hotColor, 1.3);
      for (const engine of CORVETTE_ENGINES) strokeGlow(this.g, engine, this.color, this.hotColor, 1.3);
      strokeGlow(this.g, CORVETTE_INNER, this.color, this.hotColor, 1.05);
      for (const deck of CORVETTE_DECKS) strokeGlow(this.g, deck, this.color, this.hotColor, 0.95);
      for (const gun of CORVETTE_GUNS) strokeGlow(this.g, gun, this.color, this.hotColor, 1.05);
      strokeGlow(this.g, CORVETTE_BRIDGES[0], colors.white, colors.white, 0.85);
      strokeGlow(this.g, CORVETTE_BRIDGES[1], this.color, colors.white, 0.85);
      for (const line of CORVETTE_LINES) strokeLine(this.g, line, this.color, this.hotColor, 0.85);
      return;
    }
    if (this.role !== "destroyer") {
      strokeGlow(this.g, this.hull, this.color, this.hotColor, this.role === "raider" ? 1.55 : 1.4);
      return;
    }
    strokeGlow(this.g, DESTROYER_BODY, this.color, this.hotColor, 1.55);
    strokeGlow(this.g, DESTROYER_AFT, this.color, this.hotColor, 1.5);
    strokeGlow(this.g, DESTROYER_NOSE, this.color, this.hotColor, 1.5);
    strokeGlow(this.g, DESTROYER_INNER, this.color, this.hotColor, 1.3);
    strokeGlow(this.g, DESTROYER_CORE, this.color, this.hotColor, 1.2);
    for (const engine of DESTROYER_ENGINES) strokeGlow(this.g, engine, this.color, this.hotColor, 1.3);
    for (const line of DESTROYER_LINES) strokeLine(this.g, line, this.color, this.hotColor, 1.05);
    for (const side of [-1, 1]) {
      const gun = this.turretLocal(side);
      this.g.circle(gun.x, gun.y, 5.2);
      this.g.stroke({ width: 3.4, color: this.color, alpha: 0.22 });
      this.g.circle(gun.x, gun.y, 5.2);
      this.g.stroke({ width: 1.2, color: this.hotColor });
      this.g.circle(gun.x, gun.y, 2);
      this.g.stroke({ width: 1, color: colors.white, alpha: 0.85 });
    }
  }

  paintLaser(target, space, strength = 0, blocked = false) {
    this.laserG.clear();
    if (!target || strength <= 0) return;
    const dx = wrapDelta(target.x - this.x, space.width);
    const dy = wrapDelta(target.y - this.y, space.height);
    const c = Math.cos(-this.rotation);
    const s = Math.sin(-this.rotation);
    const lx = dx * c - dy * s;
    const ly = dx * s + dy * c;
    const color = blocked ? colors.cyan : this.color;
    const hot = blocked ? colors.cyanHot : this.hotColor;
    const alpha = blocked ? 0.22 : 0.12 + strength * 0.7;
    for (const side of [-1, 1]) {
      const gun = this.turretLocal(side);
      this.laserG.moveTo(gun.x, gun.y);
      this.laserG.lineTo(lx, ly);
      this.laserG.stroke({ width: 3.4 + strength * 3.2, color, alpha: alpha * 0.45, cap: "round" });
      this.laserG.moveTo(gun.x, gun.y);
      this.laserG.lineTo(lx, ly);
      this.laserG.stroke({ width: 1.05 + strength * 1.1, color: hot, alpha, cap: "round" });
    }
  }

  paintShield() {
    this.shieldG.clear();
    if (this.role !== "corvette" || this.shieldHp <= 0) return;
    const t = this.shieldHp / Math.max(1, this.shieldMax);
    const r = corvetteCfg.shieldRadius || 56;
    strokeGlow(this.shieldG, ringPts(16, r), this.color, this.hotColor, 1.25 + t * 0.3);
    strokeGlow(this.shieldG, ringPts(8, r * 0.72), this.color, this.hotColor, 1.05 + t * 0.2);
  }

  noteShieldHit() {
    this.shieldHurt = corvetteCfg.regenDelay;
    this.shieldRegen = corvetteCfg.regenEvery;
    this.paintShield();
  }

  tickShield(dt) {
    if (this.role !== "corvette" || this.shieldMax <= 0) return;
    if (this.shieldHurt > 0) {
      this.shieldHurt = Math.max(0, this.shieldHurt - dt);
      return;
    }
    if (this.shieldHp >= this.shieldMax) return;
    this.shieldRegen -= dt;
    if (this.shieldRegen > 0) return;
    this.shieldHp += 1;
    this.shieldRegen = corvetteCfg.regenEvery;
    this.paintShield();
  }

  nose() {
    const tip = this.role === "raider" ? 15 : this.role === "destroyer" ? 52 : this.role === "corvette" ? 39 : 12;
    return {
      x: this.x + Math.cos(this.rotation) * tip,
      y: this.y + Math.sin(this.rotation) * tip,
    };
  }

  stun(seconds) {
    this.warping = false;
    this.warpArmed = false;
    this.view.alpha = 1;
    this.stunned = Math.max(this.stunned, seconds);
    this.vx *= 0.15;
    this.vy *= 0.15;
    this.cooldown = Math.max(this.cooldown, seconds);
    this.laserCharge = 0;
    this.laserOn = false;
    this.laserG.clear();
  }

  playerLined(extras, space) {
    if (!Number.isFinite(extras.playerX) || !Number.isFinite(extras.playerRot) || !space) return false;
    const dx = wrapDelta(this.x - extras.playerX, space.width);
    const dy = wrapDelta(this.y - extras.playerY, space.height);
    if (Math.hypot(dx, dy) < 48) return true;
    const bearing = Math.atan2(dy, dx);
    return Math.abs(wrapDelta(extras.playerRot - bearing, Math.PI * 2)) < (corvetteCfg.aimCone || 0.22);
  }

  pickEvadeHeading(toHub, extras, space) {
    const awayHub = toHub + Math.PI;
    if (!Number.isFinite(extras.playerX) || !space) return awayHub;
    const dx = wrapDelta(this.x - extras.playerX, space.width);
    const dy = wrapDelta(this.y - extras.playerY, space.height);
    const fromPlayer = Math.atan2(dy, dx);
    const cut = 1.2;
    const left = fromPlayer + cut;
    const right = fromPlayer - cut;
    const leftOff = Math.abs(wrapDelta(left - awayHub, Math.PI * 2));
    const rightOff = Math.abs(wrapDelta(right - awayHub, Math.PI * 2));
    return leftOff <= rightOff ? left : right;
  }

  beginWarp(dx, dy, duration) {
    this.warping = true;
    this.warpT = 0;
    this.warpDur = Math.max(0.08, duration || 0.2);
    this.warpFromX = this.x;
    this.warpFromY = this.y;
    this.warpDx = dx;
    this.warpDy = dy;
    this.vx = 0;
    this.vy = 0;
    this.didWarp = true;
  }

  tickWarp(dt, space) {
    this.warpT += dt;
    const u = Math.min(1, this.warpT / this.warpDur);
    const e = u * u * (3 - 2 * u);
    this.x = wrapCoord(this.warpFromX + this.warpDx * e, space.width);
    this.y = wrapCoord(this.warpFromY + this.warpDy * e, space.height);
    this.vx = 0;
    this.vy = 0;
    this.view.alpha = 0.28 + Math.abs(u - 0.5) * 1.44;
    if (u < 1) return;
    this.warping = false;
    this.view.alpha = 1;
    const burst = corvetteCfg.evadeSpeed || corvetteCfg.speed;
    this.vx = Math.cos(this.rotation) * burst;
    this.vy = Math.sin(this.rotation) * burst;
  }

  startEvade(toHub, extras, space, hop) {
    if (this.evadeHold <= 0) {
      this.evadeHeading = this.pickEvadeHeading(toHub, extras, space);
      this.evadeHold = (corvetteCfg.evade || 1.45) * (0.92 + Math.random() * 0.2);
    }
    if (hop && this.warpCool <= 0 && !this.warping) this.warpArmed = true;
  }

  tryWarp() {
    if (!this.warpArmed || this.warpCool > 0 || this.warping) return;
    const err = Math.abs(wrapDelta(this.rotation - this.evadeHeading, Math.PI * 2));
    if (err > 0.28) return;
    const range = (corvetteCfg.warpRange || 440) * (0.88 + Math.random() * 0.22);
    this.beginWarp(Math.cos(this.evadeHeading) * range, Math.sin(this.evadeHeading) * range, corvetteCfg.warpDur || 0.2);
    this.warpCool = corvetteCfg.warpCool || 7.5;
    this.warpArmed = false;
  }

  steerCorvette(dt, toHub, extras, aimedAt, space) {
    this.warpCool = Math.max(0, (this.warpCool || 0) - dt);
    this.evadeHold = Math.max(0, (this.evadeHold || 0) - dt);
    const px = Number.isFinite(extras.playerX) ? wrapDelta(extras.playerX - this.x, space.width) : 0;
    const py = Number.isFinite(extras.playerY) ? wrapDelta(extras.playerY - this.y, space.height) : 0;
    const pDist = Math.hypot(px, py);
    const close = pDist > 1 && pDist < (corvetteCfg.warn || 860);
    const lined = Boolean(aimedAt) || this.playerLined(extras, space);
    if (lined) this.startEvade(toHub, extras, space, true);
    else if (close) this.startEvade(toHub, extras, space, false);
    const evading = this.evadeHold > 0 || this.warpArmed;
    if (!lined && !close && !evading) {
      this.warpArmed = false;
      this.rotation = turnToward(this.rotation, toHub, corvetteCfg.turn * dt);
      return corvetteCfg.chase;
    }
    const course = evading ? this.evadeHeading : this.pickEvadeHeading(toHub, extras, space);
    this.rotation = turnToward(this.rotation, course, corvetteCfg.turn * dt);
    this.tryWarp();
    return evading ? corvetteCfg.chase * 1.2 : corvetteCfg.chase;
  }

  update(dt, target, space, aimedAt, extras = {}) {
    if (this.stunned > 0) {
      this.warping = false;
      this.view.alpha = 1;
      this.stunned = Math.max(0, this.stunned - dt);
      this.vx *= 0.88;
      this.vy *= 0.88;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      wrap(this, space.width, space.height);
      this.cooldown = Math.max(this.cooldown, this.stunned);
      this.view.rotation = this.rotation;
      this.view.alpha = this.stunned > 0 ? 0.28 + 0.22 * (0.5 + 0.5 * Math.sin(this.stunned * 18)) : 1;
      this.tickFlashes(dt);
      this.tickShield(dt);
      return;
    }
    if (this.role === "corvette" && this.warping) {
      this.tickWarp(dt, space);
      this.cooldown = Math.max(0, this.cooldown - dt);
      this.ramCool = Math.max(0, this.ramCool - dt);
      this.warpCool = Math.max(0, this.warpCool - dt);
      this.view.rotation = this.rotation;
      this.tickFlashes(dt);
      this.tickShield(dt);
      return;
    }
    this.view.alpha = 1;
    const dx = wrapDelta(target.x - this.x, space.width);
    const dy = wrapDelta(target.y - this.y, space.height);
    const dist = Math.hypot(dx, dy) || 1;
    const toTarget = Math.atan2(dy, dx);
    const turn = this.role === "raider" ? 2.2 : this.role === "destroyer" ? destroyerConfig.turn : this.role === "corvette" ? corvetteCfg.turn : this.role === "crane" ? craneCfg.turn : 2.8;
    const craneHold = this.job?.kind === "weld" || this.job?.phase === "haul" || this.job?.phase === "dock" ? 22 : craneCfg.hold;
    const hold = this.role === "raider" ? 210 : this.role === "destroyer" ? 420 : this.role === "crane" ? craneHold : 220;
    const chase = this.role === "raider" ? 400 : this.role === "destroyer" ? 170 : this.role === "corvette" ? corvetteCfg.chase : this.role === "crane" ? craneCfg.speed : 320;
    const back = this.role === "raider" ? 220 : this.role === "destroyer" ? 90 : this.role === "crane" ? 40 : 260;
    const cap = this.role === "raider" ? 400 : this.role === "destroyer" ? 110 : this.role === "corvette" ? (this.evadeHold > 0 ? corvetteCfg.evadeSpeed || corvetteCfg.speed : corvetteCfg.speed) : this.role === "crane" ? craneCfg.speed : 340;
    let ax = 0;
    let ay = 0;
    if (this.role === "corvette") {
      const cut = this.steerCorvette(dt, toTarget, extras, aimedAt, space);
      if (this.warping) {
        this.tickWarp(dt, space);
        this.cooldown = Math.max(0, this.cooldown - dt);
        this.ramCool = Math.max(0, this.ramCool - dt);
        this.view.rotation = this.rotation;
        this.tickFlashes(dt);
        this.tickShield(dt);
        return;
      }
      ax += Math.cos(this.rotation) * cut;
      ay += Math.sin(this.rotation) * cut;
    } else if (this.role === "destroyer") {
      let course = toTarget;
      if (dist < hold - 60) course = toTarget + Math.PI;
      else if (dist < hold + 80) course = toTarget + Math.PI * 0.5;
      this.rotation = turnToward(this.rotation, course, turn * dt);
      const thrust = dist > hold + 40 ? chase : dist < hold - 40 ? -back : 36;
      ax += Math.cos(this.rotation) * thrust;
      ay += Math.sin(this.rotation) * thrust;
    } else {
      this.rotation = turnToward(this.rotation, toTarget, turn * dt);
      if (dist > hold + 40) {
        ax += (dx / dist) * chase;
        ay += (dy / dist) * chase;
      } else if (dist < hold - 40) {
        ax -= (dx / dist) * back;
        ay -= (dy / dist) * back;
      } else {
        ax += (-dy / dist) * 140;
        ay += (dx / dist) * 140;
      }
    }

    if (aimedAt && this.role !== "destroyer" && this.role !== "crane" && this.role !== "corvette") {
      if (this.dodgeUntil <= 0) {
        this.dodgeSign *= -1;
        this.dodgeUntil = 0.28 + Math.random() * 0.2;
      }
      ax += (-dy / dist) * 520 * this.dodgeSign;
      ay += (dx / dist) * 520 * this.dodgeSign;
    }
    this.dodgeUntil = Math.max(0, this.dodgeUntil - dt);

    this.vx += ax * dt;
    this.vy += ay * dt;
    const drag = Math.pow(0.96, dt * 60);
    this.vx *= drag;
    this.vy *= drag;
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > cap) {
      this.vx *= cap / speed;
      this.vy *= cap / speed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    wrap(this, space.width, space.height);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.ramCool = Math.max(0, this.ramCool - dt);
    this.view.rotation = this.rotation;
    this.tickFlashes(dt);
    this.tickShield(dt);
    this.paintCable(target, space);
  }

  paintCable(target, space) {
    this.laserG.clear();
    if (this.role !== "crane" || !this.job?.piece || this.job.piece.towedBy !== this) return;
    const piece = this.job.piece;
    const dx = wrapDelta(piece.x - this.x, space.width);
    const dy = wrapDelta(piece.y - this.y, space.height);
    const c = Math.cos(-this.rotation);
    const s = Math.sin(-this.rotation);
    const lx = dx * c - dy * s;
    const ly = dx * s + dy * c;
    this.laserG.moveTo(12, 82);
    this.laserG.lineTo(lx, ly);
    this.laserG.stroke({ width: 1.35, color: this.hotColor, alpha: 0.7, cap: "round" });
  }

  wantsShot(target, space) {
    if (this.role === "crane") return false;
    if (this.stunned > 0 || this.cooldown > 0 || !target) return false;
    const dx = wrapDelta(target.x - this.x, space.width);
    const dy = wrapDelta(target.y - this.y, space.height);
    const dist = Math.hypot(dx, dy);
    const max = this.role === "raider" ? 460 : this.role === "destroyer" ? 640 : this.role === "corvette" ? 540 : 520;
    const min = this.role === "raider" ? 90 : this.role === "corvette" ? 80 : 70;
    if (dist > max || dist < min) return false;
    if (this.role === "destroyer") return true;
    const err = Math.abs(wrapDelta(this.rotation - Math.atan2(dy, dx), Math.PI * 2));
    return err < (this.role === "corvette" ? 0.4 : 0.18);
  }

  destroy() {
    this.alive = false;
    if (!this.view.destroyed) this.view.destroy({ children: true });
  }
}
