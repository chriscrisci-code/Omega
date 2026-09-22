/** Web Audio SFX. Noisy, muted, no sample files. */

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this._noise = null;
    this.engines = null;
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

  ensureGunFlange() {
    if (this.gunBus || !this.ctx) return;
    const input = this.ctx.createGain();
    const dry = this.ctx.createGain();
    const wet = this.ctx.createGain();
    dry.gain.value = 0.84;
    wet.gain.value = 0.4;
    const delay = this.ctx.createDelay(0.05);
    delay.delayTime.value = 0.006;
    const lfo = this.ctx.createOscillator();
    lfo.type = "triangle";
    lfo.frequency.value = 0.38;
    const depth = this.ctx.createGain();
    depth.gain.value = 0.0042;
    lfo.connect(depth);
    depth.connect(delay.delayTime);
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.45;
    input.connect(dry);
    input.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    dry.connect(this.master);
    wet.connect(this.master);
    lfo.start();
    this.gunBus = input;
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
    flange = false,
    at = this.now(),
  }) {
    if (flange) this.ensureGunFlange();
    const bus = flange && this.gunBus ? this.gunBus : this.master;
    const source = this.noiseSource();
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

  incomingBeep(urgency = 0.5, at) {
    if (!this.ctx || this.ctx.state !== "running") return;
    const u = Math.min(1, Math.max(0, urgency));
    const t = at ?? this.now();
    const peak = 0.11 + u * 0.1;
    this.tone({ type: "square", freq: 920 + u * 140, dur: 0.08, peak, attack: 0.004, at: t });
    this.tone({ type: "square", freq: 620 + u * 80, dur: 0.09, peak: peak * 0.92, attack: 0.004, at: t + 0.085 });
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
    this.engines.main.gain.gain.setTargetAtTime(mainAmt * 0.065, t, 0.07);
    this.engines.main.filter.frequency.setTargetAtTime(340 + mainAmt * 380, t, 0.08);
    this.engines.man.gain.gain.setTargetAtTime(manAmt * 0.02, t, 0.05);
    this.engines.man.filter.frequency.setTargetAtTime(1100 + manAmt * 700, t, 0.06);
    this.engines.rumbleGain.gain.setTargetAtTime(mainAmt * 0.027, t, 0.09);
    this.engines.shield.gain.gain.setTargetAtTime(shieldAmt * 0.09, t, 0.08);
    this.engines.shield.filter.frequency.setTargetAtTime(820 + shieldAmt * 420, t, 0.12);
    this.engines.humGain.gain.setTargetAtTime(shieldAmt * 0.045, t, 0.1);
    this.engines.warp.gain.gain.setTargetAtTime(warpOn * 0.2, t, warpOn ? 0.05 : 0.12);
    this.engines.warp.filter.frequency.setTargetAtTime(380 + u * 1500, t, 0.08);
  }
}

export const SFX = {
  thud: {
    name: "THUD",
    fire: (audio) =>
      audio.gun({
        dur: 0.2,
        noisePeak: 0.28,
        cutoff: 700,
        endCutoff: 140,
        q: 0.7,
        thump: 55,
        thumpPeak: 0.32,
        thumpDur: 0.16,
        flange: true,
      }),
  },
  enemy: {
    name: "ENEMY",
    fire: (audio) =>
      audio.gun({
        dur: 0.08,
        attack: 0.001,
        noisePeak: 0.22,
        cutoff: 2100,
        endCutoff: 420,
        q: 1.1,
        type: "bandpass",
        thump: 140,
        thumpPeak: 0.08,
        thumpDur: 0.04,
      }),
  },
  missile: {
    name: "MSL",
    fire: (audio) => {
      audio.whoosh({ from: 640, to: 260, dur: 1.05, peak: 0.18, q: 0.58 });
      audio.gun({
        dur: 0.08,
        noisePeak: 0.12,
        cutoff: 480,
        endCutoff: 140,
        thump: 70,
        thumpPeak: 0.1,
        thumpDur: 0.06,
      });
    },
  },
  star: {
    name: "STAR",
    fire: (audio) => {
      audio.incomingBeep(0.35);
      audio.incomingBeep(0.7, audio.now() + 0.28);
      audio.incomingBeep(1, audio.now() + 0.5);
    },
  },
  boom: {
    name: "BOOM",
    fire: (audio) =>
      audio.gun({
        dur: 0.28,
        attack: 0.002,
        noisePeak: 0.4,
        cutoff: 900,
        endCutoff: 90,
        q: 0.5,
        thump: 48,
        thumpPeak: 0.28,
        thumpDur: 0.22,
      }),
  },
  warp: {
    name: "WARP",
    fire: (audio) => {
      audio.whoosh({ from: 280, to: 1600, dur: 1, peak: 0.22, q: 0.55 });
      audio.tone({ type: "sine", freq: 80, glide: 260, dur: 1, peak: 0.1, attack: 0.04 });
    },
  },
  emp: {
    name: "EMP",
    fire: (audio) => {
      audio.whoosh({ from: 400, to: 90, dur: 0.55, peak: 0.24, q: 0.45 });
      audio.tone({ type: "triangle", freq: 180, glide: 55, dur: 0.6, peak: 0.1, attack: 0.03 });
      audio.gun({
        dur: 0.18,
        noisePeak: 0.16,
        cutoff: 1800,
        endCutoff: 300,
        q: 1.2,
        type: "bandpass",
        thumpPeak: 0,
      });
    },
  },
  main: {
    name: "MAIN",
    fire: (audio) => audio.enginePreview("main"),
  },
  side: {
    name: "SIDE",
    fire: (audio) => audio.enginePreview("side"),
  },
  hit: {
    name: "HIT",
    fire: (audio) =>
      audio.gun({
        dur: 0.05,
        attack: 0.0008,
        noisePeak: 0.22,
        cutoff: 1600,
        endCutoff: 400,
        q: 1.2,
        type: "bandpass",
        thump: 180,
        thumpPeak: 0.06,
        thumpDur: 0.03,
      }),
  },
  rock: {
    name: "ROCK",
    fire: (audio) =>
      audio.gun({
        dur: 0.26,
        attack: 0.002,
        noisePeak: 0.38,
        cutoff: 780,
        endCutoff: 110,
        q: 0.55,
        thump: 42,
        thumpPeak: 0.24,
        thumpDur: 0.2,
      }),
  },
  die: {
    name: "DIE",
    fire: (audio) => {
      audio.gun({
        dur: 0.4,
        attack: 0.003,
        noisePeak: 0.36,
        cutoff: 600,
        endCutoff: 70,
        q: 0.4,
        thump: 38,
        thumpPeak: 0.3,
        thumpDur: 0.32,
      });
      audio.tone({ type: "sine", freq: 160, glide: 40, dur: 0.45, peak: 0.12, attack: 0.01 });
    },
  },
  spawn: {
    name: "SPAWN",
    fire: (audio) => {
      audio.chime({ freq: 980, dur: 0.12, peak: 0.07 });
      audio.gun({
        dur: 0.08,
        noisePeak: 0.1,
        cutoff: 2400,
        endCutoff: 800,
        q: 0.8,
        type: "bandpass",
        thumpPeak: 0,
      });
    },
  },
  ore: {
    name: "ORE",
    fire: (audio) => audio.chime({ freq: 1240, dur: 0.14, peak: 0.11 }),
  },
  dump: {
    name: "DUMP",
    fire: (audio) => {
      audio.chime({ freq: 660, dur: 0.18, peak: 0.09 });
      audio.tone({ type: "sine", freq: 110, glide: 70, dur: 0.16, peak: 0.08 });
    },
  },
  up: {
    name: "UP",
    fire: (audio) => {
      audio.chime({ freq: 740, dur: 0.2, peak: 0.1 });
      audio.chime({ freq: 980, dur: 0.22, peak: 0.08 });
      audio.tone({ type: "sine", freq: 220, glide: 440, dur: 0.28, peak: 0.08, attack: 0.01 });
    },
  },
  dock: {
    name: "DOCK",
    fire: (audio) => {
      audio.gun({
        dur: 0.12,
        noisePeak: 0.16,
        cutoff: 500,
        endCutoff: 120,
        q: 0.7,
        thump: 90,
        thumpPeak: 0.22,
        thumpDur: 0.1,
      });
      audio.tone({ type: "triangle", freq: 180, glide: 90, dur: 0.14, peak: 0.08 });
    },
  },
  launch: {
    name: "LAUNCH",
    fire: (audio) => {
      audio.whoosh({ from: 200, to: 900, dur: 0.22, peak: 0.14, q: 0.55 });
      audio.gun({
        dur: 0.1,
        noisePeak: 0.12,
        cutoff: 700,
        endCutoff: 220,
        thump: 70,
        thumpPeak: 0.1,
        thumpDur: 0.08,
      });
    },
  },
  warn: {
    name: "WARN",
    fire: (audio) => {
      audio.tone({ type: "triangle", freq: 390, dur: 0.16, peak: 0.12, attack: 0.006 });
      audio.tone({ type: "triangle", freq: 270, dur: 0.2, peak: 0.1, attack: 0.006, at: audio.now() + 0.16 });
      audio.whoosh({ from: 900, to: 300, dur: 0.28, peak: 0.1, q: 0.9 });
    },
  },
  hub: {
    name: "HUB",
    fire: (audio) =>
      audio.gun({
        dur: 0.14,
        noisePeak: 0.24,
        cutoff: 1100,
        endCutoff: 180,
        q: 0.9,
        thump: 64,
        thumpPeak: 0.18,
        thumpDur: 0.1,
      }),
  },
  on: {
    name: "ON",
    fire: (audio) => {
      audio.whoosh({ from: 280, to: 900, dur: 0.16, peak: 0.12, q: 0.7 });
      audio.tone({ type: "sine", freq: 240, glide: 420, dur: 0.14, peak: 0.08 });
    },
  },
  off: {
    name: "OFF",
    fire: (audio) => {
      audio.whoosh({ from: 800, to: 220, dur: 0.14, peak: 0.1, q: 0.7 });
      audio.tone({ type: "sine", freq: 360, glide: 140, dur: 0.12, peak: 0.07 });
    },
  },
  block: {
    name: "BLOCK",
    fire: (audio) =>
      audio.gun({
        dur: 0.07,
        attack: 0.0008,
        noisePeak: 0.18,
        cutoff: 2400,
        endCutoff: 700,
        q: 1.6,
        type: "bandpass",
        thump: 220,
        thumpPeak: 0.08,
        thumpDur: 0.04,
      }),
  },
  pop: {
    name: "POP",
    fire: (audio) => {
      audio.gun({
        dur: 0.16,
        noisePeak: 0.26,
        cutoff: 1400,
        endCutoff: 180,
        q: 0.8,
        thump: 90,
        thumpPeak: 0.16,
        thumpDur: 0.1,
      });
      audio.tone({ type: "sine", freq: 300, glide: 80, dur: 0.18, peak: 0.08 });
    },
  },
  castle: {
    name: "CASTLE",
    fire: (audio) => {
      audio.whoosh({ from: 180, to: 520, dur: 0.35, peak: 0.16, q: 0.5 });
      audio.tone({ type: "triangle", freq: 140, glide: 280, dur: 0.32, peak: 0.09, attack: 0.02 });
    },
  },
  life: {
    name: "LIFE",
    fire: (audio) => {
      audio.chime({ freq: 880, dur: 0.18, peak: 0.1 });
      audio.chime({ freq: 1320, dur: 0.22, peak: 0.08 });
    },
  },
};

export const SFX_GROUPS = [
  { name: "GUNS", ids: ["thud", "enemy"] },
  { name: "SPECIAL", ids: ["missile", "star", "warp", "emp"] },
  { name: "THRUST", ids: ["main", "side"] },
  { name: "HITS", ids: ["hit", "rock", "boom", "die", "hub"] },
  { name: "ORE", ids: ["spawn", "ore", "dump", "up"] },
  { name: "STATION", ids: ["dock", "launch", "warn", "castle"] },
  { name: "SHIELD", ids: ["on", "off", "block", "pop"] },
  { name: "SHIP", ids: ["life"] },
];

export const BULLET_SOUNDS = [
  { id: "thud", name: "THUD", fire: SFX.thud.fire },
];
