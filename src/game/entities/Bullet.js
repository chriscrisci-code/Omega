import { Graphics } from "pixi.js";
import { bullets, colors } from "../config.js";

export class Bullet {
  constructor() {
    this.view = new Graphics();
    this.paint();
    this.radius = bullets.radius;
    this.hostile = false;
    this.angle = 0;
    this.ignore = null;
    this.ignoreFor = 0;
    this.alive = false;
    this.view.visible = false;
  }

  paint(color = colors.cyan, hot = colors.white) {
    const tip = bullets.streak;
    this.view.clear();
    this.view.moveTo(-2, 0);
    this.view.lineTo(tip + 2, 0);
    this.view.stroke({ width: 9, color, alpha: 0.14, cap: "round" });
    this.view.moveTo(0, 0);
    this.view.lineTo(tip, 0);
    this.view.stroke({ width: 4.4, color, alpha: 0.38, cap: "round" });
    this.view.moveTo(0, 0);
    this.view.lineTo(tip, 0);
    this.view.stroke({ width: 1.55, color: hot, alpha: 1, cap: "round" });
    this.view.circle(tip, 0, 2.4);
    this.view.fill({ color: hot, alpha: 0.85 });
  }

  fire(x, y, angle, options = {}) {
    this.alive = true;
    this.hostile = Boolean(options.hostile);
    this.x = x;
    this.y = y;
    this.angle = angle;
    const speed = options.speed ?? bullets.speed;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = options.life ?? bullets.life;
    this.ignore = null;
    this.ignoreFor = 0;
    this.paint(options.color ?? colors.cyan, options.hot ?? colors.white);
    this.view.visible = true;
    this.view.alpha = 1;
    this.view.position.set(x, y);
    this.view.rotation = angle;
  }

  update(dt) {
    if (!this.alive) return;
    this.life -= dt;
    this.ignoreFor = Math.max(0, this.ignoreFor - dt);
    if (this.ignoreFor <= 0) this.ignore = null;
    if (this.life <= 0) {
      this.kill();
      return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.view.position.set(this.x, this.y);
    this.view.alpha = this.life < 0.12 ? this.life / 0.12 : 1;
  }

  kill() {
    this.alive = false;
    this.view.visible = false;
  }
}
