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
  const wantPerf = new URLSearchParams(window.location.search).has("perf");
  let perf = null;
  if (wantPerf) {
    const { PerfHud } = await import("./game/perf/PerfHud.js");
    perf = new PerfHud(app, game);
    let drawStart = 0;
    const drawHook = {
      prerender() {
        drawStart = performance.now();
      },
      postrender() {
        perf.noteDraw(performance.now() - drawStart);
      },
    };
    app.renderer.runners?.prerender?.add(drawHook);
    app.renderer.runners?.postrender?.add(drawHook);
  }
  app.ticker.add((ticker) => {
    try {
      const t0 = performance.now();
      game.update(ticker.deltaMS / 1000);
      if (perf) perf.sample(ticker, performance.now() - t0);
    } catch (err) {
      console.error("[omega] update", err);
      game.bailAttractDemo?.();
    }
  });
}

start();
