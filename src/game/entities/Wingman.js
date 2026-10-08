import { Container, Graphics } from "pixi.js";
import { assaultShip, colors, shield as shieldConfig, ship as shipConfig } from "../config.js";
import { strokeGlow, strokeLine } from "../render/textures.js";
import { ASSAULT_ID, SHIP_CATALOG, catalogToGameSkin } from "../ships/catalog.js";
import { damp, turnToward, wrap, wrapCoord, wrapDelta } from "../math.js";
import { paintAssaultShield } from "./Ship.js";

export class Wingman {
  constructor(slot) {
    this.slot = slot < 0 ? -1 : 1;
    this.kind = "wingman";
    this.name = "WING";
    this.color = colors.cyan;
    this.hotColor = colors.cyanHot;
    this.view = new Container();
    this.g = new Graphics();
    this.shieldG = new Graphics();
    this.markG = new Graphics();
    this.view.addChild(this.shieldG, this.g, this.markG);
    this.view.visible = false;
    this.radius = shipConfig.radius;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.rotation = 0;
    this.age = 0;
    this.turrets = [
      { x: 8, y: -10, angle: -0.4, cool: 0 },
      { x: 8, y: 10, angle: 0.4, cool: 0 },
    ];
    this.skin = catalogToGameSkin(SHIP_CATALOG.find((item) => item.id === ASSAULT_ID) || SHIP_CATALOG[0]);
    this.alive = false;
    this.park();
    this.drawHull();
  }

  flying() {
    return this.alive && this.deployed;
  }

  shieldRadius() {
    return shieldConfig.radius;
  }

  hitBody() {
    return this.shieldOn ? { x: this.x, y: this.y, radius: this.shieldRadius() } : this;
  }

  turretWorld(gun, extra = 0) {
    const reach = 10 + extra;
    const lx = gun.x + Math.cos(gun.angle) * reach;
    const ly = gun.y + Math.sin(gun.angle) * reach;
    const c = Math.cos(this.rotation);
    const s = Math.sin(this.rotation);
    return {
      x: this.x + lx * c - ly * s,
      y: this.y + lx * s + ly * c,
      angle: this.rotation + gun.angle,
    };
  }

  slotWorld(lead) {
    const c = Math.cos(lead.rotation);
    const s = Math.sin(lead.rotation);
    const along = this.alongHold;
    const side = this.slot * (assaultShip.wingSide + Math.sin(this.age * 0.72 + this.slot) * 7);
    return {
      x: lead.x + c * along - s * side,
      y: lead.y + s * along + c * side,
    };
  }

  spawn(lead) {
    this.alive = true;
    this.deployed = true;
    this.age = Math.random() * 8;
    this.hullMax = assaultShip.wingHullHits;
    this.hullHp = this.hullMax;
    this.shieldMax = shieldConfig.max;
    this.shieldEnergy = this.shieldMax;
    this.shieldOn = false;
    this.autoShield = false;
    this.shieldLock = 0;
    this.shieldSpin = 0;
    this.shieldFlash = 0;
    this.regenWave = Math.random();
    this.invuln = 0.35;
    this.surge = 0;
    this.leadRot = lead.rotation;
    this.trail = 0;
    this.trailWas = 0;
    this.leadPush = 0;
    this.alongHold = 0;
    for (const gun of this.turrets) {
      gun.cool = 0.2;
      gun.angle = gun.y < 0 ? -0.4 : 0.4;
    }
    const slot = this.slotWorld(lead);
    this.x = slot.x;
    this.y = slot.y;
    this.vx = lead.vx || 0;
    this.vy = lead.vy || 0;
    this.rotation = lead.rotation;
    this.view.visible = true;
    this.drawHull();
    this.drawShield();
  }

  park() {
    this.deployed = false;
    this.shieldOn = false;
    this.autoShield = false;
    this.vx = 0;
    this.vy = 0;
    this.surge = 0;
    this.view.visible = false;
    this.drawShield();
  }

  kill() {
    this.alive = false;
    this.park();
  }

  snap(lead) {
    const slot = this.slotWorld(lead);
    this.x = slot.x;
    this.y = slot.y;
    this.vx = lead.vx || 0;
    this.vy = lead.vy || 0;
    this.rotation = lead.rotation;
  }

  drawHull() {
    this.g.clear();
    if (!this.skin) return;
    for (const hull of this.skin.hulls) strokeGlow(this.g, hull, colors.cyan, colors.cyanHot, 1.55);
    for (const detail of this.skin.details) strokeGlow(this.g, detail, colors.cyan, colors.cyanHot, 1.2);
    for (const line of this.skin.lines) strokeLine(this.g, line, colors.cyan, colors.cyanHot, 1.3);
  }

  drawMarks() {
    this.markG.clear();
    if (this.surge > 0.2) {
      const flicker = 13 + Math.random() * 4;
      strokeGlow(this.markG, [-7, 0, -12, 3.2, -flicker, 0, -12, -3.2], colors.orange, colors.amber, 1.2);
    }
  }

  drawShield() {
    paintAssaultShield(this.shieldG, {
      on: this.flying() && this.shieldOn,
      radius: this.shieldRadius(),
      spin: this.shieldSpin,
      energy: this.shieldEnergy,
      max: this.shieldMax || shieldConfig.max,
      flash: this.shieldFlash,
      regenWave: this.regenWave,
      rotation: this.rotation,
    });
  }

  forceShield(on) {
    if (!this.flying()) return;
    if (on) {
      if (this.shieldEnergy > 0.06) this.shieldOn = true;
    } else {
      this.shieldOn = false;
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

  tickShield(dt) {
    this.shieldLock = Math.max(0, this.shieldLock - dt);
    this.shieldFlash = Math.max(0, this.shieldFlash - dt);
    this.shieldSpin += 1.8 * dt;
    this.regenWave += 0.85 * dt;
    if (this.shieldOn) {
      this.shieldEnergy = Math.max(0, this.shieldEnergy - shieldConfig.drain * dt);
      if (this.shieldEnergy <= 0) {
        this.shieldOn = false;
        this.shieldLock = shieldConfig.lock;
      }
    } else {
      this.shieldEnergy = Math.min(this.shieldMax || shieldConfig.max, this.shieldEnergy + shieldConfig.recharge * dt);
    }
    this.drawShield();
  }

  update(dt, lead, space) {
    if (!this.flying()) {
      this.view.visible = false;
      return;
    }
    this.age += dt;
    this.invuln = Math.max(0, this.invuln - dt);

    const dRot = wrapDelta(lead.rotation - this.leadRot, Math.PI * 2);
    this.leadRot = lead.rotation;
    const turnRate = dRot / Math.max(dt, 1 / 120);
    const turnMag = Math.min(1, Math.abs(turnRate) / Math.max(0.4, shipConfig.turnSpeed));
    const outside = turnRate * this.slot < -0.28;
    const inside = turnRate * this.slot > 0.28;
    const trailWant = outside ? turnMag : inside ? turnMag * 0.12 : 0;
    this.trail = damp(this.trail, trailWant, outside ? 0.16 : 0.38, dt);
    const dropping = this.trail + 0.03 < this.trailWas;
    this.trailWas = this.trail;
    this.leadPush = damp(
      this.leadPush,
      dropping || (this.trail < 0.08 && this.leadPush > 0.12) ? 1 : 0,
      dropping ? 0.22 : 0.55,
      dt,
    );
    const weave = Math.sin(this.age * 0.85 + this.slot * 1.4) * assaultShip.wingAlong;
    this.alongHold = weave - this.trail * assaultShip.wingLag + this.leadPush * assaultShip.wingLead;

    const c = Math.cos(lead.rotation);
    const s = Math.sin(lead.rotation);
    const slot = this.slotWorld(lead);
    const dx = wrapDelta(slot.x - this.x, space.width);
    const dy = wrapDelta(slot.y - this.y, space.height);
    const dist = Math.hypot(dx, dy);
    if (dist > 880 || lead.warping) {
      this.snap(lead);
    } else {
      const alongErr = dx * c + dy * s;
      const acrossErr = dx * -s + dy * c;
      const lon = alongErr > 12 ? 6.4 : 3.2;
      const lat = 10.5;
      this.vx += (c * alongErr * lon + -s * acrossErr * lat) * dt;
      this.vy += (s * alongErr * lon + c * acrossErr * lat) * dt;
      const match = alongErr > 36 ? 3.6 : 2.4;
      this.vx += ((lead.vx || 0) - this.vx) * match * dt;
      this.vy += ((lead.vy || 0) - this.vy) * match * dt;
      if (alongErr > 48) {
        this.vx += c * shipConfig.thrust * assaultShip.speedMul * dt;
        this.vy += s * shipConfig.thrust * assaultShip.speedMul * dt;
      }
    }

    const drag = Math.pow(0.93, dt * 60);
    this.vx *= drag;
    this.vy *= drag;
    const speed = Math.hypot(this.vx, this.vy);
    const behind = dist > 70;
    const cruise = shipConfig.maxSpeed * assaultShip.speedMul;
    const cap = behind ? cruise * 1.2 : cruise * 1.05;
    if (speed > cap) {
      this.vx *= cap / speed;
      this.vy *= cap / speed;
    }
    this.x = wrapCoord(this.x + this.vx * dt, space.width);
    this.y = wrapCoord(this.y + this.vy * dt, space.height);
    wrap(this, space.width, space.height);
    const turnStep = (outside ? 1.55 : 2.9) * dt;
    this.rotation = turnToward(this.rotation, lead.rotation, turnStep);
    this.surge = speed > 90 ? 0.75 : 0.18;
    this.view.position.set(this.x, this.y);
    this.view.rotation = this.rotation;
    this.view.visible = this.invuln <= 0 || Math.floor(this.invuln * 14) % 2 === 0;
    this.drawMarks();
    this.tickShield(dt);
  }
}
