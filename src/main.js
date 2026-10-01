import { Application } from "pixi.js";
import { Game } from "./game/Game.js";
import { settings } from "./game/config.js";
import { localStorageAdapter } from "./game/storage/save.js";

async function start() {
  const app = new Application();
  try {
    await app.init({
      background: settings.background,
      resizeTo: window,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, settings.resolutionCap),
      preference: "webgl",
    });
  } catch (err) {
    console.error("app.init failed", err);
    return;
  }

  app.canvas.id = "game";
  document.body.prepend(app.canvas);

  const game = new Game(app, { storage: localStorageAdapter });
  app.ticker.add((ticker) => {
    try {
      game.update(ticker.deltaMS / 1000);
    } catch (err) {
      console.error("update failed", err);
    }
  });
}

start();
