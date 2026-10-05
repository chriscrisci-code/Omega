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
    const jiggle = 0.68 + hash(seed + i * 19) * 0.52;
    pts.push(cx + Math.cos(a) * rx * jiggle, cy + Math.sin(a) * ry * jiggle);
  }
  return pts;
}

function strokeVeil(g, pts, closed, color, hot) {
  const draw = () => {
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    if (closed) g.closePath();
  };
  draw();
  g.stroke({ width: 22, color, alpha: cfg.veilGlow, cap: "round", join: "round" });
  draw();
  g.stroke({ width: 1.35, color: hot, alpha: cfg.veilAlpha, cap: "round", join: "round" });
}

const VEILS = [
  { seed: 11, x: -2100, y: -900, rx: 820, ry: 420, turn: 0.4, n: 11, closed: true, color: colors.cyan, hot: colors.cyanHot },
  { seed: 23, x: 1600, y: -1500, rx: 640, ry: 780, turn: 1.1, n: 9, closed: true, color: colors.magenta, hot: colors.magentaHot },
  { seed: 31, x: 900, y: 1700, rx: 980, ry: 360, turn: 2.4, n: 13, closed: false, color: colors.cyan, hot: colors.cyanHot },
  { seed: 47, x: -1400, y: 1400, rx: 520, ry: 690, turn: 0.7, n: 10, closed: true, color: colors.magenta, hot: colors.magentaHot },
  { seed: 59, x: 40, y: -80, rx: 1100, ry: 280, turn: 2.9, n: 12, closed: false, color: colors.cyan, hot: colors.white },
  { seed: 67, x: 2400, y: 800, rx: 460, ry: 540, turn: 1.6, n: 8, closed: true, color: colors.cyan, hot: colors.cyanHot },
  { seed: 73, x: -2500, y: 400, rx: 700, ry: 320, turn: 5.1, n: 11, closed: false, color: colors.magenta, hot: colors.magentaHot },
  { seed: 89, x: 400, y: 2600, rx: 580, ry: 410, turn: 3.3, n: 9, closed: true, color: colors.cyan, hot: colors.cyanHot },
];

export class FarNebula {
  constructor() {
    this.view = new Container();
    this.marks = new Graphics();
    this.view.addChild(this.marks);
    this.paint();
  }

  paint() {
    const g = this.marks;
    g.clear();
    for (const veil of VEILS) {
      const pts = veilPts(veil.seed, veil.x, veil.y, veil.rx, veil.ry, veil.turn, veil.n);
      strokeVeil(g, pts, veil.closed, veil.color, veil.hot);
    }
    const size = cfg.starSize;
    const drawStars = () => {
      for (let i = 0; i < 48; i += 1) {
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
