import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import type { DemoId } from "../../src/lib/demo/constants";
import { DEMO_BRANDS } from "../../src/lib/demo/content";
import { LIVE_PHONE } from "../../src/lib/demo/live";
import { createPreviewToken, previewAppPath, previewKey } from "../../src/lib/preview/token";

/**
 * 225.9 The demo guides' pictures re-shot from the demo apps in their main
 * look C (223): each guide's home, its category menu (Ghurza's custom-order
 * page) and a product's page, as the real app (the app preview,
 * public/preview-app) draws them, at 360 × 780 and three pixels to each as
 * the site's other pictures (`public/screens/<guide>-home|menu|product.png`);
 * and the same three for review at 390 × 844 and two pixels to each, light
 * and dark, in `.data/v3-guides`. Lujain's and Toota's were re-shot with
 * their looks (v3-clothes-kids.screens.ts). Not part of the test suite:
 * `PW_CHROMIUM=… npx playwright test --config playwright.screens.config.ts
 * v3-guides --trace off` after `npm run build`; `SHOTS=decor,furniture` for
 * some of them only.
 */
test.describe.configure({ mode: "serial" });
if (process.env.PW_CHROMIUM) test.use({ launchOptions: { executablePath: process.env.PW_CHROMIUM } });

const OUT = path.resolve(__dirname, "../../public/screens");
const REVIEW = path.resolve(__dirname, "../../.data/v3-guides");
const REVIEW_PHONE = { width: 390, height: 844 } as const;
/** Each guide, its second picture's page, and the kind of product its words name (the first that matches, else the shop's first). */
const TYPES: { id: DemoId; guide: string; second: "menu" | "custom"; page: string; product: RegExp }[] = [
  { id: "beauty", guide: "velours", second: "menu", page: "menu", product: /foundation/i },
  { id: "crochet", guide: "ghurza", second: "custom", page: "custom-order", product: /./ },
  { id: "toys", guide: "toot", second: "menu", page: "menu", product: /./ },
  { id: "decor", guide: "sakan", second: "menu", page: "menu", product: /vase/i },
  { id: "furniture", guide: "rukn", second: "menu", page: "menu", product: /sofa/i },
  { id: "electronics", guide: "madar", second: "menu", page: "menu", product: /^ZENRA X9 Pro$/ },
  { id: "mobiles", guide: "nova", second: "menu", page: "menu", product: /^Veyra X2 Pro$/ },
  { id: "computers", guide: "nawah", second: "menu", page: "menu", product: /laptop|book/i },
];
const only = (process.env.SHOTS ?? "").split(",").filter(Boolean);
const shown = TYPES.filter((t) => !only.length || only.includes(t.id));
const appIds = new Map<DemoId, string>();

test.beforeAll(async ({ browser }) => {
  test.setTimeout(300_000);
  mkdirSync(REVIEW, { recursive: true });
  const admin = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.152" } });
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
    const button = admin.getByRole("button", { name: `Start a build of ${DEMO_BRANDS[t.id].appName}`, exact: true });
    appIds.set(t.id, await admin.locator('form:not(:has(input[name="variant"]))').filter({ has: button }).locator('input[name="appId"]').first().inputValue());
  }
  await admin.close();
});

/** The demo app on a phone, as a guest past its sign-in; its pages and pictures loaded. */
async function phone(browser: Browser, appId: string, dark: boolean, size: { width: number; height: number }, scale: number): Promise<Page> {
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: scale, colorScheme: dark ? "dark" : "light", locale: "en-US", hasTouch: true, isMobile: true });
  await context.addInitScript((app) => localStorage.setItem(`yallapp.preview.${app}.settings.guest_mode`, "true"), appId);
  const page = await context.newPage();
  const address = previewAppPath(createPreviewToken({ appId, draft: false }, previewKey(E2E.signingSecret)));
  const pages = page.waitForResponse((r) => new URL(r.url()).pathname === `/api/app/${appId}/pages`, { timeout: 90_000 });
  await page.goto(`${address}&lang=en&theme=${dark ? "dark" : "light"}&os=android`);
  expect((await pages).status()).toBe(200);
  await page.waitForTimeout(7000);
  return page;
}

/** Opens one of the app's routes, as a tap on its button would. */
async function go(page: Page, route: string): Promise<void> {
  await page.evaluate((r) => (window.location.hash = r), route);
  await page.waitForTimeout(4500);
}

/** The product the guide shows: the first of the shop's whose name matches, else its first. */
async function productOf(browser: Browser, appId: string, wanted: RegExp): Promise<number> {
  const res = await (await browser.newContext()).request.get(`/api/app/${appId}/store/products?platform=android&per_page=100`);
  const items = ((await res.json()) as { items?: { id: number; name: string }[] }).items ?? [];
  const pick = items.find((p) => wanted.test(p.name)) ?? items[0];
  expect(pick, "a product of the shop").toBeTruthy();
  return pick!.id;
}

for (const t of shown) {
  test(`the ${t.guide} guide's pictures in look C`, async ({ browser }) => {
    test.setTimeout(600_000);
    const appId = appIds.get(t.id)!;
    const product = await productOf(browser, appId, t.product);
    // The site's: its home, the second page and the product, by day.
    const site = await phone(browser, appId, false, LIVE_PHONE, 3);
    await site.screenshot({ path: path.join(OUT, `${t.guide}-home.png`) });
    await go(site, `#/page/${t.page}`);
    await site.screenshot({ path: path.join(OUT, `${t.guide}-${t.second}.png`) });
    await go(site, `#/product/${product}`);
    await site.screenshot({ path: path.join(OUT, `${t.guide}-product.png`) });
    await site.context().close();
    // For review: the same three at 390 × 844, by day and by night.
    for (const dark of [false, true]) {
      const mode = dark ? "dark" : "light";
      const page = await phone(browser, appId, dark, REVIEW_PHONE, 2);
      await page.screenshot({ path: path.join(REVIEW, `${t.guide}-home-${mode}.png`) });
      await go(page, `#/page/${t.page}`);
      await page.screenshot({ path: path.join(REVIEW, `${t.guide}-${t.second}-${mode}.png`) });
      await go(page, `#/product/${product}`);
      await page.screenshot({ path: path.join(REVIEW, `${t.guide}-product-${mode}.png`) });
      await page.context().close();
    }
  });
}
