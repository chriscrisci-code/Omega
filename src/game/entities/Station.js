import { Container, Graphics } from "pixi.js";
import { colors, station as cfg } from "../config.js";
import { wrap, wrapDelta } from "../math.js";
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

function paintTurret(g) {
  const white = colors.white;
  strokeGlow(g, ringPts(8, 15), white, white, 1.4);
  strokeGlow(g, ringPts(6, 8.5, Math.PI / 6), white, white, 1.15);
  strokeGlow(g, [12, 5.4, -8, 6.4, -8, -6.4, 12, -5.4], white, white, 1.15);
  strokeGlow(g, [28, 3.4, 11, 3.4, 11, -3.4, 28, -3.4], white, white, 1.25);
  strokeGlow(g, ringPts(4, 3.2, Math.PI / 4), white, white, 0.95);
}

function boxAt(g, x, y, angle, w, h) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const px = -s;
  const py = c;
  const hw = w * 0.5;
  const hh = h * 0.5;
  const corners = [
    [x + px * hw + c * hh, y + py * hw + s * hh],
    [x - px * hw + c * hh, y - py * hw + s * hh],
    [x - px * hw - c * hh, y - py * hw - s * hh],
    [x + px * hw - c * hh, y + py * hw - s * hh],
  ];
  g.moveTo(corners[0][0], corners[0][1]);
  g.lineTo(corners[1][0], corners[1][1]);
  g.lineTo(corners[2][0], corners[2][1]);
  g.lineTo(corners[3][0], corners[3][1]);
  g.closePath();
}

function octAt(g, x, y, radius, turn = 0) {
  const pts = ringPts(8, radius, turn);
  g.moveTo(x + pts[0], y + pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(x + pts[i], y + pts[i + 1]);
  g.closePath();
}

function hangarAt(g, x, y, angle, scale) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const px = -s;
  const py = c;
  boxAt(g, x, y, angle, 168 * scale, 96 * scale);
  boxAt(g, x, y, angle, 118 * scale, 58 * scale);
  boxAt(g, x + px * 92 * scale, y + py * 92 * scale, angle, 48 * scale, 78 * scale);
  boxAt(g, x - px * 92 * scale, y - py * 92 * scale, angle, 48 * scale, 78 * scale);
  octAt(g, x + c * 8 * scale, y + s * 8 * scale, 28 * scale, angle);
  g.moveTo(x + px * 40 * scale - c * 18 * scale, y + py * 40 * scale - s * 18 * scale);
  g.lineTo(x - px * 40 * scale - c * 18 * scale, y - py * 40 * scale - s * 18 * scale);
  g.moveTo(x + px * 40 * scale + c * 18 * scale, y + py * 40 * scale + s * 18 * scale);
  g.lineTo(x - px * 40 * scale + c * 18 * scale, y - py * 40 * scale + s * 18 * scale);
}

function paintHub(g, hub) {
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2 + 0.18;
    g.moveTo(Math.cos(a) * (hub - 10), Math.sin(a) * (hub - 10));
    g.lineTo(Math.cos(a) * (hub + 36), Math.sin(a) * (hub + 36));
  }
  g.moveTo(0, -hub);
  g.lineTo(0, -hub - 86);
  g.moveTo(-8, -hub - 86);
  g.lineTo(8, -hub - 86);
  g.lineTo(0, -hub - 104);
  g.closePath();
}

function paintSpokes(g, hub, ring, spokes, end = ring - 16) {
  const inner = hub + 18;
  for (let s = 0; s < spokes; s += 1) {
    const a = (s / spokes) * Math.PI * 2;
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    const px = -ny;
    const py = nx;
    for (const side of [-11, 0, 11]) {
      g.moveTo(nx * inner + px * side, ny * inner + py * side);
      g.lineTo(nx * end + px * side, ny * end + py * side);
    }
    for (let d = inner + 40; d < end - 20; d += 64) {
      g.moveTo(nx * d + px * 14, ny * d + py * 14);
      g.lineTo(nx * d - px * 14, ny * d - py * 14);
      g.moveTo(nx * (d - 16) + px * 10, ny * (d - 16) + py * 10);
      g.lineTo(nx * (d + 16) - px * 10, ny * (d + 16) - py * 10);
    }
  }
}

function paintRing(g, ring) {
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
}

function paintDeck(g, color, hot, width, kind) {
  g.clear();
  const hub = cfg.hub;
  const ring = cfg.ring;
  const spokes = cfg.spokes;
  const draw = () => {
    paintHub(g, hub);
    if (kind === "mid") {
      paintSpokes(g, hub, ring, 4, ring * 0.72);
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        hangarAt(g, Math.cos(a) * ring * 0.78, Math.sin(a) * ring * 0.78, a, 1.35);
      }
      return;
    }
    paintSpokes(g, hub, ring, spokes);
    if (kind === "top") return;
    paintRing(g, ring);
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2 + 0.07;
      boxAt(g, Math.cos(a) * (ring + 36), Math.sin(a) * (ring + 36), a, 18, 10);
    }
  };
  draw();
  g.stroke({ width: width * 3, color, alpha: 0.16, cap: "round", join: "round" });
  draw();
  g.stroke({ width, color: hot, alpha: 0.92, cap: "round", join: "round" });
  strokeGlow(g, ringPts(8, hub), color, hot, width * 1.2);
  strokeGlow(g, ringPts(6, hub * 0.64, Math.PI / 6), color, hot, width);
  strokeGlow(g, ringPts(4, hub * 0.28, Math.PI / 4), colors.white, colors.white, width * 0.9);
}

function arcMid(slot) {
  return ((slot + 0.5) / cfg.spokes) * Math.PI * 2;
}

function paintJoint(g, color, hot) {
  g.clear();
  strokeGlow(g, boxPts(22, 56), color, hot, 1.15);
  strokeGlow(g, [0, -22, 14, 0, 0, 22, -14, 0], color, hot, 1.05);
  strokeLine(g, [-10, -18, 10, 18], color, hot, 0.8);
  strokeLine(g, [10, -18, -10, 18], color, hot, 0.8);
  strokeLine(g, [-16, 0, 16, 0], color, colors.white, 0.75);
}

function paintClamp(g, color, hot) {
  g.clear();
  strokeGlow(g, boxPts(20, 48), color, hot, 1.05);
  strokeLine(g, [-7, -18, -7, 18], color, hot, 0.8);
  strokeLine(g, [7, -18, 7, 18], color, hot, 0.8);
  strokeLine(g, [-11, -10, 11, -10], color, colors.white, 0.7);
  strokeLine(g, [-11, 10, 11, 10], color, colors.white, 0.7);
  strokeLine(g, [-9, 0, 9, 0], color, hot, 0.75);
}

function paintArc(g, color, hot, width, slot, origin) {
  g.clear();
  const ring = cfg.ring;
  const a0 = (slot / cfg.spokes) * Math.PI * 2;
  const a1 = ((slot + 1) / cfg.spokes) * Math.PI * 2;
  const mid = arcMid(slot);
  const ox = origin === "mid" ? Math.cos(mid) * ring : 0;
  const oy = origin === "mid" ? Math.sin(mid) * ring : 0;
  const steps = 8;
  const draw = () => {
    for (const r of [ring - 44, ring - 22, ring, ring + 22]) {
      g.moveTo(Math.cos(a0) * r - ox, Math.sin(a0) * r - oy);
      for (let i = 1; i <= steps; i += 1) {
        const a = a0 + (a1 - a0) * (i / steps);
        g.lineTo(Math.cos(a) * r - ox, Math.sin(a) * r - oy);
      }
    }
    for (let i = 0; i <= steps; i += 1) {
      const a = a0 + (a1 - a0) * (i / steps);
      g.moveTo(Math.cos(a) * (ring - 44) - ox, Math.sin(a) * (ring - 44) - oy);
      g.lineTo(Math.cos(a) * (ring + 22) - ox, Math.sin(a) * (ring + 22) - oy);
    }
    const dist = ring + (slot % 2 === 0 ? 58 : 34);
    hangarAt(g, Math.cos(mid) * dist - ox, Math.sin(mid) * dist - oy, mid, slot % 2 === 0 ? 1 : 0.52);
  };
  draw();
  g.stroke({ width: width * 3, color, alpha: 0.16, cap: "round", join: "round" });
  draw();
  g.stroke({ width, color: hot, alpha: 0.92, cap: "round", join: "round" });
}

export class Station {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.kind = "station";
    this.name = "STATION";
    this.color = colors.magenta;
    this.hotColor = colors.magentaHot;
    this.radius = cfg.ring + 140;
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
    paintDeck(this.deck2, this.color, this.hotColor, 0.8, "low");
    paintDeck(this.deck1, this.color, this.hotColor, 0.95, "mid");
    paintDeck(this.lattice, this.color, this.hotColor, 1.15, "top");
    this.depth2.addChild(this.deck2);
    this.depth1.addChild(this.deck1);
    this.depth2.alpha = cfg.alpha[1];
    this.depth1.alpha = cfg.alpha[0];
    this.depth2.scale.set(cfg.scale[1]);
    this.depth1.scale.set(cfg.scale[0]);
    this.combat.addChild(this.lattice);
    this.view.addChild(this.depth2, this.depth1, this.combat);
    this.view.visible = false;
    this.worldLayer = null;
    this.built = false;

    this.guns = [];
    this.modules = [];
    this.joints = [];
    this.clamps = [];
    this.arcs = [];
    this.buildArcs();
    this.buildParts();
  }

  mount(layer) {
    this.worldLayer = layer;
  }

  buildArcs() {
    for (let i = 0; i < cfg.spokes; i += 1) {
      const g = new Graphics();
      paintArc(g, this.color, this.hotColor, 1.15, i, "hub");
      this.combat.addChild(g);
      const mid = arcMid(i);
      this.arcs.push({
        slot: i,
        mid,
        lx: Math.cos(mid) * cfg.ring,
        ly: Math.sin(mid) * cfg.ring,
        graphic: g,
        installed: true,
        wasHeld: false,
        towedBy: null,
        x: this.x,
        y: this.y,
        rot: 0,
        vx: 0,
        vy: 0,
        spin: 0,
      });
    }
  }

  buildParts() {
    const ring = cfg.ring - 6;
    const mid = (cfg.hub + cfg.ring) * 0.52;
    const inner = cfg.hub + 52;
    for (let i = 0; i < cfg.spokes; i += 1) {
      const angle = (i / cfg.spokes) * Math.PI * 2;
      this.addGun(Math.cos(angle) * ring, Math.sin(angle) * ring, angle, "ring", { spoke: i, needsArc: true });
      if (i % 2 === 0) {
        this.addGun(Math.cos(angle) * (cfg.hub + 10), Math.sin(angle) * (cfg.hub + 10), angle, "hub", { spoke: i, needsArc: false });
      }
      const bay = angle + Math.PI / cfg.spokes;
      this.addModule(Math.cos(bay) * (ring + 58), Math.sin(bay) * (ring + 58), bay, 108, 64, { spoke: i, needsArc: true, startWelded: false });
      this.addModule(Math.cos(bay) * (ring + 8), Math.sin(bay) * (ring + 8), bay, 56, 32, { spoke: i, needsArc: true, startWelded: i % 2 === 0 });
      this.addModule(Math.cos(bay) * (ring - 78), Math.sin(bay) * (ring - 78), bay, 48, 28, { spoke: i, needsArc: true, startWelded: i % 2 === 0 });
      this.addModule(Math.cos(angle) * mid, Math.sin(angle) * mid, angle, 38, 22, { spoke: i, needsArc: false, startWelded: i % 2 === 0 });
      this.addModule(Math.cos(angle) * (mid + 150), Math.sin(angle) * (mid + 150), angle, 30, 18, { spoke: i, needsArc: false, startWelded: true });
      this.addModule(Math.cos(angle) * inner, Math.sin(angle) * inner, angle, 28, 18, { spoke: i, needsArc: false, startWelded: true });
      if (i % 2 === 0) {
        this.addModule(Math.cos(bay) * (ring + 118), Math.sin(bay) * (ring + 118), bay, 76, 42, { spoke: i, needsArc: true, startWelded: false });
        this.addModule(Math.cos(bay + 0.14) * (ring + 74), Math.sin(bay + 0.14) * (ring + 74), bay, 40, 24, { spoke: i, needsArc: true, startWelded: false });
        this.addModule(Math.cos(bay - 0.14) * (ring + 74), Math.sin(bay - 0.14) * (ring + 74), bay, 40, 24, { spoke: i, needsArc: true, startWelded: false });
      } else {
        this.addModule(Math.cos(bay) * (ring + 96), Math.sin(bay) * (ring + 96), bay, 62, 34, { spoke: i, needsArc: true, startWelded: false });
      }
      this.addHold("joint", Math.cos(angle) * cfg.ring, Math.sin(angle) * cfg.ring, angle, { spoke: i, needsArc: false });
      this.addHold("clamp", Math.cos(bay) * ((cfg.hub + cfg.ring) * 0.38), Math.sin(bay) * ((cfg.hub + cfg.ring) * 0.38), bay, { spoke: i, needsArc: true });
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

  addGun(lx, ly, angle, seat, extra = {}) {
    const g = new Graphics();
    paintTurret(g);
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
          radius: 22,
          hp: cfg.gunHits,
          maxHp: cfg.gunHits,
          cool: Math.random() * cfg.gunCool,
          welded: true,
          ...extra,
        },
        { name: "GUN", part: "gun" },
      ),
    );
  }

  addHold(kind, lx, ly, angle, extra = {}) {
    const joint = kind === "joint";
    const g = new Graphics();
    if (joint) paintJoint(g, this.color, this.hotColor);
    else paintClamp(g, this.color, this.hotColor);
    g.position.set(lx, ly);
    g.rotation = angle;
    this.combat.addChild(g);
    const part = this.stamp(
      {
        lx,
        ly,
        graphic: g,
        radius: joint ? 38 : 30,
        hp: joint ? cfg.jointHits : cfg.clampHits,
        maxHp: joint ? cfg.jointHits : cfg.clampHits,
        welded: extra.startWelded !== false,
        joint,
        clamp: !joint,
        ...extra,
      },
      { name: joint ? "JOINT" : "CLAMP", part: kind },
    );
    this.modules.push(part);
    if (joint) this.joints[part.spoke] = part;
    else this.clamps[part.spoke] = part;
  }

  addModule(lx, ly, angle, w, h, extra = {}) {
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
          welded: extra.startWelded !== false,
          ...extra,
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
    return [...this.guns, ...this.modules].filter((part) => part.alive && part.welded);
  }

  slotWorld(arc) {
    return this.localToWorld(arc.lx, arc.ly);
  }

  paintArcGraphic(arc, origin) {
    paintArc(arc.graphic, this.color, this.hotColor, 1.15, arc.slot, origin);
  }

  seatArc(arc) {
    arc.installed = true;
    arc.towedBy = null;
    arc.vx = 0;
    arc.vy = 0;
    arc.spin = 0;
    this.combat.addChild(arc.graphic);
    arc.graphic.position.set(0, 0);
    arc.graphic.rotation = 0;
    this.paintArcGraphic(arc, "hub");
    this.applyArcParts(arc.slot, true);
    arc.wasHeld = this.arcHeld(arc.slot);
  }

  releaseArc(arc, space, kick = 12) {
    const at = this.slotWorld(arc);
    const out = kick > 20 ? 160 : 240;
    arc.installed = false;
    arc.wasHeld = false;
    arc.towedBy = null;
    arc.x = at.x + Math.cos(arc.mid + this.rotation) * out;
    arc.y = at.y + Math.sin(arc.mid + this.rotation) * out;
    arc.rot = this.rotation;
    arc.vx = Math.cos(arc.mid + this.rotation) * kick;
    arc.vy = Math.sin(arc.mid + this.rotation) * kick;
    arc.spin = (arc.slot % 2 === 0 ? 1 : -1) * (kick > 20 ? 0.22 : 0.08);
    this.paintArcGraphic(arc, "mid");
    this.worldLayer?.addChild(arc.graphic);
    arc.graphic.position.set(arc.x, arc.y);
    arc.graphic.rotation = arc.rot;
    this.applyArcParts(arc.slot, false);
    if (space) wrap(arc, space.width, space.height);
  }

  applyArcParts(spoke, installed) {
    for (const part of [...this.guns, ...this.modules]) {
      if (part.spoke !== spoke || !part.needsArc) continue;
      const on = installed && part.welded;
      part.alive = on;
      part.graphic.visible = on;
      if (on) part.hp = part.maxHp;
    }
  }

  setPartLive(part, on) {
    part.welded = on;
    const arcOk = !part.needsArc || this.arcs[part.spoke]?.installed;
    part.alive = on && arcOk;
    part.graphic.visible = part.alive;
    if (part.alive) part.hp = part.maxHp;
    this.refreshHeld();
  }

  holdLive(part) {
    return Boolean(part?.alive && part.welded);
  }

  holdsFor(slot) {
    const n = cfg.spokes;
    return [this.joints[slot], this.joints[(slot + 1) % n], this.clamps[slot]];
  }

  arcHeld(slot) {
    return this.holdsFor(slot).every((part) => this.holdLive(part));
  }

  refreshHeld() {
    for (const arc of this.arcs) {
      if (arc.installed && this.arcHeld(arc.slot)) arc.wasHeld = true;
    }
  }

  checkBreaks(space) {
    for (const arc of this.arcs) {
      if (!arc.installed || !arc.wasHeld || this.arcHeld(arc.slot)) continue;
      this.releaseArc(arc, space, 78);
    }
  }

  needsYard() {
    return this.looseArcs().length > 0 || this.weldJobs().length > 0;
  }

  unfinished() {
    this.built = false;
    for (const part of [...this.guns, ...this.modules]) {
      part.welded = part.startWelded !== false;
      if (part.needsArc && part.spoke % 2 !== 0) part.welded = false;
      if (part.joint) part.welded = false;
    }
    for (const arc of this.arcs) {
      if (arc.slot % 2 === 0) this.seatArc(arc);
      else this.releaseArc(arc);
      arc.wasHeld = false;
    }
    for (const part of [...this.guns, ...this.modules]) {
      const arcOk = !part.needsArc || this.arcs[part.spoke]?.installed;
      part.alive = part.welded && arcOk;
      part.graphic.visible = part.alive;
      if (part.alive) part.hp = part.maxHp;
    }
  }

  complete() {
    this.built = true;
    for (const arc of this.arcs) this.seatArc(arc);
    for (const part of [...this.guns, ...this.modules]) this.setPartLive(part, true);
    for (const arc of this.arcs) arc.wasHeld = true;
  }

  setBuild(wave, force = false) {
    if (wave >= 7) {
      if (!this.built || force) this.complete();
    } else if (wave >= 5 && (force || !this.awake)) this.unfinished();
  }

  looseArcs() {
    return this.arcs.filter((arc) => !arc.installed);
  }

  weldJobs() {
    const n = cfg.spokes;
    return [...this.guns, ...this.modules].filter((part) => {
      if (part.welded) return false;
      if (part.needsArc && !this.arcs[part.spoke]?.installed) return false;
      if (part.joint) {
        const a = (part.spoke + n - 1) % n;
        if (!this.arcs[a]?.installed || !this.arcs[part.spoke]?.installed) return false;
      }
      return true;
    });
  }

  dropTow(crane) {
    for (const arc of this.arcs) {
      if (arc.towedBy !== crane) continue;
      arc.towedBy = null;
      arc.vx += Math.cos(crane.rotation) * 40;
      arc.vy += Math.sin(crane.rotation) * 40;
    }
  }

  tickLoose(dt, space) {
    for (const arc of this.arcs) {
      if (arc.installed) continue;
      if (arc.towedBy?.alive) {
        const crane = arc.towedBy;
        const back = 140;
        arc.x = crane.x - Math.cos(crane.rotation) * back;
        arc.y = crane.y - Math.sin(crane.rotation) * back;
        arc.rot += arc.spin * dt * 0.25;
        arc.vx = crane.vx;
        arc.vy = crane.vy;
      } else {
        arc.towedBy = null;
        arc.x += arc.vx * dt;
        arc.y += arc.vy * dt;
        arc.rot += arc.spin * dt;
        arc.vx *= 0.992;
        arc.vy *= 0.992;
      }
      wrap(arc, space.width, space.height);
    }
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

  reset(wave = 1) {
    this.rotation = 0;
    for (const gun of this.guns) {
      gun.hp = gun.maxHp;
      gun.cool = Math.random() * cfg.gunCool;
      gun.graphic.alpha = 1;
    }
    for (const mod of this.modules) {
      mod.hp = mod.maxHp;
      mod.graphic.alpha = 1;
    }
    this.setBuild(wave, true);
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
    this.tickLoose(dt, space);
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
