import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { LIVE_PHONE } from "../../src/lib/demo/live";
import { createPreviewToken, previewAppPath, previewKey } from "../../src/lib/preview/token";

/**
 * 210 The screenshots of Studio's home decor (Sakan), crochet (Ghurza) and
 * furniture (Rukn) types from the real app (the app preview,
 * public/preview-app): each demo's home, its category menu (Ghurza's
 * custom-order page) and a product in look A, its home by night, and look
 * B's home by day and by night (look B saved as the demo app's draft
 * first, `SHOTS_LOOK_B` its app IDs as JSON). The team makes the demo apps
 * (Admin › Demo apps) before. public/screens gets the website's; `SHOTS_DIR`
 * the review shots (Arabic too, scrolled). Not part of the test suite.
 */
test.describe.configure({ mode: "serial" });

const OUT = path.resolve(__dirname, "../../public/screens");
const REVIEW = process.env.SHOTS_DIR ?? path.resolve(__dirname, "../../.data/home-shops-review");
const APPS = JSON.parse(process.env.SHOTS_APPS ?? "{}") as Record<string, string>;
/** The product each guide shows, by its ID in the demo app (`SHOTS_PRODUCTS`, JSON). */
const PRODUCTS = JSON.parse(process.env.SHOTS_PRODUCTS ?? "{}") as Record<string, number>;
const TYPES = [
  { id: "decor", guide: "sakan", second: "menu", page: "menu" },
  { id: "crochet", guide: "ghurza", second: "custom", page: "custom-order" },
  { id: "furniture", guide: "rukn", second: "menu", page: "menu" },
] as const;

async function semantics(page: Page): Promise<void> {
  await page.evaluate(() => (document.querySelector("flt-semantics-placeholder") as HTMLElement | null)?.click());
  await page.waitForTimeout(600);
}

async function scroll(page: Page, by: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.synthesizeScrollGesture", { x: LIVE_PHONE.width / 2, y: Math.round(LIVE_PHONE.height * (by > 0 ? 0.7 : 0.3)), yDistance: -by, speed: 1200, gestureSourceType: "touch" });
  await cdp.detach();
  await page.waitForTimeout(900);
}


async function open(page: Page, appId: string, opts: { draft: boolean; lang: "en" | "ar"; theme: "light" | "dark" }) {
  const address = `${previewAppPath(createPreviewToken({ appId, draft: opts.draft }, previewKey(E2E.signingSecret)))}&lang=${opts.lang}&theme=${opts.theme}&os=android`;
  const pages = page.waitForResponse((r) => new URL(r.url()).pathname === `/api/app/${appId}/pages`, { timeout: 90_000 });
  await page.goto(address);
  expect((await pages).status()).toBe(200);
  await page.waitForTimeout(6000);
  await semantics(page);
}

for (const type of TYPES) {
  for (const look of ["a", "b"] as const) {
    for (const lang of ["en", "ar"] as const) {
      for (const theme of ["light", "dark"] as const) {
        test(`${type.id} ${look} ${lang} ${theme}`, async ({ browser }) => {
          test.setTimeout(240_000);
          const appId = APPS[type.id];
          expect(appId, type.id).toBeTruthy();
          mkdirSync(REVIEW, { recursive: true });
          const context = await browser.newContext({ viewport: LIVE_PHONE, deviceScaleFactor: 3, colorScheme: theme, locale: lang === "ar" ? "ar" : "en-US", hasTouch: true, isMobile: true });
          await context.addInitScript((app) => localStorage.setItem(`yallapp.preview.${app}.settings.guest_mode`, "true"), appId!);
          const page = await context.newPage();
          await open(page, appId!, { draft: look === "b", lang, theme });
          const name = `${type.id}-${look}-${lang}-${theme}`;
          // The home, then down it a screen at a time.
          await page.screenshot({ path: path.join(REVIEW, `${name}-home-0.png`) });
          if (lang === "en") {
            if (look === "a" && theme === "light") await page.screenshot({ path: path.join(OUT, `${type.guide}-home.png`) });
            if (look === "a" && theme === "dark") await page.screenshot({ path: path.join(OUT, `${type.id}-sig-a-home-dark.png`) });
            if (look === "b") await page.screenshot({ path: path.join(OUT, `${type.id}-sig-b-home${theme === "dark" ? "-dark" : ""}.png`) });
          }
          for (let i = 1; i <= 7; i++) {
            await scroll(page, 680);
            await page.screenshot({ path: path.join(REVIEW, `${name}-home-${i}.png`) });
          }
          if (look === "a" && theme === "light") {
            // The category menu, or Ghurza's custom-order page, and a product: opened by their routes in the app.
            const go = async (route: string) => {
              await page.evaluate((r) => (window.location.hash = r), route);
              await page.waitForTimeout(4000);
            };
            await go(`#/page/${type.page}`);
            await page.screenshot({ path: path.join(REVIEW, `${name}-${type.second}.png`) });
            if (lang === "en") await page.screenshot({ path: path.join(OUT, `${type.guide}-${type.second}.png`) });
            for (let i = 1; i <= 3; i++) {
              await scroll(page, 680);
              await page.screenshot({ path: path.join(REVIEW, `${name}-${type.second}-${i}.png`) });
            }
            if (PRODUCTS[type.id]) {
              await go(`#/product/${PRODUCTS[type.id]}`);
              await page.screenshot({ path: path.join(REVIEW, `${name}-product.png`) });
              if (lang === "en") await page.screenshot({ path: path.join(OUT, `${type.guide}-product.png`) });
              for (let i = 1; i <= 2; i++) {
                await scroll(page, 680);
                await page.screenshot({ path: path.join(REVIEW, `${name}-product-${i}.png`) });
              }
            }
          }
          await context.close();
        });
      }
    }
  }
}
