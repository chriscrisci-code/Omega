import { Container, Graphics } from "pixi.js";
import { assaultShip, colors, shield as shieldConfig } from "../config.js";
import { strokeGlow, strokeLine } from "../render/textures.js";
import { ASSAULT_ID, SHIP_CATALOG, catalogToGameSkin } from "../ships/catalog.js";
import { turnToward, wrap, wrapCoord, wrapDelta } from "../math.js";
import { paintAssaultShield } from "./Ship.js";

function mark(g, x0, y0, x1, y1) {
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke({ width: 1.2, color: colors.white, cap: "round" });
}

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
    this.radius = 12;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.rotation = 0;
    this.age = 0;
    this.skin = catalogToGameSkin(
      SHIP_CATALOG.find((item) => item.id === ASSAULT_ID) || SHIP_CATALOG[0],
      assaultShip.wingSkin,
    );
    this.alive = false;
    this.park();
    this.drawHull();
  }

  flying() {
    return this.alive && this.deployed;
  }

  shieldRadius() {
    return assaultShip.wingShield;
  }

  hitBody() {
    return this.shieldOn ? { x: this.x, y: this.y, radius: this.shieldRadius() } : this;
  }

  slotWorld(lead) {
    const c = Math.cos(lead.rotation);
    const s = Math.sin(lead.rotation);
    const back = -assaultShip.wingBack + Math.sin(this.age * 1.15 + this.slot) * 10;
    const side = this.slot * (assaultShip.wingSide + Math.sin(this.age * 0.85 + 1.7) * 14);
    return {
      x: lead.x + c * back - s * side,
      y: lead.y + s * back + c * side,
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
    for (const hull of this.skin.hulls) strokeGlow(this.g, hull, colors.cyan, colors.cyanHot, 1.4);
    for (const detail of this.skin.details) strokeGlow(this.g, detail, colors.cyan, colors.cyanHot, 1.1);
    for (const line of this.skin.lines) strokeLine(this.g, line, colors.cyan, colors.cyanHot, 1.15);
  }

  drawMarks() {
    this.markG.clear();
    if (this.surge > 0.2) {
      const flicker = 11 + Math.random() * 3;
      mark(this.markG, -8, 0, -flicker, 0);
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
    const slot = this.slotWorld(lead);
    const dx = wrapDelta(slot.x - this.x, space.width);
    const dy = wrapDelta(slot.y - this.y, space.height);
    const dist = Math.hypot(dx, dy);
    if (dist > 880 || lead.warping) {
      this.snap(lead);
    } else {
      const catchup = dist > 210 ? 7.4 : 4.2;
      this.vx += dx * catchup * dt + ((lead.vx || 0) - this.vx) * 1.7 * dt;
      this.vy += dy * catchup * dt + ((lead.vy || 0) - this.vy) * 1.7 * dt;
      this.vx += Math.sin(this.age * 1.6 + this.slot) * 18 * dt;
      this.vy += Math.cos(this.age * 1.3 + this.slot) * 18 * dt;
    }
    const drag = Math.pow(0.94, dt * 60);
    this.vx *= drag;
    this.vy *= drag;
    this.x = wrapCoord(this.x + this.vx * dt, space.width);
    this.y = wrapCoord(this.y + this.vy * dt, space.height);
    wrap(this, space.width, space.height);
    this.rotation = turnToward(this.rotation, lead.rotation, 2.6 * dt);
    const speed = Math.hypot(this.vx, this.vy);
    this.surge = speed > 90 ? 0.7 : 0.15;
    this.view.position.set(this.x, this.y);
    this.view.rotation = this.rotation;
    this.view.visible = this.invuln <= 0 || Math.floor(this.invuln * 14) % 2 === 0;
    this.drawMarks();
    this.tickShield(dt);
  }
}
