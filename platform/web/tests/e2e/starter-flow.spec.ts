import { generateKeyPairSync } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * Publishing with your own keys on the Growth plan (the Starter of before
 * Phase 13). 138 Every plan has "We publish for you": the Publishing step
 * asks who publishes, with the Google Play key and the App Store Connect key,
 * and the pipeline receives the key and uploads.
 */
test.describe.configure({ mode: "serial" });
// Its own address: sign-ins from the shared one reach the per-IP limit when every spec runs in one 15-minute window.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.181" } });

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
  await expect(page).toHaveURL(/\/start$/);

  await page.context().clearCookies();
  await signIn(page, E2E.starterAdminEmail, E2E.adminPassword);
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

test("signed in, the website's header says Dashboard instead of Sign in and Get started", async ({ page }) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Get started" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();

  await signIn(page, client.email, client.password);
  await page.goto("/pricing");
  await expect(header.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
  await expect(header.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await expect(header.getByRole("link", { name: "Get started" })).toHaveCount(0);
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Your dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Choose Growth" })).toHaveAttribute("href", "/dashboard/license#change-plan");

  // The session cookie stays HttpOnly; only the "signed in" note is readable.
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "yallapp_session")?.httpOnly).toBe(true);
  expect(cookies.find((c) => c.name === "yallapp_signed_in")).toMatchObject({ value: "1", httpOnly: false });

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/");
  await expect(header.getByRole("link", { name: "Get started" })).toBeVisible();
  expect((await page.context().cookies()).some((c) => c.name === "yallapp_signed_in")).toBe(false);
});

test("62 a session that ended on the server stops the header saying Dashboard", async ({ page }) => {
  const header = page.getByRole("banner");
  await signIn(page, client.email, client.password);
  // The dashboard has loaded with the session: changing its cookie before then would end the sign-in's own
  // navigation on /api/session/ended, which removes the readable cookie the next step expects.
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  // The session ends on the server (signed out elsewhere, a new password): its cookie no longer opens anything.
  const context = page.context();
  const session = (await context.cookies()).find((c) => c.name === "yallapp_session")!;
  await context.addCookies([{ ...session, value: "ended" }]);
  await page.goto("/pricing");
  await expect(header.getByRole("link", { name: "Dashboard" })).toBeVisible();
  // The dashboard sends them to sign in and the leftover cookies go.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in$/);
  const left = (await context.cookies()).map((c) => c.name);
  expect(left).not.toContain("yallapp_signed_in");
  expect(left).not.toContain("yallapp_session");
  await page.goto("/");
  await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();

  // Only the readable cookie left (opening the sign-in page straight away): the page removes it.
  const url = new URL(page.url());
  await context.addCookies([{ name: "yallapp_signed_in", value: "1", domain: url.hostname, path: "/" }]);
  await page.goto("/pricing");
  await expect(header.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await page.goto("/ar/sign-in");
  await expect.poll(async () => (await context.cookies()).some((c) => c.name === "yallapp_signed_in")).toBe(false);
  await page.goto("/pricing");
  await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("138 Growth publishes too: the store keys reach the pipeline, and its builds upload", async ({ page, request }) => {
  await signIn(page, client.email, client.password);
  // 121 Without an app yet: the choice of editor or Studio first.
  await page.getByRole("link", { name: "Start from an empty app" }).click();
  // This client builds a Store app.
  await page.getByText("Store", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "Store" })).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();

  // Asking our team to set up WordPress keeps the step open until the site is ready.
  await page.getByRole("radio", { name: /Set up WordPress for me/ }).check();
  await page.getByLabel("Anything we should know? (optional)").fill("Our shop runs on Shopify today.");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByText("Thanks! Our team will message you on WhatsApp")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("radio", { name: /Set up WordPress for me/ })).toBeChecked();
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

  // Publishing (138 Growth publishes for them too: "Publish it for me", or their own keys)
  await expect(page.getByRole("heading", { name: "Publishing" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Publish it for me/ })).toBeVisible();
  await expect(page.getByRole("radio", { name: /I'll publish it myself/ })).toBeChecked();
  await expect(page.getByRole("group", { name: "App Store Connect API key", exact: true })).toBeVisible();
  await expect(page.getByText("Service account key (JSON)")).toBeVisible();
  // No upgrade to be published for.
  await expect(page.locator("[data-upgrade-hint]").filter({ hasText: "Publish it for me" })).toHaveCount(0);

  // Same validation as on Pro.
  await page.getByLabel("Key ID").fill("short");
  await page.getByRole("button", { name: "Save & finish" }).click();
  await expect(page.getByText("The Key ID is 10 letters and numbers.")).toBeVisible();

  await page.getByLabel("Issuer ID").fill("69a6de7e-1234-4bcd-8ef0-123456789abc");
  await page.getByLabel("Key ID").fill("2X9R4HXF34");
  await page.getByLabel("Private key (.p8)").setInputFiles({ name: "AuthKey_2X9R4HXF34.p8", mimeType: "application/octet-stream", buffer: Buffer.from(p8) });

  // Firebase files must match the package name and bundle ID.
  await page.getByLabel("google-services.json (Android)").setInputFiles({ name: "google-services.json", mimeType: "application/json", buffer: Buffer.from(googleServices("com.other.app")) });
  await page.getByRole("button", { name: "Save & finish" }).click();
  await expect(page.getByText("This file has no Android app for com.graceacademy.app.")).toBeVisible();
  await page.getByLabel("Issuer ID").fill("69a6de7e-1234-4bcd-8ef0-123456789abc");
  await page.getByLabel("Key ID").fill("2X9R4HXF34");
  await page.getByLabel("Private key (.p8)").setInputFiles({ name: "AuthKey_2X9R4HXF34.p8", mimeType: "application/octet-stream", buffer: Buffer.from(p8) });
  await page.getByLabel("google-services.json (Android)").setInputFiles({ name: "google-services.json", mimeType: "application/json", buffer: Buffer.from(googleServices("com.graceacademy.app")) });
  await page.getByLabel("GoogleService-Info.plist (iOS)").setInputFiles({ name: "GoogleService-Info.plist", mimeType: "application/xml", buffer: Buffer.from(serviceInfo("com.graceacademy.app")) });
  await page.getByRole("button", { name: "Save & finish" }).click();
  await expect(page).toHaveURL(/\/dashboard\/builds\?started=1$/);

  await page.goto("/dashboard/setup?step=publishing");
  await expect(page.getByText("Key ID 2X9R4HXF34")).toBeVisible();
  await expect(page.getByText("google-services.json saved")).toBeVisible();
  await expect(page.getByText("GoogleService-Info.plist saved")).toBeVisible();
  expect(await page.content()).not.toContain("BEGIN PRIVATE KEY");

  const appId = await page.getByLabel("Current app").inputValue();
  const queue = await (await request.get("/api/v1/builds/queue?limit=100", { headers: pipeline })).json();
  // 138 Every plan's builds upload, to Google Play's production for everyone, and go to App Review.
  const build = queue.builds.find((b: { app_id: string; version_name: string; auto_publish: boolean; stages: Record<string, string> }) => b.app_id === appId && b.version_name === "1.0.0");
  expect(build).toMatchObject({ auto_publish: true, stages: { app_review: "pending" } });
  expect(build.release).toEqual({ android_rollout: 1, ios_phased: false });
  expect(build).toBeTruthy();
  await request.post(`/api/v1/builds/${build.id}/status`, { headers: pipeline, data: { status: "building" } });
  const secrets = await (await request.get(`/api/v1/builds/${build.id}/secrets`, { headers: pipeline })).json();
  expect(secrets).toEqual({
    android_upload_key: null,
    ios_distribution: null,
    google_play: null,
    app_store_connect: { issuer_id: "69a6de7e-1234-4bcd-8ef0-123456789abc", key_id: "2X9R4HXF34", private_key: p8.trim() },
    // 35, 36, 42 The app saved no keys for the other Android stores; no review sign-in yet.
    galaxy_store: null,
    huawei_appgallery: null,
    xiaomi_getapps: null,
    app_review: null,
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
  await signIn(page, E2E.starterAdminEmail, E2E.adminPassword);
  await page.goto("/admin/builds?status=ready");
  const row = page.getByRole("row").filter({ hasText: client.name });
  const apk = (await row.getByRole("link", { name: "Android APK" }).getAttribute("href"))!;
  expect(apk).toMatch(/^\/api\/admin\/builds\/[0-9a-f-]{36}\/files\/apk$/);
  const download = await page.request.get(apk, { maxRedirects: 0 });
  expect(download.headers()["location"]).toMatch(/^https:\/\/files\.yallapp\.com\.tr\/grace\/app\.apk\?expires=\d+&sig=[0-9a-f]{64}$/);
  await expect(row.getByRole("link", { name: "Android upload key (keep it safe)" })).toBeVisible();
});
