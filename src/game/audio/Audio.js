/** Web Audio SFX, plus the looping Sunlight bed. */

import { SFX, SFX_GROUPS, BULLET_SOUNDS, bedFor, patchFor } from "./patches.js";

export { SFX, SFX_GROUPS, BULLET_SOUNDS };

const SUNLIGHT = new URL("../../../music/Sunlight v4.mp3", import.meta.url).href;

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this._noise = null;
    this.engines = null;
    this.laserBed = null;
    this._laserOn = 0;
    this.railBed = null;
    this._railPhase = "off";
    this.musicVol = 0.2;
    this._musicStarting = false;
    this._musicLevel = 0;
  }

  setMusicVol(value) {
    this.musicVol = Math.max(0, Math.min(1, Number(value) || 0));
  }

  async unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.52;
      this.master.connect(this.ctx.destination);
      this.ensureGunFlange();
    }
    if (this.ctx.state !== "running") await this.ctx.resume();
    this.ensureMusic();
    this.tickMusic();
    return this.ctx;
  }

  async play(id) {
    const patch = SFX[id];
    if (!patch) return;
    await this.unlock();
    patch.fire(this);
  }

  playBullet(id) {
    return this.play(id);
  }

  now() {
    return this.ctx.currentTime;
  }

  noiseBuffer() {
    if (this._noise) return this._noise;
    const length = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let pink = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      pink = pink * 0.86 + white * 0.14;
      data[i] = pink * 2.4;
    }
    this._noise = buffer;
    return buffer;
  }

  noiseSource() {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer();
    source.loop = true;
    return source;
  }

  envelope(peak, dur, attack = 0.002, at = this.now(), out = this.master) {
    const node = this.ctx.createGain();
    node.gain.setValueAtTime(0.0001, at);
    node.gain.linearRampToValueAtTime(peak, at + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    node.connect(out);
    return node;
  }

  makeFlange({ dry = 0.8, wet = 0.52, delay = 0.006, rate = 0.42, depth = 0.0052, feedback = 0.5 } = {}) {
    const input = this.ctx.createGain();
    const dryGain = this.ctx.createGain();
    const wetGain = this.ctx.createGain();
    dryGain.gain.value = dry;
    wetGain.gain.value = wet;
    const line = this.ctx.createDelay(0.05);
    line.delayTime.value = delay;
    const lfo = this.ctx.createOscillator();
    lfo.type = "triangle";
    lfo.frequency.value = rate;
    const sweep = this.ctx.createGain();
    sweep.gain.value = depth;
    lfo.connect(sweep);
    sweep.connect(line.delayTime);
    const regen = this.ctx.createGain();
    regen.gain.value = feedback;
    input.connect(dryGain);
    input.connect(line);
    line.connect(regen);
    regen.connect(line);
    line.connect(wetGain);
    dryGain.connect(this.master);
    wetGain.connect(this.master);
    lfo.start();
    return input;
  }

  ensureGunFlange() {
    if (!this.ctx) return;
    if (!this.gunBus) {
      this.gunBus = this.makeFlange();
    }
    if (!this.gunHotBus) {
      this.gunHotBus = this.makeFlange({
        dry: 0.36,
        wet: 1.05,
        delay: 0.012,
        rate: 0.92,
        depth: 0.0096,
        feedback: 0.66,
      });
    }
  }

  gun({
    dur = 0.14,
    attack = 0.0015,
    noisePeak = 0.42,
    cutoff = 1400,
    endCutoff = 280,
    q = 0.85,
    type = "lowpass",
    thump = 78,
    thumpPeak = 0.2,
    thumpDur = 0.09,
    rate = 1,
    flange = false,
    at = this.now(),
  }) {
    if (flange) this.ensureGunFlange();
    const bus = flange === "hot" && this.gunHotBus
      ? this.gunHotBus
      : flange && this.gunBus
        ? this.gunBus
        : this.master;
    const source = this.noiseSource();
    source.playbackRate.value = rate;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.setValueAtTime(q, at);
    filter.frequency.setValueAtTime(cutoff, at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, endCutoff), at + dur);
    source.connect(filter);
    filter.connect(this.envelope(noisePeak, dur, attack, at, bus));
    source.start(at);
    source.stop(at + dur + 0.03);

    if (thumpPeak > 0) {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(thump, at);
      osc.frequency.exponentialRampToValueAtTime(Math.max(28, thump * 0.42), at + thumpDur);
      osc.connect(this.envelope(thumpPeak, thumpDur, 0.002, at, bus));
      osc.start(at);
      osc.stop(at + thumpDur + 0.03);
    }
  }

  tone({ type = "sine", freq = 220, dur = 0.12, peak = 0.12, attack = 0.004, glide = 0, at = this.now() }) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, glide), at + dur);
    osc.connect(this.envelope(peak, dur, attack, at));
    osc.start(at);
    osc.stop(at + dur + 0.04);
  }

  whoosh({ from = 900, to = 180, dur = 0.28, peak = 0.22, q = 0.8, at = this.now() }) {
    const source = this.noiseSource();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.setValueAtTime(q, at);
    filter.frequency.setValueAtTime(from, at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, to), at + dur);
    source.connect(filter);
    filter.connect(this.envelope(peak, dur, 0.008, at));
    source.start(at);
    source.stop(at + dur + 0.04);
  }

  chime({ freq = 880, dur = 0.16, peak = 0.1, at = this.now() }) {
    this.tone({ type: "sine", freq, dur, peak, attack: 0.003, at });
    this.tone({ type: "sine", freq: freq * 1.5, dur: dur * 0.7, peak: peak * 0.45, at });
  }

  stab({ root = 196, dur = 0.28, peak = 0.12, at = this.now() } = {}) {
    const chord = [
      [root, 1],
      [root * 1.5, 0.78],
      [root * 2, 0.55],
      [root * 2.52, 0.42],
    ];
    for (const [freq, amt] of chord) {
      this.tone({ type: "triangle", freq, dur, peak: peak * amt, attack: 0.002, at });
      this.tone({ type: "sine", freq, dur: dur * 1.15, peak: peak * amt * 0.4, attack: 0.003, at });
    }
    this.gun({
      dur: 0.05,
      attack: 0.001,
      noisePeak: 0.08,
      cutoff: 2200,
      endCutoff: 480,
      q: 0.9,
      type: "bandpass",
      thumpPeak: 0,
      at,
    });
  }

  enginePreview(kind) {
    const main = kind === "main";
    this.gun({
      dur: 0.42,
      attack: 0.05,
      noisePeak: main ? 0.1 : 0.035,
      cutoff: main ? 620 : 1600,
      endCutoff: main ? 280 : 700,
      q: 0.45,
      thump: main ? 58 : 0,
      thumpPeak: main ? 0.05 : 0,
      thumpDur: 0.4,
    });
  }

  ensureEngine() {
    if (this.engines || !this.ctx) return;
    const make = (cutoff, type = "lowpass", q = 0.5) => {
      const src = this.noiseSource();
      const filter = this.ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = cutoff;
      filter.Q.value = q;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start();
      return { src, filter, gain };
    };
    const rumble = this.ctx.createOscillator();
    rumble.type = "sine";
    rumble.frequency.value = 56;
    const rumbleGain = this.ctx.createGain();
    rumbleGain.gain.value = 0;
    rumble.connect(rumbleGain);
    rumbleGain.connect(this.master);
    rumble.start();
    const hum = this.ctx.createOscillator();
    hum.type = "sine";
    hum.frequency.value = 210;
    const humGain = this.ctx.createGain();
    humGain.gain.value = 0;
    hum.connect(humGain);
    humGain.connect(this.master);
    hum.start();
    this.engines = {
      main: make(480),
      man: make(1500),
      shield: make(1100, "bandpass", 0.9),
      warp: make(500, "bandpass", 0.7),
      fly: make(620, "bandpass", 0.65),
      rumble,
      rumbleGain,
      hum,
      humGain,
    };
  }

  incomingBeep({ at, dur = 0.5 } = {}) {
    if (!this.ctx || this.ctx.state !== "running") return;
    const voice = patchFor("star")?.voices?.[0] || {};
    this.tone({
      type: voice.type || "square",
      freq: voice.freq || 250,
      dur: dur ?? voice.dur ?? 0.5,
      peak: voice.peak ?? 0.055,
      attack: voice.attack ?? 0.012,
      at: at ?? this.now(),
    });
  }

  ensureLaser() {
    if (this.laserBed || !this.ctx) return;
    const hissSrc = this.noiseSource();
    const hissFilter = this.ctx.createBiquadFilter();
    hissFilter.type = "bandpass";
    hissFilter.frequency.value = 4200;
    hissFilter.Q.value = 1.4;
    const hiss = this.ctx.createGain();
    hiss.gain.value = 0;
    hissSrc.connect(hissFilter);
    hissFilter.connect(hiss);
    hiss.connect(this.master);
    hissSrc.start();
    const buzz = this.ctx.createOscillator();
    buzz.type = "sawtooth";
    buzz.frequency.value = 1760;
    const buzzFilter = this.ctx.createBiquadFilter();
    buzzFilter.type = "highpass";
    buzzFilter.frequency.value = 900;
    const buzzGain = this.ctx.createGain();
    buzzGain.gain.value = 0;
    buzz.connect(buzzFilter);
    buzzFilter.connect(buzzGain);
    buzzGain.connect(this.master);
    buzz.start();
    this.laserBed = { hiss, hissFilter, buzz, buzzGain };
  }

  tickLaser(on = 0) {
    if (!this.ctx || this.ctx.state !== "running") return;
    const amt = on ? 1 : 0;
    if (amt === this._laserOn && amt === 0) return;
    this._laserOn = amt;
    if (amt === 0 && !this.laserBed) return;
    this.ensureLaser();
    const bed = bedFor("laser");
    const t = this.now();
    this.laserBed.hiss.gain.setTargetAtTime(amt * bed.hissPeak, t, 0.04);
    this.laserBed.buzzGain.gain.setTargetAtTime(amt * bed.buzzPeak, t, 0.04);
    this.laserBed.hissFilter.frequency.setTargetAtTime(bed.hissFreq, t, 0.08);
    this.laserBed.buzz.frequency.setTargetAtTime(bed.buzzFreq, t, 0.08);
  }

  ensureRail() {
    if (this.railBed || !this.ctx) return;
    const hissSrc = this.noiseSource();
    const hissFilter = this.ctx.createBiquadFilter();
    hissFilter.type = "bandpass";
    hissFilter.frequency.value = 1600;
    hissFilter.Q.value = 1.7;
    const hiss = this.ctx.createGain();
    hiss.gain.value = 0;
    hissSrc.connect(hissFilter);
    hissFilter.connect(hiss);
    hiss.connect(this.master);
    hissSrc.start();
    const coil = this.ctx.createOscillator();
    coil.type = "sawtooth";
    coil.frequency.value = 200;
    const coilFilter = this.ctx.createBiquadFilter();
    coilFilter.type = "lowpass";
    coilFilter.frequency.value = 1200;
    const coilGain = this.ctx.createGain();
    coilGain.gain.value = 0;
    coil.connect(coilFilter);
    coilFilter.connect(coilGain);
    coilGain.connect(this.master);
    coil.start();
    const hold = this.ctx.createOscillator();
    hold.type = "triangle";
    hold.frequency.value = 1080;
    const holdGain = this.ctx.createGain();
    holdGain.gain.value = 0;
    hold.connect(holdGain);
    holdGain.connect(this.master);
    hold.start();
    this.railBed = { hiss, hissFilter, coil, coilFilter, coilGain, hold, holdGain };
  }

  tickRail(u = 0, ready = false) {
    if (!this.ctx || this.ctx.state !== "running") return;
    const charge = Math.min(1, Math.max(0, Number(u) || 0));
    const on = ready || charge > 0.01;
    if (!on && !this.railBed) {
      this._railPhase = "off";
      return;
    }
    this.ensureRail();
    const t = this.now();
    const bed = this.railBed;
    const knobs = bedFor("rail");
    bed.hiss.gain.setTargetAtTime(on ? (ready ? knobs.hissReady : knobs.hissIdle + charge * knobs.hissCharge) : 0, t, on ? 0.06 : 0.035);
    bed.hissFilter.frequency.setTargetAtTime(ready ? knobs.hissFreqReady : knobs.hissFreqIdle + charge * knobs.hissFreqSpan, t, 0.08);
    bed.coilGain.gain.setTargetAtTime(ready ? knobs.coilReady : charge * knobs.coilIdle, t, 0.055);
    bed.coil.frequency.setTargetAtTime(ready ? knobs.coilFreqReady : knobs.coilFreqIdle + charge * knobs.coilFreqSpan, t, 0.075);
    bed.holdGain.gain.setTargetAtTime(ready ? knobs.holdPeak : 0, t, ready ? 0.045 : 0.07);
    const phase = !on ? "off" : ready ? "hold" : "charge";
    if (phase === "charge" && this._railPhase === "off") {
      this.whoosh({ from: 240, to: 780, dur: 0.16, peak: 0.1, q: 0.7 });
      this.tone({ type: "sine", freq: 140, glide: 300, dur: 0.14, peak: 0.055, attack: 0.02 });
    }
    if (phase === "hold" && this._railPhase !== "hold") {
      this.chime({ freq: 980, dur: 0.12, peak: 0.09 });
      this.tone({ type: "sine", freq: 1960, dur: 0.07, peak: 0.045, attack: 0.002 });
    }
    this._railPhase = phase;
  }

  tickFly(amount = 0, recede = 1) {
    if (!this.ctx || this.ctx.state !== "running") return;
    this.ensureEngine();
    const t = this.now();
    this.engines.fly.gain.gain.setTargetAtTime(0, t, 0.08);
  }

  tickEngine(main = 0, man = 0, shield = 0, warpAmt = 0, warpU = 0) {
    if (!this.ctx || this.ctx.state !== "running") return;
    this.ensureEngine();
    const t = this.now();
    const mainAmt = Math.min(1, Math.max(0, main));
    const manAmt = Math.min(1, Math.max(0, man));
    const shieldAmt = Math.min(1, Math.max(0, shield));
    const warpOn = Math.min(1, Math.max(0, warpAmt));
    const u = Math.min(1, Math.max(0, warpU));
    const knobs = bedFor("engine");
    this.engines.main.gain.gain.setTargetAtTime(mainAmt * knobs.mainGain, t, 0.07);
    this.engines.main.filter.frequency.setTargetAtTime(knobs.mainCutoff + mainAmt * knobs.mainSpan, t, 0.08);
    this.engines.man.gain.gain.setTargetAtTime(manAmt * knobs.manGain, t, 0.05);
    this.engines.man.filter.frequency.setTargetAtTime(knobs.manCutoff + manAmt * knobs.manSpan, t, 0.06);
    this.engines.rumbleGain.gain.setTargetAtTime(mainAmt * knobs.rumbleGain, t, 0.09);
    this.engines.shield.gain.gain.setTargetAtTime(shieldAmt * knobs.shieldGain, t, 0.08);
    this.engines.shield.filter.frequency.setTargetAtTime(knobs.shieldCutoff + shieldAmt * knobs.shieldSpan, t, 0.12);
    this.engines.humGain.gain.setTargetAtTime(shieldAmt * knobs.humGain, t, 0.1);
    this.engines.warp.gain.gain.setTargetAtTime(warpOn * knobs.warpGain, t, warpOn ? 0.05 : 0.12);
    this.engines.warp.filter.frequency.setTargetAtTime(knobs.warpCutoff + u * knobs.warpSpan, t, 0.08);
  }

  ensureMusic() {
    if (this.music?.el) return;
    const el = new Audio(SUNLIGHT);
    el.loop = true;
    el.preload = "auto";
    el.volume = 0;
    this.music = { el };
  }

  playElement() {
    const el = this.music?.el;
    if (!el || this._musicStarting) return;
    this._musicStarting = true;
    el.play()
      .catch(() => {})
      .finally(() => {
        this._musicStarting = false;
      });
  }

  holdMusic() {
    this.unlock();
    if ((this._musicLevel ?? 0) <= 0) return;
    this.playElement();
  }

  restartMusic(level) {
    if (level != null) this._musicLevel = Math.max(0, Math.min(1, Number(level) || 0));
    this.ensureMusic();
    const el = this.music?.el;
    if (!el) return;
    const amt = this._musicLevel > 0 ? this._musicLevel : 0.2;
    this._musicLevel = amt;
    el.loop = true;
    el.volume = amt;
    this._musicStarting = true;
    try {
      if (!el.paused) el.pause();
      el.currentTime = 0;
    } catch {
      /* ignore seek errors */
    }
    el.play()
      .catch(() => {})
      .finally(() => {
        this._musicStarting = false;
      });
  }

  tickMusic(level) {
    if (level != null) this._musicLevel = Math.max(0, Math.min(1, Number(level) || 0));
    this.ensureMusic();
    const amt = this._musicLevel ?? 0;
    const el = this.music?.el;
    if (!el) return;
    el.loop = true;
    el.volume = amt;
    if (amt <= 0) {
      this._musicStarting = false;
      if (!el.paused) el.pause();
      return;
    }
    if (!el.paused || this._musicStarting) return;
    this.playElement();
  }
}
