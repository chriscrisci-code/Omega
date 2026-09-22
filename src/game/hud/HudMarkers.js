import { Container, Graphics } from "pixi.js";
import { hudFilters } from "../config.js";
import { wrapDelta } from "../math.js";
import { drawVectorText } from "./vectorText.js";

function formatRange(dist) {
  if (dist >= 1000) return `${(dist / 1000).toFixed(1)}k`;
  return `${Math.round(dist)}`;
}

function rangeT(kind, dist, viewRadius) {
  const near = viewRadius * 1.2;
  const far = kind === "enemy" ? viewRadius * 3.5 : kind === "raider" ? viewRadius * 6 : kind === "destroyer" ? viewRadius * 4.2 : viewRadius * 5;
  return Math.min(1, Math.max(0, (dist - near) / Math.max(1, far - near)));
}

function rangeAlpha(kind, t) {
  const floor = kind === "hub" ? 0.5 : kind === "raider" ? 0.48 : kind === "destroyer" ? 0.4 : kind === "enemy" ? 0.28 : 0.35;
  return 1 - t * (1 - floor);
}

function pinToEdge(x, y, halfW, halfH) {
  const ax = Math.abs(x) / halfW;
  const ay = Math.abs(y) / halfH;
  const scale = Math.max(ax, ay, 1);
  return { x: x / scale, y: y / scale };
}

/** Heading-up forward wedge at the top of the screen. */
function inTopCone(sx, sy) {
  if (sy >= 0) return false;
  return Math.abs(Math.atan2(sx, -sy)) <= 0.62;
}

function chevron(g, x, color, alpha) {
  g.moveTo(x + 16.5, 0);
  g.lineTo(x - 6, 15);
  g.lineTo(x, 0);
  g.lineTo(x - 6, -15);
  g.closePath();
  g.stroke({ width: 2.4, color, alpha, join: "round" });
}

function drawGlyph(g, kind, color, hot, extras = {}) {
  g.clear();
  if (kind === "hub") {
    g.circle(-5, 0, 7);
    g.stroke({ width: 1.4, color });
    g.circle(-5, 0, 3.5);
    g.stroke({ width: 1.2, color: hot });
    g.rect(-6.5, -1.4, 3, 2.8);
    g.stroke({ width: 1, color: hot });
    if (extras.alert) {
      const beat = Math.floor((extras.time ?? 0) * 7) % 4;
      const lit = extras.close ? 0xffc266 : hot;
      for (let i = 0; i < 3; i += 1) {
        chevron(g, 18 + i * 21, lit, beat === i ? 1 : 0.18);
      }
    } else {
      g.moveTo(12, 0);
      g.lineTo(3, 6);
      g.lineTo(3, -6);
      g.closePath();
      g.stroke({ width: 1.6, color: hot, join: "round" });
    }
    return;
  }

  if (kind === "raider") {
    g.moveTo(11, 0);
    g.lineTo(-1, 6);
    g.lineTo(2, 0);
    g.lineTo(-1, -6);
    g.closePath();
    g.stroke({ width: 1.4, color: hot, join: "round" });
    g.moveTo(3, 0);
    g.lineTo(-9, 5);
    g.lineTo(-6, 0);
    g.lineTo(-9, -5);
    g.closePath();
    g.stroke({ width: 1.15, color, join: "round" });
    return;
  }

  if (kind === "destroyer") {
    g.rect(-4, -4, 12, 8);
    g.stroke({ width: 1.25, color: hot });
    g.rect(-12, -4, 8, 8);
    g.stroke({ width: 1.15, color: hot });
    g.moveTo(8, -4);
    g.lineTo(13, -2);
    g.lineTo(13, 2);
    g.lineTo(8, 4);
    g.closePath();
    g.stroke({ width: 1.1, color: hot, join: "round" });
    g.circle(4, 0, 1.2);
    g.stroke({ width: 0.9, color });
    g.circle(-8, 0, 1.2);
    g.stroke({ width: 0.9, color });
    return;
  }

  if (kind === "enemy") {
    g.moveTo(9, 0);
    g.lineTo(-6, 5);
    g.lineTo(-3, 0);
    g.lineTo(-6, -5);
    g.closePath();
    g.stroke({ width: 1.2, color: hot, join: "round" });
    return;
  }

  g.moveTo(10, 0);
  g.lineTo(2, 5);
  g.lineTo(2, -5);
  g.closePath();
  g.stroke({ width: 1.4, color: hot, join: "round" });
  g.circle(-4, 0, 5);
  g.stroke({ width: 1.1, color });
}

function drawRunway(g, color, hot, extras = {}) {
  g.clear();
  const beat = Math.floor((extras.time ?? 0) * 7) % 4;
  const lit = extras.close ? 0xffc266 : hot;
  for (let i = 0; i < 3; i += 1) {
    chevron(g, i * 21, lit, beat === i ? 1 : 0.18);
  }
  g.moveTo(-18, 0);
  g.lineTo(-8, 0);
  g.stroke({ width: 1.2, color, alpha: 0.55, cap: "round" });
}

export class HudMarkers {
  constructor() {
    this.view = new Container();
    this.pips = [];
    this.filters = { ...hudFilters };
    this.lock = new Container();
    this.lockMark = new Graphics();
    this.lock.addChild(this.lockMark);
    this.lock.visible = false;
    this.view.addChild(this.lock);
  }

  setFilter(kind, on) {
    this.filters[kind] = Boolean(on);
  }

  ensure(count) {
    while (this.pips.length < count) {
      const mark = new Graphics();
      const label = new Graphics();
      const node = new Container();
      node.addChild(mark, label);
      this.view.addChild(node);
      this.pips.push({ node, mark, label });
    }
    for (let i = count; i < this.pips.length; i += 1) this.pips[i].node.visible = false;
  }

  update(targets, origin, camRot, screen, zoom, world, viewRadius, extras = {}) {
    const visible = targets.filter((target) => this.filters[target.kind] !== false);
    this.ensure(visible.length);

    const pad = extras.hubAlert ? 92 : 34;
    const halfW = screen.width * 0.5 - pad;
    const halfH = screen.height * 0.5 - pad;
    const cos = Math.cos(camRot);
    const sin = Math.sin(camRot);

    let coneBest = -1;
    let coneBestDist = Infinity;
    const placed = visible.map((target, i) => {
      const dx = wrapDelta(target.x - origin.x, world.width);
      const dy = wrapDelta(target.y - origin.y, world.height);
      const sx = (dx * cos - dy * sin) * zoom;
      const sy = (dx * sin + dy * cos) * zoom;
      const dist = Math.hypot(dx, dy);
      const onScreen =
        target.kind === "hub"
          ? Math.hypot(sx, sy) < 120
          : Math.abs(sx) < halfW && Math.abs(sy) < halfH;
      const cone = !onScreen && inTopCone(sx, sy);
      if (cone && dist < coneBestDist) {
        coneBest = i;
        coneBestDist = dist;
      }
      return { target, dx, dy, sx, sy, dist, onScreen, cone };
    });

    placed.forEach((item, i) => {
      const pip = this.pips[i];
      pip.node.visible = !item.onScreen;
      if (item.onScreen) {
        pip.node.alpha = 1;
        pip.node.scale.set(1);
        pip.label.clear();
        return;
      }

      const { target, sx, sy, dist } = item;
      const fade = rangeT(target.kind, dist, viewRadius);
      const range = formatRange(dist);
      const pinned = pinToEdge(sx, sy, halfW, halfH);
      pip.node.position.set(screen.width * 0.5 + pinned.x, screen.height * 0.5 + pinned.y);
      pip.node.rotation = Math.atan2(sy, sx);
      const alert = target.kind === "hub" && extras.hubAlert;
      pip.node.scale.set(alert ? 1.08 : 1 - fade * 0.3);
      pip.node.alpha = alert ? 1 : rangeAlpha(target.kind, fade);
      drawGlyph(pip.mark, target.kind, target.color, target.hotColor, {
        alert,
        close: extras.hubClose,
        time: extras.time,
      });
      const tint = alert && extras.hubClose ? 0xffc266 : target.hotColor;
      const glow = alert && extras.hubClose ? 0xff9a3c : target.color;
      pip.label.clear();
      const showLabel = item.cone ? i === coneBest : true;
      if (!showLabel) return;
      pip.label.rotation = -pip.node.rotation;
      drawVectorText(pip.label, target.name ? `${target.name}  ${range}` : range, 0, 14, 9, glow, tint, "center");
    });

    this.updateLock(extras.lock, origin, camRot, screen, zoom, world, extras);
  }

  updateLock(target, origin, camRot, screen, zoom, world, extras = {}) {
    if (!target?.alive || extras.mapping) {
      this.lock.visible = false;
      return;
    }
    const dx = wrapDelta(target.x - origin.x, world.width);
    const dy = wrapDelta(target.y - origin.y, world.height);
    const cos = Math.cos(camRot);
    const sin = Math.sin(camRot);
    const sx = (dx * cos - dy * sin) * zoom;
    const sy = (dx * sin + dy * cos) * zoom;
    if (sx * sx + sy * sy < 16) {
      this.lock.visible = false;
      return;
    }
    const halfW = screen.width * 0.5 - 34;
    const halfH = screen.height * 0.5 - 34;
    const edge = pinToEdge(sx, sy, halfW, halfH);
    this.lock.visible = true;
    this.lock.position.set(screen.width * 0.5 + edge.x * 0.5, screen.height * 0.5 + edge.y * 0.5);
    this.lock.rotation = Math.atan2(sy, sx);
    this.lock.alpha = 1;
    this.lock.scale.set(1);
    drawRunway(this.lockMark, target.color, target.hotColor, {
      time: extras.time,
      close: extras.lockClose,
    });
    this.view.addChild(this.lock);
  }
}
