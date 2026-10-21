import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 66 Deleting a Yallapp account: the public page Google Play and the App
 * Store link to (in English, Arabic and Turkish, in the footer, the legal
 * pages' menu and the privacy policy); an account waiting for activation asks
 * from the waiting page and cancels; once active, the owner asks from
 * Dashboard › Your account (a wrong password refused), their Yallapp
 * Business phone is signed out, our team is emailed, and marking it done in
 * Admin › Account deletion emails them.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so the sign-up and sign-in limits per IP don't reach the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.176" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Nadia Haddad", email: `nadia-${suffix}@academy.test`, password: "nadia-strong-password-1" };
const owner = `${E2E.baseURL}/api/owner/v1`;
let own: Page;
let admin: Page;

interface SentMail {
  to: string;
  subject: string;
  text: string;
  sentAt: string;
}

/** The emails the server sent to this address, oldest first (YALLAPP_MAIL_DIR). */
async function mailsTo(email: string): Promise<SentMail[]> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as SentMail));
  return mails.filter((m) => m.to === email).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

async function freshPage(browser: Browser): Promise<Page> {
  return (await browser.newContext({ extraHTTPHeaders })).newPage();
}

test.afterAll(async () => {
  await own?.context().close();
  await admin?.context().close();
});

test("66 the public page, in every language, linked from the footer and the privacy policy", async ({ page }) => {
  await page.goto("/delete-account");
  await expect(page.getByRole("heading", { level: 1, name: "Deleting your Yallapp account" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What we keep, and for how long" })).toBeVisible();
  await expect(page.getByRole("link", { name: "info@yallapp.com.tr" }).first()).toHaveAttribute("href", "mailto:info@yallapp.com.tr");
  await expect(page.getByRole("navigation", { name: "Legal pages" }).getByRole("link", { name: "Delete your account" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Delete your account" })).toHaveAttribute("href", "/delete-account");
  await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveAttribute("href", /\/ar\/delete-account$/);

  await page.goto("/ar/delete-account");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1, name: "حذف حسابك في Yallapp" })).toBeVisible();
  await page.goto("/tr/delete-account");
  await expect(page.getByRole("heading", { level: 1, name: "Yallapp hesabınızı silme" })).toBeVisible();

  await page.goto("/privacy");
  await expect(page.getByRole("article").getByRole("link", { name: "Deleting your Yallapp account" })).toHaveAttribute("href", "/delete-account");
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(`${E2E.baseURL}/delete-account`);
  expect(sitemap).toContain(`${E2E.baseURL}/tr/delete-account`);
});

test("66 an account waiting for activation asks from the waiting page, and cancels", async ({ browser }) => {
  own = await freshPage(browser);
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 01 67");
  await own.getByLabel("Your website (optional)").fill(`https://nadia-${suffix}.academy.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  await own.locator("summary", { hasText: "Delete my account" }).click();
  await own.getByLabel("Type your email address to confirm").fill(client.email);
  await own.getByLabel("Your password").fill(client.password);
  await own.getByRole("button", { name: "Delete my account" }).click();
  await expect(own).toHaveURL(/\/pending\?deletion=requested/);
  await expect(own.getByRole("status").filter({ hasText: "Your request was sent." })).toBeVisible();
  await expect(own.locator('[data-deletion="pending"]')).toContainText("Your account will be deleted");
  await expect.poll(async () => (await mailsTo(client.email)).map((m) => m.subject)).toContain("We received your request to delete your Yallapp account");

  await own.getByRole("button", { name: "Cancel the request" }).click();
  await expect(own).toHaveURL(/\/pending\?deletion=cancelled/);
  await expect(own.getByRole("status").filter({ hasText: "Your request was cancelled." })).toBeVisible();
  await expect(own.locator('[data-deletion="pending"]')).toHaveCount(0);
});

test("66 the owner asks from Your account, their phone is signed out, and our team marks it done", async ({ browser, request }) => {
  admin = await freshPage(browser);
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.accountDeletionAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");

  // Signed in to Yallapp Business.
  const signedIn = await request.post(`${owner}/auth/sign-in`, { data: { email: client.email, password: client.password, device: { name: "Nadia's Pixel", platform: "android" } } });
  expect(signedIn.status()).toBe(200);
  const { access_token: access } = (await signedIn.json()) as { access_token: string };
  expect((await request.get(`${owner}/me`, { headers: { authorization: `Bearer ${access}` } })).status()).toBe(200);

  await own.goto("/dashboard/account");
  await expect(own.getByRole("heading", { level: 1, name: "Your account" })).toBeVisible();
  await expect(own.getByRole("navigation").getByRole("link", { name: "Your account" })).toBeVisible();
  await own.getByLabel("Type your email address to confirm").fill(client.email);
  await own.getByLabel("Your password").fill("not-the-password");
  await own.getByRole("button", { name: "Delete my account" }).click();
  await expect(own.getByText("The password is incorrect.")).toBeVisible();

  await own.getByLabel("Your password").fill(client.password);
  await own.getByLabel("Why are you leaving? (optional)").fill("We're moving to another platform.");
  await own.getByRole("button", { name: "Delete my account" }).click();
  await expect(own).toHaveURL(/\/dashboard\/account\?deletion=requested&phones=1/);
  await expect(own.getByRole("status").filter({ hasText: "1 phone was signed out of Yallapp Business" })).toBeVisible();
  expect((await request.get(`${owner}/me`, { headers: { authorization: `Bearer ${access}` } })).status()).toBe(401);
  // In Arabic, the same page.
  await own.getByRole("button", { name: "العربية" }).click();
  await expect(own.getByRole("heading", { level: 1, name: "حسابك" })).toBeVisible();
  await expect(own.locator('[data-deletion="pending"]')).toContainText("سيُحذف حسابك");
  await own.getByRole("button", { name: "English" }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Your account" })).toBeVisible();

  await admin.goto("/admin/account-deletion");
  const card = admin.locator("section", { hasText: client.email }).first();
  await expect(card).toContainText("We're moving to another platform.");
  await expect(card).toContainText("Build folders");
  // 73 Carried out by the daily job after 7 days, or now.
  await expect(card).toContainText("deleted automatically after");
  await card.getByRole("button", { name: "Delete now" }).click();
  await expect(card.getByText("Tick this to delete the account now.")).toBeVisible();
  await card.getByRole("checkbox").check();
  await card.getByRole("button", { name: "Delete now" }).click();
  await expect(admin).toHaveURL(/\/admin\/account-deletion\?closed=done/);
  await expect(admin.getByRole("status")).toContainText("The account was deleted, its billing records kept, and the person who asked was emailed.");
  await expect(admin.locator("section", { hasText: client.email })).toHaveCount(0);
  await expect.poll(async () => (await mailsTo(client.email)).map((m) => m.subject)).toContain("Your Yallapp account was deleted");
  await admin.goto("/admin/account-deletion?show=done");
  await expect(admin.locator("section", { hasText: client.email }).first()).toContainText("Done");
  // The account is gone: its owner can't sign in any more, and their session ended.
  await own.goto("/dashboard/account");
  await expect(own).toHaveURL(/\/sign-in/);
  await own.goto("/sign-in");
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("button", { name: "Sign in" }).click();
  await expect(own.getByText("The email or password is incorrect.")).toBeVisible();
});
