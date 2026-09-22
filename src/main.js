import { Application } from "pixi.js";
import { Game } from "./game/Game.js";
import { settings } from "./game/config.js";
import { localStorageAdapter } from "./game/storage/save.js";

async function start() {
  const app = new Application();

  console.log("[omega] before app.init", { bundled: import.meta.env.PROD });
  const pending = setTimeout(() => {
    console.log("[omega] app.init still pending after 3000ms");
  }, 3000);
  try {
    await app.init({
      background: settings.background,
      resizeTo: window,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, settings.resolutionCap),
      preference: "webgl",
    });
    clearTimeout(pending);
    console.log("[omega] after app.init");
  } catch (err) {
    clearTimeout(pending);
    console.error("[omega] app.init rejected", err);
    return;
  }

  app.canvas.id = "game";
  document.body.prepend(app.canvas);

  console.log("[omega] before new Game");
  const game = new Game(app, { storage: localStorageAdapter });
  app.ticker.add((ticker) => game.update(ticker.deltaMS / 1000));
}

start();
