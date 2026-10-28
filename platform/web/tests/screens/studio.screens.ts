import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * Takes the Yallapp Studio screenshots shown on yallapp.com.tr
 * (public/screens/studio-*.png): a café makes a Studio project from the menu
 * template, opens it in the editor, then makes a delivery company's project.
 * Not part of the test suite; run it with
 * `npx playwright test --config playwright.screens.config.ts studio`.
 */
test.describe.configure({ mode: "serial" });

const OUT = path.resolve(__dirname, "../../public/screens");
const suffix = Date.now().toString(36);
const client = { name: "Defne Café", email: `defne-${suffix}@cafe.test`, password: "defne-strong-password-1" };

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

async function shoot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
}

/** Picks the template wherever the new project's steps show it, and goes on until the project opens. */
async function nextWith(page: Page, template: string) {
  for (let i = 0; i < 3 && !/\/studio\/project$/.test(new URL(page.url()).pathname); i++) {
    const radio = page.getByRole("radio", { name: template, exact: true });
    if (await radio.isVisible()) await radio.click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.waitForTimeout(800);
  }
  await expect(page).toHaveURL(/\/studio\/project$/);
}

test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });

test("studio screenshots", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(client.name);
  await page.getByLabel("Email").fill(client.email);
  await page.getByLabel("WhatsApp number").fill("+90 544 000 00 78");
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

  // A café's project from the menu template.
  await signIn(page, client.email, client.password);
  await page.goto("/studio/new");
  await page.getByRole("radio", { name: "Restaurant & café" }).check();
  await page.getByRole("radio", { name: "No website: everything from here" }).click();
  await page.getByLabel("Project name").fill(client.name);
  await nextWith(page, "Menu");
  await shoot(page, "studio-project");

  await page.goto("/studio/editor");
  await expect(page.getByRole("link", { name: "Yallapp Studio" })).toBeVisible();
  await shoot(page, "studio-editor");

  // A delivery company's project beside it.
  await page.goto("/studio/new");
  await page.getByRole("radio", { name: "Delivery and couriers company" }).check();
  await page.getByLabel("Project name").fill("Nile Express");
  await nextWith(page, "Delivery");
  await page.goto("/studio");
  await expect(page.getByRole("heading", { level: 1, name: "Your projects in Studio" })).toBeVisible();
  await shoot(page, "studio-home");
});
