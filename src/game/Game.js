import { Container, Graphics } from "pixi.js";
import { applyDifficulty, assault, camera as cameraConfig, castle, debris as debrisConfig, bullets, colors, destroyer as destroyerConfig, emp, extraLifeEvery, missiles, ore, raid, rocks, shield as shieldConfig, ship as shipConfig, shipLevels, warp, world as worldConfig } from "./config.js";
import { chipBurst, Debris, shatter } from "./entities/Debris.js";
import { Asteroid } from "./entities/Asteroid.js";
import { createBases } from "./entities/Base.js";
import { Bullet } from "./entities/Bullet.js";
import { EmpPulse } from "./entities/EmpPulse.js";
import { Enemy, HUNTER } from "./entities/Enemy.js";
import { Missile } from "./entities/Missile.js";
import { Ore } from "./entities/Ore.js";
import { HULL, Ship } from "./entities/Ship.js";
import { HudMarkers } from "./hud/HudMarkers.js";
import { Hud } from "./hud/Hud.js";
import { Input } from "./input/Input.js";
import { TouchControls } from "./input/TouchControls.js";
import { maybePhone } from "./input/device.js";
import { ParticlePool } from "./particles/ParticlePool.js";
import { ShipsGallery } from "./ships/ShipsGallery.js";
import { FarGrid } from "./render/FarGrid.js";
import { createBloomFilter } from "./render/bloom.js";
import { createGlowTexture } from "./render/textures.js";
import { ATTRACT_HOLD, ATTRACT_PLAY, ATTRACT_SCORES, ATTRACT_SCENES, demoSkinFor } from "./attract.js";
import { ALPHA, SCORE_BOARDS, insertDailyScore, insertHighScore, insertStreak, normalizeCheckpoint, padScoreRows, scoreQualifies } from "./storage/save.js";
import { damp, dampAngle, dampWrap, hits, hitsBeam, pick, rand, wrapCoord, wrapDelta } from "./math.js";
import { SHIP_CATALOG, WEDGE_ID } from "./ships/catalog.js";
import { GameAudio } from "./audio/Audio.js";

const TITLE = "title";
const SHIPS = "ships";
const PLAYING = "playing";
const DYING = "dying";
const CONTINUE = "continue";
const INITIALS = "initials";
const WAVEPICK = "wavepick";
const STARTPICK = "startpick";
const GAMEOVER = "gameover";

export class Game {
  constructor(app, { storage }) {
    this.app = app;
    this.storage = storage;
    this.save = storage.load();
    this.input = new Input();
    this.touch = new TouchControls(this.input);
    this.hud = new Hud();
    this.pickingDevice = false;
    this.audio = new GameAudio();

    this.world = new Container();
    this.vectors = new Container();
    this.fx = new ParticlePool(createGlowTexture(), worldConfig.width, worldConfig.height);
    this.far = new FarGrid();
    this.world.addChild(this.far.view, this.vectors, this.fx.container);
    this.world.filters = [createBloomFilter()];
    this.world.scale.set(cameraConfig.zoom);
    this.pips = new HudMarkers();
    this.hangar = new ShipsGallery();
    app.stage.addChild(this.world, this.pips.view, this.hangar.view);
    this.hud.shipsLink?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.input._shipsClick = true;
    });

    this.ship = new Ship();
    this.vectors.addChild(this.ship.view);
    this.bases = createBases(worldConfig.width, worldConfig.height);
    this.hub = this.bases[0];
    for (const base of this.bases) this.vectors.addChild(base.view);
    this.pendingBases = [];
    this.baseUnlockIn = castle.arriveEvery;
    this.sleepLateBases();
    this.shots = Array.from({ length: bullets.max }, () => {
      const bullet = new Bullet();
      this.vectors.addChild(bullet.view);
      return bullet;
    });
    this.hostileShots = Array.from({ length: 28 }, () => {
      const bullet = new Bullet();
      this.vectors.addChild(bullet.view);
      return bullet;
    });
    this.missiles = Array.from({ length: missiles.max }, () => {
      const missile = new Missile();
      this.vectors.addChild(missile.view);
      return missile;
    });
    this.emp = new EmpPulse();
    this.vectors.addChild(this.emp.view);
    this.empCool = 0;
    this.warpCool = 0;
    this.hubMissiles = Array.from({ length: 4 }, () => {
      const missile = new Missile();
      this.vectors.addChild(missile.view);
      return missile;
    });
    this.castleStars = Array.from({ length: castle.starMax }, () => {
      const star = new Missile();
      this.vectors.addChild(star.view);
      return star;
    });
    this.asteroids = [];
    this.ores = [];
    this.cargo = 0;
    this.enemies = [];
    this.shards = [];
    this.selected = null;
    this.lockMark = new Graphics();
    this.lockMark.visible = false;
    this.vectors.addChild(this.lockMark);

    this.mode = TITLE;
    this.score = 0;
    this.lives = shipConfig.lives;
    this.wave = 1;
    this.waveCooldown = 0;
    this.raiderTimer = raid.first;
    this.assaultIndex = 1;
    this.assaultRest = false;
    this.assaultTime = assault.wave1;
    this.cooldown = 0;
    this.gun = 0;
    this.shipLevel = 1;
    this.freshLoadout();
    this.runDirty = false;
    this.burstLeft = 0;
    this.fireWasOn = false;
    this.missileCool = 0;
    this.timer = 0;
    this.shake = 0;
    this.nextLifeAt = extraLifeEvery;
    this.camX = worldConfig.width / 2;
    this.camY = worldConfig.height / 2;
    this.camRot = 0;
    this.camZoom = cameraConfig.zoom;
    this.camOn = true;
    this.hubThreat = 0;
    this.hubThreatClose = false;
    this.hubAlertOn = false;
    this.hubWarnPulse = 0;
    this.starBeepWait = 0;
    this.homeOn = false;
    this.dockOpen = false;
    this.attractOnDemo = false;
    this.attractPage = "title";
    this.attractBoard = 0;
    this.attractThenTitle = false;
    this.killStreak = 0;
    this.bestStreak = 0;
    this.attractTimer = ATTRACT_HOLD;
    this.attractScene = 0;
    this.attractAge = 0;
    this.attractCue = null;
    this.initials = null;
    this.wavePick = null;
    this.startPick = null;
    this.shipId = this.save.shipId || WEDGE_ID;
    this.difficulty = "easy";
    this.lifeEvery = extraLifeEvery;
    this.hud.bay.onPickShip = (id) => this.setShip(id);
    this.hud.onContinue = () => {
      this.input._continueClick = true;
      this.acceptContinue();
    };
    this.hud.onPickDevice = (id) => this.applyControls(id);
    this.hud.onPickWave = (n) => this.startRun(n);
    this.hud.bay.onBuy = (id) => this.buyUpgrade(id);
    this.hud.onPickStart = (id) => this.confirmStart(id);

    this.hud.setHigh(this.save.highScore);
    this.hud.setScore(0);
    this.hud.setPoints(this.points);
    this.hud.setLives(0);
    this.hud.setShield(0, false, shieldConfig.max);
    this.hud.setSpecial("WARP EMP MSL");
    this.hud.setOre(0, 0, "");
    this.beginAttractLoop();
    this.offerDevicePick();
    this.ship.reset(worldConfig.width / 2, worldConfig.height / 2);
    this.ship.view.visible = false;
    this.fx.dust(worldConfig.width, worldConfig.height, 80);
    this.scatterField();
    this.spawnWave(5);
  }

  sfx(id) {
    if (this.attractOnDemo) return;
    this.audio.play(id);
  }

  tickMissileAudio(t, space) {
    this.audio.tickFly(0, 1);

    if (this.attractOnDemo || (this.mode !== PLAYING && this.mode !== DYING) || !this.ship.alive) {
      this.starBeepWait = 0;
      return;
    }
    let closest = Infinity;
    for (const star of this.castleStars) {
      if (!star.alive) continue;
      const dist = Math.hypot(
        wrapDelta(star.x - this.ship.x, space.width),
        wrapDelta(star.y - this.ship.y, space.height),
      );
      if (dist < closest) closest = dist;
    }
    if (!Number.isFinite(closest) || closest > 4000) {
      this.starBeepWait = 0;
      return;
    }
    const urgency = 1 - Math.min(1, closest / 4000);
    this.starBeepWait -= t;
    if (this.starBeepWait <= 0) {
      this.audio.incomingBeep(urgency);
      this.starBeepWait = Math.max(0.16, 0.95 - urgency * 0.72);
    }
  }

  space() {
    return { width: worldConfig.width, height: worldConfig.height };
  }

  playZoom() {
    const zoom = cameraConfig.zoom;
    return this.input.layout === "phone" ? zoom / 1.25 : zoom;
  }

  viewRadius() {
    return Math.hypot(this.app.screen.width, this.app.screen.height) * 0.5 / this.playZoom();
  }

  ringPoint(cx, cy, radius) {
    const angle = rand(0, Math.PI * 2);
    return {
      x: wrapCoord(cx + Math.cos(angle) * radius, worldConfig.width),
      y: wrapCoord(cy + Math.sin(angle) * radius, worldConfig.height),
    };
  }

  scatterField() {
    for (let i = 0; i < rocks.fieldCount; i += 1) {
      this.addRock(rand(0, worldConfig.width), rand(0, worldConfig.height), pick([3, 3, 3, 2]));
    }
  }

  spawnWave(count = Math.min(rocks.maxLarge, rocks.startCount + this.wave - 1)) {
    const space = this.space();
    const safeX = this.ship.x;
    const safeY = this.ship.y;
    const near = this.viewRadius() * 0.45;
    const far = this.viewRadius() * 1.15;
    for (let i = 0; i < count; i += 1) {
      let point = this.ringPoint(safeX, safeY, rand(near, far));
      for (let tries = 0; tries < 8 && Math.hypot(wrapDelta(point.x - safeX, space.width), wrapDelta(point.y - safeY, space.height)) < 220; tries += 1) {
        point = this.ringPoint(safeX, safeY, rand(near, far));
      }
      this.addRock(point.x, point.y, 3);
    }
  }

  nearbyRocks(radius) {
    const space = this.space();
    return this.asteroids.filter((rock) => {
      const dx = wrapDelta(rock.x - this.ship.x, space.width);
      const dy = wrapDelta(rock.y - this.ship.y, space.height);
      return dx * dx + dy * dy < radius * radius;
    }).length;
  }

  addRock(x, y, size, color = pick([colors.magenta, colors.orange])) {
    const rock = new Asteroid(x, y, size, color);
    this.asteroids.push(rock);
    this.vectors.addChild(rock.view);
    return rock;
  }

  clearRocks() {
    for (const rock of this.asteroids) rock.destroy();
    this.asteroids.length = 0;
    this.clearOres();
    this.clearShards();
  }

  clearOres() {
    for (const flake of this.ores) flake.kill();
    this.ores.length = 0;
  }

  clearShards() {
    for (const shard of this.shards) shard.destroy();
    this.shards.length = 0;
  }

  clearEnemies() {
    for (const enemy of this.enemies) enemy.destroy();
    this.enemies.length = 0;
    this.hostileShots.forEach((shot) => shot.kill());
  }

  enemiesFrom(base, role = "hunter") {
    return this.enemies.filter((enemy) => enemy.home === base && enemy.alive && enemy.role === role).length;
  }

  raiderCount() {
    return this.enemies.filter((enemy) => enemy.alive && enemy.role === "raider").length;
  }

  hunterCount() {
    return this.enemies.filter((enemy) => enemy.alive && enemy.role === "hunter").length;
  }

  assaultDuration(n) {
    if (n <= 1) return assault.wave1;
    if (n === 2) return assault.wave2;
    return assault.wave3 + (n - 3) * assault.grow;
  }

  beginAssault(n, silent = false) {
    this.assaultIndex = Math.max(1, n);
    this.assaultRest = false;
    this.assaultTime = this.assaultDuration(this.assaultIndex);
    this.raiderTimer = this.assaultIndex === 1 ? raid.first : 1.1;
    this.markWaveReached(this.assaultIndex);
    const destroyers = this.destroyerCap();
    for (const base of this.bases) {
      if (base.hub) continue;
      base.spawnTimer = 0.6 + Math.random() * 1.4;
      base.screenDestroyerTimer = destroyers > 0 ? 3.5 + Math.random() * 2.5 : 8;
    }
    if (!silent) this.sfx("warn");
  }

  beginRest() {
    this.assaultRest = true;
    this.assaultTime = assault.rest;
    this.sfx("dump");
  }

  assaultPlan() {
    const n = this.assaultIndex;
    const castles = this.bases.filter((base) => !base.hub && base.alive).length;
    if (n <= 1) {
      return {
        hunterGlobal: assault.w1Hunters,
        hunterPerCastle: 1,
        hunterEvery: assault.w1HunterEvery,
        raidMax: assault.w1RaidMax,
        raidEvery: assault.w1RaidEvery,
      };
    }
    if (n === 2) {
      const each = assault.w2PerCastle;
      return {
        hunterGlobal: Infinity,
        hunterPerCastle: each,
        hunterEvery: castle.spawnEvery,
        raidMax: Math.max(each, castles * each),
        raidEvery: castle.spawnEvery,
      };
    }
    return {
      hunterGlobal: Infinity,
      hunterPerCastle: castle.spawnMax,
      hunterEvery: castle.spawnEvery,
      raidMax: raid.max,
      raidEvery: raid.every,
    };
  }

  destroyerCap() {
    const from = destroyerConfig.fromWave ?? 4;
    if (this.assaultIndex < from) return 0;
    return this.assaultIndex - from + 1;
  }

  tickAssault(t) {
    this.assaultTime -= t;
    if (this.assaultTime > 0) return;
    if (this.assaultRest) this.beginAssault(this.assaultIndex + 1);
    else this.beginRest();
  }

  tickCastleWatch(t, space) {
    if (!this.ship.alive || this.input.mapHeld) return;
    const reach = this.viewRadius();
    for (const base of this.bases) {
      if (base.hub || !base.alive) continue;
      const dist = Math.hypot(
        wrapDelta(base.x - this.ship.x, space.width),
        wrapDelta(base.y - this.ship.y, space.height),
      );
      if (dist > reach) {
        base.screenSpawnTimer = castle.screenEvery;
        continue;
      }
      base.screenSpawnTimer -= t;
      if (base.screenSpawnTimer <= 0) {
        const pack = castle.screenHunters ?? 3;
        for (let i = 0; i < pack; i += 1) this.spawnEnemy(base);
        base.screenSpawnTimer = castle.screenEvery;
      }
    }
  }

  tickDestroyerLasers(t, space) {
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.role !== "destroyer") {
        enemy.laserG?.clear();
        continue;
      }
      if (enemy.stunned > 0 || !this.ship.alive) {
        enemy.laserCharge = 0;
        enemy.laserOn = false;
        enemy.paintLaser(null);
        continue;
      }
      enemy.laserCool = Math.max(0, enemy.laserCool - t);
      if (enemy.laserCool > 0) {
        enemy.laserCharge = 0;
        enemy.laserOn = false;
        enemy.paintLaser(null);
        continue;
      }
      const dx = wrapDelta(this.ship.x - enemy.x, space.width);
      const dy = wrapDelta(this.ship.y - enemy.y, space.height);
      const dist = Math.hypot(dx, dy);
      const locked = !this.ship.docked && dist < destroyerConfig.laserRange;
      if (!enemy.laserOn) {
        if (!locked) {
          enemy.paintLaser(null);
          continue;
        }
        enemy.laserOn = true;
        enemy.laserCharge = 0;
      }
      enemy.laserCharge += t;
      const strength = Math.min(1, enemy.laserCharge / destroyerConfig.laserTime);
      if (locked && this.ship.shieldOn) {
        enemy.paintLaser(this.ship, space, 0.22, true);
      } else if (locked) {
        enemy.paintLaser(this.ship, space, strength, false);
        if (enemy.laserCharge >= destroyerConfig.laserTime && this.ship.invuln <= 0) this.killShip();
      } else {
        enemy.paintLaser(this.ship, space, strength * 0.35, false);
      }
      if (enemy.laserCharge >= destroyerConfig.laserTime) {
        enemy.laserCharge = 0;
        enemy.laserOn = false;
        enemy.laserCool = destroyerConfig.laserRecharge;
        enemy.paintLaser(null);
      }
    }
  }

  spawnEnemy(base, role = "hunter") {
    const angle = rand(0, Math.PI * 2);
    const reach = role === "destroyer" ? 220 : 92;
    const enemy = new Enemy(
      wrapCoord(base.x + Math.cos(angle) * reach, worldConfig.width),
      wrapCoord(base.y + Math.sin(angle) * reach, worldConfig.height),
      base,
      base.color,
      { role },
    );
    this.enemies.push(enemy);
    this.vectors.addChild(enemy.view);
    return enemy;
  }

  spawnRaider(base) {
    const angle = Math.atan2(
      wrapDelta(this.hub.y - base.y, worldConfig.height),
      wrapDelta(this.hub.x - base.x, worldConfig.width),
    ) + rand(-0.4, 0.4);
    const reach = 100;
    const enemy = new Enemy(
      wrapCoord(base.x + Math.cos(angle) * reach, worldConfig.width),
      wrapCoord(base.y + Math.sin(angle) * reach, worldConfig.height),
      base,
      base.color,
      { role: "raider" },
    );
    enemy.vx = Math.cos(angle) * 180;
    enemy.vy = Math.sin(angle) * 180;
    this.enemies.push(enemy);
    this.vectors.addChild(enemy.view);
    return enemy;
  }

  aimedAt(target, space, cone = 0.16) {
    const dx = wrapDelta(target.x - this.ship.x, space.width);
    const dy = wrapDelta(target.y - this.ship.y, space.height);
    const desired = Math.atan2(dy, dx);
    return Math.abs(wrapDelta(this.ship.rotation - desired, Math.PI * 2)) < cone;
  }

  fireHostile(enemy) {
    const bullet = this.hostileShots.find((shot) => !shot.alive);
    if (!bullet) return;
    if (enemy.role === "destroyer") {
      const prey = this.ship.alive ? this.ship : this.hub;
      const dx = wrapDelta(prey.x - enemy.x, worldConfig.width);
      const dy = wrapDelta(prey.y - enemy.y, worldConfig.height);
      const aim = Math.atan2(dy, dx);
      const gun = enemy.turretWorld(enemy.gunSign);
      enemy.gunSign *= -1;
      bullet.fire(gun.x, gun.y, aim, {
        hostile: true,
        color: enemy.color,
        hot: enemy.hotColor,
        speed: 620,
        life: 1.15,
      });
      enemy.cooldown = 1.25;
      this.sfx("enemy");
      return;
    }
    const nose = enemy.nose();
    bullet.fire(nose.x, nose.y, enemy.rotation, {
      hostile: true,
      color: enemy.color,
      hot: enemy.hotColor,
      speed: 620,
      life: 1.15,
    });
    enemy.cooldown = 0.85;
    this.sfx("enemy");
  }

  spawnShards(points, body, options) {
    const specs = options.chips ? chipBurst(body, options, options.chips) : shatter(points, body, options);
    for (const spec of specs) {
      const shard = new Debris(spec);
      this.shards.push(shard);
      this.vectors.addChild(shard.view);
    }
  }

  startRun(wave = 1, resume = false) {
    const tune = applyDifficulty("easy");
    this.difficulty = "easy";
    this.lifeEvery = tune.extraLifeEvery;
    this.save.settings.difficulty = "easy";
    this.storage.save(this.save);
    this.stopAttract();
    this.audio.unlock();
    this.mode = PLAYING;
    this.wavePick = null;
    this.startPick = null;
    this.score = 0;
    this.freshLoadout();
    this.runDirty = false;
    this.killStreak = 0;
    this.bestStreak = 0;
    this.lives = shipConfig.lives;
    this.wave = 1;
    this.waveCooldown = 0;
    this.homeOn = false;
    this.dockOpen = false;
    this.cooldown = 0;
    this.gun = 0;
    this.burstLeft = 0;
    this.fireWasOn = false;
    this.timer = 0;
    this.shake = 0;
    this.nextLifeAt = this.lifeEvery;
    this.clearRocks();
    this.clearEnemies();
    this.shots.forEach((shot) => shot.kill());
    this.missiles.forEach((missile) => missile.kill(true));
    this.hubMissiles.forEach((missile) => missile.kill(true));
    this.castleStars.forEach((star) => star.kill(true));
    this.missileCool = 0;
    this.emp.kill();
    this.empCool = 0;
    this.warpCool = 0;
    this.cargo = 0;
    for (const base of this.bases) base.resetCombat();
    const resumed = resume && this.applyCheckpoint();
    if (!resumed) {
      const startWave = Math.max(1, Math.min(Math.floor(Number(wave) || 1), this.save.maxWave || 1));
      this.beginAssault(startWave, true);
      this.seedWorldForWave(startWave);
    }
    this.ship.reset(worldConfig.width / 2, worldConfig.height / 2);
    this.applyShipSkin();
    this.ship.setCargo(this.cargo);
    this.hub.forceDock(this.ship, 0);
    this.snapCamera();
    this.applyShieldLevel(true);
    this.hud.setScore(this.score);
    this.hud.setPoints(this.points);
    this.hud.setLives(this.lives);
    this.hud.setShield(this.ship.shieldEnergy, false, this.shieldPool());
    this.refreshDock();
    this.hud.setSpecial("WARP EMP MSL");
    this.hubThreat = 0;
    this.hubThreatClose = false;
    this.hubAlertOn = false;
    this.hubWarnPulse = 0;
    this.starBeepWait = 0;
    this.selected = null;
    this.lockMark.visible = false;
    this.hangar.view.visible = false;
    this.pips.view.visible = true;
    this.hud.setHubAlert(null);
    this.hud.setOre(this.cargo, this.hub.ore, this.hub.upgradeName());
    this.hud.hideCenter();
    if (this.ship.docked) this.hud.showDock(this.shipId);
    this.scatterField();
    this.spawnWave();
  }

  sleepLateBases() {
    this.pendingBases = this.bases.filter((base) => !base.hub && base.name !== "NORTH");
    for (const base of this.pendingBases) base.sleep();
    this.arriveWait = castle.arriveEvery;
    this.baseUnlockIn = this.arriveWait;
    this.seenCastles = new Set(["NORTH"]);
    this.castlesArmed = false;
  }

  queueCastle(base) {
    if (!base || base.hub || this.pendingBases.includes(base)) return;
    const wasEmpty = this.pendingBases.length === 0;
    this.pendingBases.push(base);
    if (wasEmpty) this.baseUnlockIn = this.arriveWait;
  }

  openNextBase(silent = false) {
    const base = this.pendingBases.shift();
    if (!base) return;
    base.resetCombat();
    this.seenCastles.add(base.name);
    if (this.seenCastles.size >= 4) {
      this.castlesArmed = true;
      this.armCastles();
    } else if (this.castlesArmed) {
      this.armCastle(base);
    }
    if (!silent) {
      this.fx.burst(base.x, base.y, base.color, 22, 180);
      this.fx.burst(base.x, base.y, colors.white, 10, 120);
      this.hud.setMode(`${base.name}  ONLINE`);
      this.sfx("castle");
    }
    this.arriveWait = Math.max(castle.arriveFloor, this.arriveWait * castle.arriveShrink);
    this.baseUnlockIn = this.pendingBases.length ? this.arriveWait : 0;
  }

  timeToWave(n) {
    let t = 0;
    for (let i = 1; i < n; i += 1) t += this.assaultDuration(i) + assault.rest;
    return t;
  }

  seedWorldForWave(n) {
    this.sleepLateBases();
    let left = this.timeToWave(n);
    while (this.pendingBases.length && left >= this.baseUnlockIn) {
      left -= this.baseUnlockIn;
      this.openNextBase(true);
    }
    this.baseUnlockIn = this.pendingBases.length ? Math.max(0.05, this.baseUnlockIn - left) : 0;
  }

  markWaveReached(n) {
    if (this.attractOnDemo) return;
    const wave = Math.max(1, Math.floor(Number(n) || 1));
    if (wave <= (this.save.maxWave || 1)) return;
    this.save.maxWave = wave;
    this.storage.save(this.save);
  }

  unlockedWave() {
    return Math.max(1, Math.floor(Number(this.save.maxWave) || 1));
  }

  offerStart() {
    if (!this.hasCheckpoint()) {
      this.offerWavePick();
      return;
    }
    this.stopAttract();
    this.mode = STARTPICK;
    this.startPick = "continue";
    this.hud.showStartPick(this.checkpointLabel(), "continue");
  }

  confirmStart(id) {
    if (id === "continue") this.startRun(1, true);
    else this.offerWavePick();
  }

  tickStartPick() {
    if (this.input.letterLeft || this.input.letterRight) {
      this.startPick = this.startPick === "continue" ? "new" : "continue";
      this.hud.showStartPick(this.checkpointLabel(), this.startPick);
    }
    if (this.input.startPressed || this.input.firePressed) this.confirmStart(this.startPick || "continue");
    else if (this.input.quitPressed) {
      this.startPick = null;
      this.mode = TITLE;
      this.hud.showTitle();
      this.beginAttractLoop();
    }
  }

  offerWavePick() {
    const max = this.unlockedWave();
    if (max <= 1) {
      this.startRun(1);
      return;
    }
    this.stopAttract();
    this.mode = WAVEPICK;
    this.wavePick = { max, selected: max };
    this.hud.showWavePick(max, max);
  }

  nudgeWave(dir) {
    if (!this.wavePick) return;
    const next = Math.max(1, Math.min(this.wavePick.max, this.wavePick.selected + dir));
    if (next === this.wavePick.selected) return;
    this.wavePick.selected = next;
    this.hud.paintWavePick(this.wavePick.max, next);
  }

  tickWavePick() {
    if (this.input.letterLeft) this.nudgeWave(-1);
    if (this.input.letterRight) this.nudgeWave(1);
    if (this.input.startPressed || this.input.firePressed) this.startRun(this.wavePick?.selected || 1);
    else if (this.input.quitPressed) {
      this.wavePick = null;
      this.mode = TITLE;
      this.hud.showTitle();
      this.beginAttractLoop();
    }
  }

  armCastle(base) {
    if (!base || base.hub) return;
    base.armed = true;
    base.missileEvery = castle.starEvery;
    if (base.missileCool <= 0) base.missileCool = 1.4 + Math.random() * 2;
  }

  armCastles() {
    for (const base of this.bases) {
      if (base.alive && !base.hub) this.armCastle(base);
    }
  }

  openShips() {
    this.stopAttract();
    this.mode = SHIPS;
    this.hud.showShips();
    this.hangar.view.visible = true;
    this.pips.view.visible = false;
    this.hangar.layout(this.app.screen);
  }

  closeShips() {
    this.mode = TITLE;
    this.hangar.view.visible = false;
    this.pips.view.visible = true;
    this.hud.showTitle();
    this.beginAttractLoop();
  }

  offerDevicePick() {
    const saved = this.save.settings.controls;
    if (saved === "desktop" || saved === "phone") {
      this.applyControls(saved, false);
      return;
    }
    if (maybePhone()) {
      this.pickingDevice = true;
      this.hud.showDevicePick();
      return;
    }
    this.applyControls("desktop", false);
  }

  applyControls(id, persist = true) {
    const layout = id === "phone" ? "phone" : "desktop";
    this.pickingDevice = false;
    this.input.setLayout(layout);
    this.touch.setActive(layout === "phone");
    this.camZoom = this.playZoom();
    this.world.scale.set(this.camZoom);
    this.hud.setLayout(layout);
    this.hud.hideDevicePick();
    this.hud.showTitle();
    if (persist) {
      this.save.settings.controls = layout;
      this.storage.save(this.save);
    }
  }

  beginAttractLoop(page = "title", options = {}) {
    this.attractOnDemo = false;
    this.attractPage = page;
    this.attractBoard = 0;
    this.attractThenTitle = Boolean(options.thenTitle);
    this.attractAge = 0;
    this.attractCue = null;
    if (page === "scores") {
      this.attractTimer = options.hold ?? ATTRACT_SCORES;
      this.showScoreBoard();
      return;
    }
    this.attractTimer = ATTRACT_HOLD;
    this.hud.showTitle();
  }

  scoreBoardOf(id) {
    if (id === "daily") return padScoreRows(this.save.dailyScores);
    if (id === "streak") return padScoreRows(this.save.killStreaks);
    return padScoreRows(this.save.highScores);
  }

  showScoreBoard() {
    const board = SCORE_BOARDS[this.attractBoard] || SCORE_BOARDS[0];
    this.hud.showScores(this.scoreBoardOf(board.id), board.title);
  }

  rankEntry() {
    return {
      all: scoreQualifies(this.score, this.save.highScores),
      daily: scoreQualifies(this.score, this.save.dailyScores),
      streak: scoreQualifies(this.bestStreak, this.save.killStreaks),
    };
  }

  noteKill() {
    if (this.attractOnDemo || this.mode !== PLAYING) return;
    this.killStreak += 1;
    if (this.killStreak > this.bestStreak) this.bestStreak = this.killStreak;
  }

  stopAttract() {
    if (this.attractOnDemo) this.endAttractDemo();
    this.attractOnDemo = false;
    this.hud.setAttractDemo(false);
  }

  openAttractDemo() {
    this.attractOnDemo = true;
    this.attractTimer = ATTRACT_PLAY;
    this.attractAge = 0;
    this.beginAttractScene();
    this.hud.setAttractDemo(true);
  }

  closeAttractDemo() {
    this.endAttractDemo();
    this.attractOnDemo = false;
    this.attractScene = (this.attractScene + 1) % ATTRACT_SCENES.length;
    this.hud.setAttractDemo(false);
  }

  beginAttractScene() {
    this.clearEnemies();
    this.shots.forEach((shot) => shot.kill());
    this.hostileShots.forEach((shot) => shot.kill());
    this.missiles.forEach((missile) => missile.kill(true));
    this.hubMissiles.forEach((missile) => missile.kill(true));
    this.emp.kill();
    this.selected = null;
    this.lockMark.visible = false;
    this.missileCool = 0;
    this.empCool = 0;
    this.warpCool = 0;
    this.cooldown = 0;
    const setup = ATTRACT_SCENES[this.attractScene] ?? ATTRACT_SCENES[0];
    this.attractCue = setup(this, demoSkinFor(this.attractScene)) || {};
    this.snapCamera();
  }

  endAttractDemo() {
    this.ship.setSkin(null);
    this.ship.kill();
    this.ship.view.visible = false;
    this.clearEnemies();
    this.shots.forEach((shot) => shot.kill());
    this.hostileShots.forEach((shot) => shot.kill());
    this.missiles.forEach((missile) => missile.kill(true));
    this.hubMissiles.forEach((missile) => missile.kill(true));
    this.castleStars.forEach((star) => star.kill(true));
    this.emp.kill();
    this.selected = null;
    this.lockMark.visible = false;
    this.hubThreat = 0;
    this.hubThreatClose = false;
    this.hud.setHubAlert(null);
    this.hud.setMode("");
    this.clearRocks();
    this.scatterField();
    for (const base of this.bases) base.resetCombat();
    this.sleepLateBases();
    this.attractCue = null;
  }

  tickAttract(t, space) {
    this.attractTimer -= t;
    if (this.attractTimer <= 0) {
      if (this.attractPage === "title") {
        this.attractPage = "scores";
        this.attractBoard = 0;
        this.attractTimer = ATTRACT_SCORES;
        this.showScoreBoard();
      } else if (this.attractPage === "scores") {
        if (this.attractBoard < SCORE_BOARDS.length - 1) {
          this.attractBoard += 1;
          this.attractTimer = this.attractThenTitle ? 3 : ATTRACT_SCORES;
          this.showScoreBoard();
        } else if (this.attractThenTitle) {
          this.attractThenTitle = false;
          this.attractPage = "title";
          this.attractTimer = ATTRACT_HOLD;
          this.hud.showTitle();
        } else {
          this.attractPage = "demo";
          this.openAttractDemo();
        }
      } else {
        this.closeAttractDemo();
        this.attractPage = "title";
        this.attractTimer = ATTRACT_HOLD;
        this.hud.showTitle();
      }
    }
    if (this.attractOnDemo) {
      this.ship.invuln = 0;
      this.attractPilot(t, space);
    }
  }

  attractPilot(t, space) {
    if (!this.ship.alive) return;
    this.attractAge += t;
    const cue = this.attractCue || {};
    if (cue.empAt && !cue.empDone && this.attractAge >= cue.empAt) {
      cue.empDone = true;
      this.fireEmp();
    }
    if (cue.warpAt && !cue.warpDone && this.attractAge >= cue.warpAt) {
      cue.warpDone = true;
      this.fireWarp();
    }
    if (this.ship.warping) {
      this.ship.tickWarp(t, space);
      this.fx.emit(4, {
        x: this.ship.x,
        y: this.ship.y,
        color: colors.cyanHot,
        speed: 28,
        speedVar: 36,
        life: 0.24,
        size: 6,
      });
      return;
    }
    const prey = this.lockTarget(space);
    this.selected = prey;
    const heading = prey
      ? Math.atan2(wrapDelta(prey.y - this.ship.y, space.height), wrapDelta(prey.x - this.ship.x, space.width))
      : this.ship.rotation + 1.1 * t;
    const sway = Math.sin(this.attractAge * 3.2);
    this.ship.update(t, { aim: heading, rotate: 0, surge: 0.86, strafe: sway * 0.78 }, space);
    if (!this.ship.shieldOn && this.ship.shieldEnergy > 0.35) this.ship.tickShield(t, true);
    else this.ship.tickShield(t, false);
    this.shoot();
    if (this.attractAge > 0.2) this.fireMissile();
    this.ship.view.visible = true;
    this.ship.view.alpha = 1;
  }

  addScore(amount) {
    if (this.attractOnDemo) return;
    this.score += amount;
    this.hud.setScore(this.score);
    if (this.score > this.save.highScore) {
      this.save.highScore = this.score;
      this.storage.save(this.save);
      this.hud.setHigh(this.save.highScore);
    }
    if (this.score >= this.nextLifeAt) {
      this.lives += 1;
      this.nextLifeAt += this.lifeEvery;
      this.hud.setLives(this.lives);
      this.sfx("life");
      this.fx.burst(this.ship.x, this.ship.y, colors.cyanHot, 18, 140);
    }
  }

  gunTier() {
    if (this.attractOnDemo) return 5;
    return Math.max(1, Math.min(5, this.levels?.gun || 1));
  }

  missileVolley() {
    if (this.attractOnDemo) return missiles.volley ?? 8;
    return Math.max(0, Math.min(6, (this.levels?.missile || 1) - 1));
  }

  empTier() {
    if (this.attractOnDemo) return 2;
    return Math.max(1, Math.min(4, this.levels?.emp || 1));
  }

  shieldPool() {
    const top = shipLevels.shield || 4;
    const n = Math.max(1, Math.min(top, this.levels?.shield || 1));
    return shieldConfig.max * (1 + (n - 1) / (top - 1));
  }

  upgradeCost(id) {
    const max = shipLevels[id];
    const level = this.levels[id] || 1;
    if (!max || level >= max) return 0;
    return shipLevels.cost[id][level - 1] || 0;
  }

  refreshDock() {
    this.hud.bay.setUpgrades({
      points: this.points,
      levels: this.levels,
      costs: {
        gun: this.upgradeCost("gun"),
        missile: this.upgradeCost("missile"),
        emp: this.upgradeCost("emp"),
        shield: this.upgradeCost("shield"),
      },
      max: {
        gun: shipLevels.gun,
        missile: shipLevels.missile,
        emp: shipLevels.emp,
        shield: shipLevels.shield,
      },
    });
  }

  applyShieldLevel(fill = false) {
    const pool = this.shieldPool();
    this.ship.setShieldMax(pool, fill);
    this.hud.setShield(this.ship.shieldEnergy, this.ship.shieldOn, pool);
  }

  addPoints(amount) {
    if (this.attractOnDemo) return;
    const n = Math.max(0, Math.floor(Number(amount) || 0));
    if (!n) return;
    this.points += n;
    this.hud.setPoints(this.points);
    this.refreshDock();
    this.writeCheckpoint();
  }

  buyUpgrade(id) {
    if (this.mode !== PLAYING || !this.ship.docked) return;
    const cost = this.upgradeCost(id);
    if (!cost || this.points < cost) return;
    this.points -= cost;
    this.levels[id] = (this.levels[id] || 1) + 1;
    if (id === "shield") this.applyShieldLevel(true);
    this.hud.setPoints(this.points);
    this.refreshDock();
    this.runDirty = true;
    this.writeCheckpoint();
    this.sfx("up");
    this.hud.setMode(`${id === "missile" ? "MSL" : id === "shield" ? "SHD" : id.toUpperCase()}  ${this.levels[id]}`);
  }

  shoot() {
    if (!this.ship.alive || this.ship.docked) return;
    const held = this.attractOnDemo || this.input.fireHeld;
    if (!held || this.cooldown > 0) return;
    const gun = this.gunTier();
    const bullet = this.shots.find((shot) => !shot.alive);
    if (!bullet) return;
    const dual = gun >= 5;
    const muzzle = this.ship.muzzle(dual ? (this.gun === 0 ? -1 : 1) : 0);
    bullet.fire(muzzle.x, muzzle.y, this.ship.rotation);
    if (dual) this.gun ^= 1;
    this.cooldown = shipLevels.gunCool[gun - 1] ?? bullets.cooldown;
    this.sfx("thud");
  }

  lockTarget(space) {
    return this.missileTargets(space, 1)[0] || null;
  }

  missileTargets(space, count) {
    const picks = [];
    const used = new Set();
    if (this.selected?.alive && this.enemies.includes(this.selected)) {
      picks.push(this.selected);
      used.add(this.selected);
    }
    const ranked = [];
    for (const enemy of this.enemies) {
      if (!enemy.alive || used.has(enemy)) continue;
      const dx = wrapDelta(enemy.x - this.ship.x, space.width);
      const dy = wrapDelta(enemy.y - this.ship.y, space.height);
      const dist = Math.hypot(dx, dy);
      if (dist < 50) continue;
      const err = Math.abs(wrapDelta(this.ship.rotation - Math.atan2(dy, dx), Math.PI * 2));
      ranked.push({ enemy, dist, err });
    }
    ranked.sort((a, b) => {
      const aIn = a.err <= missiles.cone;
      const bIn = b.err <= missiles.cone;
      if (aIn !== bIn) return aIn ? -1 : 1;
      return a.dist - b.dist;
    });
    for (const row of ranked) {
      if (picks.length >= count) break;
      picks.push(row.enemy);
    }
    return picks;
  }

  pointerWorld() {
    const mx = this.input.mouseX - this.app.screen.width * 0.5;
    const my = this.input.mouseY - this.app.screen.height * 0.5;
    const z = this.camZoom || cameraConfig.zoom;
    const c = Math.cos(this.camRot);
    const s = Math.sin(this.camRot);
    const lx = mx / z;
    const ly = my / z;
    return {
      x: wrapCoord(this.camX + lx * c + ly * s, worldConfig.width),
      y: wrapCoord(this.camY + -lx * s + ly * c, worldConfig.height),
    };
  }

  pickables() {
    return [
      ...this.enemies.filter((enemy) => enemy.alive),
      ...this.bases.filter((base) => base.alive && !base.hub),
    ];
  }

  selectAtPointer() {
    const screen = this.app.screen;
    const space = this.space();
    const mx = this.input.mouseX - screen.width * 0.5;
    const my = this.input.mouseY - screen.height * 0.5;
    const cos = Math.cos(this.camRot);
    const sin = Math.sin(this.camRot);
    const zoom = this.camZoom || cameraConfig.zoom;
    const mapping = this.input.mapHeld;
    let best = null;
    let bestDist = Infinity;
    for (const target of this.pickables()) {
      const dx = wrapDelta(target.x - this.camX, space.width);
      const dy = wrapDelta(target.y - this.camY, space.height);
      const sx = (dx * cos - dy * sin) * zoom;
      const sy = (dx * sin + dy * cos) * zoom;
      const dist = Math.hypot(sx - mx, sy - my);
      const boost = mapping && target.kind !== "base" ? 16 : 1;
      const reach = Math.max(32, (target.radius * boost + 18) * zoom);
      if (dist < reach && dist < bestDist) {
        best = target;
        bestDist = dist;
      }
    }
    this.selected = best;
  }

  drawLock() {
    this.lockMark.clear();
    if (!this.selected?.alive) {
      this.selected = null;
      this.lockMark.visible = false;
      return;
    }
    const r = (this.selected.radius || 16) + 10;
    const color = this.selected.hotColor || colors.amber;
    const corners = (graphics) => {
      graphics.moveTo(-r, -r * 0.35);
      graphics.lineTo(-r, -r);
      graphics.lineTo(-r * 0.35, -r);
      graphics.moveTo(r, -r * 0.35);
      graphics.lineTo(r, -r);
      graphics.lineTo(r * 0.35, -r);
      graphics.moveTo(-r, r * 0.35);
      graphics.lineTo(-r, r);
      graphics.lineTo(-r * 0.35, r);
      graphics.moveTo(r, r * 0.35);
      graphics.lineTo(r, r);
      graphics.lineTo(r * 0.35, r);
    };
    corners(this.lockMark);
    this.lockMark.stroke({ width: 3.4, color, alpha: 0.22, cap: "square" });
    corners(this.lockMark);
    this.lockMark.stroke({ width: 1.2, color, cap: "square" });
    this.lockMark.visible = true;
    this.placeView({ view: this.lockMark, x: this.selected.x, y: this.selected.y }, worldConfig.width, worldConfig.height);
    this.vectors.addChild(this.lockMark);
  }

  freshLoadout() {
    this.levels = { gun: 1, missile: 1, emp: 1, shield: 1 };
    this.points = 0;
    this.loadoutBank = 0;
  }

  hasCheckpoint() {
    return Boolean(normalizeCheckpoint(this.save.checkpoint));
  }

  checkpointLabel() {
    const cp = normalizeCheckpoint(this.save.checkpoint);
    if (!cp) return "";
    return `WAVE  ${cp.wave}`;
  }

  writeCheckpoint() {
    if (this.attractOnDemo || this.mode !== PLAYING || this.lives <= 0) return;
    this.save.checkpoint = normalizeCheckpoint({
      active: true,
      wave: this.assaultIndex,
      rest: this.assaultRest,
      score: this.score,
      lives: this.lives,
      cargo: this.cargo,
      shipId: this.shipId,
      loadout: {
        gun: this.levels?.gun,
        missile: this.levels?.missile,
        emp: this.levels?.emp,
        shield: this.levels?.shield,
        points: this.points,
        bank: this.loadoutBank,
      },
      hubOre: this.hub.ore,
      seen: [...(this.seenCastles || [])],
      arriveWait: this.arriveWait,
      baseUnlockIn: this.baseUnlockIn,
      nextLifeAt: this.nextLifeAt,
      castlesArmed: this.castlesArmed,
    });
    this.save.shipId = this.shipId;
    this.storage.save(this.save);
  }

  restoreWorld(cp) {
    this.sleepLateBases();
    this.seenCastles = new Set();
    this.castlesArmed = Boolean(cp.castlesArmed);
    for (const name of cp.seen || []) {
      const base = this.bases.find((item) => item.name === name);
      if (!base || base.hub) continue;
      this.pendingBases = this.pendingBases.filter((item) => item !== base);
      if (!base.alive) base.resetCombat();
      else {
        base.alive = true;
        base.view.visible = true;
      }
      this.seenCastles.add(name);
    }
    if (this.seenCastles.size >= 4 || this.castlesArmed) {
      this.castlesArmed = true;
      this.armCastles();
    }
    this.arriveWait = cp.arriveWait || castle.arriveEvery;
    this.baseUnlockIn = this.pendingBases.length ? cp.baseUnlockIn || this.arriveWait : 0;
    this.hub.resetCombat();
    if (cp.hubOre) this.hub.deposit(cp.hubOre);
  }

  applyCheckpoint() {
    const cp = normalizeCheckpoint(this.save.checkpoint);
    if (!cp) return false;
    this.shipId = cp.shipId;
    this.levels = {
      gun: cp.loadout.gun,
      missile: cp.loadout.missile,
      emp: cp.loadout.emp,
      shield: cp.loadout.shield,
    };
    this.points = cp.loadout.points;
    this.loadoutBank = cp.loadout.bank;
    this.score = cp.score;
    this.lives = cp.lives;
    this.cargo = cp.cargo;
    this.nextLifeAt = cp.nextLifeAt || this.lifeEvery;
    this.beginAssault(cp.wave, true);
    this.assaultRest = cp.rest;
    this.assaultTime = cp.rest ? assault.rest : this.assaultDuration(cp.wave);
    this.restoreWorld(cp);
    return true;
  }

  persistLoadout() {
    this.save.shipId = this.shipId;
    this.storage.save(this.save);
  }

  applyShipSkin() {
    const spec = this.shipId === WEDGE_ID ? null : SHIP_CATALOG.find((item) => item.id === this.shipId);
    this.ship.setSkin(spec || null);
  }

  setShip(id) {
    this.shipId = id || WEDGE_ID;
    this.applyShipSkin();
    this.persistLoadout();
    this.hud.bay.setState(this.shipId);
  }

  fireMissile(force = false) {
    if ((!force && this.missileCool > 0) || !this.ship.alive || this.ship.docked) return;
    const space = this.space();
    const volley = this.missileVolley();
    if (volley <= 0) return;
    const targets = this.missileTargets(space, volley);
    const nose = this.ship.nose();
    let fired = 0;
    for (let i = 0; i < volley; i += 1) {
      const missile = this.missiles.find((item) => !item.alive);
      if (!missile) break;
      const spread = (i - (volley - 1) * 0.5) * 0.07;
      missile.fire(nose.x, nose.y, this.ship.rotation + spread, targets[i] || null);
      fired += 1;
      const mark = targets[i];
      if (mark) {
        this.fx.emit(4, {
          x: mark.x,
          y: mark.y,
          color: colors.amber,
          speed: 36,
          speedVar: 16,
          life: 0.18,
          size: 4,
        });
      }
    }
    if (!fired) return;
    this.missileCool = missiles.cooldown;
    this.sfx("missile");
    this.fx.emit(10, {
      x: nose.x,
      y: nose.y,
      color: colors.amber,
      speed: 80,
      speedVar: 46,
      life: 0.2,
      size: 6,
    });
  }

  fireWarp(force = false) {
    if ((!force && this.warpCool > 0) || this.ship.warping || !this.ship.alive) return;
    if (this.ship.docked) this.ship.release(this.input);
    const angle = this.ship.rotation;
    this.ship.beginWarp(Math.cos(angle) * warp.range, Math.sin(angle) * warp.range, warp.duration);
    this.warpCool = warp.cooldown;
    this.fx.burst(this.ship.x, this.ship.y, colors.cyanHot, 14, 220);
    this.fx.burst(this.ship.x, this.ship.y, colors.white, 8, 140);
  }

  fireEmp(force = false) {
    if (this.empTier() <= 1) return;
    if ((!force && this.empCool > 0) || this.emp.alive || !this.ship.alive || this.ship.docked) return;
    const reach = Math.hypot(this.app.screen.width, this.app.screen.height) * 0.5 / (this.camZoom || cameraConfig.zoom);
    this.emp.fire(this.ship.x, this.ship.y, reach);
    this.empCool = emp.cooldown;
    this.fx.burst(this.ship.x, this.ship.y, colors.cyanHot, 18, 160);
    this.fx.burst(this.ship.x, this.ship.y, colors.white, 8, 90);
    this.sfx("emp");
  }

  detonateMissile(missile, at) {
    this.fx.burst(missile.x, missile.y, colors.orange, 16, 180);
    this.fx.burst(missile.x, missile.y, colors.amber, 8, 120);
    this.shake = Math.max(this.shake, 6);
    this.sfx("boom");
    missile.kill();
    if (at) {
      this.spawnShards(null, { x: missile.x, y: missile.y, vx: 0, vy: 0, rotation: 0, radius: 16 }, {
        color: colors.orange,
        hotColor: colors.amber,
        kick: debrisConfig.rockKick * 0.7,
        life: 0.45,
        chips: 6,
      });
    }
  }

  pointerAim() {
    if (!this.input.hasPointer) return null;
    const mx = this.input.mouseX - this.app.screen.width * 0.5;
    const my = this.input.mouseY - this.app.screen.height * 0.5;
    const c = Math.cos(this.camRot);
    const s = Math.sin(this.camRot);
    return Math.atan2(-mx * s + my * c, mx * c + my * s);
  }

  chipRock(rock, impact, amount = 1) {
    rock.hp -= amount;
    this.spawnShards(null, rock, {
      color: rock.color,
      hotColor: rock.hotColor,
      kick: debrisConfig.rockKick * 0.7,
      life: 0.55,
      chips: 4 + rock.size,
    });
    this.fx.emit(6, {
      x: rock.x,
      y: rock.y,
      color: rock.hotColor,
      speed: 90,
      speedVar: 50,
      life: 0.22,
      size: 6,
    });
    if (impact) {
      const mag = Math.hypot(impact.vx, impact.vy) || 1;
      rock.kick(impact.vx / mag, impact.vy / mag, 18);
    }
    rock.spin += rand(-0.8, 0.8);
    if (rock.hp <= 0) this.killRock(rock, impact);
    else this.sfx("hit");
  }

  chipEnemy(enemy, impact, amount = 1, via = "shot") {
    const atX = impact?.x ?? enemy.x;
    const atY = impact?.y ?? enemy.y;
    if (enemy.role === "destroyer") {
      if (enemy.shieldHp > 0) {
        enemy.addHitFlash(atX, atY, worldConfig.width, worldConfig.height, 0.06);
        this.shieldHitFlash(atX, atY, enemy.hotColor);
      } else {
        enemy.addHitFlash(atX, atY, worldConfig.width, worldConfig.height, 0.14);
        this.fx.emit(via === "missile" ? 10 : 7, {
          x: atX,
          y: atY,
          color: colors.white,
          speed: 110,
          speedVar: 50,
          life: 0.16,
          size: 6,
        });
      }
      const pierce = via === "missile" || Math.random() < destroyerConfig.pierce || enemy.shieldHp <= 0;
      if (pierce) {
        this.spawnShards(null, { x: atX, y: atY, vx: enemy.vx, vy: enemy.vy, rotation: enemy.rotation, radius: 18 }, {
          color: enemy.color,
          hotColor: enemy.hotColor,
          kick: debrisConfig.rockKick * (enemy.shieldHp > 0 ? 0.55 : 0.9),
          life: enemy.shieldHp > 0 ? 0.55 : 0.8,
          longLife: 3,
          longChance: 0.4,
          chips: via === "missile" ? 5 : enemy.shieldHp > 0 ? 2 : 4,
        });
      }
      if (enemy.shieldHp > 0) {
        const cost = via === "missile"
          ? Math.round(destroyerConfig.shieldHits / destroyerConfig.shieldMissileHits)
          : 1;
        enemy.shieldHp = Math.max(0, enemy.shieldHp - cost);
        this.sfx(enemy.shieldHp > 0 ? "block" : "pop");
        return;
      }
      enemy.hp -= via === "missile" ? amount : 1;
      if (impact) {
        const mag = Math.hypot(impact.vx, impact.vy) || 1;
        enemy.vx += (impact.vx / mag) * 8;
        enemy.vy += (impact.vy / mag) * 8;
      }
      if (enemy.hp <= 0) this.killEnemy(enemy);
      else this.sfx("hit");
      return;
    }
    enemy.hp -= amount;
    this.spawnShards(null, enemy, {
      color: enemy.color,
      hotColor: enemy.hotColor,
      kick: debrisConfig.rockKick * 0.65,
      life: 0.45,
      chips: 3,
    });
    this.fx.emit(5, {
      x: enemy.x,
      y: enemy.y,
      color: enemy.hotColor,
      speed: 90,
      speedVar: 40,
      life: 0.2,
      size: 5,
    });
    if (impact) {
      const mag = Math.hypot(impact.vx, impact.vy) || 1;
      enemy.vx += (impact.vx / mag) * 40;
      enemy.vy += (impact.vy / mag) * 40;
    }
    if (enemy.hp <= 0) this.killEnemy(enemy);
    else this.sfx("hit");
  }

  bounceShot(shot, enemy, space) {
    const im = Math.hypot(shot.vx, shot.vy) || 1;
    const ix = shot.vx / im;
    const iy = shot.vy / im;
    const dx = wrapDelta(shot.x - enemy.x, space.width);
    const dy = wrapDelta(shot.y - enemy.y, space.height);
    const mag = Math.hypot(dx, dy) || 1;
    const nx = dx / mag;
    const ny = dy / mag;
    let tx = -ny;
    let ty = nx;
    if (ix * tx + iy * ty < 0) {
      tx = -tx;
      ty = -ty;
    }
    const glance = rand(0.12, 0.8);
    let ox = tx + ix * glance + nx * 0.22;
    let oy = ty + iy * glance + ny * 0.22;
    if (ox * ix + oy * iy < 0) {
      ox = tx;
      oy = ty;
    }
    const px = wrapDelta(this.ship.x - shot.x, space.width);
    const py = wrapDelta(this.ship.y - shot.y, space.height);
    if (ox * px + oy * py > 0) {
      const toward = (ox * px + oy * py) / ((px * px + py * py) || 1);
      ox -= px * toward;
      oy -= py * toward;
    }
    const out = Math.hypot(ox, oy) || 1;
    const keep = bullets.speed * 0.94;
    shot.vx = (ox / out) * keep;
    shot.vy = (oy / out) * keep;
    shot.angle = Math.atan2(shot.vy, shot.vx);
    shot.view.rotation = shot.angle;
    shot.x += (ox / out) * 30 + nx * 10;
    shot.y += (oy / out) * 30 + ny * 10;
    shot.view.position.set(shot.x, shot.y);
    shot.ignore = enemy;
    shot.ignoreFor = 0.16;
  }

  shieldHitFlash(x, y, color = colors.white) {
    this.fx.emit(5, {
      x,
      y,
      color,
      speed: 36,
      speedVar: 18,
      life: 0.055,
      lifeVar: 0.015,
      size: 46,
      sizeVar: 14,
      endSize: 10,
      drag: 0.82,
    });
    this.fx.emit(3, {
      x,
      y,
      color: colors.white,
      speed: 16,
      speedVar: 8,
      life: 0.04,
      lifeVar: 0.01,
      size: 32,
      sizeVar: 8,
      endSize: 6,
      drag: 0.8,
    });
  }

  killEnemy(enemy) {
    this.spawnShards(enemy.hull || HUNTER, enemy, {
      color: enemy.color,
      hotColor: enemy.hotColor,
      kick: debrisConfig.rockKick,
      life: 0.9,
    });
    this.fx.burst(enemy.x, enemy.y, enemy.color, 12, 150);
    this.addScore(enemy.role === "raider" ? 150 : enemy.role === "destroyer" ? 250 : 75);
    this.noteKill();
    this.shake = Math.max(this.shake, 4);
    this.sfx("boom");
    enemy.destroy();
    this.enemies.splice(this.enemies.indexOf(enemy), 1);
  }

  strikeCastle(base, hit, shot) {
    const x = shot.x;
    const y = shot.y;
    this.spawnShards(null, { x, y, vx: shot.vx * 0.15, vy: shot.vy * 0.15, rotation: 0, radius: 18 }, {
      color: base.color,
      hotColor: base.hotColor,
      kick: debrisConfig.rockKick * 0.55,
      life: 0.5,
      chips: 5,
    });
    this.fx.emit(8, {
      x,
      y,
      color: base.hotColor,
      speed: 80,
      speedVar: 50,
      life: 0.22,
      size: 6,
    });
    if (hit.kind === "shield") {
      const dropped = base.damageShield(hit.shield);
      this.addScore(dropped ? 40 : 10);
      this.sfx(dropped ? "pop" : "hit");
      if (dropped) {
        this.fx.burst(base.x, base.y, base.color, 16, 120);
        this.shake = Math.max(this.shake, 5);
      }
      return;
    }
    const destroyed = base.damageCore();
    this.addScore(destroyed ? 500 : 25);
    if (destroyed) {
      if (this.attractOnDemo) {
        base.resetCombat();
        return;
      }
      this.killCastle(base);
    } else {
      this.sfx("hit");
    }
  }

  killCastle(base) {
    this.spawnShards(null, base, {
      color: base.color,
      hotColor: base.hotColor,
      kick: debrisConfig.rockKick * 1.2,
      life: 1.1,
      chips: 14,
    });
    this.fx.burst(base.x, base.y, base.color, 28, 220);
    this.fx.burst(base.x, base.y, colors.white, 12, 180);
    this.shake = Math.max(this.shake, 12);
    this.sfx("boom");
    this.queueCastle(base);
  }

  killRock(rock, impact) {
    const color = rock.color;
    this.spawnShards(rock.points, rock, {
      color,
      hotColor: rock.hotColor,
      kick: debrisConfig.rockKick,
      life: debrisConfig.rockLife,
    });
    this.fx.burst(rock.x, rock.y, color, 8 + rock.size * 4, 140 + rock.size * 20);
    this.addScore(rocks.scores[rock.size]);
    this.shake = Math.max(this.shake, 3 + rock.size);
    this.sfx("rock");
    this.spawnOre(rock);

    if (rock.size > 1) {
      const nx = impact ? impact.vx : rand(-1, 1);
      const ny = impact ? impact.vy : rand(-1, 1);
      const mag = Math.hypot(nx, ny) || 1;
      const px = -ny / mag;
      const py = nx / mag;
      for (const sign of [-1, 1]) {
        const child = this.addRock(rock.x, rock.y, rock.size - 1, color);
        child.vx = rock.vx + px * sign * rocks.splitKick;
        child.vy = rock.vy + py * sign * rocks.splitKick;
        child.kick(nx / mag, ny / mag, 40);
      }
    }

    rock.destroy();
    this.asteroids.splice(this.asteroids.indexOf(rock), 1);
  }

  spawnOre(rock) {
    const count = ore.drops[rock.size] ?? 1;
    for (let i = 0; i < count; i += 1) {
      const flake = new Ore(rock.x + rand(-10, 10), rock.y + rand(-10, 10));
      this.ores.push(flake);
      this.vectors.addChild(flake.view);
    }
    this.sfx("spawn");
  }

  collectOre(flake) {
    flake.kill();
    this.ores.splice(this.ores.indexOf(flake), 1);
    this.cargo += 1;
    this.ship.setCargo(this.cargo);
    this.hud.setOre(this.cargo, this.hub.ore, this.hub.upgradeName());
    this.sfx("ore");
    this.fx.emit(4, {
      x: flake.x,
      y: flake.y,
      color: colors.white,
      speed: 40,
      speedVar: 20,
      life: 0.16,
      size: 4,
    });
  }

  depositOre() {
    if (this.cargo <= 0 || !this.hub.alive) return;
    const n = this.cargo;
    this.cargo = 0;
    this.ship.setCargo(0);
    const result = this.hub.deposit(n);
    this.loadoutBank = (this.loadoutBank || 0) + n;
    const gained = Math.floor(this.loadoutBank / 3);
    this.loadoutBank -= gained * 3;
    this.addPoints(gained);
    this.hud.setOre(0, this.hub.ore, this.hub.upgradeName());
    this.fx.burst(this.hub.x, this.hub.y, colors.cyanHot, 10 + n, 120);
    this.sfx(result.unlocked ? "up" : "dump");
    if (result.unlocked) {
      this.fx.burst(this.hub.x, this.hub.y, colors.white, 16, 160);
      this.hud.setMode(`HUB  ${result.name}`);
    }
  }

  hubPrey(space) {
    let best = null;
    let bestDist = Infinity;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dist = Math.hypot(
        wrapDelta(enemy.x - this.hub.x, space.width),
        wrapDelta(enemy.y - this.hub.y, space.height),
      );
      if (dist > raid.warn) continue;
      const score = enemy.role === "raider" ? dist : dist + 400;
      if (score < bestDist) {
        best = enemy;
        bestDist = score;
      }
    }
    return best;
  }

  fireHubMissile(target, space) {
    const missile = this.hubMissiles.find((item) => !item.alive);
    if (!missile) return;
    const dx = wrapDelta(target.x - this.hub.x, space.width);
    const dy = wrapDelta(target.y - this.hub.y, space.height);
    const angle = Math.atan2(dy, dx);
    missile.fire(
      this.hub.x + Math.cos(angle) * 90,
      this.hub.y + Math.sin(angle) * 90,
      angle,
      target,
    );
    this.hub.missileCool = this.hub.missileEvery;
    this.hub.aimTurrets(angle);
  }

  fireCastleStar(base, space) {
    const star = this.castleStars.find((item) => !item.alive);
    if (!star || !this.ship.alive) return;
    const dx = wrapDelta(this.ship.x - base.x, space.width);
    const dy = wrapDelta(this.ship.y - base.y, space.height);
    const angle = Math.atan2(dy, dx);
    star.fire(base.x + Math.cos(angle) * 72, base.y + Math.sin(angle) * 72, angle, this.ship, {
      star: true,
      color: base.color,
      hot: base.hotColor,
      speed: castle.starSpeed,
      topSpeed: castle.starTop,
      ramp: castle.starRamp,
      turn: castle.starTurn,
      life: castle.starLife,
      radius: castle.starRadius,
    });
    base.missileCool = castle.starEvery + rand(-1.2, 1.6);
  }

  sparkShield(x, y, cost) {
    const result = this.ship.absorb(cost);
    if (!result) return false;
    this.ship.shieldFlash = 0.06;
    this.shieldHitFlash(x, y, colors.cyanHot);
    if (result === "pop") {
      this.fx.burst(this.ship.x, this.ship.y, colors.cyan, 16, 140);
      this.shake = Math.max(this.shake, 5);
      this.sfx("pop");
    } else {
      this.sfx("block");
    }
    return true;
  }

  deflect(body, cost, space) {
    const dx = wrapDelta(body.x - this.ship.x, space.width);
    const dy = wrapDelta(body.y - this.ship.y, space.height);
    const mag = Math.hypot(dx, dy) || 1;
    if (body.kick) body.kick(dx / mag, dy / mag, 90);
    else {
      body.vx += (dx / mag) * 90;
      body.vy += (dy / mag) * 90;
    }
    this.sparkShield(body.x, body.y, cost);
  }

  woundHub(at) {
    if (!this.hub.alive) return;
    if (this.attractOnDemo) {
      this.fx.emit(8, {
        x: at?.x ?? this.hub.x,
        y: at?.y ?? this.hub.y,
        color: colors.cyanHot,
        speed: 80,
        speedVar: 40,
        life: 0.2,
        size: 6,
      });
      this.shake = Math.max(this.shake, 4);
      return;
    }
    const x = at?.x ?? this.hub.x;
    const y = at?.y ?? this.hub.y;
    this.spawnShards(null, { x, y, vx: 0, vy: 0, rotation: 0, radius: 22 }, {
      color: colors.cyan,
      hotColor: colors.cyanHot,
      kick: debrisConfig.rockKick * 0.5,
      life: 0.4,
      chips: 4,
    });
    this.fx.emit(8, {
      x,
      y,
      color: colors.cyanHot,
      speed: 80,
      speedVar: 40,
      life: 0.2,
      size: 6,
    });
    this.shake = Math.max(this.shake, 6);
    this.sfx("hub");
    if (this.hub.damageHub()) this.killHub();
  }

  killHub() {
    this.spawnShards(null, this.hub, {
      color: colors.cyan,
      hotColor: colors.cyanHot,
      kick: debrisConfig.rockKick * 1.4,
      life: 1.2,
      chips: 18,
    });
    this.fx.burst(this.hub.x, this.hub.y, colors.cyan, 32, 240);
    this.fx.burst(this.hub.x, this.hub.y, colors.white, 16, 180);
    this.shake = 18;
    this.sfx("die");
    this.endRun("hub");
  }

  offerContinue() {
    this.mode = CONTINUE;
    this.selected = null;
    this.lockMark.visible = false;
    this.hud.hideDock();
    this.hud.setMode("");
    this.hud.showContinue();
  }

  acceptContinue() {
    if (this.mode !== CONTINUE) return;
    this.lives = shipConfig.lives;
    this.hud.setLives(this.lives);
    this.hud.hideContinue();
    this.mode = PLAYING;
    this.ship.reset(this.ship.x, this.ship.y);
    this.applyShipSkin();
    this.snapCamera();
  }

  endRun(reason = "final") {
    if (this.mode === TITLE || this.mode === GAMEOVER || this.mode === INITIALS) return;
    if (reason === "abort" && this.lives > 0 && this.runDirty) this.writeCheckpoint();
    this.hud.hideContinue();
    if (this.ship.alive) this.ship.kill();
    this.hud.setShield(this.ship.shieldEnergy, false, this.shieldPool());
    this.selected = null;
    this.lockMark.visible = false;
    this.hud.setHubAlert(null);
    this.hud.hideDock();
    const rank = this.rankEntry();
    if (rank.all || rank.daily || rank.streak) {
      this.mode = INITIALS;
      this.initials = { letters: ["A", "A", "A"], i: 0 };
      const shown = rank.all || rank.daily ? this.score : this.bestStreak;
      this.hud.showInitials(shown, this.initials, rank.all || rank.daily ? "SCORE" : "STREAK");
      return;
    }
    this.mode = GAMEOVER;
    this.hud.showGameOver(this.score, reason);
    this.beginAttractLoop();
  }

  nudgeInitial(dir) {
    if (!this.initials) return;
    const slot = this.initials.i;
    const at = Math.max(0, ALPHA.indexOf(this.initials.letters[slot]));
    this.initials.letters[slot] = ALPHA[(at + dir + ALPHA.length) % ALPHA.length];
    this.hud.paintInitials(this.initials);
  }

  lockInitial() {
    if (!this.initials) return;
    this.initials.i += 1;
    if (this.initials.i < 3) {
      this.hud.paintInitials(this.initials);
      return;
    }
    this.commitInitials();
  }

  commitInitials() {
    if (!this.initials) return;
    const name = this.initials.letters.join("");
    const rank = this.rankEntry();
    if (rank.all) this.save.highScores = insertHighScore(this.save.highScores, name, this.score);
    if (rank.daily) this.save.dailyScores = insertDailyScore(this.save.dailyScores, name, this.score);
    if (rank.streak) this.save.killStreaks = insertStreak(this.save.killStreaks, name, this.bestStreak);
    this.save.highScore = this.save.highScores[0]?.score || this.score;
    this.storage.save(this.save);
    this.hud.setHigh(this.save.highScore);
    this.initials = null;
    this.mode = GAMEOVER;
    this.beginAttractLoop("scores", { hold: 3, thenTitle: true });
  }

  tickInitials() {
    if (this.input.letterLeft) this.nudgeInitial(-1);
    if (this.input.letterRight) this.nudgeInitial(1);
    if (this.input.startPressed || this.input.firePressed) this.lockInitial();
    else if (this.input.quitPressed) this.commitInitials();
  }

  updateHubAlert(space, t = 0) {
    if (!this.hub.alive || (this.mode !== PLAYING && !this.attractOnDemo)) {
      this.hubThreat = 0;
      this.hubThreatClose = false;
      this.hubAlertOn = false;
      this.hud.setHubAlert(null);
      return;
    }
    let count = 0;
    let nearest = Infinity;
    for (const enemy of this.enemies) {
      if (!enemy.alive || enemy.role !== "raider") continue;
      const dist = Math.hypot(
        wrapDelta(enemy.x - this.hub.x, space.width),
        wrapDelta(enemy.y - this.hub.y, space.height),
      );
      if (dist > raid.warn) continue;
      count += 1;
      if (dist < nearest) nearest = dist;
    }
    this.hubThreat = count;
    this.hubThreatClose = count > 0 && nearest < raid.warn * 0.45;
    if (count && !this.hubAlertOn) {
      this.sfx("warn");
      this.hubWarnPulse = 1.6;
    }
    this.hubAlertOn = count > 0;
    if (this.hubAlertOn && !this.attractOnDemo) {
      this.hubWarnPulse -= t;
      if (this.hubWarnPulse <= 0) {
        this.sfx("warn");
        this.hubWarnPulse = this.hubThreatClose ? 0.85 : 1.7;
      }
    } else {
      this.hubWarnPulse = 0;
    }
    this.hud.setHubAlert(
      count
        ? { count, range: nearest, hull: this.hub.coreHp, shield: this.hub.shieldHp(), close: this.hubThreatClose }
        : null,
    );
  }

  killShip() {
    if (this.attractOnDemo || !this.ship.alive || this.ship.docked) return;
    this.ship.kill();
    this.spawnShards(HULL, this.ship, {
      color: colors.cyan,
      hotColor: colors.cyanHot,
      kick: debrisConfig.shipKick,
      life: debrisConfig.shipLife,
    });
    this.fx.burst(this.ship.x, this.ship.y, colors.cyan, 22, 220);
    this.fx.burst(this.ship.x, this.ship.y, colors.white, 10, 160);
    this.shake = 16;
    this.sfx("die");
    this.homeOn = false;
    this.killStreak = 0;
    this.lives -= 1;
    this.hud.setLives(Math.max(0, this.lives));
    this.cargo = 0;
    this.ship.setCargo(0);
    this.hud.setOre(0, this.hub.ore, this.hub.upgradeName());
    this.mode = DYING;
    this.timer = shipConfig.respawnDelay;
    this.hud.setShield(this.ship.shieldEnergy, false, this.shieldPool());
  }

  respawnOrEnd() {
    if (this.lives <= 0) {
      this.offerContinue();
      return;
    }
    this.mode = PLAYING;
    this.ship.reset(this.ship.x, this.ship.y);
    this.snapCamera();
  }

  headingUp() {
    return -Math.PI / 2 - this.ship.rotation;
  }

  snapCamera() {
    this.camOn = true;
    this.camX = this.ship.x;
    this.camY = this.ship.y;
    this.camRot = this.headingUp();
    this.camZoom = this.playZoom();
  }

  placeView(entity, width, height) {
    entity.view.position.set(
      this.camX + wrapDelta(entity.x - this.camX, width),
      this.camY + wrapDelta(entity.y - this.camY, height),
    );
  }

  applyCamera(dt, screen) {
    const space = this.space();
    const followShip = this.mode === PLAYING || this.mode === DYING || this.mode === CONTINUE || this.attractOnDemo;
    const mapping = followShip && this.input.mapHeld;
    const mapZoom = Math.min(screen.width / space.width, screen.height / space.height) * 0.94;
    const targetX = mapping ? space.width * 0.5 : followShip ? this.ship.x : worldConfig.width / 2;
    const targetY = mapping ? space.height * 0.5 : followShip ? this.ship.y : worldConfig.height / 2;
    const targetRot = mapping || !followShip ? 0 : this.headingUp();
    const targetZoom = mapping ? mapZoom : this.playZoom();
    const posTau = mapping ? 0.08 : cameraConfig.posTau;
    const rotTau = mapping ? 0.1 : cameraConfig.rotTau;

    this.camOn = true;
    this.camX = wrapCoord(dampWrap(this.camX, targetX, space.width, posTau, dt), space.width);
    this.camY = wrapCoord(dampWrap(this.camY, targetY, space.height, posTau, dt), space.height);
    this.camRot = dampAngle(this.camRot, targetRot, rotTau, dt);
    this.camZoom = damp(this.camZoom, targetZoom, 0.1, dt);

    const shakeX = (Math.random() - 0.5) * this.shake;
    const shakeY = (Math.random() - 0.5) * this.shake;
    this.world.scale.set(this.camZoom);
    this.world.pivot.set(this.camX, this.camY);
    this.world.position.set(screen.width / 2 + shakeX, screen.height / 2 + shakeY);
    this.world.rotation = this.camRot;
    this.far.sync(this.camX, this.camY, !mapping && this.mode !== SHIPS);

    const shipBoost = mapping ? 22 : this.attractOnDemo ? 1.45 : 1;
    const foeBoost = mapping ? 16 : 1;
    this.ship.view.scale.set(shipBoost);
    this.placeView(this.ship, space.width, space.height);
    for (const rock of this.asteroids) {
      rock.view.visible = !mapping;
      if (!mapping) this.placeView(rock, space.width, space.height);
    }
    for (const base of this.bases) this.placeView(base, space.width, space.height);
    for (const enemy of this.enemies) {
      enemy.view.scale.set(foeBoost);
      this.placeView(enemy, space.width, space.height);
    }
    for (const shot of this.shots) {
      if (shot.alive) this.placeView(shot, space.width, space.height);
    }
    for (const shot of this.hostileShots) {
      if (shot.alive) this.placeView(shot, space.width, space.height);
    }
    for (const missile of [...this.missiles, ...this.hubMissiles, ...this.castleStars]) {
      if (missile.view.visible) this.placeView(missile, space.width, space.height);
    }
    if (this.emp.view.visible) this.placeView(this.emp, space.width, space.height);
    for (const flake of this.ores) {
      flake.view.visible = !mapping && flake.alive;
      if (!mapping) this.placeView(flake, space.width, space.height);
    }
    for (const shard of this.shards) {
      shard.view.visible = !mapping && shard.alive;
      if (!mapping) this.placeView(shard, space.width, space.height);
    }
    this.drawLock();
    if (this.lockMark.visible) {
      const shipLike = this.selected?.kind === "enemy" || this.selected?.kind === "raider" || this.selected?.kind === "destroyer";
      this.lockMark.scale.set(mapping && shipLike ? 14 : 1);
    }

    const viewW = screen.width / this.playZoom();
    const viewH = screen.height / this.playZoom();
    this.fx.container.boundsArea.x = this.camX - viewW;
    this.fx.container.boundsArea.y = this.camY - viewH;
    this.fx.container.boundsArea.width = viewW * 2;
    this.fx.container.boundsArea.height = viewH * 2;

    const marks = [
      ...this.bases.filter((base) => base.alive),
      ...this.enemies.filter((enemy) => enemy.alive),
    ];
    this.pips.update(marks, { x: this.camX, y: this.camY }, this.camRot, screen, this.camZoom, space, this.viewRadius(), {
      hubAlert: this.hubThreat > 0,
      hubClose: this.hubThreatClose,
      time: performance.now() * 0.001,
      mapping,
      lock: this.selected?.alive ? this.selected : null,
    });
  }

  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      this.save.settings.fullscreen = false;
    } else {
      document.documentElement.requestFullscreen?.();
      this.save.settings.fullscreen = true;
    }
    this.storage.save(this.save);
  }

  update(dt) {
    const t = Math.min(dt, 1 / 20);
    const screen = this.app.screen;
    const space = this.space();

    this.touch.tick();
    this.input.fineWheel = this.mode === INITIALS || this.mode === WAVEPICK || this.mode === STARTPICK;
    if (this.input.fullscreenPressed) this.toggleFullscreen();
    this.hud.setPad(this.input.padConnected);
    if (this.mode === TITLE || this.mode === GAMEOVER) this.tickAttract(t, space);
    if (this.mode === INITIALS) this.tickInitials();
    if (this.mode === WAVEPICK) this.tickWavePick();
    if (this.mode === STARTPICK) this.tickStartPick();

    if ((this.mode === PLAYING || this.mode === DYING || this.mode === CONTINUE) && this.input.quitPressed) {
      this.endRun(this.mode === CONTINUE ? "final" : "abort");
    }

    if (this.mode === TITLE && this.input.shipsPressed) {
      this.openShips();
    } else if (this.mode === SHIPS && this.input.quitPressed) {
      this.closeShips();
    } else if (this.mode === SHIPS && this.input.startKeyPressed) {
      this.offerStart();
    } else if (this.mode === CONTINUE && (this.input.continueClick || this.input.startKeyPressed)) {
      this.acceptContinue();
    } else if (this.mode === CONTINUE && this.input.selectPressed) {
      this.endRun("final");
    } else if (!this.pickingDevice && (this.mode === TITLE || this.mode === GAMEOVER) && this.mode !== INITIALS && this.input.startPressed) {
      this.offerStart();
    } else if (this.mode === PLAYING && !this.ship.docked) {
      this.shoot();
    }
    if (this.mode === PLAYING && this.input.warpPressed) this.fireWarp();
    if (this.mode === PLAYING && !this.ship.docked && this.input.empPressed) this.fireEmp();
    if (this.mode === PLAYING && !this.ship.docked && this.input.missilePressed) this.fireMissile();
    if (this.mode === PLAYING && this.input.mapHeld && this.input.selectPressed) this.selectAtPointer();

    this.cooldown = Math.max(0, this.cooldown - t);
    this.missileCool = Math.max(0, this.missileCool - t);
    this.empCool = Math.max(0, this.empCool - t);
    this.warpCool = Math.max(0, this.warpCool - t);

    this.input.aim =
      this.mode === PLAYING && !this.ship.docked && !this.input.mapHeld && !this.homeOn && this.input.layout !== "phone"
        ? this.pointerAim()
        : null;

    if (this.mode === PLAYING) {
      if (this.input.homePressed && this.hub.alive && !this.ship.docked) this.homeOn = !this.homeOn;
      if (!this.hub.alive || this.ship.docked) this.homeOn = false;
      if (this.homeOn && (Math.abs(this.input.surge) > 0.2 || Math.abs(this.input.strafe) > 0.2)) this.homeOn = false;

      if (this.ship.warping) {
        this.input.aim = null;
        this.ship.tickWarp(t, space);
        this.fx.emit(5, {
          x: this.ship.x,
          y: this.ship.y,
          color: colors.cyanHot,
          speed: 30,
          speedVar: 40,
          life: 0.28,
          size: 7,
        });
      } else if (this.ship.docked) {
        if (!this.dockOpen) {
          this.dockOpen = true;
          this.depositOre();
          this.refreshDock();
          this.hud.showDock(this.shipId);
          if (this.runDirty) this.writeCheckpoint();
        }
        this.ship.dockHold = Math.max(0, this.ship.dockHold - t);
        if (this.ship.dockHold <= 0 && (Math.abs(this.input.surge) > 0.2 || Math.abs(this.input.strafe) > 0.2)) {
          this.dockOpen = false;
          this.runDirty = true;
          this.hud.hideDock();
          this.ship.release(this.input);
          this.sfx("launch");
        } else {
          this.ship.dockedTo.hold(this.ship);
        }
      } else if (this.homeOn && this.hub.alive) {
        this.input.aim = null;
        this.ship.autopilotHome(t, this.hub, space);
        if (this.hub.tryDock(this.ship)) {
          this.homeOn = false;
          this.sfx("dock");
        }
      } else {
        this.ship.update(t, this.input, space);
        if (this.hub.tryDock(this.ship)) this.sfx("dock");
      }
      const shieldWas = this.ship.shieldOn;
      this.ship.tickShield(t, this.input.shieldPressed);
      if (!shieldWas && this.ship.shieldOn) this.sfx("on");
      else if (shieldWas && !this.ship.shieldOn) this.sfx("off");
      if (this.cargo > 0) this.ship.setCargo(this.cargo);
      if (!this.ship.docked) {
        this.dockOpen = false;
        this.hud.hideDock();
      }
      this.hud.setShield(this.ship.shieldEnergy, this.ship.shieldOn, this.shieldPool());
      const modeLabel = this.input.mapHeld
        ? "MAP"
        : this.homeOn && !this.ship.docked && this.hub.alive
          ? "AUTOPILOT HOME"
          : this.selected?.alive
            ? `LOCK  ${this.selected.name || this.selected.kind}`
            : this.assaultRest
              ? "CLEAR"
              : `WAVE  ${this.assaultIndex}`;
      this.hud.setMode(modeLabel);
    } else if (this.mode === DYING) {
      this.hud.hideDock();
      this.timer -= t;
      if (this.timer <= 0) this.respawnOrEnd();
      this.hud.setMode("");
    } else if (!this.attractOnDemo) {
      this.ship.view.visible = false;
      this.hud.setMode("");
    }

    const shotRange = this.viewRadius() * 2.4;
    const shotRange2 = shotRange * shotRange;
    for (const shot of [...this.shots, ...this.hostileShots]) {
      shot.update(t);
      if (!shot.alive) continue;
      const dx = wrapDelta(shot.x - this.camX, space.width);
      const dy = wrapDelta(shot.y - this.camY, space.height);
      if (dx * dx + dy * dy > shotRange2) shot.kill();
    }
    for (const missile of [...this.missiles, ...this.hubMissiles, ...this.castleStars]) missile.update(t, space);
    this.emp.update(t, this.ship);
    if (this.emp.alive) {
      for (const enemy of this.enemies) {
        if (!enemy.alive || this.emp.hit.has(enemy)) continue;
        if (hits(this.emp, enemy, space.width, space.height)) {
          this.emp.hit.add(enemy);
          if (this.empTier() >= 4) this.killEnemy(enemy);
          else enemy.stun(emp.stun * (this.empTier() >= 3 ? 2 : 1));
        }
      }
    }

    for (const rock of this.asteroids) rock.update(t, space);
    for (const flake of this.ores) flake.update(t, space);
    this.ores = this.ores.filter((flake) => flake.alive);
    for (const base of this.bases) base.update(t);

    if (this.mode === PLAYING || this.attractOnDemo) {
      if (this.mode === PLAYING && this.pendingBases.length) {
        this.baseUnlockIn -= t;
        if (this.baseUnlockIn <= 0) this.openNextBase();
      }
      if (this.mode === PLAYING) {
        this.tickAssault(t);
        const plan = this.assaultPlan();
        if (!this.assaultRest) {
          for (const base of this.bases) {
            if (base.hub || !base.alive) continue;
            base.spawnTimer -= t;
            if (
              base.spawnTimer <= 0 &&
              this.enemiesFrom(base) < plan.hunterPerCastle &&
              this.hunterCount() < plan.hunterGlobal
            ) {
              this.spawnEnemy(base);
              base.spawnTimer = plan.hunterEvery + rand(-1.2, 1.8);
            }
            const cap = this.destroyerCap();
            if (cap > 0 && this.enemiesFrom(base, "destroyer") < cap) {
              base.screenDestroyerTimer -= t;
              if (base.screenDestroyerTimer <= 0) {
                this.spawnEnemy(base, "destroyer");
                base.screenDestroyerTimer = castle.screenDestroyerEvery;
              }
            }
          }

          this.raiderTimer -= t;
          if (this.raiderTimer <= 0 && this.hub.alive && this.raiderCount() < plan.raidMax) {
            const launchers = this.bases.filter((base) => !base.hub && base.alive);
            if (launchers.length) this.spawnRaider(pick(launchers));
            this.raiderTimer = plan.raidEvery + rand(-1.6, 1.8);
          }
        }
        this.tickCastleWatch(t, space);
      }

      for (const enemy of this.enemies) {
        const prey = enemy.role === "raider" && this.hub.alive ? this.hub : this.ship;
        enemy.update(t, prey, space, this.aimedAt(enemy, space));
        if (enemy.wantsShot(prey, space)) this.fireHostile(enemy);
      }
      this.tickDestroyerLasers(t, space);
      if (this.hub.alive && this.hub.armed) {
        this.hub.missileCool = Math.max(0, this.hub.missileCool - t);
        const prey = this.hubPrey(space);
        if (prey) {
          this.hub.aimTurrets(Math.atan2(
            wrapDelta(prey.y - this.hub.y, space.height),
            wrapDelta(prey.x - this.hub.x, space.width),
          ));
          if (this.hub.missileCool <= 0) this.fireHubMissile(prey, space);
        }
      }
      if (this.castlesArmed && !this.assaultRest && (this.mode === PLAYING || this.attractOnDemo) && this.ship.alive) {
        for (const base of this.bases) {
          if (base.hub || !base.alive || !base.armed) continue;
          base.missileCool = Math.max(0, base.missileCool - t);
          if (base.missileCool <= 0) this.fireCastleStar(base, space);
        }
      }
      for (const flake of [...this.ores]) {
        if (!flake.alive) continue;
        const dx = wrapDelta(this.ship.x - flake.x, space.width);
        const dy = wrapDelta(this.ship.y - flake.y, space.height);
        const dist = Math.hypot(dx, dy);
        if (this.ship.alive && dist < ore.magnet) {
          const mag = dist || 1;
          flake.pull(dx / mag, dy / mag, 520 * t);
        }
        if (this.ship.alive && dist < ore.pickup + this.ship.radius) this.collectOre(flake);
      }
        this.updateHubAlert(space, t);
    } else if (this.mode !== DYING) {
      this.hubThreat = 0;
      this.hubThreatClose = false;
      this.hud.setHubAlert(null);
    }

    for (let i = this.shards.length - 1; i >= 0; i -= 1) {
      this.shards[i].update(t);
      if (!this.shards[i].alive) this.shards.splice(i, 1);
    }

    if (this.mode === PLAYING || this.attractOnDemo) {
      for (const rock of [...this.asteroids]) {
        for (const shot of this.shots) {
          if (shot.alive && hitsBeam(shot, rock, bullets.streak)) {
            shot.kill();
            this.chipRock(rock, shot);
            break;
          }
        }
      }

      for (const enemy of [...this.enemies]) {
        for (const shot of this.shots) {
          if (!shot.alive || shot.ignore === enemy) continue;
          if (!hitsBeam(shot, enemy, bullets.streak)) continue;
          if (enemy.role === "destroyer" && enemy.shieldHp > 0 && Math.random() < destroyerConfig.ricochet) {
            this.chipEnemy(enemy, shot);
            this.bounceShot(shot, enemy, space);
            continue;
          }
          shot.kill();
          this.chipEnemy(enemy, shot);
          break;
        }
      }

      for (const star of this.castleStars) {
        if (!star.alive) continue;
        for (const shot of this.shots) {
          if (shot.alive && hits(shot, star, space.width, space.height)) {
            shot.kill();
            this.detonateMissile(star, star);
            break;
          }
        }
      }

      for (const missile of [...this.missiles, ...this.hubMissiles]) {
        if (!missile.alive) continue;
        let struck = false;
        for (const enemy of [...this.enemies]) {
          if (hits(missile, enemy, space.width, space.height)) {
            this.detonateMissile(missile, enemy);
            this.chipEnemy(enemy, missile, missiles.damage, "missile");
            struck = true;
            break;
          }
        }
        if (struck) continue;
        for (const rock of [...this.asteroids]) {
          if (hits(missile, rock, space.width, space.height)) {
            this.detonateMissile(missile, rock);
            this.chipRock(rock, missile, missiles.damage);
            struck = true;
            break;
          }
        }
        if (struck) continue;
        for (const base of this.bases) {
          const hit = base.tryHit(missile.x, missile.y, space.width, space.height);
          if (hit) {
            this.detonateMissile(missile, base);
            this.strikeCastle(base, hit, { x: missile.x, y: missile.y, vx: missile.vx, vy: missile.vy });
            const again = base.tryHit(missile.x, missile.y, space.width, space.height);
            if (again) this.strikeCastle(base, again, { x: missile.x, y: missile.y, vx: missile.vx, vy: missile.vy });
            break;
          }
        }
      }

      for (const shot of this.shots) {
        if (!shot.alive) continue;
        for (const base of this.bases) {
          const hit = base.tryHit(shot.x, shot.y, space.width, space.height);
          if (hit) {
            shot.kill();
            this.strikeCastle(base, hit, shot);
            break;
          }
        }
      }

      if (this.hub.alive) {
        for (const shot of this.hostileShots) {
          if (shot.alive && this.hub.hitBy(shot.x, shot.y, space.width, space.height)) {
            shot.kill();
            this.woundHub(shot);
            if (!this.hub.alive) break;
          }
        }
        for (const enemy of this.enemies) {
          if (!enemy.alive || enemy.role !== "raider" || enemy.ramCool > 0 || enemy.stunned > 0) continue;
          if (hits(enemy, { x: this.hub.x, y: this.hub.y, radius: this.hub.hitRadius }, space.width, space.height)) {
            const dx = wrapDelta(enemy.x - this.hub.x, space.width);
            const dy = wrapDelta(enemy.y - this.hub.y, space.height);
            const mag = Math.hypot(dx, dy) || 1;
            enemy.vx += (dx / mag) * 160;
            enemy.vy += (dy / mag) * 160;
            enemy.ramCool = raid.ramEvery;
            this.woundHub(enemy);
            if (!this.hub.alive) break;
          }
        }
      }

      if (this.ship.alive && this.ship.invuln <= 0 && !this.ship.docked) {
        const body = this.ship.hitBody();
        for (const rock of this.asteroids) {
          if (hits(body, rock, space.width, space.height)) {
            if (this.ship.shieldOn) this.deflect(rock, shieldConfig.hitBody, space);
            else this.killShip();
            break;
          }
        }
        if (this.ship.alive) {
          for (const enemy of this.enemies) {
            if (hits(body, enemy, space.width, space.height)) {
              if (this.ship.shieldOn) this.deflect(enemy, shieldConfig.hitBody, space);
              else this.killShip();
              break;
            }
          }
        }
        if (this.ship.alive) {
          for (const shot of this.hostileShots) {
            if (shot.alive && hitsBeam(shot, body, bullets.streak)) {
              shot.kill();
              if (this.ship.shieldOn) this.sparkShield(shot.x, shot.y, shieldConfig.hitShot);
              else this.killShip();
              break;
            }
          }
        }
        if (this.ship.alive) {
          for (const star of this.castleStars) {
            if (star.alive && hits(star, body, space.width, space.height)) {
              this.detonateMissile(star, this.ship);
              if (this.ship.shieldOn) this.sparkShield(star.x, star.y, shieldConfig.hitBody);
              else this.killShip();
              break;
            }
          }
        }
      }

      if (this.mode === PLAYING) {
        this.waveCooldown = Math.max(0, this.waveCooldown - t);
        if (this.waveCooldown <= 0 && this.nearbyRocks(this.viewRadius() * 1.35) < 3) {
          this.wave += 1;
          this.spawnWave();
          this.waveCooldown = 2.4;
        }
      }
    }

    if (Math.random() < t * 2.2) {
      const reach = this.viewRadius();
      this.fx.emit(1, {
        x: this.camX + rand(-reach, reach),
        y: this.camY + rand(-reach, reach),
        color: 0x2f5c74,
        speed: 8,
        speedVar: 6,
        life: 6,
        size: 4,
        drag: 1,
      });
    }

    this.shake *= 0.86;
    if (this.shake < 0.2) this.shake = 0;
    this.applyCamera(t, screen);
    if (this.mode === SHIPS) this.hangar.layout(screen);
    this.fx.update(t, { x: this.camX, y: this.camY, w: space.width, h: space.height });

    if (this.input.fireHeld || this.input.leftHeld || this.input.keys.size) this.audio.unlock();
    if (this.mode === PLAYING && this.ship.alive && !this.ship.docked) {
      const warping = this.ship.warping;
      this.audio.tickEngine(
        warping ? 0 : Math.abs(this.ship.surge),
        warping ? 0 : Math.max(Math.abs(this.ship.strafe), Math.abs(this.input.rotate) * 0.8),
        this.ship.shieldOn ? 1 : 0,
        warping ? 1 : 0,
        warping ? Math.min(1, this.ship.warpT / this.ship.warpDur) : 0,
      );
    } else {
      this.audio.tickEngine(0, 0, 0, 0);
    }
    this.tickMissileAudio(t, space);

    this.input.endFrame();
  }
}
