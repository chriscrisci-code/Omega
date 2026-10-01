import { Container, Graphics } from "pixi.js";
import { colors, rocks } from "../config.js";
import { rand, wrap } from "../math.js";
import { strokeGlow } from "../render/textures.js";

export class Asteroid {
  constructor(x, y, size, color) {
    this.size = size;
    this.radius = rocks.radii[size];
    this.hp = rocks.hits[size];
    this.color = color;
    this.x = x;
    this.y = y;
    this.rotation = rand(0, Math.PI * 2);
    this.spin = rand(-1.2, 1.2);
    this.vx = Math.cos(this.rotation) * rand(28, 78 + (4 - size) * 18);
    this.vy = Math.sin(this.rotation) * rand(28, 78 + (4 - size) * 18);

    this.view = new Container();
    this.g = new Graphics();
    this.view.addChild(this.g);
    this.points = [];
    this.hotColor = this.color === colors.magenta ? 0xffb3d6 : 0xffe0b0;
    this.draw();
    this.sync();
  }

  draw() {
    const count = 8 + ((Math.random() * 5) | 0);
    this.points = [];
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2;
      const r = this.radius * rand(0.68, 1.12);
      this.points.push(Math.cos(a) * r, Math.sin(a) * r);
    }
    this.g.clear();
    strokeGlow(this.g, this.points, this.color, this.hotColor, 1.5);
  }

  sync() {
    this.view.position.set(this.x, this.y);
    this.view.rotation = this.rotation;
  }

  update(dt, bounds) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.spin * dt;
    wrap(this, bounds.width, bounds.height);
    this.sync();
  }

  kick(nx, ny, amount) {
    this.vx += nx * amount;
    this.vy += ny * amount;
  }

  destroy() {
    this.view.destroy({ children: true });
  }
}
