import { Container, Sprite } from "pixi.js";
import { particles as particleConfig } from "../config.js";
import { rand } from "../math.js";

export class ThrustFlame {
  constructor(texture, options = {}) {
    const {
      x = -12,
      y = 0,
      angle = Math.PI,
      tint = 0xffc266,
      tintHot = 0xfff6d0,
      pool = 16,
      speed = 980,
      size = 8,
      stretch = 2.6,
      burst = 2,
    } = options;

    this.originX = x;
    this.originY = y;
    this.angle = angle;
    this.tint = tint;
    this.tintHot = tintHot;
    this.speed = speed;
    this.size = size;
    this.stretch = stretch;
    this.burst = Math.max(1, burst | 0);
    this.rate = this.burst * 28;
    this.coolLife = 0.2;
    this.hotLife = 0.14;
    this.acc = 0;
    this.lit = false;

    this.container = new Container();
    this.container.eventMode = "none";
    this.items = [];
    for (let i = 0; i < pool; i += 1) {
      const view = new Sprite(texture);
      view.anchor.set(0.5);
      view.blendMode = "add";
      view.tint = tint;
      view.alpha = 0;
      view.scale.set(0);
      view.visible = false;
      view.rotation = angle;
      this.container.addChild(view);
      this.items.push({
        view,
        alive: false,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        startSize: size,
      });
    }
  }

  emit() {
    const dirX = Math.cos(this.angle);
    const dirY = Math.sin(this.angle);
    const px = -dirY;
    const py = dirX;

    for (const item of this.items) {
      if (item.alive) continue;
      const hot = Math.random() < 0.4;
      const speed = this.speed + rand(0, 90);
      const jitter = rand(-18, 18);
      item.alive = true;
      item.vx = dirX * speed + px * jitter;
      item.vy = dirY * speed + py * jitter;
      item.life = hot ? this.hotLife : this.coolLife;
      item.maxLife = item.life;
      item.startSize = this.size * (hot ? rand(0.7, 1) : rand(0.95, 1.25));
      item.view.position.set(this.originX + px * rand(-1.2, 1.2), this.originY + py * rand(-1.2, 1.2));
      item.view.rotation = this.angle;
      item.view.tint = hot ? this.tintHot : this.tint;
      item.view.alpha = 1;
      const scale = item.startSize / particleConfig.textureSize;
      item.view.scale.set(scale * this.stretch, scale);
      item.view.visible = true;
      return true;
    }
    return false;
  }

  update(dt, on) {
    const step = Math.max(0, dt);
    for (const item of this.items) {
      if (!item.alive) continue;
      item.life -= step;
      if (item.life <= 0) {
        item.alive = false;
        item.view.alpha = 0;
        item.view.scale.set(0);
        item.view.visible = false;
        continue;
      }

      item.view.x += item.vx * step;
      item.view.y += item.vy * step;
      const t = item.life / item.maxLife;
      const scale = (item.startSize / particleConfig.textureSize) * (0.45 + 0.55 * t);
      item.view.scale.set(scale * this.stretch, scale);
      item.view.alpha = 0.35 + 0.65 * t;
    }

    if (!on) {
      this.lit = false;
      this.acc = 0;
      return;
    }

    if (!this.lit) {
      this.lit = true;
      this.acc = Math.max(this.acc, this.burst);
    }
    this.acc += this.rate * step;
    const cap = Math.max(this.burst * 2, 8);
    let want = Math.min(Math.floor(this.acc), cap);
    while (want > 0 && this.emit()) {
      this.acc -= 1;
      want -= 1;
    }
    if (want > 0) this.acc = Math.min(this.acc, cap);
  }

  stop() {
    this.lit = false;
    this.acc = 0;
    for (const item of this.items) {
      item.alive = false;
      item.view.alpha = 0;
      item.view.scale.set(0);
      item.view.visible = false;
    }
  }
}
