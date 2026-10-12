import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * The main journey: sign up → pending → the super admin activates → the
 * client completes the setup wizard → a build is queued → the plugin uses the
 * license API → the pipeline reads the config and reports back.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = {
  name: "Ada Lovelace",
  email: `ada-${suffix}@academy.test`,
  whatsapp: "+90 544 000 00 00",
  site: `https://ada-${suffix}.academy.test`,
  password: "a-strong-password-123",
};
let licenseKey = "";

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

const pipeline = { authorization: `Bearer ${E2E.pipelineToken}` };

test("a new client signs up and waits for activation", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your full name.")).toBeVisible();

  await page.getByLabel("Full name").fill(client.name);
  await page.getByLabel("Email").fill(client.email);
  await page.getByLabel("WhatsApp number").fill(client.whatsapp);
  await page.getByLabel("Your WordPress website").fill(client.site);
  await page.getByLabel("Password", { exact: true }).fill(client.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/pending$/);
  await expect(page.getByRole("heading", { name: "Your account is waiting for activation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Message us on WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/905446731942\?text=/);
  await page.getByRole("link", { name: "Check again" }).click();
  await expect(page).toHaveURL(/\/pending$/);

  // Pending clients can't open the dashboard.
  await page.goto("/dashboard/builds");
  await expect(page).toHaveURL(/\/pending$/);
});

test("the super admin activates the client with a Pro plan", async ({ page }) => {
  await signIn(page, E2E.adminEmail, E2E.adminPassword);
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole("link", { name: /^Pending activation/ }).click();
  await page.getByRole("searchbox", { name: "Search clients" }).fill(client.email);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: `Activate ${client.name}` }).click();

  const panel = page.getByRole("complementary");
  await expect(panel.getByRole("heading", { name: `Activate ${client.name}` })).toBeVisible();
  await panel.getByLabel("Plan").selectOption("pro");
  const nextYear = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
  await panel.getByLabel("Active until").fill(nextYear);
  await panel.getByLabel("Payment note").fill("paid via bank transfer");
  await panel.getByRole("button", { name: "Activate & send license" }).click();

  await expect(page.getByRole("status")).toContainText("Activated");
  await expect(page.getByRole("heading", { name: `Manage ${client.name}` })).toBeVisible();
  const key = await page.locator("dd").filter({ hasText: /^YALL-/ }).textContent();
  expect(key).toMatch(/^YALL-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  licenseKey = key!;
});

test("the client completes the setup wizard and the first build is queued", async ({ page }) => {
  await signIn(page, client.email, client.password);
  // Active clients without an app start by choosing the app type.
  await expect(page).toHaveURL(/\/dashboard\/app-type$/);
  await page.goto("/pending");
  await expect(page).toHaveURL(/\/dashboard\/app-type$/);
  await expect(page.getByText("Coming soon")).toHaveCount(2);
  await page.getByRole("button", { name: "Continue with Academy" }).click();

  // Website
  await expect(page.getByRole("heading", { name: "Website" })).toBeVisible();
  await expect(page.getByLabel("Your WordPress website")).toHaveValue(client.site);
  await expect(page.getByText("Not connected yet.")).toBeVisible();
  await page.getByRole("button", { name: "Save & continue" }).click();

  // Branding
  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByText("Enter your app name.")).toBeVisible();
  await page.getByLabel("App name").fill("Ada Academy");
  await page.getByLabel("Name under the app icon").fill("Ada");
  await page.locator("#upload-icon").setInputFiles({ name: "small.png", mimeType: "image/png", buffer: solidPng(512, 512, [14, 13, 36]) });
  await expect(page.getByText("The icon must be 1024 × 1024 pixels.")).toBeVisible();
  await page.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [14, 13, 36]) });
  await expect(page.getByText("Replace file")).toBeVisible();
  await page.getByRole("radio", { name: "Bold" }).check();
  await page.getByLabel("Font").selectOption("Outfit");
  await page.getByRole("button", { name: "Save & continue" }).click();

  // Store listing
  await expect(page.getByRole("heading", { name: "Store listing" })).toBeVisible();
  await page.getByLabel("Android package name").fill("com.Ada.App");
  await page.getByLabel("iOS bundle ID").fill("com.adaacademy.app");
  await page.getByLabel("Store title").fill("Ada Academy");
  await page.getByLabel("Short description").fill("Learn with Ada on your phone.");
  await page.getByLabel("Full description").fill("Ada Academy brings every course, lesson and quiz to your phone, synced with our website.");
  await page.getByLabel("Support email").fill("help@academy.test");
  await page.getByLabel("Privacy policy URL").fill("https://academy.test/privacy");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByText("Use lowercase words separated by dots")).toBeVisible();
  await page.getByLabel("Android package name").fill("com.adaacademy.app");
  await page.getByRole("button", { name: "Save & continue" }).click();

  // Publishing (Pro)
  await expect(page.getByRole("heading", { name: "Publishing" })).toBeVisible();
  const serviceAccount = JSON.stringify({
    type: "service_account",
    client_email: "publisher@ada-academy.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----\n",
  });
  await page.getByLabel("Service account key (JSON)").setInputFiles({ name: "play.json", mimeType: "application/json", buffer: Buffer.from(serviceAccount) });
  await page.getByRole("button", { name: "Save & finish" }).click();

  await expect(page).toHaveURL(/\/dashboard\/builds\?started=1$/);
  await expect(page.getByRole("heading", { name: "Build #1 · App version 1.0.0" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Build #1 · App version 1.0.0" }).locator("xpath=../..")).toContainText("Queued");
  await expect(page.getByText("Available after your first build").first()).toBeVisible();
  // The secret never comes back to the browser.
  await page.goto("/dashboard/setup?step=publishing");
  await expect(page.getByText("publisher@ada-academy.iam.gserviceaccount.com")).toBeVisible();
  expect(await page.content()).not.toContain("BEGIN PRIVATE KEY");
});

test("the pipeline reads the config and the client starts a new build", async ({ page, request }) => {
  expect((await request.get("/api/v1/builds/queue")).status()).toBe(401);
  const queue = await (await request.get("/api/v1/builds/queue", { headers: pipeline })).json();
  const build = queue.builds.find((b: { number: number; version_name: string }) => b.number === 1 && b.version_name === "1.0.0");
  expect(build).toBeTruthy();

  const config = await request.get(`/api/v1/builds/${build.id}/config`, { headers: pipeline });
  expect(config.status()).toBe(200);
  const body = await config.json();
  expect(body).toMatchObject({
    schema_version: 1,
    app_type: "lms",
    app_name: "Ada Academy",
    short_name: "Ada",
    site_url: client.site,
    android_package: "com.adaacademy.app",
    version_name: "1.0.0",
    version_code: 1,
    branding: { template: "bold", font: "Outfit" },
  });
  expect(JSON.stringify(body)).not.toContain("service_account");
  const icon = await request.get(body.branding.icon_url.replace(E2E.baseURL, ""));
  expect(icon.headers()["content-type"]).toBe("image/png");

  const report = await request.post(`/api/v1/builds/${build.id}/status`, {
    headers: pipeline,
    data: {
      status: "ready",
      stages: { android: "done", ios: "done", upload_play: "done" },
      artifacts: [{ kind: "apk", url: "https://files.yallapp.com.tr/test/app.apk" }],
    },
  });
  expect(report.status()).toBe(200);

  await signIn(page, client.email, client.password);
  await page.goto("/dashboard/builds");
  await expect(page.getByRole("link", { name: "Download Android APK" })).toHaveAttribute("href", "https://files.yallapp.com.tr/test/app.apk");
  await expect(page.getByRole("textbox", { name: "App version" })).toHaveValue("1.0.1");
  await page.getByRole("button", { name: "Start new build" }).click();
  await expect(page.getByText("Build #2 is queued.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Build #2 · App version 1.0.1" })).toBeVisible();
  await page.getByRole("button", { name: "Start new build" }).click();
  await expect(page.getByText("A build is already in progress.")).toBeVisible();
});

test("the plugin activates and checks the license through the API", async ({ request, page }) => {
  const site = { license_key: licenseKey, site_url: client.site, plugin_version: "0.1.0", wp_version: "6.8", lms: "tutor" };

  const activate = await request.post("/api/v1/licenses/activate", { data: site });
  expect(activate.status()).toBe(200);
  expect(await activate.json()).toMatchObject({ status: "active", plan: "pro", features: ["push", "offline_downloads", "auto_publish"] });

  const check = await request.post("/api/v1/licenses/check", { data: { ...site, site_url: client.site.replace("https://", "http://www.") + "/" } });
  expect(await check.json()).toMatchObject({ status: "active" });

  const conflict = await request.post("/api/v1/licenses/activate", { data: { ...site, site_url: "https://someone-else.test" } });
  expect(conflict.status()).toBe(409);
  expect(await conflict.json()).toMatchObject({ code: "license_in_use" });

  expect((await request.post("/api/v1/licenses/check", { data: { ...site, license_key: "YALL-2222-3333-4444" } })).status()).toBe(404);
  expect((await request.post("/api/v1/licenses/check", { data: { site_url: client.site } })).status()).toBe(400);

  const update = await request.get(`/api/v1/plugin/update?${new URLSearchParams({ license_key: licenseKey, site_url: client.site, version: "0.1.0" })}`);
  expect(update.status()).toBe(204);

  // The dashboard shows the connected site.
  await signIn(page, client.email, client.password);
  await page.goto("/dashboard/license");
  await expect(page.getByLabel("License key")).toHaveText(licenseKey);
  await expect(page.getByText(new URL(client.site).host)).toBeVisible();

  const release = await request.post("/api/v1/licenses/deactivate", { data: { license_key: licenseKey, site_url: client.site } });
  expect(release.status()).toBe(204);
  expect((await request.post("/api/v1/licenses/activate", { data: { ...site, site_url: "https://someone-else.test" } })).status()).toBe(200);
});
