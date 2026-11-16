import fs from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "../e2e/png";

/**
 * 132.140–132.144 Screenshots of the second set of Studio's premium pages
 * (components/studio-page): a Studio store set up and published for its
 * owner (Google Play live, the App Store in review), its builds (one that
 * didn't finish, then a ready one), crash reports, the team's add-ons and
 * announcements, a team member and an invitation, two phones on Yallapp
 * Business; Invoices before the first payment is the empty state. In Arabic,
 * light and dark at 1440×900 and light at 390 wide. Not part of the test
 * suite; run it with
 * `SCREENS_OUT=<dir> SCREENS_PREFIX=after npx playwright test --config playwright.screens.config.ts studio-premium-b`
 * (SCREENS_PREFIX=before on the commit before, to compare: it works with both designs).
 */
test.describe.configure({ mode: "serial" });

const OUT = process.env.SCREENS_OUT ?? path.resolve(__dirname, "../../test-results/screens");
const PREFIX = process.env.SCREENS_PREFIX ?? "after";
const suffix = Date.now().toString(36);
const owner = { name: "Nour Adel", email: `nour-b-${suffix}@studio.test`, password: "nour-premium-b-strong-password-1" };
const staff = { name: "Omar Hassan", email: `omar-b-${suffix}@studio.test`, password: "omar-premium-b-strong-password-1" };
const teamEmail = `publishing-${suffix}@yallapp.test`;
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.141" };
const pipeline = { authorization: `Bearer ${E2E.pipelineToken}` };
const ownerApi = `${E2E.baseURL}/api/owner/v1`;

test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: Number(process.env.SCREENS_SCALE ?? 2), extraHTTPHeaders });

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

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

/** The page's top (the viewport) for the report, and all of it beside it to review. */
async function shoot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  fs.mkdirSync(path.join(OUT, "full"), { recursive: true });
  await page.screenshot({ path: path.join(OUT, `${PREFIX}-${name}.jpg`), type: "jpeg", quality: 85 });
  await page.screenshot({ path: path.join(OUT, "full", `${PREFIX}-${name}.jpg`), type: "jpeg", quality: 70, fullPage: true });
}

const sideMenu = (page: Page) => page.locator("nav:has([data-studio-search])").first();

async function language(page: Page, lang: "en" | "ar") {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/studio/project");
  await sideMenu(page).getByRole("button", { name: lang === "ar" ? "العربية" : "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
}

/** Arabic light and dark at the desktop width, then light on a phone. */
async function pageShots(page: Page, href: string, name: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(href);
  await shoot(page, `${name}-ar-light-desktop`);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await shoot(page, `${name}-ar-dark-desktop`);
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await shoot(page, `${name}-ar-light-phone`);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  fs.appendFileSync(path.join(OUT, `${PREFIX}-widths.txt`), `${name} phone scrollWidth ${width}\n`);
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function announce(admin: Page, kind: "Update" | "Maintenance" | "Offer", words: { en: [string, string]; ar: [string, string] }, bellOnly: boolean) {
  await admin.goto("/admin/announcements/new");
  await admin.getByLabel("Title", { exact: true }).fill(words.en[0]);
  await admin.getByLabel("Message", { exact: true }).fill(words.en[1]);
  await admin.getByRole("radio", { name: "All clients" }).check();
  await admin.getByRole("radio", { name: kind, exact: true }).check();
  if (bellOnly) await admin.getByRole("radio", { name: /^Bell only/ }).check();
  await admin.getByText("Arabic and Turkish (optional)").click();
  await admin.getByLabel("Arabic title").fill(words.ar[0]);
  await admin.getByLabel("Arabic message").fill(words.ar[1]);
  await admin.getByRole("button", { name: "Publish announcement" }).click();
  await expect(admin.getByText("Announcement published.")).toBeVisible();
}

async function addon(admin: Page, id: string, icon: string, en: [string, string], ar: [string, string], prices: [string, string][]) {
  await admin.goto("/admin/addons?addon=new");
  const form = admin.getByRole("form", { name: "New add-on" });
  await form.getByLabel("Id", { exact: true }).fill(id);
  await form.getByLabel("Type", { exact: true }).selectOption("service");
  await form.getByLabel("Icon").selectOption(icon);
  await form.locator('input[name="enName"]').fill(en[0]);
  await form.locator('textarea[name="enDescription"]').fill(en[1]);
  if (await form.locator('input[name="arName"]').count()) {
    await form.locator('input[name="arName"]').fill(ar[0]);
    await form.locator('textarea[name="arDescription"]').fill(ar[1]);
  }
  for (const [billing, egp] of prices) {
    await form.locator(`input[name="price_${billing}_on"]`).check();
    await form.locator(`input[name="price_${billing}_egp"]`).fill(egp);
  }
  await form.locator("#addon-family").selectOption("both");
  await form.getByLabel("Offered to clients").check();
  await form.getByRole("button", { name: "Save add-on" }).click();
  await expect(form.getByText(/saved and offered/)).toBeVisible();
}

async function buildOf(request: APIRequestContext, appId: string, number: number) {
  const find = async () => {
    const queue = await (await request.get("/api/v1/builds/queue?limit=100", { headers: pipeline })).json();
    return (queue.builds as { id: string; app_id: string; number: number }[]).find((b) => b.app_id === appId && b.number === number);
  };
  await expect.poll(find, { timeout: 20_000 }).toBeTruthy();
  return (await find())!;
}

async function join(browser: Browser, email: string, name: string, password: string) {
  await expect.poll(async () => (await mailsTo(email)).length).toBeGreaterThan(0);
  const [mail] = await mailsTo(email);
  const joinUrl = /https?:\/\/\S+\/team\/join\?token=\S+/.exec(mail!.text)![0];
  const page = await (await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.142" } })).newPage();
  await page.goto(joinUrl.replace(/^https?:\/\/[^/]+/, ""));
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm the password").fill(password);
  await page.getByRole("button", { name: "Join the team" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/team/join"));
  await page.context().close();
}

async function invite(page: Page, name: string, email: string, area: string) {
  await page.goto("/studio/team");
  // 132.142 Inviting opens in a drawer from the page's main action (before, the form was on the page).
  const opens = page.getByRole("button", { name: "Invite someone" });
  if (await opens.count()) await opens.click();
  const form = page.getByRole("region", { name: "Invite someone" });
  await form.getByLabel("Name").fill(name);
  await form.getByLabel("Email").fill(email);
  await form.getByRole("radio", { name: /Staff/ }).check();
  await form.getByRole("checkbox", { name: area }).check();
  await form.getByRole("button", { name: "Send invitation" }).click();
  await expect(form.getByRole("status")).toContainText(`Invitation sent to ${email}.`);
}

test("Studio's premium pages, the second set", async ({ page, browser, request }) => {
  test.setTimeout(1_200_000);
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(owner.name);
  await page.getByLabel("Email").fill(owner.email);
  await page.getByLabel("WhatsApp number").fill("+20 100 000 1401");
  await page.getByLabel("Password", { exact: true }).fill(owner.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-up");

  // The team: the account active, Studio plan 1 publishing for its projects, our publishing email, announcements and add-ons.
  const admin = await browser.newPage({ extraHTTPHeaders });
  await signIn(admin, E2E.studioSetupAdminEmail, E2E.adminPassword);
  await admin.goto("/admin/clients");
  await admin.getByRole("searchbox", { name: "Search clients" }).fill(owner.email);
  await admin.getByRole("button", { name: "Search" }).click();
  await admin.getByRole("link", { name: `Activate ${owner.name}` }).click();
  const panel = admin.getByRole("complementary");
  await panel.getByLabel("Active until").fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");

  await admin.goto("/admin/plans?family=studio&plan=studio_1");
  const plan = admin.getByRole("form", { name: /^Studio plan 1: the plan$/ });
  for (const feature of ["auto_publish", "ios"]) await plan.locator(`input[name=features][value=${feature}]`).check();
  await plan.getByRole("button", { name: "Save plan" }).click();
  await expect(plan.getByText(/saved/)).toBeVisible();

  await admin.goto("/admin/settings/contact");
  const service = admin.getByRole("region", { name: "Publishing service" });
  await service.getByLabel("Publishing team email").fill(teamEmail);
  await service.getByRole("button", { name: "Save", exact: true }).click();
  await expect(service.getByText("Saved. Clients now see this address")).toBeVisible();

  await announce(admin, "Update", { en: ["Faster Android builds", "Android builds now take **half** the time."], ar: ["إصدارات Android أسرع", "إصدارات Android بقت بتاخد **نص** الوقت."] }, false);
  await announce(admin, "Maintenance", { en: ["Planned maintenance tonight", "Builds pause tonight from 22:00 to 23:00 UTC."], ar: ["صيانة مجدولة النهارده بالليل", "الإصدارات هتقف النهارده من 22:00 لـ 23:00 بتوقيت UTC."] }, true);
  await announce(admin, "Offer", { en: ["20% off a year of Studio", "This week only: pay for a year of your Studio plan and save 20%."], ar: ["خصم 20% على سنة Studio", "الأسبوع ده بس: ادفع سنة من باقة Studio ووفّر 20%."] }, true);

  await addon(admin, `shots-${suffix}`, "photo_camera", ["Store screenshots, designed", "Our designers make your store screenshots and feature graphic."], ["تصميم صور المتجر", "مصممينا بيعملوا صور المتجر وصورة العرض بتاعة تطبيقك."], [["once", "1500"]]);
  await addon(admin, `care-${suffix}`, "support_agent", ["Priority support", "A reply within 2 hours on WhatsApp, every day."], ["دعم سريع", "رد خلال ساعتين على WhatsApp، كل يوم."], [["1", "400"], ["12", "4000"]]);

  // The owner's Studio store, blank, activated on Studio plan 1.
  await signIn(page, owner.email, owner.password);
  await page.goto("/studio/new");
  await page.getByRole("radio", { name: /^Store( |$)/ }).first().check();
  await page.getByLabel("Project name").fill("Nour Flowers");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: "Blank page" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/\/studio\/project$/, { timeout: 30_000 });

  await admin.goto(`/admin/clients?q=${encodeURIComponent(owner.email)}`);
  await admin.getByRole("link", { name: owner.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  const license = admin.getByRole("region", { name: "Nour Flowers" }).getByRole("region", { name: "Plan and license" });
  await license.getByLabel("Plan").selectOption("studio_1");
  await license.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");

  // The setup, to its end: "Publish it for me".
  await page.goto("/studio/project/setup?step=website");
  const api = (await page.locator("code").filter({ hasText: "/api/app/" }).first().textContent())!.trim();
  const appId = /\/api\/app\/([0-9a-f-]{36})/.exec(api)![1]!;
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page).toHaveURL(/step=branding$/);
  await page.getByLabel("Name under the app icon").fill("Nour");
  await page.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [255, 90, 31]) });
  await expect(page.getByText("Replace file").first()).toBeVisible();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page).toHaveURL(/step=listing$/);
  await page.getByLabel("Android package name").fill(`com.nourflowers${suffix}.app`);
  await page.getByLabel("iOS bundle ID").fill(`com.nourflowers${suffix}.app`);
  await page.getByLabel("Short description").fill("Fresh flowers delivered in Cairo.");
  await page.getByLabel("Full description").fill("Nour Flowers brings fresh bouquets, plants and gifts to your door, the same day, anywhere in Cairo and Giza.");
  await page.getByLabel("Support email").fill(`help-${suffix}@nourflowers.test`);
  await page.getByLabel("Privacy policy URL").fill("https://nourflowers.test/privacy");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page).toHaveURL(/step=publishing$/);
  const managed = page.getByRole("radio", { name: /Publish it for me/ });
  if (await managed.count()) await managed.check();
  await page.getByRole("button", { name: /^(Finish setup|Save & finish)$/ }).click();
  await page.waitForURL((url) => !url.search.includes("step=publishing"));
  await page.goto("/studio/project/publishing");
  const ask = page.getByRole("button", { name: "Publish it for me" });
  if (await ask.count()) await ask.click();

  // The owner's steps for Google Play and push notifications, and the listing's notes.
  await page.goto("/studio/project/publishing");
  const steps = page.getByRole("region", { name: "Your steps" });
  for (const title of ["Create your Google Play developer account", "Invite our team to Google Play Console"]) await steps.getByRole("checkbox", { name: `Done: ${title}` }).check();
  await steps.getByRole("radio", { name: "Create it for me" }).check();
  await steps.getByRole("button", { name: "Save checklist" }).click();
  await expect(steps.getByText(/^Saved/)).toBeVisible();
  const listing = page.getByRole("region", { name: "Store listing details" });
  await listing.getByLabel("For the content rating questions").fill("Flowers and gifts. No violence, chat or ads.");
  await listing.getByRole("button", { name: "Save listing details" }).click();
  await expect(listing.getByText(/^Saved/)).toBeVisible();

  // Our team: Google Play live, the App Store in review.
  await admin.goto("/admin/publishing");
  await admin.getByRole("link", { name: "Open Nour Flowers" }).click();
  const card = admin.getByRole("region", { name: `Nour Flowers (${owner.name})` });
  await card.getByLabel("Google Play status").selectOption("live");
  await card.getByLabel("Google Play link").fill(`https://play.google.com/store/apps/details?id=com.nourflowers${suffix}.app`);
  await card.getByRole("button", { name: "Save Google Play" }).click();
  await expect(card.getByText("Google Play is now “Live”.")).toBeVisible();
  await card.getByLabel("App Store status").selectOption("in_review");
  await card.getByRole("button", { name: "Save App Store" }).click();
  await expect(card.getByText(/App Store is now “In review”/)).toBeVisible();

  // Builds: the first didn't finish; Try again; the second is ready, with its files.
  const first = await buildOf(request, appId, 1);
  await request.post(`/api/v1/builds/${first.id}/status`, { headers: pipeline, data: { status: "building", stages: { android: "running" } } });
  await request.post(`/api/v1/builds/${first.id}/status`, { headers: pipeline, data: { status: "failed", stages: { android: "failed" }, message: "The Android app couldn't be built." } });
  await page.goto("/studio/project/builds");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Build #2 is queued.")).toBeVisible();
  const second = await buildOf(request, appId, 2);
  await request.post(`/api/v1/builds/${second.id}/status`, { headers: pipeline, data: { status: "building", stages: { android: "running" } } });
  await request.post(`/api/v1/builds/${second.id}/status`, {
    headers: pipeline,
    data: {
      status: "ready",
      stages: { android: "done", ios: "done", upload_play: "done", upload_testflight: "done" },
      artifacts: [
        { kind: "apk", url: `https://files.yallapp.com.tr/builds/${second.id}/app-release.apk` },
        { kind: "aab", url: `https://files.yallapp.com.tr/builds/${second.id}/app-release.aab` },
        { kind: "keystore", url: `https://files.yallapp.com.tr/builds/${second.id}/upload-key.zip` },
        { kind: "store_assets", url: `https://files.yallapp.com.tr/builds/${second.id}/store-assets.zip` },
      ],
    },
  });

  // Stability: a month of sessions and two problems.
  const report = (fingerprint: string, error: string, screen: string, version: string) => ({
    fingerprint,
    error,
    stack: "#0 CheckoutScreen.build (package:yallapp/modules/store/screens/checkout_screen.dart:88:5)",
    app_version: version,
    build_number: 2,
    platform: "android",
    os_version: "14",
    device: "phone",
    screen,
    at: new Date().toISOString(),
  });
  const crashes = `/api/app/${appId}/crashes`;
  const reports = [
    report(`a1${suffix}`.padEnd(32, "0").replace(/[^0-9a-f]/g, "a").slice(0, 32), "StateError: Bad state: No element", "/cart", "1.0.0"),
    report(`a1${suffix}`.padEnd(32, "0").replace(/[^0-9a-f]/g, "a").slice(0, 32), "StateError: Bad state: No element", "/cart", "1.0.0"),
    report(`b2${suffix}`.padEnd(32, "0").replace(/[^0-9a-f]/g, "b").slice(0, 32), "TimeoutException after 0:00:30.000000: Future not completed", "/checkout", "1.0.0"),
  ];
  expect((await request.post(crashes, { data: { reports, sessions: 412, crashed_sessions: 3 } })).status()).toBe(204);

  // The team: a staff member who joined, and an invitation waiting.
  await invite(page, staff.name, staff.email, "Orders & kitchen");
  await join(browser, staff.email, staff.name, staff.password);
  await invite(page, "Salma Fathy", `salma-b-${suffix}@studio.test`, "Catalog & content");

  // Two phones on Yallapp Business, one with its notifications.
  const iphone = (await (await request.post(`${ownerApi}/auth/sign-in`, { data: { email: owner.email, password: owner.password, device: { name: "Nour's iPhone 15", platform: "ios", app_version: "2.4.0" } } })).json()) as { access_token: string };
  await request.put(`${ownerApi}/me/push-token`, { headers: { authorization: `Bearer ${iphone.access_token}` }, data: { token: `fcm-token-${suffix}`, provider: "fcm" } });
  await request.post(`${ownerApi}/auth/sign-in`, { data: { email: owner.email, password: owner.password, device: { name: "Galaxy Tab S9", platform: "android", app_version: "2.3.1" } } });
  await admin.close();

  await language(page, "ar");
  // The empty state: Invoices before the first payment.
  await pageShots(page, "/studio/project/invoices", "invoices-empty");
  await pageShots(page, "/studio/project/publishing", "publishing");
  await pageShots(page, "/studio/project/builds", "builds");
  await pageShots(page, "/studio/project/stability", "stability");
  await pageShots(page, "/studio/project/addons", "addons");
  await pageShots(page, "/studio/team", "team");
  await pageShots(page, "/studio/project/phones", "phones");
  await pageShots(page, "/studio/project/announcements", "announcements");

  // What opens on demand (132.142 on): a member's drawer, the invite drawer, the long help behind "?".
  await page.goto("/studio/team");
  const member = page.locator(`[data-member="${staff.email}"] button[aria-haspopup=dialog]`);
  if (await member.count()) {
    await member.click();
    await shoot(page, "team-drawer-ar-light-desktop");
    await page.keyboard.press("Escape");
    await page.locator("[data-kit-header] button[aria-haspopup=dialog]").first().click();
    await shoot(page, "team-invite-ar-light-desktop");
    await page.keyboard.press("Escape");
    await page.goto("/studio/project/builds");
    await page.locator("[data-kit-header] button[aria-expanded]").first().click().catch(() => {});
    await page.goto("/studio/project/publishing");
    await page.locator("summary", { hasText: "متاجر Android تانية" }).click();
    await shoot(page, "publishing-more-stores-ar-light-desktop");
  }
  await language(page, "en");
});
