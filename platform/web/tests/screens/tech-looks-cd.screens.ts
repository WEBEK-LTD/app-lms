import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { DEMO_BRANDS } from "../../src/lib/demo/content";
import { LIVE_PHONE } from "../../src/lib/demo/live";
import { createPreviewToken, previewAppPath, previewKey } from "../../src/lib/preview/token";

/**
 * 227 The screenshots of Madar's and Nawah's looks C and D, from the real
 * app (the app preview, public/preview-app), each from a Studio project
 * started from the look (its products the demo's samples): each look's home
 * by day and by night at the site's 360 × 780 and 3× (public/screens,
 * `<demo>-sig-<look>-home`, `-dark`), and with `SHOTS_REVIEW=1` the home
 * down its length, the category menu, the shop and a product's page at
 * 390 × 844 and 2×, by day and by night, into .data/tech-cd-shots for
 * review. Not part of the test suite: `npx playwright test --config
 * playwright.screens.config.ts tech-looks-cd`.
 */
test.describe.configure({ mode: "serial" });
if (process.env.PW_CHROMIUM) test.use({ launchOptions: { executablePath: process.env.PW_CHROMIUM } });

const OUT = path.resolve(__dirname, "../../public/screens");
const REVIEW = path.resolve(__dirname, "../../.data/tech-cd-shots");
const review = process.env.SHOTS_REVIEW === "1";
const headers = { "x-forwarded-for": "203.0.113.227" };
const REVIEW_PHONE = { width: 390, height: 844 } as const;

/** Each look by its name in Studio's new project, and its type's. */
const LOOKS = [
  { demo: "electronics", look: "c", name: "MADAR GRID, the bento", type: "Electronics", phone: "+966 55 000 0227" },
  { demo: "electronics", look: "d", name: "The colour stage", type: "Electronics", phone: "+966 55 000 1227" },
  { demo: "computers", look: "c", name: "Battle station, neon on black", type: "Computers & gaming", phone: "+966 56 000 0227" },
  { demo: "computers", look: "d", name: "Workstation, for business", type: "Computers & gaming", phone: "+966 56 000 1227" },
] as const;

async function adminPage(browser: Browser): Promise<Page> {
  const admin = await browser.newPage({ extraHTTPHeaders: headers });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.demosAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  return admin;
}

async function settle(page: Page, ms = 3500): Promise<void> {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(ms);
}

async function go(page: Page, route: string): Promise<void> {
  await page.evaluate((r) => (window.location.hash = r), route);
  await settle(page);
}

/** The app open as a guest on a project's draft, in a language and a theme. */
async function openApp(browser: Browser, appId: string, lang: "en" | "ar" | "tr", dark: boolean, phone: { width: number; height: number }, scale: number): Promise<Page> {
  const context = await browser.newContext({ viewport: phone, deviceScaleFactor: scale, colorScheme: dark ? "dark" : "light", locale: lang === "ar" ? "ar-EG" : lang === "tr" ? "tr-TR" : "en-US", hasTouch: true, isMobile: true, extraHTTPHeaders: headers });
  await context.addInitScript((app) => localStorage.setItem(`yallapp.preview.${app}.settings.guest_mode`, "true"), appId);
  const page = await context.newPage();
  const address = `${previewAppPath(createPreviewToken({ appId, draft: true }, previewKey(E2E.signingSecret)))}&lang=${lang}&theme=${dark ? "dark" : "light"}&os=android`;
  const pages = page.waitForResponse((r) => new URL(r.url()).pathname === `/api/app/${appId}/pages`, { timeout: 90_000 });
  await page.goto(address);
  expect((await pages).status()).toBe(200);
  await settle(page, 6000);
  return page;
}

async function swipe(page: Page, by: number, phone: { width: number; height: number }): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.synthesizeScrollGesture", { x: phone.width / 2, y: Math.round(phone.height * 0.7), yDistance: -by, speed: 1200, gestureSourceType: "touch" });
  await cdp.detach();
  await settle(page, 1200);
}

/** The project's first product, for its page. */
async function firstProduct(page: Page, appId: string): Promise<number> {
  const token = createPreviewToken({ appId, draft: true }, previewKey(E2E.signingSecret));
  const res = await page.request.get(`/api/app/${appId}/store/products?platform=android&per_page=5`, { headers: { "x-yallapp-preview": token } });
  const items = ((await res.json()) as { items: { id: number }[] }).items;
  return (items[2] ?? items[0]!).id;
}

/** A Studio project started from the look, by an owner in the demo's country. */
async function projectOf(browser: Browser, l: (typeof LOOKS)[number]): Promise<string> {
  const suffix = `${l.demo}-${l.look}-${Date.now().toString(36)}`;
  const client = { name: "Tech Looks CD", email: `tech-cd-${suffix}@studio.test`, password: "tech-looks-password-227" };
  const own = await (await browser.newContext({ extraHTTPHeaders: headers, viewport: { width: 1440, height: 900 } })).newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill(l.phone);
  await own.getByLabel("Your website (optional)").fill(`https://tech-cd-${suffix}.studio.test`);
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
  await own.getByRole("radio", { name: new RegExp(`^${l.type.replace("&", "\\&")}`) }).first().check();
  await own.getByLabel("Project name").fill(DEMO_BRANDS[l.demo].appName);
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: new RegExp(l.name) }).first().click();
  if (!/\/studio\/project$/.test(own.url())) await own.getByRole("button", { name: /^(Next|Create)/ }).last().click();
  await expect(own).toHaveURL(/\/studio\/project$/, { timeout: 60_000 });
  // The app in English, Arabic and Turkish (a new project is in its owner's language only).
  await own.goto("/studio/project/languages");
  // The shop type's warranty notice, accepted once.
  const accept = own.locator("[data-liability-accept]");
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
    await expect(accept).toBeHidden();
  }
  const list = own.getByRole("list", { name: "Languages in the app" }).getByRole("listitem");
  for (const [code, name] of [
    ["ar", "Arabic"],
    ["tr", "Turkish"],
  ] as const) {
    if (await list.filter({ hasText: name }).count()) continue;
    await own.getByLabel("Add a language").selectOption(code);
    await own.getByRole("button", { name: "Add", exact: true }).click();
    await expect(list.filter({ hasText: name })).toHaveCount(1);
  }
  await own.goto("/studio/project/preview?pages=published");
  const src = (await own.locator("iframe[data-testid=app-preview]").getAttribute("src"))!;
  const token = new URL(src, E2E.baseURL).searchParams.get("token")!;
  await own.context().close();
  return token.split(".")[1]!;
}

test.beforeAll(async ({ browser }) => {
  test.setTimeout(300_000);
  mkdirSync(review ? REVIEW : OUT, { recursive: true });
  // Studio's demo apps first: a project started from a look takes the demo's products as samples.
  const admin = await adminPage(browser);
  await admin.goto("/admin/demos?family=studio");
  await admin.getByRole("button", { name: /Create Studio's demo apps|Refresh all of Studio's demo apps/ }).click();
  await expect(admin.getByRole("status")).toContainText("up to date", { timeout: 180_000 });
  await admin.close();
});

for (const l of LOOKS) {
  test(`${l.demo} look ${l.look.toUpperCase()}: ${l.name}`, async ({ browser }) => {
    test.setTimeout(600_000);
    const appId = await projectOf(browser, l);
    const base = `${l.demo}-sig-${l.look}`;
    if (!review) {
      for (const dark of [false, true]) {
        const page = await openApp(browser, appId, "en", dark, LIVE_PHONE, 3);
        await page.screenshot({ path: path.join(OUT, `${base}-home${dark ? "-dark" : ""}.png`) });
        await page.context().close();
      }
      return;
    }
    for (const lang of ["ar", "en"] as const) {
      for (const dark of [false, true]) {
        const page = await openApp(browser, appId, lang, dark, REVIEW_PHONE, 2);
        const name = (part: string) => path.join(REVIEW, `${base}-${part}${dark ? "-dark" : ""}-${lang}.png`);
        await page.screenshot({ path: name("home") });
        if (lang === "ar") {
          for (const n of [2, 3, 4, 5, 6]) {
            await swipe(page, 700, REVIEW_PHONE);
            await page.screenshot({ path: name(`home-${n}`) });
          }
        }
        await go(page, "#/page/menu");
        await page.screenshot({ path: name("menu") });
        await go(page, "#/shop");
        await page.screenshot({ path: name("listing") });
        await go(page, `#/product/${await firstProduct(page, appId)}`);
        await page.screenshot({ path: name("product") });
        await page.context().close();
      }
    }
    const tr = await openApp(browser, appId, "tr", false, REVIEW_PHONE, 2);
    await tr.screenshot({ path: path.join(REVIEW, `${base}-home-tr.png`) });
    await tr.context().close();
  });
}
