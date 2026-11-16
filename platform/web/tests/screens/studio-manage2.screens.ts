import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 132.17–132.25 Screenshots of the pages split into tabs in the second
 * round: a Studio shop's Delivery & offers (from the Shop template), in
 * English and Arabic at the desktop and phone widths; then regular
 * dashboard apps in the dark theme: Delivery & offers, a bookings app's
 * Services and an events app's Events. Not part of the test suite; run it with
 * `SCREENS_OUT=<dir> SCREENS_SCALE=2 SCREENS_JPEG=1 npx playwright test --config playwright.screens.config.ts tests/screens/studio-manage2.screens.ts`.
 */
test.describe.configure({ mode: "serial" });

const OUT = process.env.SCREENS_OUT ?? path.resolve(__dirname, "../../test-results/screens");
const JPEG = process.env.SCREENS_JPEG === "1";
const suffix = Date.now().toString(36);
const client = { name: "Round Two", email: `round-two-${suffix}@studio.test`, password: "round-two-strong-password-1" };
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.134" };

test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: Number(process.env.SCREENS_SCALE ?? 1), extraHTTPHeaders });

async function shoot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, `after-${name}.${JPEG ? "jpg" : "png"}`), ...(JPEG ? { type: "jpeg" as const, quality: 82 } : {}) });
}

async function language(page: Page, lang: "en" | "ar") {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dashboard/app-type?new=1");
  await page.locator("[data-dashboard-languages]").getByRole("button", { name: lang === "ar" ? "العربية" : "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
}

/** A new regular app of this kind, without a website. */
async function regularApp(page: Page, kind: string) {
  await page.goto("/dashboard/app-type?new=1");
  await page.getByText(kind, { exact: true }).click();
  await page.getByRole("button", { name: "Add the app" }).click();
  await page.getByText("I don't have a website").click();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();
}

test("the second round's pages, in tabs", async ({ page }) => {
  test.setTimeout(600_000);
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(client.name);
  await page.getByLabel("Email").fill(client.email);
  await page.getByLabel("WhatsApp number").fill("+90 532 000 0134");
  await page.getByLabel("Password", { exact: true }).fill(client.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-up");
  const admin = await page.context().browser()!.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.studioSetupAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname !== "/sign-in");
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();

  // A Studio shop from the Shop template: Delivery & offers in its tabs.
  await page.goto("/studio/new");
  await page.getByRole("radio", { name: "Store", exact: true }).check();
  await page.getByRole("radio", { name: "No website: everything from here" }).click();
  await page.getByLabel("Project name").fill("Round Two Shop");
  await page.getByRole("radio", { name: "Shop", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/\/studio\/project$/, { timeout: 30_000 });
  for (const lang of ["en", "ar"] as const) {
    await language(page, lang);
    for (const width of [1280, 390]) {
      const phone = width === 390 ? "-phone" : "";
      await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
      await page.goto("/studio/project/selling");
      await shoot(page, `${lang}-selling-checkout${phone}`);
      await page.goto("/studio/project/selling?tab=delivery");
      await shoot(page, `${lang}-selling-delivery${phone}`);
      await page.goto("/studio/project/selling?tab=flash");
      await shoot(page, `${lang}-selling-flash${phone}`);
    }
  }
  await language(page, "en");

  // Regular apps in the dark theme: a bookings app's Services, an events app's Events.
  await page.evaluate(() => localStorage.setItem("yallapp-theme", "dark"));
  await regularApp(page, "Bookings");
  await page.goto("/dashboard/services");
  await shoot(page, "dark-services");
  await page.goto("/dashboard/services?tab=rules");
  await shoot(page, "dark-services-rules");
  await regularApp(page, "Events & tickets");
  await page.goto("/dashboard/events?tab=settings");
  await shoot(page, "dark-events-settings");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard/events?tab=settings");
  await shoot(page, "dark-events-settings-phone");
});
