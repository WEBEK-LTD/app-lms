import { generateKeyPairSync } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * Publishing yourself (the Growth plan, the Starter of before Phase 13): the
 * App Store Connect key is optional in the publishing step (it only signs the
 * iOS app), the Google Play key isn't offered, and the pipeline still receives
 * the key.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = {
  name: "Grace Hopper",
  email: `grace-${suffix}@academy.test`,
  site: `https://grace-${suffix}.academy.test`,
  password: "another-strong-password-1",
};
const pipeline = { authorization: `Bearer ${E2E.pipelineToken}` };
const googleServices = (packageName: string) =>
  JSON.stringify({
    project_info: { project_number: "123456789012", project_id: "grace-academy" },
    client: [{ client_info: { mobilesdk_app_id: "1:123456789012:android:abc", android_client_info: { package_name: packageName } }, api_key: [{ current_key: "AIzaSyTest" }] }],
  });
const serviceInfo = (bundleId: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>API_KEY</key><string>AIzaSyTest</string><key>GCM_SENDER_ID</key><string>123456789012</string><key>BUNDLE_ID</key><string>${bundleId}</string><key>PROJECT_ID</key><string>grace-academy</string><key>GOOGLE_APP_ID</key><string>1:123456789012:ios:abc</string></dict></plist>`;
const p8 = String(generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({ type: "pkcs8", format: "pem" }));

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

test("a Growth client signs up and is activated", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(client.name);
  await page.getByLabel("Email").fill(client.email);
  await page.getByLabel("WhatsApp number").fill("+90 544 000 00 01");
  await page.getByLabel("Your website (optional)").fill(client.site);
  await page.getByLabel("Password", { exact: true }).fill(client.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pending$/);

  await page.context().clearCookies();
  await signIn(page, E2E.adminEmail, E2E.adminPassword);
  await page.goto("/admin/clients");
  await page.getByRole("searchbox", { name: "Search clients" }).fill(client.email);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: `Activate ${client.name}` }).click();
  const panel = page.getByRole("complementary");
  await panel.getByLabel("Plan").selectOption("growth");
  await panel.getByLabel("Active until").fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(page.getByRole("status")).toContainText("Activated");
});

test("the App Store Connect key is optional on Growth and reaches the pipeline", async ({ page, request }) => {
  await signIn(page, client.email, client.password);
  // This client builds a Store app.
  await page.getByText("Store", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "Store" })).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();

  // Asking our team to set up WordPress keeps the step open until the site is ready.
  await page.getByRole("radio", { name: /I don't have WordPress/ }).check();
  await page.getByLabel("Anything we should know? (optional)").fill("Our shop runs on Shopify today.");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByText("Thanks! Our team will message you on WhatsApp")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("radio", { name: /I don't have WordPress/ })).toBeChecked();
  await expect(page.getByText(/You asked us on/)).toBeVisible();

  // Their WordPress site is ready.
  await page.getByRole("radio", { name: /My WordPress site/ }).check();
  await page.getByRole("button", { name: "Save & continue" }).click();

  await page.getByLabel("App name").fill("Grace Academy");
  await page.getByLabel("Name under the app icon").fill("Grace");
  await page.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [14, 13, 36]) });
  await expect(page.getByText("Replace file")).toBeVisible();
  await page.getByRole("button", { name: "Save & continue" }).click();

  await page.getByLabel("Android package name").fill("com.graceacademy.app");
  await page.getByLabel("iOS bundle ID").fill("com.graceacademy.app");
  await page.getByLabel("Store title").fill("Grace Academy");
  await page.getByLabel("Short description").fill("Learn with Grace on your phone.");
  await page.getByLabel("Full description").fill("Grace Academy brings every course, lesson and quiz to your phone, synced with our website.");
  await page.getByLabel("Support email").fill("help@academy.test");
  await page.getByLabel("Privacy policy URL").fill("https://academy.test/privacy");

  // Screenshots: checked on upload, and Google Play needs at least two.
  const phoneShot = (name: string) => ({ name, mimeType: "image/png", buffer: solidPng(1080, 1920, [244, 239, 230]) });
  await page.locator("#upload-ios_screenshot").setInputFiles(phoneShot("wrong-size.png"));
  await expect(page.getByText("wrong-size.png: iPhone screenshots must be 1320 × 2868")).toBeVisible();
  await page.locator("#upload-play_screenshot").setInputFiles(phoneShot("home.png"));
  await expect(page.getByRole("img", { name: "Screenshot 1" })).toHaveCount(1);
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByText("Google Play needs at least 2 screenshots.")).toBeVisible();
  await page.locator("#upload-play_screenshot").setInputFiles([phoneShot("course.png"), phoneShot("lesson.png")]);
  await expect(page.getByRole("img", { name: "Screenshot 3" })).toBeVisible();
  await page.getByRole("button", { name: "Remove screenshot 1" }).first().click();
  await page.locator("#upload-ios_screenshot").setInputFiles({ name: "iphone.png", mimeType: "image/png", buffer: solidPng(1290, 2796, [14, 13, 36]) });
  await expect(page.getByRole("list", { name: "iPhone screenshots: 1 of 10" })).toBeVisible();
  await page.getByRole("button", { name: "Save & continue" }).click();

  // Publishing (Growth: they publish themselves, iOS included)
  await expect(page.getByRole("heading", { name: "Publishing" })).toBeVisible();
  await expect(page.getByRole("group", { name: "App Store Connect API key (optional)" })).toBeVisible();
  await expect(page.getByText("Needed to sign your iOS app. Without it you get the Android app only.")).toBeVisible();
  await expect(page.getByText("Service account key (JSON)")).toHaveCount(0);

  // Same validation as on Pro.
  await page.getByLabel("Key ID").fill("short");
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page.getByText("The Key ID is 10 letters and numbers.")).toBeVisible();

  await page.getByLabel("Issuer ID").fill("69a6de7e-1234-4bcd-8ef0-123456789abc");
  await page.getByLabel("Key ID").fill("2X9R4HXF34");
  await page.getByLabel("Private key (.p8)").setInputFiles({ name: "AuthKey_2X9R4HXF34.p8", mimeType: "application/octet-stream", buffer: Buffer.from(p8) });

  // Firebase files must match the package name and bundle ID.
  await page.getByLabel("google-services.json (Android)").setInputFiles({ name: "google-services.json", mimeType: "application/json", buffer: Buffer.from(googleServices("com.other.app")) });
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page.getByText("This file has no Android app for com.graceacademy.app.")).toBeVisible();
  await page.getByLabel("Issuer ID").fill("69a6de7e-1234-4bcd-8ef0-123456789abc");
  await page.getByLabel("Key ID").fill("2X9R4HXF34");
  await page.getByLabel("Private key (.p8)").setInputFiles({ name: "AuthKey_2X9R4HXF34.p8", mimeType: "application/octet-stream", buffer: Buffer.from(p8) });
  await page.getByLabel("google-services.json (Android)").setInputFiles({ name: "google-services.json", mimeType: "application/json", buffer: Buffer.from(googleServices("com.graceacademy.app")) });
  await page.getByLabel("GoogleService-Info.plist (iOS)").setInputFiles({ name: "GoogleService-Info.plist", mimeType: "application/xml", buffer: Buffer.from(serviceInfo("com.graceacademy.app")) });
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page).toHaveURL(/\/dashboard\/builds\?started=1$/);

  await page.goto("/dashboard/setup?step=publishing");
  await expect(page.getByText("Key ID 2X9R4HXF34")).toBeVisible();
  await expect(page.getByText("google-services.json saved")).toBeVisible();
  await expect(page.getByText("GoogleService-Info.plist saved")).toBeVisible();
  expect(await page.content()).not.toContain("BEGIN PRIVATE KEY");

  const queue = await (await request.get("/api/v1/builds/queue", { headers: pipeline })).json();
  const build = queue.builds.find((b: { version_name: string; auto_publish: boolean }) => b.version_name === "1.0.0" && !b.auto_publish);
  expect(build).toBeTruthy();
  await request.post(`/api/v1/builds/${build.id}/status`, { headers: pipeline, data: { status: "building" } });
  const secrets = await (await request.get(`/api/v1/builds/${build.id}/secrets`, { headers: pipeline })).json();
  expect(secrets).toEqual({
    android_upload_key: null,
    ios_distribution: null,
    google_play: null,
    app_store_connect: { issuer_id: "69a6de7e-1234-4bcd-8ef0-123456789abc", key_id: "2X9R4HXF34", private_key: p8.trim() },
  });

  // The pipeline gets the Firebase files in the config, and the screenshots for the store assets.
  const config = await (await request.get(`/api/v1/builds/${build.id}/config`, { headers: pipeline })).json();
  expect(config.app_type).toBe("store");
  expect(Object.keys(config.firebase).sort()).toEqual(["android_config_url", "ios_config_url"]);
  const firebaseFile = await request.get(config.firebase.android_config_url.replace(/^https?:\/\/[^/]+/, ""));
  expect(JSON.parse(await firebaseFile.text()).project_info.project_id).toBe("grace-academy");
  const listing = await (await request.get(`/api/v1/builds/${build.id}/store`, { headers: pipeline })).json();
  expect(listing).toMatchObject({ store_title: "Grace Academy", support_email: "help@academy.test" });
  expect(listing.phone_screenshots).toHaveLength(2);
  expect(listing.iphone_screenshots).toHaveLength(1);

  await request.post(`/api/v1/builds/${build.id}/status`, {
    headers: pipeline,
    data: {
      status: "ready",
      artifacts: [
        { kind: "apk", url: "https://files.yallapp.com.tr/grace/app.apk" },
        { kind: "keystore", url: "https://files.yallapp.com.tr/grace/upload-key.zip" },
      ],
    },
  });
  await page.goto("/dashboard/builds");
  const keyLink = page.getByRole("link", { name: "Download Android upload key (keep it safe)" });
  await expect(keyLink).toHaveAttribute("href", `/api/dashboard/builds/${build.id}/files/keystore`);
  const download = await page.request.get((await keyLink.getAttribute("href"))!, { maxRedirects: 0 });
  expect(download.headers()["location"]).toMatch(/^https:\/\/files\.yallapp\.com\.tr\/grace\/upload-key\.zip\?expires=\d+&sig=[0-9a-f]{64}$/);
});

test("the super admin sees signed file links in the build queue", async ({ page }) => {
  await signIn(page, E2E.adminEmail, E2E.adminPassword);
  await page.goto("/admin/builds?status=ready");
  const row = page.getByRole("row").filter({ hasText: client.name });
  const apk = (await row.getByRole("link", { name: "Android APK" }).getAttribute("href"))!;
  expect(apk).toMatch(/^\/api\/admin\/builds\/[0-9a-f-]{36}\/files\/apk$/);
  const download = await page.request.get(apk, { maxRedirects: 0 });
  expect(download.headers()["location"]).toMatch(/^https:\/\/files\.yallapp\.com\.tr\/grace\/app\.apk\?expires=\d+&sig=[0-9a-f]{64}$/);
  await expect(row.getByRole("link", { name: "Android upload key (keep it safe)" })).toBeVisible();
});
