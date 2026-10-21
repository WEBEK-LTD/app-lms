import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { totpCode, totpStep } from "../../src/lib/auth/totp";

/**
 * 70 Two-step sign-in and a real sign-out: a client turns it on from Your
 * account (a QR code drawn by the server, the key as text, 10 recovery
 * codes shown once, an email), signs in with the code after the password
 * (in Arabic too), with a recovery code once, and in Yallapp Business with
 * `otp`; a copied session cookie stops working after signing out; "Sign out
 * of all devices" ends every session and the phone; turning it off needs
 * the password and a code. Our team: the requirement for the whole team
 * (the owner sets theirs up first), a new team member made to set it up
 * before anything else, and a reset in the audit log.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so the sign-in limits per IP don't reach the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.170" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Rana Saleh", email: `rana-${suffix}@academy.test`, password: "rana-strong-password-1" };
const member = { name: "Tarek Team", email: `tarek-${suffix}@yallapp.test`, password: "tarek-strong-password-1" };
const owner = `${E2E.baseURL}/api/owner/v1`;
let admin: Page;
let adminSecret: string | null = null;
let adminCodes: string[] = [];
let required = false;

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

async function freshPage(browser: Browser): Promise<Page> {
  return (await browser.newContext({ extraHTTPHeaders })).newPage();
}

/** The next 30-second step's code: accepted (one step ahead) and newer than the one the setup used. */
const nextCode = (secret: string) => totpCode(secret, totpStep(new Date()) + 1);

async function signIn(page: Page, email: string, password: string, prefix = "") {
  await page.goto(`${prefix}/sign-in`);
  await page.getByLabel(prefix === "/ar" ? "البريد الإلكتروني" : "Email").fill(email);
  await page.getByLabel(prefix === "/ar" ? "كلمة المرور" : "Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: prefix === "/ar" ? "تسجيل الدخول" : "Sign in" }).click();
}

/**
 * Sets up two-step sign-in on the Your account page that is open; gives the
 * secret and the recovery codes. Every code typed counts against the 8 a
 * person may try in 15 minutes, so the client's journey tries few wrong ones.
 */
async function setUp(page: Page, options: { tryWrong?: boolean } = {}): Promise<{ secret: string; codes: string[] }> {
  const codeLabel = "Code";
  await page.getByRole("button", { name: "Set up two-step sign-in" }).click();
  await expect(page).toHaveURL(/setup=1/);
  const qr = page.getByRole("img", { name: "QR code to add Yallapp to your authenticator app" });
  await expect(qr).toBeVisible();
  const secret = (await page.locator("[data-two-step-secret]").getAttribute("data-two-step-secret"))!;
  expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  expect(await qr.getAttribute("data-qr")).toContain(`secret=${secret}`);
  if (options.tryWrong) {
    await page.getByLabel(codeLabel, { exact: true }).fill("000000");
    await page.getByRole("button", { name: "Turn on" }).click();
    await expect(page.getByText("That code isn't right.")).toBeVisible();
  }
  await page.getByLabel(codeLabel, { exact: true }).fill(totpCode(secret, totpStep(new Date())));
  await page.getByRole("button", { name: "Turn on" }).click();
  const list = page.locator("[data-recovery-codes] li");
  await expect(list).toHaveCount(10);
  const codes = await list.allTextContents();
  await page.getByRole("link", { name: "I've saved them" }).click();
  await expect(page.locator('[data-two-step="on"]')).toContainText("10 recovery codes left.");
  return { secret, codes };
}

test.afterAll(async () => {
  // Other specs share this server: the team's requirement goes, and so does this admin's own two-step sign-in.
  if (admin && required) {
    await admin.goto("/admin/team");
    await admin.getByRole("checkbox", { name: "Require two-step sign-in for the team" }).uncheck();
    await admin.getByRole("button", { name: "Save", exact: true }).click();
  }
  if (admin && adminSecret) {
    await admin.goto("/admin/account");
    await admin.locator("summary", { hasText: "Turn off two-step sign-in" }).click();
    await admin.locator("#f-currentPassword").fill(E2E.adminPassword);
    await admin.locator("#two-step-off-code").fill(adminCodes.pop() ?? nextCode(adminSecret));
    await admin.getByRole("button", { name: "Turn off" }).click();
    await expect(admin).toHaveURL(/twostep=off/);
  }
  await admin?.context().close();
});

test("70 a client turns on two-step sign-in and signs in with a code, in Arabic too", async ({ browser, request }) => {
  admin = await freshPage(browser);
  await signIn(admin, E2E.twoStepAdminEmail, E2E.adminPassword);
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));

  const own = await freshPage(browser);
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 01 70");
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");

  // English chosen for the dashboard: signing in from the Arabic page below keeps it.
  await own.goto("/dashboard");
  await Promise.all([own.waitForResponse((r) => r.request().method() === "POST"), own.locator("[data-dashboard-languages]").getByRole("button", { name: "English" }).click()]);
  // An app, so the overview opens; it suggests two-step sign-in until it is on.
  await own.goto("/dashboard/app-type");
  await own.getByText("Store", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await own.goto("/dashboard");
  await own.getByRole("link", { name: "Set it up" }).click();
  await expect(own).toHaveURL(/\/dashboard\/account#two-step$/);
  await expect(own.locator('[data-two-step="off"]')).toBeVisible();
  const { secret, codes } = await setUp(own);
  await expect.poll(async () => (await mailsTo(client.email)).map((m) => m.subject)).toContain("Two-step sign-in is on for your Yallapp account");
  await own.goto("/dashboard");
  await expect(own.getByRole("link", { name: "Set it up" })).toHaveCount(0);

  // Signing out ends the session on the server: a copy of its cookie opens nothing.
  const context = own.context();
  const session = (await context.cookies()).find((c) => c.name === "yallapp_session")!;
  await own.getByRole("button", { name: "Sign out" }).click();
  await expect(own).toHaveURL(/\/sign-in$/);
  await context.addCookies([session]);
  await own.goto("/dashboard");
  await expect(own).toHaveURL(/\/sign-in$/);

  // The password, then the code: a wrong one is refused, the next step's code signs in.
  await signIn(own, client.email, client.password);
  await expect(own).toHaveURL(/\/sign-in\/code$/);
  await expect(own.getByRole("heading", { level: 1, name: "Enter your code" })).toBeVisible();
  expect((await context.cookies()).some((c) => c.name === "yallapp_session")).toBe(false);
  await own.goto("/dashboard");
  await expect(own).toHaveURL(/\/sign-in$/);
  await own.goBack();
  await own.goto("/sign-in/code");
  await own.getByLabel("Code").fill("123456");
  await own.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(own.getByText("That code isn't right. Try again, or use a recovery code.")).toBeVisible();
  await own.getByLabel("Code").fill(nextCode(secret));
  await own.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(own).toHaveURL(/\/dashboard$/);

  // In Arabic, with a recovery code (once).
  await own.getByRole("button", { name: "Sign out" }).click();
  await signIn(own, client.email, client.password, "/ar");
  await expect(own).toHaveURL(/\/ar\/sign-in\/code$/);
  await expect(own.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(own.getByRole("heading", { level: 1, name: "أدخل الرمز" })).toBeVisible();
  await own.getByLabel("الرمز").fill(codes[0]!);
  await own.getByRole("button", { name: "تحقّق وسجّل الدخول" }).click();
  await expect(own).toHaveURL(/\/dashboard$/);

  // Yallapp Business asks for the code too (`otp`).
  const device = { name: "Rana's Pixel", platform: "android" };
  const asked = await request.post(`${owner}/auth/sign-in`, { data: { email: client.email, password: client.password, device }, headers: extraHTTPHeaders });
  expect(asked.status()).toBe(401);
  expect(((await asked.json()) as { code: string }).code).toBe("two_factor_required");
  const phone = await request.post(`${owner}/auth/sign-in`, { data: { email: client.email, password: client.password, otp: codes[1], device }, headers: extraHTTPHeaders });
  expect(phone.status()).toBe(200);
  const { access_token: access } = (await phone.json()) as { access_token: string };

  // Sign out of all devices: this browser, any other, and the phone.
  const other = await freshPage(browser);
  await signIn(other, client.email, client.password);
  await other.getByLabel("Code").fill(codes[2]!);
  await other.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(other).toHaveURL(/\/dashboard$/);
  await own.goto("/dashboard/account");
  await own.getByRole("button", { name: "Sign out everywhere" }).click();
  await expect(own).toHaveURL(/\/sign-in$/);
  await other.goto("/dashboard");
  await expect(other).toHaveURL(/\/sign-in$/);
  expect((await request.get(`${owner}/me`, { headers: { authorization: `Bearer ${access}` } })).status()).toBe(401);
  await other.context().close();

  // Turning it off needs the password and a code.
  await signIn(own, client.email, client.password);
  await own.getByLabel("Code").fill(codes[3]!);
  await own.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(own).toHaveURL(/\/dashboard$/);
  await own.goto("/dashboard/account");
  await expect(own.locator('[data-two-step="on"]')).toContainText("6 recovery codes left.");
  await own.locator("summary", { hasText: "Turn off two-step sign-in" }).click();
  await own.locator("#f-currentPassword").fill("not my password at all");
  await own.locator("#two-step-off-code").fill(codes[4]!);
  await own.getByRole("button", { name: "Turn off" }).click();
  await expect(own.getByText("The password is incorrect.")).toBeVisible();
  await own.locator("#f-currentPassword").fill(client.password);
  await own.locator("#two-step-off-code").fill(codes[4]!);
  await own.getByRole("button", { name: "Turn off" }).click();
  await expect(own).toHaveURL(/twostep=off/);
  await expect(own.getByRole("status").filter({ hasText: "Two-step sign-in is off." })).toBeVisible();
  await expect.poll(async () => (await mailsTo(client.email)).map((m) => m.subject)).toContain("Two-step sign-in is off for your Yallapp account");
  await own.context().close();
});

test("70 the team: the owner requires it, a new member sets it up first, and a reset is in the audit log", async ({ browser }) => {
  // The owner can't require it before having it.
  await admin.goto("/admin/team");
  await admin.getByRole("checkbox", { name: "Require two-step sign-in for the team" }).check();
  await admin.getByRole("button", { name: "Save", exact: true }).click();
  await expect(admin.getByRole("status")).toContainText("Turn on two-step sign-in for yourself first");

  await admin.getByRole("navigation", { name: "Super admin" }).getByRole("link", { name: "Your account" }).click();
  await expect(admin.getByRole("heading", { level: 1, name: "Your account" })).toBeVisible();
  const mine = await setUp(admin, { tryWrong: true });
  adminSecret = mine.secret;
  adminCodes = mine.codes;

  await admin.goto("/admin/team");
  await admin.getByRole("checkbox", { name: "Require two-step sign-in for the team" }).check();
  await admin.getByRole("button", { name: "Save", exact: true }).click();
  required = true;
  await expect(admin.getByRole("status")).toContainText("Two-step sign-in is now required");

  // A new team member: their first visit is Your account, and nothing else opens until it is on.
  const invite = admin.getByRole("complementary");
  await invite.getByLabel("Name", { exact: true }).fill(member.name);
  await invite.getByLabel("Email", { exact: true }).fill(member.email);
  await invite.getByRole("radio", { name: /^Support/ }).check();
  await invite.getByRole("button", { name: "Invite" }).click();
  const link = await invite.getByLabel("Set-password link").inputValue();
  const helper = await freshPage(browser);
  await helper.goto(link);
  await helper.getByLabel("New password", { exact: true }).fill(member.password);
  await helper.getByLabel("Repeat the new password").fill(member.password);
  await helper.getByRole("button", { name: "Save password and sign in" }).click();
  await expect(helper).toHaveURL(/\/admin\/account\?required=1$/);
  await expect(helper.getByRole("main").getByRole("alert")).toContainText("Set it up below to open the rest of the admin.");
  await helper.goto("/admin/clients");
  await expect(helper).toHaveURL(/\/admin\/account\?required=1$/);
  const theirs = await setUp(helper);
  await helper.goto("/admin/clients");
  await expect(helper).toHaveURL(/\/admin\/clients$/);

  // Signing in again asks for the code.
  await helper.getByRole("button", { name: "Sign out" }).click();
  await signIn(helper, member.email, member.password);
  await expect(helper).toHaveURL(/\/sign-in\/code$/);
  await helper.getByLabel("Code").fill(theirs.codes[0]!);
  await helper.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(helper).toHaveURL(/\/admin$/);

  // The owner resets it (a lost phone): logged, emailed, and the member sets it up again.
  await admin.goto("/admin/team");
  const row = admin.getByRole("row", { name: new RegExp(member.email) });
  await expect(row.getByText("On", { exact: true })).toBeVisible();
  await row.getByRole("button", { name: `Reset the two-step sign-in of ${member.email}` }).click();
  await expect(admin.getByRole("status")).toContainText("Their two-step sign-in was reset");
  await expect(admin.getByRole("row", { name: new RegExp(member.email) }).getByText("Off", { exact: true })).toBeVisible();
  await expect.poll(async () => (await mailsTo(member.email)).map((m) => m.subject)).toContain("Two-step sign-in is off for your Yallapp account");
  await helper.goto("/admin/clients");
  await expect(helper).toHaveURL(/\/admin\/account\?required=1$/);
  await admin.goto("/admin/audit");
  await expect(admin.getByRole("region", { name: "Log entries" }).getByRole("row", { name: /Team member's two-step sign-in reset/ }).first()).toContainText(
    `Reset the two-step sign-in of ${member.email}`,
  );
  await helper.context().close();
});
