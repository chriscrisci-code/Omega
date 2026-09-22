import { Container, Graphics } from "pixi.js";
import { bullets, colors, shield as shieldConfig, ship as shipConfig } from "../config.js";
import { ThrustFlame } from "../particles/ThrustFlame.js";
import { createGlowTexture, strokeGlow, strokeLine } from "../render/textures.js";
import { catalogToGameSkin } from "../ships/catalog.js";
import { turnToward, wrap, wrapCoord, wrapDelta } from "../math.js";

export const HULL = [16, 0, -12, 10, -7, 0, -12, -10];

function mark(g, x0, y0, x1, y1) {
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke({ width: 1.35, color: colors.white, cap: "round" });
}

export class Ship {
  constructor() {
    this.view = new Container();
    this.g = new Graphics();
    const glow = createGlowTexture();
    this.jets = {
      rear: new ThrustFlame(glow, { x: -12, y: 0, angle: Math.PI, tint: colors.amber, tintHot: 0xfff6d0 }),
      nose: new ThrustFlame(glow, {
        x: 14,
        y: 0,
        angle: 0,
        tint: colors.white,
        tintHot: 0xffffff,
        size: 6,
        speed: 820,
        stretch: 2.2,
        pool: 12,
      }),
      left: new ThrustFlame(glow, {
        x: 0,
        y: -8,
        angle: -Math.PI / 2,
        tint: colors.white,
        tintHot: 0xffffff,
        size: 5.5,
        speed: 780,
        stretch: 2.1,
        pool: 12,
      }),
      right: new ThrustFlame(glow, {
        x: 0,
        y: 8,
        angle: Math.PI / 2,
        tint: colors.white,
        tintHot: 0xffffff,
        size: 5.5,
        speed: 780,
        stretch: 2.1,
        pool: 12,
      }),
    };
    this.shieldG = new Graphics();
    this.cargoG = new Graphics();
    this.view.addChild(
      this.shieldG,
      this.cargoG,
      this.g,
      this.jets.rear.container,
      this.jets.nose.container,
      this.jets.left.container,
      this.jets.right.container,
    );
    this.radius = shipConfig.radius;
    this.surge = 0;
    this.strafe = 0;
    this.docked = false;
    this.dockedTo = null;
    this.dockPad = null;
    this.undockLock = 0;
    this.dockHold = 0;
    this.skin = null;
    this.reset(0, 0);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.rotation = -Math.PI / 2;
    this.alive = true;
    this.invuln = shipConfig.invulnTime;
    this.surge = 0;
    this.strafe = 0;
    this.docked = false;
    this.dockedTo = null;
    this.dockPad = null;
    this.undockLock = 0;
    this.dockHold = 0;
    this.shieldEnergy = shieldConfig.max;
    this.shieldOn = false;
    this.shieldLock = 0;
    this.shieldSpin = 0;
    this.shieldFlash = 0;
    this.warping = false;
    this.view.visible = true;
    this.draw();
    this.drawShield();
    this.setCargo(0);
  }

  dock(base, pad) {
    this.docked = true;
    this.dockedTo = base;
    this.dockPad = pad;
    this.dockHold = 1;
    this.vx = 0;
    this.vy = 0;
  }

  release(input) {
    this.docked = false;
    this.dockedTo = null;
    this.dockPad = null;
    this.dockHold = 0;
    this.undockLock = 0.4;
    this.surge = input.surge;
    this.strafe = input.strafe;
    const c = Math.cos(this.rotation);
    const s = Math.sin(this.rotation);
    this.vx = (c * this.surge + -s * this.strafe) * 220;
    this.vy = (s * this.surge + c * this.strafe) * 220;
  }

  nose() {
    return this.muzzle(0);
  }

  muzzle(side = 0) {
    const c = Math.cos(this.rotation);
    const s = Math.sin(this.rotation);
    const across = side * bullets.gunSep;
    return {
      x: this.x + c * 16 + -s * across,
      y: this.y + s * 16 + c * across,
    };
  }

  setSkin(spec) {
    this.skin = spec ? catalogToGameSkin(spec) : null;
    this.draw();
  }

  draw() {
    this.g.clear();
    if (this.skin) {
      for (const hull of this.skin.hulls) strokeGlow(this.g, hull, colors.cyan, colors.cyanHot, 1.55);
      for (const detail of this.skin.details) strokeGlow(this.g, detail, colors.cyan, colors.cyanHot, 1.2);
      for (const line of this.skin.lines) strokeLine(this.g, line, colors.cyan, colors.cyanHot, 1.3);
    } else {
      strokeGlow(this.g, HULL, colors.cyan, colors.cyanHot, 1.7);
      mark(this.g, -2, -7.2, 3, -7.2);
      mark(this.g, 0.5, -7.2, 0.5, -10.5);
      mark(this.g, -2, 7.2, 3, 7.2);
      mark(this.g, 0.5, 7.2, 0.5, 10.5);
    }

    if (this.surge > 0.15) {
      const flicker = 13 + Math.random() * 4;
      strokeGlow(this.g, [-7, 0, -12, 3.2, -flicker, 0, -12, -3.2], colors.orange, colors.amber, 1.2);
    }
    if (this.surge < -0.15) {
      const flicker = 18 + Math.random() * 3;
      mark(this.g, 14, 0, flicker, 0);
    }
    if (this.strafe < -0.15) {
      const flicker = 12 + Math.random() * 3;
      mark(this.g, 0.5, 8, 0.5, flicker);
    }
    if (this.strafe > 0.15) {
      const flicker = -(12 + Math.random() * 3);
      mark(this.g, 0.5, -8, 0.5, flicker);
    }
  }

  drawShield() {
    this.shieldG.clear();
    if (!this.shieldOn) return;
    const sides = 8;
    const radius = shieldConfig.radius;
    const points = [];
    for (let i = 0; i < sides; i += 1) {
      const a = this.shieldSpin + (i / sides) * Math.PI * 2;
      points.push(Math.cos(a) * radius, Math.sin(a) * radius);
    }
    const flash = Math.max(0, this.shieldFlash / 0.06);
    const pulse = 0.55 + (this.shieldEnergy / shieldConfig.max) * 0.45;
    strokeGlow(this.shieldG, points, colors.cyan, colors.cyanHot, 1.25 + flash * 2.4);
    if (flash > 0) {
      const bloom = [];
      const grow = radius * (1 + flash * 0.28);
      for (let i = 0; i < sides; i += 1) {
        const a = this.shieldSpin + (i / sides) * Math.PI * 2;
        bloom.push(Math.cos(a) * grow, Math.sin(a) * grow);
      }
      this.shieldG.poly(bloom, true);
      this.shieldG.stroke({ width: 8, color: colors.white, alpha: 0.35 * flash });
      this.shieldG.poly(bloom, true);
      this.shieldG.stroke({ width: 2.2, color: colors.white, alpha: 0.9 * flash });
    }
    this.shieldG.alpha = pulse + flash * 0.45;
    this.shieldG.rotation = -this.rotation;
  }

  forceShield(on) {
    if (!this.alive || this.docked) return;
    if (on) {
      if (this.shieldEnergy > 0.06) this.shieldOn = true;
    } else {
      this.shieldOn = false;
    }
    this.drawShield();
  }

  tickShield(dt, toggle) {
    this.shieldLock = Math.max(0, this.shieldLock - dt);
    this.shieldFlash = Math.max(0, this.shieldFlash - dt);
    this.shieldSpin += 1.8 * dt;
    if (this.docked) this.shieldOn = false;
    if (toggle && this.alive && !this.docked) {
      if (this.shieldOn) this.shieldOn = false;
      else if (this.shieldLock <= 0 && this.shieldEnergy > 0.06) this.shieldOn = true;
    }
    if (this.shieldOn) {
      this.shieldEnergy = Math.max(0, this.shieldEnergy - shieldConfig.drain * dt);
      if (this.shieldEnergy <= 0) {
        this.shieldOn = false;
        this.shieldLock = shieldConfig.lock;
      }
    } else {
      this.shieldEnergy = Math.min(shieldConfig.max, this.shieldEnergy + shieldConfig.recharge * dt);
    }
    this.drawShield();
  }

  absorb(cost) {
    if (!this.shieldOn) return null;
    this.shieldEnergy = Math.max(0, this.shieldEnergy - cost);
    if (this.shieldEnergy <= 0) {
      this.shieldOn = false;
      this.shieldLock = shieldConfig.lock;
      this.drawShield();
      return "pop";
    }
    this.drawShield();
    return "block";
  }

  setCargo(count) {
    if (!this.cargoG) return;
    this.cargoG.clear();
    const n = Math.min(6, Math.max(0, count));
    for (let i = 0; i < n; i += 1) {
      const a = (i / Math.max(1, n)) * Math.PI * 2 + this.shieldSpin * 0.7;
      const r = 20 + (i % 2) * 4;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      this.cargoG.moveTo(x, y - 3);
      this.cargoG.lineTo(x + 2.2, y);
      this.cargoG.lineTo(x, y + 3);
      this.cargoG.lineTo(x - 2.2, y);
      this.cargoG.closePath();
      this.cargoG.stroke({ width: 1.1, color: colors.white, cap: "round", join: "round" });
    }
    this.cargoG.rotation = -this.rotation;
  }

  beginWarp(dx, dy, duration) {
    this.warping = true;
    this.warpT = 0;
    this.warpDur = duration;
    this.warpFromX = this.x;
    this.warpFromY = this.y;
    this.warpDx = dx;
    this.warpDy = dy;
    this.vx = 0;
    this.vy = 0;
    this.surge = 0;
    this.strafe = 0;
    this.invuln = Math.max(this.invuln, duration);
  }

  tickWarp(dt, bounds) {
    if (!this.warping) return;
    this.warpT += dt;
    const u = Math.min(1, this.warpT / this.warpDur);
    this.x = wrapCoord(this.warpFromX + this.warpDx * u, bounds.width);
    this.y = wrapCoord(this.warpFromY + this.warpDy * u, bounds.height);
    this.vx = 0;
    this.vy = 0;
    this.view.position.set(this.x, this.y);
    this.view.rotation = this.rotation;
    this.view.visible = true;
    this.draw();
    if (u >= 1) this.warping = false;
  }

  hitBody() {
    return this.shieldOn
      ? { x: this.x, y: this.y, radius: shieldConfig.radius }
      : this;
  }

  update(dt, input, bounds) {
    if (!this.alive) {
      this.view.visible = false;
      return;
    }

    this.undockLock = Math.max(0, this.undockLock - dt);
    const step = shipConfig.turnSpeed * dt;
    if (input.aim != null) this.rotation = turnToward(this.rotation, input.aim, step);
    this.rotation += input.rotate * step;
    this.surge = input.surge;
    this.strafe = input.strafe;

    const c = Math.cos(this.rotation);
    const s = Math.sin(this.rotation);
    const accel = shipConfig.thrust * dt;
    this.vx += (c * this.surge + -s * this.strafe) * accel;
    this.vy += (s * this.surge + c * this.strafe) * accel;

    const drag = Math.pow(1 - shipConfig.drag, dt);
    this.vx *= drag;
    this.vy *= drag;

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > shipConfig.maxSpeed) {
      const scale = shipConfig.maxSpeed / speed;
      this.vx *= scale;
      this.vy *= scale;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    wrap(this, bounds.width, bounds.height);
    this.invuln = Math.max(0, this.invuln - dt);

    this.view.position.set(this.x, this.y);
    this.view.rotation = this.rotation;
    this.view.visible = this.invuln <= 0 || Math.floor(this.invuln * 14) % 2 === 0;
    this.draw();
    this.jets.rear.update(dt, this.surge > 0.15);
    this.jets.nose.update(dt, this.surge < -0.15);
    this.jets.left.update(dt, this.strafe > 0.15);
    this.jets.right.update(dt, this.strafe < -0.15);
  }

  autopilotHome(dt, hub, bounds) {
    if (!this.alive) return;
    this.undockLock = Math.max(0, this.undockLock - dt);
    const dx = wrapDelta(hub.x - this.x, bounds.width);
    const dy = wrapDelta(hub.y - this.y, bounds.height);
    const dist = Math.hypot(dx, dy) || 1;
    const desired = Math.atan2(dy, dx);
    this.rotation = turnToward(this.rotation, desired, shipConfig.turnSpeed * dt);
    this.strafe = 0;

    const facing = Math.abs(wrapDelta(this.rotation - desired, Math.PI * 2));
    if (dist > 220 && facing < 0.55) {
      this.surge = 1;
      const accel = shipConfig.thrust * dt;
      this.vx += Math.cos(desired) * accel;
      this.vy += Math.sin(desired) * accel;
    } else {
      this.surge = dist > 90 ? 0.35 : 0;
      this.vx *= 0.9;
      this.vy *= 0.9;
    }

    const drag = Math.pow(1 - shipConfig.drag, dt);
    this.vx *= drag;
    this.vy *= drag;
    const speed = Math.hypot(this.vx, this.vy);
    const cap = dist < 260 ? 140 : shipConfig.maxSpeed;
    if (speed > cap) {
      this.vx *= cap / speed;
      this.vy *= cap / speed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    wrap(this, bounds.width, bounds.height);
    this.invuln = Math.max(0, this.invuln - dt);
    this.view.position.set(this.x, this.y);
    this.view.rotation = this.rotation;
    this.view.visible = this.invuln <= 0 || Math.floor(this.invuln * 14) % 2 === 0;
    this.draw();
    this.jets.rear.update(dt, this.surge > 0.15);
    this.jets.nose.update(dt, false);
    this.jets.left.update(dt, false);
    this.jets.right.update(dt, false);
  }

  kill() {
    this.alive = false;
    this.surge = 0;
    this.strafe = 0;
    this.docked = false;
    this.dockedTo = null;
    this.dockPad = null;
    this.dockHold = 0;
    this.shieldOn = false;
    this.warping = false;
    this.drawShield();
    for (const jet of Object.values(this.jets)) jet.stop();
    this.view.visible = false;
  }
}
