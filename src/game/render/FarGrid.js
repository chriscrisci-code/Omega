import { Container, Graphics } from "pixi.js";
import { farGrid as cfg } from "../config.js";

export class FarGrid {
  constructor() {
    this.view = new Container();
    this.marks = new Graphics();
    this.view.addChild(this.marks);
    this.paint();
  }

  paint() {
    const { spacing, size, alpha, glow, color, cells } = cfg;
    const origin = -(cells * spacing) / 2;
    this.marks.clear();
    const draw = () => {
      for (let i = 0; i <= cells; i += 1) {
        for (let j = 0; j <= cells; j += 1) {
          const x = origin + i * spacing;
          const y = origin + j * spacing;
          this.marks.moveTo(x - size, y);
          this.marks.lineTo(x + size, y);
          this.marks.moveTo(x, y - size);
          this.marks.lineTo(x, y + size);
        }
      }
    };
    draw();
    this.marks.stroke({ width: 2.8, color, alpha: glow, cap: "round" });
    draw();
    this.marks.stroke({ width: 1.25, color, alpha, cap: "round" });
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
