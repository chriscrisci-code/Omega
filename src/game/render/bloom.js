import { AdvancedBloomFilter } from "pixi-filters";
import { bloom as bloomConfig } from "../config.js";

const SAMPLE = 120;

function meanFps(buf, n) {
  if (!n) return 60;
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += buf[i];
  const ms = sum / n;
  return ms > 0 ? 1000 / ms : 60;
}

export function createBloomFilter() {
  const filter = new AdvancedBloomFilter({
    threshold: bloomConfig.threshold,
    bloomScale: bloomConfig.bloomScale,
    brightness: bloomConfig.brightness,
    blur: bloomConfig.blur,
    quality: bloomConfig.quality,
  });
  filter.resolution = bloomConfig.resolution;
  return filter;
}

export class BloomAdapt {
  constructor(filter) {
    this.filter = filter;
    this.buf = new Float32Array(SAMPLE);
    this.i = 0;
    this.n = 0;
    this.tier = "full";
    this.down = 0;
    this.up = 0;
    this.warm = bloomConfig.adaptWarm ?? 2.5;
    this.apply("full");
  }

  tick(dt) {
    if (!this.filter || !Number.isFinite(dt) || dt <= 0) return;
    this.warm = Math.max(0, this.warm - dt);
    if (this.warm > 0) return;
    this.buf[this.i] = Math.min(250, dt * 1000);
    this.i = (this.i + 1) % SAMPLE;
    if (this.n < SAMPLE) this.n += 1;
    if (this.n < 45) return;

    const fps = meanFps(this.buf, this.n);
    if (fps < (bloomConfig.adaptLow ?? 50)) {
      this.down += dt;
      this.up = 0;
      if (this.down >= (bloomConfig.adaptDown ?? 1.2) && this.tier !== "low") {
        this.apply("low");
        this.down = 0;
      }
    } else if (fps > (bloomConfig.adaptHigh ?? 62)) {
      this.up += dt;
      this.down = 0;
      if (this.up >= (bloomConfig.adaptUp ?? 4) && this.tier !== "full") {
        this.apply("full");
        this.up = 0;
      }
    } else {
      this.down = 0;
      this.up = 0;
    }
  }

  apply(tier) {
    this.tier = tier;
    const filter = this.filter;
    if (!filter) return;
    const low = tier === "low";
    filter.resolution = bloomConfig.resolution;
    filter.blur = low ? (bloomConfig.adaptBlur ?? 4) : bloomConfig.blur;
    filter.quality = low ? (bloomConfig.adaptQuality ?? 2) : bloomConfig.quality;
  }
}
