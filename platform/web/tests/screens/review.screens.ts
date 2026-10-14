import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "../e2e/png";

/**
 * Full-page screenshots of the main client dashboard pages at desktop
 * (1440 px) and phone (390 px) width, to review the dashboard's design. Not
 * part of the test suite and not used on the website. Run it with
 * `npx playwright test --config playwright.screens.config.ts review` after
 * `npm run build`; the files go to `.data/screens/<SCREENS_LABEL>/`.
 */
test.describe.configure({ mode: "serial" });

const OUT = path.resolve(__dirname, "../../.data/screens", process.env.SCREENS_LABEL ?? "latest");
const suffix = Date.now().toString(36);
const client = { name: "Rose Garden", email: `rose-${suffix}@garden.test`, password: "rose-strong-password-1" };
const pipeline = { authorization: `Bearer ${E2E.pipelineToken}` };
const WIDTHS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844 },
];

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

/** Pages wider than a 360-pixel phone (they would scroll sideways). */
const tooWide: string[] = [];

/** Each page at both widths, the whole page; and a check that it fits a 360-pixel phone. */
async function shoot(page: Page, name: string, url: string) {
  for (const size of WIDTHS) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${name}-${size.name}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 360, height: 780 });
  await page.waitForTimeout(200);
  const wide = await page.evaluate(() => {
    if (document.documentElement.scrollWidth <= window.innerWidth) return null;
    // The innermost elements that reach past the screen's right edge.
    const past = [...document.querySelectorAll("body *")].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && !el.querySelector("*"));
    return past
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`)
      .join(" | ");
  });
  if (wide !== null) tooWide.push(`${name}: ${wide}`);
  await page.setViewportSize({ width: 1440, height: 900 });
}

test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

test("dashboard review screenshots", async ({ page, request }) => {
  test.setTimeout(240_000);
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
  const panel = page.getByRole("complementary");
  await panel.getByLabel("Plan").selectOption("pro");
  await panel.getByLabel("Active until").fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(page.getByRole("status")).toContainText("Activated");

  await signIn(page, client.email, client.password);
  await shoot(page, "app-type", "/dashboard/app-type");
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await shoot(page, "setup-website", "/dashboard/setup?step=website");
  await page.getByText("My WordPress site").click();
  await page.getByLabel("Your WordPress website").fill("https://rose-garden.test");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();
  // The overview halfway through the setup.
  await shoot(page, "overview-setup", "/dashboard");

  await page.goto("/dashboard/setup?step=branding");
  await page.getByLabel("App name").fill("Rose Garden");
  await page.getByLabel("Name under the app icon").fill("Rose");
  await page.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [180, 40, 70]) });
  await expect(page.getByText("Replace file").first()).toBeVisible();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await page.getByLabel("Android package name").fill("com.rosegarden.app");
  await page.getByLabel("iOS bundle ID").fill("com.rosegarden.app");
  await page.getByLabel("Store title").fill("Rose Garden");
  await page.getByLabel("Short description").fill("Roses and gifts delivered the same day.");
  await page.getByLabel("Full description").fill("Order roses, plants and gifts from Rose Garden, with delivery to your door.");
  await page.getByLabel("Support email").fill("hello@garden.test");
  await page.getByLabel("Privacy policy URL").fill("https://garden.test/privacy");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Publishing" })).toBeVisible();
  const serviceAccount = JSON.stringify({
    type: "service_account",
    client_email: "publisher@rose-garden.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----\n",
  });
  await page.getByLabel("Service account key (JSON)").setInputFiles({ name: "play.json", mimeType: "application/json", buffer: Buffer.from(serviceAccount) });
  await page.getByRole("button", { name: "Save & finish" }).click();
  await expect(page).toHaveURL(/\/dashboard\/builds/);
  if (await page.getByText("No builds yet.").first().isVisible()) {
    await page.getByRole("button", { name: "Start new build" }).click();
  }
  const queue = await (await request.get("/api/v1/builds/queue", { headers: pipeline })).json();
  const build = queue.builds[queue.builds.length - 1];
  const files = "https://files.example/rose";
  await request.post(`/api/v1/builds/${build.id}/status`, {
    headers: pipeline,
    data: {
      status: "ready",
      stages: { android: "done", ios: "done", upload_play: "done" },
      artifacts: [
        { kind: "apk", url: `${files}/app.apk` },
        { kind: "aab", url: `${files}/app.aab` },
        { kind: "ipa", url: `${files}/app.ipa` },
        { kind: "keystore", url: `${files}/upload-key.zip` },
        { kind: "store_assets", url: `${files}/store-assets.zip` },
      ],
    },
  });

  await shoot(page, "publishing-choice", "/dashboard/publishing");
  const managed = page.getByRole("button", { name: "Publish it for me" });
  if (await managed.isEnabled()) await managed.click();

  await shoot(page, "overview", "/dashboard");
  await shoot(page, "setup-branding", "/dashboard/setup?step=branding");
  await shoot(page, "pages", "/dashboard/pages");
  await shoot(page, "builds", "/dashboard/builds");
  await shoot(page, "publishing", "/dashboard/publishing");
  await shoot(page, "license", "/dashboard/license");
  await shoot(page, "announcements", "/dashboard/announcements");

  // The phone menu, open.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  const menu = page.getByRole("button", { name: "Menu" });
  if (await menu.count()) {
    await menu.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, "menu-phone.png") });
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  // A second app: a shop without a website, waiting for activation.
  await page.goto("/dashboard/app-type?new=1");
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Add the app" }).click();
  await page.getByText("I don't have a website").click();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();
  await shoot(page, "overview-pending", "/dashboard");
  await shoot(page, "catalog", "/dashboard/catalog");
  await shoot(page, "orders", "/dashboard/orders");
  await shoot(page, "notifications", "/dashboard/notifications");
  await shoot(page, "app-sign-in", "/dashboard/app-sign-in");
  expect(tooWide).toEqual([]);
});
