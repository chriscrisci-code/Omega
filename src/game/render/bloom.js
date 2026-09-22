import { AdvancedBloomFilter } from "pixi-filters";
import { bloom as bloomConfig } from "../config.js";

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
