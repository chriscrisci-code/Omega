import { Graphics } from "pixi.js";
import { blackHole as cfg, colors } from "../config.js";
import { wrap } from "../math.js";
import { strokeGlow, strokeLine } from "../render/textures.js";

function ring(sides, radius, turn = 0) {
  const points = [];
  for (let i = 0; i < sides; i += 1) {
    const a = turn + (i / sides) * Math.PI * 2;
    points.push(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  return points;
}

function close(pts) {
  if (!pts || pts.length < 4) return pts;
  return [...pts, pts[0], pts[1]];
}

export class BlackHole {
  constructor() {
    this.view = new Graphics();
    this.view.visible = false;
    this.alive = false;
    this.phase = "jet";
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 8;
    this.maxRadius = 200;
    this.age = 0;
    this.spin = 0;
    this.didOpen = false;
  }

  fire(x, y, angle, maxRadius) {
    this.alive = true;
    this.phase = "jet";
    this.x = x;
    this.y = y;
    const speed = cfg.jetSpeed || 420;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.angle = angle;
    this.maxRadius = Math.max(80, maxRadius || 200);
    this.radius = 10;
    this.age = 0;
    this.spin = 0;
    this.didOpen = false;
    this.view.visible = true;
    this.view.alpha = 1;
    this.paint();
  }

  paint() {
    this.view.clear();
    if (!this.alive) return;
    const glow = colors.magenta;
    const hot = colors.magentaHot;
    if (this.phase === "jet") {
      const u = Math.min(1, this.age / (cfg.jetTime || 2));
      const r = 7 + u * 9;
      strokeGlow(this.view, ring(6, r, this.spin), glow, hot, 1.2 + u * 0.4);
      strokeGlow(this.view, ring(4, r * 0.42, -this.spin), glow, colors.white, 0.95);
      const nose = 16 + u * 8;
      strokeLine(this.view, [Math.cos(this.angle) * nose, Math.sin(this.angle) * nose, -Math.cos(this.angle) * 10, -Math.sin(this.angle) * 10], glow, hot, 1.1);
      this.view.alpha = 0.55 + u * 0.4;
      return;
    }
    const u = Math.min(1, this.age / (cfg.pullTime || 2.8));
    const reach = this.radius;
    strokeGlow(this.view, ring(16, reach, this.spin * 0.18), glow, hot, 1.15);
    strokeGlow(this.view, ring(8, reach * 0.62, -this.spin * 0.28), glow, hot, 1.05);
    strokeGlow(this.view, ring(6, reach * 0.28, this.spin * 0.5), glow, colors.white, 1.2);
    for (let i = 0; i < 8; i += 1) {
      const a = this.spin * 0.7 + (i / 8) * Math.PI * 2;
      strokeLine(
        this.view,
        close([Math.cos(a) * reach * 0.12, Math.sin(a) * reach * 0.12, Math.cos(a) * reach * 0.92, Math.sin(a) * reach * 0.92]),
        glow,
        hot,
        0.7,
      );
    }
    this.view.alpha = 0.42 + (1 - u) * 0.5;
  }

  update(dt, space) {
    if (!this.alive) return;
    this.age += dt;
    this.spin += dt * (this.phase === "pull" ? 2.8 : 1.8);
    if (this.phase === "jet") {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      wrap(this, space.width, space.height);
      this.radius = 10;
      if (this.age >= (cfg.jetTime || 2)) {
        this.phase = "pull";
        this.age = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = this.maxRadius;
        this.didOpen = true;
      }
    } else {
      const u = Math.min(1, this.age / (cfg.pullTime || 2.8));
      this.radius = this.maxRadius * (1 - u * 0.1);
      if (this.age >= (cfg.pullTime || 2.8)) this.kill();
    }
    this.paint();
  }

  kill() {
    this.alive = false;
    this.phase = "jet";
    this.didOpen = false;
    this.view.clear();
    this.view.visible = false;
  }
}
