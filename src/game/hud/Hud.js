import { musicPctFromVol, version } from "../config.js";
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
    this.xp = document.querySelector("#xp");
    this.ore = document.querySelector("#ore");
    this.points = document.querySelector("#points");
    this.hubOre = document.querySelector("#hub-ore");
    this.lives = document.querySelector("#lives");
    this.kills = document.querySelector("#kills");
    this.center = document.querySelector("#center");
    this.cta = document.querySelector("#cta");
    this.title = this.center.querySelector("h1");
    this.tag = this.center.querySelector(".tag");
    this.help = [...this.center.querySelectorAll(".help")];
    this.padStatus = document.querySelector("#pad-status");
    this.shieldFill = document.querySelector("#shield-fill");
    this.shieldBar = document.querySelector("#shield");
    this.ammoFill = document.querySelector("#ammo-fill");
    this.ammoBar = document.querySelector("#ammo");
    this.special = document.querySelector("#special");
    this.alert = document.querySelector("#alert");
    this.alertTitle = this.alert?.querySelector(".alert-title");
    this.alertSub = document.querySelector("#alert-sub");
    this.mode = document.querySelector("#mode");
    this.shipsLink = document.querySelector("#ships-link");
    this.controlsLink = document.querySelector("#controls-link");
    this.boardsLink = document.querySelector("#boards-link");
    this.shipsPage = document.querySelector("#ships-page");
    this.controlsPage = document.querySelector("#controls-page");
    this.controls = new ControlsPage();
    this.shipsHeading = document.querySelector("#ships-heading");
    this.shipsHint = document.querySelector("#ships-hint");
    this.credit = document.querySelector("#credit");
    this.credits = document.querySelector("#credits");
    this.insertCoin = document.querySelector("#insert-coin");
    this.creditCount = 0;
    this.freePlay = false;
    this.onInsertCoin = null;
    this.version = document.querySelector("#version");
    this.musicLabel = document.querySelector("#music-label");
    this.musicDown = document.querySelector("#music-down");
    this.musicUp = document.querySelector("#music-up");
    this.onMusic = null;
    this.paint(this.version, `V ${version}`, 8, DIM, CYAN, "right");
    this.paint(this.musicDown, "-", 14, DIM, CYAN, "center");
    this.paint(this.musicUp, "+", 14, DIM, CYAN, "center");
    this.setMusic(0.2);
    this.musicDown?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onMusic?.(-0.1);
    });
    this.musicUp?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onMusic?.(0.1);
    });
    this.wavePick = document.querySelector("#wave-pick");
    this.waveRow = document.querySelector("#wave-row");
    this.onPickWave = null;
    this.onPickStart = null;
    this.scoreBoard = document.querySelector("#score-board");
    this.continueRow = document.querySelector("#continue-row");
    this.continueTitle = document.querySelector("#continue-title");
    this.continueBtn = document.querySelector("#continue-btn");
    this.continueNo = document.querySelector("#continue-no");
    this.devicePick = document.querySelector("#device-pick");
    this.deviceTitle = document.querySelector("#device-title");
    this.deviceNote = document.querySelector("#device-note");
    this.devicePlay = document.querySelector("#device-play");
    this.deviceEmail = document.querySelector("#device-email");
    this.phoneDevice = false;
    this.remindOpen = false;
    this.pickDesktop = document.querySelector("#pick-desktop");
    this.pickPhone = document.querySelector("#pick-phone");
    this.payPortal = document.querySelector("#pay-portal");
    this.payKicker = document.querySelector("#pay-kicker");
    this.payTitle = document.querySelector("#pay-title");
    this.payTag = document.querySelector("#pay-tag");
    this.payRow = document.querySelector("#pay-row");
    this.payNote = document.querySelector("#pay-note");
    this.payEmail = document.querySelector("#pay-email");
    this.payCancel = document.querySelector("#pay-cancel");
    this.onContinue = null;
    this.onDecline = null;
    this.onPickDevice = null;
    this.onRemindEmail = null;
    this.onPickPack = null;
    this.onPickDest = null;
    this.onPayEmail = null;
    this.onPayCancel = null;
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
    this.continueNo?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onDecline?.();
    });
    this.paintContinue();

    this.paint(document.querySelector("[data-label=score]"), "SCORE", 10, DIM, CYAN);
    this.paint(document.querySelector("[data-label=xp]"), "XP", 10, DIM, CYAN, "center");
    this.paint(document.querySelector("[data-label=ore]"), "ORE", 10, DIM, CYAN, "center");
    this.paint(document.querySelector("[data-label=pts]"), "LOADOUT", 10, DIM, CYAN, "center");
    this.setXp(0);
    this.setPoints(0);
    this.paint(document.querySelector("[data-label=kills]"), "KILLS", 10, DIM, CYAN, "right");
    this.setKills(0);
    this.paint(document.querySelector("[data-label=ships]"), "SHIPS", 10, DIM, CYAN, "right");
    this.paint(document.querySelector("[data-label=ammo]"), "AMMO", 10, DIM, CYAN, "right");
    this.paint(document.querySelector("[data-label=shield]"), "SHIELD", 10, DIM, CYAN, "right");
    this.paint(document.querySelector("[data-label=special]"), "WHEEL", 10, DIM, CYAN, "right");
    this.paint(this.alertTitle, "HUB UNDER ATTACK", 8, MAGENTA, PINK, "center");
    this.paint(this.padStatus, "GAMEPAD CONNECTED", 10, DIM, CYAN, "right");
    this.paintHelp();
    this.paint(this.deviceTitle, "CONTROLS", 16, CYAN, HOT, "center");
    this.pickDesktop && (this.pickDesktop.innerHTML = vectorTextSvg("OK", 14, CYAN, HOT, "center"));
    this.pickPhone?.classList.add("is-hidden");
    this.pickDesktop?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.remindOpen) this.showPhoneSoon();
      else this.onPickDevice?.("desktop");
    });
    this.pickPhone?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.remindOpen) this.onRemindEmail?.(this.deviceEmail?.value);
      else this.showRemindForm();
    });
    this.deviceEmail?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      this.onRemindEmail?.(this.deviceEmail.value);
    });
    this.shipsLink?.classList.add("is-hidden");
    this.paint(this.controlsLink, "C CONTROLS", 14, DIM, CYAN, "center");
    this.paint(this.boardsLink, "< LEADERBOARDS >", 12, DIM, CYAN, "center");
    this.shipsHeading && (this.shipsHeading.innerHTML = vectorTitleSvg("SHIPS", 36, CYAN, HOT));
    this.paint(this.shipsHint, "ESC RETURN  SPACE START", 11, DIM, CYAN, "center");
    this.paint(this.insertCoin, "INSERT", 12, CYAN, HOT, "center");
    this.insertCoin?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onInsertCoin?.();
    });
    this.payCancel?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onPayCancel?.();
    });
    this.payEmail?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      this.onPayEmail?.(this.payEmail.value);
    });
    this.setCredits(0, false);
  }

  paint(node, text, size, color, hot, align = "left") {
    if (!node) return;
    node.innerHTML = vectorTextSvg(text, size, color, hot, align);
  }

  setScore(value) {
    this.paint(this.score, String(value), 26, CYAN, HOT);
  }

  setXp(value) {
    this.paint(this.xp, String(Math.max(0, Math.floor(Number(value) || 0))), 26, CYAN, HOT, "center");
  }

  setOre(cargo, banked = 0, name = "") {
    this.paint(this.ore, String(cargo), 26, CYAN, HOT, "center");
    if (this.layout === "phone") {
      if (this.hubOre) this.hubOre.innerHTML = "";
      return;
    }
    const line = name ? `HUB ${banked}  ${name}` : banked ? `HUB ${banked}` : "";
    this.paint(this.hubOre, line, 10, DIM, CYAN, "center");
  }

  setCredits(count, freePlay = false) {
    this.creditCount = Math.max(0, Math.floor(Number(count) || 0));
    this.freePlay = Boolean(freePlay);
    document.body.classList.toggle("is-free-play", this.freePlay);
    if (this.credits) this.credits.dataset.count = this.freePlay ? "free" : String(this.creditCount);
    this.paint(
      this.credits,
      this.freePlay ? "FREE PLAY" : `CREDITS  ${this.creditCount}`,
      10,
      this.freePlay || this.creditCount > 0 ? CYAN : DIM,
      this.freePlay || this.creditCount > 0 ? HOT : CYAN,
      "right",
    );
    this.refreshStartPrompt();
  }

  canPlay() {
    return this.freePlay || this.creditCount > 0;
  }

  refreshStartPrompt() {
    if (!this.cta) return;
    if (this.center?.classList.contains("is-wave")) return;
    if (this.center?.classList.contains("is-initials")) return;
    if (this.center?.classList.contains("is-save-pick")) return;
    if (this.shipsPage && !this.shipsPage.classList.contains("is-hidden")) return;
    if (this.controlsPage && !this.controlsPage.classList.contains("is-hidden")) return;
    const ready = this.canPlay();
    const line = ready
      ? this.layout === "phone"
        ? "TAP TO START"
        : "PRESS FIRE"
      : this.phoneDevice
        ? "PLAY ON DESKTOP"
        : "INSERT COIN";
    this.cta.innerHTML = vectorTitleSvg(line, 20, CYAN, HOT);
  }

  setPoints(value) {
    this.paint(this.points, String(Math.max(0, Math.floor(Number(value) || 0))), 26, CYAN, HOT, "center");
  }

  setHigh() {}

  setMusic(value) {
    const pct = musicPctFromVol(value);
    this.paint(this.musicLabel, `MUSIC ${pct}%`, 10, DIM, CYAN, "center");
  }

  setMode(label, options = {}) {
    if (!this.mode) return;
    if (!label) {
      this.mode.hidden = true;
      this.mode.classList.remove("is-warn");
      return;
    }
    this.mode.hidden = false;
    const warn = Boolean(options.warn);
    this.mode.classList.toggle("is-warn", warn);
    const color = warn ? MAGENTA : CYAN;
    const hot = warn ? PINK : HOT;
    this.paint(this.mode, label, label.length > 28 ? 6 : label.length > 16 ? 7 : 11, color, hot, "center");
  }

  setKills(current = 0, banked = 0) {
    const sortie = Math.max(0, Math.floor(Number(current) || 0));
    const bank = Math.max(0, Math.floor(Number(banked) || 0));
    const text = `${sortie}/${bank}`;
    const size = text.length > 7 ? 20 : 26;
    this.paint(this.kills, text, size, CYAN, HOT, "right");
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

  setAmmo(current = 0, max = 1) {
    if (!this.ammoFill) return;
    const pool = Math.max(0.001, max);
    const left = Math.max(0, Number(current) || 0);
    this.ammoFill.style.width = `${Math.round(Math.max(0, Math.min(1, left / pool)) * 100)}%`;
    this.ammoBar?.classList.toggle("is-empty", left <= 0);
  }

  setSpecial(name) {
    if (this.layout === "phone") {
      if (this.special) this.special.innerHTML = "";
      return;
    }
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
      this.help[2] && this.paint(this.help[2], "M MAP  L LOCK  H HOME  P PAUSE  V SAVE  F FULLSCREEN  ESC END RUN", 10, DIM, CYAN, "center");
      this.paint(document.querySelector("[data-label=special]"), "WHEEL", 10, DIM, CYAN, "right");
      return;
    }
    if (this.profile === "gamepad") {
      this.help[0] && this.paint(this.help[0], "LEFT STICK MOVE  RIGHT STICK TURN  X RT FIRE", 11, DIM, CYAN, "center");
      this.help[1] && this.paint(this.help[1], "Y WARP  A EMP  B SHIELD  RB MISSILE", 11, DIM, CYAN, "center");
      this.help[2] && this.paint(this.help[2], "VIEW MAP  L LOCK  P PAUSE  V SAVE  C CONTROLS  ESC END RUN", 10, DIM, CYAN, "center");
      this.paint(document.querySelector("[data-label=special]"), "PAD", 10, DIM, CYAN, "right");
      return;
    }
    if (this.layout === "phone") {
      this.help.forEach((line) => {
        if (line) line.innerHTML = "";
      });
      return;
    }
    this.help[0] && this.paint(this.help[0], "MOUSE AIM  LEFT FIRE  WHEEL FWD WARP  WHEEL BACK EMP  WHEEL BUTTON MISSILE", 11, DIM, CYAN, "center");
    this.help[1] && this.paint(this.help[1], "RIGHT TOGGLE SHIELD  A D STRAFE  W S THRUST  Q E ROTATE", 11, DIM, CYAN, "center");
    this.help[2] && this.paint(this.help[2], "M MAP  L LOCK  H HOME  P PAUSE  V SAVE  F FULLSCREEN  ESC END RUN", 10, DIM, CYAN, "center");
    this.paint(document.querySelector("[data-label=special]"), "WHEEL", 10, DIM, CYAN, "right");
  }

  setLayout(id) {
    this.layout = id === "phone" ? "phone" : "desktop";
    this.shipsLink?.classList.add("is-hidden");
    this.paint(this.controlsLink, this.layout === "phone" ? "CONTROLS" : "C CONTROLS", 14, DIM, CYAN, "center");
    this.paint(this.boardsLink, "< LEADERBOARDS >", 12, DIM, CYAN, "center");
    this.paintHelp();
    this.refreshStartPrompt();
  }

  setProfile(id) {
    this.profile = id || "mouse";
    this.paintHelp();
  }

  showDevicePick() {
    this.showPhoneSoon();
  }

  setPhoneDevice(on) {
    this.phoneDevice = Boolean(on);
    document.body.classList.toggle("is-phone-device", this.phoneDevice);
    this.insertCoin?.classList.toggle("is-hidden", this.phoneDevice);
    this.refreshStartPrompt();
  }

  showPhoneSoon() {
    this.remindOpen = false;
    this.paint(this.deviceTitle, "PLAY 2DSG ON YOUR COMPUTER.", 12, CYAN, HOT, "center");
    this.paint(this.deviceNote, "THE FULL GAME LIVES ON DESKTOP", 8, DIM, CYAN, "center");
    if (this.devicePlay) {
      this.devicePlay.classList.remove("is-hidden");
      this.devicePlay.innerHTML = `<a class="device-url" href="https://www.2dsg.space">${vectorTextSvg("WWW.2DSG.SPACE", 11, CYAN, HOT, "center")}</a>`;
    }
    this.deviceEmail?.classList.add("is-hidden");
    if (this.deviceEmail) this.deviceEmail.value = "";
    this.pickDesktop && (this.pickDesktop.innerHTML = vectorTextSvg("OK", 14, CYAN, HOT, "center"));
    this.pickPhone && (this.pickPhone.innerHTML = vectorTextSvg("REMIND ME", 14, CYAN, HOT, "center"));
    this.pickPhone?.classList.remove("is-hidden");
    this.devicePick?.classList.remove("is-hidden");
  }

  showRemindForm(error = "") {
    this.remindOpen = true;
    this.paint(this.deviceTitle, "REMIND ME", 16, CYAN, HOT, "center");
    this.paint(this.deviceNote, error || "EMAIL YOURSELF THE DESKTOP LINK", 8, error ? MAGENTA : DIM, error ? PINK : CYAN, "center");
    this.devicePlay?.classList.add("is-hidden");
    this.deviceEmail?.classList.remove("is-hidden");
    this.pickDesktop && (this.pickDesktop.innerHTML = vectorTextSvg("BACK", 14, CYAN, HOT, "center"));
    this.pickPhone && (this.pickPhone.innerHTML = vectorTextSvg("SEND", 14, CYAN, HOT, "center"));
    this.pickPhone?.classList.remove("is-hidden");
    this.devicePick?.classList.remove("is-hidden");
    if (error !== "SENDING") queueMicrotask(() => this.deviceEmail?.focus());
  }

  showRemindSent() {
    this.remindOpen = false;
    this.paint(this.deviceTitle, "SENT", 16, CYAN, HOT, "center");
    this.paint(this.deviceNote, "OPEN IT ON YOUR COMPUTER", 8, DIM, CYAN, "center");
    if (this.devicePlay) {
      this.devicePlay.classList.remove("is-hidden");
      this.devicePlay.innerHTML = `<a class="device-url" href="https://www.2dsg.space">${vectorTextSvg("WWW.2DSG.SPACE", 11, CYAN, HOT, "center")}</a>`;
    }
    this.deviceEmail?.classList.add("is-hidden");
    this.pickDesktop && (this.pickDesktop.innerHTML = vectorTextSvg("OK", 14, CYAN, HOT, "center"));
    this.pickPhone?.classList.add("is-hidden");
    this.devicePick?.classList.remove("is-hidden");
  }

  hideDevicePick() {
    this.remindOpen = false;
    this.deviceEmail?.classList.add("is-hidden");
    this.devicePick?.classList.add("is-hidden");
  }

  showPayPortal({ step = "packs", waiting = false, error = "", email = "" } = {}) {
    this.payPortal?.classList.remove("is-hidden");
    this.payRow.innerHTML = "";
    this.payRow.classList.toggle("is-stack", step === "dest");
    this.payEmail?.classList.toggle("is-hidden", step !== "email");
    this.paint(this.payKicker, "2DSG  INSERT CREDITS", 8, DIM, CYAN, "center");
    if (waiting) step = "wait";

    if (step === "dest") {
      this.paint(this.payTitle, "WHERE SHOULD WE SAVE YOUR CREDITS?", 14, CYAN, HOT, "center");
      this.paint(this.payTag, "CHOOSE HOW YOU'D LIKE TO PLAY.", 9, MAGENTA, PINK, "center");
      this.addPayChoice("SAVE MY CREDITS", "Sign in with your email. Your credits will be available on any device.", () => this.onPickDest?.("account"));
      this.addPayChoice("PLAY AS GUEST", "No account needed. Credits stay in this browser and may be lost if its data is cleared.", () => this.onPickDest?.("guest"));
      this.paint(this.payNote, "", 8, DIM, CYAN, "center");
    } else if (step === "email") {
      this.paint(this.payTitle, "SAVE MY CREDITS", 16, CYAN, HOT, "center");
      this.paint(this.payTag, error || "ENTER EMAIL  WE SEND A SIGN-IN LINK", 9, error ? MAGENTA : CYAN, error ? PINK : HOT, "center");
      this.payEmail.value = email || this.payEmail.value || "";
      const send = document.createElement("button");
      send.type = "button";
      send.className = "pay-btn";
      send.innerHTML = vectorTextSvg("SEND LINK", 11, CYAN, HOT, "center");
      send.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.onPayEmail?.(this.payEmail.value);
      });
      this.payRow.appendChild(send);
      this.paint(this.payNote, "NO PASSWORD  LINK EXPIRES IN 15 MIN", 8, DIM, CYAN, "center");
      queueMicrotask(() => this.payEmail?.focus());
    } else if (step === "mail") {
      this.paint(this.payTitle, "CHECK YOUR EMAIL", 16, CYAN, HOT, "center");
      this.paint(this.payTag, "OPEN THE 2DSG LINK TO SIGN IN", 10, MAGENTA, PINK, "center");
      this.paint(this.payNote, email ? `SENT TO  ${email}` : "", 8, DIM, CYAN, "center");
    } else if (step === "wait") {
      this.paint(this.payTitle, "INSERT", 22, CYAN, HOT, "center");
      this.paint(this.payTag, "WAITING FOR PAYMENT", 12, MAGENTA, PINK, "center");
      this.paint(this.payNote, "ALL CREDIT PURCHASES ARE FINAL.", 8, DIM, CYAN, "center");
    } else {
      this.paint(this.payTitle, "INSERT", 22, CYAN, HOT, "center");
      this.paint(this.payTag, error || (email ? `SIGNED IN  ${email}` : "CHOOSE A PACK"), 10, error ? MAGENTA : CYAN, error ? PINK : HOT, "center");
      for (const pack of [
        { sku: "pack5", line: "5 CREDITS  $2" },
        { sku: "pack50", line: "50 CREDITS  $10" },
      ]) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pay-btn";
        btn.innerHTML = vectorTextSvg(pack.line, 11, CYAN, HOT, "center");
        btn.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.onPickPack?.(pack.sku);
        });
        this.payRow.appendChild(btn);
      }
      this.paint(this.payNote, "ALL CREDIT PURCHASES ARE FINAL.", 8, DIM, CYAN, "center");
    }
    this.paint(this.payCancel, "ESC CLOSE", 10, DIM, CYAN, "center");
  }

  addPayChoice(title, copy, onPick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pay-choice";
    btn.innerHTML = `${vectorTextSvg(title, 12, CYAN, HOT, "left")}<p class="pay-copy">${copy}</p>`;
    btn.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onPick?.();
    });
    this.payRow.appendChild(btn);
  }

  hidePayPortal() {
    this.payPortal?.classList.add("is-hidden");
    if (this.payRow) this.payRow.innerHTML = "";
    this.payEmail?.classList.add("is-hidden");
    if (this.payEmail) this.payEmail.value = "";
  }

  showTitle() {
    this.attract(true);
    this.setAttractDemo(false);
    this.center.classList.remove("is-hidden", "is-hub-down");
    this.title.innerHTML = vectorTitleSvg("2DSG", 44, CYAN, HOT, { motion: true, block: true });
    this.applyTrailState();
    this.paint(this.tag, "FLOWSTATE SPACE COMBAT", 12, MAGENTA, PINK, "center");
    this.paint(this.credit, "C 2026 CURIOUS RODEO", 9, DIM, CYAN, "center");
    this.refreshStartPrompt();
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
    this.center.classList.remove("is-hidden", "is-scores", "is-initials", "is-hub-over");
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
    this.waveRow.classList.toggle("is-slots", false);
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
    this.center?.classList.remove("is-wave", "is-save-pick");
    this.wavePick?.classList.add("is-hidden");
  }

  showStartPick(slots, selected) {
    this.attract(true);
    this.setAttractDemo(false);
    this.center.classList.remove("is-hidden", "is-scores", "is-initials", "is-hub-over", "is-save-pick");
    this.center.classList.add("is-wave");
    this.title.innerHTML = "";
    this.paint(this.tag, "START", 18, MAGENTA, PINK, "center");
    this.paintSlotPick(slots, selected, true);
    this.cta.innerHTML = vectorTitleSvg(this.layout === "phone" ? "TAP TO START" : "FIRE START", 18, CYAN, HOT);
    this.paint(this.credit, this.layout === "phone" ? "TAP A CHOICE" : "1-5 SLOT   WHEEL   ESC", 8, DIM, CYAN, "center");
    this.shipsPage?.classList.add("is-hidden");
    this.hideScores();
    this.hideContinue();
    this.setHubAlert(null);
    this.setMode("");
  }

  showSavePick(slots, selected) {
    this.attract(false);
    this.setAttractDemo(false);
    this.center.classList.remove("is-hidden", "is-scores", "is-initials", "is-hub-over");
    this.center.classList.add("is-wave", "is-save-pick");
    this.title.innerHTML = "";
    this.paint(this.tag, "SAVE", 18, MAGENTA, PINK, "center");
    this.paintSlotPick(slots, selected, false);
    this.cta.innerHTML = vectorTitleSvg(this.layout === "phone" ? "TAP A SLOT" : "FIRE SAVE", 18, CYAN, HOT);
    this.paint(this.credit, this.layout === "phone" ? "TAP A SLOT" : "1-5 SLOT   ESC CANCEL", 8, DIM, CYAN, "center");
    this.shipsPage?.classList.add("is-hidden");
    this.hideScores();
    this.hideContinue();
    this.setHubAlert(null);
    this.setMode("SAVE");
  }

  paintSlotPick(slots, selected, includeNew) {
    if (!this.waveRow) return;
    this.waveRow.innerHTML = "";
    this.waveRow.classList.toggle("is-slots", true);
    if (includeNew) {
      const lit = selected === "new";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `wave-btn start-btn${lit ? " is-on" : ""}`;
      btn.innerHTML = vectorTextSvg("NEW GAME", lit ? 14 : 12, lit ? CYAN : DIM, lit ? HOT : CYAN, "center");
      btn.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.onPickStart?.("new");
      });
      this.waveRow.appendChild(btn);
    }
    const list = Array.isArray(slots) ? slots : [];
    for (let i = 0; i < 5; i += 1) {
      const slot = list[i];
      const filled = Boolean(slot?.checkpoint);
      const lit = selected === i;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `wave-btn slot-btn${lit ? " is-on" : ""}${filled ? "" : " is-empty"}`;
      const thumb = document.createElement("span");
      thumb.className = "slot-thumb";
      if (slot?.thumb) {
        const img = document.createElement("img");
        img.alt = "";
        img.src = slot.thumb;
        thumb.appendChild(img);
      }
      const label = document.createElement("span");
      label.className = "slot-label";
      const title = `SLOT ${i + 1}`;
      const sub = filled ? `WAVE  ${slot.wave || slot.checkpoint?.wave || 1}` : "EMPTY";
      label.innerHTML =
        vectorTextSvg(title, lit ? 11 : 10, lit ? CYAN : DIM, lit ? HOT : CYAN, "center") +
        vectorTextSvg(sub, 8, filled ? CYAN : DIM, filled ? HOT : CYAN, "center");
      btn.appendChild(thumb);
      btn.appendChild(label);
      btn.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.onPickStart?.(i);
      });
      this.waveRow.appendChild(btn);
    }
    this.wavePick?.classList.remove("is-hidden");
  }

  showScores(rows, heading = "ALL TIME") {
    this.attract(true);
    this.setAttractDemo(false);
    this.center.classList.remove("is-hidden", "is-initials", "is-hub-over");
    this.center.classList.add("is-scores");
    document.body.classList.add("is-scoreboard");
    this.paintScoreBoard(rows, heading);
    this.paint(this.credit, "C 2026 CURIOUS RODEO", 9, DIM, CYAN, "center");
    this.refreshStartPrompt();
    this.shipsPage?.classList.add("is-hidden");
    this.hideWavePick();
    this.hideContinue();
    this.setHubAlert(null);
    this.setMode("");
  }

  showInitials(score, entry, label = "SCORE", reason = "final") {
    this.attract(true);
    this.setAttractDemo(false);
    this.center.classList.remove("is-hidden", "is-scores");
    this.center.classList.add("is-initials");
    const overLine = reason === "hub" ? "THE HUB HAS FALLEN" : reason === "dead" ? "YOU DIED" : "";
    this.center.classList.toggle("is-hub-over", Boolean(overLine));
    this.hideWavePick();
    document.body.classList.add("is-scoreboard");
    if (overLine) {
      this.title.innerHTML = vectorTitleSvg("GAME OVER", 28, CYAN, HOT);
      this.tag.innerHTML = `${vectorTextSvg(overLine, 14, MAGENTA, PINK, "center")}${vectorTextSvg(`${label}  ${score}`, 10, DIM, CYAN, "center")}`;
    } else {
      this.title.innerHTML = "";
      this.paint(this.tag, `${label}  ${score}`, 14, MAGENTA, PINK, "center");
    }
    this.paintInitials(entry);
    this.paint(this.credit, "TYPE OR ARROWS   ENTER NEXT", 8, DIM, CYAN, "center");
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
    this.center?.classList.remove("is-scores", "is-initials", "is-hub-over");
    this.scoreBoard?.classList.add("is-hidden");
    document.body.classList.remove("is-scoreboard");
  }

  showGameOver(score, reason = "final") {
    this.attract(true);
    this.setAttractDemo(false);
    this.center.classList.remove("is-hidden");
    this.title.innerHTML = vectorTitleSvg("2DSG", 44, CYAN, HOT, { motion: true, block: true });
    this.applyTrailState();
    const line =
      reason === "hub" ? `HUB LOST  ${score}` : reason === "abort" ? `RUN ABORTED  ${score}` : `FINAL  ${score}`;
    this.paint(this.tag, line, 14, MAGENTA, PINK, "center");
    this.paint(this.credit, "C 2026 CURIOUS RODEO", 9, DIM, CYAN, "center");
    this.refreshStartPrompt();
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
      this.alert.classList.remove("is-close", "is-recall");
      return;
    }
    this.alert.hidden = false;
    this.alert.classList.toggle("is-close", Boolean(info.close));
    this.alert.classList.toggle("is-recall", Boolean(info.recall));
    const range = info.range >= 1000 ? `${(info.range / 1000).toFixed(1)}K` : `${Math.round(info.range)}`;
    const color = info.recall || info.close ? AMBER : MAGENTA;
    const hot = info.recall || info.close ? "#ffe0b0" : PINK;
    const title = info.title || "HUB UNDER ATTACK";
    this.paint(this.alertTitle, title, title.length > 18 ? 6 : 8, color, hot, "center");
    const stats = `${info.count} INBOUND  ${range}  SHIELD ${info.shield ?? 0}  HULL ${info.hull}`;
    this.paint(this.alertSub, info.hint ? `${info.hint}   ${stats}` : stats, 7, color, hot, "center");
  }

  paintContinue() {
    this.paint(this.continueTitle, "CONTINUE", 20, CYAN, HOT, "center");
    if (this.continueBtn) this.paint(this.continueBtn, "YES", 18, CYAN, HOT, "center");
    if (this.continueNo) this.paint(this.continueNo, "NO", 18, MAGENTA, PINK, "center");
  }

  showContinue({ ready = true, seconds = 0 } = {}) {
    this.continueRow?.classList.remove("is-hidden");
    this.continueRow?.classList.toggle("is-wait", !ready);
    document.body.classList.add("is-continue");
    if (!ready) {
      this.paint(this.continueTitle, this.phoneDevice ? "PLAY ON DESKTOP" : "ADD CREDIT", 16, CYAN, HOT, "center");
      this.paint(this.continueBtn, String(Math.max(0, Math.ceil(Number(seconds) || 0))), 22, CYAN, HOT, "center");
      if (this.continueNo) this.paint(this.continueNo, "NO", 18, MAGENTA, PINK, "center");
      return;
    }
    this.paintContinue();
  }

  hideContinue() {
    this.continueRow?.classList.add("is-hidden");
    this.continueRow?.classList.remove("is-wait");
    document.body.classList.remove("is-continue");
  }

  showHubDown(lastLife = false) {
    this.attract(false);
    this.setAttractDemo(false);
    this.center.classList.remove("is-hidden", "is-scores", "is-initials", "is-wave", "is-hub-over", "is-save-pick");
    this.center.classList.add("is-hub-down");
    this.title.innerHTML = vectorTitleSvg("HUB WENT DOWN", 28, MAGENTA, PINK);
    const phone = this.layout === "phone";
    const line = lastLife ? (phone ? "TAP TO CONTINUE" : "FIRE TO CONTINUE") : phone ? "TAP TO RESTART WAVE" : "FIRE TO RESTART WAVE";
    this.paint(this.tag, line, 12, CYAN, HOT, "center");
    this.cta.innerHTML = "";
    this.paint(this.credit, "", 8, DIM, CYAN, "center");
    this.shipsPage?.classList.add("is-hidden");
    this.hideWavePick();
    this.hideScores();
    this.hideContinue();
    this.setHubAlert(null);
    this.setMode("HUB WENT DOWN");
  }

  hideHubDown() {
    this.center?.classList.remove("is-hub-down");
    this.center?.classList.add("is-hidden");
    if (this.title) this.title.innerHTML = "";
    if (this.tag) this.tag.innerHTML = "";
    if (this.cta) this.cta.innerHTML = "";
    this.setMode("");
  }

  hideCenter() {
    this.attract(false);
    this.center.classList.add("is-hidden");
    this.center.classList.remove("is-hub-down");
    this.shipsPage?.classList.add("is-hidden");
    this.hideControls();
    this.hideDock();
    this.hideContinue();
    this.hideWavePick();
    this.hideScores();
    this.hidePayPortal();
  }

  showDock(shipId) {
    this.bay.show(shipId);
  }

  hideDock() {
    this.bay.hide();
  }
}
