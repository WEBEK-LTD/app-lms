#!/usr/bin/env node
// Takes a store screenshots run's shots (roadmap 139) with Chromium.
//
// Usage: node capture_screens.mjs <plan.json> <out-dir>
//
// plan.json is the run's plan (docs/api/pipeline.yaml, ScreenshotsRun): the
// app preview's signed link, the browser storage it reads first, each
// device's size and the shots. Each shot opens the preview at the device's
// screen size and pixel ratio, in its language and platform look, on its
// route (an item's route takes the first item of its list, read from the
// app's own request for that list), waits for the app to settle and saves
// <out-dir>/<key>.png. <out-dir>/report.json says, for each shot, "ok" or
// why it was left out. Playwright comes from PLAYWRIGHT_DIR (an npm prefix)
// or from wherever Node finds it; CHROMIUM_PATH can name the browser.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const [planPath, outDir] = process.argv.slice(2);
if (!planPath || !outDir) {
  console.error("Usage: node capture_screens.mjs <plan.json> <out-dir>");
  process.exit(2);
}

const require = createRequire(path.join(process.env.PLAYWRIGHT_DIR || process.cwd(), "noop.js"));
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = await import("playwright"));
}

const SETTLE_MS = Number(process.env.SHOT_SETTLE_MS || 2500);
const LOAD_MS = Number(process.env.SHOT_LOAD_MS || 60000);

const plan = JSON.parse(readFileSync(planPath, "utf8"));
mkdirSync(outDir, { recursive: true });
const report = {};

/** The address of a shot: the preview link with its language and look, its route after the hash (the app's own URL strategy). */
function shotUrl(previewUrl, shot, os, route) {
  const url = new URL(previewUrl);
  url.searchParams.set("lang", shot.language);
  url.searchParams.set("os", os);
  url.hash = route.startsWith("/") ? route : `/${route}`;
  return url.toString();
}

// Chromium draws Flutter's canvas with SwiftShader where the runner has no GPU.
// CHROMIUM_PATH: a Chromium of the runner's own (a self-hosted runner), instead of Playwright's.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars"] });

// One browser context per device and language, so each keeps its own first ids of the lists.
const groups = new Map();
for (const shot of plan.shots) {
  const group = `${shot.device}:${shot.language}`;
  if (!groups.has(group)) groups.set(group, []);
  groups.get(group).push(shot);
}

try {
  for (const shots of groups.values()) {
    const first = shots[0];
    const device = plan.devices[first.device];
    const context = await browser.newContext({
      viewport: { width: device.viewport_width, height: device.viewport_height },
      deviceScaleFactor: device.scale,
      isMobile: true,
      hasTouch: true,
      locale: first.language,
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    // CanvasKit from the preview's own copy (the same engine build, public/preview-app/canvaskit), not Google's servers.
    const canvaskit = new URL("canvaskit/", new URL(plan.preview_url));
    await context.route(/^https:\/\/www\.gstatic\.com\/flutter-canvaskit\/[0-9a-f]+\/(.+)$/, async (route) => {
      const file = /flutter-canvaskit\/[0-9a-f]+\/(.+)$/.exec(route.request().url())[1];
      try {
        const response = await route.fetch({ url: new URL(file, canvaskit).toString() });
        await route.fulfill({ response });
      } catch {
        await route.continue();
      }
    });
    await context.addInitScript((storage) => {
      for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, value);
    }, plan.storage || {});
    // The first item of each list, from the app's own requests (a Page of `items`).
    const ids = {};
    const lists = [...new Set(plan.shots.map((s) => s.list).filter(Boolean))];
    for (const shot of shots) {
      const page = await context.newPage();
      page.on("response", async (response) => {
        if (!response.ok()) return;
        let pathname;
        try {
          pathname = new URL(response.url()).pathname.replace(/\/$/, "");
        } catch {
          return;
        }
        const list = lists.find((l) => pathname.endsWith(l) && ids[l] === undefined);
        if (!list) return;
        try {
          const body = await response.json();
          const id = body?.items?.[0]?.id;
          if (id !== undefined && id !== null) ids[list] = String(id);
        } catch {
          // Not JSON: another request on the same path.
        }
      });
      let route = shot.route;
      if (shot.list) {
        if (ids[shot.list] === undefined) {
          report[shot.key] = "skipped: the list had no items";
          await page.close();
          continue;
        }
        route = shot.route.replace("{id}", encodeURIComponent(ids[shot.list]));
      }
      try {
        await page.goto(shotUrl(plan.preview_url, shot, device.os, route), { waitUntil: "load", timeout: LOAD_MS });
        // Flutter's view, then its requests, then a moment for pictures and animations.
        await page.waitForSelector("flutter-view, flt-glass-pane", { state: "attached", timeout: LOAD_MS });
        await page.waitForLoadState("networkidle", { timeout: LOAD_MS }).catch(() => undefined);
        await page.waitForTimeout(SETTLE_MS);
        await page.screenshot({ path: path.join(outDir, `${shot.key.replaceAll(":", "_")}.png`), type: "png" });
        report[shot.key] = "ok";
      } catch (error) {
        report[shot.key] = `failed: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`;
      }
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
  writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
}
