import { Container, Graphics } from "pixi.js";
import { colors, tunnel as cfg, world as worldConfig } from "../config.js";
import { pick, rand } from "../math.js";
import { strokeGlow, strokeLine } from "../render/textures.js";

function circleHitSeg(cx, cy, r, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((cx - x1) * dx + (cy - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + t * dx;
  const py = y1 + t * dy;
  const ox = cx - px;
  const oy = cy - py;
  const d = Math.hypot(ox, oy);
  if (d >= r) return null;
  if (d < 1e-6) {
    const len = Math.hypot(dx, dy) || 1;
    return { nx: -dy / len, ny: dx / len, depth: r, x: px, y: py };
  }
  return { nx: ox / d, ny: oy / d, depth: r - d, x: px, y: py };
}

function carveMaze(cols, rows) {
  const hWalls = Array.from({ length: rows + 1 }, () => Array(cols).fill(true));
  const vWalls = Array.from({ length: rows }, () => Array(cols + 1).fill(true));
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
  const stack = [[0, 0]];
  seen[0][0] = true;
  const dirs = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const opts = dirs.filter(([dx, dy]) => {
      const nx = cx + dx;
      const ny = cy + dy;
      return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[ny][nx];
    });
    if (!opts.length) {
      stack.pop();
      continue;
    }
    const [dx, dy] = pick(opts);
    const nx = cx + dx;
    const ny = cy + dy;
    if (dx === 1) vWalls[cy][cx + 1] = false;
    else if (dx === -1) vWalls[cy][cx] = false;
    else if (dy === 1) hWalls[cy + 1][cx] = false;
    else hWalls[cy][cx] = false;
    seen[ny][nx] = true;
    stack.push([nx, ny]);
  }
  let extra = Math.max(6, Math.round(cols * rows * 0.06));
  for (let tries = 0; extra > 0 && tries < 80; tries += 1) {
    if (Math.random() < 0.5) {
      const col = 1 + ((Math.random() * (cols - 1)) | 0);
      const row = (Math.random() * rows) | 0;
      if (vWalls[row][col]) {
        vWalls[row][col] = false;
        extra -= 1;
      }
    } else {
      const col = (Math.random() * cols) | 0;
      const row = 1 + ((Math.random() * (rows - 1)) | 0);
      if (hWalls[row][col]) {
        hWalls[row][col] = false;
        extra -= 1;
      }
    }
  }
  return { hWalls, vWalls };
}

function walk(hWalls, vWalls, sx, sy) {
  const rows = vWalls.length;
  const cols = hWalls[0].length;
  const dist = Array.from({ length: rows }, () => Array(cols).fill(-1));
  const q = [[sx, sy]];
  dist[sy][sx] = 0;
  let far = { col: sx, row: sy, d: 0 };
  for (let i = 0; i < q.length; i += 1) {
    const [cx, cy] = q[i];
    const d = dist[cy][cx];
    if (d > far.d) far = { col: cx, row: cy, d };
    if (cy > 0 && !hWalls[cy][cx] && dist[cy - 1][cx] < 0) {
      dist[cy - 1][cx] = d + 1;
      q.push([cx, cy - 1]);
    }
    if (cy < rows - 1 && !hWalls[cy + 1][cx] && dist[cy + 1][cx] < 0) {
      dist[cy + 1][cx] = d + 1;
      q.push([cx, cy + 1]);
    }
    if (cx > 0 && !vWalls[cy][cx] && dist[cy][cx - 1] < 0) {
      dist[cy][cx - 1] = d + 1;
      q.push([cx - 1, cy]);
    }
    if (cx < cols - 1 && !vWalls[cy][cx + 1] && dist[cy][cx + 1] < 0) {
      dist[cy][cx + 1] = d + 1;
      q.push([cx + 1, cy]);
    }
  }
  return { dist, far };
}

export class Tunnel {
  constructor() {
    this.view = new Container();
    this.hull = new Graphics();
    this.wallsG = new Graphics();
    this.marks = new Graphics();
    this.view.addChild(this.hull, this.wallsG, this.marks);
    this.walls = [];
    this.cells = [];
    this.start = { x: 0, y: 0 };
    this.core = { x: 0, y: 0 };
    this.x = worldConfig.width * cfg.ox;
    this.y = worldConfig.height * cfg.oy;
    this.pulse = 0;
    this.build();
  }

  cellAt(col, row) {
    const cell = cfg.cell;
    return {
      x: this.originX + (col + 0.5) * cell,
      y: this.originY + (row + 0.5) * cell,
      col,
      row,
    };
  }

  startPos() {
    return { x: this.start.x, y: this.start.y };
  }

  startHeading() {
    return Math.atan2(this.core.y - this.start.y, this.core.x - this.start.x);
  }

  hunterSpots() {
    const want = cfg.hunters;
    const pool = this.cells.filter((cell) => cell.dist >= 3 && !cell.core);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = (Math.random() * (i + 1)) | 0;
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    return pool.slice(0, want);
  }

  atCore(x, y, pad = 0) {
    return Math.hypot(x - this.core.x, y - this.core.y) < cfg.coreR + pad;
  }

  hitCircle(x, y, r) {
    let best = null;
    for (const wall of this.walls) {
      const hit = circleHitSeg(x, y, r, wall.x1, wall.y1, wall.x2, wall.y2);
      if (!hit) continue;
      if (!best || hit.depth > best.depth) best = hit;
    }
    return best;
  }

  bounce(body, radius) {
    if (!body) return false;
    const r = (radius ?? body.radius ?? 14) + 2;
    let hit = false;
    for (let pass = 0; pass < 3; pass += 1) {
      const col = this.hitCircle(body.x, body.y, r);
      if (!col) break;
      hit = true;
      body.x += col.nx * col.depth;
      body.y += col.ny * col.depth;
      const vn = (body.vx || 0) * col.nx + (body.vy || 0) * col.ny;
      if (vn < 0) {
        body.vx -= 1.65 * vn * col.nx;
        body.vy -= 1.65 * vn * col.ny;
      }
    }
    return hit;
  }

  build() {
    const cols = cfg.cols;
    const rows = cfg.rows;
    const cell = cfg.cell;
    this.originX = this.x - (cols * cell) / 2;
    this.originY = this.y - (rows * cell) / 2;
    const { hWalls, vWalls } = carveMaze(cols, rows);
    const { dist, far } = walk(hWalls, vWalls, 0, 0);
    this.start = this.cellAt(0, 0);
    this.core = this.cellAt(far.col, far.row);
    this.cells = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const at = this.cellAt(col, row);
        this.cells.push({
          ...at,
          dist: dist[row][col],
          core: col === far.col && row === far.row,
        });
      }
    }
    this.walls = [];
    for (let row = 0; row <= rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (!hWalls[row][col]) continue;
        this.walls.push({
          x1: this.originX + col * cell,
          y1: this.originY + row * cell,
          x2: this.originX + (col + 1) * cell,
          y2: this.originY + row * cell,
        });
      }
    }
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col <= cols; col += 1) {
        if (!vWalls[row][col]) continue;
        this.walls.push({
          x1: this.originX + col * cell,
          y1: this.originY + row * cell,
          x2: this.originX + col * cell,
          y2: this.originY + (row + 1) * cell,
        });
      }
    }
    this.draw(hWalls, vWalls);
  }

  draw(hWalls, vWalls) {
    const cols = cfg.cols;
    const rows = cfg.rows;
    const cell = cfg.cell;
    const ox = - (cols * cell) / 2;
    const oy = - (rows * cell) / 2;
    const hw = (cols * cell) / 2 + 160;
    const hh = (rows * cell) / 2 + 160;
    const reach = Math.hypot(hw, hh) + 40;
    const hull = [];
    const count = 28;
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2;
      const u = 0.82 + ((i * 17) % 9) * 0.028 + rand(-0.04, 0.05);
      hull.push(Math.cos(a) * reach * u, Math.sin(a) * reach * u);
    }
    this.hull.clear();
    strokeGlow(this.hull, hull, colors.orange, colors.orangeHot, 2.4);
    const inner = [];
    for (let i = 0; i < count; i += 1) {
      inner.push(hull[i * 2] * 0.92, hull[i * 2 + 1] * 0.92);
    }
    strokeGlow(this.hull, inner, colors.magenta, colors.magentaHot, 1.2);

    this.wallsG.clear();
    const rock = (x1, y1, x2, y2) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const jag = rand(-6, 6);
      const mx = (x1 + x2) * 0.5 + nx * jag;
      const my = (y1 + y2) * 0.5 + ny * jag;
      strokeLine(this.wallsG, [x1, y1, mx, my, x2, y2], colors.orange, colors.orangeHot, 1.55);
    };
    for (let row = 0; row <= rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (!hWalls[row][col]) continue;
        rock(ox + col * cell, oy + row * cell, ox + (col + 1) * cell, oy + row * cell);
      }
    }
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col <= cols; col += 1) {
        if (!vWalls[row][col]) continue;
        rock(ox + col * cell, oy + row * cell, ox + col * cell, oy + (row + 1) * cell);
      }
    }
    this.paintMarks();
  }

  paintMarks() {
    const sx = this.start.x - this.x;
    const sy = this.start.y - this.y;
    const cx = this.core.x - this.x;
    const cy = this.core.y - this.y;
    const beat = 0.82 + Math.sin(this.pulse * 3.2) * 0.18;
    this.marks.clear();
    strokeGlow(this.marks, [
      sx - 22, sy - 16,
      sx + 10, sy - 16,
      sx + 10, sy + 16,
      sx - 22, sy + 16,
    ], colors.cyan, colors.cyanHot, 1.15);
    this.marks.circle(cx, cy, cfg.coreR * beat);
    this.marks.stroke({ width: 4.2, color: colors.cyan, alpha: 0.22 });
    this.marks.circle(cx, cy, cfg.coreR * beat);
    this.marks.stroke({ width: 1.6, color: colors.cyanHot, alpha: 1 });
    this.marks.circle(cx, cy, cfg.coreR * 0.42);
    this.marks.stroke({ width: 1.2, color: colors.white, alpha: 0.9 });
  }

  update(dt) {
    this.pulse += dt;
    this.paintMarks();
  }

  destroy() {
    this.view.destroy({ children: true });
  }
}
