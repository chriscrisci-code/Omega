import { GameAudio } from "../game/audio/Audio.js";
import {
  BED_FIELDS,
  BED_PATCHES,
  SFX_GROUPS,
  SFX_PATCHES,
  VOICE_DEFAULTS,
  VOICE_FIELDS,
  bedDirty,
  bedFor,
  dumpAllPatches,
  patchDirty,
  patchFor,
  resetAllSfx,
  resetBed,
  resetPatch,
  writeBed,
  writePatch,
} from "../game/audio/patches.js";

const KEY = "vector-game-save";
const CHANNEL = "2dsg-cabinet";
const audio = new GameAudio();

function clampCredits(value) {
  return Math.max(0, Math.min(199, Math.floor(Number(value) || 0)));
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "null");
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
  try {
    channel?.postMessage({ type: "cabinet" });
  } catch {
    /* ignore */
  }
}

function state() {
  const data = load();
  return {
    data,
    freePlay: Boolean(data.settings?.freePlay),
    credits: clampCredits(data.credits),
  };
}

let happyHour = false;
let channel = null;
let selected = "thud";
let selectedBed = "";
let bedHold = null;
let bedRaf = 0;
let railCharge = 0.45;
let railReady = false;

function paintCabinet() {
  const { freePlay, credits } = state();
  const on = freePlay || happyHour;
  document.getElementById("now").textContent = on ? "MODE  FREE PLAY" : "MODE  COIN";
  document.getElementById("coin").classList.toggle("is-on", !freePlay && !happyHour);
  document.getElementById("free").classList.toggle("is-on", freePlay || happyHour);
  document.getElementById("credits").textContent = String(credits);
}

async function syncHappyHour() {
  try {
    const res = await fetch("/api/freeplay");
    const data = await res.json().catch(() => ({}));
    happyHour = Boolean(res.ok && data.freePlay);
  } catch {
    happyHour = false;
  }
  paintCabinet();
}

function setFreePlay(on) {
  const data = load();
  data.settings = { ...(data.settings || {}), freePlay: Boolean(on) };
  save(data);
  paintCabinet();
}

function addCredit() {
  const data = load();
  data.credits = clampCredits((data.credits || 0) + 1);
  save(data);
  paintCabinet();
}

function showTab(id) {
  const sfx = id === "sfx";
  document.body.classList.toggle("is-sfx", sfx);
  document.getElementById("cabinet").classList.toggle("is-hidden", sfx);
  document.getElementById("sfx").classList.toggle("is-hidden", !sfx);
  document.getElementById("tab-cabinet").classList.toggle("is-on", !sfx);
  document.getElementById("tab-sfx").classList.toggle("is-on", sfx);
  if (!sfx) stopBeds();
}

function labelOf(key) {
  return String(key)
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .toUpperCase();
}

function optionLabel(value) {
  if (value === false) return "OFF";
  if (value === true) return "ON";
  return String(value).toUpperCase();
}

function coerce(field, raw) {
  if (field.options) {
    if (raw === "false") return false;
    if (raw === "true") return true;
    return raw;
  }
  return Number(raw);
}

function formatValue(value) {
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(value < 1 ? 3 : 2);
  return optionLabel(value);
}

function knobRow(field, value, onChange) {
  const row = document.createElement("label");
  row.className = "knob";
  const name = document.createElement("span");
  name.textContent = labelOf(field.key);
  row.appendChild(name);
  if (field.options) {
    const select = document.createElement("select");
    for (const option of field.options) {
      const item = document.createElement("option");
      item.value = String(option);
      item.textContent = optionLabel(option);
      if (option === value) item.selected = true;
      select.appendChild(item);
    }
    select.addEventListener("change", () => onChange(coerce(field, select.value)));
    row.appendChild(select);
    const blank = document.createElement("span");
    row.appendChild(blank);
  } else {
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(field.min);
    input.max = String(field.max);
    input.step = String(field.step);
    input.value = String(value ?? field.min);
    const out = document.createElement("output");
    out.textContent = formatValue(Number(input.value));
    input.addEventListener("input", () => {
      const next = coerce(field, input.value);
      out.textContent = formatValue(next);
      onChange(next);
    });
    input.addEventListener("change", () => {
      if (!selectedBed) playSelected();
    });
    row.appendChild(input);
    row.appendChild(out);
  }
  return row;
}

function stopBeds() {
  bedHold = null;
  if (bedRaf) cancelAnimationFrame(bedRaf);
  bedRaf = 0;
  if (!audio.ctx) return;
  audio.tickLaser(0);
  audio.tickRail(0, false);
  audio.tickEngine(0, 0, 0, 0, 0);
}

function tickBeds() {
  if (!bedHold) return;
  if (bedHold === "engine") audio.tickEngine(1, 0.35, 0, 0, 0);
  else if (bedHold === "laser") audio.tickLaser(1);
  else if (bedHold === "rail") audio.tickRail(railCharge, railReady);
  bedRaf = requestAnimationFrame(tickBeds);
}

async function holdBed(id, on) {
  await audio.unlock();
  if (!on) {
    stopBeds();
    return;
  }
  bedHold = id;
  if (!bedRaf) tickBeds();
}

async function playSelected() {
  await audio.unlock();
  if (selectedBed) {
    await holdBed(selectedBed, true);
    return;
  }
  stopBeds();
  audio.play(selected);
}

function copyText(value) {
  const text = JSON.stringify(value, null, 2);
  navigator.clipboard?.writeText(text).catch(() => {
    window.prompt("COPY", text);
  });
}

function paintNav() {
  const nav = document.getElementById("sfx-nav");
  nav.innerHTML = "";
  for (const group of SFX_GROUPS) {
    const wrap = document.createElement("div");
    const title = document.createElement("p");
    title.className = "sfx-group-name";
    title.textContent = group.name;
    wrap.appendChild(title);
    const ids = document.createElement("div");
    ids.className = "sfx-ids";
    for (const id of group.ids) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = SFX_PATCHES[id].name;
      btn.classList.toggle("is-on", !selectedBed && selected === id);
      btn.classList.toggle("is-dirty", patchDirty(id));
      btn.addEventListener("click", () => {
        selectedBed = "";
        selected = id;
        paintLab();
        playSelected();
      });
      ids.appendChild(btn);
    }
    wrap.appendChild(ids);
    nav.appendChild(wrap);
  }
  const beds = document.createElement("div");
  const bedTitle = document.createElement("p");
  bedTitle.className = "sfx-group-name";
  bedTitle.textContent = "BEDS";
  beds.appendChild(bedTitle);
  const bedIds = document.createElement("div");
  bedIds.className = "sfx-ids";
  for (const id of Object.keys(BED_PATCHES)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = BED_PATCHES[id].name;
    btn.classList.toggle("is-on", selectedBed === id);
    btn.classList.toggle("is-dirty", bedDirty(id));
    btn.addEventListener("click", () => {
      selectedBed = id;
      paintLab();
    });
    bedIds.appendChild(btn);
  }
  beds.appendChild(bedIds);
  nav.appendChild(beds);
}

function paintHead() {
  const head = document.getElementById("sfx-head");
  head.innerHTML = "";
  const play = document.createElement("button");
  play.type = "button";
  play.textContent = selectedBed ? (bedHold === selectedBed ? "RELEASE" : "HOLD") : "PLAY";
  play.addEventListener("click", () => {
    if (selectedBed && bedHold === selectedBed) stopBeds();
    else playSelected();
    paintHead();
  });
  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "RESET";
  reset.addEventListener("click", () => {
    if (selectedBed) resetBed(selectedBed);
    else resetPatch(selected);
    paintLab();
  });
  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "COPY";
  copy.addEventListener("click", () => {
    copyText(selectedBed ? bedFor(selectedBed) : patchFor(selected));
  });
  const copyAll = document.createElement("button");
  copyAll.type = "button";
  copyAll.textContent = "COPY ALL";
  copyAll.addEventListener("click", () => copyText(dumpAllPatches()));
  const wipe = document.createElement("button");
  wipe.type = "button";
  wipe.textContent = "RESET ALL";
  wipe.addEventListener("click", () => {
    resetAllSfx();
    paintLab();
  });
  head.append(play, reset, copy, copyAll, wipe);
}

function paintSfxEdit() {
  const edit = document.getElementById("sfx-edit");
  edit.innerHTML = "";
  const patch = patchFor(selected);
  document.getElementById("sfx-title").textContent = `${patch.name}${patchDirty(selected) ? "  *" : ""}`;
  patch.voices.forEach((voice, index) => {
    const box = document.createElement("div");
    box.className = "voice";
    const title = document.createElement("h3");
    title.textContent = `VOICE ${index + 1}  ${String(voice.kind || "GUN").toUpperCase()}`;
    box.appendChild(title);
    const fields = VOICE_FIELDS[voice.kind] || VOICE_FIELDS.gun;
    for (const field of fields) {
      const fallback = VOICE_DEFAULTS[voice.kind]?.[field.key];
      const value = voice[field.key] ?? fallback ?? (field.options ? field.options[0] : 0);
      box.appendChild(
        knobRow(field, value, (next) => {
          const live = patchFor(selected);
          live.voices[index] = { ...live.voices[index], [field.key]: next };
          writePatch(selected, live);
          paintNav();
          document.getElementById("sfx-title").textContent = `${live.name}  *`;
        }),
      );
    }
    edit.appendChild(box);
  });
}

function paintBedEdit() {
  const edit = document.getElementById("sfx-edit");
  edit.innerHTML = "";
  const bed = bedFor(selectedBed);
  document.getElementById("sfx-title").textContent = `${bed.name}${bedDirty(selectedBed) ? "  *" : ""}`;
  const box = document.createElement("div");
  box.className = "voice";
  const title = document.createElement("h3");
  title.textContent = "HOLD WHILE YOU TUNE";
  box.appendChild(title);
  if (selectedBed === "rail") {
    box.appendChild(
      knobRow({ key: "charge", min: 0, max: 1, step: 0.01 }, railCharge, (next) => {
        railCharge = next;
      }),
    );
    const ready = document.createElement("label");
    ready.className = "knob";
    ready.innerHTML = "<span>READY</span>";
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = railReady;
    check.addEventListener("change", () => {
      railReady = check.checked;
    });
    ready.appendChild(check);
    ready.appendChild(document.createElement("span"));
    box.appendChild(ready);
  }
  for (const field of BED_FIELDS[selectedBed] || []) {
    box.appendChild(
      knobRow(field, bed[field.key], (next) => {
        const live = bedFor(selectedBed);
        live[field.key] = next;
        writeBed(selectedBed, live);
        paintNav();
        document.getElementById("sfx-title").textContent = `${live.name}  *`;
      }),
    );
  }
  edit.appendChild(box);
}

function paintLab() {
  paintNav();
  paintHead();
  if (selectedBed) paintBedEdit();
  else paintSfxEdit();
}

try {
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = () => paintCabinet();
} catch {
  channel = null;
}

window.addEventListener("storage", (event) => {
  if (event.key === KEY) paintCabinet();
});

document.getElementById("coin").addEventListener("click", () => setFreePlay(false));
document.getElementById("free").addEventListener("click", () => setFreePlay(true));
document.getElementById("insert").addEventListener("click", addCredit);
document.getElementById("tab-cabinet").addEventListener("click", () => showTab("cabinet"));
document.getElementById("tab-sfx").addEventListener("click", () => showTab("sfx"));
window.addEventListener("pagehide", stopBeds);

paintCabinet();
paintLab();
syncHappyHour();
setInterval(syncHappyHour, 20000);
