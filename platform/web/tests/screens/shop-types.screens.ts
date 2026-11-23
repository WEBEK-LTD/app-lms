import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { DEMO_SLUGS, type DemoId } from "../../src/lib/demo/constants";
import { DEMO_BRANDS } from "../../src/lib/demo/content";
import { LIVE_PHONE } from "../../src/lib/demo/live";
import { createPreviewToken, previewAppPath, previewKey } from "../../src/lib/preview/token";

/**
 * 209 The shop types' pictures from the real app (the app preview,
 * public/preview-app), as the website, /start, /demo/studio and the story
 * pages show them: each type's demo (its look A) in English, its home,
 * menu and a product's page (`<brand>-home|menu|product.png`) and its home
 * light and dark (`<demo>-sig-a-home(-dark).png`); and its look B, a
 * project a new account starts from it on /start (the demo's products as
 * samples), its home light and dark (`<demo>-sig-b-home(-dark).png`). At
 * 360 × 780, three pixels to each (1080 × 2340), as the other demos'.
 * Arabic ones for review go to .data/shop-type-shots. Not part of the test
 * suite: `SHOTS=kids,beauty npx playwright test --config
 * playwright.screens.config.ts shop-types --trace off`, after `npx next build`.
 */
test.describe.configure({ mode: "serial" });
// A Chromium of the machine's own, when the project's Playwright has none downloaded (PW_CHROMIUM).
if (process.env.PW_CHROMIUM) test.use({ launchOptions: { executablePath: process.env.PW_CHROMIUM } });

const OUT = path.resolve(__dirname, "../../public/screens");
const REVIEW = path.resolve(__dirname, "../../.data/shop-type-shots");
const TYPES: { id: DemoId; brand: string }[] = [
  { id: "kids", brand: "toota" },
  { id: "beauty", brand: "velours" },
  { id: "toys", brand: "toot" },
];
const only = (process.env.SHOTS ?? "").split(",").filter(Boolean);
const shown = TYPES.filter((t) => !only.length || only.includes(t.id));
const appIds = new Map<DemoId, string>();

test.beforeAll(async ({ browser }) => {
  test.setTimeout(300_000);
  mkdirSync(REVIEW, { recursive: true });
  const admin = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.141" } });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.demosAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  admin.on("dialog", (dialog) => void dialog.accept());
  await admin.goto("/admin/demos?family=studio");
  await admin.getByRole("button", { name: /Create Studio's demo apps|Refresh all of Studio's demo apps/ }).click();
  await expect(admin.getByRole("status")).toContainText("up to date", { timeout: 180_000 });
  for (const t of TYPES) {
    // Its own name exactly ("Toot" is not "Toota").
    const name = DEMO_BRANDS[t.id].appName;
    const button = admin.getByRole("button", { name: `Start a build of ${name}`, exact: true });
    appIds.set(t.id, await admin.locator('form:not(:has(input[name="variant"]))').filter({ has: button }).locator('input[name="appId"]').first().inputValue());
  }
  await admin.close();
});

/** The app on a phone, as a guest past its sign-in, in a language and a theme; its pages and pictures loaded. */
async function phone(browser: Browser, appId: string, address: string, lang: "en" | "ar", dark: boolean): Promise<Page> {
  const context = await browser.newContext({ viewport: LIVE_PHONE, deviceScaleFactor: 3, colorScheme: dark ? "dark" : "light", locale: lang === "ar" ? "ar-EG" : "en-US", hasTouch: true, isMobile: true });
  await context.addInitScript((app) => localStorage.setItem(`yallapp.preview.${app}.settings.guest_mode`, "true"), appId);
  const page = await context.newPage();
  const pages = page.waitForResponse((r) => new URL(r.url()).pathname === `/api/app/${appId}/pages`, { timeout: 90_000 });
  await page.goto(`${address}&lang=${lang}&theme=${dark ? "dark" : "light"}&os=android`);
  expect((await pages).status()).toBe(200);
  await page.waitForTimeout(6000);
  return page;
}

async function semantics(page: Page): Promise<void> {
  await page.evaluate(() => (document.querySelector("flt-semantics-placeholder") as HTMLElement | null)?.click());
  await page.waitForTimeout(600);
}

/** Taps the element the app names so (its semantics' label). */
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

const preview = (appId: string) => previewAppPath(createPreviewToken({ appId, draft: false }, previewKey(E2E.signingSecret)));

for (const t of shown) {
  test(`look A, the demo: ${t.id}`, async ({ browser }) => {
    test.setTimeout(240_000);
    const appId = appIds.get(t.id)!;
    for (const dark of [false, true]) {
      const page = await phone(browser, appId, preview(appId), "en", dark);
      await page.screenshot({ path: path.join(OUT, `${t.id}-sig-a-home${dark ? "-dark" : ""}.png`) });
      if (!dark) {
        await page.screenshot({ path: path.join(OUT, `${t.brand}-home.png`) });
        await semantics(page);
        expect(await tapNamed(page, /^(open the menu|menu)$/), "the header's menu").toBe(true);
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(OUT, `${t.brand}-menu.png`) });
      }
      await page.context().close();
    }
    // A product's page: the shop's first product, opened from the Shop tab.
    const listed = (await (await (await browser.newContext()).request.get(`/api/app/${appId}/store/products?platform=android&per_page=1`)).json()) as { items: { id: number; name: string }[] };
    const page = await phone(browser, appId, preview(appId), "en", false);
    await semantics(page);
    expect(await tapNamed(page, /^shop$/), "the Shop tab").toBe(true);
    await page.waitForTimeout(3000);
    await semantics(page);
    const name = listed.items[0]!.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    expect(await tapNamed(page, new RegExp(`^${name}`)), listed.items[0]!.name).toBe(true);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(OUT, `${t.brand}-product.png`) });
    await page.context().close();
    for (const dark of [false, true]) {
      const ar = await phone(browser, appId, preview(appId), "ar", dark);
      await ar.screenshot({ path: path.join(REVIEW, `${t.id}-a-home-ar${dark ? "-dark" : ""}.png`), fullPage: false });
      await ar.context().close();
    }
  });

  test(`look B, a project started from it: ${t.id}`, async ({ browser }) => {
    test.setTimeout(240_000);
    const suffix = `${t.id}-${Date.now().toString(36)}`;
    const own = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${140 + TYPES.indexOf(t)}` } });
    await own.goto("/sign-up");
    await own.getByLabel("Full name").fill("Selin Kaya");
    await own.getByLabel("Email").fill(`shots-${suffix}@shots.test`);
    await own.getByLabel("WhatsApp number").fill(`+90 532 000 01${40 + TYPES.indexOf(t)}`);
    await own.getByLabel("Password", { exact: true }).fill("selin-shots-strong-password-1");
    await own.getByRole("checkbox").check();
    await own.getByRole("button", { name: "Create account" }).click();
    await expect(own).toHaveURL(/\/start/);
    await own.goto(`/start/${DEMO_SLUGS[t.id]}/make?new=1&look=b`);
    await own.getByLabel("Your app's name").fill(DEMO_BRANDS[t.id].appName);
    await own.getByRole("button", { name: "Create my app" }).click();
    await own.waitForURL(/\/(studio|dashboard)\//, { timeout: 90_000 });
    // Studio's editor with the look's home, for review.
    await own.goto("/studio/editor");
    await own.waitForTimeout(6000);
    await own.screenshot({ path: path.join(REVIEW, `${t.id}-b-studio-editor.png`) });
    await own.goto("/dashboard/preview");
    const src = await own.locator('iframe[src*="/preview-app/"]').first().getAttribute("src");
    expect(src).toBeTruthy();
    await own.close();
    // The preview's token names its app: p1.<app id>.<expires>.<draft>.<signature>.
    const token = new URL(src!, E2E.baseURL).searchParams.get("token")!;
    const appId = token.split(".")[1]!;
    for (const [lang, dark] of [["en", false], ["en", true], ["ar", false]] as const) {
      const page = await phone(browser, appId, `/preview-app/index.html?token=${token}`, lang, dark);
      await page.screenshot({ path: lang === "en" ? path.join(OUT, `${t.id}-sig-b-home${dark ? "-dark" : ""}.png`) : path.join(REVIEW, `${t.id}-b-home-ar.png`) });
      await page.context().close();
    }
  });
}
