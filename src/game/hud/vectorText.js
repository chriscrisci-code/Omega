/** 5x7 stroke glyphs. Each stroke is a polyline of [x, y] points. */

const FONT = {
  " ": [],
  "0": [[[1, 0], [4, 0], [5, 1], [5, 6], [4, 7], [1, 7], [0, 6], [0, 1], [1, 0]], [[1, 6], [4, 1]]],
  "1": [[[1, 1], [2.5, 0], [2.5, 7]], [[1, 7], [4, 7]]],
  "2": [[[0, 1], [1, 0], [4, 0], [5, 1], [5, 2], [0, 6], [0, 7], [5, 7]]],
  "3": [[[0, 0], [5, 0], [2.2, 3.2], [4, 3.2], [5, 4.2], [5, 6], [4, 7], [1, 7], [0, 6]]],
  "4": [[[4, 7], [4, 0]], [[4, 0], [0, 5], [5.2, 5]]],
  "5": [[[5, 0], [0, 0], [0, 3], [4, 3], [5, 4], [5, 6], [4, 7], [1, 7], [0, 6]]],
  "6": [[[4.5, 0], [1, 0], [0, 1], [0, 6], [1, 7], [4, 7], [5, 6], [5, 4], [4, 3], [0, 3]]],
  "7": [[[0, 0], [5, 0], [2, 7]]],
  "8": [[[1, 0], [4, 0], [5, 1], [5, 2.5], [4, 3.5], [1, 3.5], [0, 2.5], [0, 1], [1, 0]], [[1, 3.5], [4, 3.5], [5, 4.5], [5, 6], [4, 7], [1, 7], [0, 6], [0, 4.5], [1, 3.5]]],
  "9": [[[0.5, 7], [4, 7], [5, 6], [5, 1], [4, 0], [1, 0], [0, 1], [0, 3], [1, 4], [5, 4]]],
  A: [[[0, 7], [2.5, 0], [5, 7]], [[1, 4.5], [4, 4.5]]],
  B: [[[0, 0], [0, 7], [3.6, 7], [5, 6], [5, 4.4], [3.6, 3.5], [0, 3.5]], [[0, 3.5], [3.6, 3.5], [5, 2.6], [5, 1], [3.6, 0], [0, 0]]],
  C: [[[5, 1], [4, 0], [1, 0], [0, 1], [0, 6], [1, 7], [4, 7], [5, 6]]],
  D: [[[0, 0], [0, 7], [3.4, 7], [5, 5.5], [5, 1.5], [3.4, 0], [0, 0]]],
  E: [[[5, 0], [0, 0], [0, 7], [5, 7]], [[0, 3.5], [3.6, 3.5]]],
  F: [[[5, 0], [0, 0], [0, 7]], [[0, 3.5], [3.6, 3.5]]],
  G: [[[5, 1], [4, 0], [1, 0], [0, 1], [0, 6], [1, 7], [4, 7], [5, 6], [5, 3.8], [2.6, 3.8]]],
  H: [[[0, 0], [0, 7]], [[5, 0], [5, 7]], [[0, 3.5], [5, 3.5]]],
  I: [[[1, 0], [4, 0]], [[2.5, 0], [2.5, 7]], [[1, 7], [4, 7]]],
  J: [[[3, 0], [5, 0], [5, 6], [4, 7], [1, 7], [0, 6]]],
  K: [[[0, 0], [0, 7]], [[5, 0], [0, 3.6], [5, 7]]],
  L: [[[0, 0], [0, 7], [5, 7]]],
  M: [[[0, 7], [0, 0], [2.5, 4], [5, 0], [5, 7]]],
  N: [[[0, 7], [0, 0], [5, 7], [5, 0]]],
  O: [[[1, 0], [4, 0], [5, 1], [5, 6], [4, 7], [1, 7], [0, 6], [0, 1], [1, 0]]],
  P: [[[0, 7], [0, 0], [4, 0], [5, 1], [5, 3], [4, 4], [0, 4]]],
  Q: [[[1, 0], [4, 0], [5, 1], [5, 6], [4, 7], [1, 7], [0, 6], [0, 1], [1, 0]], [[3, 5], [5, 7]]],
  R: [[[0, 7], [0, 0], [4, 0], [5, 1], [5, 3], [4, 4], [0, 4]], [[2.4, 4], [5, 7]]],
  S: [[[5, 1], [4, 0], [1, 0], [0, 1], [0, 2.6], [1, 3.5], [4, 3.5], [5, 4.4], [5, 6], [4, 7], [1, 7], [0, 6]]],
  T: [[[0, 0], [5, 0]], [[2.5, 0], [2.5, 7]]],
  U: [[[0, 0], [0, 6], [1, 7], [4, 7], [5, 6], [5, 0]]],
  V: [[[0, 0], [2.5, 7], [5, 0]]],
  W: [[[0, 0], [1, 7], [2.5, 3], [4, 7], [5, 0]]],
  X: [[[0, 0], [5, 7]], [[5, 0], [0, 7]]],
  Y: [[[0, 0], [2.5, 3.6], [5, 0]], [[2.5, 3.6], [2.5, 7]]],
  Z: [[[0, 0], [5, 0], [0, 7], [5, 7]]],
  ".": [[[2.2, 6.2], [2.8, 6.2], [2.8, 6.8], [2.2, 6.8], [2.2, 6.2]]],
  "-": [[[1, 3.5], [4, 3.5]]],
  "/": [[[4.5, 0], [0.5, 7]]],
  ":": [[[2.2, 1.4], [2.8, 1.4], [2.8, 2], [2.2, 2], [2.2, 1.4]], [[2.2, 5], [2.8, 5], [2.8, 5.6], [2.2, 5.6], [2.2, 5]]],
  "'": [[[2.6, 0], [2.6, 2]]],
  "+": [[[2.5, 1.4], [2.5, 5.6]], [[0.8, 3.5], [4.2, 3.5]]],
  "·": [[[2.1, 3.1], [2.9, 3.1], [2.9, 3.9], [2.1, 3.9], [2.1, 3.1]]],
};

const UNIT = 7;
const STEP = 6.2;

function normalize(text) {
  return String(text ?? "")
    .toUpperCase()
    .replaceAll("·", "·")
    .replaceAll("▲", "A");
}

export function measureVectorText(text, size) {
  const scale = size / UNIT;
  return { width: Math.max(1, normalize(text).length * STEP * scale), height: size };
}

function hex(color) {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function strokesFor(text, size) {
  const scale = size / UNIT;
  const source = normalize(text);
  const strokes = [];
  let x = 0;
  for (const ch of source) {
    const glyph = FONT[ch] ?? FONT["-"];
    for (const line of glyph) {
      strokes.push(line.map(([px, py]) => [x + px * scale, py * scale]));
    }
    x += STEP * scale;
  }
  return { strokes, width: x, height: size };
}

export function drawVectorText(graphics, text, x, y, size, color, hot, align = "left") {
  const { strokes, width } = strokesFor(text, size);
  const ox = align === "center" ? x - width * 0.5 : align === "right" ? x - width : x;
  const widthScale = Math.max(0.7, size / 14);
  for (const line of strokes) {
    if (line.length < 2) continue;
    graphics.moveTo(ox + line[0][0], y + line[0][1]);
    for (let i = 1; i < line.length; i += 1) graphics.lineTo(ox + line[i][0], y + line[i][1]);
    graphics.stroke({ width: 2.6 * widthScale, color, alpha: 0.22, cap: "round", join: "round" });
    graphics.moveTo(ox + line[0][0], y + line[0][1]);
    for (let i = 1; i < line.length; i += 1) graphics.lineTo(ox + line[i][0], y + line[i][1]);
    graphics.stroke({ width: 1.05 * widthScale, color: hot, alpha: 1, cap: "round", join: "round" });
  }
  return width;
}

function pathFrom(line) {
  return line.map((point, i) => `${i === 0 ? "M" : "L"}${point[0].toFixed(2)} ${point[1].toFixed(2)}`).join(" ");
}

export function vectorTextSvg(text, size, color = "#66e0ff", hot = "#c8f8ff", align = "left") {
  const { strokes, width, height } = strokesFor(text, size);
  const pad = 6;
  const sw = Math.max(0.8, size / 16);
  const paths = strokes.filter((line) => line.length > 1).map((line) => pathFrom(line));
  const d = paths.join(" ");
  const justify = align === "center" ? "margin:0 auto;" : align === "right" ? "margin-left:auto;" : "";
  return `<svg class="vector-text" width="${(width + pad * 2).toFixed(1)}" height="${(height + pad * 2).toFixed(1)}" viewBox="${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}" aria-label="${normalize(text)}" style="${justify}"><path class="vector-glow" d="${d}" stroke="${color}" stroke-width="${(sw * 3.1).toFixed(2)}"/><path class="vector-core" d="${d}" stroke="${hot}" stroke-width="${sw.toFixed(2)}"/></svg>`;
}

const DISPLAY = {
  " ": [],
  4: [[[6.2, 10], [6.2, 0]], [[6.2, 0], [0.4, 7], [8, 7]]],
  8: [
    [[2.2, 0], [5.8, 0], [7.6, 1.5], [7.6, 3.4], [5.8, 5], [2.2, 5], [0.4, 3.4], [0.4, 1.5], [2.2, 0]],
    [[2.2, 5], [5.8, 5], [7.6, 6.6], [7.6, 8.5], [5.8, 10], [2.2, 10], [0.4, 8.5], [0.4, 6.6], [2.2, 5]],
  ],
  A: [[[0, 10], [4, 0], [8, 10]], [[1.7, 6.3], [6.3, 6.3]]],
  C: [[[7.4, 2], [5.4, 0], [2.6, 0], [0.4, 2], [0.4, 8], [2.6, 10], [5.4, 10], [7.4, 8]]],
  E: [[[7.6, 0], [0.4, 0], [0.4, 10], [7.6, 10]], [[0.4, 5], [5.6, 5]]],
  F: [[[7.6, 0], [0.4, 0], [0.4, 10]], [[0.4, 5], [5.4, 5]]],
  H: [[[0.4, 0], [0.4, 10]], [[7.6, 0], [7.6, 10]], [[0.4, 5], [7.6, 5]]],
  G: [[[7.4, 2], [5.4, 0], [2.6, 0], [0.4, 2], [0.4, 8], [2.6, 10], [5.4, 10], [7.4, 8], [7.4, 5], [4.2, 5]]],
  I: [[[1.6, 0], [6.4, 0]], [[4, 0], [4, 10]], [[1.6, 10], [6.4, 10]]],
  M: [[[0.4, 10], [0.4, 0], [4, 6.2], [7.6, 0], [7.6, 10]]],
  O: [[[2.4, 0], [5.6, 0], [8, 2.4], [8, 7.6], [5.6, 10], [2.4, 10], [0, 7.6], [0, 2.4], [2.4, 0]]],
  P: [[[0.4, 10], [0.4, 0], [5.6, 0], [7.6, 1.6], [7.6, 4], [5.6, 5.4], [0.4, 5.4]]],
  R: [[[0.4, 10], [0.4, 0], [5.6, 0], [7.6, 1.6], [7.6, 4], [5.6, 5.4], [0.4, 5.4]], [[3.4, 5.4], [7.6, 10]]],
  S: [[[7.4, 1.6], [5.6, 0], [2.2, 0], [0.4, 1.6], [0.4, 3.4], [2.2, 4.8], [5.8, 5.2], [7.6, 6.6], [7.6, 8.4], [5.8, 10], [2.2, 10], [0.4, 8.4]]],
  T: [[[0, 0], [8, 0]], [[4, 0], [4, 10]]],
  V: [[[0, 0], [4, 10], [8, 0]]],
};

const DISPLAY_H = 10;
const DISPLAY_STEP = 10.4;

function displayStrokes(text, size, slant = 0.26) {
  const scale = size / DISPLAY_H;
  const source = normalize(text);
  const strokes = [];
  let x = 0;
  const map = (px, py) => [x + px * scale + (DISPLAY_H - py) * scale * slant, py * scale];
  for (const ch of source) {
    const glyph = DISPLAY[ch] ?? FONT[ch] ?? FONT["-"];
    for (const line of glyph) {
      strokes.push(line.map(([px, py]) => map(px, py)));
    }
    x += DISPLAY_STEP * scale;
  }
  return { strokes, width: x + size * slant, height: size };
}

export function vectorTitleSvg(text, size, color = "#66e0ff", hot = "#c8f8ff", options = {}) {
  const motion = Boolean(options.motion);
  const { strokes, width, height } = displayStrokes(text, size);
  const layers = motion ? 9 : 12;
  const echoes = motion ? 4 : 0;
  const dx = size * 0.052;
  const dy = size * 0.046;
  const trail = (layers + echoes * 2.2) * dx;
  const pad = size * (motion ? 0.55 : 0.42);
  const vbW = width + trail + pad * 2;
  const vbH = height + (layers + echoes * 2.2) * dy + pad * 2;
  const live = strokes.filter((line) => line.length > 1);
  const pathAt = (ox, oy) => live.map((line) => pathFrom(line.map(([px, py]) => [px + ox, py + oy]))).join(" ");
  const front = pathAt(0, 0);
  const parts = [];
  const rib = Math.max(0.65, size / 46);
  for (let k = echoes; k >= 1; k -= 1) {
    const ox = (layers + k * 2.1) * dx;
    const oy = (layers + k * 2.1) * dy;
    parts.push(
      `<path class="title-echo" style="--k:${k}" d="${pathAt(ox, oy)}" stroke="${color}" stroke-width="${(rib * 0.85).toFixed(2)}" stroke-linejoin="miter"/>`,
    );
  }
  for (let i = layers; i >= 1; i -= 1) {
    const alpha = (0.05 + ((layers - i) / layers) * 0.2).toFixed(2);
    parts.push(
      `<path class="title-rib" style="--i:${i}" d="${pathAt(i * dx, i * dy)}" stroke="${color}" stroke-width="${rib.toFixed(2)}" stroke-opacity="${alpha}" stroke-linejoin="miter"/>`,
    );
  }
  const split = Math.max(1.1, size * 0.02);
  parts.push(`<path d="${pathAt(-split, 0)}" stroke="#ff4d9a" stroke-width="${(rib * 1.15).toFixed(2)}" stroke-opacity="0.42" stroke-linejoin="miter"/>`);
  parts.push(`<path d="${pathAt(split, 0.4)}" stroke="#3cffc0" stroke-width="${(rib * 1.15).toFixed(2)}" stroke-opacity="0.32" stroke-linejoin="miter"/>`);
  const sw = Math.max(1.1, size / 28);
  parts.push(`<path class="vector-glow" d="${front}" stroke="${color}" stroke-width="${(sw * 4.2).toFixed(2)}" stroke-linejoin="miter"/>`);
  parts.push(`<path class="vector-core" d="${front}" stroke="${hot}" stroke-width="${sw.toFixed(2)}" stroke-linejoin="miter"/>`);
  const cls = motion ? "vector-text vector-title is-show" : "vector-text vector-title";
  return `<svg class="${cls}" width="${vbW.toFixed(1)}" height="${vbH.toFixed(1)}" viewBox="${-pad} ${-pad} ${vbW} ${vbH}" aria-label="${normalize(text)}" style="margin:0 auto;">${parts.join("")}</svg>`;
}

export function shipMarksSvg(count, size = 18) {
  if (count <= 0) return "";
  const marks = [];
  const gap = size * 1.05;
  for (let i = 0; i < count; i += 1) {
    const x = i * gap;
    marks.push(`M${x + size * 0.15} ${size * 0.85} L${x + size * 0.5} ${size * 0.1} L${x + size * 0.85} ${size * 0.85} L${x + size * 0.5} ${size * 0.62} Z`);
  }
  const width = count * gap;
  const d = marks.join(" ");
  return `<svg class="vector-text" width="${width + 8}" height="${size + 8}" viewBox="-4 -4 ${width + 8} ${size + 8}" aria-label="${count} ships"><path class="vector-glow" d="${d}" stroke="#66e0ff" stroke-width="2.6"/><path class="vector-core" d="${d}" stroke="#c8f8ff" stroke-width="1.05"/></svg>`;
}
