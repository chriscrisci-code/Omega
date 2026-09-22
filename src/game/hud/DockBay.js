import { catalogMiniSvg, SHIP_CATALOG, WEDGE_ID } from "../ships/catalog.js";
import { vectorTextSvg } from "./vectorText.js";

const CYAN = "#66e0ff";
const HOT = "#c8f8ff";
const DIM = "#6d8a99";

function paint(node, text, size, color, hot, align = "center") {
  if (!node) return;
  node.innerHTML = vectorTextSvg(text, size, color, hot, align);
}

export class DockBay {
  constructor() {
    this.root = document.querySelector("#dock-bay");
    this.ships = document.querySelector("#dock-ships");
    this.ups = document.querySelector("#dock-ups");
    this.onPickShip = null;
    this.onBuy = null;
    this.shipId = WEDGE_ID;

    paint(document.querySelector("#dock-title"), "BAY", 7, CYAN, HOT, "center");
    paint(document.querySelector("#dock-hint"), "LOADOUT BUY  THRUST LAUNCH", 6, DIM, CYAN, "center");

    this.buildShips();
    this.setUpgrades({ points: 0, levels: { gun: 1, missile: 1, emp: 1, shield: 1 }, costs: {}, max: {} });
    this.root?.addEventListener("pointerdown", (event) => event.stopPropagation());
  }

  buildShips() {
    if (!this.ships) return;
    this.ships.innerHTML = "";
    const list = [{ id: WEDGE_ID, name: "WEDGE", spec: null }, ...SHIP_CATALOG.map((spec) => ({ id: spec.id, name: spec.name, spec }))];
    for (const item of list) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dock-ship";
      button.dataset.id = item.id;
      button.innerHTML = `${catalogMiniSvg(item.spec, 28)}${vectorTextSvg(item.name, 5, DIM, CYAN, "center")}`;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.onPickShip?.(item.id);
      });
      this.ships.appendChild(button);
    }
  }

  setUpgrades(state) {
    if (!this.ups) return;
    const levels = state.levels || {};
    const costs = state.costs || {};
    const max = state.max || {};
    const points = state.points || 0;
    const rows = [
      { id: "gun", name: "GUN" },
      { id: "missile", name: "MSL" },
      { id: "emp", name: "EMP" },
      { id: "shield", name: "SHD" },
    ];
    this.ups.innerHTML = "";
    for (const row of rows) {
      const level = levels[row.id] || 1;
      const cap = max[row.id] || level;
      const cost = costs[row.id] || 0;
      const top = level >= cap;
      const need = top ? 0 : cost;
      const can = !top && points >= need && need > 0;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `dock-up${can ? " is-on" : ""}${top ? " is-max" : ""}`;
      const price = top ? "MAX" : `${need} LP`;
      btn.innerHTML = `${vectorTextSvg(`${row.name}  ${level}`, 12, can ? CYAN : DIM, can ? HOT : CYAN, "center")}${vectorTextSvg(price, 10, can ? CYAN : DIM, can ? HOT : CYAN, "center")}`;
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (can) this.onBuy?.(row.id);
      });
      this.ups.appendChild(btn);
    }
  }

  setState(shipId) {
    this.shipId = shipId;
    this.ships?.querySelectorAll(".dock-ship").forEach((node) => {
      node.classList.toggle("is-on", node.dataset.id === shipId);
    });
  }

  show(shipId) {
    this.setState(shipId);
    this.root?.classList.remove("is-hidden");
  }

  hide() {
    this.root?.classList.add("is-hidden");
  }
}
