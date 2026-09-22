import { Container, Graphics } from "pixi.js";
import { colors, missiles } from "../config.js";
import { turnToward, wrap, wrapDelta } from "../math.js";

const BODY = [7, 0, -4.5, 2.3, -3, 0, -4.5, -2.3];

export class Missile {
  constructor() {
    this.view = new Container();
    this.trailG = new Graphics();
    this.body = new Graphics();
    this.view.addChild(this.trailG, this.body);
    this.radius = missiles.radius;
    this.alive = false;
    this.target = null;
    this.angle = 0;
    this.clock = 0;
    this.points = [];
    this.star = false;
    this.tint = colors.orange;
    this.tintHot = colors.amber;
    this.view.visible = false;
  }

  toLocal(x, y, worldW, worldH) {
    return {
      x: wrapDelta(x - this.x, worldW),
      y: wrapDelta(y - this.y, worldH),
    };
  }

  paintTrail(space) {
    this.trailG.clear();
    if (this.points.length < 2 || !space) return;
    const fadeFor = (point) => Math.max(0, 1 - (this.clock - point.t) / missiles.trailFade);
    for (let i = 1; i < this.points.length; i += 1) {
      const fade = fadeFor(this.points[i]);
      if (fade <= 0) continue;
      const a = this.toLocal(this.points[i - 1].x, this.points[i - 1].y, space.width, space.height);
      const b = this.toLocal(this.points[i].x, this.points[i].y, space.width, space.height);
      const alpha = missiles.trailAlpha * fade * (this.star ? 0.7 : 1);
      const glow = this.tint ?? colors.orange;
      const hot = this.tintHot ?? colors.amber;
      this.trailG.moveTo(a.x, a.y);
      this.trailG.lineTo(b.x, b.y);
      this.trailG.stroke({ width: this.star ? 6.4 : 5.2, color: glow, alpha: alpha * 0.45, cap: "round" });
      this.trailG.moveTo(a.x, a.y);
      this.trailG.lineTo(b.x, b.y);
      this.trailG.stroke({ width: this.star ? 1.6 : 1.35, color: hot, alpha, cap: "round" });
    }
  }

  paintBody() {
    this.body.clear();
    if (this.star) {
      const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(this.clock * 17));
      const flicker = 0.72 + Math.random() * 0.28;
      const r = 7.8 * flicker;
      const inner = 2.5 * flicker;
      const pts = [];
      for (let i = 0; i < 16; i += 1) {
        const a = this.clock * 1.6 + (i / 16) * Math.PI * 2;
        const rad = i % 2 === 0 ? r : inner;
        pts.push(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      this.body.poly(pts, true);
      this.body.stroke({ width: 6.2, color: this.tint, alpha: 0.16 * pulse, join: "round" });
      this.body.poly(pts, true);
      this.body.stroke({ width: 2.6, color: this.tint, alpha: 0.55 * pulse, join: "round" });
      this.body.poly(pts, true);
      this.body.stroke({ width: 1.05, color: this.tintHot, alpha: 0.95, join: "round" });
      this.body.circle(0, 0, 1.7 * flicker);
      this.body.fill({ color: colors.white, alpha: 0.4 + pulse * 0.45 });
      return;
    }
    this.body.poly(BODY, true);
    this.body.stroke({ width: 2.6, color: colors.orange, alpha: 0.32, join: "round" });
    this.body.poly(BODY, true);
    this.body.stroke({ width: 1.1, color: colors.amber, join: "round" });
    this.body.moveTo(-3.2, 0);
    this.body.lineTo(-7 - Math.random() * 2.5, 0);
    this.body.stroke({ width: 1.3, color: colors.white, alpha: 0.9, cap: "round" });
  }

  fire(x, y, angle, target = null, options = {}) {
    this.alive = true;
    this.star = Boolean(options.star);
    this.tint = options.color ?? colors.orange;
    this.tintHot = options.hot ?? colors.amber;
    this.speed0 = options.speed ?? missiles.speed;
    this.topSpeed = options.topSpeed ?? missiles.topSpeed;
    this.turnRate = options.turn ?? missiles.turn;
    this.rampTime = options.ramp ?? missiles.ramp;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = this.speed0;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.target = target;
    this.life = options.life ?? missiles.life;
    this.clock = 0;
    this.radius = this.star ? (options.radius ?? 7) : missiles.radius;
    this.points = [{ x, y, t: 0 }];
    this.view.visible = true;
    this.view.alpha = 1;
    this.body.visible = true;
    this.body.rotation = this.star ? 0 : angle;
    this.paintBody();
    this.trailG.clear();
    this.view.position.set(x, y);
  }

  update(dt, space) {
    if (!this.alive && !this.points.length) return;
    this.clock += dt;

    if (this.alive) {
      this.life -= dt;
      if (this.life <= 0) {
        this.kill();
      } else {
        if (this.target && !this.target.alive) this.target = null;
        if (this.target) {
          const dx = wrapDelta(this.target.x - this.x, space.width);
          const dy = wrapDelta(this.target.y - this.y, space.height);
          this.angle = turnToward(this.angle, Math.atan2(dy, dx), (this.turnRate ?? missiles.turn) * dt);
        }
        const u = Math.min(1, this.clock / (this.rampTime ?? missiles.ramp));
        const base = this.speed0 ?? missiles.speed;
        const top = this.topSpeed ?? missiles.topSpeed;
        this.speed = base + (top - base) * u * u;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        wrap(this, space.width, space.height);
        const last = this.points[this.points.length - 1];
        const gap = Math.hypot(wrapDelta(this.x - last.x, space.width), wrapDelta(this.y - last.y, space.height));
        if (gap >= missiles.trailGap) this.points.push({ x: this.x, y: this.y, t: this.clock });
        this.body.rotation = this.star ? 0 : this.angle;
        this.body.alpha = this.life < 0.35 ? this.life / 0.35 : 1;
        this.paintBody();
      }
    }

    this.points = this.points.filter((point) => this.clock - point.t < missiles.trailFade);
    this.paintTrail(space);
    this.view.visible = this.alive || this.points.length > 0;
  }

  kill(hard = false) {
    this.alive = false;
    this.target = null;
    this.body.visible = false;
    this.body.clear();
    if (hard) {
      this.points.length = 0;
      this.trailG.clear();
      this.view.visible = false;
    }
  }
}
