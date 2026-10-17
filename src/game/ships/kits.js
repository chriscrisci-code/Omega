/** Per-hull stats, hardpoints, and named specials. Art stays in catalog.js. */

export const SHIP_KITS = {
  DSF22: {
    id: "DSF22",
    entitlement: "base",
    stats: {
      speedMul: 1,
      turnMul: 1,
      hullHits: 1,
      hullIFrames: 0,
      shieldMul: 1,
    },
    weapons: {
      noseGun: true,
      missiles: true,
    },
    specials: ["autoShield"],
  },
  ASSAULT: {
    id: "ASSAULT",
    entitlement: "base",
    stats: {
      speedMul: 0.5,
      turnMul: 0.5,
      hullHits: 3,
      hullIFrames: 0.55,
      shieldMul: 2,
      empCap: 3,
    },
    weapons: {
      noseGun: false,
      missiles: true,
      turrets: {
        cool: 0.44,
        range: 780,
        turn: 4.4,
        aim: 0.28,
        hits: 3,
        mounts: [
          { x: 5, y: -11, angle: -0.4 },
          { x: 5, y: 11, angle: 0.4 },
        ],
      },
    },
    specials: ["aiTurrets", "wingmen", "pulseShield", "multiHull"],
    wing: {
      hullHits: 2,
      side: 164,
      along: 8,
      lag: 86,
      lead: 32,
      delayMin: 0.2,
      delayMax: 1.5,
    },
  },
  ACRP33: {
    id: "ACRP33",
    entitlement: "base",
    stats: {
      speedMul: 0.7,
      turnMul: 0.28,
      hullHits: 1,
      hullIFrames: 0,
      shieldMul: 1,
    },
    weapons: {
      noseGun: { charge: 0.7, hits: 200, speed: 1200, life: 2.4, coolMul: 2.2 },
      missiles: true,
    },
    specials: ["autoShield"],
  },
  SABRE: {
    id: "SABRE",
    entitlement: "base",
    stats: {
      speedMul: 1.28,
      turnMul: 0.84,
      hullHits: 2,
      hullIFrames: 0.5,
      shieldMul: 1,
    },
    weapons: {
      noseGun: true,
      missiles: { volley: 2 },
    },
    specials: ["autoShield", "multiHull"],
  },
};

export function kitFor(id) {
  return SHIP_KITS[id] || SHIP_KITS.DSF22;
}

export function kitHas(kit, special) {
  return Boolean(kit?.specials?.includes(special));
}

export function kitStat(kit, name, fallback) {
  const value = kit?.stats?.[name];
  return value == null ? fallback : value;
}

export function kitWeapon(kit, name) {
  return kit?.weapons?.[name];
}
