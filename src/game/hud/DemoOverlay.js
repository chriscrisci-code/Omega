import { vectorTextSvg } from "./vectorText.js";

const LAMPS = 9;
const CYAN = "#66e0ff";
const HOT = "#c8f8ff";
const KEYS = [
  { code: "KeyW", label: "W", slot: "w" },
  { code: "KeyA", label: "A", slot: "a" },
  { code: "KeyS", label: "S", slot: "s" },
  { code: "KeyD", label: "D", slot: "d" },
];

const UTIL = [
  { code: "KeyH", label: "H", slot: "h" },
  { code: "KeyL", label: "L", slot: "l" },
  { code: "KeyV", label: "V", slot: "v" },
];

export class DemoOverlay {
  constructor(input) {
    this.input = input;
    this.wheelDir = 0;
    this.wheelStart = 0;
    this.wheelUntil = 0;
    this.lamps = [];
    this.keyEls = new Map();

    this.root = document.createElement("div");
    this.root.id = "demo-mouse";
    this.root.setAttribute("aria-hidden", "true");
    this.root.innerHTML = `
      <svg viewBox="0 0 120 196" class="demo-mouse-svg">
        <path class="demo-shell" d="M30 24 L52 16 L68 16 L90 24 L106 50 L110 90 L106 142 L90 188 L30 188 L14 142 L10 90 L14 50 Z"/>
        <path class="demo-btn demo-left" d="M22 52 L52 26 L57 26 L57 86 L20 86 L20 60 Z"/>
        <path class="demo-btn demo-right" d="M98 52 L68 26 L63 26 L63 86 L100 86 L100 60 Z"/>
        <path class="demo-seam" d="M60 88 L60 150"/>
        <path class="demo-well" d="M54 34 L66 34 L70 40 L70 76 L66 84 L54 84 L50 76 L50 40 Z"/>
        <g class="demo-lamps"></g>
        <path class="demo-chevron demo-up" d="M54 22 L60 14 L66 22"/>
        <path class="demo-chevron demo-down" d="M54 96 L60 104 L66 96"/>
      </svg>
    `;
    const group = this.root.querySelector(".demo-lamps");
    const top = 38;
    const span = 40;
    for (let i = 0; i < LAMPS; i += 1) {
      const lamp = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      lamp.setAttribute("class", "demo-lamp");
      lamp.setAttribute("x", "54.5");
      lamp.setAttribute("width", "11");
      lamp.setAttribute("height", "3.2");
      lamp.setAttribute("y", String(top + (span * i) / (LAMPS - 1)));
      group.append(lamp);
      this.lamps.push(lamp);
    }

    this.keysRoot = document.createElement("div");
    this.keysRoot.id = "demo-keys";
    this.keysRoot.setAttribute("aria-hidden", "true");
    for (const row of KEYS) {
      const el = document.createElement("div");
      el.className = `demo-key demo-key-${row.slot}`;
      el.innerHTML = vectorTextSvg(row.label, 15, CYAN, HOT, "center");
      this.keyEls.set(row.code, el);
      this.keysRoot.append(el);
    }

    this.utilRoot = document.createElement("div");
    this.utilRoot.id = "demo-util";
    this.utilRoot.setAttribute("aria-hidden", "true");
    for (const row of UTIL) {
      const el = document.createElement("div");
      el.className = `demo-key demo-key-${row.slot}`;
      el.innerHTML = vectorTextSvg(row.label, 15, CYAN, HOT, "center");
      this.keyEls.set(row.code, el);
      this.utilRoot.append(el);
    }

    document.body.append(this.keysRoot, this.utilRoot, this.root);

    this.onWheel = (event) => {
      const dir = event.deltaY < 0 ? -1 : 1;
      const now = performance.now();
      if (dir !== this.wheelDir || now > this.wheelUntil) this.wheelStart = now;
      this.wheelDir = dir;
      this.wheelUntil = now + 640;
    };
    window.addEventListener("wheel", this.onWheel, { capture: true, passive: true });
  }

  tick() {
    const input = this.input;
    const now = performance.now();
    this.root.classList.toggle("is-left", Boolean(input.mouseHeld[0]));
    this.root.classList.toggle("is-mid", Boolean(input.mouseHeld[1]));
    this.root.classList.toggle("is-right", Boolean(input.mouseHeld[2]));
    for (const row of KEYS) {
      this.keyEls.get(row.code)?.classList.toggle("is-on", input.keys.has(row.code));
    }
    for (const row of UTIL) {
      this.keyEls.get(row.code)?.classList.toggle("is-on", input.keys.has(row.code));
    }

    const spinning = now < this.wheelUntil && this.wheelDir !== 0;
    this.root.classList.toggle("is-wheel", spinning);
    this.root.classList.toggle("is-wheel-up", spinning && this.wheelDir < 0);
    this.root.classList.toggle("is-wheel-down", spinning && this.wheelDir > 0);

    if (!spinning) {
      for (const lamp of this.lamps) lamp.removeAttribute("data-lit");
      return;
    }

    const n = this.lamps.length;
    const step = Math.floor((now - this.wheelStart) / 22);
    const head = this.wheelDir < 0 ? (n - 1 - (step % n) + n) % n : step % n;
    for (let i = 0; i < n; i += 1) {
      const dist = this.wheelDir < 0 ? (i - head + n) % n : (head - i + n) % n;
      const lit = dist === 0 ? "hot" : dist === 1 ? "on" : dist === 2 ? "dim" : "";
      if (lit) this.lamps[i].setAttribute("data-lit", lit);
      else this.lamps[i].removeAttribute("data-lit");
    }
  }
}
