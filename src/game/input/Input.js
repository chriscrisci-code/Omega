import { ACTIONS, aimMode, bindId, cleanBind, cloneBinds, normalizeBinds } from "./bindings.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hudControl(event) {
  const node = event.target;
  if (!(node instanceof Element)) return false;
  return Boolean(
    node.closest(
      "button, a, input, #dock-bay, #device-pick, #wave-pick, #continue-btn, #ships-link, #controls-link, #controls-page, .touch-layer",
    ),
  );
}

const CORNER = 72;

export class Input {
  constructor(target = window) {
    this.keys = new Set();
    this.pressed = new Set();
    this.prevPad = [];
    this.padConnected = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.hasPointer = false;
    this.leftHeld = false;
    this.rightHeld = false;
    this.mouseHeld = { 0: false, 1: false, 2: false };
    this._pointerStart = false;
    this._warpTicks = 0;
    this._empTicks = 0;
    this._missileTicks = 0;
    this._shieldTick = false;
    this._shipsClick = false;
    this._controlsClick = false;
    this._continueClick = false;
    this.layout = "desktop";
    this.profile = "mouse";
    this.binds = cloneBinds("mouse");
    this.touchSurge = 0;
    this.touchStrafe = 0;
    this.touchRotate = 0;
    this.touchFire = false;
    this.wheelAcc = 0;
    this.wheelAt = 0;
    this.wheelLock = 0;
    this.fineWheel = false;
    this.capture = "";
    this.onCapture = null;
    this.tapAt = 0;
    this.tapX = 0;
    this.tapY = 0;

    this.onKeyDown = (event) => {
      if (this.holdCodes().has(event.code)) event.preventDefault();
      if (this.capture) {
        event.preventDefault();
        this.finishCapture({ t: "key", c: event.code });
        return;
      }
      if (!this.keys.has(event.code)) this.pressed.add(event.code);
      this.keys.add(event.code);
    };
    this.onKeyUp = (event) => this.keys.delete(event.code);
    this.onBlur = () => this.keys.clear();
    this.onPointerMove = (event) => {
      if (this.layout === "phone") return;
      this.mouseX = event.clientX;
      this.mouseY = event.clientY;
      if (this.aimMode === "mouse") this.hasPointer = true;
    };
    this.onPointerDown = (event) => {
      if (this.capture) {
        if (hudControl(event) && !event.target.closest?.("#controls-page")) return;
        event.preventDefault();
        this.finishCapture({ t: "mouse", b: event.button });
        return;
      }
      if (this.layout === "phone") return;
      if (hudControl(event)) return;
      if (this.aimMode === "mouse") this.hasPointer = true;
      this.mouseX = event.clientX;
      this.mouseY = event.clientY;
      this.mouseHeld[event.button] = true;
      if (event.button === 0) {
        this.leftHeld = true;
        this._pointerStart = true;
      }
      if (event.button === 1) event.preventDefault();
      if (event.button === 2) this.rightHeld = true;
      this.fireMouse(event.button);
      this.fireCorner(event.clientX, event.clientY);
      this.noteTap(event);
    };
    this.onAuxClick = (event) => {
      if (event.button !== 1) return;
      event.preventDefault();
      if (this.capture) this.finishCapture({ t: "mouse", b: 1 });
    };
    this.onPointerUp = (event) => {
      this.mouseHeld[event.button] = false;
      if (event.button === 0) this.leftHeld = false;
      if (event.button === 2) this.rightHeld = false;
    };
    this.onContextMenu = (event) => event.preventDefault();
    this.onWheel = (event) => {
      if (this.layout === "phone" && !this.capture) return;
      event.preventDefault();
      const dir = event.deltaY < 0 ? -1 : 1;
      if (this.capture) {
        this.finishCapture({ t: "wheel", d: dir });
        return;
      }
      if (this.aimMode === "mouse") this.hasPointer = true;
      const now = performance.now();
      if (now < this.wheelLock) return;
      let dy = event.deltaY;
      if (event.deltaMode === 1) dy *= 16;
      if (event.deltaMode === 2) dy *= 120;
      if (now - this.wheelAt > 320) this.wheelAcc = 0;
      this.wheelAt = now;
      if (this.wheelAcc && Math.sign(dy) !== Math.sign(this.wheelAcc)) this.wheelAcc = 0;
      this.wheelAcc += dy;
      const need = this.fineWheel ? 48 : 280;
      const lock = this.fineWheel ? 70 : 520;
      if (this.wheelAcc <= -need) {
        this.emitWheel(-1);
        this.wheelAcc = 0;
        this.wheelLock = now + lock;
      } else if (this.wheelAcc >= need) {
        this.emitWheel(1);
        this.wheelAcc = 0;
        this.wheelLock = now + lock;
      }
    };

    target.addEventListener("keydown", this.onKeyDown);
    target.addEventListener("keyup", this.onKeyUp);
    target.addEventListener("blur", this.onBlur);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerdown", this.onPointerDown, true);
    window.addEventListener("auxclick", this.onAuxClick, true);
    window.addEventListener("mousedown", this.onPointerDown, true);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("contextmenu", this.onContextMenu);
    window.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("pointerleave", () => {
      this.hasPointer = false;
      this.leftHeld = false;
      this.rightHeld = false;
    });
    window.addEventListener("gamepadconnected", () => {
      this.padConnected = true;
    });
    window.addEventListener("gamepaddisconnected", () => {
      this.padConnected = navigator.getGamepads?.().some(Boolean) ?? false;
    });
  }

  setBinds(profile, binds) {
    this.profile = profile;
    this.binds = normalizeBinds(profile, binds);
  }

  list(id) {
    return this.binds[id] || [];
  }

  has(id, test) {
    return this.list(id).some(test);
  }

  get aimMode() {
    return aimMode(this.binds);
  }

  holdCodes() {
    const codes = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
    for (const row of ACTIONS) {
      for (const bind of this.list(row.id)) {
        if (bind.t === "key") codes.add(bind.c);
      }
    }
    return codes;
  }

  emit(id) {
    if (id === "warp") this._warpTicks += 1;
    else if (id === "emp") this._empTicks += 1;
    else if (id === "missile") this._missileTicks += 1;
    else if (id === "shield") this._shieldTick = true;
    else if (id === "fire") this.touchFire = true;
    else if (id === "home") this.pressed.add("__home__");
    else if (id === "map") this.keys.add("__map__");
  }

  emitWheel(dir) {
    for (const row of ACTIONS) {
      if (this.has(row.id, (bind) => bind.t === "wheel" && bind.d === dir)) this.emit(row.id);
    }
  }

  fireMouse(button) {
    for (const row of ACTIONS) {
      if (!this.has(row.id, (bind) => bind.t === "mouse" && bind.b === button)) continue;
      if (row.id === "fire") continue;
      this.emit(row.id);
    }
  }

  fireCorner(x, y) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    let id = "";
    if (x <= CORNER && y <= CORNER) id = "tl";
    else if (x >= w - CORNER && y <= CORNER) id = "tr";
    else if (x <= CORNER && y >= h - CORNER) id = "bl";
    else if (x >= w - CORNER && y >= h - CORNER) id = "br";
    if (!id) return;
    for (const row of ACTIONS) {
      if (this.has(row.id, (bind) => bind.t === "corner" && bind.c === id)) this.emit(row.id);
    }
  }

  noteTap(event) {
    if (event.button !== 0) return;
    const now = performance.now();
    if (now - this.tapAt < 320 && Math.hypot(event.clientX - this.tapX, event.clientY - this.tapY) < 28) {
      this.emitGesture("doubleTap");
      this.tapAt = 0;
      return;
    }
    this.tapAt = now;
    this.tapX = event.clientX;
    this.tapY = event.clientY;
  }

  emitGesture(name) {
    for (const row of ACTIONS) {
      if (this.has(row.id, (bind) => bind.t === "gesture" && bind.g === name)) this.emit(row.id);
    }
  }

  hasGesture(name) {
    return ACTIONS.some((row) => this.has(row.id, (bind) => bind.t === "gesture" && bind.g === name));
  }

  finishCapture(bind) {
    const clean = cleanBind(bind);
    if (!clean || !this.capture) return;
    this.onCapture?.(this.capture, clean);
    this.capture = "";
  }

  listen(id) {
    this.capture = id;
  }

  addBind(id, bind) {
    const clean = cleanBind(bind);
    if (!clean) return;
    const list = this.list(id);
    if (clean.t === "aim") this.binds[id] = [clean];
    else if (!list.some((item) => bindId(item) === bindId(clean))) list.push(clean);
  }

  dropBind(id, key) {
    this.binds[id] = this.list(id).filter((bind) => bindId(bind) !== key);
  }

  pad() {
    const pads = navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (pad) return pad;
    }
    return null;
  }

  axis(pad, index, dead = 0.28) {
    if (!pad) return 0;
    const value = pad.axes[index] ?? 0;
    return Math.abs(value) > dead ? value : 0;
  }

  button(pad, index) {
    return Boolean(pad?.buttons[index]?.pressed);
  }

  buttonPressed(index) {
    const pad = this.pad();
    return this.button(pad, index) && !this.prevPad[index];
  }

  anyDown(codes) {
    return codes.some((code) => this.keys.has(code));
  }

  anyPressed(codes) {
    return codes.some((code) => this.pressed.has(code));
  }

  keysDown(id) {
    return this.list(id).some((bind) => bind.t === "key" && this.keys.has(bind.c));
  }

  keysPressed(id) {
    return this.list(id).some((bind) => bind.t === "key" && this.pressed.has(bind.c));
  }

  mouseDown(id) {
    return this.list(id).some((bind) => bind.t === "mouse" && this.mouseHeld[bind.b]);
  }

  padDown(id) {
    const pad = this.pad();
    if (!pad) return false;
    return this.list(id).some((bind) => bind.t === "pad" && this.button(pad, bind.b));
  }

  padEdge(id) {
    const pad = this.pad();
    if (!pad) return false;
    return this.list(id).some((bind) => bind.t === "pad" && this.button(pad, bind.b) && !this.prevPad[bind.b]);
  }

  axisValue(id) {
    const pad = this.pad();
    if (!pad) return 0;
    let value = 0;
    for (const bind of this.list(id)) {
      if (bind.t !== "axis") continue;
      const n = this.axis(pad, bind.a) * bind.s;
      if (n > 0) value += n;
    }
    return value;
  }

  setLayout(id) {
    this.layout = id === "phone" ? "phone" : "desktop";
    if (this.layout !== "phone") {
      this.touchSurge = 0;
      this.touchStrafe = 0;
      this.touchRotate = 0;
      this.touchFire = false;
    }
  }

  get rotate() {
    let value = this.touchRotate;
    if (this.keysDown("turnL")) value -= 1;
    if (this.keysDown("turnR")) value += 1;
    if (this.padDown("turnL")) value -= 1;
    if (this.padDown("turnR")) value += 1;
    value -= this.axisValue("turnL");
    value += this.axisValue("turnR");
    return clamp(value, -1, 1);
  }

  get surge() {
    let value = this.touchSurge;
    if (this.keysDown("thrust")) value += 1;
    if (this.keysDown("reverse")) value -= 1;
    if (this.padDown("thrust")) value += 1;
    if (this.padDown("reverse")) value -= 1;
    value += this.axisValue("thrust");
    value -= this.axisValue("reverse");
    return clamp(value, -1, 1);
  }

  get strafe() {
    let value = this.touchStrafe;
    if (this.keysDown("strafeL")) value -= 1;
    if (this.keysDown("strafeR")) value += 1;
    if (this.padDown("strafeL")) value -= 1;
    if (this.padDown("strafeR")) value += 1;
    value -= this.axisValue("strafeL");
    value += this.axisValue("strafeR");
    return clamp(value, -1, 1);
  }

  get fireHeld() {
    if (this.layout === "phone") return this.touchFire || this.keysDown("fire") || this.padDown("fire");
    return this.keysDown("fire") || this.mouseDown("fire") || this.padDown("fire") || (this.leftHeld && this.has("fire", (bind) => bind.t === "mouse" && bind.b === 0) && !this.mapHeld);
  }

  get selectPressed() {
    return this._pointerStart;
  }

  get shieldPressed() {
    return this._shieldTick || this.keysPressed("shield") || this.padEdge("shield");
  }

  get firePressed() {
    if (this.layout === "phone") return this.touchFire;
    return this.keysPressed("fire") || this.padEdge("fire") || (this._pointerStart && this.has("fire", (bind) => bind.t === "mouse" && bind.b === 0) && !this.mapHeld);
  }

  get startPressed() {
    if (this._shipsClick || this._controlsClick) return false;
    return this.keysPressed("fire") || this.anyPressed(["Space", "Enter"]) || this.padEdge("fire") || this.buttonPressed(0) || this.buttonPressed(9) || this._pointerStart;
  }

  get startKeyPressed() {
    return this.keysPressed("fire") || this.anyPressed(["Space", "Enter"]) || this.padEdge("fire") || this.buttonPressed(0) || this.buttonPressed(9);
  }

  get shipsPressed() {
    return this.anyPressed(["KeyS"]) || this._shipsClick;
  }

  get controlsPressed() {
    return this.anyPressed(["KeyC"]) || this._controlsClick;
  }

  get continueClick() {
    return this._continueClick;
  }

  get fullscreenPressed() {
    return this.keysPressed("fullscreen");
  }

  get quitPressed() {
    return this.keysPressed("quit") || this.anyPressed(["Escape"]);
  }

  get letterLeft() {
    return this.keysPressed("turnL") || this.keysPressed("strafeL") || this.anyPressed(["ArrowDown"]) || this._empTicks > 0;
  }

  get letterRight() {
    return this.keysPressed("turnR") || this.keysPressed("strafeR") || this.anyPressed(["ArrowUp"]) || this._warpTicks > 0;
  }

  get warpPressed() {
    return this._warpTicks > 0 || this.keysPressed("warp") || this.padEdge("warp");
  }

  get empPressed() {
    return this._empTicks > 0 || this.keysPressed("emp") || this.padEdge("emp");
  }

  get missilePressed() {
    return this._missileTicks > 0 || this.keysPressed("missile") || this.padEdge("missile");
  }

  get mapHeld() {
    return this.keysDown("map") || this.padDown("map") || this.keys.has("__map__");
  }

  get homePressed() {
    return this.keysPressed("home") || this.padEdge("home") || this.pressed.has("__home__");
  }

  pollCapturePad() {
    if (!this.capture) return;
    const pad = this.pad();
    if (!pad) return;
    for (let i = 0; i < pad.buttons.length; i += 1) {
      if (pad.buttons[i]?.pressed && !this.prevPad[i]) {
        this.finishCapture({ t: "pad", b: i });
        return;
      }
    }
    for (let i = 0; i < pad.axes.length; i += 1) {
      const n = pad.axes[i] ?? 0;
      if (n <= -0.7) {
        this.finishCapture({ t: "axis", a: i, s: -1 });
        return;
      }
      if (n >= 0.7) {
        this.finishCapture({ t: "axis", a: i, s: 1 });
        return;
      }
    }
  }

  endFrame() {
    this.pollCapturePad();
    const pad = this.pad();
    this.prevPad = pad ? pad.buttons.map((button) => button.pressed) : [];
    this.padConnected = Boolean(pad);
    this.pressed.clear();
    this._pointerStart = false;
    this._warpTicks = 0;
    this._empTicks = 0;
    this._missileTicks = 0;
    this._shieldTick = false;
    this._shipsClick = false;
    this._controlsClick = false;
    this._continueClick = false;
    this.keys.delete("__map__");
  }
}
