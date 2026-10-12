import { Container, Graphics } from "pixi.js";
import { battleship as cfg, colors, station as stationCfg } from "../config.js";
import { wrap } from "../math.js";
import { strokeGlow, strokeLine } from "../render/textures.js";

function boxPts(w, h) {
  const x = w * 0.5;
  const y = h * 0.5;
  return [-x, -y, x, -y, x, y, -x, y];
}

function paintPlate(g, color, hot, w, h) {
  g.clear();
  strokeGlow(g, boxPts(w, h), color, hot, 1.15);
  strokeLine(g, [-w * 0.32, -h * 0.22, w * 0.32, -h * 0.22, w * 0.32, h * 0.22, -w * 0.32, h * 0.22], color, colors.white, 0.8);
  g.moveTo(-w * 0.4, 0);
  g.lineTo(w * 0.4, 0);
  g.stroke({ width: 0.9, color: hot, alpha: 0.7 });
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
    this.view = new Container();
    this.keel = new Graphics();
    this.view.addChild(this.keel);
    this.plates = [];
    this.worldLayer = null;
    this.buildPlates();
    this.paintKeel(false);
    this.view.visible = false;
  }

  mount(layer) {
    this.worldLayer = layer;
  }

  buildPlates() {
    const count = cfg.plates;
    const span = 520;
    for (let i = 0; i < count; i += 1) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const lx = -span * 0.5 + span * t;
      const ly = -(stationCfg.hub + 70);
      const w = i === 0 || i === count - 1 ? 108 : 88;
      const h = i === 0 || i === count - 1 ? 52 : 44;
      const g = new Graphics();
      paintPlate(g, this.color, this.hotColor, w, h);
      g.position.set(lx, ly);
      this.view.addChild(g);
      this.plates.push({
        slot: i,
        lx,
        ly,
        w,
        h,
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
    this.keel.clear();
    if (!on) return;
    const y = -(stationCfg.hub + 70);
    this.keel.moveTo(-280, y);
    this.keel.lineTo(280, y);
    this.keel.stroke({ width: 1.1, color: this.hotColor, alpha: 0.35 });
    this.keel.moveTo(-260, y - 18);
    this.keel.lineTo(220, y - 18);
    this.keel.stroke({ width: 0.8, color: this.color, alpha: 0.25 });
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
    this.alive = true;
    this.view.visible = true;
    this.paintKeel(true);
    for (const plate of this.plates) {
      if (plate.slot < cfg.startPlates) this.seat(plate);
      else this.release(plate);
    }
  }

  complete() {
    this.building = false;
    this.alive = true;
    this.view.visible = true;
    this.paintKeel(true);
    for (const plate of this.plates) this.seat(plate);
  }

  setBuild(wave, force = false) {
    if (wave < cfg.fromWave) this.hide();
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
