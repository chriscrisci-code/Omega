import { Graphics } from "pixi.js";
import { colors, emp, shield } from "../config.js";
import { strokeGlow } from "../render/textures.js";

function octagon(radius, spin) {
  const points = [];
  for (let i = 0; i < 8; i += 1) {
    const a = spin + (i / 8) * Math.PI * 2;
    points.push(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  return points;
}

export class EmpPulse {
  constructor() {
    this.view = new Graphics();
    this.view.visible = false;
    this.alive = false;
    this.radius = 0;
    this.hit = new Set();
    this.follow = true;
    this.growFor = emp.grow;
    this.fadeFor = emp.fade;
    this.spinRate = 2.2;
    this.tint = colors.cyan;
    this.tintHot = colors.cyanHot;
    this.startRadius = shield.radius;
  }

  fire(x, y, maxRadius, options = {}) {
    this.alive = true;
    this.x = x;
    this.y = y;
    this.follow = options.follow !== false;
    this.growFor = options.grow ?? emp.grow;
    this.fadeFor = options.fade ?? emp.fade;
    this.spinRate = options.spin ?? 2.2;
    this.tint = options.color ?? colors.cyan;
    this.tintHot = options.hot ?? colors.cyanHot;
    this.startRadius = options.start ?? shield.radius;
    this.radius = this.startRadius;
    this.maxRadius = Math.max(maxRadius, this.startRadius * 2);
    this.age = 0;
    this.spin = 0;
    this.hit.clear();
    this.view.visible = true;
    this.view.alpha = 1;
    this.paint();
  }

  paint() {
    this.view.clear();
    if (!this.alive) return;
    const grow = this.growFor || emp.grow;
    const fadeFor = this.fadeFor || emp.fade;
    const u = Math.min(1, this.age / grow);
    const fade = this.age <= grow ? 1 : Math.max(0, 1 - (this.age - grow) / fadeFor);
    const glow = this.tint ?? colors.cyan;
    const hot = this.tintHot ?? colors.cyanHot;
    strokeGlow(this.view, octagon(this.radius, this.spin), glow, hot, 1.35 + u * 1.4);
    strokeGlow(this.view, octagon(this.radius * 0.72, -this.spin * 0.6), glow, colors.white, 0.9);
    this.view.alpha = 0.28 + fade * 0.72;
  }

  update(dt, follow) {
    if (!this.alive) return;
    if (this.follow !== false && follow) {
      this.x = follow.x;
      this.y = follow.y;
    }
    this.age += dt;
    this.spin += (this.spinRate ?? 2.2) * dt;
    const grow = this.growFor || emp.grow;
    const u = Math.min(1, this.age / grow);
    const ease = u * u * (3 - 2 * u);
    const start = this.startRadius ?? shield.radius;
    this.radius = start + (this.maxRadius - start) * ease;
    this.paint();
    if (this.age >= grow + (this.fadeFor || emp.fade)) this.kill();
  }

  kill() {
    this.alive = false;
    this.hit.clear();
    this.view.clear();
    this.view.visible = false;
  }
}
