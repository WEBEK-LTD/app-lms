import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "../e2e/png";

/**
 * Screenshots of a Studio academy's Courses, Bundles and Teachers pages, in
 * English and Arabic, at the desktop and phone widths: an academy with many
 * teachers from the Teachers template (its sample courses and teachers), an
 * own draft course with a picture, a hidden course, a bundle and an own
 * teacher. Not part of the test suite; run it with
 * `SCREENS_OUT=<dir> SCREENS_PREFIX=before npx playwright test --config playwright.screens.config.ts studio-courses`.
 */
test.describe.configure({ mode: "serial" });

const OUT = process.env.SCREENS_OUT ?? path.resolve(__dirname, "../../test-results/screens");
const PREFIX = process.env.SCREENS_PREFIX ?? "shot";
const suffix = Date.now().toString(36);
const client = { name: "Rawaq Academy", email: `rawaq-${suffix}@academy.test`, password: "rawaq-strong-password-1" };

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

/** The page's top (to `height`), or all of it. */
async function shoot(page: Page, name: string, fullPage = false, height?: number) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  fs.mkdirSync(OUT, { recursive: true });
  const clip = height ? { x: 0, y: 0, width: page.viewportSize()!.width, height } : undefined;
  await page.screenshot({ path: path.join(OUT, `${PREFIX}-${name}.png`), fullPage: fullPage || Boolean(clip), clip });
}

/** Opens the add form where the page keeps it behind a button (after the redesign), or finds it on the page. */
async function openAdd(page: Page, button: RegExp) {
  const opener = page.getByRole("button", { name: button }).first();
  if (await opener.isVisible().catch(() => false)) await opener.click();
}

test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });

test("studio courses screenshots", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(client.name);
  await page.getByLabel("Email").fill(client.email);
  await page.getByLabel("WhatsApp number").fill("+20 100 000 00 78");
  await page.getByLabel("Password", { exact: true }).fill(client.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pending$/);

  await signIn(page, E2E.adminEmail, E2E.adminPassword);
  await page.goto("/admin/clients");
  await page.getByRole("searchbox", { name: "Search clients" }).fill(client.email);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: `Activate ${client.name}` }).click();
  await page.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(page.getByRole("status")).toContainText("Activated");

  // An academy with many teachers from the Teachers template: its sample courses and teachers.
  await signIn(page, client.email, client.password);
  await page.goto("/studio/new");
  await page.getByRole("radio", { name: "An academy with many teachers" }).check();
  await page.getByLabel("Project name").fill(client.name);
  for (let i = 0; i < 3 && !/\/studio\/project$/.test(new URL(page.url()).pathname); i++) {
    const radio = page.getByRole("radio", { name: "Teachers", exact: true });
    if (await radio.isVisible()) await radio.click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.waitForTimeout(1500);
  }
  await expect(page).toHaveURL(/\/studio\/project$/, { timeout: 30_000 });

  // An own course, kept as a draft, with its picture.
  await page.goto("/studio/project/courses");
  await openAdd(page, /^(Add a course|New course)$/);
  const add = page.getByRole("region", { name: "Add a course" });
  await add.getByLabel("Title").fill("Egyptian Arabic for Travellers");
  await add.getByLabel("Price (TRY)").fill("450");
  await add.locator('input[type="file"][name="image"]').setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: solidPng(640, 360, [194, 65, 12]) });
  await add.getByLabel("Students can see it").uncheck();
  await add.getByRole("button", { name: "Add course" }).click();
  // The first own course asks whether to remove the samples: they stay.
  await page.getByRole("link", { name: "No, keep them for now" }).click();

  // A bundle of two of the sample courses.
  await page.goto("/studio/project/courses/bundles");
  await openAdd(page, /^(Add a bundle|New bundle)$/);
  const form = page.getByRole("region", { name: "Add a bundle" });
  await form.getByLabel("Title").fill("Design starter pack");
  await form.getByLabel(/UX Design Fundamentals/).check();
  await form.getByLabel(/Product Photography/).check();
  await form.getByLabel("Bundle price (TRY)").fill("1200");
  await form.getByRole("button", { name: "Add bundle" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Design starter pack" })).toBeVisible();

  // An own teacher beside the samples.
  await page.goto("/studio/project/teachers");
  await openAdd(page, /^(Add a teacher|New teacher)$/);
  const summary = page.locator("summary", { hasText: "Add a teacher" });
  if (await summary.isVisible().catch(() => false)) await summary.click();
  await page.locator("#t-name-new").fill("Nour Hassan");
  await page.locator("#t-phone-new").fill("+20 100 222 3344");
  await page.locator("#t-subjects-new").fill("Egyptian Arabic, Conversation");
  await page.locator("#t-share-new").fill("60");
  await page.locator("#t-bio-new").fill("Teaches the Arabic people speak in Cairo, from the first day.");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const keep = page.getByRole("link", { name: "No, keep them for now" });
  await expect(keep.or(page.getByText("Added. They sign in to the app with this number and see the Teacher tab."))).toBeVisible();
  if (await keep.isVisible()) await keep.click();

  // The courses page, in English; SCREENS_ALL=1 also the other two, in Arabic and at the phone's width.
  await page.goto("/studio/project/courses");
  // Down to the end of the list of courses.
  await shoot(page, "courses", false, 1560);
  if (!process.env.SCREENS_ALL) return;
  await page.getByRole("button", { name: "Add a course" }).click();
  await shoot(page, "courses-sheet");
  for (const lang of ["en", "ar"] as const) {
    if (lang === "ar") {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/dashboard/app-type?new=1");
      await page.locator("[data-dashboard-languages]").getByRole("button", { name: "العربية" }).click();
      await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    }
    for (const [name, url] of [
      ["courses", "/studio/project/courses"],
      ["bundles", "/studio/project/courses/bundles"],
      ["teachers", "/studio/project/teachers"],
    ] as const) {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(url);
      await shoot(page, `${lang}-${name}`, true);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(url);
      await shoot(page, `${lang}-${name}-phone`, true);
    }
  }
});
