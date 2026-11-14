import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { ALL_DEMO_TYPES, DEMO_SLUGS, STUDIO_DEMO_TYPES, type DemoId } from "../../src/lib/demo/constants";
import { DEMO_BRANDS } from "../../src/lib/demo/content";
import { LIVE_PHONE } from "../../src/lib/demo/live";
import { createPreviewToken, previewAppPath, previewKey } from "../../src/lib/preview/token";

/**
 * 128.9 Records each demo's short loop for its /start card from the real
 * app (the app preview, public/preview-app, as /start/<demo> runs it): the
 * team makes the demo apps (Admin › Demo apps), then each demo opens as a
 * guest, in English and light, and walks its home (down and back up), one
 * other tab of its bar and back home, so the loop starts and ends on its
 * home. The raw recordings go to .data/demo-loops (<slug>.webm with
 * <slug>.json: where the walk starts and how long it is); scripts/demo-loops.sh
 * runs this and encodes them into public/loops. Not part of the test suite.
 * `LOOPS=academy,taxi` records only those demos (their /demo slugs).
 */
test.describe.configure({ mode: "serial" });

const RAW = path.resolve(__dirname, "../../.data/demo-loops");
const only = (process.env.LOOPS ?? "").split(",").filter(Boolean);
const demos = ALL_DEMO_TYPES.filter((id) => !only.length || only.includes(DEMO_SLUGS[id]));
const appIds = new Map<DemoId, string>();

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  mkdirSync(RAW, { recursive: true });
  const admin = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.128" } });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.demosAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  for (const family of ["regular", "studio"] as const) {
    await admin.goto(family === "studio" ? "/admin/demos?family=studio" : "/admin/demos");
    await admin.getByRole("button", { name: family === "studio" ? /Create Studio's demo apps|Refresh all of Studio's demo apps/ : /Create the regular demo apps|Refresh all regular demo apps/ }).click();
    await expect(admin.getByRole("status")).toContainText("up to date", { timeout: 90_000 });
    for (const id of ALL_DEMO_TYPES.filter((d) => STUDIO_DEMO_TYPES.includes(d as never) === (family === "studio"))) {
      const name = DEMO_BRANDS[id].appName;
      appIds.set(id, await admin.locator(`form:not(:has(input[name="variant"])):has(button:has-text("Start a build of ${name}")) input[name="appId"]`).first().inputValue());
    }
  }
  await admin.close();
});

/** The app's semantics (Flutter draws on a canvas): turned on, so its bar's buttons and its screen's words can be read. */
async function semantics(page: Page): Promise<void> {
  await page.evaluate(() => (document.querySelector("flt-semantics-placeholder") as HTMLElement | null)?.click());
  await page.waitForTimeout(600);
}

interface Spot {
  label: string;
  x: number;
  y: number;
}

/** The buttons of the app's bar ("Main navigation"), in their order; none when the screen has no bar. */
async function barButtons(page: Page): Promise<Spot[]> {
  return page.evaluate(() => {
    const bar = [...document.querySelectorAll("flt-semantics")].find((e) => e.getAttribute("role") === "group" && /navigation/i.test(e.getAttribute("aria-label") ?? ""));
    if (!bar) return [];
    const box = bar.getBoundingClientRect();
    return [...document.querySelectorAll('flt-semantics[role="button"]')]
      .map((e) => ({ e, r: e.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.top >= box.top - 2 && r.bottom <= box.bottom + 2)
      .sort((a, b) => a.r.left - b.r.left)
      .map(({ e, r }) => ({ label: (e.getAttribute("aria-label") ?? e.textContent ?? "").trim(), x: r.left + r.width / 2, y: r.top + r.height / 2 }));
  });
}

/** The words on the screen above the bar, to tell one screen from another. */
async function screenWords(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll("flt-semantics")]
      .filter((e) => !e.querySelector("flt-semantics") && e.getBoundingClientRect().top < window.innerHeight - 110)
      .map((e) => (e.getAttribute("aria-label") || e.textContent || "").trim())
      .filter(Boolean),
  );
}

/** Whether the tap opened another screen: a good part of the words changed (a shop's home and its shop share products). */
function differ(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return a.length !== b.length;
  const shared = a.filter((w) => b.includes(w)).length;
  return shared / Math.max(a.length, b.length) < 0.8;
}

/** Scrolls the screen by `by` pixels with a finger (as on a phone: no scroll bar, the app's own scrolling). */
async function scroll(page: Page, by: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.synthesizeScrollGesture", { x: LIVE_PHONE.width / 2, y: Math.round(LIVE_PHONE.height * (by > 0 ? 0.65 : 0.35)), yDistance: -by, speed: 700, gestureSourceType: "touch" });
  await cdp.detach();
}

/** Tabs a guest can't open (they ask to sign in) or that are empty for one (a cart), or the home itself. */
const SKIP = /^(home|chat|messages|account|profile|me|cart|basket)$/i;

for (const id of demos) {
  const slug = DEMO_SLUGS[id];
  test(`loop: ${slug}`, async ({ browser }) => {
    test.setTimeout(150_000);
    const appId = appIds.get(id);
    expect(appId, slug).toBeTruthy();
    const dir = path.join(os.tmpdir(), `demo-loop-${slug}-${Date.now()}`);
    const context = await browser.newContext({ viewport: LIVE_PHONE, deviceScaleFactor: 1, colorScheme: "light", locale: "en-US", hasTouch: true, isMobile: true, recordVideo: { dir, size: LIVE_PHONE } });
    // As a guest, past the sign-in screen, as /start/<demo> opens it (src/app/start/live-phone.tsx).
    await context.addInitScript((app) => localStorage.setItem(`yallapp.preview.${app}.settings.guest_mode`, "true"), appId!);
    const page = await context.newPage();
    const opened = Date.now();
    const address = `${previewAppPath(createPreviewToken({ appId: appId!, draft: false }, previewKey(E2E.signingSecret)))}&lang=en&theme=light&os=android`;
    const open = async () => {
      const pages = page.waitForResponse((r) => new URL(r.url()).pathname === `/api/app/${appId}/pages`, { timeout: 60_000 });
      await page.goto(address);
      expect((await pages).status(), slug).toBe(200);
      // Its pictures and fonts.
      await page.waitForTimeout(3500);
      await semantics(page);
    };
    await open();
    const bar = await barButtons(page);
    // The loop starts on the home, as the card's screenshot (some apps open on another tab, such as a taxi's map).
    const home = bar.find((b) => /^home$/i.test(b.label)) ?? bar[0];
    // 130 Where a tab is now: a bar whose open tab grows (its name beside its icon) moves the others.
    const tapTab = async (tab: Spot) => {
      const now = (await barButtons(page)).find((b) => b.label === tab.label) ?? tab;
      await page.touchscreen.tap(now.x, now.y);
    };
    const goHome = async () => {
      if (!home) return;
      await tapTab(home);
      await page.waitForTimeout(1500);
    };
    await goHome();
    const homeWords = await screenWords(page);
    // The other screen: the first tab of the bar that opens a screen of its own for a guest, with
    // what it shows (not a map that can't load here); tried once before filming, so it has its entries.
    let other: Spot | null = null;
    for (const tab of bar.filter((b) => b !== home && !SKIP.test(b.label))) {
      await tapTab(tab);
      await page.waitForTimeout(2500);
      const words = await screenWords(page);
      const hasBar = (await barButtons(page)).length > 0;
      if (hasBar && differ(homeWords, words) && !words.some((w) => /not available/i.test(w))) other = tab;
      if (hasBar) await goHome();
      else {
        await open();
        await goHome();
      }
      if (other) break;
    }
    const start = (Date.now() - opened) / 1000;

    // The home, down and back up (further when it is the only screen).
    const down = other ? 420 : 640;
    await page.waitForTimeout(1200);
    await scroll(page, down);
    await page.waitForTimeout(other ? 700 : 1000);
    await scroll(page, -down);
    await page.waitForTimeout(400);
    // The other screen, then home again: the loop ends where it starts.
    if (other && home) {
      await tapTab(other);
      await page.waitForTimeout(1500);
      await scroll(page, 260);
      await page.waitForTimeout(600);
      await tapTab(home);
      await page.waitForTimeout(1200);
    } else {
      await page.waitForTimeout(1500);
    }
    const duration = (Date.now() - opened) / 1000 - start;
    const video = page.video();
    await context.close();
    renameSync(await video!.path(), path.join(RAW, `${slug}.webm`));
    rmSync(dir, { recursive: true, force: true });
    writeFileSync(path.join(RAW, `${slug}.json`), JSON.stringify({ demo: id, start, duration, bar: bar.map((b) => b.label), other: other?.label ?? null }, null, 2));
  });
}
