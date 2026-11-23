import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { ALL_DEMO_TYPES, STUDIO_DEMO_TYPES, type DemoId } from "../../src/lib/demo/constants";
import { DEMO_BRANDS, DEMO_GUIDES } from "../../src/lib/demo/content";
import { LIVE_PHONE } from "../../src/lib/demo/live";
import { createPreviewToken, previewAppPath, previewKey } from "../../src/lib/preview/token";

/**
 * 211 The screenshots of the Shopping & stores types (public/screens), from
 * the real app (the app preview, public/preview-app) at 360 × 780 and 3×
 * (1080 × 2340), as the website shows them: each demo's home, category menu
 * and a product's page in its look A (`<brand>-home`, `-menu`, `-product`,
 * DEMO_GUIDES' screens), and each look's home light and dark
 * (`<demo>-sig-a-home`, `-dark`; look B from a Studio project started from
 * it, its products the demo's samples). `SHOTS_REVIEW=1` writes Arabic and
 * dark copies to .data/tech-shots for checking against the designs instead.
 * Not part of the test suite: `npx playwright test --config
 * playwright.screens.config.ts tech-shops`.
 */
test.describe.configure({ mode: "serial" });
// A machine whose Chromium isn't this Playwright's own names it (PW_CHROMIUM).
if (process.env.PW_CHROMIUM) test.use({ launchOptions: { executablePath: process.env.PW_CHROMIUM } });

const OUT = path.resolve(__dirname, "../../public/screens");
const REVIEW = path.resolve(__dirname, "../../.data/tech-shots");
const review = process.env.SHOTS_REVIEW === "1";
const DEMOS = (process.env.SHOTS ?? "electronics,mobiles,computers").split(",") as DemoId[];
const appIds = new Map<string, string>();
const headers = { "x-forwarded-for": "203.0.113.211" };

async function adminPage(browser: Browser): Promise<Page> {
  const admin = await browser.newPage({ extraHTTPHeaders: headers });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.demosAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  return admin;
}

test.beforeAll(async ({ browser }) => {
  test.setTimeout(300_000);
  mkdirSync(review ? REVIEW : OUT, { recursive: true });
  const admin = await adminPage(browser);
  await admin.goto("/admin/demos?family=studio");
  await admin.getByRole("button", { name: /Create Studio's demo apps|Refresh all of Studio's demo apps/ }).click();
  await expect(admin.getByRole("status")).toContainText("up to date", { timeout: 180_000 });
  for (const id of ALL_DEMO_TYPES.filter((d) => STUDIO_DEMO_TYPES.includes(d as never) && DEMOS.includes(d))) {
    const name = DEMO_BRANDS[id].appName;
    appIds.set(`${id}:a`, await admin.locator(`form:not(:has(input[name="variant"])):has(button:has-text("Start a build of ${name}")) input[name="appId"]`).first().inputValue());
  }
  await admin.close();
});

/** The app open as a guest, in a language and a theme, at the screenshots' size. */
async function openApp(browser: Browser, appId: string, lang: "en" | "ar", dark: boolean, draft = false): Promise<Page> {
  const context = await browser.newContext({ viewport: LIVE_PHONE, deviceScaleFactor: 3, colorScheme: dark ? "dark" : "light", locale: lang === "ar" ? "ar-EG" : "en-US", hasTouch: true, isMobile: true, extraHTTPHeaders: headers });
  await context.addInitScript((app) => localStorage.setItem(`yallapp.preview.${app}.settings.guest_mode`, "true"), appId);
  const page = await context.newPage();
  const address = `${previewAppPath(createPreviewToken({ appId, draft }, previewKey(E2E.signingSecret)))}&lang=${lang}&theme=${dark ? "dark" : "light"}&os=android`;
  const pages = page.waitForResponse((r) => new URL(r.url()).pathname === `/api/app/${appId}/pages`, { timeout: 90_000 });
  await page.goto(address);
  expect((await pages).status()).toBe(200);
  await settle(page, 6000);
  return page;
}

/** Its pictures and fonts loaded, the hero's autoplay at its first card. */
async function settle(page: Page, ms = 3500): Promise<void> {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(ms);
}

async function go(page: Page, route: string): Promise<void> {
  await page.evaluate((r) => (window.location.hash = r), route);
  await settle(page);
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(review ? REVIEW : OUT, `${name}.png`) });
}

/** Each shop's flagship, the product its story opens. */
const FLAGSHIP: Record<string, string> = { electronics: "ZENRA X1 Pro", mobiles: "Veyra X3 Pro", computers: "Ofuq 16 Pro" };

async function flagship(page: Page, appId: string, demo: string): Promise<number> {
  const token = createPreviewToken({ appId, draft: false }, previewKey(E2E.signingSecret));
  const res = await page.request.get(`/api/app/${appId}/store/products?platform=android&per_page=50&search=${encodeURIComponent(FLAGSHIP[demo] ?? "")}`, { headers: { "x-yallapp-preview": token } });
  const items = ((await res.json()) as { items: { id: number; name: string }[] }).items;
  return (items.find((p) => p.name === FLAGSHIP[demo]) ?? items[0]!).id;
}

/** Scrolls the app's screen with a finger (the app's own scrolling). */
async function swipe(page: Page, by: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.synthesizeScrollGesture", { x: LIVE_PHONE.width / 2, y: Math.round(LIVE_PHONE.height * 0.7), yDistance: -by, speed: 1200, gestureSourceType: "touch" });
  await cdp.detach();
  await settle(page, 1200);
}

for (const id of DEMOS) {
  test(`look A: ${id}`, async ({ browser }) => {
    test.setTimeout(240_000);
    const appId = appIds.get(`${id}:a`)!;
    expect(appId, id).toBeTruthy();
    const [home, menu, product] = DEMO_GUIDES[id].screens;
    for (const lang of review ? (["en", "ar"] as const) : (["en"] as const)) {
      for (const dark of [false, true]) {
        const page = await openApp(browser, appId, lang, dark);
        const suffix = review ? `-${lang}` : "";
        await shot(page, `${id}-sig-a-home${dark ? "-dark" : ""}${suffix}`);
        if (review && !dark) {
          for (const n of [2, 3, 4, 5, 6, 7]) {
            await swipe(page, 640);
            await shot(page, `${id}-sig-a-home-${n}${suffix}`);
          }
          await go(page, "#/");
        }
        if (!dark || review) {
          if (!dark) await shot(page, `${home}${suffix}`);
          await go(page, "#/page/menu");
          await shot(page, `${menu}${dark ? "-dark" : ""}${suffix}`);
          await go(page, `#/product/${await flagship(page, appId, id)}`);
          await shot(page, `${product}${dark ? "-dark" : ""}${suffix}`);
          if (review) {
            for (const n of [2, 3, 4]) {
              await swipe(page, 640);
              await shot(page, `${product}-${n}${dark ? "-dark" : ""}${suffix}`);
            }
          }
        }
        await page.context().close();
      }
    }
  });
}

test("look B: a Studio project from each type's look B", async ({ browser }) => {
  test.setTimeout(900_000);
  // Each type's project by an owner in its demo's country (its currency follows): Riyadh or Jeddah, Cairo.
  const PHONE: Record<string, string> = { electronics: "+966 55 000 0211", mobiles: "+20 100 000 0211", computers: "+966 56 000 0211" };
  const LOOK_B: Record<string, string> = { electronics: "NABD, lime on black", mobiles: "Emerald on stone", computers: "SILICA, green on stone" };
  const types: Record<string, string> = { electronics: "Electronics", mobiles: "Mobiles", computers: "Computers & gaming" };
  for (const id of DEMOS) {
    const suffix = `${id}-${Date.now().toString(36)}`;
    const client = { name: "Tech Looks", email: `tech-looks-${suffix}@studio.test`, password: "tech-looks-password-211" };
    const own = await (await browser.newContext({ extraHTTPHeaders: headers, viewport: { width: 1440, height: 900 } })).newPage();
    await own.goto("/sign-up");
    await own.getByLabel("Full name").fill(client.name);
    await own.getByLabel("Email").fill(client.email);
    await own.getByLabel("WhatsApp number").fill(PHONE[id]!);
    await own.getByLabel("Your website (optional)").fill(`https://tech-looks-${suffix}.studio.test`);
    await own.getByLabel("Password", { exact: true }).fill(client.password);
    await own.getByRole("checkbox").check();
    await own.getByRole("button", { name: "Create account" }).click();
    await expect(own).toHaveURL(/\/start$/);
    const admin = await adminPage(browser);
    await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
    await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
    await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
    await expect(admin.getByRole("status")).toContainText("Activated");
    await admin.close();
    await own.goto("/studio/new");
    await own.getByRole("radio", { name: new RegExp(`^${types[id]!.replace("&", "\\&")}`) }).first().check();
    await own.getByLabel("Project name").fill(DEMO_BRANDS[id].appName);
    await own.getByRole("button", { name: "Next" }).click();
    await own.getByRole("radio", { name: new RegExp(LOOK_B[id]!) }).first().click();
    if (!/\/studio\/project$/.test(own.url())) await own.getByRole("button", { name: /^(Next|Create)/ }).last().click();
    await expect(own).toHaveURL(/\/studio\/project$/, { timeout: 60_000 });
    await own.goto("/studio/project/preview?pages=published");
    const src = (await own.locator("iframe[data-testid=app-preview]").getAttribute("src"))!;
    const token = new URL(src, E2E.baseURL).searchParams.get("token")!;
    const appId = token.split(".")[1]!;
    for (const lang of review ? (["en", "ar"] as const) : (["en"] as const)) {
      for (const dark of [false, true]) {
        const page = await openApp(browser, appId, lang, dark, true);
        await shot(page, `${id}-sig-b-home${dark ? "-dark" : ""}${review ? `-${lang}` : ""}`);
        if (review && !dark) {
          for (const n of [2, 3, 4, 5, 6, 7]) {
            await swipe(page, 640);
            await shot(page, `${id}-sig-b-home-${n}-${lang}`);
          }
          await go(page, "#/");
        }
        if (review) {
          await go(page, "#/page/menu");
          await shot(page, `${id}-sig-b-menu${dark ? "-dark" : ""}-${lang}`);
        }
        await page.context().close();
      }
    }
    await own.context().close();
  }
});
