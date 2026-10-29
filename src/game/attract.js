import { world as worldConfig } from "./config.js";
import { pick, rand, wrapCoord } from "./math.js";
import { ACRP33_ID, ASSAULT_ID, DEFAULT_SHIP_ID, GUNSHIP_ID, SABRE_ID, SHIP_CATALOG } from "./ships/catalog.js";

export const DEMO_SHIPS = [DEFAULT_SHIP_ID, ASSAULT_ID, GUNSHIP_ID, SABRE_ID, ACRP33_ID];

export const ATTRACT_HOLD = 14;
export const ATTRACT_PLAY = 10;
export const ATTRACT_SCORES = 10;
export const ATTRACT_FLASH = 0.5;

function placeShip(game, x, y, rotation, spec) {
  game.ship.reset(x, y);
  game.ship.rotation = rotation;
  game.ship.invuln = 0;
  game.ship.shieldEnergy = 2;
  game.ship.shieldOn = true;
  game.ship.alive = true;
  game.ship.view.visible = true;
  game.ship.view.alpha = 1;
  game.ship.setSkin(spec ?? null);
}

export function demoSkinFor(index) {
  const id = DEMO_SHIPS[index % DEMO_SHIPS.length];
  return SHIP_CATALOG.find((ship) => ship.id === id) ?? SHIP_CATALOG[0];
}

function sprinkleRocks(game, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const a = rand(0, Math.PI * 2);
    const r = rand(90, 320);
    game.addRock(
      wrapCoord(x + Math.cos(a) * r, worldConfig.width),
      wrapCoord(y + Math.sin(a) * r, worldConfig.height),
      pick([2, 1, 1]),
    );
  }
}

function clusterEnemies(game, x, y, spread = 200) {
  for (const enemy of game.enemies) {
    if (!enemy.alive) continue;
    enemy.x = wrapCoord(x + rand(-spread, spread), worldConfig.width);
    enemy.y = wrapCoord(y + rand(-spread, spread), worldConfig.height);
  }
}

function wakeCastle(game, base) {
  if (!base) return;
  base.resetCombat();
  game.armCastle(base);
}

function setupCastleAssault(game, spec) {
  const north = game.bases[1];
  wakeCastle(game, north);
  const x = north.x;
  const y = wrapCoord(north.y + 390, worldConfig.height);
  placeShip(game, x, y, -Math.PI / 2, spec);
  for (let i = 0; i < 5; i += 1) game.spawnEnemy(north);
  sprinkleRocks(game, x, y, 4);
}

function setupHubRaid(game, spec) {
  const hub = game.hub;
  const north = game.bases[1];
  wakeCastle(game, north);
  placeShip(game, hub.x + 260, hub.y - 180, 2.5, spec);
  for (let i = 0; i < 3; i += 1) game.spawnRaider(north);
  for (let i = 0; i < 4; i += 1) game.spawnEnemy(north);
  clusterEnemies(game, hub.x + 80, hub.y - 120, 220);
  sprinkleRocks(game, hub.x, hub.y, 3);
}

function setupRockStorm(game, spec) {
  const x = worldConfig.width * 0.38;
  const y = worldConfig.height * 0.64;
  const north = game.bases[1];
  placeShip(game, x, y, 0.35, spec);
  sprinkleRocks(game, x, y, 8);
  for (let i = 0; i < 3; i += 1) game.spawnEnemy(north);
  clusterEnemies(game, x + 80, y - 40, 160);
}

function setupMelee(game, spec) {
  const east = game.bases[2];
  wakeCastle(game, east);
  const x = east.x - 480;
  const y = east.y + 40;
  placeShip(game, x, y, 0.05, spec);
  for (let i = 0; i < 5; i += 1) game.spawnEnemy(east);
  for (let i = 0; i < 2; i += 1) game.spawnRaider(east);
  sprinkleRocks(game, x, y, 3);
}

function setupStarStorm(game, spec) {
  const hub = game.hub;
  const north = game.bases[1];
  const east = game.bases[2];
  wakeCastle(game, north);
  wakeCastle(game, east);
  placeShip(game, hub.x - 220, hub.y + 340, -0.4, spec);
  for (let i = 0; i < 3; i += 1) game.spawnEnemy(north);
  for (let i = 0; i < 3; i += 1) game.spawnEnemy(east);
  clusterEnemies(game, hub.x, hub.y + 80, 280);
  sprinkleRocks(game, hub.x, hub.y, 3);
}

function setupCrossfire(game, spec) {
  const east = game.bases[2];
  const west = game.bases[4];
  wakeCastle(game, east);
  wakeCastle(game, west);
  const x = (east.x + west.x) * 0.5;
  const y = east.y + 80;
  placeShip(game, x, y, 0, spec);
  for (let i = 0; i < 4; i += 1) game.spawnEnemy(east);
  for (let i = 0; i < 4; i += 1) game.spawnEnemy(west);
  clusterEnemies(game, x, y, 240);
  sprinkleRocks(game, x, y, 3);
}

export const ATTRACT_SCENES = [setupCastleAssault, setupHubRaid, setupRockStorm, setupMelee, setupStarStorm, setupCrossfire];
