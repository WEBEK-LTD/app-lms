import { generateKeyPairSync } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * Roadmap 14: "Publish it for me" (the client's checklist and listing
 * details, the team's Publishing queue, status emails) and Builds &
 * downloads end to end against the pipeline API: plain failure reasons, Try
 * again, per-file download links signed when clicked, stalled builds.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Rosalind Franklin", email: `rosalind-${suffix}@lab.test`, password: "rosalind-strong-password-1", site: `https://rosalind-${suffix}.lab.test` };
const teamEmail = `publish-team-${suffix}@yallapp.test`;
const pipeline = { authorization: `Bearer ${E2E.pipelineToken}` };
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.141" };
let admin: Page;
let own: Page;
let appId = "";

interface SentMail {
  to: string;
  subject: string;
  text: string;
  sentAt: string;
}

async function mailsTo(email: string): Promise<SentMail[]> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as SentMail));
  return mails.filter((m) => m.to === email).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

async function queued(request: import("@playwright/test").APIRequestContext, version: string) {
  const queue = await (await request.get("/api/v1/builds/queue?limit=100", { headers: pipeline })).json();
  return queue.builds.find((b: { app_id: string; version_name: string }) => b.app_id === appId && b.version_name === version) as { id: string; number: number } | undefined;
}

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  admin = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 51");
  await own.getByLabel("Your website (optional)").fill(client.site);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.publishingAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
});

test.afterAll(async () => {
  await own.close();
  await admin.close();
});

test("the team sets the publishing email and activates a Pro client", async () => {
  await admin.goto("/admin/settings");
  const section = admin.getByRole("region", { name: "Publishing service" });
  await section.getByLabel("Publishing team email").fill("not an email");
  await section.getByRole("button", { name: "Save", exact: true }).click();
  await expect(section.getByText("Enter an email address.")).toBeVisible();
  await section.getByLabel("Publishing team email").fill(teamEmail);
  await section.getByRole("button", { name: "Save", exact: true }).click();
  await expect(section.getByText("Saved. Clients now see this address")).toBeVisible();

  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  const panel = admin.getByRole("complementary");
  await panel.getByLabel("Plan").selectOption("pro");
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
});

test("the client sets up the app and asks us to publish it", async ({ request }) => {
  await own.goto("/pending");
  await expect(own).toHaveURL(/\/dashboard\/app-type$/);
  await own.getByRole("button", { name: "Continue" }).click();
  await expect(own.getByRole("heading", { name: "Website" })).toBeVisible();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await own.getByLabel("App name").fill("Franklin Lab");
  await own.getByLabel("Name under the app icon").fill("Lab");
  await own.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [30, 80, 60]) });
  await expect(own.getByText("Replace file")).toBeVisible();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await own.getByLabel("Android package name").fill(`com.franklin${suffix}.app`);
  await own.getByLabel("iOS bundle ID").fill(`com.franklin${suffix}.app`);
  await own.getByLabel("Store title").fill("Franklin Lab");
  await own.getByLabel("Short description").fill("Science courses on your phone.");
  await own.getByLabel("Full description").fill("Franklin Lab brings every science course, lesson and quiz to your phone, synced with our website.");
  await own.getByLabel("Support email").fill("help@lab.test");
  await own.getByLabel("Privacy policy URL").fill("https://lab.test/privacy");
  await own.getByRole("button", { name: "Save & continue" }).click();
  // Pro asks for store keys here; instead they ask us to publish.
  await expect(own.getByRole("heading", { name: "Publishing" })).toBeVisible();

  await own.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Publishing", exact: true }).click();
  await expect(own).toHaveURL(/\/dashboard\/publishing$/);
  await expect(own.getByRole("heading", { name: "Publishing", level: 1 })).toBeVisible();
  await expect(own.getByText(`you invite our team email, ${teamEmail}`)).toBeVisible();
  await own.getByRole("button", { name: "Publish it for me" }).click();
  await expect(own).toHaveURL(/\/dashboard\/publishing\?chosen=managed$/);
  await expect(own.getByText("Thanks! Our team has your request.")).toBeVisible();
  await expect.poll(async () => (await mailsTo(teamEmail)).map((m) => m.subject)).toContain(`Publishing: ${client.name} asked us to publish their app`);

  // No store keys needed now: the setup is complete and the first build is queued.
  appId = await own.getByLabel("Current app").inputValue();
  expect(await queued(request, "1.0.0")).toBeTruthy();
  await own.goto("/dashboard/setup?step=publishing");
  await expect(own.getByText("You asked us to publish your app, so nothing here is required")).toBeVisible();
});

test("the client works through the checklist and the listing details", async () => {
  await own.goto("/dashboard/publishing");
  const steps = own.getByRole("region", { name: "Your steps" });
  await expect(steps.getByText(`add ${teamEmail} with the App Manager role`)).toBeVisible();
  await expect(steps.getByText("An organisation needs a D-U-N-S number")).toBeVisible();
  await expect(steps.getByRole("link", { name: /Google Play Console sign-up/ })).toHaveAttribute("href", "https://play.google.com/console/signup");
  await expect(own.locator("body")).not.toContainText(/password:/i);

  for (const title of ["Create your Google Play developer account", "Invite our team to Google Play Console", "Join the Apple Developer Program", "Invite our team to App Store Connect"]) {
    await steps.getByRole("checkbox", { name: `Done: ${title}` }).check();
  }
  await steps.getByRole("radio", { name: "Create it for me" }).check();
  await steps.getByRole("button", { name: "Save checklist" }).click();
  await expect(steps.getByText("Saved. Tick the other steps when they're done.")).toBeVisible();
  await expect(steps.getByText("5 of 6 done")).toBeVisible();

  const listing = own.getByRole("region", { name: "Store listing details" });
  await expect(listing.getByText("Franklin Lab", { exact: true })).toBeVisible();
  // Suggested for an Academy app.
  await expect(listing.getByLabel("Google Play category")).toHaveValue("Education");
  await listing.getByRole("button", { name: "Save listing details" }).click();
  await expect(listing.getByText("Tell us a little about what's in your app")).toBeVisible();
  await listing.getByLabel("For the content rating questions").fill("Science courses for adults. No violence, chat or ads.");
  await listing.getByRole("button", { name: "Save listing details" }).click();
  await expect(listing.getByText("Saved. Everything is ready: our team takes it from here.")).toBeVisible();
  await expect.poll(async () => (await mailsTo(teamEmail)).map((m) => m.subject)).toContain(`Publishing: ${client.name} finished the publishing checklist`);

  // The overview shows where it stands.
  await own.goto("/dashboard");
  await expect(own.getByRole("listitem").filter({ hasText: "Google Play" })).toContainText("Waiting for you");
  // 19 The setup counts the step as done, but nothing is live yet.
  await expect(own.getByText("Publishing: our team is on it")).toBeVisible();
});

test("the team moves each store along, and the client is emailed", async () => {
  await admin.goto("/admin/publishing");
  // 19 The open requests are counted next to Publishing.
  await expect(admin.getByRole("navigation", { name: "Super admin" }).getByRole("link", { name: /^Publishing \d+ open requests?$/ })).toBeVisible();
  const card = admin.getByRole("region", { name: `Franklin Lab (${client.name})` });
  await expect(card).toContainText("Client ready");
  await expect(card).toContainText("Firebase project: we create it");
  await expect(card).toContainText("Science courses for adults");

  await card.getByLabel("Google Play status").selectOption("in_review");
  await card.getByRole("button", { name: "Save Google Play" }).click();
  await expect(card.getByText("Google Play is now “In review”. The client has been emailed.")).toBeVisible();

  await card.getByLabel("App Store status").selectOption("rejected");
  await card.getByRole("button", { name: "Save App Store" }).click();
  await expect(card.getByText("Say why it was rejected")).toBeVisible();
  await card.getByLabel("App Store note to the client").fill("Apple needs a demo phone number to sign in; we added the review number.");
  await card.getByRole("button", { name: "Save App Store" }).click();
  await expect(card.getByText("App Store is now “Rejected”.")).toBeVisible();

  await card.getByLabel("Google Play status").selectOption("live");
  await card.getByRole("button", { name: "Save Google Play" }).click();
  await expect(card.getByText("Add the link to the app's store page.")).toBeVisible();
  await card.getByLabel("Google Play link").fill("https://apps.apple.com/app/id1");
  await card.getByRole("button", { name: "Save Google Play" }).click();
  await expect(card.getByText("A Google Play link starts with https://play.google.com/.")).toBeVisible();
  await card.getByLabel("Google Play link").fill(`https://play.google.com/store/apps/details?id=com.franklin${suffix}.app`);
  await card.getByRole("button", { name: "Save Google Play" }).click();
  await expect(card.getByText("Google Play is now “Live”.")).toBeVisible();

  await card.getByLabel("Team notes (only the team sees these)").fill("Client prefers WhatsApp in the mornings.");
  await card.getByRole("button", { name: "Save notes" }).click();
  await expect(card.getByText("Notes saved.")).toBeVisible();

  await admin.goto("/admin/audit");
  await expect(admin.getByText("Google Play: In review → Live (Franklin Lab)")).toBeVisible();

  const mails = await mailsTo(client.email);
  const live = mails.find((m) => m.subject === "Franklin Lab on Google Play: Live")!;
  expect(live.text).toContain(`Your app: https://play.google.com/store/apps/details?id=com.franklin${suffix}.app`);
  expect(mails.map((m) => m.subject)).toContain("Franklin Lab on App Store: Rejected");
  const link = /https?:\/\/\S+\/dashboard\/open\/[0-9a-f-]{36}\?to=publishing/.exec(live.text)![0];

  // The email's link opens the app's Publishing page.
  await own.goto(new URL(link).pathname + new URL(link).search);
  await expect(own).toHaveURL(/\/dashboard\/publishing$/);
  const play = own.getByRole("region", { name: "Google Play" });
  await expect(play).toContainText("Live");
  await expect(play.getByRole("link", { name: "See it on Google Play" })).toHaveAttribute("href", /^https:\/\/play\.google\.com\//);
  await expect(own.getByRole("region", { name: "App Store" })).toContainText("Apple needs a demo phone number");
  await expect(own.getByRole("region", { name: "History" })).toContainText("Google Play: Live");
  // The team's own notes never reach the client.
  await expect(own.locator("body")).not.toContainText("WhatsApp in the mornings");
});

test("35, 36 the client adds Samsung Galaxy Store, and the team moves it along", async () => {
  await own.goto("/dashboard/publishing");
  const more = own.getByRole("form", { name: "More Android stores" });
  await more.getByRole("checkbox", { name: /Samsung Galaxy Store/ }).check();
  await more.getByRole("button", { name: "Save stores" }).click();
  await expect(own.getByRole("region", { name: "Samsung Galaxy Store" })).toContainText("Waiting for you");
  await expect(own.getByRole("region", { name: "Huawei AppGallery" })).toHaveCount(0);
  const steps = own.getByRole("region", { name: "Your steps" });
  await expect(steps.getByText(`invite ${teamEmail} as a manager for applications`)).toBeVisible();
  await expect(steps.getByText("6 of 8 done")).toBeVisible();
  await expect.poll(async () => (await mailsTo(teamEmail)).map((m) => m.subject)).toContain(`Publishing: ${client.name} asked us to publish their app on Samsung Galaxy Store too`);

  await admin.goto("/admin/publishing");
  const card = admin.getByRole("region", { name: `Franklin Lab (${client.name})` });
  await expect(card).toContainText("Invite our team to Seller Portal");
  await card.getByLabel("Samsung Galaxy Store status").selectOption("in_review");
  await card.getByRole("button", { name: "Save Samsung Galaxy Store" }).click();
  await expect(card.getByText("Samsung Galaxy Store is now “In review”. The client has been emailed.")).toBeVisible();
  await expect.poll(async () => (await mailsTo(client.email)).map((m) => m.subject)).toContain("Franklin Lab on Samsung Galaxy Store: In review");

  await own.goto("/dashboard/publishing");
  await expect(own.getByRole("region", { name: "Samsung Galaxy Store" })).toContainText("Samsung is reviewing your app.");
  await expect(own.getByRole("region", { name: "History" })).toContainText("Samsung Galaxy Store: In review");
});

test("a build that didn't finish says why, and Try again builds the same version", async ({ request }) => {
  const first = (await queued(request, "1.0.0"))!;
  await request.post(`/api/v1/builds/${first.id}/status`, { headers: pipeline, data: { status: "building", stages: { android: "running" }, log_url: "https://github.com/WEBEK-LTD/app-lms/actions/runs/7" } });
  await request.post(`/api/v1/builds/${first.id}/status`, { headers: pipeline, data: { status: "failed", stages: { android: "failed" }, message: "The Android app couldn't be built." } });

  await own.goto("/dashboard/builds");
  const current = own.getByRole("region", { name: "Build #1 · App version 1.0.0" });
  await expect(current).toContainText("Didn't finish");
  await expect(current).toContainText("The Android app couldn't be built.");
  await expect(current).toContainText("Started");
  // The CI log is private: the client doesn't get a link to it.
  await expect(own.getByRole("link", { name: "View log" })).toHaveCount(0);
  await expect(own.getByRole("textbox", { name: "App version" })).toHaveValue("1.0.0");
  await expect.poll(async () => (await mailsTo(client.email)).map((m) => m.subject)).toContain("Franklin Lab: build #1 didn't finish");
  const team = await mailsTo(E2E.publishingAdminEmail);
  expect(team.find((m) => m.subject === "Build problem: Franklin Lab #1")?.text).toContain("actions/runs/7");

  await current.getByRole("button", { name: "Try again" }).click();
  await expect(own.getByText("Build #2 is queued.")).toBeVisible();
  await expect(own.getByRole("heading", { name: "Build #2 · App version 1.0.0" })).toBeVisible();
  await expect(own.getByRole("button", { name: "Start new build" })).toBeDisabled();
});

test("downloads appear only for files the build has, and are signed when clicked", async ({ request }) => {
  const second = (await queued(request, "1.0.0"))!;
  expect(second.number).toBe(2);
  await request.post(`/api/v1/builds/${second.id}/status`, {
    headers: pipeline,
    data: {
      status: "ready",
      stages: { android: "done", upload_play: "failed" },
      message: "Your Android app is ready, but the upload to Google Play didn't work.",
      artifacts: [
        { kind: "apk", url: `https://files.yallapp.com.tr/builds/${second.id}/app-release.apk` },
        { kind: "aab", url: `https://files.yallapp.com.tr/builds/${second.id}/app-release.aab` },
      ],
    },
  });
  await own.goto("/dashboard/builds");
  await expect(own.getByRole("heading", { name: "Files from build #2 (version 1.0.0)" })).toBeVisible();
  await expect(own.getByText("Your Android app is ready, but the upload to Google Play didn't work.")).toBeVisible();
  const aab = own.getByRole("link", { name: "Download Android App Bundle (.aab)" });
  await expect(aab).toHaveAttribute("href", `/api/dashboard/builds/${second.id}/files/aab`);
  const signed = await own.request.get(`/api/dashboard/builds/${second.id}/files/aab`, { maxRedirects: 0 });
  expect(signed.status()).toBe(303);
  expect(signed.headers()["location"]).toMatch(new RegExp(`^https://files\\.yallapp\\.com\\.tr/builds/${second.id}/app-release\\.aab\\?expires=\\d+&sig=[0-9a-f]{64}$`));
  // No iOS app in this build, and the reason says what to do.
  await expect(own.getByRole("button", { name: "Download iOS build (.ipa)" })).toBeDisabled();
  await expect(own.getByText("Add your App Store Connect key in App setup › Publishing to get the iOS app")).toBeVisible();
  // A file the build doesn't have goes back to the page with a notice.
  await own.goto(`/api/dashboard/builds/${second.id}/files/ipa`);
  await expect(own).toHaveURL(/\/dashboard\/builds\?download=unavailable$/);
  await expect(own.getByText("That file isn't available to download right now.")).toBeVisible();
  // Someone else (signed out) gets nothing.
  expect((await request.get(`/api/dashboard/builds/${second.id}/files/aab`, { maxRedirects: 0 })).headers()["location"]).toMatch(/\/sign-in$/);
  // The new version suggestion follows the ready build.
  await expect(own.getByRole("textbox", { name: "App version" })).toHaveValue("1.0.1");
  await expect.poll(async () => (await mailsTo(client.email)).map((m) => m.subject)).toContain("Franklin Lab: build #2 is ready");
});

test("the team closes a build that stopped, and the client can start again", async () => {
  await own.goto("/dashboard/builds");
  await own.getByRole("button", { name: "Start new build" }).click();
  await expect(own.getByText("Build #3 is queued.")).toBeVisible();

  await admin.goto("/admin/builds?status=queued");
  await admin.getByRole("button", { name: "Mark as not finished (build #3 of Franklin Lab)" }).click();
  await expect(admin).toHaveURL(/\/admin\/builds\?status=failed$/);
  const row = admin.getByRole("row").filter({ hasText: "Franklin Lab" }).filter({ hasText: "#3" });
  await expect(row).toContainText("This build stopped without finishing");

  await own.goto("/dashboard/builds");
  await expect(own.getByRole("region", { name: "Build #3 · App version 1.0.1" })).toContainText("Didn't finish");
  await expect(own.getByRole("button", { name: "Start new build" })).toBeEnabled();
  await expect(own.getByRole("textbox", { name: "App version" })).toHaveValue("1.0.1");
  // The history keeps every build, with its times.
  const history = own.getByRole("region", { name: "Build history" });
  await expect(history.getByRole("row")).toHaveCount(4);
});

test("publishing yourself after all tells the team, and the setup's Publishing step asks us again", async () => {
  await own.goto("/dashboard/publishing");
  await own.getByRole("button", { name: "I'll publish it myself" }).click();
  await expect(own.getByText("Saved: you publish Franklin Lab yourself.")).toBeVisible();
  await expect.poll(async () => (await mailsTo(teamEmail)).map((m) => m.subject)).toContain(`Publishing: ${client.name} will publish their app themselves`);
  await admin.goto("/admin/publishing");
  await expect(admin.getByRole("region", { name: `Franklin Lab (${client.name})` })).toHaveCount(0);

  // 19 The same choice in the setup: "Publish it for me" needs no store keys.
  await own.goto("/dashboard/setup?step=publishing");
  await expect(own.getByRole("radio", { name: /I'll publish it myself/ })).toBeChecked();
  await own.getByRole("button", { name: "Save & finish" }).click();
  await expect(own.getByText("Add your Google Play key, your App Store Connect key, or both. Or choose “Publish it for me”.")).toBeVisible();
  await own.getByRole("radio", { name: /Publish it for me/ }).check();
  await expect(own.getByText("No store keys needed.")).toBeVisible();
  await own.getByRole("button", { name: "Save & finish" }).click();
  await expect(own).toHaveURL(/\/dashboard\/builds/);
  await expect
    .poll(async () => (await mailsTo(teamEmail)).filter((m) => m.subject === `Publishing: ${client.name} asked us to publish their app`).length)
    .toBe(2);

  await admin.goto("/admin/publishing");
  const card = admin.getByRole("region", { name: `Franklin Lab (${client.name})` });
  await card.locator("summary").filter({ hasText: "History" }).click();
  await expect(card).toContainText("Will publish the app themselves");
  await expect(card).toContainText("Asked us to publish the app");
  await own.goto("/dashboard/publishing");
  await expect(own.getByRole("region", { name: "History" })).toContainText("You chose to publish your app yourself");
});

test("35, 36 More Android stores: Galaxy Store keys and Huawei push reach the next build", async ({ request }) => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
  const androidPackage = `com.franklin${suffix}.app`;
  await own.goto("/dashboard/publishing/more-stores");
  await expect(own.getByRole("heading", { name: "More Android stores", level: 1 })).toBeVisible();
  // Our team publishes this app: nothing is required here.
  await expect(own.getByText(`invite ${teamEmail}: you don't need to add anything here`)).toBeVisible();

  const galaxy = own.getByRole("region", { name: "Samsung Galaxy Store" });
  await galaxy.getByLabel("Content ID").fill("12");
  await galaxy.getByLabel("Service account ID").fill("sa-franklin-01");
  await galaxy.getByLabel("Private key", { exact: true }).fill("not a key");
  await galaxy.getByRole("button", { name: "Save Galaxy Store keys" }).click();
  await expect(galaxy.getByText("The content ID is the number Seller Portal shows for your app")).toBeVisible();
  await expect(galaxy.getByText("This isn't the service account's private key.")).toBeVisible();
  await galaxy.getByLabel("Content ID").fill("000001234567");
  await galaxy.getByLabel("Private key", { exact: true }).fill(privateKey);
  await galaxy.getByRole("button", { name: "Save Galaxy Store keys" }).click();
  await expect(galaxy.getByText("Saved. Every new build is uploaded to Galaxy Store and sent for review.")).toBeVisible();
  await own.reload();
  await expect(galaxy.getByText("Galaxy Store keys saved")).toBeVisible();
  // The key is never shown again.
  await expect(own.locator("body")).not.toContainText("BEGIN PRIVATE KEY-----M");

  const huawei = own.getByRole("region", { name: "Huawei AppGallery" });
  const agconnect = (pkg: string) => ({
    name: "agconnect-services.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ client: { app_id: "104123456", package_name: pkg }, app_info: { app_id: "104123456", package_name: pkg } })),
  });
  await huawei.getByLabel("agconnect-services.json").setInputFiles(agconnect("com.someone.else"));
  await huawei.getByRole("button", { name: "Save Huawei settings" }).click();
  await expect(huawei.getByText(`This file is for com.someone.else, not ${androidPackage}.`)).toBeVisible();
  await huawei.getByLabel("agconnect-services.json").setInputFiles(agconnect(androidPackage));
  await huawei.getByLabel("App secret").fill("0123456789abcdef0123456789abcdef");
  await huawei.getByRole("button", { name: "Save Huawei settings" }).click();
  await expect(huawei.getByText("Saved. Your next build includes Huawei push.")).toBeVisible();
  await own.reload();
  await expect(huawei.getByText("agconnect-services.json saved")).toBeVisible();
  await expect(huawei.getByLabel("App ID")).toHaveAttribute("placeholder", "104123456");

  // A new build: its config has the Huawei file, its keys the Galaxy Store ones.
  const queue = async () =>
    ((await (await request.get("/api/v1/builds/queue?limit=100", { headers: pipeline })).json()).builds as { id: string; app_id: string; stages: Record<string, string> }[]).filter(
      (b) => b.app_id === appId,
    );
  for (const old of await queue()) {
    await request.post(`/api/v1/builds/${old.id}/status`, { headers: pipeline, data: { status: "failed", stages: { android: "failed" } } });
  }
  await own.goto("/dashboard/builds");
  await own.getByRole("button", { name: "Start new build" }).click();
  await expect(own.getByText(/Build #\d+ is queued\./)).toBeVisible();
  await expect(own.getByText("Upload to Galaxy Store").first()).toBeVisible();
  const [build] = await queue();
  expect(build!.stages).toMatchObject({ upload_galaxy: "pending", upload_appgallery: "skipped" });
  await request.post(`/api/v1/builds/${build!.id}/status`, { headers: pipeline, data: { status: "building" } });
  const config = await (await request.get(`/api/v1/builds/${build!.id}/config`, { headers: pipeline })).json();
  expect(config.huawei.agconnect_config_url).toMatch(/\/api\/v1\/assets\/[0-9a-f-]{36}$/);
  const file = await (await request.get(new URL(config.huawei.agconnect_config_url).pathname)).json();
  expect(file.app_info.package_name).toBe(androidPackage);
  const keys = await (await request.get(`/api/v1/builds/${build!.id}/secrets`, { headers: pipeline })).json();
  expect(keys.galaxy_store).toEqual({ content_id: "000001234567", service_account_id: "sa-franklin-01", private_key: privateKey.trim() });
  expect(keys.huawei_appgallery).toBeNull();

  // The pipeline reports the upload.
  await request.post(`/api/v1/builds/${build!.id}/status`, { headers: pipeline, data: { status: "ready", stages: { android: "done", upload_galaxy: "done" } } });
  await own.goto("/dashboard/builds");
  await expect(own.getByText("Upload to Galaxy Store").first()).toBeVisible();
});
