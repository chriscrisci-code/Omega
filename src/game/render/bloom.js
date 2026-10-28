import { AdvancedBloomFilter } from "pixi-filters";
import { bloom as bloomConfig } from "../config.js";

const SAMPLE = 120;

function p99fps(buf, n) {
  if (!n) return 60;
  const copy = Array.from(buf.subarray(0, n)).sort((a, b) => a - b);
  const ms = copy[Math.min(n - 1, Math.floor(n * 0.99))];
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
    this.res = bloomConfig.resolution;
    this.down = 0;
    this.up = 0;
    this.warm = bloomConfig.adaptWarm ?? 2.5;
    if (filter) filter.resolution = this.res;
  }

  tick(dt) {
    if (!this.filter || !Number.isFinite(dt) || dt <= 0) return;
    this.warm = Math.max(0, this.warm - dt);
    if (this.warm > 0) return;
    this.buf[this.i] = Math.min(250, dt * 1000);
    this.i = (this.i + 1) % SAMPLE;
    if (this.n < SAMPLE) this.n += 1;
    if (this.n < 45) return;

    const low = p99fps(this.buf, this.n);
    const minRes = bloomConfig.adaptMin ?? 0.5;
    const full = bloomConfig.resolution ?? 1;
    if (low < (bloomConfig.adaptLow ?? 48)) {
      this.down += dt;
      this.up = 0;
      if (this.down >= (bloomConfig.adaptDown ?? 1.2) && this.res > minRes) {
        this.set(minRes);
        this.down = 0;
      }
    } else if (low > (bloomConfig.adaptHigh ?? 64)) {
      this.up += dt;
      this.down = 0;
      if (this.up >= (bloomConfig.adaptUp ?? 4) && this.res < full) {
        this.set(full);
        this.up = 0;
      }
    } else {
      this.down = 0;
      this.up = 0;
    }
  }

  set(res) {
    this.res = res;
    this.filter.resolution = res;
  }
}
