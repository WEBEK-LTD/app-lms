import fs from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "../e2e/png";

/**
 * 132.170–132.179 Screenshots of group B's pages in Studio's console:
 * Publishing, Builds, Stability, Invoices, Add-ons, Team, Updates from
 * Yallapp and Your phones. A Studio store set up and published for its
 * owner (Google Play live, the App Store in review), two invoices recorded
 * by bank transfer, crash reports, the team's add-ons (one given with no
 * charge) and announcements, a team member and an invitation, two phones on
 * Yallapp Business; a regular app's builds (one that didn't finish, then a
 * ready one) on the dashboard's Builds. In Arabic, light and dark at
 * 1440×900 and light at 390 wide, PNG at twice the pixels, and each page
 * once with its inspector or a fold open. Not part of the test suite; run it
 * with `SCREENS_OUT=<dir> SCREENS_PREFIX=after npx playwright test --config
 * playwright.screens.config.ts studio-console-b` (SCREENS_PREFIX=before on
 * main: the opened states are skipped where the page has none).
 */
test.describe.configure({ mode: "serial" });

const OUT = process.env.SCREENS_OUT ?? path.resolve(__dirname, "../../test-results/screens");
const PREFIX = process.env.SCREENS_PREFIX ?? "after";
const suffix = Date.now().toString(36);
const owner = { name: "Nour Adel", email: `nour-cb-${suffix}@studio.test`, password: "nour-console-b-strong-password-1" };
const staff = { name: "Omar Hassan", email: `omar-cb-${suffix}@studio.test`, password: "omar-console-b-strong-password-1" };
const teamEmail = `publishing-${suffix}@yallapp.test`;
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.141" };
const pipeline = { authorization: `Bearer ${E2E.pipelineToken}` };
const ownerApi = `${E2E.baseURL}/api/owner/v1`;

test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: Number(process.env.SCREENS_SCALE ?? 2), extraHTTPHeaders, actionTimeout: 20_000, navigationTimeout: 60_000 });

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
  await page.waitForTimeout(800);
  fs.mkdirSync(path.join(OUT, "full"), { recursive: true });
  await page.screenshot({ path: path.join(OUT, `${PREFIX}-${name}.png`) });
  // A page taller than the browser can draw at twice the pixels is kept at once the pixels.
  await page.screenshot({ path: path.join(OUT, "full", `${PREFIX}-${name}.png`), fullPage: true }).catch(() => page.screenshot({ path: path.join(OUT, "full", `${PREFIX}-${name}.png`), fullPage: true, scale: "css" }).catch(() => undefined));
}

/** Opens what the page keeps closed (an inspector, a fold), or nothing where the page has none of it (main, before). */
async function opened(page: Page, href: string, name: string, open: (page: Page) => Promise<unknown>) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(href);
  try {
    await open(page);
  } catch {
    return;
  }
  await shoot(page, `${name}-ar-open-1440`);
}

async function language(page: Page, lang: "en" | "ar") {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/studio/project");
  await page
    .locator("[data-dashboard-languages] button", { hasText: lang === "ar" ? "العربية" : "English" })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
}

/** Arabic light and dark at the desktop width, then light on a phone. */
async function pageShots(page: Page, href: string, name: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(href);
  await shoot(page, `${name}-ar-light-1440`);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await shoot(page, `${name}-ar-dark-1440`);
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await shoot(page, `${name}-ar-light-390`);
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

async function addon(admin: Page, id: string, icon: string, en: [string, string], ar: [string, string], prices: [string, string][], quantity?: { limit: string; amount: string }) {
  await admin.goto("/admin/addons?addon=new");
  const form = admin.getByRole("form", { name: "New add-on" });
  await form.getByLabel("Id", { exact: true }).fill(id);
  await form.getByLabel("Type", { exact: true }).selectOption(quantity ? "quantity" : "service");
  if (quantity) {
    await form.getByLabel("Adds to").selectOption(quantity.limit);
    await form.getByLabel("How much one adds").fill(quantity.amount);
  }
  await form.getByLabel("Icon").selectOption(icon);
  await form.locator('input[name="enName"]').fill(en[0]);
  await form.locator('textarea[name="enDescription"]').fill(en[1]);
  if (await form.locator('input[name="arName"]').count()) {
    await form.locator("summary", { hasText: "In Arabic (optional)" }).click();
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

async function buildOf(request: APIRequestContext, appId: string, number: number): Promise<{ id: string; app_id: string; number: number }> {
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

test("group B's pages in Studio's console", async ({ page, browser, request }) => {
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
  await expect(plan.getByText(/^Studio plan 1 saved/)).toBeVisible();

  await admin.goto("/admin/settings/contact");
  const service = admin.getByRole("region", { name: "Publishing service" });
  await service.getByLabel("Publishing team email").fill(teamEmail);
  await service.getByRole("button", { name: "Save", exact: true }).click();
  await expect(service.getByText("Saved. Clients now see this address")).toBeVisible();

  await announce(admin, "Update", { en: ["Faster Android builds", "Android builds now take **half** the time."], ar: ["إصدارات Android أسرع", "إصدارات Android بقت بتاخد **نص** الوقت."] }, false);
  await announce(admin, "Maintenance", { en: ["Planned maintenance tonight", "Builds pause tonight from 22:00 to 23:00 UTC."], ar: ["صيانة مجدولة النهارده بالليل", "الإصدارات هتقف النهارده من 22:00 لـ 23:00 بتوقيت UTC."] }, true);
  await announce(admin, "Offer", { en: ["Store screenshots, on us this week", "This week only: our designers make your store screenshots when we publish your app."], ar: ["صور المتجر علينا الأسبوع ده", "الأسبوع ده بس: مصممينا هيعملوا صور المتجر بتاعتك لما ننشر تطبيقك."] }, true);

  await addon(admin, `shots-${suffix}`, "photo_camera", ["Store screenshots, designed", "Our designers make your store screenshots and feature graphic."], ["تصميم صور المتجر", "مصممينا بيعملوا صور المتجر وصورة العرض بتاعة تطبيقك."], [["once", "1500"]]);
  await addon(admin, `care-${suffix}`, "support_agent", ["Priority support", "A reply within 2 hours on WhatsApp, every day."], ["دعم سريع", "رد خلال ساعتين على WhatsApp، كل يوم."], [["1", "400"], ["12", "4000"]]);
  await addon(admin, `space-${suffix}`, "photo_library", ["5 GB more for media", "Five more gigabytes for your app's videos, pictures and PDFs."], ["5 جيجا زيادة للوسائط", "خمسة جيجا زيادة لفيديوهات وصور وملفات PDF بتاعة تطبيقك."], [["12", "600"]], { limit: "storageGb", amount: "5" });

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
  // The storage add-on, given with no charge.
  const give = admin.getByRole("form", { name: "Give an add-on" });
  await give.locator("#grant-addon").selectOption(`space-${suffix}`);
  await give.getByRole("button", { name: "Give with no charge" }).click();
  await expect(admin.locator("body")).toContainText("5 GB more for media");

  // Two invoices: bank transfers the team recorded.
  for (const [months, amount, reference] of [
    ["6", "1000", `NF-${suffix}-1`],
    ["12", "1800", `NF-${suffix}-2`],
  ] as const) {
    await admin.goto(`/admin/invoices?client=${encodeURIComponent(owner.email)}`);
    const bank = admin.getByRole("region", { name: "New invoice for a bank transfer" });
    await bank.getByLabel("App", { exact: true }).selectOption({ label: "Nour Flowers" });
    await bank.getByLabel("Plan", { exact: true }).selectOption("studio_1");
    await bank.getByLabel("Pays for").selectOption(months);
    await bank.getByLabel("Amount that arrived").fill(amount);
    await bank.getByLabel("Currency").selectOption("EGP");
    await bank.getByLabel("Bank reference").fill(reference);
    await bank.getByRole("button", { name: "Record the transfer and send the invoice" }).click();
    await expect(admin).toHaveURL(/\/admin\/invoices\?recorded=/);
  }

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
  // The account the stores' reviewers sign in with (builds wait for it).
  const review = page.getByRole("region", { name: "Store review account (required)" });
  if (await review.getByLabel("User name or email").count()) {
    await review.getByLabel("User name or email").fill(`review-${suffix}@nourflowers.test`);
    await review.getByLabel("Password", { exact: true }).fill("Review-pass-2026");
    await review.getByRole("button", { name: "Save the review account" }).click();
    await expect(review.getByText(/^Saved\. Enter it in Google Play Console/)).toBeVisible();
  }

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

  // Builds need an https address for the app's content (the build config's rule), which this test server's own Studio
  // content hasn't: a regular app on its owner's website shows the shared Builds page with its builds, in the dashboard.
  const lina = await (await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.143" }, viewport: { width: 1440, height: 900 }, deviceScaleFactor: Number(process.env.SCREENS_SCALE ?? 2) })).newPage();
  const academy = { name: "Lina Farouk", email: `lina-b-${suffix}@academy.test`, password: "lina-premium-b-strong-password-1", site: `https://lina-${suffix}.academy.test` };
  await lina.goto("/sign-up");
  await lina.getByLabel("Full name").fill(academy.name);
  await lina.getByLabel("Email").fill(academy.email);
  await lina.getByLabel("WhatsApp number").fill("+20 100 000 1402");
  await lina.getByLabel("Your website (optional)").fill(academy.site);
  await lina.getByLabel("Password", { exact: true }).fill(academy.password);
  await lina.getByRole("checkbox").check();
  await lina.getByRole("button", { name: "Create account" }).click();
  await lina.waitForURL((url) => url.pathname !== "/sign-up");
  await admin.goto(`/admin/clients?q=${encodeURIComponent(academy.email)}`);
  await admin.getByRole("link", { name: `Activate ${academy.name}` }).click();
  const linaPanel = admin.getByRole("complementary");
  await linaPanel.getByLabel("Plan").selectOption("pro");
  await linaPanel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await lina.goto("/dashboard/app-type");
  await lina.getByRole("button", { name: "Continue" }).click();
  await lina.getByRole("button", { name: "Save & continue" }).click();
  await lina.getByLabel("App name").fill("Lina Academy");
  await lina.getByLabel("Name under the app icon").fill("Lina");
  await lina.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [40, 90, 160]) });
  await expect(lina.getByText("Replace file")).toBeVisible();
  await lina.getByRole("button", { name: "Save & continue" }).click();
  await lina.getByLabel("Android package name").fill(`com.lina${suffix}.academy`);
  await lina.getByLabel("iOS bundle ID").fill(`com.lina${suffix}.academy`);
  await lina.getByLabel("Store title").fill("Lina Academy");
  await lina.getByLabel("Short description").fill("Arabic and English courses on your phone.");
  await lina.getByLabel("Full description").fill("Lina Academy brings every course, lesson and quiz to your phone, synced with our website.");
  await lina.getByLabel("Support email").fill(`help-${suffix}@lina.test`);
  await lina.getByLabel("Privacy policy URL").fill("https://lina.test/privacy");
  await lina.getByRole("button", { name: "Save & continue" }).click();
  await expect(lina.getByRole("heading", { name: "Publishing" })).toBeVisible();
  await lina.goto("/dashboard/publishing");
  await lina.getByRole("button", { name: "Publish it for me" }).click();
  await expect(lina).toHaveURL(/\/dashboard\/publishing\?chosen=managed$/);
  const linaReview = lina.getByRole("region", { name: "Store review account (required)" });
  await linaReview.getByLabel("User name or email").fill(`review-${suffix}@lina.test`);
  await linaReview.getByLabel("Password", { exact: true }).fill("Review-pass-2026");
  await linaReview.getByRole("button", { name: "Save the review account" }).click();
  await expect(linaReview.getByText(/^Saved\. Enter it in Google Play Console/)).toBeVisible();
  const linaApp = await lina.getByLabel("Current app").inputValue();
  // The first didn't finish; Try again; the second is ready, with its files.
  const first = await buildOf(request, linaApp, 1);
  await request.post(`/api/v1/builds/${first.id}/status`, { headers: pipeline, data: { status: "building", stages: { android: "running" } } });
  await request.post(`/api/v1/builds/${first.id}/status`, { headers: pipeline, data: { status: "failed", stages: { android: "failed" }, message: "The Android app couldn't be built." } });
  await lina.goto("/dashboard/builds");
  await lina.getByRole("button", { name: "Try again" }).click();
  await expect(lina.getByText("Build #2 is queued.")).toBeVisible();
  const second = await buildOf(request, linaApp, 2);
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
  await lina.goto("/dashboard");
  await lina.locator("[data-dashboard-languages]").getByRole("button", { name: "العربية" }).first().click();
  await expect(lina.locator("html")).toHaveAttribute("lang", "ar");
  await pageShots(lina, "/dashboard/builds", "builds-dashboard");
  await opened(lina, "/dashboard/builds", "builds-dashboard", (p) => p.locator('[data-build="2"] button[aria-haspopup=dialog]').click({ timeout: 5_000 }));
  await pageShots(lina, "/dashboard/publishing", "publishing-dashboard");
  await lina.context().close();
  await admin.close();

  await language(page, "ar");
  const row = (selector: string) => (p: Page) => p.locator(`${selector} button[aria-haspopup=dialog]`).first().click({ timeout: 5_000 });
  await pageShots(page, "/studio/project/publishing", "publishing");
  await opened(page, "/studio/project/publishing", "publishing", (p) => p.locator('[data-store-tile="android"]').click({ timeout: 5_000 }));
  // Builds before the first build: what it would trip over (the builds with their files: builds-dashboard).
  await pageShots(page, "/studio/project/builds", "builds-studio");
  await pageShots(page, "/studio/project/stability", "stability");
  await opened(page, "/studio/project/stability", "stability", row("[data-crash-issue]"));
  await pageShots(page, "/studio/project/invoices", "invoices");
  await opened(page, "/studio/project/invoices", "invoices", row("[data-invoice]"));
  await pageShots(page, "/studio/project/addons", "addons");
  await opened(page, "/studio/project/addons", "addons", (p) => p.locator("[data-kit-header] button[aria-controls]").first().click({ timeout: 5_000 }));
  await pageShots(page, "/studio/team", "team");
  await opened(page, "/studio/team", "team", row(`[data-member="${staff.email}"]`));
  await pageShots(page, "/studio/project/phones", "phones");
  await opened(page, "/studio/project/phones", "phones", row("[data-device]"));
  await pageShots(page, "/studio/project/announcements", "announcements");
  await opened(page, "/studio/project/announcements", "announcements", row("[data-update]"));
  // A phone with an inspector open: the drawer from the end side.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio/team");
  await row(`[data-member="${staff.email}"]`)(page).catch(() => {});
  await shoot(page, "team-ar-open-390");
  await language(page, "en");
});
