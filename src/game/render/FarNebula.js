import { Container, Graphics } from "pixi.js";
import { colors, farNebula as cfg } from "../config.js";

function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function veilPts(seed, cx, cy, rx, ry, turn, count) {
  const pts = [];
  for (let i = 0; i < count; i += 1) {
    const a = turn + (i / count) * Math.PI * 2;
    const jiggle = 0.62 + hash(seed + i * 19) * 0.62;
    pts.push(cx + Math.cos(a) * rx * jiggle, cy + Math.sin(a) * ry * jiggle);
  }
  return pts;
}

function arcPts(seed, cx, cy, rx, ry, turn, span, count) {
  const pts = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const a = turn + t * span;
    const jiggle = 0.78 + hash(seed + i * 11) * 0.4;
    pts.push(cx + Math.cos(a) * rx * jiggle, cy + Math.sin(a) * ry * jiggle);
  }
  return pts;
}

function strokePoly(g, pts, closed, color, hot, fat) {
  const draw = () => {
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    if (closed) g.closePath();
  };
  draw();
  g.stroke({ width: fat, color, alpha: cfg.veilGlow, cap: "round", join: "round" });
  draw();
  g.stroke({ width: 1.2, color: hot, alpha: cfg.veilAlpha, cap: "round", join: "round" });
}

const CLOUDS = [
  { seed: 11, x: -1800, y: -700, rx: 920, ry: 560, turn: 0.35, color: colors.cyan, hot: colors.cyanHot },
  { seed: 23, x: 1500, y: -1300, rx: 780, ry: 900, turn: 1.2, color: colors.magenta, hot: colors.magentaHot },
  { seed: 41, x: 200, y: 1600, rx: 1100, ry: 480, turn: 2.5, color: colors.cyan, hot: colors.cyanHot },
  { seed: 53, x: -1600, y: 1500, rx: 640, ry: 820, turn: 0.8, color: colors.magenta, hot: colors.magentaHot },
  { seed: 71, x: 2200, y: 700, rx: 700, ry: 520, turn: 4.1, color: colors.cyan, hot: colors.white },
];

export class FarNebula {
  constructor() {
    this.view = new Container();
    this.marks = new Graphics();
    this.view.addChild(this.marks);
    this.paint();
  }

  paintCloud(g, cloud) {
    const shells = [1, 0.78, 0.56, 0.34];
    shells.forEach((scale, i) => {
      const n = 10 + i;
      const pts = veilPts(cloud.seed + i * 7, cloud.x, cloud.y, cloud.rx * scale, cloud.ry * scale, cloud.turn + i * 0.18, n);
      strokePoly(g, pts, true, cloud.color, cloud.hot, 28 - i * 4);
    });
    for (let k = 0; k < 5; k += 1) {
      const twist = cloud.turn + hash(cloud.seed + k * 31) * Math.PI * 2;
      const reach = 0.55 + hash(cloud.seed + k * 17) * 0.7;
      const span = 0.7 + hash(cloud.seed + k * 43) * 1.4;
      const pts = arcPts(
        cloud.seed + 200 + k,
        cloud.x + Math.cos(twist) * cloud.rx * 0.12,
        cloud.y + Math.sin(twist) * cloud.ry * 0.12,
        cloud.rx * reach,
        cloud.ry * reach * (0.55 + hash(cloud.seed + k) * 0.5),
        twist,
        span,
        8,
      );
      strokePoly(g, pts, false, cloud.color, k % 2 ? colors.white : cloud.hot, 16);
    }
  }

  paint() {
    const g = this.marks;
    g.clear();
    for (const cloud of CLOUDS) this.paintCloud(g, cloud);
    const size = cfg.starSize;
    const drawStars = () => {
      for (let i = 0; i < 64; i += 1) {
        const x = (hash(i * 13.7) - 0.5) * 7200;
        const y = (hash(i * 29.3) - 0.5) * 7200;
        g.moveTo(x - size, y);
        g.lineTo(x + size, y);
        g.moveTo(x, y - size);
        g.lineTo(x, y + size);
      }
    };
    drawStars();
    g.stroke({ width: 2.2, color: colors.cyan, alpha: cfg.starGlow, cap: "round" });
    drawStars();
    g.stroke({ width: 0.9, color: colors.white, alpha: cfg.starAlpha, cap: "round" });
  }

  sync(camX, camY, visible) {
    this.view.visible = visible;
    if (!visible) return;
    const { spacing, factor } = cfg;
    const ox = ((camX * factor) % spacing + spacing) % spacing;
    const oy = ((camY * factor) % spacing + spacing) % spacing;
    this.view.position.set(camX - ox, camY - oy);
  }
}
