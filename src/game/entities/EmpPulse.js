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
  }

  fire(x, y, maxRadius) {
    this.alive = true;
    this.x = x;
    this.y = y;
    this.radius = shield.radius;
    this.maxRadius = Math.max(maxRadius, shield.radius * 2);
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
    const u = Math.min(1, this.age / emp.grow);
    const fade = this.age <= emp.grow ? 1 : Math.max(0, 1 - (this.age - emp.grow) / emp.fade);
    strokeGlow(this.view, octagon(this.radius, this.spin), colors.cyan, colors.cyanHot, 1.35 + u * 1.4);
    strokeGlow(this.view, octagon(this.radius * 0.72, -this.spin * 0.6), colors.cyan, colors.white, 0.9);
    this.view.alpha = 0.28 + fade * 0.72;
  }

  update(dt, follow) {
    if (!this.alive) return;
    this.x = follow.x;
    this.y = follow.y;
    this.age += dt;
    this.spin += 2.2 * dt;
    const u = Math.min(1, this.age / emp.grow);
    const ease = u * u * (3 - 2 * u);
    this.radius = shield.radius + (this.maxRadius - shield.radius) * ease;
    this.paint();
    if (this.age >= emp.grow + emp.fade) this.kill();
  }

  kill() {
    this.alive = false;
    this.hit.clear();
    this.view.clear();
    this.view.visible = false;
  }
}
