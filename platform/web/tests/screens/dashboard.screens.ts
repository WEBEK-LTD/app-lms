import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "../e2e/png";

/**
 * Takes the dashboard screenshots shown on yallapp.com.tr
 * (public/screens/dashboard-*.png): a shop that signed up without a website
 * goes through the setup, and its first build is reported ready. Not part of the test
 * suite; run it with `npx playwright test --config playwright.screens.config.ts`.
 */
test.describe.configure({ mode: "serial" });

const OUT = path.resolve(__dirname, "../../public/screens");
const suffix = Date.now().toString(36);
const client = { name: "Tulip Flowers", email: `tulip-${suffix}@flowers.test`, password: "tulip-strong-password-1" };
const pipeline = { authorization: `Bearer ${E2E.pipelineToken}` };

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

async function shoot(page: Page, name: string) {
  // Let fonts, images and the editor's preview settle.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
}

test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });

test("dashboard screenshots", async ({ page, request }) => {
  test.setTimeout(180_000);
  // A shop signs up without a website and our team activates it on the Pro plan.
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(client.name);
  await page.getByLabel("Email").fill(client.email);
  await page.getByLabel("WhatsApp number").fill("+90 544 000 00 77");
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

  // The setup: Store, no website, branding, store listing, publishing.
  await signIn(page, client.email, client.password);
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  // A WordPress shop: apps on the hosted API can't build against this local server's http address.
  await page.getByText("My WordPress site").click();
  await page.getByLabel("Your WordPress website").fill("https://tulip-flowers.test");
  await page.getByRole("button", { name: "Save & continue" }).click();

  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();
  await page.getByLabel("App name").fill("Tulip Flowers");
  await page.getByLabel("Name under the app icon").fill("Tulip");
  await page.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [29, 107, 72]) });
  await expect(page.getByText("Replace file").first()).toBeVisible();
  await page.getByLabel("Primary color").fill("#1d6b48");
  await page.getByRole("radio", { name: "Bold" }).check();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Store listing" })).toBeVisible();

  // The branding step, filled in, with its live preview.
  await page.goto("/dashboard/setup?step=branding");
  await expect(page.getByLabel("App name")).toHaveValue("Tulip Flowers");
  await shoot(page, "dashboard-setup");

  await page.goto("/dashboard/setup?step=listing");
  await page.getByLabel("Android package name").fill("com.tulipflowers.app");
  await page.getByLabel("iOS bundle ID").fill("com.tulipflowers.app");
  await page.getByLabel("Store title").fill("Tulip Flowers");
  await page.getByLabel("Short description").fill("Fresh flowers delivered the same day.");
  await page.getByLabel("Full description").fill("Order bouquets, plants and gifts from Tulip Flowers, with delivery to your door.");
  await page.getByLabel("Support email").fill("hello@flowers.test");
  await page.getByLabel("Privacy policy URL").fill("https://flowers.test/privacy");
  await page.getByRole("button", { name: "Save & continue" }).click();

  await expect(page.getByRole("heading", { name: "Publishing" })).toBeVisible();
  const serviceAccount = JSON.stringify({
    type: "service_account",
    client_email: "publisher@tulip-flowers.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----\n",
  });
  await page.getByLabel("Service account key (JSON)").setInputFiles({ name: "play.json", mimeType: "application/json", buffer: Buffer.from(serviceAccount) });
  await page.getByRole("button", { name: "Save & finish" }).click();
  await expect(page).toHaveURL(/\/dashboard\/builds/);

  // Start the first build if finishing didn't (a shop without a website starts it here), then the pipeline reports it ready.
  if (await page.getByText("No builds yet.").isVisible()) {
    await page.getByRole("button", { name: "Start new build" }).click();
    await expect(page.getByText(/Build #1 is queued/)).toBeVisible();
  }
  const queue = await (await request.get("/api/v1/builds/queue", { headers: pipeline })).json();
  const build = queue.builds[queue.builds.length - 1];
  const files = "https://files.example/tulip";
  const report = await request.post(`/api/v1/builds/${build.id}/status`, {
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
  expect(report.ok()).toBe(true);
  await page.goto("/dashboard/builds");
  await expect(page.getByRole("heading", { name: /Build #1/ })).toBeVisible();
  await shoot(page, "dashboard-builds");

  // The pages and look editor.
  await page.goto("/dashboard/pages");
  await expect(page.getByRole("heading", { name: "Pages & look" })).toBeVisible();
  await shoot(page, "dashboard-pages");
});
