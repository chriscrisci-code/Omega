import { Graphics } from "pixi.js";
import { colors, ore } from "../config.js";
import { wrap } from "../math.js";

const FLAKE = [0, -7, 4.5, 0, 0, 7, -4.5, 0];

export class Ore {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * ore.drift;
    this.vy = (Math.random() - 0.5) * ore.drift;
    this.rotation = Math.random() * Math.PI * 2;
    this.spin = (Math.random() - 0.5) * 3.2;
    this.radius = ore.radius;
    this.life = ore.life;
    this.alive = true;
    this.view = new Graphics();
    this.paint();
    this.sync();
  }

  paint(pulse = 1) {
    this.view.clear();
    this.view.poly(FLAKE, true);
    this.view.stroke({ width: 9.5, color: colors.cyan, alpha: 0.12 * pulse, join: "round" });
    this.view.poly(FLAKE, true);
    this.view.stroke({ width: 5.2, color: colors.cyan, alpha: 0.28 * pulse, join: "round" });
    this.view.poly(FLAKE, true);
    this.view.stroke({ width: 2.2, color: colors.cyanHot, alpha: 0.85, join: "round" });
    this.view.poly(FLAKE, true);
    this.view.stroke({ width: 1.05, color: colors.white, join: "round" });
    this.view.circle(0, 0, 1.8);
    this.view.fill({ color: colors.white, alpha: 0.55 + pulse * 0.35 });
  }

  sync() {
    this.view.position.set(this.x, this.y);
    this.view.rotation = this.rotation;
    this.view.alpha = this.life < 4 ? this.life / 4 : 1;
  }

  update(dt, bounds) {
    if (!this.alive) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.kill();
      return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.985;
    this.vy *= 0.985;
    this.rotation += this.spin * dt;
    wrap(this, bounds.width, bounds.height);
    this.paint(0.72 + 0.28 * (0.5 + 0.5 * Math.sin(this.life * 7)));
    this.sync();
  }

  pull(nx, ny, force) {
    this.vx += nx * force;
    this.vy += ny * force;
  }

  kill() {
    this.alive = false;
    if (!this.view.destroyed) this.view.destroy();
  }
}
