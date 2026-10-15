import { createHmac } from "node:crypto";
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
  await page.getByLabel("Your website (optional)").fill(client.site);
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
  await expect(page.getByRole("radio", { name: "Bookings" })).toBeAttached();
  await expect(page.getByRole("radio", { name: "Academy" })).toBeChecked();
  // 32 The dashboard stays out of search engines and has no canonical address.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Continue" }).click();

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
  // 33 The template is a choice under the designs; this client keeps its pages.
  await expect(page.getByRole("radio", { name: /^Keep my pages/ })).toBeChecked();
  await page.getByLabel("Template").selectOption("bold");
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
  await expect(page.getByRole("heading", { name: "Build #1 · App version 1.0.0" }).locator("xpath=../..")).toContainText("Waiting to start");
  await expect(page.getByText("Available after your first successful build").first()).toBeVisible();
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
  // The button signs the link when it's clicked, so it never expires on an open page.
  const button = (await page.getByRole("link", { name: "Download Android APK" }).getAttribute("href")) ?? "";
  expect(button).toBe(`/api/dashboard/builds/${build.id}/files/apk`);
  const download = await page.request.get(button, { maxRedirects: 0 });
  expect(download.status()).toBe(303);
  // Links to files.yallapp.com.tr are signed for 15 minutes: hex HMAC-SHA256 of "<path>?expires=<expires>".
  const href = download.headers()["location"] ?? "";
  const match = /^https:\/\/files\.yallapp\.com\.tr\/test\/app\.apk\?expires=(\d+)&sig=([0-9a-f]{64})$/.exec(href);
  expect(match, href).toBeTruthy();
  const expires = Number(match![1]);
  expect(Math.abs(expires - (Math.floor(Date.now() / 1000) + 15 * 60))).toBeLessThan(120);
  expect(match![2]).toBe(createHmac("sha256", E2E.filesSigningSecret).update(`/test/app.apk?expires=${expires}`).digest("hex"));
  expect((await request.get(button, { maxRedirects: 0 })).headers()["location"]).toMatch(/\/sign-in$/);
  await expect(page.getByRole("button", { name: "Download Android upload key (keep it safe)" })).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "App version" })).toHaveValue("1.0.1");
  await page.getByRole("button", { name: "Start new build" }).click();
  await expect(page.getByText("Build #2 is queued.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Build #2 · App version 1.0.1" })).toBeVisible();
  // One build at a time: the button waits for the running build.
  await expect(page.getByRole("button", { name: "Start new build" })).toBeDisabled();
  await expect(page.getByText("A build is in progress.")).toBeVisible();
});

test("the pipeline gets the store keys and saves the signing keys of a running build", async ({ request }) => {
  const queue = await (await request.get("/api/v1/builds/queue", { headers: pipeline })).json();
  const build = queue.builds.find((b: { version_name: string }) => b.version_name === "1.0.1");
  expect(build).toBeTruthy();

  expect((await request.get(`/api/v1/builds/${build.id}/secrets`)).status()).toBe(401);
  const queued = await request.get(`/api/v1/builds/${build.id}/secrets`, { headers: pipeline });
  expect(queued.status()).toBe(409);
  expect(await queued.json()).toMatchObject({ code: "build_not_building" });

  await request.post(`/api/v1/builds/${build.id}/status`, { headers: pipeline, data: { status: "building", stages: { android: "running" } } });
  const secrets = await (await request.get(`/api/v1/builds/${build.id}/secrets`, { headers: pipeline })).json();
  expect(secrets).toMatchObject({ android_upload_key: null, ios_distribution: null, app_store_connect: null });
  expect(JSON.parse(secrets.google_play.service_account_json)).toMatchObject({ client_email: "publisher@ada-academy.iam.gserviceaccount.com" });

  const uploadKey = { keystore_base64: "MIIKBgIBAzCCCb8GCSqGSIb3", store_password: "e2e-store-password-0123", key_alias: "upload", key_password: "e2e-key-password-01234" };
  const save = (key: typeof uploadKey) => request.put(`/api/v1/builds/${build.id}/signing`, { headers: pipeline, data: { android_upload_key: key } });
  expect((await save(uploadKey)).status()).toBe(204);
  const again = await save({ ...uploadKey, key_alias: "replacement" });
  expect(again.status()).toBe(409);
  expect(await again.json()).toMatchObject({ code: "key_exists" });
  expect((await (await request.get(`/api/v1/builds/${build.id}/secrets`, { headers: pipeline })).json()).android_upload_key).toEqual(uploadKey);

  await request.post(`/api/v1/builds/${build.id}/status`, { headers: pipeline, data: { status: "failed", message: "Test run" } });
});

test("the plugin activates and checks the license through the API", async ({ request, page }) => {
  const site = { license_key: licenseKey, site_url: client.site, plugin_version: "0.1.0", wp_version: "6.8", lms: "tutor" };

  const activate = await request.post("/api/v1/licenses/activate", { data: site });
  expect(activate.status()).toBe(200);
  expect(await activate.json()).toMatchObject({
    status: "active",
    plan: "pro",
    features: ["ios", "push", "offline_downloads", "page_editor", "card_payments", "auto_rebuild", "auto_publish"],
    limits: { app_users: null, languages: null, sources: null },
  });

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
  // 30 A plugin before 30 doesn't say what else the site runs: nothing is shown.
  await expect(page.getByText("Your website runs")).toHaveCount(0);

  // 30 The plugin says what the site runs: Tutor LMS, no shop, no booking plugin. An Academy app fits it.
  expect((await request.post("/api/v1/licenses/check", { data: { ...site, plugin_version: "0.5.0", store: "", bookings: "" } })).status()).toBe(200);
  expect((await request.post("/api/v1/licenses/check", { data: { ...site, store: 1 } })).status()).toBe(400);
  await page.goto("/dashboard/setup?step=website");
  const website = page.getByRole("region", { name: "Website" });
  await expect(website).toContainText("Your website runs: Tutor LMS");
  await expect(website.getByRole("alert")).toHaveCount(0);

  // A Store app on the same site shows nothing it can sell: the dashboard says so and names the type that fits.
  await page.goto("/dashboard/app-type");
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Website" })).toBeVisible();
  await expect(website).toContainText("Your website runs: Tutor LMS");
  const warning = website.getByRole("alert");
  await expect(warning).toContainText("Your website has no shop plugin the app can read. Install WooCommerce, or change the app type.");
  await expect(warning).toContainText("Your website runs Tutor LMS: an Academy app shows its courses and lessons.");
  await page.goto("/dashboard");
  await expect(page.getByRole("alert").filter({ hasText: "no shop plugin" })).toBeVisible();
  await expect(page.getByText("Your website runs: Tutor LMS")).toBeVisible();
  await page.getByRole("alert").filter({ hasText: "no shop plugin" }).getByRole("link", { name: "Change the app type" }).click();
  await expect(page).toHaveURL(/\/dashboard\/app-type$/);
  await page.getByText("Academy", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Website" })).toBeVisible();
  await expect(website).toContainText("Your website runs: Tutor LMS");
  await expect(website.getByRole("alert")).toHaveCount(0);

  const release = await request.post("/api/v1/licenses/deactivate", { data: { license_key: licenseKey, site_url: client.site } });
  expect(release.status()).toBe(204);
  expect((await request.post("/api/v1/licenses/activate", { data: { ...site, site_url: "https://someone-else.test" } })).status()).toBe(200);
});

test("a published plugin release reaches the site through the update API", async ({ page, request }) => {
  await signIn(page, E2E.adminEmail, E2E.adminPassword);
  await page.goto("/admin/releases");
  const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64)]);
  await page.getByLabel("Plugin .zip").setInputFiles({ name: "yallapp.zip", mimeType: "application/zip", buffer: zip });
  await page.getByLabel("Version", { exact: true }).fill("0.2.0");
  await page.getByLabel("Tested up to").fill("6.8");
  await page.getByLabel("Changelog").fill("- Faster lessons\n- Fixes");
  await page.getByLabel(/Publish now/).check();
  await page.getByRole("button", { name: "Upload release" }).click();
  await expect(page.getByText("Version 0.2.0 uploaded and published.")).toBeVisible();

  // The license is bound to someone-else.test after the previous test.
  const query = (version: string) =>
    `/api/v1/plugin/update?${new URLSearchParams({ license_key: licenseKey, site_url: "https://someone-else.test", version })}`;
  const update = await request.get(query("0.1.0"));
  expect(update.status()).toBe(200);
  const body = await update.json();
  expect(body).toMatchObject({
    version: "0.2.0",
    requires: "6.0",
    requires_php: "7.4",
    tested: "6.8",
    changelog_html: "<ul><li>Faster lessons</li><li>Fixes</li></ul>",
  });
  const path = body.download_url.replace(E2E.baseURL, "");
  const download = await request.get(path);
  expect(download.status()).toBe(200);
  expect(download.headers()["content-type"]).toBe("application/zip");
  expect((await request.get(path.replace(/sig=[^&]+/, "sig=forged"))).status()).toBe(403);
  expect((await request.get(query("0.2.0"))).status()).toBe(204);
});
