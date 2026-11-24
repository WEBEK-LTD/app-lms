import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { DEMO_SLUGS, type DemoId } from "../../src/lib/demo/constants";
import { DEMO_BRANDS } from "../../src/lib/demo/content";
import { LIVE_PHONE } from "../../src/lib/demo/live";
import { CLOTHES_PRODUCTS } from "../../src/lib/demo/clothes";
import { KIDS_PRODUCTS } from "../../src/lib/demo/kids";
import { createPreviewToken, previewAppPath, previewKey } from "../../src/lib/preview/token";

/**
 * 223 Lujain's and Toota's templates C and D drawn by the real app (the app
 * preview, public/preview-app), for review and for the site: C is each
 * type's demo, D a project a new account starts from it on /start. For each
 * look, at 390 × 844 and two pixels to each, light and dark: the home (its
 * top and further down), the category menu (the header's menu button), the
 * shop's listing (its Shop tab) and a product's page, in `.data/v3-shots`;
 * and each look's home light and dark at 360 × 780, three pixels to each,
 * in public/screens (`<demo>-sig-<c|d>-home(-dark).png`) as the other looks'.
 * Not part of the test suite: `SHOTS=clothes,kids npx playwright test
 * --config playwright.screens.config.ts v3-clothes-kids --trace off`, after
 * `npx next build`.
 */
test.describe.configure({ mode: "serial" });
if (process.env.PW_CHROMIUM) test.use({ launchOptions: { executablePath: process.env.PW_CHROMIUM } });

const OUT = path.resolve(__dirname, "../../public/screens");
const REVIEW = path.resolve(__dirname, "../../.data/v3-shots");
const REVIEW_PHONE = { width: 390, height: 844 } as const;
const TYPES: { id: DemoId; brand: string; shop: RegExp }[] = [
  { id: "clothes", brand: "lujain", shop: /^(discover|shop)$/ },
  { id: "kids", brand: "toota", shop: /^shop$/ },
];
const only = (process.env.SHOTS ?? "").split(",").filter(Boolean);
const shown = TYPES.filter((t) => !only.length || only.includes(t.id));
const appIds = new Map<DemoId, string>();

test.beforeAll(async ({ browser }) => {
  test.setTimeout(300_000);
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
  await expect(admin.getByRole("status")).toContainText("up to date", { timeout: 180_000 });
  for (const t of TYPES) {
    const name = DEMO_BRANDS[t.id].appName;
    const button = admin.getByRole("button", { name: `Start a build of ${name}`, exact: true });
    appIds.set(t.id, await admin.locator('form:not(:has(input[name="variant"]))').filter({ has: button }).locator('input[name="appId"]').first().inputValue());
  }
  await admin.close();
  // The templates' faces load from the platform's font route (the app falls back to its own without them).
  for (const file of ["ofl/reemkufi/ReemKufi%5Bwght%5D.ttf", "ofl/tajawal/Tajawal-Regular.ttf", "ofl/lemonada/Lemonada%5Bwght%5D.ttf", "ofl/vazirmatn/Vazirmatn%5Bwght%5D.ttf"]) {
    const res = await (await browser.newContext()).request.get(`/api/v1/fonts/${file}`);
    console.log(`font ${file}: ${res.status()}`);
  }
});

/** The app on a phone, as a guest past its sign-in, in a language and a theme; its pages and pictures loaded. */
async function phone(browser: Browser, appId: string, address: string, lang: "en" | "ar", dark: boolean, size: { width: number; height: number } = REVIEW_PHONE, scale = 2): Promise<Page> {
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: scale, colorScheme: dark ? "dark" : "light", locale: lang === "ar" ? "ar-EG" : "en-US", hasTouch: true, isMobile: true });
  await context.addInitScript((app) => localStorage.setItem(`yallapp.preview.${app}.settings.guest_mode`, "true"), appId);
  const page = await context.newPage();
  const pages = page.waitForResponse((r) => new URL(r.url()).pathname === `/api/app/${appId}/pages`, { timeout: 90_000 });
  await page.goto(`${address}&lang=${lang}&theme=${dark ? "dark" : "light"}&os=android`);
  expect((await pages).status()).toBe(200);
  await page.waitForTimeout(7000);
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

/** Scrolls the app's page down by `by` points. */
async function scrollDown(page: Page, by: number): Promise<void> {
  await page.mouse.move(REVIEW_PHONE.width / 2, REVIEW_PHONE.height / 2);
  await page.mouse.wheel(0, by);
  await page.waitForTimeout(2500);
}

/** Taps a product of the listing: the shop's first by the products API, else the first of the demo's own that shows. */
async function tapProduct(page: Page, id: DemoId, listed: { items?: { name: string }[] }): Promise<boolean> {
  const names = [...(listed.items ?? []).map((p) => p.name), ...(id === "clothes" ? CLOTHES_PRODUCTS : KIDS_PRODUCTS).map((p) => p.name)];
  for (const name of names) if (await tapNamed(page, new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`))) return true;
  return false;
}

const preview = (appId: string) => previewAppPath(createPreviewToken({ appId, draft: false }, previewKey(E2E.signingSecret)));

/** Every review picture of one look: the home (top, then twice further down), the menu, the listing and a product, light and dark; and its home for the site. */
async function shoot(browser: Browser, t: (typeof TYPES)[number], look: "c" | "d", appId: string, address: string): Promise<void> {
  const shot = (name: string) => path.join(REVIEW, `${t.id}-${look}-${name}.png`);
  const listed = (await (await (await browser.newContext()).request.get(`/api/app/${appId}/store/products?platform=android&per_page=1`)).json().catch(() => ({}))) as { items?: { id: number; name: string }[] };
  // 223.11 The products' Arabic names, as the Arabic app lists them.
  const arListed = (await (await (await browser.newContext({ locale: "ar-EG", extraHTTPHeaders: { "accept-language": "ar" } })).request.get(`/api/app/${appId}/store/products?platform=android&per_page=40`)).json().catch(() => ({}))) as { items?: { name: string }[] };
  const arNames = (arListed.items ?? []).map((p) => p.name);
  // 228.7 And the Shop tab's Arabic name, as the Arabic app's bar shows it.
  const arNav = (await (await (await browser.newContext({ locale: "ar-EG", extraHTTPHeaders: { "accept-language": "ar" } })).request.get(`/api/app/${appId}/pages?platform=android`)).json().catch(() => ({}))) as { tabs?: { label: string; target: { type: string; screen?: string } }[] };
  const arShopTab = arNav.tabs?.find((tab) => tab.target.type === "screen" && tab.target.screen === "search")?.label ?? "";
  for (const dark of [false, true]) {
    const mode = dark ? "dark" : "light";
    // The site's picture of the home, as the other looks' are.
    const site = await phone(browser, appId, address, "en", dark, LIVE_PHONE, 3);
    await site.screenshot({ path: path.join(OUT, `${DEMO_SLUGS[t.id]}-sig-${look}-home${dark ? "-dark" : ""}.png`) });
    // C is the demo: its home, menu and a product's page are the demo's own pictures (`<brand>-home|menu|product.png`).
    if (look === "c" && !dark) {
      await site.screenshot({ path: path.join(OUT, `${t.brand}-home.png`) });
      await semantics(site);
      expect(await tapNamed(site, /^(open the menu|menu)$/), "the header's menu").toBe(true);
      await site.waitForTimeout(3500);
      await site.screenshot({ path: path.join(OUT, `${t.brand}-menu.png`) });
    }
    await site.context().close();
    if (look === "c" && !dark) {
      const shop = await phone(browser, appId, address, "en", false, LIVE_PHONE, 3);
      await semantics(shop);
      expect(await tapNamed(shop, t.shop), "the Shop tab").toBe(true);
      await shop.waitForTimeout(3500);
      await semantics(shop);
      expect(await tapProduct(shop, t.id, listed), "a product of the listing").toBe(true);
      await shop.waitForTimeout(4500);
      await shop.screenshot({ path: path.join(OUT, `${t.brand}-product.png`) });
      await shop.context().close();
    }
    const page = await phone(browser, appId, address, "en", dark);
    await page.screenshot({ path: shot(`home-${mode}`) });
    await scrollDown(page, 700);
    await page.screenshot({ path: shot(`home-${mode}-2`) });
    await scrollDown(page, 760);
    await page.screenshot({ path: shot(`home-${mode}-3`) });
    await page.context().close();
    // The category menu, from the header's menu button.
    const menu = await phone(browser, appId, address, "en", dark);
    await semantics(menu);
    expect(await tapNamed(menu, /^(open the menu|menu)$/), "the header's menu").toBe(true);
    await menu.waitForTimeout(3500);
    await menu.screenshot({ path: shot(`menu-${mode}`) });
    await scrollDown(menu, 600);
    await menu.screenshot({ path: shot(`menu-${mode}-2`) });
    await menu.context().close();
    // The listing (the Shop tab), then a product's page from it.
    const shop = await phone(browser, appId, address, "en", dark);
    await semantics(shop);
    expect(await tapNamed(shop, t.shop), "the Shop tab").toBe(true);
    await shop.waitForTimeout(3500);
    await shop.screenshot({ path: shot(`listing-${mode}`) });
    await semantics(shop);
    expect(await tapProduct(shop, t.id, listed), "a product of the listing").toBe(true);
    await shop.waitForTimeout(4500);
    await shop.screenshot({ path: shot(`product-${mode}`) });
    // 228.7 The rest of the look's own product page.
    await scrollDown(shop, 700);
    await shop.screenshot({ path: shot(`product-${mode}-2`) });
    await scrollDown(shop, 700);
    await shop.screenshot({ path: shot(`product-${mode}-3`) });
    await shop.context().close();
    // 228.7 And in Arabic: a product of the home, by its Arabic name.
    const arShop = await phone(browser, appId, address, "ar", dark);
    const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await semantics(arShop);
    expect(arShopTab, "the Shop tab's Arabic name").not.toBe("");
    expect(await tapNamed(arShop, new RegExp(`^${escape(arShopTab)}`)), "the Arabic Shop tab").toBe(true);
    await arShop.waitForTimeout(3500);
    await semantics(arShop);
    let opened = false;
    for (const name of arNames) if ((opened = await tapNamed(arShop, new RegExp(`^${escape(name)}`)))) break;
    expect(opened, "a product of the Arabic listing").toBe(true);
    await arShop.waitForTimeout(4500);
    await arShop.screenshot({ path: shot(`product-ar${dark ? "-dark" : ""}`) });
    await scrollDown(arShop, 700);
    await arShop.screenshot({ path: shot(`product-ar${dark ? "-dark" : ""}-2`) });
    await arShop.context().close();
  }
  // In Arabic, light and dark.
  const ar = await phone(browser, appId, address, "ar", false);
  await ar.screenshot({ path: shot("home-ar") });
  await ar.context().close();
  const arDark = await phone(browser, appId, address, "ar", true);
  await arDark.screenshot({ path: shot("home-ar-dark") });
  await arDark.context().close();
}

for (const t of shown) {
  test(`template C, the demo: ${t.id}`, async ({ browser }) => {
    test.setTimeout(600_000);
    const appId = appIds.get(t.id)!;
    await shoot(browser, t, "c", appId, preview(appId));
  });

  test(`template D, a project started from it: ${t.id}`, async ({ browser }) => {
    test.setTimeout(600_000);
    const suffix = `${t.id}-${Date.now().toString(36)}`;
    const own = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${160 + TYPES.indexOf(t)}` } });
    await own.goto("/sign-up");
    await own.getByLabel("Full name").fill("Selin Kaya");
    await own.getByLabel("Email").fill(`v3-${suffix}@shots.test`);
    await own.getByLabel("WhatsApp number").fill(`+90 532 000 02${10 + TYPES.indexOf(t)}`);
    await own.getByLabel("Password", { exact: true }).fill("selin-shots-strong-password-1");
    await own.getByRole("checkbox").check();
    await own.getByRole("button", { name: "Create account" }).click();
    await expect(own).toHaveURL(/\/start/);
    await own.goto(`/start/${DEMO_SLUGS[t.id]}/make?new=1&look=d`);
    await own.getByLabel("Your app's name").fill(DEMO_BRANDS[t.id].appName);
    await own.getByRole("button", { name: "Create my app" }).click();
    await own.waitForURL(/\/(studio|dashboard)\//, { timeout: 90_000 });
    // Studio's editor with the look's home on its canvas, for review.
    await own.setViewportSize({ width: 1440, height: 1100 });
    await own.goto("/studio/editor");
    await own.waitForTimeout(8000);
    await own.screenshot({ path: path.join(REVIEW, `${t.id}-d-studio-editor.png`) });
    await own.setViewportSize({ width: 1280, height: 720 });
    await own.goto("/dashboard/preview");
    const src = await own.locator('iframe[src*="/preview-app/"]').first().getAttribute("src");
    expect(src).toBeTruthy();
    await own.close();
    const token = new URL(src!, E2E.baseURL).searchParams.get("token")!;
    const appId = token.split(".")[1]!;
    await shoot(browser, t, "d", appId, `/preview-app/index.html?token=${token}`);
  });
}
