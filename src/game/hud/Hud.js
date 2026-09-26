import { version } from "../config.js";
import { ControlsPage } from "./ControlsPage.js";
import { DockBay } from "./DockBay.js";
import { shipMarksSvg, vectorTextSvg, vectorTitleSvg } from "./vectorText.js";

const CYAN = "#66e0ff";
const HOT = "#c8f8ff";
const MAGENTA = "#ff4d9a";
const PINK = "#ffb3d6";
const DIM = "#6d8a99";
const AMBER = "#ffc266";
const GOLD = "#ffe0b0";
const RANK = [
  { color: AMBER, hot: GOLD },
  { color: MAGENTA, hot: PINK },
  { color: CYAN, hot: HOT },
];

export class Hud {
  constructor() {
    this.score = document.querySelector("#score");
    this.ore = document.querySelector("#ore");
    this.points = document.querySelector("#points");
    this.hubOre = document.querySelector("#hub-ore");
    this.lives = document.querySelector("#lives");
    this.center = document.querySelector("#center");
    this.cta = document.querySelector("#cta");
    this.title = this.center.querySelector("h1");
    this.tag = this.center.querySelector(".tag");
    this.help = [...this.center.querySelectorAll(".help")];
    this.padStatus = document.querySelector("#pad-status");
    this.shieldFill = document.querySelector("#shield-fill");
    this.shieldBar = document.querySelector("#shield");
    this.special = document.querySelector("#special");
    this.alert = document.querySelector("#alert");
    this.alertTitle = this.alert?.querySelector(".alert-title");
    this.alertSub = document.querySelector("#alert-sub");
    this.mode = document.querySelector("#mode");
    this.shipsLink = document.querySelector("#ships-link");
    this.controlsLink = document.querySelector("#controls-link");
    this.shipsPage = document.querySelector("#ships-page");
    this.controlsPage = document.querySelector("#controls-page");
    this.controls = new ControlsPage();
    this.shipsHeading = document.querySelector("#ships-heading");
    this.shipsHint = document.querySelector("#ships-hint");
    this.credit = document.querySelector("#credit");
    this.version = document.querySelector("#version");
    this.paint(this.version, `V ${version}`, 8, DIM, CYAN, "right");
    this.wavePick = document.querySelector("#wave-pick");
    this.waveRow = document.querySelector("#wave-row");
    this.onPickWave = null;
    this.onPickStart = null;
    this.scoreBoard = document.querySelector("#score-board");
    this.continueBtn = document.querySelector("#continue-btn");
    this.devicePick = document.querySelector("#device-pick");
    this.deviceTitle = document.querySelector("#device-title");
    this.pickDesktop = document.querySelector("#pick-desktop");
    this.pickPhone = document.querySelector("#pick-phone");
    this.onContinue = null;
    this.onPickDevice = null;
    this.layout = "desktop";
    this.profile = "mouse";
    this.trailTimer = 0;
    this.trailBeat = 0;
    this.bay = new DockBay();
    this.continueBtn?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onContinue?.();
    });
    this.paintContinue();

    this.paint(document.querySelector("[data-label=score]"), "SCORE", 10, DIM, CYAN);
    this.paint(document.querySelector("[data-label=ore]"), "ORE", 10, DIM, CYAN, "center");
    this.paint(document.querySelector("[data-label=pts]"), "LOADOUT", 10, DIM, CYAN, "center");
    this.setPoints(0);
    this.paint(document.querySelector("[data-label=ships]"), "SHIPS", 10, DIM, CYAN, "right");
    this.paint(document.querySelector("[data-label=shield]"), "SHIELD", 10, DIM, CYAN, "right");
    this.paint(document.querySelector("[data-label=special]"), "WHEEL", 10, DIM, CYAN, "right");
    this.paint(this.alertTitle, "HUB UNDER ATTACK", 8, MAGENTA, PINK, "center");
    this.paint(this.padStatus, "GAMEPAD CONNECTED", 10, DIM, CYAN, "right");
    this.paintHelp();
    this.paint(this.deviceTitle, "CONTROLS", 16, CYAN, HOT, "center");
    this.pickDesktop && (this.pickDesktop.innerHTML = vectorTextSvg("DESKTOP", 14, CYAN, HOT, "center"));
    this.pickPhone && (this.pickPhone.innerHTML = vectorTextSvg("PHONE", 14, CYAN, HOT, "center"));
    this.pickDesktop?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onPickDevice?.("desktop");
    });
    this.pickPhone?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onPickDevice?.("phone");
    });
    this.paint(this.shipsLink, "S SHIPS", 14, DIM, CYAN, "center");
    this.paint(this.controlsLink, "C CONTROLS", 14, DIM, CYAN, "center");
    this.shipsHeading && (this.shipsHeading.innerHTML = vectorTitleSvg("SHIPS", 36, CYAN, HOT));
    this.paint(this.shipsHint, "ESC RETURN  SPACE START", 11, DIM, CYAN, "center");
  }

  paint(node, text, size, color, hot, align = "left") {
    if (!node) return;
    node.innerHTML = vectorTextSvg(text, size, color, hot, align);
  }

  setScore(value) {
    this.paint(this.score, String(value), 26, CYAN, HOT);
  }

  setOre(cargo, banked = 0, name = "") {
    this.paint(this.ore, String(cargo), 26, CYAN, HOT, "center");
    const line = name ? `HUB ${banked}  ${name}` : banked ? `HUB ${banked}` : "";
    this.paint(this.hubOre, line, 10, DIM, CYAN, "center");
  }

  setPoints(value) {
    this.paint(this.points, String(Math.max(0, Math.floor(Number(value) || 0))), 26, CYAN, HOT, "center");
  }

  setHigh() {}

  setMode(label) {
    if (!this.mode) return;
    if (!label) {
      this.mode.hidden = true;
      return;
    }
    this.mode.hidden = false;
    this.paint(this.mode, label, 11, CYAN, HOT, "center");
  }

  setLives(count) {
    this.lives.innerHTML = shipMarksSvg(count, 18);
  }

  setPad(connected) {
    this.padStatus.hidden = !connected;
  }

  setShield(energy, active, max = 1) {
    if (!this.shieldFill) return;
    const pool = Math.max(0.001, max);
    this.shieldFill.style.width = `${Math.round(Math.max(0, Math.min(1, energy / pool)) * 100)}%`;
    this.shieldBar?.classList.toggle("is-on", Boolean(active));
    this.shieldBar?.classList.toggle("is-empty", energy <= 0.06);
  }

  setSpecial(name) {
    this.paint(this.special, name || "WARP EMP MSL", 14, CYAN, HOT, "right");
  }

  attract(on) {
    document.body.classList.toggle("is-attract", on);
    if (on) this.startTitleTrails();
    else this.stopTitleTrails();
    if (!on) this.setAttractDemo(false);
  }

  setAttractDemo(on) {
    this.center?.classList.toggle("is-demo", on);
    document.body.classList.toggle("is-demo-play", on);
    if (on) this.hideScores();
  }

  startTitleTrails() {
    this.stopTitleTrails();
    this.trailBeat = 0;
    this.trailTimer = window.setInterval(() => {
      this.trailBeat += 1;
      this.applyTrailState();
    }, 5000);
  }

  stopTitleTrails() {
    if (this.trailTimer) {
      window.clearInterval(this.trailTimer);
      this.trailTimer = 0;
    }
  }

  applyTrailState() {
    const svg = this.title?.querySelector(".vector-title.is-show");
    if (!svg) return;
    const states = ["fwd", "rev", "fast", "slow", "rev-fast", "rev-slow"];
    svg.dataset.trail = states[this.trailBeat % states.length];
  }

  paintHelp() {
    if (this.profile === "laptop") {
      this.help[0] && this.paint(this.help[0], "KEYS MOVE  HEADING AIM  TAP FIRE  TWO FINGER SCROLL WARP EMP", 11, DIM, CYAN, "center");
      this.help[1] && this.paint(this.help[1], "DOUBLE TAP SHIELD  CORNER TR MISSILE  C CONTROLS", 11, DIM, CYAN, "center");
      this.help[2] && this.paint(this.help[2], "M MAP  H HOME  F FULLSCREEN  ESC END RUN", 10, DIM, CYAN, "center");
      this.paint(document.querySelector("[data-label=special]"), "WHEEL", 10, DIM, CYAN, "right");
      return;
    }
    if (this.profile === "gamepad") {
      this.help[0] && this.paint(this.help[0], "LEFT STICK MOVE  RIGHT STICK TURN  X RT FIRE", 11, DIM, CYAN, "center");
      this.help[1] && this.paint(this.help[1], "Y WARP  A EMP  B SHIELD  RB MISSILE", 11, DIM, CYAN, "center");
      this.help[2] && this.paint(this.help[2], "VIEW MAP  C CONTROLS  ESC END RUN", 10, DIM, CYAN, "center");
      this.paint(document.querySelector("[data-label=special]"), "PAD", 10, DIM, CYAN, "right");
      return;
    }
    if (this.layout === "phone") {
      this.help[0] && this.paint(this.help[0], "LEFT STICK THRUST  RIGHT STICK TURN", 11, DIM, CYAN, "center");
      this.help[1] && this.paint(this.help[1], "DOUBLE TAP STICK FIRE  FLICK FWD WARP  FLICK BACK EMP", 11, DIM, CYAN, "center");
      this.help[2] && this.paint(this.help[2], "TWO FINGER TAP MISSILE  DOUBLE TAP SHIELD", 10, DIM, CYAN, "center");
      this.paint(document.querySelector("[data-label=special]"), "FLICK", 10, DIM, CYAN, "right");
      return;
    }
    this.help[0] && this.paint(this.help[0], "MOUSE AIM  LEFT FIRE  WHEEL FWD WARP  WHEEL BACK EMP  WHEEL BUTTON MISSILE", 11, DIM, CYAN, "center");
    this.help[1] && this.paint(this.help[1], "RIGHT TOGGLE SHIELD  A D STRAFE  W S THRUST  Q E ROTATE", 11, DIM, CYAN, "center");
    this.help[2] && this.paint(this.help[2], "M MAP  H AUTOPILOT HOME  F FULLSCREEN  ESC END RUN", 10, DIM, CYAN, "center");
    this.paint(document.querySelector("[data-label=special]"), "WHEEL", 10, DIM, CYAN, "right");
  }

  setLayout(id) {
    this.layout = id === "phone" ? "phone" : "desktop";
    this.paintHelp();
  }

  setProfile(id) {
    this.profile = id || "mouse";
    this.paintHelp();
  }

  showDevicePick() {
    this.devicePick?.classList.remove("is-hidden");
  }

  hideDevicePick() {
    this.devicePick?.classList.add("is-hidden");
  }

  showTitle() {
    this.attract(true);
    this.setAttractDemo(false);
    this.center.classList.remove("is-hidden");
    this.title.innerHTML = vectorTitleSvg("OMEGA", 64, CYAN, HOT, { motion: true });
    this.applyTrailState();
    this.paint(this.tag, "THE VOID IS LISTENING", 12, MAGENTA, PINK, "center");
    this.cta.innerHTML = vectorTitleSvg(this.layout === "phone" ? "TAP TO START" : "PRESS FIRE", 20, CYAN, HOT);
    this.paint(this.credit, "C 1984  OMEGA", 9, DIM, CYAN, "center");
    this.paintHelp();
    this.shipsPage?.classList.add("is-hidden");
    this.hideWavePick();
    this.hideScores();
    this.hideContinue();
    this.setHubAlert(null);
    this.setMode("");
  }

  showWavePick(maxWave, selected) {
    this.attract(true);
    this.setAttractDemo(false);
    this.center.classList.remove("is-hidden", "is-scores", "is-initials");
    this.center.classList.add("is-wave");
    this.title.innerHTML = "";
    this.paint(this.tag, "WAVE", 18, MAGENTA, PINK, "center");
    this.paintWavePick(maxWave, selected);
    this.cta.innerHTML = vectorTitleSvg(this.layout === "phone" ? "TAP WAVE" : "FIRE START", 18, CYAN, HOT);
    this.paint(this.credit, this.layout === "phone" ? "TAP TO START" : "WHEEL OR ARROWS   ESC", 8, DIM, CYAN, "center");
    this.shipsPage?.classList.add("is-hidden");
    this.hideScores();
    this.hideContinue();
    this.setHubAlert(null);
    this.setMode("");
  }

  paintWavePick(maxWave, selected) {
    if (!this.waveRow) return;
    const max = Math.max(1, Math.floor(Number(maxWave) || 1));
    const on = Math.max(1, Math.min(max, Math.floor(Number(selected) || 1)));
    this.waveRow.innerHTML = "";
    for (let n = 1; n <= max; n += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `wave-btn${n === on ? " is-on" : ""}`;
      btn.innerHTML = vectorTextSvg(String(n), n === on ? 16 : 13, n === on ? CYAN : DIM, n === on ? HOT : CYAN, "center");
      btn.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.onPickWave?.(n);
      });
      this.waveRow.appendChild(btn);
    }
    this.wavePick?.classList.remove("is-hidden");
  }

  hideWavePick() {
    this.center?.classList.remove("is-wave");
    this.wavePick?.classList.add("is-hidden");
  }

  showStartPick(label, selected) {
    this.attract(true);
    this.setAttractDemo(false);
    this.center.classList.remove("is-hidden", "is-scores", "is-initials");
    this.center.classList.add("is-wave");
    this.title.innerHTML = "";
    this.paint(this.tag, label || "SAVE", 18, MAGENTA, PINK, "center");
    this.paintStartPick(selected);
    this.cta.innerHTML = vectorTitleSvg(this.layout === "phone" ? "TAP TO START" : "FIRE START", 18, CYAN, HOT);
    this.paint(this.credit, this.layout === "phone" ? "TAP A CHOICE" : "WHEEL OR ARROWS   ESC", 8, DIM, CYAN, "center");
    this.shipsPage?.classList.add("is-hidden");
    this.hideScores();
    this.hideContinue();
    this.setHubAlert(null);
    this.setMode("");
  }

  paintStartPick(selected) {
    if (!this.waveRow) return;
    const on = selected === "new" ? "new" : "continue";
    const rows = [
      { id: "continue", name: "CONTINUE" },
      { id: "new", name: "NEW GAME" },
    ];
    this.waveRow.innerHTML = "";
    for (const row of rows) {
      const lit = row.id === on;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `wave-btn start-btn${lit ? " is-on" : ""}`;
      btn.innerHTML = vectorTextSvg(row.name, lit ? 16 : 13, lit ? CYAN : DIM, lit ? HOT : CYAN, "center");
      btn.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.onPickStart?.(row.id);
      });
      this.waveRow.appendChild(btn);
    }
    this.wavePick?.classList.remove("is-hidden");
  }

  showScores(rows, heading = "ALL TIME") {
    this.attract(true);
    this.setAttractDemo(false);
    this.center.classList.remove("is-hidden", "is-initials");
    this.center.classList.add("is-scores");
    document.body.classList.add("is-scoreboard");
    this.paintScoreBoard(rows, heading);
    this.cta.innerHTML = vectorTitleSvg("PRESS FIRE", 20, CYAN, HOT);
    this.paint(this.credit, "C 1984  OMEGA", 9, DIM, CYAN, "center");
    this.shipsPage?.classList.add("is-hidden");
    this.hideWavePick();
    this.hideContinue();
    this.setHubAlert(null);
    this.setMode("");
  }

  showInitials(score, entry, label = "SCORE") {
    this.attract(true);
    this.setAttractDemo(false);
    this.center.classList.remove("is-hidden", "is-scores");
    this.center.classList.add("is-initials");
    this.hideWavePick();
    document.body.classList.add("is-scoreboard");
    this.title.innerHTML = "";
    this.paint(this.tag, `${label}  ${score}`, 14, MAGENTA, PINK, "center");
    this.paintInitials(entry);
    this.paint(this.credit, "WHEEL OR ARROWS   FIRE NEXT", 8, DIM, CYAN, "center");
    this.cta.innerHTML = "";
    this.shipsPage?.classList.add("is-hidden");
    this.hideContinue();
    this.setHubAlert(null);
    this.setMode("");
  }

  paintScoreBoard(rows, heading = "ALL TIME") {
    if (!this.scoreBoard) return;
    const line = (rank, name, value, color, hot, place) =>
      `<div class="score-row is-${place}"><span>${vectorTextSvg(String(rank), 18, color, hot, "left")}</span><span>${vectorTextSvg(name, 18, color, hot, "center")}</span><span>${vectorTextSvg(String(value), 18, color, hot, "right")}</span></div>`;
    const body = (rows || [])
      .map((row, i) => {
        const tint = RANK[i] || { color: DIM, hot: CYAN };
        return line(i + 1, row.name, row.score, tint.color, tint.hot, i + 1);
      })
      .join("");
    const title = String(heading || "ALL TIME").toUpperCase();
    const size = title.length > 8 ? 18 : 22;
    this.scoreBoard.innerHTML = `<span class="score-corner tl"></span><span class="score-corner tr"></span><span class="score-corner bl"></span><span class="score-corner br"></span><div class="score-rule"></div><div class="score-head">${vectorTextSvg(title, size, CYAN, HOT, "center")}</div><div class="score-rule thin"></div>${body}`;
    this.scoreBoard.classList.remove("is-hidden");
  }

  paintInitials(entry) {
    if (!this.scoreBoard) return;
    const letters = entry?.letters || ["A", "A", "A"];
    const index = entry?.i ?? 0;
    const cells = letters
      .map((ch, i) => {
        const on = i === index;
        return `<span class="${on ? "is-on" : ""}">${vectorTextSvg(ch, on ? 22 : 16, on ? CYAN : DIM, on ? HOT : CYAN, "center")}</span>`;
      })
      .join("");
    this.scoreBoard.innerHTML = `<div class="initials-row">${cells}</div>`;
    this.scoreBoard.classList.remove("is-hidden");
  }

  hideScores() {
    this.center?.classList.remove("is-scores", "is-initials");
    this.scoreBoard?.classList.add("is-hidden");
    document.body.classList.remove("is-scoreboard");
  }

  showGameOver(score, reason = "final") {
    this.attract(true);
    this.setAttractDemo(false);
    this.center.classList.remove("is-hidden");
    this.title.innerHTML = vectorTitleSvg("OMEGA", 64, CYAN, HOT, { motion: true });
    this.applyTrailState();
    const line =
      reason === "hub" ? `HUB LOST  ${score}` : reason === "abort" ? `RUN ABORTED  ${score}` : `FINAL  ${score}`;
    this.paint(this.tag, line, 14, MAGENTA, PINK, "center");
    this.cta.innerHTML = vectorTitleSvg("PRESS FIRE", 20, CYAN, HOT);
    this.paint(this.credit, "C 1984  OMEGA", 9, DIM, CYAN, "center");
    this.shipsPage?.classList.add("is-hidden");
    this.hideWavePick();
    this.hideScores();
    this.hideContinue();
    this.setHubAlert(null);
    this.setMode("");
  }

  showShips() {
    this.attract(true);
    this.center.classList.add("is-hidden");
    this.shipsPage?.classList.remove("is-hidden");
    this.hideControls();
    this.setHubAlert(null);
    this.setMode("");
  }

  showControls() {
    this.attract(true);
    this.center.classList.add("is-hidden");
    this.shipsPage?.classList.add("is-hidden");
    this.controls.show();
    this.setHubAlert(null);
    this.setMode("");
  }

  hideControls() {
    this.controls.hide();
  }

  setHubAlert(info) {
    if (!this.alert) return;
    if (!info || !info.count) {
      this.alert.hidden = true;
      this.alert.classList.remove("is-close");
      return;
    }
    this.alert.hidden = false;
    this.alert.classList.toggle("is-close", Boolean(info.close));
    const range = info.range >= 1000 ? `${(info.range / 1000).toFixed(1)}K` : `${Math.round(info.range)}`;
    const color = info.close ? AMBER : MAGENTA;
    const hot = info.close ? "#ffe0b0" : PINK;
    this.paint(this.alertTitle, "HUB UNDER ATTACK", 8, color, hot, "center");
    this.paint(this.alertSub, `${info.count} INBOUND  ${range}  SHIELD ${info.shield ?? 0}  HULL ${info.hull}`, 7, color, hot, "center");
  }

  paintContinue() {
    if (!this.continueBtn) return;
    this.paint(this.continueBtn, "CONTINUE", 18, CYAN, HOT, "center");
  }

  showContinue() {
    this.paintContinue();
    this.continueBtn?.classList.remove("is-hidden");
  }

  hideContinue() {
    this.continueBtn?.classList.add("is-hidden");
  }

  hideCenter() {
    this.attract(false);
    this.center.classList.add("is-hidden");
    this.shipsPage?.classList.add("is-hidden");
    this.hideControls();
    this.hideDock();
    this.hideContinue();
    this.hideWavePick();
    this.hideScores();
  }

  showDock(shipId) {
    this.bay.show(shipId);
  }

  hideDock() {
    this.bay.hide();
  }
}
