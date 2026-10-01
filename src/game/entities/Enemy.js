import { Container, Graphics } from "pixi.js";
import { castle, colors, destroyer as destroyerConfig, raid } from "../config.js";
import { turnToward, wrap, wrapDelta } from "../math.js";
import { strokeGlow, strokeLine } from "../render/textures.js";

export const HUNTER = [12, 0, -8, 6, -4, 0, -8, -6];
export const RAIDER = [15, 0, -5, 8, -11, 0, -5, -8];
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
  return "hunter";
}

export class Enemy {
  constructor(x, y, home, color, options = {}) {
    this.home = home;
    this.color = color;
    this.hotColor = home.hotColor;
    this.role = roleOf(options);
    this.kind = this.role === "raider" ? "raider" : this.role === "destroyer" ? "destroyer" : "enemy";
    this.name = this.role === "raider" ? "RAIDER" : this.role === "destroyer" ? "DESTROYER" : "HUNTER";
    this.hull = this.role === "raider" ? RAIDER : this.role === "destroyer" ? DESTROYER : HUNTER;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.rotation = 0;
    this.radius = this.role === "raider" ? 13 : this.role === "destroyer" ? 56 : 11;
    this.hp = this.role === "raider" ? raid.hits : this.role === "destroyer" ? destroyerConfig.hits : castle.hunterHits;
    this.cooldown = this.role === "raider" ? 0.9 : this.role === "destroyer" ? 1.25 : 0.6;
    this.ramCool = 0;
    this.dodgeUntil = 0;
    this.dodgeSign = 1;
    this.stunned = 0;
    this.laserCharge = 0;
    this.laserOn = false;
    this.laserCool = 0;
    this.shieldMax = this.role === "destroyer" ? destroyerConfig.shieldHits : 0;
    this.shieldHp = this.shieldMax;
    this.gunSign = 1;
    this.flashes = [];
    this.alive = true;

    this.view = new Container();
    this.g = new Graphics();
    this.flashG = new Graphics();
    this.laserG = new Graphics();
    this.view.addChild(this.laserG, this.g, this.flashG);
    this.paintHull();
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

  nose() {
    const tip = this.role === "raider" ? 15 : this.role === "destroyer" ? 52 : 12;
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

  update(dt, target, space, aimedAt) {
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
      return;
    }
    this.view.alpha = 1;
    const dx = wrapDelta(target.x - this.x, space.width);
    const dy = wrapDelta(target.y - this.y, space.height);
    const dist = Math.hypot(dx, dy) || 1;
    const toTarget = Math.atan2(dy, dx);
    const turn = this.role === "raider" ? 2.2 : this.role === "destroyer" ? destroyerConfig.turn : 2.8;
    const hold = this.role === "raider" ? 210 : this.role === "destroyer" ? 420 : 220;
    const chase = this.role === "raider" ? 400 : this.role === "destroyer" ? 170 : 320;
    const back = this.role === "raider" ? 220 : this.role === "destroyer" ? 90 : 260;
    const cap = this.role === "raider" ? 400 : this.role === "destroyer" ? 110 : 340;
    let ax = 0;
    let ay = 0;
    if (this.role === "destroyer") {
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

    if (aimedAt && this.role !== "destroyer") {
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
  }

  wantsShot(target, space) {
    if (this.stunned > 0 || this.cooldown > 0 || !target) return false;
    const dx = wrapDelta(target.x - this.x, space.width);
    const dy = wrapDelta(target.y - this.y, space.height);
    const dist = Math.hypot(dx, dy);
    const max = this.role === "raider" ? 460 : this.role === "destroyer" ? 640 : 520;
    const min = this.role === "raider" ? 90 : 70;
    if (dist > max || dist < min) return false;
    if (this.role === "destroyer") return true;
    const err = Math.abs(wrapDelta(this.rotation - Math.atan2(dy, dx), Math.PI * 2));
    return err < 0.18;
  }

  destroy() {
    this.alive = false;
    if (!this.view.destroyed) this.view.destroy({ children: true });
  }
}
