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
    } = options;

    this.originX = x;
    this.originY = y;
    this.angle = angle;
    this.tint = tint;
    this.tintHot = tintHot;
    this.speed = speed;
    this.size = size;
    this.stretch = stretch;

    this.container = new ParticleContainer({
      blendMode: "add",
      boundsArea: new Rectangle(-100, -100, 200, 200),
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
      item.life = hot ? 0.026 : 0.038;
      item.maxLife = item.life;
      item.startSize = this.size * (hot ? rand(0.65, 0.9) : rand(0.85, 1.15));
      item.view.x = this.originX + px * rand(-1.2, 1.2);
      item.view.y = this.originY + py * rand(-1.2, 1.2);
      item.view.rotation = this.angle;
      item.view.tint = hot ? this.tintHot : this.tint;
      item.view.alpha = 1;
      return;
    }
  }

  update(dt, on) {
    if (on) {
      this.emit();
      this.emit();
    }

    for (const item of this.items) {
      if (!item.alive) continue;
      item.life -= dt;
      if (item.life <= 0) {
        item.alive = false;
        item.view.alpha = 0;
        item.view.scaleX = 0;
        item.view.scaleY = 0;
        continue;
      }

      item.view.x += item.vx * dt;
      item.view.y += item.vy * dt;
      const t = item.life / item.maxLife;
      const scale = (item.startSize / particleConfig.textureSize) * t;
      item.view.scaleX = scale * this.stretch;
      item.view.scaleY = scale;
      item.view.alpha = t;
    }
  }

  stop() {
    for (const item of this.items) {
      item.alive = false;
      item.view.alpha = 0;
      item.view.scaleX = 0;
      item.view.scaleY = 0;
    }
  }
}
