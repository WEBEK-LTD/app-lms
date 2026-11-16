import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { messagesFor } from "../../src/i18n";
import { ar as languagesAr, tr as languagesTr } from "../../src/i18n/dashboard/languages";
import { ar as startAr, tr as startTr } from "../../src/i18n/dashboard/start";

/**
 * 132.40 Someone who signs up in Arabic gets an Arabic dashboard, and the
 * apps they make are Arabic: their main language is Arabic with English
 * (and the demo's Turkish) after it, their pages are written in it, and the
 * app preview opens in it, the draft and what's published alike; the
 * dashboard stays Arabic after signing in again, and so do the emails. The
 * same in Turkish, for an app from the App editor's demos and one from the
 * app type step. An English account's app stays English until its owner
 * chooses "Make Arabic the main language" on Languages. E2E_SHOTS_DIR saves
 * pictures of the way (2x JPGs).
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const SHOTS = process.env.E2E_SHOTS_DIR ?? null;
const UUID = "[0-9a-f-]{36}";

interface SentMail {
  to: string;
  subject: string;
  sentAt: string;
}

async function mailsTo(email: string): Promise<SentMail[]> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as SentMail));
  return mails.filter((m) => m.to === email).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

/** A browser of its own (each its own address, so the sign-ups don't use up another spec's limit), at 2x for the pictures. */
async function freshPage(browser: Browser, ip: string): Promise<Page> {
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip }, deviceScaleFactor: 2, viewport: { width: 1280, height: 860 } });
  return context.newPage();
}

async function shot(page: Page, name: string): Promise<void> {
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.jpg`), type: "jpeg", quality: 82 });
}

async function signUp(page: Page, lang: "ar" | "tr", client: { name: string; email: string; password: string }, whatsapp: string): Promise<void> {
  const m = messagesFor(lang).auth;
  await page.goto(`/${lang}/sign-up`);
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
  await page.getByLabel(m.fullName).fill(client.name);
  await page.getByLabel(m.email).fill(client.email);
  await page.getByLabel(m.whatsapp).fill(whatsapp);
  await page.getByLabel(m.password, { exact: true }).fill(client.password);
  await page.getByRole("checkbox").check();
  await shot(page, `${lang}-1-sign-up`);
  await page.getByRole("button", { name: m.createButton }).click();
  await expect(page).toHaveURL(/\/start$/);
  // The account's dashboard speaks the language it signed up in.
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
}

/** The app's languages on Languages, in their order. */
async function appLanguages(page: Page): Promise<string[]> {
  await page.goto("/dashboard/languages");
  const items = page.locator("li[data-language]");
  await expect(items.first()).toBeVisible();
  return items.evaluateAll((els) => els.map((el) => el.getAttribute("data-language") ?? ""));
}

/**
 * The app preview of `href`: the frame opens in `lang`, the app's config says it's the main language,
 * and the app asks the hosted API in it (`Accept-Language`).
 */
async function previewIn(page: Page, href: string, lang: string, name: string): Promise<void> {
  const config = page.waitForResponse((r) => new RegExp(`/api/app/${UUID}/config$`).test(new URL(r.url()).pathname), { timeout: 60_000 });
  await page.goto(href);
  const frame = page.locator("iframe[data-testid=app-preview]");
  await expect(frame).toHaveAttribute("src", new RegExp(`[?&]lang=${lang}(&|$)`));
  const response = await config;
  expect(response.status()).toBe(200);
  expect(response.request().headers()["accept-language"]).toBe(lang);
  const body = (await response.json()) as { languages: { default: string; available: string[] } };
  // The plan may allow one language only: the main one, first.
  expect(body.languages.default).toBe(lang);
  expect(body.languages.available[0]).toBe(lang);
  await expect(page.frameLocator("iframe[data-testid=app-preview]").locator("flutter-view, flt-glass-pane").first()).toBeAttached();
  if (SHOTS) {
    // Its first screen drawn, for the picture.
    await page.waitForTimeout(6000);
    await shot(page, name);
  }
}

test("signing up in Arabic: an Arabic dashboard, and a Studio project from a demo in Arabic, its preview too", async ({ browser }) => {
  test.setTimeout(240_000);
  const client = { name: "Nour Hassan", email: `start-ar-${suffix}@lang.test`, password: "nour-start-arabic-password-1" };
  const own = await freshPage(browser, "198.51.100.140");
  await signUp(own, "ar", client, "+20 100 000 0140");
  await expect(own.getByRole("heading", { level: 1, name: startAr.title })).toBeVisible();
  await shot(own, "ar-2-start");

  // Leqaa, the flower shop, in its look B.
  await own.goto("/start/flowers/make?look=b");
  await expect(own.locator("html")).toHaveAttribute("lang", "ar");
  // What comes with it: Arabic first.
  await expect(own.locator("[data-comes]")).toContainText("العربية والإنجليزية");
  await own.getByLabel(startAr.name).fill("ورد نور");
  await own.getByRole("button", { name: startAr.create }).click();
  await expect(own).toHaveURL(/\/studio\/editor\?from=demo$/);
  await expect(own.locator("html")).toHaveAttribute("lang", "ar");
  await shot(own, "ar-3-studio-editor");

  // The project's main language is Arabic, then English and Turkish; nothing to switch.
  expect(await appLanguages(own)).toEqual(["ar", "en", "tr"]);
  await expect(own.locator('li[data-language="ar"]')).toContainText(languagesAr.default);
  await expect(own.locator("[data-main-language]")).toHaveCount(0);

  // The preview opens in Arabic: the draft, and before the first publish what's published too.
  await previewIn(own, "/studio/project/preview?pages=draft", "ar", "ar-4-preview");
  await previewIn(own, "/studio/project/preview", "ar", "ar-5-preview-published");

  // Signed in again from the English page, with nothing remembered in the browser, and in another browser: still Arabic.
  await own.context().clearCookies();
  await own.goto("/studio");
  await expect(own).toHaveURL(/\/sign-in/);
  const other = await freshPage(browser, "198.51.100.141");
  for (const page of [own, other]) {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(client.email);
    await page.getByLabel("Password", { exact: true }).fill(client.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/studio") || url.pathname.startsWith("/dashboard"));
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  }
  // Yallapp's emails to them come in Arabic, asked for on the English page.
  await other.context().clearCookies();
  await other.goto("/forgot-password");
  await other.getByLabel("Email").fill(client.email);
  await other.getByRole("button", { name: "Send reset link" }).click();
  await expect(other.getByRole("status")).toBeVisible();
  await expect.poll(async () => (await mailsTo(client.email)).at(-1)?.subject).toBe("إعادة تعيين كلمة مرور Yallapp");
  await other.context().close();
  await own.context().close();
});

test("signing up in Turkish: a Turkish dashboard, an app from the App editor's demos and one from the app type step, in Turkish", async ({ browser }) => {
  test.setTimeout(240_000);
  const client = { name: "Elif Demir", email: `start-tr-${suffix}@lang.test`, password: "elif-start-turkish-password-1" };
  const own = await freshPage(browser, "198.51.100.142");
  await signUp(own, "tr", client, "+90 532 000 0142");
  await expect(own.getByRole("heading", { level: 1, name: startTr.title })).toBeVisible();
  await shot(own, "tr-2-start");

  // The store demo, made the owner's.
  await own.locator('a[data-demo="store"]').click();
  await own.getByRole("link", { name: startTr.startWith }).click();
  await expect(own).toHaveURL(/\/start\/[a-z-]+\/make$/);
  await own.getByLabel(startTr.name).fill("Elif Çiçek");
  await own.getByRole("button", { name: startTr.create }).click();
  await expect(own).toHaveURL(/\/dashboard\/pages\?from=demo$/);
  await expect(own.locator("html")).toHaveAttribute("lang", "tr");
  // The real app beside the editor opens in the app's main language, not the browser's.
  await expect(own.locator("iframe[data-testid=editor-preview]")).toHaveAttribute("src", /&lang=tr&/);
  await shot(own, "tr-3-pages");
  expect((await appLanguages(own)).slice(0, 2)).toEqual(["tr", "en"]);
  await expect(own.locator('li[data-language="tr"]')).toContainText(languagesTr.default);
  await previewIn(own, "/dashboard/preview?pages=draft", "tr", "tr-4-preview");

  // An app from the app type step: Turkish too.
  await own.goto("/dashboard/app-type?new=1");
  await own.locator('label:has(input[name="kind"][value="academy"])').click();
  await own.locator('form:has(input[name="kind"]) button[type="submit"]').click();
  await expect(own).toHaveURL(/\/dashboard\/setup/);
  expect(await appLanguages(own)).toEqual(["tr", "en"]);
  await expect(own.locator('li[data-language="tr"]')).toContainText(languagesTr.default);
  await own.context().close();
});

test("an English account's app stays English until its owner makes Arabic the main language on Languages", async ({ browser }) => {
  test.setTimeout(180_000);
  const client = { name: "Sam Carter", email: `start-en-${suffix}@lang.test`, password: "sam-start-english-password-1" };
  const own = await freshPage(browser, "198.51.100.143");
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 532 000 0143");
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);
  await own.locator('a[data-demo="store"]').click();
  await own.getByRole("link", { name: "Start with this app" }).click();
  await own.getByLabel("Your app's name").fill("Sam's Shop");
  await own.getByRole("button", { name: "Create my app" }).click();
  await expect(own).toHaveURL(/\/dashboard\/pages\?from=demo$/);
  const before = await appLanguages(own);
  expect(before[0]).toBe("en");
  await expect(own.locator("[data-main-language]")).toHaveCount(0);

  // The dashboard in Arabic: the app's languages stay as they were, and Languages offers Arabic as the main one.
  await own.goto("/dashboard");
  await own.locator("[data-dashboard-languages]").getByRole("button", { name: "العربية" }).click();
  await expect(own.locator("html")).toHaveAttribute("lang", "ar");
  await own.goto("/dashboard/languages");
  expect(await own.locator("li[data-language]").evaluateAll((els) => els.map((el) => el.getAttribute("data-language")))).toEqual(before);
  const main = own.locator('[data-main-language="ar"]');
  await expect(main).toBeVisible();
  await shot(own, "en-1-make-arabic-main");
  await main.getByRole("button", { name: languagesAr.makeMain.replace("{language}", "العربية") }).click();
  // Saved to the draft: the page comes back with Arabic as the main language.
  await expect(own.locator("li[data-language]").first()).toHaveAttribute("data-language", "ar");
  await own.reload();
  await expect(own.locator("[data-main-language]")).toHaveCount(0);
  await expect(own.locator("li[data-language]").first()).toHaveAttribute("data-language", "ar");
  await expect(own.locator('li[data-language="ar"]')).toContainText(languagesAr.default);
  await previewIn(own, "/dashboard/preview?pages=draft", "ar", "en-2-preview-arabic");
  await own.context().close();
});
