#!/usr/bin/env node
// The check after a client build (roadmap 182) with Chromium.
//
// Usage: node check_app.mjs <plan.json> <out.json>
//
// plan.json is the build's check plan (docs/api/pipeline.yaml, AppCheckPlan):
// the app preview's signed link (with check=1), the browser storage it reads
// first, the phone's size, the passes (a language at a text size) and the
// routes. Each pass opens the preview at 360 × 800 in its language, with the
// browser's text size at the pass's scale (Flutter on the web reads its text
// scale from the page's root font size), then each route in turn. It writes
// to out.json every line the preview printed as `YALLAPP_CHECK {json}` (its
// check mode: Flutter's errors, uncaught ones, flexes that overflowed), the
// page's own uncaught errors and the requests that failed, by pass and route,
// for app_check.py to turn into the build's report. Playwright comes from
// PLAYWRIGHT_DIR (an npm prefix) or from wherever Node finds it; CHROMIUM_PATH
// can name the browser.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const [planPath, outPath] = process.argv.slice(2);
if (!planPath || !outPath) {
  console.error("Usage: node check_app.mjs <plan.json> <out.json>");
  process.exit(2);
}

const require = createRequire(path.join(process.env.PLAYWRIGHT_DIR || process.cwd(), "noop.js"));
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = await import("playwright"));
}

const SETTLE_MS = Number(process.env.CHECK_SETTLE_MS || 2500);
const LOAD_MS = Number(process.env.CHECK_LOAD_MS || 60000);
// The whole run's budget: what's left is reported as not opened, never past the job's time.
const BUDGET_MS = Number(process.env.CHECK_BUDGET_MS || 12 * 60000);
const PREFIX = "YALLAPP_CHECK ";

const plan = JSON.parse(readFileSync(planPath, "utf8"));
const started = Date.now();
const out = { passes: [], check_mode: false, stopped: null };

/** The preview's address for a pass and route: its language and look, the route after the hash (the app's URL strategy). */
function routeUrl(previewUrl, lang, route) {
  const url = new URL(previewUrl);
  url.searchParams.set("lang", lang);
  url.hash = route.startsWith("/") ? route : `/${route}`;
  return url.toString();
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars"] });

try {
  for (const pass of plan.passes) {
    const record = { lang: pass.lang, scale: pass.scale, routes: [] };
    out.passes.push(record);
    const context = await browser.newContext({
      viewport: { width: plan.viewport.width, height: plan.viewport.height },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      locale: pass.lang,
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    // CanvasKit from the preview's own copy, not Google's servers (as capture_screens.mjs).
    const canvaskit = new URL("canvaskit/", new URL(plan.preview_url));
    await context.route(/^https:\/\/www\.gstatic\.com\/flutter-canvaskit\/[0-9a-f]+\/(.+)$/, async (route) => {
      const file = /flutter-canvaskit\/[0-9a-f]+\/(.+)$/.exec(route.request().url())[1];
      try {
        await route.fulfill({ response: await route.fetch({ url: new URL(file, canvaskit).toString() }) });
      } catch {
        await route.continue();
      }
    });
    await context.addInitScript(
      ({ storage, scale }) => {
        for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, value);
        // The browser's text size: Flutter's text scale is the root font size over 16 pixels.
        const apply = () => document.documentElement && (document.documentElement.style.fontSize = `${16 * scale}px`);
        apply();
        document.addEventListener("DOMContentLoaded", apply);
      },
      { storage: plan.storage || {}, scale: pass.scale },
    );
    // One page a pass: the app starts once, then each route is opened by its address after the hash, as a link in
    // the app would, so a pass takes seconds a screen rather than a start each. What the page says goes to the screen open.
    const page = await context.newPage();
    let seen = null;
    page.on("console", (message) => {
      const text = message.text();
      if (!text.startsWith(PREFIX)) return;
      if (text.includes('"kind":"ready"')) out.check_mode = true;
      seen?.lines.push(text.slice(PREFIX.length));
    });
    page.on("pageerror", (error) => seen?.page_errors.push(String(error?.message ?? error).split("\n")[0]));
    page.on("requestfailed", (request) => {
      const reason = request.failure()?.errorText ?? "failed";
      // A request the page itself stopped (it moved on) isn't the app's failure.
      if (reason !== "net::ERR_ABORTED") seen?.failed.push({ url: request.url(), status: reason });
    });
    page.on("response", (response) => {
      if (response.status() >= 400) seen?.failed.push({ url: response.url(), status: String(response.status()) });
    });
    let appStarted = false;
    for (const route of plan.routes) {
      if (Date.now() - started > BUDGET_MS) {
        out.stopped = `The time for the check ran out after ${record.routes.length} screens of ${pass.lang} at ${pass.scale}.`;
        break;
      }
      seen = { route, lines: [], page_errors: [], failed: [], loaded: false };
      try {
        if (!appStarted) {
          await page.goto(routeUrl(plan.preview_url, pass.lang, route), { waitUntil: "load", timeout: LOAD_MS });
          await page.waitForSelector("flutter-view, flt-glass-pane", { state: "attached", timeout: LOAD_MS });
          appStarted = true;
        } else {
          await page.evaluate((hash) => {
            window.location.hash = hash;
          }, route.startsWith("/") ? route : `/${route}`);
        }
        await page.waitForLoadState("networkidle", { timeout: LOAD_MS }).catch(() => undefined);
        await page.waitForTimeout(SETTLE_MS);
        // To the end of the page, so what's at its foot is laid out and checked too.
        await page.mouse.move(plan.viewport.width / 2, plan.viewport.height / 2);
        for (let i = 0; i < 6; i++) await page.mouse.wheel(0, plan.viewport.height);
        await page.waitForTimeout(800);
        seen.loaded = true;
      } catch (error) {
        seen.page_errors.push(`The screen didn't open: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
        // Started again for the next screen.
        appStarted = false;
      }
      record.routes.push(seen);
    }
    seen = null;
    await page.close();
    await context.close();
    if (out.stopped) break;
  }
} finally {
  await browser.close();
  writeFileSync(outPath, JSON.stringify(out, null, 1));
}
