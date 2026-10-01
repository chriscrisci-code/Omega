import { Container, Graphics } from "pixi.js";
import { colors, station as cfg } from "../config.js";
import { wrapDelta } from "../math.js";
import { strokeGlow, strokeLine } from "../render/textures.js";

function ringPts(sides, radius, turn = 0) {
  const points = [];
  for (let i = 0; i < sides; i += 1) {
    const a = turn + (i / sides) * Math.PI * 2;
    points.push(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  return points;
}

function boxPts(w, h) {
  const x = w * 0.5;
  const y = h * 0.5;
  return [-x, -y, x, -y, x, y, -x, y];
}

function gunPts() {
  return [16, 0, -8, 7, -3.5, 0, -8, -7];
}

function paintLattice(g, color, hot, width) {
  g.clear();
  const hub = cfg.hub;
  const ring = cfg.ring;
  const inner = hub + 18;
  const spokes = cfg.spokes;
  const draw = () => {
    for (let s = 0; s < spokes; s += 1) {
      const a = (s / spokes) * Math.PI * 2;
      const nx = Math.cos(a);
      const ny = Math.sin(a);
      const px = -ny;
      const py = nx;
      for (const side of [-11, 0, 11]) {
        g.moveTo(nx * inner + px * side, ny * inner + py * side);
        g.lineTo(nx * (ring - 16) + px * side, ny * (ring - 16) + py * side);
      }
      for (let d = inner + 40; d < ring - 36; d += 64) {
        g.moveTo(nx * d + px * 14, ny * d + py * 14);
        g.lineTo(nx * d - px * 14, ny * d - py * 14);
        g.moveTo(nx * (d - 16) + px * 10, ny * (d - 16) + py * 10);
        g.lineTo(nx * (d + 16) - px * 10, ny * (d + 16) - py * 10);
      }
    }
    for (const r of [ring - 44, ring - 22, ring, ring + 22]) {
      g.moveTo(r, 0);
      for (let i = 1; i <= 56; i += 1) {
        const a = (i / 56) * Math.PI * 2;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
    }
    for (let i = 0; i < 56; i += 1) {
      const a = (i / 56) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      g.moveTo(c * (ring - 44), s * (ring - 44));
      g.lineTo(c * (ring + 22), s * (ring + 22));
    }
    for (let i = 0; i < 24; i += 1) {
      const a = (i / 24) * Math.PI * 2 + 0.07;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const px = -s;
      const py = c;
      const ox = c * (ring + 36);
      const oy = s * (ring + 36);
      const w = i % 3 === 0 ? 22 : 14;
      const h = i % 3 === 0 ? 12 : 8;
      g.moveTo(ox + px * w + c * h, oy + py * w + s * h);
      g.lineTo(ox - px * w + c * h, oy - py * w + s * h);
      g.lineTo(ox - px * w - c * h, oy - py * w - s * h);
      g.lineTo(ox + px * w - c * h, oy + py * w - s * h);
      g.closePath();
    }
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2 + 0.18;
      const c = Math.cos(a);
      const s = Math.sin(a);
      g.moveTo(c * (hub - 10), s * (hub - 10));
      g.lineTo(c * (hub + 36), s * (hub + 36));
    }
    g.moveTo(0, -hub);
    g.lineTo(0, -hub - 86);
    g.moveTo(-8, -hub - 86);
    g.lineTo(8, -hub - 86);
    g.lineTo(0, -hub - 104);
    g.closePath();
  };
  draw();
  g.stroke({ width: width * 3, color, alpha: 0.16, cap: "round", join: "round" });
  draw();
  g.stroke({ width, color: hot, alpha: 0.92, cap: "round", join: "round" });
  strokeGlow(g, ringPts(8, hub), color, hot, width * 1.2);
  strokeGlow(g, ringPts(6, hub * 0.64, Math.PI / 6), color, hot, width);
  strokeGlow(g, ringPts(4, hub * 0.28, Math.PI / 4), colors.white, colors.white, width * 0.9);
}

export class Station {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.kind = "station";
    this.name = "STATION";
    this.color = colors.magenta;
    this.hotColor = colors.magentaHot;
    this.radius = cfg.ring + 48;
    this.rotation = 0;
    this.alive = true;
    this.awake = false;

    this.view = new Container();
    this.depth2 = new Container();
    this.depth1 = new Container();
    this.combat = new Container();
    this.lattice = new Graphics();
    this.deck2 = new Graphics();
    this.deck1 = new Graphics();
    paintLattice(this.deck2, this.color, this.hotColor, 0.8);
    paintLattice(this.deck1, this.color, this.hotColor, 0.95);
    paintLattice(this.lattice, this.color, this.hotColor, 1.15);
    this.depth2.addChild(this.deck2);
    this.depth1.addChild(this.deck1);
    this.depth2.alpha = cfg.alpha[1];
    this.depth1.alpha = cfg.alpha[0];
    this.depth2.scale.set(cfg.scale[1]);
    this.depth1.scale.set(cfg.scale[0]);
    this.combat.addChild(this.lattice);
    this.view.addChild(this.depth2, this.depth1, this.combat);
    this.view.visible = false;

    this.guns = [];
    this.modules = [];
    this.buildParts();
  }

  buildParts() {
    const ring = cfg.ring - 6;
    const mid = (cfg.hub + cfg.ring) * 0.52;
    for (let i = 0; i < cfg.spokes; i += 1) {
      const angle = (i / cfg.spokes) * Math.PI * 2;
      this.addGun(Math.cos(angle) * ring, Math.sin(angle) * ring, angle, "ring");
      if (i % 2 === 0) {
        this.addGun(Math.cos(angle) * (cfg.hub + 10), Math.sin(angle) * (cfg.hub + 10), angle, "hub");
      }
      const bay = angle + Math.PI / cfg.spokes;
      this.addModule(Math.cos(bay) * (ring - 4), Math.sin(bay) * (ring - 4), bay, 30, 18);
      this.addModule(Math.cos(angle) * mid, Math.sin(angle) * mid, angle, 22, 14);
      this.addModule(Math.cos(bay) * (ring + 40), Math.sin(bay) * (ring + 40), bay, 44, 12);
    }
  }

  stamp(part, extra) {
    Object.assign(part, {
      kind: "station",
      color: this.color,
      hotColor: this.hotColor,
      vx: 0,
      vy: 0,
      x: 0,
      y: 0,
      alive: true,
      ...extra,
    });
    return part;
  }

  addGun(lx, ly, angle, seat) {
    const g = new Graphics();
    strokeGlow(g, gunPts(), this.color, this.hotColor, 1.25);
    g.position.set(lx, ly);
    g.rotation = angle;
    this.combat.addChild(g);
    this.guns.push(
      this.stamp(
        {
          lx,
          ly,
          angle,
          seat,
          graphic: g,
          radius: 17,
          hp: cfg.gunHits,
          maxHp: cfg.gunHits,
          cool: Math.random() * cfg.gunCool,
        },
        { name: "GUN", part: "gun" },
      ),
    );
  }

  addModule(lx, ly, angle, w, h) {
    const g = new Graphics();
    strokeGlow(g, boxPts(w, h), this.color, this.hotColor, 1.05);
    strokeLine(g, [-w * 0.28, -h * 0.22, w * 0.28, -h * 0.22, w * 0.28, h * 0.22, -w * 0.28, h * 0.22], this.color, colors.white, 0.75);
    g.position.set(lx, ly);
    g.rotation = angle;
    this.combat.addChild(g);
    this.modules.push(
      this.stamp(
        {
          lx,
          ly,
          graphic: g,
          radius: Math.max(w, h) * 0.48,
          hp: cfg.moduleHits,
          maxHp: cfg.moduleHits,
        },
        { name: "MOD", part: "module" },
      ),
    );
  }

  localToWorld(lx, ly) {
    const c = Math.cos(this.rotation);
    const s = Math.sin(this.rotation);
    return {
      x: this.x + lx * c - ly * s,
      y: this.y + lx * s + ly * c,
    };
  }

  syncParts() {
    for (const gun of this.guns) {
      const at = this.localToWorld(gun.lx, gun.ly);
      gun.x = at.x;
      gun.y = at.y;
    }
    for (const mod of this.modules) {
      const at = this.localToWorld(mod.lx, mod.ly);
      mod.x = at.x;
      mod.y = at.y;
    }
  }

  parts() {
    return [...this.guns, ...this.modules].filter((part) => part.alive);
  }

  sleep() {
    this.awake = false;
    this.view.visible = false;
  }

  wake() {
    this.awake = true;
    this.alive = true;
    this.view.visible = true;
  }

  reset() {
    for (const gun of this.guns) {
      gun.alive = true;
      gun.hp = gun.maxHp;
      gun.cool = Math.random() * cfg.gunCool;
      gun.graphic.visible = true;
      gun.graphic.alpha = 1;
    }
    for (const mod of this.modules) {
      mod.alive = true;
      mod.hp = mod.maxHp;
      mod.graphic.visible = true;
      mod.graphic.alpha = 1;
    }
    this.rotation = 0;
  }

  tickParallax(camX, camY, space, frozen = false) {
    if (frozen) {
      this.depth1.position.set(cfg.shift[0], cfg.shift[1]);
      this.depth2.position.set(cfg.shift[0] * 1.85, cfg.shift[1] * 1.85);
      return;
    }
    const dx = wrapDelta(camX - this.x, space.width);
    const dy = wrapDelta(camY - this.y, space.height);
    const c = Math.cos(-this.rotation);
    const s = Math.sin(-this.rotation);
    const lx = dx * c - dy * s;
    const ly = dx * s + dy * c;
    this.depth1.position.set(cfg.shift[0] + lx * (1 - cfg.parallax[0]), cfg.shift[1] + ly * (1 - cfg.parallax[0]));
    this.depth2.position.set(cfg.shift[0] * 1.85 + lx * (1 - cfg.parallax[1]), cfg.shift[1] * 1.85 + ly * (1 - cfg.parallax[1]));
  }

  update(dt, ship, space) {
    if (!this.awake) return;
    this.rotation += cfg.spin * dt;
    this.view.rotation = this.rotation;
    this.syncParts();
    if (!ship?.alive) return;
    for (const gun of this.guns) {
      if (!gun.alive) continue;
      gun.cool = Math.max(0, gun.cool - dt);
      const dx = wrapDelta(ship.x - gun.x, space.width);
      const dy = wrapDelta(ship.y - gun.y, space.height);
      gun.graphic.rotation = Math.atan2(dy, dx) - this.rotation;
    }
  }

  readyGuns(ship, space) {
    if (!this.awake || !ship?.alive) return [];
    const ready = [];
    for (const gun of this.guns) {
      if (!gun.alive || gun.cool > 0) continue;
      const dx = wrapDelta(ship.x - gun.x, space.width);
      const dy = wrapDelta(ship.y - gun.y, space.height);
      if (dx * dx + dy * dy > cfg.gunRange * cfg.gunRange) continue;
      ready.push(gun);
    }
    return ready;
  }
}
