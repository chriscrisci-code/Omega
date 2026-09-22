const DEAD = 0.16;
const REACH = 54;
const TAP_MS = 280;
const TAP_DIST = 28;
const SWIPE_MS = 420;
const SWIPE_MIN = 72;
const SWIPE_SLIP = 56;

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
    this.move = this.bindStick(document.querySelector("#stick-move"), "move");
    this.turn = this.bindStick(document.querySelector("#stick-turn"), "turn");
    this.stickIds = new Set();
    this.fingers = new Map();
    this.lastTap = null;
    this.aiming = false;
    this.aimId = null;
    this.twoFinger = null;

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

  bindStick(root, role) {
    if (!root) return null;
    const knob = root.querySelector(".stick-knob");
    const well = root.querySelector(".stick-well");
    const state = { root, knob, well, id: null, x: 0, y: 0 };
    const grab = (event) => {
      if (!this.active || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      state.id = event.pointerId;
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
    state.role = role;
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

  syncAxes() {
    const move = this.move;
    const turn = this.turn;
    let surge = 0;
    let strafe = 0;
    let rotate = 0;
    if (move) {
      if (Math.abs(move.x) > DEAD) strafe = move.x;
      if (Math.abs(move.y) > DEAD) surge = -move.y;
    }
    if (turn && Math.abs(turn.x) > DEAD) rotate = turn.x;
    this.input.touchStrafe = clamp(strafe, -1, 1);
    this.input.touchSurge = clamp(surge, -1, 1);
    this.input.touchRotate = clamp(rotate, -1, 1);
  }

  onStick(id) {
    return this.stickIds.has(id);
  }

  touchStart(event) {
    if (!this.active || event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target?.closest?.(".stick, .device-pick, .dock-bay, .continue-btn, .ships-link")) return;
    if (this.onStick(event.pointerId)) return;
    this.fingers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      t: performance.now(),
      px: event.clientX,
      py: event.clientY,
    });
    if (this.fingers.size === 2) {
      this.twoFinger = { t: performance.now(), moved: false };
      return;
    }
    if (this.fingers.size !== 1) return;
    const now = performance.now();
    const tap = this.lastTap;
    if (tap && now - tap.t < TAP_MS && dist(tap.x, tap.y, event.clientX, event.clientY) < TAP_DIST * 2) {
      this.aiming = true;
      this.aimId = event.pointerId;
      this.lastTap = null;
      this.aimTo(event.clientX, event.clientY, true);
    }
  }

  touchMove(event) {
    if (!this.active) return;
    const finger = this.fingers.get(event.pointerId);
    if (!finger) return;
    finger.px = event.clientX;
    finger.py = event.clientY;
    if (this.twoFinger && this.fingers.size >= 2) {
      const start = [...this.fingers.values()][0];
      if (start && dist(start.x, start.y, event.clientX, event.clientY) > 22) this.twoFinger.moved = true;
    }
    if (this.aiming && event.pointerId === this.aimId) this.aimTo(event.clientX, event.clientY, true);
  }

  touchEnd(event) {
    if (!this.active) return;
    const finger = this.fingers.get(event.pointerId);
    this.fingers.delete(event.pointerId);
    if (this.aiming && event.pointerId === this.aimId) {
      this.aiming = false;
      this.aimId = null;
      this.input.touchFire = false;
      this.sight?.classList.add("is-hidden");
    }
    if (this.twoFinger && this.fingers.size === 0) {
      const held = performance.now() - this.twoFinger.t;
      if (!this.twoFinger.moved && held < TAP_MS + 80) this.input._missileTicks += 1;
      this.twoFinger = null;
      return;
    }
    if (!finger || this.aiming) return;
    const dt = performance.now() - finger.t;
    const dx = finger.px - finger.x;
    const dy = finger.py - finger.y;
    if (dt < SWIPE_MS && Math.abs(dy) >= SWIPE_MIN && Math.abs(dx) < SWIPE_SLIP) {
      if (dy < 0) this.input._warpTicks += 1;
      else this.input._empTicks += 1;
      this.lastTap = null;
      return;
    }
    if (dt < TAP_MS && Math.hypot(dx, dy) < TAP_DIST) {
      this.lastTap = { t: performance.now(), x: finger.x, y: finger.y };
      this.input._pointerStart = true;
    }
  }

  aimTo(x, y, fire) {
    this.input.mouseX = x;
    this.input.mouseY = y;
    this.input.hasPointer = true;
    this.input.touchFire = Boolean(fire);
    if (this.sight) {
      this.sight.classList.remove("is-hidden");
      this.sight.style.left = `${x}px`;
      this.sight.style.top = `${y}px`;
    }
  }

  reset() {
    this.fingers.clear();
    this.stickIds.clear();
    this.aiming = false;
    this.aimId = null;
    this.twoFinger = null;
    this.lastTap = null;
    this.input.touchFire = false;
    this.input.touchSurge = 0;
    this.input.touchStrafe = 0;
    this.input.touchRotate = 0;
    this.sight?.classList.add("is-hidden");
    for (const stick of [this.move, this.turn]) {
      if (!stick) continue;
      stick.id = null;
      stick.x = 0;
      stick.y = 0;
      if (stick.knob) stick.knob.style.transform = "translate(-50%, -50%)";
    }
  }
}
