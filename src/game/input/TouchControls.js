const DEAD = 0.16;
const FIRE_FWD = 0.22;
const REACH = 54;
const TAP_MS = 280;
const TAP_DIST = 28;
const DOUBLE_MS = 380;
const FLICK_MS = 240;
const FLICK_MIN = 0.84;
const FLICK_SLIP = 0.26;
const TURN_EXPO = 2.4;
const TURN_TIME = 0.58;
const TURN_START = 0.16;
const PAD_AXES = {
  up: { up: true },
  down: { down: true },
  left: { left: true },
  right: { right: true },
  "up-left": { up: true, left: true },
  "up-right": { up: true, right: true },
  "down-left": { down: true, left: true },
  "down-right": { down: true, right: true },
};
const DIRS = Object.keys(PAD_AXES);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export class TouchControls {
  constructor(input) {
    this.input = input;
    this.active = false;
    this.layer = document.querySelector("#touch-layer");
    this.sight = document.querySelector("#touch-sight");
    this.dirs = Object.fromEntries(DIRS.map((dir) => [dir, false]));
    this.dirIds = Object.fromEntries(DIRS.map((dir) => [dir, null]));
    this.dirBtns = {};
    this.bindPad(document.querySelector("#stick-move"));
    this.turn = this.bindStick(document.querySelector("#stick-turn"), "turn");
    this.stickIds = new Set();
    this.fingers = new Map();
    this.twoFinger = null;
    this.firing = false;
    this.screenTap = null;

    this.onStart = (event) => this.touchStart(event);
    this.onMove = (event) => this.touchMove(event);
    this.onEnd = (event) => this.touchEnd(event);
    window.addEventListener("pointerdown", this.onStart, true);
    window.addEventListener("pointermove", this.onMove, true);
    window.addEventListener("pointerup", this.onEnd, true);
    window.addEventListener("pointercancel", this.onEnd, true);
    window.addEventListener("touchmove", (event) => {
      if (this.active) event.preventDefault();
    }, { passive: false });
  }

  setActive(on) {
    this.active = Boolean(on);
    this.layer?.classList.toggle("is-hidden", !this.active);
    document.body.classList.toggle("is-phone", this.active);
    if (!this.active) this.reset();
  }

  bindPad(root) {
    if (!root) return;
    for (const btn of root.querySelectorAll(".touch-dir")) {
      const dir = btn.dataset.dir;
      if (!DIRS.includes(dir)) continue;
      this.dirBtns[dir] = btn;
      const grab = (event) => {
        if (!this.active || event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        this.stickIds.add(event.pointerId);
        this.dirIds[dir] = event.pointerId;
        btn.setPointerCapture?.(event.pointerId);
        this.dirs[dir] = true;
        btn.classList.add("is-on");
        this.syncAxes();
      };
      const drop = (event) => {
        if (this.dirIds[dir] !== event.pointerId) return;
        this.stickIds.delete(event.pointerId);
        this.dirIds[dir] = null;
        this.dirs[dir] = false;
        btn.classList.remove("is-on");
        this.syncAxes();
      };
      btn.addEventListener("pointerdown", grab);
      btn.addEventListener("pointerup", drop);
      btn.addEventListener("pointercancel", drop);
    }
  }

  bindStick(root, role) {
    if (!root) return null;
    const knob = root.querySelector(".stick-knob");
    const state = { root, knob, role, id: null, x: 0, y: 0, heldAt: 0 };
    const grab = (event) => {
      if (!this.active || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      state.id = event.pointerId;
      state.heldAt = performance.now();
      this.stickIds.add(event.pointerId);
      root.setPointerCapture?.(event.pointerId);
      this.nudgeStick(state, event.clientX, event.clientY);
    };
    const drag = (event) => {
      if (state.id !== event.pointerId) return;
      event.preventDefault();
      this.nudgeStick(state, event.clientX, event.clientY);
    };
    const drop = (event) => {
      if (state.id !== event.pointerId) return;
      if (role === "turn") this.releaseTurn(state);
      this.stickIds.delete(event.pointerId);
      state.id = null;
      state.x = 0;
      state.y = 0;
      if (knob) knob.style.transform = "translate(-50%, -50%)";
      this.syncAxes();
    };
    root.addEventListener("pointerdown", grab);
    root.addEventListener("pointermove", drag);
    root.addEventListener("pointerup", drop);
    root.addEventListener("pointercancel", drop);
    return state;
  }

  nudgeStick(state, cx, cy) {
    const box = state.root.getBoundingClientRect();
    const ox = box.left + box.width / 2;
    const oy = box.top + box.height / 2;
    let dx = cx - ox;
    let dy = cy - oy;
    const mag = Math.hypot(dx, dy) || 1;
    if (mag > REACH) {
      dx = (dx / mag) * REACH;
      dy = (dy / mag) * REACH;
    }
    state.x = dx / REACH;
    state.y = dy / REACH;
    if (state.knob) state.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this.syncAxes();
  }

  releaseTurn(state) {
    const held = performance.now() - state.heldAt;
    if (held >= 50 && held <= FLICK_MS && Math.abs(state.x) <= FLICK_SLIP) {
      if (-state.y >= FLICK_MIN) {
        this.input.emitGesture("flickFwd");
        return;
      }
      if (state.y >= FLICK_MIN) {
        this.input.emitGesture("flickBack");
        return;
      }
    }
  }

  syncAxes() {
    const turn = this.turn;
    let surge = 0;
    let strafe = 0;
    let rotate = 0;
    const axes = { up: false, down: false, left: false, right: false };
    for (const dir of DIRS) {
      if (!this.dirs[dir]) continue;
      const spec = PAD_AXES[dir];
      if (spec.up) axes.up = true;
      if (spec.down) axes.down = true;
      if (spec.left) axes.left = true;
      if (spec.right) axes.right = true;
    }
    if (axes.up) surge += 1;
    if (axes.down) surge -= 1;
    if (axes.right) strafe += 1;
    if (axes.left) strafe -= 1;
    if (turn && Math.abs(turn.x) > DEAD) rotate = this.turnForce(turn);
    this.firing = Boolean(this.input.hasGesture("stickFire") && turn && -turn.y > FIRE_FWD);
    this.input.touchStrafe = clamp(strafe, -1, 1);
    this.input.touchSurge = clamp(surge, -1, 1);
    this.input.touchRotate = clamp(rotate, -1, 1);
    this.syncFire();
  }

  turnForce(turn) {
    const span = 1 - DEAD;
    const throwAmt = clamp((Math.abs(turn.x) - DEAD) / span, 0, 1);
    const throwGain = throwAmt ** TURN_EXPO;
    const held = (performance.now() - turn.heldAt) / 1000;
    const timeAmt = clamp(held / TURN_TIME, 0, 1);
    const timeGain = TURN_START + (1 - TURN_START) * timeAmt ** 1.35;
    return Math.sign(turn.x) * throwGain * timeGain;
  }

  tick() {
    if (!this.active || !this.turn?.id) return;
    this.syncAxes();
  }

  syncFire() {
    this.input.touchFire = this.firing;
  }

  touchStart(event) {
    if (!this.active || (event.pointerType === "mouse" && event.button !== 0)) return;
    if (event.target?.closest?.(".stick, .device-pick, .dock-bay, .continue-btn, .continue-row, .ships-link, #controls-link, #controls-page, #music-vol, .wave-pick, .wave-btn")) return;
    if (this.stickIds.has(event.pointerId)) return;
    this.fingers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      t: performance.now(),
      px: event.clientX,
      py: event.clientY,
    });
    if (this.fingers.size === 2) this.twoFinger = { t: performance.now(), moved: false };
  }

  touchMove(event) {
    if (!this.active) return;
    const finger = this.fingers.get(event.pointerId);
    if (!finger) return;
    finger.px = event.clientX;
    finger.py = event.clientY;
    if (this.twoFinger && this.fingers.size >= 2 && dist(finger.x, finger.y, event.clientX, event.clientY) > 22) {
      this.twoFinger.moved = true;
    }
  }

  touchEnd(event) {
    if (!this.active) return;
    const finger = this.fingers.get(event.pointerId);
    this.fingers.delete(event.pointerId);
    if (this.twoFinger && this.fingers.size === 0) {
      const held = performance.now() - this.twoFinger.t;
      if (!this.twoFinger.moved && held < TAP_MS + 80) this.input.emitGesture("twoFinger");
      this.twoFinger = null;
      this.screenTap = null;
      return;
    }
    if (!finger || this.fingers.size) return;
    const now = performance.now();
    const dt = now - finger.t;
    const travel = dist(finger.x, finger.y, finger.px, finger.py);
    if (dt >= TAP_MS || travel >= TAP_DIST) return;
    const tap = this.screenTap;
    if (tap && now - tap.t <= DOUBLE_MS && dist(tap.x, tap.y, finger.x, finger.y) < TAP_DIST * 2.5) {
      this.input.emitGesture("doubleTap");
      this.screenTap = null;
      return;
    }
    this.screenTap = { t: now, x: finger.x, y: finger.y };
    this.input._pointerStart = true;
  }

  reset() {
    this.fingers.clear();
    this.stickIds.clear();
    this.twoFinger = null;
    this.firing = false;
    this.screenTap = null;
    this.input.touchFire = false;
    this.input.touchSurge = 0;
    this.input.touchStrafe = 0;
    this.input.touchRotate = 0;
    this.sight?.classList.add("is-hidden");
    for (const dir of DIRS) {
      this.dirs[dir] = false;
      this.dirIds[dir] = null;
      this.dirBtns[dir]?.classList.remove("is-on");
    }
    if (this.turn) {
      this.turn.id = null;
      this.turn.x = 0;
      this.turn.y = 0;
      if (this.turn.knob) this.turn.knob.style.transform = "translate(-50%, -50%)";
    }
  }
}
