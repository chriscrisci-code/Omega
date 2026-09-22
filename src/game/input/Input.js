const ROTATE_LEFT = ["ArrowLeft", "KeyQ"];
const ROTATE_RIGHT = ["ArrowRight", "KeyE"];
const FORWARD = ["ArrowUp", "KeyW"];
const BACK = ["ArrowDown", "KeyS"];
const STRAFE_LEFT = ["KeyA"];
const STRAFE_RIGHT = ["KeyD"];
const FIRE = ["Space"];
const SHIELD = ["ShiftLeft", "ShiftRight"];
const START = ["Space", "Enter"];
const FULLSCREEN = ["KeyF"];
const QUIT = ["Escape"];
const MAP = ["KeyM"];
const HOME = ["KeyH"];
const HOLD = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

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
    this._pointerStart = false;
    this._warpTicks = 0;
    this._empTicks = 0;
    this._missileTicks = 0;
    this._shieldTick = false;
    this._shipsClick = false;
    this._continueClick = false;
    this.layout = "desktop";
    this.touchSurge = 0;
    this.touchStrafe = 0;
    this.touchRotate = 0;
    this.touchFire = false;

    this.onKeyDown = (event) => {
      if (HOLD.has(event.code)) event.preventDefault();
      if (!this.keys.has(event.code)) this.pressed.add(event.code);
      this.keys.add(event.code);
    };
    this.onKeyUp = (event) => this.keys.delete(event.code);
    this.onBlur = () => this.keys.clear();
    this.onPointerMove = (event) => {
      if (this.layout === "phone") return;
      this.mouseX = event.clientX;
      this.mouseY = event.clientY;
      this.hasPointer = true;
    };
    this.onPointerDown = (event) => {
      if (this.layout === "phone") return;
      this.hasPointer = true;
      this.mouseX = event.clientX;
      this.mouseY = event.clientY;
      if (event.button === 0) {
        this.leftHeld = true;
        this._pointerStart = true;
      }
      if (event.button === 1) {
        event.preventDefault();
        this._missileTicks += 1;
      }
      if (event.button === 2) {
        this.rightHeld = true;
        this._shieldTick = true;
      }
    };
    this.onAuxClick = (event) => {
      if (event.button !== 1) return;
      event.preventDefault();
      this._missileTicks += 1;
    };
    this.onPointerUp = (event) => {
      if (event.button === 0) this.leftHeld = false;
      if (event.button === 2) this.rightHeld = false;
    };
    this.onContextMenu = (event) => event.preventDefault();
    this.onWheel = (event) => {
      if (this.layout === "phone") return;
      event.preventDefault();
      this.hasPointer = true;
      if (event.deltaY < 0) this._warpTicks += 1;
      else if (event.deltaY > 0) this._empTicks += 1;
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
    if (this.anyDown(ROTATE_LEFT)) value -= 1;
    if (this.anyDown(ROTATE_RIGHT)) value += 1;
    const pad = this.pad();
    value += this.axis(pad, 2);
    if (this.button(pad, 4) || this.button(pad, 14)) value -= 1;
    if (this.button(pad, 5) || this.button(pad, 15)) value += 1;
    return clamp(value, -1, 1);
  }

  get surge() {
    let value = this.touchSurge;
    if (this.anyDown(FORWARD)) value += 1;
    if (this.anyDown(BACK)) value -= 1;
    const pad = this.pad();
    value -= this.axis(pad, 1);
    if (this.button(pad, 7) || this.button(pad, 0)) value += 1;
    return clamp(value, -1, 1);
  }

  get strafe() {
    let value = this.touchStrafe;
    if (this.anyDown(STRAFE_LEFT)) value -= 1;
    if (this.anyDown(STRAFE_RIGHT)) value += 1;
    const pad = this.pad();
    value += this.axis(pad, 0);
    return clamp(value, -1, 1);
  }

  get fireHeld() {
    if (this.layout === "phone") return this.touchFire;
    const pad = this.pad();
    return this.anyDown(FIRE) || (this.leftHeld && !this.mapHeld) || this.button(pad, 2) || this.button(pad, 6);
  }

  get selectPressed() {
    return this._pointerStart;
  }

  get shieldPressed() {
    const pad = this.pad();
    return this._shieldTick || this.anyPressed(SHIELD) || this.buttonPressed(1);
  }

  get firePressed() {
    if (this.layout === "phone") return this.touchFire;
    const pad = this.pad();
    return this.anyPressed(FIRE) || (this._pointerStart && !this.mapHeld) || this.buttonPressed(2) || this.buttonPressed(6);
  }

  get startPressed() {
    if (this._shipsClick) return false;
    const pad = this.pad();
    return (
      this.anyPressed(START) ||
      this.buttonPressed(0) ||
      this.buttonPressed(2) ||
      this.buttonPressed(9) ||
      this._pointerStart
    );
  }

  get startKeyPressed() {
    const pad = this.pad();
    return this.anyPressed(START) || this.buttonPressed(0) || this.buttonPressed(2) || this.buttonPressed(9);
  }

  get shipsPressed() {
    return this.anyPressed(["KeyS"]) || this._shipsClick;
  }

  get continueClick() {
    return this._continueClick;
  }

  get fullscreenPressed() {
    return this.anyPressed(FULLSCREEN);
  }

  get quitPressed() {
    return this.anyPressed(QUIT);
  }

  get letterLeft() {
    return this.anyPressed(ROTATE_LEFT) || this.anyPressed(STRAFE_LEFT) || this._empTicks > 0;
  }

  get letterRight() {
    return this.anyPressed(ROTATE_RIGHT) || this.anyPressed(STRAFE_RIGHT) || this._warpTicks > 0;
  }

  get warpPressed() {
    return this._warpTicks > 0;
  }

  get empPressed() {
    return this._empTicks > 0;
  }

  get missilePressed() {
    return this._missileTicks > 0 || this.buttonPressed(3);
  }

  get mapHeld() {
    return this.anyDown(MAP);
  }

  get homePressed() {
    return this.anyPressed(HOME);
  }

  endFrame() {
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
    this._continueClick = false;
  }
}
