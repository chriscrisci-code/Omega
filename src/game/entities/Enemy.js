import { Container, Graphics } from "pixi.js";
import { castle, colors, corvette as corvetteCfg, crane as craneCfg, destroyer as destroyerConfig, raid } from "../config.js";
import { turnToward, wrap, wrapDelta } from "../math.js";
import { strokeGlow, strokeLine } from "../render/textures.js";

export const HUNTER = [12, 0, -8, 6, -4, 0, -8, -6];
export const RAIDER = [15, 0, -5, 8, -11, 0, -5, -8];
export const CORVETTE = [
  30, 0,
  22, 7,
  8, 11,
  -10, 12,
  -22, 9,
  -28, 4,
  -28, -4,
  -22, -9,
  -10, -12,
  8, -11,
  22, -7,
];
const CORVETTE_INNER = [16, 4, -12, 5, -12, -5, 16, -4];
const CORVETTE_ENGINES = [
  [-28, 7, -36, 6, -36, 2, -28, 2],
  [-28, -7, -36, -6, -36, -2, -28, -2],
];
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
      strokeGlow(this.g, CORVETTE_INNER, this.color, this.hotColor, 1.15);
      for (const engine of CORVETTE_ENGINES) strokeGlow(this.g, engine, this.color, this.hotColor, 1.2);
      strokeLine(this.g, [8, 11, 8, -11], this.color, this.hotColor, 0.95);
      strokeLine(this.g, [-10, 12, -10, -12], this.color, this.hotColor, 0.9);
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
    this.shieldG.ellipse(0, 0, 34, 16);
    this.shieldG.stroke({ width: 2.4, color: this.color, alpha: 0.1 + t * 0.16 });
    this.shieldG.ellipse(0, 0, 34, 16);
    this.shieldG.stroke({ width: 1.05, color: this.hotColor, alpha: 0.28 + t * 0.4 });
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
    const tip = this.role === "raider" ? 15 : this.role === "destroyer" ? 52 : this.role === "corvette" ? 30 : 12;
    return {
      x: this.x + Math.cos(this.rotation) * tip,
      y: this.y + Math.sin(this.rotation) * tip,
    };
  }

  stun(seconds) {
    this.stunned = Math.max(this.stunned, seconds);
    this.vx *= 0.15;
    this.vy *= 0.15;
    this.cooldown = Math.max(this.cooldown, seconds);
    this.laserCharge = 0;
    this.laserOn = false;
    this.laserG.clear();
  }

  update(dt, target, space, aimedAt, extras = {}) {
    if (this.stunned > 0) {
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
    const cap = this.role === "raider" ? 400 : this.role === "destroyer" ? 110 : this.role === "corvette" ? corvetteCfg.speed : this.role === "crane" ? craneCfg.speed : 340;
    let ax = 0;
    let ay = 0;
    if (this.role === "corvette") {
      const seen = Boolean(extras.seen);
      if (this.dodgeUntil <= 0) {
        this.dodgeSign *= -1;
        this.dodgeUntil = seen ? 0.2 + Math.random() * 0.28 : 0.55;
        this.veer = (0.4 + Math.random() * 0.7) * this.dodgeSign;
      }
      const course = seen ? toTarget + this.veer : toTarget;
      this.rotation = turnToward(this.rotation, course, turn * dt);
      ax += Math.cos(this.rotation) * chase;
      ay += Math.sin(this.rotation) * chase;
      if (seen) {
        ax += (-dy / dist) * 420 * this.dodgeSign;
        ay += (dx / dist) * 420 * this.dodgeSign;
      }
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

    if (aimedAt && this.role !== "destroyer" && this.role !== "crane") {
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
