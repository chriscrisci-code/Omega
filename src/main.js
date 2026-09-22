import { Application } from "pixi.js";
import { Game } from "./game/Game.js";
import { settings } from "./game/config.js";
import { localStorageAdapter } from "./game/storage/save.js";

const app = new Application();

console.log("[omega] before app.init");
await app.init({
  background: settings.background,
  resizeTo: window,
  antialias: true,
  autoDensity: true,
  resolution: Math.min(window.devicePixelRatio || 1, settings.resolutionCap),
  preference: "webgl",
});
console.log("[omega] after app.init");

app.canvas.id = "game";
document.body.prepend(app.canvas);

console.log("[omega] before new Game");
const game = new Game(app, { storage: localStorageAdapter });
app.ticker.add((ticker) => game.update(ticker.deltaMS / 1000));
