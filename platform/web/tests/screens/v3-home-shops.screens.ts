import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { DEMO_SLUGS, type DemoId } from "../../src/lib/demo/constants";
import { createPreviewToken, previewAppPath, previewKey } from "../../src/lib/preview/token";
import { DEMO_BRANDS } from "../../src/lib/demo/content";
import { LIVE_PHONE } from "../../src/lib/demo/live";
import { PREVIEW_HEADER } from "../../src/lib/preview/token";

/**
 * 225 The pictures of home decor's and furniture's looks C and D from the
 * real app (the app preview, public/preview-app): for each look, a project
 * a new account starts from it on /start (the demo's products as samples),
 * then its home by day and by night as the website shows them
 * (`<demo>-sig-<look>-home(-dark).png`, 360 × 780 at three pixels to each,
 * as the other demos'), and for review (`SHOTS_DIR`, at 390 px wide, two
 * pixels to each) the home down its length, the category menu, the shop
 * and a product, by day and by night, in English and Arabic. Not part of
 * the test suite: `SHOTS=decor,furniture npx playwright test --config
 * playwright.screens.config.ts v3-home-shops --trace off`, after `npm run build`.
 */
test.describe.configure({ mode: "serial" });
if (process.env.PW_CHROMIUM) test.use({ launchOptions: { executablePath: process.env.PW_CHROMIUM } });

const OUT = path.resolve(__dirname, "../../public/screens");
const REVIEW = process.env.SHOTS_DIR ?? path.resolve(__dirname, "../../.data/v3-home-shops");
const TYPES: DemoId[] = ["decor", "furniture"];
const LOOKS = (process.env.SHOTS_LOOKS ?? "c,d").split(",").filter(Boolean);
const only = (process.env.SHOTS ?? "").split(",").filter(Boolean);
const shown = TYPES.filter((t) => !only.length || only.includes(t));
const REVIEW_PHONE = { width: 390, height: 844 };

async function semantics(page: Page): Promise<void> {
  await page.evaluate(() => (document.querySelector("flt-semantics-placeholder") as HTMLElement | null)?.click());
  await page.waitForTimeout(600);
}

async function tapNamed(page: Page, name: RegExp): Promise<boolean> {
  const spot = await page.evaluate((source) => {
    const re = new RegExp(source, "i");
    const e = [...document.querySelectorAll("flt-semantics")].find((x) => re.test((x.getAttribute("aria-label") ?? x.textContent ?? "").trim()) && x.getBoundingClientRect().width > 0);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, name.source);
  if (!spot) return false;
  await page.touchscreen.tap(spot.x, spot.y);
  return true;
}

async function scroll(page: Page, size: { width: number; height: number }, by: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.synthesizeScrollGesture", { x: size.width / 2, y: Math.round(size.height * 0.7), yDistance: -by, speed: 1200, gestureSourceType: "touch" });
  await cdp.detach();
  await page.waitForTimeout(2200);
}

/** The app on a phone, as a guest past its sign-in, in a language and a theme; its pages and pictures loaded. */
async function phone(browser: Browser, appId: string, address: string, opts: { lang: "en" | "ar"; dark: boolean; review: boolean }): Promise<Page> {
  const size = opts.review ? REVIEW_PHONE : LIVE_PHONE;
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: opts.review ? 2 : 3, colorScheme: opts.dark ? "dark" : "light", locale: opts.lang === "ar" ? "ar-EG" : "en-US", hasTouch: true, isMobile: true });
  await context.addInitScript((app) => localStorage.setItem(`yallapp.preview.${app}.settings.guest_mode`, "true"), appId);
  const page = await context.newPage();
  const pages = page.waitForResponse((r) => new URL(r.url()).pathname === `/api/app/${appId}/pages`, { timeout: 90_000 });
  await page.goto(`${address}&lang=${opts.lang}&theme=${opts.dark ? "dark" : "light"}&os=android`);
  expect((await pages).status()).toBe(200);
  await page.waitForTimeout(7000);
  return page;
}

let n = 0;

for (const t of shown) {
  for (const look of LOOKS) {
    test(`look ${look.toUpperCase()}, a project started from it: ${t}`, async ({ browser }) => {
      test.setTimeout(600_000);
      mkdirSync(REVIEW, { recursive: true });
      n += 1;
      const suffix = `${t}-${look}-${Date.now().toString(36)}`;
      const own = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${60 + n}` } });
      await own.goto("/sign-up");
      await own.getByLabel("Full name").fill("Selin Kaya");
      await own.getByLabel("Email").fill(`shots-${suffix}@shots.test`);
      await own.getByLabel("WhatsApp number").fill(`+90 532 000 02${10 + n}`);
      await own.getByLabel("Password", { exact: true }).fill("selin-shots-strong-password-1");
      await own.getByRole("checkbox").check();
      await own.getByRole("button", { name: "Create account" }).click();
      await expect(own).toHaveURL(/\/start/);
      await own.goto(`/start/${DEMO_SLUGS[t]}/make?new=1&look=${look}`);
      await own.getByLabel("Your app's name").fill(DEMO_BRANDS[t].appName);
      await own.getByRole("button", { name: "Create my app" }).click();
      await own.waitForURL(/\/(studio|dashboard)\//, { timeout: 90_000 });
      // Studio's canvas with the look's home.
      await own.setViewportSize({ width: 1440, height: 1100 });
      await own.goto("/studio/editor");
      await own.waitForTimeout(8000);
      await own.screenshot({ path: path.join(REVIEW, `${t}-${look}-studio-editor.png`) });
      await own.setViewportSize({ width: 1280, height: 720 });
      await own.goto("/dashboard/preview");
      const src = await own.locator('iframe[src*="/preview-app/"]').first().getAttribute("src");
      expect(src).toBeTruthy();
      await own.close();
      const token = new URL(src!, E2E.baseURL).searchParams.get("token")!;
      const appId = token.split(".")[1]!;
      const address = `/preview-app/index.html?token=${token}`;
      // The owner's preview may ask for an app that isn't live yet: its token in the preview's header.
      const res = await (await browser.newContext()).request.get(`/api/app/${appId}/store/products?platform=android&per_page=8`, { headers: { [PREVIEW_HEADER]: token } });
      const listed = (await res.json()) as { items: { id: number; name: string }[] };
      expect(listed.items, JSON.stringify(listed).slice(0, 300)).toBeTruthy();
      const product = listed.items.find((p) => !/wrap|assembly|تغليف|تركيب/i.test(p.name)) ?? listed.items[0]!;

      // The website's pictures: the home by day and by night.
      for (const dark of [false, true]) {
        const page = await phone(browser, appId, address, { lang: "en", dark, review: false });
        await page.screenshot({ path: path.join(OUT, `${t}-sig-${look}-home${dark ? "-dark" : ""}.png`) });
        await page.context().close();
      }
      // For review: every screen, by day and by night, in English and Arabic.
      for (const lang of ["en", "ar"] as const) {
        for (const dark of [false, true]) {
          const name = `${t}-${look}-${lang}-${dark ? "dark" : "light"}`;
          const page = await phone(browser, appId, address, { lang, dark, review: true });
          await page.screenshot({ path: path.join(REVIEW, `${name}-home-0.png`) });
          for (let i = 1; i <= 7; i++) {
            await scroll(page, REVIEW_PHONE, 700);
            await page.screenshot({ path: path.join(REVIEW, `${name}-home-${i}.png`) });
          }
          const go = async (route: string) => {
            await page.evaluate((r) => (window.location.hash = r), route);
            await page.waitForTimeout(4500);
          };
          await go("#/page/menu");
          await page.screenshot({ path: path.join(REVIEW, `${name}-menu-0.png`) });
          for (let i = 1; i <= 2; i++) {
            await scroll(page, REVIEW_PHONE, 700);
            await page.screenshot({ path: path.join(REVIEW, `${name}-menu-${i}.png`) });
          }
          await go("#/");
          await semantics(page);
          if (await tapNamed(page, lang === "en" ? /^shop/ : /^(المتجر|تسوّق|تسوق)/)) {
            await page.waitForTimeout(4000);
            await page.screenshot({ path: path.join(REVIEW, `${name}-listing-0.png`) });
            await scroll(page, REVIEW_PHONE, 700);
            await page.screenshot({ path: path.join(REVIEW, `${name}-listing-1.png`) });
          }
          await go(`#/product/${product.id}`);
          await page.screenshot({ path: path.join(REVIEW, `${name}-product-0.png`) });
          await scroll(page, REVIEW_PHONE, 700);
          await page.screenshot({ path: path.join(REVIEW, `${name}-product-1.png`) });
          await go("#/cart");
          await page.screenshot({ path: path.join(REVIEW, `${name}-cart.png`) });
          await go("#/");
          await semantics(page);
          if (await tapNamed(page, lang === "en" ? /^orders/ : /^طلباتي/)) {
            await page.waitForTimeout(4000);
            await page.screenshot({ path: path.join(REVIEW, `${name}-orders.png`) });
          }
          await page.context().close();
        }
      }
    });
  }
}

/**
 * The demo apps themselves (their main look, C), made in Admin › Demo apps:
 * their homes in Arabic by day and by night, with the shop's Arabic name
 * (the demo's own words), for review. `SHOTS_DEMO=1` runs them.
 */
test.describe("the demo apps, in their main look", () => {
  test.skip(!process.env.SHOTS_DEMO, "SHOTS_DEMO=1 shoots the demo apps");
  test("Sakan and Rukn in Arabic", async ({ browser }) => {
    test.setTimeout(600_000);
    mkdirSync(REVIEW, { recursive: true });
    const admin = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.151" } });
    await admin.goto("/sign-in");
    await admin.getByLabel("Email").fill(E2E.demosAdminEmail);
    await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
    await admin.getByRole("button", { name: "Sign in" }).click();
    await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
    admin.on("dialog", (dialog) => void dialog.accept());
    await admin.goto("/admin/demos?family=studio");
    await admin.getByRole("button", { name: /Create Studio's demo apps|Refresh all of Studio's demo apps/ }).click();
    await expect(admin.getByRole("status")).toContainText("up to date", { timeout: 300_000 });
    for (const t of shown) {
      const name = DEMO_BRANDS[t].appName;
      const button = admin.getByRole("button", { name: `Start a build of ${name}`, exact: true });
      const appId = await admin.locator('form:not(:has(input[name="variant"]))').filter({ has: button }).locator('input[name="appId"]').first().inputValue();
      const address = previewAppPath(createPreviewToken({ appId, draft: false }, previewKey(E2E.signingSecret)));
      for (const dark of [false, true]) {
        const page = await phone(browser, appId, address, { lang: "ar", dark, review: true });
        await page.screenshot({ path: path.join(REVIEW, `${t}-demo-ar-${dark ? "dark" : "light"}-home-0.png`) });
        await page.context().close();
      }
    }
    await admin.close();
  });
});
