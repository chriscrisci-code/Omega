import { Container, Graphics } from "pixi.js";
import { colors } from "../config.js";
import { drawVectorText } from "../hud/vectorText.js";
import { createBloomFilter } from "../render/bloom.js";
import { strokeGlow, strokeLine } from "../render/textures.js";
import { SHIP_CATALOG } from "./catalog.js";

function collect(ship) {
  return [...ship.hulls, ...ship.details, ...ship.lines];
}

function bounds(ship) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of collect(ship)) {
    for (let i = 0; i < poly.length; i += 2) {
      minX = Math.min(minX, poly[i]);
      maxX = Math.max(maxX, poly[i]);
      minY = Math.min(minY, poly[i + 1]);
      maxY = Math.max(maxY, poly[i + 1]);
    }
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

export class ShipsGallery {
  constructor() {
    this.view = new Container();
    this.view.filters = [createBloomFilter()];
    this.view.visible = false;
    this.cards = SHIP_CATALOG.map((spec) => {
      const node = new Container();
      const art = new Graphics();
      const label = new Graphics();
      node.addChild(art, label);
      this.view.addChild(node);
      return { spec, node, art, label, box: bounds(spec) };
    });
  }

  layout(screen) {
    if (this._w === screen.width && this._h === screen.height) return;
    this._w = screen.width;
    this._h = screen.height;
    const cols = screen.width >= 1500 ? 6 : screen.width >= 1100 ? 4 : 3;
    const rows = Math.ceil(this.cards.length / cols);
    const top = 96;
    const bottom = 72;
    const cellW = screen.width / cols;
    const cellH = Math.max(160, (screen.height - top - bottom) / rows);

    this.cards.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = (col + 0.5) * cellW;
      const cy = top + (row + 0.42) * cellH;
      const scale = Math.min((cellW * 0.34) / Math.max(card.box.w, 1), (cellH * 0.46) / Math.max(card.box.h, 1));
      card.node.position.set(cx, cy);
      card.art.clear();
      card.art.scale.set(scale);
      for (const hull of card.spec.hulls) strokeGlow(card.art, hull, colors.cyan, colors.cyanHot, 1.55);
      for (const detail of card.spec.details) strokeGlow(card.art, detail, colors.cyan, colors.cyanHot, 1.2);
      for (const line of card.spec.lines) strokeLine(card.art, line, colors.cyan, colors.cyanHot, 1.35);
      card.label.clear();
      drawVectorText(card.label, card.spec.name, 0, cellH * 0.38, 10, colors.cyan, colors.cyanHot, "center");
    });
  }
}
