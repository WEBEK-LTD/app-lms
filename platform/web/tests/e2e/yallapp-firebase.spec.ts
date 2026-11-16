import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakeGoogle, type FakeGoogleServer } from "./fake-google";
import { solidPng } from "./png";

/**
 * 136 Yallapp sets up notifications: the platform as its own OpenID Connect
 * issuer; Admin › Settings › Yallapp Firebase projects (a project added by
 * hand, the Check that signs in to a fake Google without a key, where new
 * projects are made, and the next one made by the platform); a new store app
 * without a website starts in Yallapp's Firebase, is registered when its
 * package name and bundle ID are saved, and its build gets Yallapp's files;
 * "Use my own Firebase" brings today's fields back, and the Notifications
 * page has no key to upload in Yallapp's mode. At the end the pool is closed
 * again, so the specs after this one make their apps as before.
 *
 * YALLAPP_SHOTS_DIR, when set, gets screenshots of the choice and the Admin
 * page in English and Arabic, light and dark.
 */
test.describe.configure({ mode: "serial" });
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.136" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Zahra Flowers", email: `zahra-${suffix}@flowers.test`, password: "zahra-strong-password-1" };
const PARENT = "organizations/555000111222";
const pkg = `com.zahra${suffix}.app`;
const pipeline = { authorization: `Bearer ${E2E.pipelineToken}` };
const shots = process.env.YALLAPP_SHOTS_DIR ? path.resolve(process.env.YALLAPP_SHOTS_DIR) : null;

let fake: FakeGoogleServer;
let admin: Page;
let own: Page;

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

async function freshPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ extraHTTPHeaders });
  return context.newPage();
}

async function shot(page: Page, name: string, target?: ReturnType<Page["locator"]>): Promise<void> {
  if (!shots) return;
  await mkdir(shots, { recursive: true });
  if (target) await target.screenshot({ path: path.join(shots, `${name}.png`) });
  else await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true });
}

/** Closes every project of the pool and forgets where new ones are made: the next specs' apps are made as before. */
async function closePool(page: Page): Promise<void> {
  await page.goto("/admin/settings/firebase");
  const parent = page.getByRole("region", { name: "Where new projects are made" });
  await parent.getByLabel("Organization or folder").fill("");
  await parent.getByRole("button", { name: "Save where projects are made" }).click();
  await expect(parent.getByRole("status")).toContainText("Saved");
  const list = page.getByRole("list", { name: "Yallapp Firebase projects" });
  for (const id of await list.getByRole("listitem").evaluateAll((items) => items.map((i) => i.getAttribute("aria-label") ?? ""))) {
    const item = list.getByRole("listitem", { name: id });
    if ((await item.getByLabel("Takes new clients").count()) === 0) continue;
    await item.getByLabel("Takes new clients").selectOption("closed");
    await item.getByRole("button", { name: `Save ${id}` }).click();
    await expect(item.getByRole("status")).toContainText(`${id} is closed`);
  }
}

test.beforeAll(async ({ browser }) => {
  fake = await startFakeGoogle(E2E.googlePort, { provider: E2E.wifProvider, pushAccount: E2E.pushAccount, appsAccount: E2E.appsAccount, parents: [PARENT] });
  // The project the team made by hand, as LAUNCH-CHECKLIST 7z8 shows.
  fake.google.addProject("yallapp-push-01", "100200300400", "key-yallapp-push-01");
  admin = await freshPage(browser);
  own = await freshPage(browser);
});

test.afterAll(async () => {
  // Whatever happened above, the pool takes no new app after this spec.
  try {
    await admin.goto("/admin/settings/firebase");
    if (new URL(admin.url()).pathname.startsWith("/sign-in")) await signIn(admin, E2E.firebaseAdminEmail, E2E.adminPassword);
    await closePool(admin);
  } finally {
    await admin.context().close();
    await own.context().close();
    await fake.close();
  }
});

test("the platform is an OpenID Connect issuer, its key set public", async ({ request }) => {
  const discovery = await request.get("/oidc/.well-known/openid-configuration");
  expect(discovery.status()).toBe(200);
  expect(await discovery.json()).toMatchObject({
    issuer: `${E2E.baseURL}/oidc`,
    jwks_uri: `${E2E.baseURL}/oidc/jwks.json`,
    id_token_signing_alg_values_supported: ["ES256"],
    response_types_supported: ["id_token"],
    subject_types_supported: ["public"],
  });
  const jwks = await request.get("/oidc/jwks.json");
  expect(jwks.headers()["content-type"]).toContain("application/jwk-set+json");
  const set = (await jwks.json()) as { keys: Record<string, string>[] };
  expect(set.keys.length).toBeGreaterThan(0);
  expect(set.keys[0]).toMatchObject({ kty: "EC", crv: "P-256", alg: "ES256", use: "sig" });
  expect(JSON.stringify(set)).not.toContain('"d"');
});

test("Admin adds a project, checks it without a key, sets where new ones go, and the platform makes the next", async () => {
  await signIn(admin, E2E.firebaseAdminEmail, E2E.adminPassword);
  await admin.goto("/admin/settings");
  const card = admin.locator("[data-settings-card]").filter({ hasText: "Yallapp Firebase projects" });
  await expect(card).toContainText("Now: 0 in the pool, room for 0 more apps.");
  await card.getByRole("link", { name: "Yallapp Firebase projects" }).click();
  await expect(admin).toHaveURL(/\/admin\/settings\/firebase$/);
  await expect(admin.getByRole("status").filter({ hasText: "The pool is nearly full" })).toContainText("room for 0 more apps");

  const add = admin.getByRole("region", { name: "Add a project made by hand" });
  await add.getByLabel("Project ID").fill("yallapp-push-01");
  await add.getByLabel("Project number").fill("100200300400");
  await add.getByLabel("API key ID").fill("AIzaSyA-not-the-id!");
  await add.getByRole("button", { name: "Add the project" }).click();
  await expect(add.getByText("Enter the API key's ID (its uid), not the key itself.")).toBeVisible();
  await add.getByLabel("API key ID").fill("key-yallapp-push-01");
  await add.getByRole("button", { name: "Add the project" }).click();
  await expect(add.getByRole("status")).toContainText("yallapp-push-01 is in the pool.");

  // The Check: both accounts sign in through Workload Identity Federation (the fake reads our key set), and the project answers.
  const check = admin.getByRole("region", { name: "Check" });
  await check.getByRole("button", { name: "Check" }).click();
  const results = check.getByRole("list", { name: "Check results" });
  await expect(results).toContainText(`Push sender: Signed in as ${E2E.pushAccount}, without a key.`);
  await expect(results).toContainText(`Apps account: Signed in as ${E2E.appsAccount}, without a key.`);
  await expect(results).toContainText("Project yallapp-push-01: Firebase answers for it.");
  await expect(results).toContainText("Creating projects: No organization or folder");
  expect(fake.google.assertions.map((a) => a.sub).sort()).toEqual(["firebase-apps", "push-sender"]);
  expect(fake.google.assertions[0]).toMatchObject({ iss: `${E2E.baseURL}/oidc`, aud: `https://iam.googleapis.com/${E2E.wifProvider}` });

  const parent = admin.getByRole("region", { name: "Where new projects are made" });
  await parent.getByLabel("Organization or folder").fill("organization/1");
  await parent.getByRole("button", { name: "Save where projects are made" }).click();
  await expect(parent.getByText("Enter organizations/ or folders/ and the number")).toBeVisible();
  await parent.getByLabel("Organization or folder").fill(PARENT);
  await parent.getByRole("button", { name: "Save where projects are made" }).click();
  await expect(parent.getByRole("status")).toContainText(`New projects are made under ${PARENT}.`);
  await check.getByRole("button", { name: "Check" }).click();
  await expect(results).toContainText(`Creating projects: The apps account may create projects under ${PARENT}.`);

  // The next project, made now by the platform: created, its APIs on, Firebase added, its key made and the roles given.
  const pool = admin.getByRole("region", { name: "The pool" });
  await pool.getByRole("button", { name: "Make the next project now" }).click();
  await expect(pool.getByRole("status").first()).toContainText("yallapp-push-02 is ready and open.");
  const made = fake.google.projects.get("yallapp-push-02")!;
  expect(made).toMatchObject({ parent: PARENT, firebase: true });
  expect(made.keys).toHaveLength(1);
  expect(made.policy.bindings.find((b) => b.role === "roles/firebasecloudmessaging.admin")?.members).toEqual([`serviceAccount:${E2E.pushAccount}`]);
  await admin.reload();
  const list = admin.getByRole("list", { name: "Yallapp Firebase projects" });
  await expect(list.getByRole("listitem", { name: "yallapp-push-02" })).toContainText("Made by the platform");
  await expect(list.getByRole("listitem", { name: "yallapp-push-01" })).toContainText("0 of 28 apps · room for 28 more");
});

test("a new store app starts in Yallapp's Firebase and is registered when its names are saved", async () => {
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 01 36");
  await own.getByLabel("Your website (optional)").fill(`https://zahra-${suffix}.flowers.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  // Growth: push and the iPhone app, published by the client.
  await admin.getByRole("complementary").getByLabel("Plan").selectOption("growth");
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");

  await own.goto("/dashboard/app-type");
  await own.getByText("Store", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.getByLabel("App name").fill("Zahra Flowers");
  await own.getByLabel("Name under the app icon").fill("Zahra");
  await own.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [14, 13, 36]) });
  await expect(own.getByText("Replace file")).toBeVisible();
  await own.getByRole("button", { name: "Save & continue" }).click();

  await own.getByLabel("Android package name").fill(pkg);
  await own.getByLabel("iOS bundle ID").fill(pkg);
  await own.getByLabel("Store title").fill("Zahra Flowers");
  await own.getByLabel("Short description").fill("Fresh flowers delivered.");
  await own.getByLabel("Full description").fill("Zahra Flowers brings bouquets, plants and gifts to your door, the same day.");
  await own.getByLabel("Support email").fill("help@flowers.test");
  await own.getByLabel("Privacy policy URL").fill("https://flowers.test/privacy");
  await own.getByRole("button", { name: "Save & continue" }).click();

  // Publishing: Yallapp's Firebase chosen and ready; no file to upload.
  await expect(own.getByRole("heading", { name: "Publishing" })).toBeVisible();
  const push = own.getByRole("group", { name: "Push notifications" });
  await expect(push.getByRole("radio", { name: /Yallapp sets up notifications \(recommended\)/ })).toBeChecked();
  await expect(push.getByRole("status")).toContainText("Ready · Your apps are in Yallapp's Firebase");
  await expect(push.getByText("device push tokens are processed by Yallapp through Google Firebase Cloud Messaging")).toBeVisible();
  await expect(own.getByLabel("google-services.json (Android)")).toHaveCount(0);
  const fakeProject = fake.google.projects.get("yallapp-push-01")!;
  expect(fakeProject.android.map((a) => a.identifier)).toEqual([pkg]);
  expect(fakeProject.ios.map((a) => a.identifier)).toEqual([pkg]);

  await shot(own, "setup-choice-en-light", push);
  await own.emulateMedia({ colorScheme: "dark" });
  await shot(own, "setup-choice-en-dark", push);
  await own.locator("[data-dashboard-languages]").getByRole("button", { name: "العربية" }).click();
  await expect(own.locator("html")).toHaveAttribute("dir", "rtl");
  const pushAr = own.getByRole("group", { name: "الإشعارات الفورية" });
  await expect(pushAr.getByRole("radio", { name: /Yallapp يجهّز الإشعارات/ })).toBeChecked();
  await shot(own, "setup-choice-ar-dark", pushAr);
  await own.emulateMedia({ colorScheme: "light" });
  await shot(own, "setup-choice-ar-light", pushAr);
  // The own Firebase choice, in Arabic: today's fields.
  await pushAr.getByRole("radio", { name: "هستخدم Firebase بتاعي" }).check();
  await shot(own, "setup-own-ar-light", pushAr);
  await own.locator("[data-dashboard-languages]").getByRole("button", { name: "English" }).click();
  await expect(own.locator("html")).toHaveAttribute("dir", "ltr");

  // Finishing the setup queues the first build: its config carries Yallapp's files, as a client's own would be.
  await own.getByRole("group", { name: "Push notifications" }).getByRole("radio", { name: /Yallapp sets up notifications/ }).check();
  await own.getByRole("button", { name: "Finish setup" }).click();
  await expect(own).toHaveURL(/\/dashboard\/builds/);
  type Config = { android_package: string; firebase: { android_config_url: string; ios_config_url: string } };
  const queue = (await (await own.request.get("/api/v1/builds/queue", { headers: pipeline })).json()) as { builds: { id: string }[] };
  let build: { id: string } | undefined;
  let config: Config | undefined;
  for (const queued of queue.builds) {
    const read = (await (await own.request.get(`/api/v1/builds/${queued.id}/config`, { headers: pipeline })).json()) as Config;
    if (read.android_package === pkg) [build, config] = [queued, read];
  }
  expect(build).toBeTruthy();
  await own.request.post(`/api/v1/builds/${build!.id}/status`, { headers: pipeline, data: { status: "building" } });
  if (!config) throw new Error("No build of the app was queued.");
  expect(Object.keys(config.firebase).sort()).toEqual(["android_config_url", "ios_config_url"]);
  const file = JSON.parse(await (await own.request.get(config.firebase.android_config_url.replace(/^https?:\/\/[^/]+/, ""))).text()) as { project_info: { project_id: string }; client: { client_info: { android_client_info: { package_name: string } } }[] };
  expect(file.project_info.project_id).toBe("yallapp-push-01");
  expect(file.client.map((c) => c.client_info.android_client_info.package_name)).toEqual([pkg]);
  await own.request.post(`/api/v1/builds/${build!.id}/status`, { headers: pipeline, data: { status: "failed", message: "Stopped by the test." } });
});

test("the Notifications page has no key to upload in Yallapp's mode", async () => {
  await own.goto("/dashboard/notifications");
  const push = own.getByRole("region", { name: "Push", exact: true });
  await expect(push).toContainText("On · Yallapp sets up and sends your app's notifications. Nothing to add here.");
  await expect(own.getByLabel("Firebase service account key (.json)")).toHaveCount(0);
  await expect(own.getByRole("button", { name: "Remove key" })).toHaveCount(0);
});

test("“Use my own Firebase” brings today's fields back, and Yallapp's again its files", async () => {
  await own.goto("/dashboard/setup?step=publishing");
  const push = own.getByRole("group", { name: "Push notifications" });
  await push.getByRole("radio", { name: "Use my own Firebase" }).check();
  await expect(own.getByLabel("google-services.json (Android)")).toBeVisible();
  await expect(own.getByLabel("GoogleService-Info.plist (iOS)")).toBeVisible();
  // Yallapp's files are never shown as the client's own.
  await expect(own.getByText("google-services.json saved")).toHaveCount(0);
  await own.getByRole("button", { name: "Finish setup" }).click();
  await own.waitForURL((url) => !url.search.includes("step=publishing"));
  await own.goto("/dashboard/setup?step=publishing");
  await expect(own.getByRole("group", { name: "Push notifications" }).getByRole("radio", { name: "Use my own Firebase" })).toBeChecked();
  await own.goto("/dashboard/notifications");
  await expect(own.getByLabel("Firebase service account key (.json)")).toBeVisible();

  await own.goto("/dashboard/setup?step=publishing");
  await own.getByRole("group", { name: "Push notifications" }).getByRole("radio", { name: /Yallapp sets up notifications/ }).check();
  await expect(own.getByRole("group", { name: "Push notifications" })).toContainText("Save to switch");
  await own.getByRole("button", { name: "Finish setup" }).click();
  await own.waitForURL((url) => !url.search.includes("step=publishing"));
  await own.goto("/dashboard/setup?step=publishing");
  await expect(own.getByRole("group", { name: "Push notifications" }).getByRole("status")).toContainText("Ready");
  // The same apps in Firebase, never twice.
  expect(fake.google.projects.get("yallapp-push-01")!.android.map((a) => a.identifier)).toEqual([pkg]);
});

test("Admin's page shows the pool with the client's apps, then the pool is closed again", async () => {
  await admin.goto("/admin/settings/firebase");
  const list = admin.getByRole("list", { name: "Yallapp Firebase projects" });
  await expect(list.getByRole("listitem", { name: "yallapp-push-01" })).toContainText("2 of 28 apps · room for 26 more");
  await shot(admin, "admin-firebase-en-light");
  await admin.emulateMedia({ colorScheme: "dark" });
  await shot(admin, "admin-firebase-en-dark");
  await admin.emulateMedia({ colorScheme: "light" });
  await closePool(admin);
  await admin.reload();
  await expect(list.getByRole("listitem", { name: "yallapp-push-01" }).getByLabel("Takes new clients")).toHaveValue("closed");
  await expect(list.getByRole("listitem", { name: "yallapp-push-02" }).getByLabel("Takes new clients")).toHaveValue("closed");
});
