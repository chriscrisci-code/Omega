import { Application } from "pixi.js";
import { Game } from "./game/Game.js";
import { settings } from "./game/config.js";
import { localStorageAdapter } from "./game/storage/save.js";

const app = new Application();

await app.init({
  background: settings.background,
  resizeTo: window,
  antialias: true,
  autoDensity: true,
  resolution: Math.min(window.devicePixelRatio || 1, settings.resolutionCap),
  preference: "webgl",
});

app.canvas.id = "game";
document.body.prepend(app.canvas);

const game = new Game(app, { storage: localStorageAdapter });
app.ticker.add((ticker) => game.update(ticker.deltaMS / 1000));
