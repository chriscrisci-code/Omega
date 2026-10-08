import { Graphics } from "pixi.js";
import { colors, missiles } from "../config.js";
import { rand } from "../math.js";

export class MissileBurst {
  constructor() {
    this.view = new Graphics();
    this.view.visible = false;
    this.alive = false;
    this.x = 0;
    this.y = 0;
    this.rays = [];
    this.struck = new Set();
    this.tint = colors.cyan;
    this.tintHot = colors.cyanHot;
  }

  fire(x, y, options = {}) {
    const count = Math.max(1, Math.floor(options.count ?? missiles.rays ?? 100));
    const range = options.range ?? missiles.rayRange ?? 280;
    const speed = options.speed ?? missiles.raySpeed ?? 1400;
    const lifeMin = options.lifeMin ?? missiles.rayLifeMin ?? 0.12;
    const lifeMax = options.lifeMax ?? missiles.rayLifeMax ?? 0.55;
    this.alive = true;
    this.x = x;
    this.y = y;
    this.tint = options.color ?? colors.cyan;
    this.tintHot = options.hot ?? colors.cyanHot;
    this.struck = new Set();
    this.rays = [];
    for (let i = 0; i < count; i += 1) {
      const life = rand(lifeMin, lifeMax);
      this.rays.push({
        angle: (i / count) * Math.PI * 2 + rand(-0.04, 0.04),
        length: 0,
        max: range * rand(0.38, 1),
        speed: speed * rand(0.72, 1.2),
        life,
        maxLife: life,
        blocked: false,
      });
    }
    this.view.visible = true;
    this.view.alpha = 1;
    this.view.position.set(x, y);
    this.paint();
  }

  paint() {
    this.view.clear();
    if (!this.alive) return;
    const glow = this.tint ?? colors.cyan;
    const hot = this.tintHot ?? colors.cyanHot;
    for (const ray of this.rays) {
      if (ray.life <= 0 || ray.length <= 1) continue;
      const fade = Math.max(0, ray.life / ray.maxLife);
      const x2 = Math.cos(ray.angle) * ray.length;
      const y2 = Math.sin(ray.angle) * ray.length;
      this.view.moveTo(0, 0);
      this.view.lineTo(x2, y2);
      this.view.stroke({ width: 2.1, color: glow, alpha: 0.22 * fade, cap: "round" });
      this.view.moveTo(0, 0);
      this.view.lineTo(x2, y2);
      this.view.stroke({ width: 0.85, color: hot, alpha: 0.92 * fade, cap: "round" });
    }
  }

  update(dt, clip) {
    if (!this.alive) return [];
    const fresh = [];
    let live = 0;
    for (const ray of this.rays) {
      ray.life -= dt;
      if (ray.life <= 0) continue;
      live += 1;
      if (!ray.blocked) {
        const want = Math.min(ray.max, ray.length + ray.speed * dt);
        const hit = clip ? clip(ray.angle, want) : null;
        const next = hit?.length ?? want;
        ray.length = next;
        if (hit?.body) {
          ray.blocked = true;
          if (!this.struck.has(hit.body)) {
            this.struck.add(hit.body);
            fresh.push({
              body: hit.body,
              kind: hit.kind,
              angle: ray.angle,
              x: this.x + Math.cos(ray.angle) * ray.length,
              y: this.y + Math.sin(ray.angle) * ray.length,
            });
          }
        } else if (ray.length >= ray.max - 0.5) {
          ray.blocked = true;
        }
      }
    }
    if (!live) {
      this.kill();
      return fresh;
    }
    this.paint();
    return fresh;
  }

  kill() {
    this.alive = false;
    this.rays.length = 0;
    this.struck.clear();
    this.view.clear();
    this.view.visible = false;
  }
}
