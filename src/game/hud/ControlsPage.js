import { music, musicPctFromVol } from "../config.js";
import { ACTIONS, PROFILE_NAMES, PROFILES, bindId, labelBind } from "../input/bindings.js";
import { vectorTextSvg, vectorTitleSvg } from "./vectorText.js";

const CYAN = "#66e0ff";
const HOT = "#c8f8ff";
const DIM = "#6d8a99";

function paint(node, text, size, color, hot, align = "center") {
  if (!node) return;
  node.innerHTML = vectorTextSvg(text, size, color, hot, align);
}

export class ControlsPage {
  constructor() {
    this.root = document.querySelector("#controls-page");
    this.profiles = document.querySelector("#controls-profiles");
    this.music = document.querySelector("#controls-music");
    this.list = document.querySelector("#controls-list");
    this.onProfile = null;
    this.onCapture = null;
    this.onRemove = null;
    this.onReset = null;
    this.onMusic = null;
    this.listening = "";
    paint(document.querySelector("#controls-heading"), "CONTROLS", 22, CYAN, HOT, "center");
    paint(document.querySelector("#controls-hint"), "CLICK A ROW   PRESS KEY MOUSE OR PAD   ESC RETURN", 8, DIM, CYAN, "center");
    this.root?.addEventListener("pointerdown", (event) => event.stopPropagation());
  }

  render(state) {
    this.listening = state.listening || "";
    this.drawProfiles(state.profile);
    this.drawMusic(state.music);
    this.drawList(state.binds);
  }

  musicPct(vol) {
    return musicPctFromVol(vol);
  }

  drawMusic(vol) {
    if (!this.music) return;
    this.music.innerHTML = "";
    const pct = this.musicPct(vol);
    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "wave-btn";
    minus.innerHTML = vectorTextSvg("-", 14, DIM, CYAN, "center");
    minus.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onMusic?.(-(music.pctStep || 10));
    });
    const level = document.createElement("button");
    level.type = "button";
    level.className = `wave-btn start-btn music-level${pct > 0 ? " is-on" : ""}`;
    level.innerHTML = vectorTextSvg(`MUSIC ${pct}%`, 12, pct > 0 ? CYAN : DIM, pct > 0 ? HOT : CYAN, "center");
    level.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onMusic?.(pct > 0 ? -pct : 100);
    });
    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "wave-btn";
    plus.innerHTML = vectorTextSvg("+", 14, DIM, CYAN, "center");
    plus.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onMusic?.(music.pctStep || 10);
    });
    this.music.append(minus, level, plus);
  }

  drawProfiles(profile) {
    if (!this.profiles) return;
    this.profiles.innerHTML = "";
    for (const id of PROFILES) {
      const on = id === profile;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `wave-btn start-btn${on ? " is-on" : ""}`;
      btn.innerHTML = vectorTextSvg(PROFILE_NAMES[id], on ? 14 : 12, on ? CYAN : DIM, on ? HOT : CYAN, "center");
      btn.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.onProfile?.(id);
      });
      this.profiles.appendChild(btn);
    }
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "wave-btn";
    reset.innerHTML = vectorTextSvg("RESET", 12, DIM, CYAN, "center");
    reset.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onReset?.();
    });
    this.profiles.appendChild(reset);
  }

  drawList(binds) {
    if (!this.list) return;
    this.list.innerHTML = "";
    for (const row of ACTIONS) {
      const line = document.createElement("div");
      line.className = `controls-row${this.listening === row.id ? " is-on" : ""}`;
      const name = document.createElement("div");
      name.className = "controls-name";
      name.innerHTML = vectorTextSvg(row.name, 10, this.listening === row.id ? CYAN : DIM, CYAN, "left");
      const slots = document.createElement("div");
      slots.className = "controls-slots";
      for (const bind of binds[row.id] || []) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "controls-chip";
        chip.innerHTML = vectorTextSvg(labelBind(bind), 8, CYAN, HOT, "center");
        chip.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.onRemove?.(row.id, bindId(bind));
        });
        slots.appendChild(chip);
      }
      const add = document.createElement("button");
      add.type = "button";
      add.className = `controls-chip${this.listening === row.id ? " is-on" : ""}`;
      add.innerHTML = vectorTextSvg(this.listening === row.id ? "..." : "+", 8, this.listening === row.id ? CYAN : DIM, HOT, "center");
      add.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.onCapture?.(row.id);
      });
      slots.appendChild(add);
      line.appendChild(name);
      line.appendChild(slots);
      this.list.appendChild(line);
    }
  }

  show() {
    this.root?.classList.remove("is-hidden");
  }

  hide() {
    this.root?.classList.add("is-hidden");
    this.listening = "";
  }
}
