import { Graphics } from "pixi.js";
import { rand } from "../math.js";
import { strokeGlow } from "../render/textures.js";

function rotate(x, y, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - y * s, y: x * s + y * c };
}

function toWorld(localX, localY, body) {
  const p = rotate(localX, localY, body.rotation);
  return { x: body.x + p.x, y: body.y + p.y };
}

function flat(points) {
  const verts = [];
  for (let i = 0; i < points.length; i += 2) {
    verts.push({ x: points[i], y: points[i + 1] });
  }
  return verts;
}

function midpoint(a, b) {
  return { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
}

function scaleToward(point, origin, amount) {
  return {
    x: origin.x + (point.x - origin.x) * amount,
    y: origin.y + (point.y - origin.y) * amount,
  };
}

function shardFromLocals(local, body, look, extras = {}) {
  let cx = 0;
  let cy = 0;
  for (const p of local) {
    cx += p.x;
    cy += p.y;
  }
  cx /= local.length;
  cy /= local.length;

  const rel = [];
  for (const p of local) rel.push(p.x - cx, p.y - cy);

  const world = toWorld(cx, cy, body);
  const out = rotate(cx, cy, body.rotation);
  const mag = Math.hypot(out.x, out.y) || 1;
  const kickScale = extras.kickScale ?? 1;
  const speed = (look.kick + rand(-50, 80)) * kickScale;

  return {
    x: world.x,
    y: world.y,
    vx: (body.vx || 0) + (out.x / mag) * speed + rand(-40, 40),
    vy: (body.vy || 0) + (out.y / mag) * speed + rand(-40, 40),
    rotation: body.rotation,
    spin: rand(-12, 12) * (extras.spinScale ?? 1),
    points: rel,
    closed: extras.closed ?? false,
    color: look.color,
    hotColor: look.hotColor,
    life: extras.life ?? Math.max(0.18, (look.life + rand(-0.2, 0.2)) * (extras.lifeScale ?? 1)),
    width: extras.width ?? 1.35,
  };
}

export function shatter(points, body, look) {
  const verts = flat(points);
  const n = verts.length;
  if (n < 2) return [];

  const shards = [];

  for (let i = 0; i < n; i += 1) {
    const a = verts[i];
    const b = verts[(i + 1) % n];
    const roll = Math.random();

    if (roll < 0.18) continue;

    if (roll < 0.78) {
      const mid = midpoint(a, b);
      const length = rand(0.35, 0.95);
      shards.push(
        shardFromLocals([scaleToward(a, mid, length), scaleToward(b, mid, length)], body, look, {
          closed: false,
          lifeScale: rand(0.45, 0.75),
          kickScale: rand(0.95, 1.35),
          spinScale: rand(1.1, 1.8),
          width: rand(1.1, 1.6),
        }),
      );
      continue;
    }

    if (roll < 0.93) {
      const inner = { x: (a.x + b.x) * 0.18, y: (a.y + b.y) * 0.18 };
      shards.push(
        shardFromLocals([a, b, inner], body, look, {
          closed: true,
          lifeScale: rand(0.65, 0.9),
          kickScale: rand(0.75, 1.1),
          spinScale: rand(0.7, 1.2),
          width: 1.45,
        }),
      );
      continue;
    }

    const span = 3 + ((Math.random() * 2) | 0);
    const rim = [];
    for (let k = 0; k < span; k += 1) rim.push(verts[(i + k) % n]);
    let ax = 0;
    let ay = 0;
    for (const p of rim) {
      ax += p.x;
      ay += p.y;
    }
    shards.push(
      shardFromLocals([...rim, { x: (ax / rim.length) * 0.24, y: (ay / rim.length) * 0.24 }], body, look, {
        closed: true,
        lifeScale: rand(0.9, 1.15),
        kickScale: rand(0.55, 0.85),
        spinScale: rand(0.4, 0.8),
        width: 1.55,
      }),
    );
  }

  const extraLines = 1 + ((Math.random() * 3) | 0);
  for (let i = 0; i < extraLines; i += 1) {
    const v = verts[(Math.random() * n) | 0];
    const len = rand(4, 12);
    const angle = rand(0, Math.PI * 2);
    const dx = Math.cos(angle) * len;
    const dy = Math.sin(angle) * len;
    shards.push(
      shardFromLocals(
        [
          { x: v.x - dx, y: v.y - dy },
          { x: v.x + dx, y: v.y + dy },
        ],
        body,
        look,
        {
          closed: false,
          lifeScale: rand(0.35, 0.6),
          kickScale: rand(1.1, 1.6),
          spinScale: rand(1.4, 2.2),
          width: rand(1, 1.4),
        },
      ),
    );
  }

  return shards;
}

export function chipBurst(body, look, count = 5) {
  const shards = [];
  for (let i = 0; i < count; i += 1) {
    const angle = rand(0, Math.PI * 2);
    const len = rand(3.5, 9);
    const reach = (body.radius || 20) * rand(0.35, 0.9);
    const ox = Math.cos(angle) * reach;
    const oy = Math.sin(angle) * reach;
    const linger = look.longLife && Math.random() < (look.longChance ?? 0.38);
    shards.push(
      shardFromLocals(
        [
          { x: ox - Math.cos(angle) * len, y: oy - Math.sin(angle) * len },
          { x: ox + Math.cos(angle) * len, y: oy + Math.sin(angle) * len },
        ],
        body,
        look,
        {
          closed: false,
          life: linger ? look.longLife + rand(-0.2, 0.4) : undefined,
          lifeScale: rand(0.28, 0.5),
          kickScale: linger ? rand(0.35, 0.7) : rand(1.2, 1.8),
          spinScale: linger ? rand(0.35, 0.9) : rand(1.6, 2.4),
          width: linger ? rand(1.15, 1.55) : rand(1, 1.35),
        },
      ),
    );
  }
  return shards;
}

function drawLine(graphics, points, hotColor, width) {
  graphics.moveTo(points[0], points[1]);
  graphics.lineTo(points[2], points[3]);
  graphics.stroke({ width, color: hotColor, cap: "round" });
}

export class Debris {
  constructor(spec) {
    this.x = spec.x;
    this.y = spec.y;
    this.vx = spec.vx;
    this.vy = spec.vy;
    this.rotation = spec.rotation;
    this.spin = spec.spin;
    this.life = spec.life;
    this.maxLife = spec.life;
    this.view = new Graphics();
    if (spec.closed) strokeGlow(this.view, spec.points, spec.color, spec.hotColor, spec.width);
    else drawLine(this.view, spec.points, spec.hotColor, spec.width);
    this.sync();
  }

  get alive() {
    return this.life > 0;
  }

  sync() {
    this.view.position.set(this.x, this.y);
    this.view.rotation = this.rotation;
    const t = this.life / this.maxLife;
    this.view.alpha = t > 0.3 ? 1 : t / 0.3;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) {
      this.destroy();
      return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.spin * dt;
    this.vx *= 0.992;
    this.vy *= 0.992;
    this.sync();
  }

  destroy() {
    this.life = 0;
    if (!this.view.destroyed) this.view.destroy();
  }
}
