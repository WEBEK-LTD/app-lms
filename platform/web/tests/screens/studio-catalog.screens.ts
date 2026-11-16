import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 132.10 Screenshots of the Products and Courses pages before and after they
 * were split into their own pages: a Studio shop from the Shop template (its
 * sample products and categories), a Studio academy from the Teachers
 * template (its sample courses), in English and Arabic, at the desktop and
 * phone widths; and a regular dashboard shop in the dark theme. Not part of
 * the test suite; run it with
 * `SCREENS_OUT=<dir> SCREENS_PREFIX=after SCREENS_SCALE=2 SCREENS_JPEG=1 npx playwright test --config playwright.screens.config.ts studio-catalog`.
 * With SCREENS_PREFIX=before it finds the parts on the old long pages.
 */
test.describe.configure({ mode: "serial" });

const OUT = process.env.SCREENS_OUT ?? path.resolve(__dirname, "../../test-results/screens");
const PREFIX = process.env.SCREENS_PREFIX ?? "after";
const BEFORE = PREFIX === "before";
const JPEG = process.env.SCREENS_JPEG === "1";
const suffix = Date.now().toString(36);
const client = { name: "Lale Studio", email: `lale-shots-${suffix}@studio.test`, password: "lale-shots-strong-password-1" };
const dark = { name: "Gece Shop", email: `gece-shots-${suffix}@studio.test`, password: "gece-shots-strong-password-1" };
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.132" };

test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: Number(process.env.SCREENS_SCALE ?? 1), extraHTTPHeaders });

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

/** The page's top (to `height`), or all of it. */
async function shoot(page: Page, name: string, fullPage = false) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, `${PREFIX}-${name}.${JPEG ? "jpg" : "png"}`), fullPage, ...(JPEG ? { type: "jpeg" as const, quality: 82 } : {}) });
}

async function signUp(page: Page, who: typeof client, phone: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(who.name);
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("WhatsApp number").fill(phone);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-up");
  await signIn(page, E2E.adminEmail, E2E.adminPassword);
  await page.goto("/admin/clients");
  await page.getByRole("searchbox", { name: "Search clients" }).fill(who.email);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: `Activate ${who.name}` }).click();
  await page.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(page.getByRole("status")).toContainText("Activated");
  await signIn(page, who.email, who.password);
}

async function language(page: Page, lang: "en" | "ar") {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dashboard/app-type?new=1");
  await page.locator("[data-dashboard-languages]").getByRole("button", { name: lang === "ar" ? "العربية" : "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
}

/** Scrolls a part of an old long page to the top before its screenshot. */
async function scrollTo(page: Page, selector: string) {
  await page.locator(selector).first().evaluate((el) => el.scrollIntoView({ block: "start" }));
}

async function catalogShots(page: Page, lang: "en" | "ar", base: string) {
  for (const width of [1280, 390]) {
    const phone = width === 390 ? "-phone" : "";
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    await page.goto(`${base}/catalog`);
    await shoot(page, `${lang}-catalog-list${phone}`);
    await page.locator('a[href*="/catalog/"]').filter({ hasText: /Bouquet|Rose|Tulip|باقة/ }).first().click();
    await page.waitForURL(/\/catalog\/\d+$/);
    await shoot(page, `${lang}-catalog-editor${phone}`);
    if (!phone) await shoot(page, `${lang}-catalog-editor-full`, true);
    if (BEFORE) {
      await page.goto(`${base}/catalog`);
      await scrollTo(page, "#h-categories");
    } else await page.goto(`${base}/catalog/categories`);
    await shoot(page, `${lang}-catalog-categories${phone}`);
  }
}

async function courseShots(page: Page, lang: "en" | "ar", base: string) {
  for (const width of [1280, 390]) {
    const phone = width === 390 ? "-phone" : "";
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    await page.goto(`${base}/courses`);
    await shoot(page, `${lang}-courses-list${phone}`);
    await page.locator('a[href*="/courses/"]').filter({ hasText: /UX|Design|Photography|تصميم/ }).first().click();
    await page.waitForURL(/\/courses\/\d+/);
    await shoot(page, `${lang}-course-editor${phone}`);
    if (BEFORE) await scrollTo(page, "#h-curriculum");
    else await page.goto(`${page.url().split("?")[0]}?tab=curriculum`);
    await shoot(page, `${lang}-course-curriculum${phone}`);
  }
}

test("products and courses screenshots", async ({ page }) => {
  test.setTimeout(600_000);
  await signUp(page, client, "+90 532 000 0132");

  // A Studio shop from the Shop template: its sample products, with their pictures.
  await page.goto("/studio/new");
  await page.getByRole("radio", { name: "Store", exact: true }).check();
  await page.getByRole("radio", { name: "No website: everything from here" }).click();
  await page.getByLabel("Project name").fill(client.name);
  await page.getByRole("radio", { name: "Shop", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/\/studio\/project$/, { timeout: 30_000 });
  for (const lang of ["en", "ar"] as const) {
    await language(page, lang);
    await catalogShots(page, lang, "/studio/project");
  }
  await language(page, "en");

  // A Studio academy with many teachers from the Teachers template: its sample courses.
  await page.goto("/studio/new");
  await page.getByRole("radio", { name: "An academy with many teachers" }).check();
  await page.getByLabel("Project name").fill("Rawaq Academy");
  for (let i = 0; i < 3 && !/\/studio\/project$/.test(new URL(page.url()).pathname); i++) {
    const radio = page.getByRole("radio", { name: "Teachers", exact: true });
    if (await radio.isVisible()) await radio.click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.waitForTimeout(1500);
  }
  await expect(page).toHaveURL(/\/studio\/project$/, { timeout: 30_000 });
  for (const lang of ["en", "ar"] as const) {
    await language(page, lang);
    await courseShots(page, lang, "/studio/project");
  }
  await language(page, "en");
});

test("a regular dashboard shop in the dark theme", async ({ page }) => {
  test.setTimeout(300_000);
  await signUp(page, dark, "+90 532 000 0133");
  await page.getByRole("link", { name: "Start from an empty app" }).click();
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("I don't have a website").click();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();
  for (const [name, price, sale] of [
    ["Linen Tote Bag", "450", ""],
    ["Ceramic Mug", "220", "180"],
    ["Olive Oil Soap", "95", ""],
  ] as const) {
    await page.goto("/dashboard/catalog/new");
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Price (TRY)", { exact: true }).fill(price);
    if (sale) await page.getByLabel("Sale price (TRY)").fill(sale);
    await page.getByRole("button", { name: "Add product" }).click();
    await page.waitForURL(/\/dashboard\/catalog(\?|$)/);
  }
  await page.evaluate(() => localStorage.setItem("yallapp-theme", "dark"));
  for (const width of [1280, 390]) {
    const phone = width === 390 ? "-phone" : "";
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    await page.goto("/dashboard/catalog");
    await shoot(page, `dark-catalog-list${phone}`);
    await page.getByRole("link", { name: /Ceramic Mug/ }).first().click();
    await page.waitForURL(/\/catalog\/\d+$/);
    await shoot(page, `dark-catalog-editor${phone}`);
  }
});
