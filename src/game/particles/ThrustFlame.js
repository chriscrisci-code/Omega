import { Particle, ParticleContainer, Rectangle } from "pixi.js";
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
    this.rate = this.burst * 36;
    this.coolLife = 0.12;
    this.hotLife = 0.09;
    this.acc = 0;
    this.lit = false;

    this.container = new ParticleContainer({
      blendMode: "add",
      boundsArea: new Rectangle(-220, -220, 440, 440),
      dynamicProperties: {
        position: true,
        rotation: true,
        vertex: true,
        color: true,
      },
    });

    this.items = [];
    for (let i = 0; i < pool; i += 1) {
      const view = new Particle({
        texture,
        x: 0,
        y: 0,
        anchorX: 0.5,
        anchorY: 0.5,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        rotation: angle,
        tint,
      });
      this.container.addParticle(view);
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
      const speed = this.speed + rand(0, 220);
      const jitter = rand(-28, 28);
      item.alive = true;
      item.vx = dirX * speed + px * jitter;
      item.vy = dirY * speed + py * jitter;
      item.life = hot ? this.hotLife : this.coolLife;
      item.maxLife = item.life;
      item.startSize = this.size * (hot ? rand(0.65, 0.9) : rand(0.85, 1.15));
      item.view.x = this.originX + px * rand(-1.2, 1.2);
      item.view.y = this.originY + py * rand(-1.2, 1.2);
      item.view.rotation = this.angle;
      item.view.tint = hot ? this.tintHot : this.tint;
      item.view.alpha = 1;
      const scale = item.startSize / particleConfig.textureSize;
      item.view.scaleX = scale * this.stretch;
      item.view.scaleY = scale;
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
        item.view.scaleX = 0;
        item.view.scaleY = 0;
        continue;
      }

      item.view.x += item.vx * step;
      item.view.y += item.vy * step;
      const t = item.life / item.maxLife;
      const scale = (item.startSize / particleConfig.textureSize) * t;
      item.view.scaleX = scale * this.stretch;
      item.view.scaleY = scale;
      item.view.alpha = t;
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
      item.view.scaleX = 0;
      item.view.scaleY = 0;
    }
  }
}
