import { setGlowPass } from "../render/textures.js";

const SAMPLE = 120;
const PAINT_MS = 250;

function mean(buf, n) {
  if (!n) return 0;
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += buf[i];
  return sum / n;
}

function p99(buf, n) {
  if (!n) return 0;
  const copy = Array.from(buf.subarray(0, n)).sort((a, b) => a - b);
  return copy[Math.min(n - 1, Math.floor(n * 0.99))];
}

function fmt(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "n/a";
}

function ratio(live, pool) {
  if (!Number.isFinite(live)) return "n/a";
  if (!Number.isFinite(pool)) return String(live);
  return `${live}/${pool}`;
}

function pixiStats(renderer) {
  let draws = "n/a";
  let textures = "n/a";
  try {
    const batch = renderer?.renderPipes?.batch;
    const count = batch?.drawCalls ?? batch?._drawCalls ?? batch?.draws;
    if (Number.isFinite(count)) draws = count;
  } catch {
    draws = "n/a";
  }
  try {
    const managed = renderer?.texture?.managedTextures;
    if (managed?.length != null) textures = managed.length;
    else if (managed?.size != null) textures = managed.size;
  } catch {
    textures = "n/a";
  }
  return { draws, textures };
}

export class PerfHud {
  constructor(app, game) {
    this.app = app;
    this.game = game;
    this.lastDraw = 0;
    this.fps = 0;
    this.n = 0;
    this.i = 0;
    this.frame = new Float32Array(SAMPLE);
    this.js = new Float32Array(SAMPLE);
    this.draw = new Float32Array(SAMPLE);
    this.paintAt = 0;

    this.root = document.createElement("div");
    this.root.id = "perf-hud";
    this.statsEl = document.createElement("pre");
    this.statsEl.id = "perf-stats";
    const toggles = document.createElement("div");
    toggles.className = "perf-toggles";
    toggles.append(
      this.check("bloom", "Bloom", true, (on) => this.setBloom(on)),
      this.check("crt", "CRT", true, (on) => document.body.classList.toggle("perf-no-crt", !on)),
      this.check("glow", "Glow", true, (on) => this.setGlow(on)),
    );
    this.root.append(this.statsEl, toggles);
    document.body.append(this.root);
  }

  check(id, label, on, apply) {
    const wrap = document.createElement("label");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = on;
    box.dataset.perf = id;
    box.addEventListener("change", () => apply(box.checked));
    wrap.append(box, document.createTextNode(` ${label}`));
    wrap.addEventListener("pointerdown", (event) => event.stopPropagation());
    wrap.addEventListener("mousedown", (event) => event.stopPropagation());
    wrap.addEventListener("click", (event) => event.stopPropagation());
    return wrap;
  }

  setBloom(on) {
    const hosts = [this.game.fxRoot, this.game.world, this.game.hangar?.view];
    for (const host of hosts) {
      for (const filter of host?.filters || []) filter.enabled = on;
    }
  }

  setGlow(on) {
    setGlowPass(on);
    if (this.game.fx?.container) this.game.fx.container.visible = on;
  }

  noteDraw(ms) {
    this.lastDraw = ms;
  }

  sample(ticker, jsMs) {
    this.fps = ticker.FPS;
    this.frame[this.i] = ticker.deltaMS;
    this.js[this.i] = jsMs;
    this.draw[this.i] = this.lastDraw;
    this.i = (this.i + 1) % SAMPLE;
    if (this.n < SAMPLE) this.n += 1;

    const now = performance.now();
    if (now - this.paintAt < PAINT_MS) return;
    this.paintAt = now;
    this.paint();
  }

  paint() {
    const frame = mean(this.frame, this.n);
    const lowMs = p99(this.frame, this.n);
    const lowFps = lowMs > 0 ? 1000 / lowMs : 0;
    const counts = this.game.perfSnapshot?.() || {};
    const pixi = pixiStats(this.app.renderer);
    this.statsEl.textContent = [
      `FPS      ${fmt(this.fps, 0)}`,
      `Frame    ${fmt(frame)} ms`,
      `1% low   ${fmt(lowFps, 0)}`,
      `JS       ${fmt(mean(this.js, this.n))} ms`,
      `Draw     ${fmt(mean(this.draw, this.n))} ms`,
      `Sprites  ${ratio(counts.sprites, counts.spritesPool)}`,
      `FX       ${ratio(counts.fx, counts.fxPool)}`,
      `Shots    ${ratio(counts.shots, counts.shotsPool)}`,
      `Missiles ${ratio(counts.missiles, counts.missilesPool)}${Number.isFinite(counts.missilesOn) ? ` vis ${counts.missilesOn}` : ""}`,
      `Foes     ${ratio(counts.foes, counts.foesPool)}`,
      `Rocks    ${counts.rocks ?? "n/a"}`,
      `Shards   ${ratio(counts.shards, counts.shardsPool)}`,
      `Ores     ${ratio(counts.ores, counts.oresPool)}`,
      `Filters  ${counts.filters ?? "n/a"}`,
      `Bloom    ${fmt(counts.bloomRes ?? 1)}`,
      `Draws    ${pixi.draws}`,
      `Textures ${pixi.textures}`,
    ].join("\n");
  }
}
