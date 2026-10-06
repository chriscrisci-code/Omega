import { Container, Graphics, RenderTexture, Sprite } from "pixi.js";
import { colors, lockCam as cfg } from "../config.js";

export class LockCam {
  constructor() {
    this.w = cfg.width;
    this.h = cfg.height;
    this.rt = RenderTexture.create({ width: cfg.width, height: cfg.height });
    this.view = new Container();
    this.view.eventMode = "none";
    this.sprite = new Sprite(this.rt);
    this.back = new Graphics();
    this.frame = new Graphics();
    this.view.addChild(this.back, this.sprite, this.frame);
    this.view.visible = false;
    this.target = null;
    this.x = 0;
    this.y = 0;
    this.hold = 0;
  }

  get active() {
    return Boolean(this.target?.alive || this.hold > 0);
  }

  clear() {
    this.target = null;
    this.hold = 0;
    this.view.visible = false;
  }

  follow(body) {
    if (!body) return;
    this.target = body;
    this.x = body.x;
    this.y = body.y;
    this.hold = 0;
  }

  noteDeath(body) {
    if (!body) return;
    if (this.target !== body) return;
    this.x = body.x;
    this.y = body.y;
    this.target = null;
    this.hold = cfg.hold;
  }

  tick(dt) {
    if (this.target?.alive) {
      this.x = this.target.x;
      this.y = this.target.y;
      return;
    }
    this.target = null;
    if (this.hold > 0) this.hold = Math.max(0, this.hold - dt);
  }

  layout(screen, compact) {
    this.w = compact ? cfg.phoneWidth : cfg.width;
    this.h = compact ? cfg.phoneHeight : cfg.height;
    this.sprite.width = this.w;
    this.sprite.height = this.h;
    const left = screen.width * 0.5 - this.w - Math.min(72, screen.width * 0.06);
    const bottom = compact ? 88 : 22;
    this.view.position.set(Math.max(16, left), screen.height - this.h - bottom);
    this.paintFrame();
  }

  paintFrame() {
    const g = this.frame;
    const w = this.w;
    const h = this.h;
    const arm = 18;
    g.clear();
    const box = () => {
      g.rect(1, 1, w - 2, h - 2);
    };
    const corners = () => {
      g.moveTo(0, arm);
      g.lineTo(0, 0);
      g.lineTo(arm, 0);
      g.moveTo(w, arm);
      g.lineTo(w, 0);
      g.lineTo(w - arm, 0);
      g.moveTo(0, h - arm);
      g.lineTo(0, h);
      g.lineTo(arm, h);
      g.moveTo(w, h - arm);
      g.lineTo(w, h);
      g.lineTo(w - arm, h);
    };
    this.back.clear();
    this.back.rect(0, 0, w, h);
    this.back.fill({ color: 0x05060a });
    box();
    g.stroke({ width: 3.2, color: colors.cyan, alpha: 0.2 });
    box();
    g.stroke({ width: 1.15, color: colors.cyanHot, alpha: 0.9 });
    corners();
    g.stroke({ width: 3, color: colors.cyan, alpha: 0.22, cap: "square", join: "miter" });
    corners();
    g.stroke({ width: 1.15, color: colors.cyanHot, cap: "square", join: "miter" });
  }

  fitZoom(radius) {
    const span = Math.max(48, (radius || 16) * 3.8);
    return Math.max(0.55, Math.min(3.4, Math.min(this.w, this.h) / span));
  }

  render(renderer, world, { screen, compact, placedX, placedY, radius, hide, scales }) {
    if (!this.active) {
      this.view.visible = false;
      return;
    }
    this.view.visible = true;
    this.layout(screen, compact);

    const saved = {
      x: world.position.x,
      y: world.position.y,
      rot: world.rotation,
      sx: world.scale.x,
      sy: world.scale.y,
      px: world.pivot.x,
      py: world.pivot.y,
      filters: world.filters,
    };
    const hidden = (hide || []).map((node) => ({ node, vis: node.visible }));
    const scaled = (scales || []).map((item) => ({ view: item.view, x: item.view.scale.x, y: item.view.scale.y }));

    for (const row of hidden) row.node.visible = false;
    for (const row of scaled) row.view.scale.set(1);

    world.filters = null;
    world.pivot.set(placedX, placedY);
    world.position.set(this.w * 0.5, this.h * 0.5);
    world.rotation = 0;
    world.scale.set(this.fitZoom(radius));
    try {
      renderer.render({ container: world, target: this.rt, clear: true });
    } finally {
      world.filters = saved.filters;
      world.pivot.set(saved.px, saved.py);
      world.position.set(saved.x, saved.y);
      world.rotation = saved.rot;
      world.scale.set(saved.sx, saved.sy);
      for (const row of hidden) row.node.visible = row.vis;
      for (const row of scaled) row.view.scale.set(row.x, row.y);
    }
  }
}
