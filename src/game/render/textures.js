import { Texture } from "pixi.js";
import { particles } from "../config.js";

export function createGlowTexture(size = particles.textureSize) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const radius = size / 2;
  const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.18, "rgba(255,255,255,0.7)");
  gradient.addColorStop(0.42, "rgba(255,255,255,0.18)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(canvas);
}

export function strokeGlow(graphics, points, color, hotColor, width = 1.6) {
  graphics.poly(points, true);
  graphics.stroke({ width: width * 3.2, color, alpha: 0.2, join: "round" });
  graphics.poly(points, true);
  graphics.stroke({ width, color: hotColor, alpha: 1, join: "round" });
}

export function strokeLine(graphics, points, color, hotColor, width = 1.6) {
  if (!points || points.length < 4) return;
  const draw = () => {
    graphics.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) graphics.lineTo(points[i], points[i + 1]);
  };
  draw();
  graphics.stroke({ width: width * 3.2, color, alpha: 0.2, join: "round", cap: "round" });
  draw();
  graphics.stroke({ width, color: hotColor, alpha: 1, join: "round", cap: "round" });
}
