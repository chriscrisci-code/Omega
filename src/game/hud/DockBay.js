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
    this.onPickShip = null;
    this.shipId = WEDGE_ID;

    paint(document.querySelector("#dock-title"), "BAY", 7, CYAN, HOT, "center");
    paint(document.querySelector("#dock-hint"), "THRUST TO LAUNCH", 6, DIM, CYAN, "center");

    this.buildShips();
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
