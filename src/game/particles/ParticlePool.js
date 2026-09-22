import { Particle, ParticleContainer, Rectangle } from "pixi.js";
import { particles as particleConfig } from "../config.js";
import { rand, wrapDelta } from "../math.js";

export class ParticlePool {
  constructor(texture, width, height) {
    this.texture = texture;
    this.container = new ParticleContainer({
      blendMode: "add",
      boundsArea: new Rectangle(-80, -80, width + 160, height + 160),
      dynamicProperties: {
        position: true,
        rotation: true,
        vertex: true,
        color: true,
      },
    });

    this.items = [];
    for (let i = 0; i < particleConfig.poolSize; i += 1) {
      const view = new Particle({
        texture,
        x: -200,
        y: -200,
        anchorX: 0.5,
        anchorY: 0.5,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        tint: 0xffffff,
      });
      this.container.addParticle(view);
      this.items.push({
        view,
        alive: false,
        wx: 0,
        wy: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        drag: 0.96,
        startSize: 1,
        endSize: 0,
        stretch: 1,
        nowrap: false,
      });
    }
  }

  resize(width, height) {
    this.container.boundsArea = new Rectangle(-80, -80, width + 160, height + 160);
  }

  emit(count, options) {
    const {
      x,
      y,
      color = 0xffffff,
      speed = 80,
      speedVar = 40,
      angle = 0,
      spread = Math.PI * 2,
      life = 0.45,
      lifeVar = 0.2,
      size = 8,
      sizeVar = 4,
      endSize = 0,
      drag = 0.94,
      stretch = 1,
      nowrap = false,
    } = options;

    let spawned = 0;
    for (const item of this.items) {
      if (spawned >= count) break;
      if (item.alive) continue;

      const dir = angle + rand(-spread / 2, spread / 2);
      const mag = Math.max(0, speed + rand(-speedVar, speedVar));
      const maxLife = Math.max(0.05, life + rand(-lifeVar, lifeVar));
      const startSize = Math.max(1, size + rand(-sizeVar, sizeVar));

      item.alive = true;
      item.vx = Math.cos(dir) * mag;
      item.vy = Math.sin(dir) * mag;
      item.life = maxLife;
      item.maxLife = maxLife;
      item.drag = drag;
      item.startSize = startSize;
      item.endSize = endSize;
      item.stretch = stretch;
      item.nowrap = nowrap;

      item.wx = x;
      item.wy = y;
      const view = item.view;
      view.x = x;
      view.y = y;
      view.rotation = dir;
      view.tint = color;
      view.alpha = 1;
      view.scaleX = startSize / particleConfig.textureSize;
      view.scaleY = view.scaleX / stretch;
      spawned += 1;
    }
  }

  trail(x, y, angle, color) {
    this.emit(1, {
      x,
      y,
      color,
      angle,
      spread: 0.04,
      speed: 30,
      speedVar: 16,
      life: 0.07,
      lifeVar: 0.03,
      size: 7,
      sizeVar: 2,
      drag: 0.97,
      stretch: 4.2,
    });
  }

  burst(x, y, color, count = 36, speed = 220) {
    this.emit(count, {
      x,
      y,
      color,
      speed,
      speedVar: speed * 0.55,
      life: 0.55,
      lifeVar: 0.25,
      size: 14,
      sizeVar: 8,
      drag: 0.9,
    });
  }

  embers(x, y, color, count = 10) {
    this.emit(count, {
      x,
      y,
      color,
      speed: 70,
      speedVar: 50,
      life: 0.9,
      lifeVar: 0.35,
      size: 8,
      sizeVar: 4,
      drag: 0.97,
    });
  }

  dust(width, height, count = 28) {
    for (let i = 0; i < count; i += 1) {
      this.emit(1, {
        x: rand(0, width),
        y: rand(0, height),
        color: 0x3a6d88,
        speed: 12,
        speedVar: 10,
        life: 8,
        lifeVar: 4,
        size: 5,
        sizeVar: 2,
        drag: 1,
      });
    }
  }

  update(dt, cam) {
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

      item.vx *= item.drag;
      item.vy *= item.drag;
      item.wx += item.vx * dt;
      item.wy += item.vy * dt;
      if (cam && !item.nowrap) {
        item.view.x = cam.x + wrapDelta(item.wx - cam.x, cam.w);
        item.view.y = cam.y + wrapDelta(item.wy - cam.y, cam.h);
      } else {
        item.view.x = item.wx;
        item.view.y = item.wy;
      }

      const t = item.life / item.maxLife;
      const size = item.endSize + (item.startSize - item.endSize) * t;
      const scale = size / particleConfig.textureSize;
      item.view.scaleX = scale * item.stretch;
      item.view.scaleY = scale;
      item.view.alpha = t;
    }
  }
}
