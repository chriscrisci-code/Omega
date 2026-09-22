import { Container, Graphics } from "pixi.js";
import { castle, colors, hubUpgrades, raid } from "../config.js";
import { wrapDelta } from "../math.js";
import { strokeGlow } from "../render/textures.js";

function ring(sides, radius, turn = 0) {
  const points = [];
  for (let i = 0; i < sides; i += 1) {
    const a = turn + (i / sides) * Math.PI * 2;
    points.push(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  return points;
}

function padShape() {
  return [22, -13, 48, -13, 48, 13, 22, 13];
}

export class Base {
  constructor(x, y, color, name, options = {}) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.hotColor =
      color === colors.magenta
        ? colors.magentaHot
        : color === colors.orange
          ? colors.orangeHot
          : color === colors.lime
            ? colors.limeHot
            : colors.cyanHot;
    this.name = name;
    this.hub = Boolean(options.hub);
    this.kind = this.hub ? "hub" : "base";
    this.rotation = 0;
    this.radius = this.hub ? 150 : 86;
    this.pads = this.hub
      ? [
          { x: 118, y: 0, angle: 0 },
          { x: 0, y: 118, angle: Math.PI / 2 },
          { x: -118, y: 0, angle: Math.PI },
          { x: 0, y: -118, angle: -Math.PI / 2 },
        ]
      : [];

    this.view = new Container();
    this.outer = new Graphics();
    this.mid = new Graphics();
    this.inner = new Graphics();
    this.core = new Graphics();
    this.padLayer = new Container();
    this.skin = new Graphics();
    this.ringPlus = new Graphics();
    this.portG = new Graphics();
    this.turretL = new Graphics();
    this.turretR = new Graphics();
    this.armorG = new Graphics();
    this.skin.visible = false;
    this.ringPlus.visible = false;
    this.portG.visible = false;
    this.turretL.visible = false;
    this.turretR.visible = false;
    this.armorG.visible = false;
    this.view.addChild(this.skin, this.padLayer, this.outer, this.mid, this.inner, this.core, this.ringPlus, this.portG, this.armorG, this.turretL, this.turretR);

    if (this.hub) {
      strokeGlow(this.outer, ring(16, 86), color, this.hotColor, 1.6);
      strokeGlow(this.mid, ring(8, 58), color, this.hotColor, 1.45);
      strokeGlow(this.inner, ring(6, 34, Math.PI / 6), color, this.hotColor, 1.35);
      strokeGlow(this.core, ring(4, 12, Math.PI / 4), colors.white, colors.white, 1.5);
      for (const pad of this.pads) {
        const g = new Graphics();
        strokeGlow(g, padShape(), color, this.hotColor, 1.35);
        g.moveTo(20, -8);
        g.lineTo(8, -8);
        g.moveTo(20, 8);
        g.lineTo(8, 8);
        g.stroke({ width: 1.2, color: colors.white, cap: "round" });
        g.position.set(pad.x, pad.y);
        g.rotation = pad.angle;
        this.padLayer.addChild(g);
      }
      this.outerSpin = 0;
      this.midSpin = -0.06;
      this.innerSpin = 0.1;
      this.stationSpin = 0.085;
    } else {
      strokeGlow(this.outer, ring(12, 78), color, this.hotColor, 1.5);
      strokeGlow(this.mid, ring(8, 52), color, this.hotColor, 1.4);
      strokeGlow(this.inner, ring(6, 30, Math.PI / 6), color, this.hotColor, 1.3);
      strokeGlow(this.core, ring(4, 11, Math.PI / 4), colors.white, colors.white, 1.4);
      this.outerSpin = 0.18;
      this.midSpin = -0.28;
      this.innerSpin = 0.42;
      this.stationSpin = 0;
    }

    this.coreRadius = 16;
    this.hitRadius = this.hub ? 88 : 16;
    this.shields = this.hub
      ? [
          { graphic: this.outer, radius: 86, hp: raid.hubShieldHits[0], maxHp: raid.hubShieldHits[0] },
          { graphic: this.mid, radius: 58, hp: raid.hubShieldHits[1], maxHp: raid.hubShieldHits[1] },
          { graphic: this.inner, radius: 34, hp: raid.hubShieldHits[2], maxHp: raid.hubShieldHits[2] },
        ]
      : [
          { graphic: this.outer, radius: 78, hp: castle.shieldHits[0], maxHp: castle.shieldHits[0] },
          { graphic: this.mid, radius: 52, hp: castle.shieldHits[1], maxHp: castle.shieldHits[1] },
          { graphic: this.inner, radius: 30, hp: castle.shieldHits[2], maxHp: castle.shieldHits[2] },
        ];
    this.coreHp = this.hub ? raid.hubHits : castle.coreHits;
    this.maxCoreHp = this.coreHp;
    this.flash = 0;
    this.regenLock = 0;
    this.regenClock = 0;
    this.regenWave = 0;
    this.alive = true;
    this.spawnTimer = 1.5 + Math.random() * 2.5;
    this.screenSpawnTimer = castle.screenEvery;
    this.screenDestroyerTimer = 8;
    this.ore = 0;
    this.tier = 0;
    this.regenEvery = raid.regenEvery;
    this.armed = false;
    this.missileEvery = 4;
    this.missileCool = 0;
    this.baseShields = this.shields.slice();
    if (this.hub) this.paintUpgrades();

    this.sync();
  }

  paintUpgrades() {
    strokeGlow(this.skin, ring(20, 108), this.color, this.hotColor, 1.55);
    strokeGlow(this.ringPlus, ring(10, 46, Math.PI / 10), this.color, colors.white, 1.2);
    this.portG.clear();
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(a) * 80;
      const y = Math.sin(a) * 80;
      this.portG.rect(x - 3, y - 5, 6, 10);
      this.portG.stroke({ width: 1.2, color: this.hotColor });
    }
    const gun = [10, 0, -6, 5, -3, 0, -6, -5];
    strokeGlow(this.turretL, gun, this.color, this.hotColor, 1.25);
    strokeGlow(this.turretR, gun, this.color, this.hotColor, 1.25);
    this.turretL.position.set(62, 62);
    this.turretR.position.set(-62, -62);
    this.armorG.clear();
    for (const a of [0.35, 1.2, 2.0, 2.85, 3.7, 4.55]) {
      const x = Math.cos(a) * 24;
      const y = Math.sin(a) * 24;
      this.armorG.moveTo(x - 5, y - 3);
      this.armorG.lineTo(x + 5, y + 3);
      this.armorG.stroke({ width: 1.4, color: colors.white, alpha: 0.85 });
    }
  }

  outermostShield() {
    return this.shields.find((layer) => layer.hp > 0) ?? null;
  }

  shieldsFull() {
    return this.shields.every((layer) => layer.hp >= layer.maxHp);
  }

  shieldHp() {
    return this.shields.reduce((sum, layer) => sum + layer.hp, 0);
  }

  restoreShield() {
    for (let i = this.shields.length - 1; i >= 0; i -= 1) {
      const layer = this.shields[i];
      if (layer.hp >= layer.maxHp) continue;
      layer.hp += 1;
      layer.graphic.visible = true;
      layer.graphic.alpha = Math.max(0.18, layer.hp / layer.maxHp);
      return true;
    }
    return false;
  }

  tierLevel() {
    return hubUpgrades.filter((step) => this.ore >= step.ore).length;
  }

  upgradeName() {
    const step = [...hubUpgrades].reverse().find((item) => this.ore >= item.ore);
    return step?.name ?? "";
  }

  deposit(amount) {
    if (!this.hub || amount <= 0) return { unlocked: false, name: "" };
    const before = this.tierLevel();
    this.ore += amount;
    const after = this.tierLevel();
    for (let i = before; i < after; i += 1) this.unlock(hubUpgrades[i]);
    this.tier = after;
    return { unlocked: after > before, name: this.upgradeName(), ore: this.ore };
  }

  unlock(step) {
    if (step.id === "ring") {
      const outer = this.shields[0];
      outer.maxHp += 2;
      outer.hp += 2;
      this.ringPlus.visible = true;
    }
    if (step.id === "ports") {
      this.regenEvery = 0.35;
      this.portG.visible = true;
    }
    if (step.id === "turrets") {
      this.armed = true;
      this.missileEvery = 4;
      this.turretL.visible = true;
      this.turretR.visible = true;
    }
    if (step.id === "armor") {
      const gain = 8;
      this.maxCoreHp += gain;
      this.coreHp += gain;
      this.armorG.visible = true;
    }
    if (step.id === "scaffold") {
      this.missileEvery = 2.5;
      this.skin.visible = true;
      this.hitRadius = 112;
      if (!this.shields.some((layer) => layer.graphic === this.skin)) {
        this.shields.unshift({ graphic: this.skin, radius: 108, hp: 6, maxHp: 6 });
      }
    }
    this.flash = 0.28;
  }

  aimTurrets(angle) {
    if (!this.armed) return;
    this.turretL.rotation = angle - this.rotation;
    this.turretR.rotation = angle - this.rotation;
  }

  hitBy(x, y, worldW, worldH) {
    if (!this.alive || !this.hub) return false;
    const dx = wrapDelta(x - this.x, worldW);
    const dy = wrapDelta(y - this.y, worldH);
    return Math.hypot(dx, dy) <= this.hitRadius + 8;
  }

  damageHub() {
    if (!this.hub || !this.alive) return false;
    this.flash = 0.16;
    this.regenLock = raid.regenDelay;
    this.regenClock = 0;
    const shield = this.outermostShield();
    if (shield) {
      this.damageShield(shield);
      return false;
    }
    this.coreHp -= 1;
    this.core.alpha = Math.max(0.2, this.coreHp / this.maxCoreHp);
    if (this.coreHp <= 0) {
      this.alive = false;
      this.view.visible = false;
      return true;
    }
    return false;
  }

  tryHit(x, y, worldW, worldH) {
    if (!this.alive || this.hub) return null;
    const dx = wrapDelta(x - this.x, worldW);
    const dy = wrapDelta(y - this.y, worldH);
    const dist = Math.hypot(dx, dy);
    const shield = this.outermostShield();
    if (shield) {
      if (dist <= shield.radius + 8) return { kind: "shield", shield };
      return null;
    }
    if (dist <= this.coreRadius + 6) return { kind: "core" };
    return null;
  }

  damageShield(shield) {
    shield.hp -= 1;
    shield.graphic.alpha = Math.max(0.18, shield.hp / shield.maxHp);
    if (shield.hp <= 0) {
      shield.hp = 0;
      shield.graphic.visible = false;
      return true;
    }
    return false;
  }

  damageCore() {
    this.coreHp -= 1;
    this.core.alpha = Math.max(0.2, this.coreHp / this.maxCoreHp);
    if (this.coreHp <= 0) {
      this.alive = false;
      this.view.visible = false;
      return true;
    }
    return false;
  }

  resetCombat() {
    this.alive = true;
    this.view.visible = true;
    this.view.alpha = 1;
    this.flash = 0;
    this.ore = 0;
    this.tier = 0;
    this.regenEvery = raid.regenEvery;
    this.armed = false;
    this.missileEvery = 4;
    this.missileCool = 0;
    this.maxCoreHp = this.hub ? raid.hubHits : castle.coreHits;
    this.coreHp = this.maxCoreHp;
    this.core.alpha = 1;
    this.core.visible = true;
    this.hitRadius = this.hub ? 88 : 16;
    this.skin.visible = false;
    this.ringPlus.visible = false;
    this.portG.visible = false;
    this.turretL.visible = false;
    this.turretR.visible = false;
    this.armorG.visible = false;
    this.shields = this.hub
      ? this.baseShields.map((layer, i) => {
          layer.maxHp = raid.hubShieldHits[i] ?? layer.maxHp;
          return layer;
        })
      : this.shields;
    this.outer.alpha = 1;
    this.mid.alpha = 1;
    this.inner.alpha = 1;
    this.outer.scale.set(1);
    this.mid.scale.set(1);
    this.inner.scale.set(1);
    this.skin.scale.set(1);
    this.regenLock = 0;
    this.regenClock = 0;
    this.regenWave = 0;
    for (const shield of this.shields) {
      shield.hp = shield.maxHp;
      shield.graphic.alpha = 1;
      shield.graphic.visible = shield.graphic !== this.skin;
    }
    if (!this.hub) {
      this.spawnTimer = 1.2 + Math.random() * 2;
      this.screenSpawnTimer = castle.screenEvery;
      this.screenDestroyerTimer = 8;
    }
  }

  sleep() {
    this.alive = false;
    this.view.visible = false;
  }

  padWorld(pad) {
    const c = Math.cos(this.rotation);
    const s = Math.sin(this.rotation);
    return {
      x: this.x + pad.x * c - pad.y * s,
      y: this.y + pad.x * s + pad.y * c,
      angle: this.rotation + pad.angle,
    };
  }

  tryDock(ship) {
    if (!this.hub || !this.alive || ship.docked || ship.undockLock > 0) return false;
    if (Math.hypot(ship.vx, ship.vy) > 110) return false;
    for (const pad of this.pads) {
      const world = this.padWorld(pad);
      const dx = ship.x - world.x;
      const dy = ship.y - world.y;
      if (dx * dx + dy * dy < 48 * 48) {
        ship.dock(this, pad);
        this.hold(ship);
        return true;
      }
    }
    return false;
  }

  forceDock(ship, index = 0) {
    const pad = this.pads[index] ?? this.pads[0];
    if (!pad) return;
    ship.dock(this, pad);
    this.hold(ship);
  }

  hold(ship) {
    const world = this.padWorld(ship.dockPad);
    ship.x = world.x;
    ship.y = world.y;
    ship.rotation = world.angle;
    ship.vx = 0;
    ship.vy = 0;
    ship.surge = 0;
    ship.strafe = 0;
    ship.view.position.set(ship.x, ship.y);
    ship.view.rotation = ship.rotation;
    ship.view.visible = true;
    ship.draw();
    for (const jet of Object.values(ship.jets)) jet.update(0, false);
  }

  sync() {
    this.view.position.set(this.x, this.y);
    this.view.rotation = this.rotation;
  }

  tickHubShields(dt) {
    if (!this.hub || !this.alive) return;
    this.regenLock = Math.max(0, this.regenLock - dt);
    if (this.regenLock <= 0 && !this.shieldsFull()) {
      this.regenClock += dt;
      if (this.regenClock >= this.regenEvery) {
        this.regenClock = 0;
        this.restoreShield();
      }
    }
    if (this.shieldsFull()) {
      this.regenWave = 0;
      for (const layer of this.shields) {
        layer.graphic.scale.set(1);
        if (layer.hp > 0) layer.graphic.alpha = layer.hp / layer.maxHp;
      }
      return;
    }
    this.regenWave += dt * 0.85;
    this.shields.forEach((layer, i) => {
      const u = (this.regenWave + (this.shields.length - 1 - i) / this.shields.length) % 1;
      layer.graphic.scale.set(1 + u * 0.55);
      if (layer.hp > 0) layer.graphic.alpha = Math.max(0.2, layer.hp / layer.maxHp) * (1 - u * 0.45);
    });
  }

  update(dt) {
    this.rotation += this.stationSpin * dt;
    this.outer.rotation += this.outerSpin * dt;
    this.mid.rotation += this.midSpin * dt;
    this.inner.rotation += this.innerSpin * dt;
    this.core.rotation -= (this.innerSpin || 0.2) * 0.5 * dt;
    this.ringPlus.rotation -= 0.14 * dt;
    this.skin.rotation += 0.05 * dt;
    this.tickHubShields(dt);
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt);
      this.view.alpha = 0.4 + Math.random() * 0.6;
    } else if (this.alive) {
      this.view.alpha = 1;
    }
    this.sync();
  }
}

export function createBases(worldW, worldH) {
  const cx = worldW * 0.5;
  const cy = worldH * 0.5;
  const reach = Math.min(worldW, worldH) * 0.32;
  return [
    new Base(cx, cy, colors.cyan, "HUB", { hub: true }),
    new Base(cx, cy - reach, colors.cyan, "NORTH"),
    new Base(cx + reach, cy, colors.magenta, "EAST"),
    new Base(cx, cy + reach, colors.orange, "SOUTH"),
    new Base(cx - reach, cy, colors.lime, "WEST"),
  ];
}
