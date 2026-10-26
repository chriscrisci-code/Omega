import { Graphics } from "pixi.js";
import { blackHole as cfg, colors } from "../config.js";
import { wrap } from "../math.js";

function seedEmbers(count, tight) {
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const disk = i / count < 0.82;
    const rx = tight
      ? disk ? 14 + Math.random() * 8 : 8 + Math.random() * 18
      : disk ? 46 + Math.random() * 18 : 22 + Math.random() * 38;
    const ry = tight
      ? disk ? 2.2 + Math.random() * 1.6 : 2 + Math.random() * 6
      : disk ? 5 + Math.random() * 4.5 : 4 + Math.random() * 14;
    list.push({
      a: Math.random() * Math.PI * 2,
      w: 9 + Math.random() * 10,
      rx,
      ry,
      size: 0.7 + Math.random() * 1.7,
      sign: Math.random() < 0.1 ? -1 : 1,
    });
  }
  return list;
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
    this.didOpen = false;
    this.embers = [];
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
    this.didOpen = false;
    this.embers = seedEmbers(36, true);
    this.view.visible = true;
    this.view.alpha = 1;
    this.paint();
  }

  emberDot(ember, scale) {
    const x = Math.cos(ember.a) * ember.rx * scale;
    const y = Math.sin(ember.a) * ember.ry * scale;
    const s = ember.size * (0.75 + scale * 0.35);
    return { x, y, s };
  }

  drawEmbers(g, scale, behind) {
    for (const ember of this.embers) {
      const { x, y, s } = this.emberDot(ember, scale);
      if (behind ? y > 0.4 : y <= 0.4) continue;
      g.circle(x, y, s * 2.1);
      g.stroke({ width: s * 1.8, color: colors.white, alpha: 0.18 });
      g.circle(x, y, s);
      g.fill({ color: colors.white, alpha: 0.95 });
    }
  }

  drawCore(g, r) {
    g.circle(0, 0, r * 2.15);
    g.stroke({ width: r * 0.85, color: colors.white, alpha: 0.16 });
    g.circle(0, 0, r * 1.35);
    g.stroke({ width: r * 0.42, color: colors.white, alpha: 0.55 });
    g.circle(0, 0, r);
    g.fill({ color: colors.white, alpha: 0.95 });
    g.circle(0, 0, r * 0.42);
    g.fill({ color: colors.white, alpha: 1 });
  }

  paint() {
    const g = this.view;
    g.clear();
    if (!this.alive) return;
    if (this.phase === "jet") {
      const u = Math.min(1, this.age / (cfg.jetTime || 2));
      const scale = 0.55 + u * 0.7;
      const core = 5 + u * 7;
      this.drawEmbers(g, scale, true);
      this.drawCore(g, core);
      this.drawEmbers(g, scale, false);
      this.view.alpha = 0.7 + u * 0.3;
      return;
    }
    const u = Math.min(1, this.age / (cfg.pullTime || 2.8));
    const fade = 1 - u * 0.18;
    this.drawEmbers(g, fade, true);
    this.drawCore(g, 18 * fade);
    this.drawEmbers(g, fade, false);
    this.view.alpha = 0.82 + (1 - u) * 0.18;
  }

  update(dt, space) {
    if (!this.alive) return;
    this.age += dt;
    for (const ember of this.embers) ember.a += ember.w * ember.sign * dt;
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
        this.embers = seedEmbers(64, false);
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
    this.embers = [];
    this.view.clear();
    this.view.visible = false;
  }
}
