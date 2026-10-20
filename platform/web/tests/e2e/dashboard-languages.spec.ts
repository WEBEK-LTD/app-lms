import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 56 The client dashboard in Arabic and Turkish: a client switches to
 * Arabic and the whole dashboard reads right to left, with Arabic menus and
 * an Arabic validation message; the choice stays after signing out and in,
 * and in another browser, and their password email comes in Arabic. Turkish
 * works the same way. Our team member managing the dashboard sees it in
 * their own language, and the admin stays in English. On the memory store,
 * and on MariaDB with E2E_DATABASE_URL.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so its sign-up never uses up the shared sign-up limit of the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.56" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Cedar Academy", email: `cedar-${suffix}@school.test`, password: "cedar-strong-password-1" };
let clientId = "";
let admin: Page;
let own: Page;

interface SentMail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  sentAt: string;
}

/** The emails the server sent to this address, oldest first (YALLAPP_MAIL_DIR). */
async function mailsTo(email: string): Promise<SentMail[]> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as SentMail));
  return mails.filter((m) => m.to === email).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** A new browser, with nothing remembered from the others. */
async function freshPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ extraHTTPHeaders });
  return context.newPage();
}

const languages = (page: Page) => page.locator("[data-dashboard-languages]");
const html = (page: Page) => page.locator("html");

test.beforeAll(async ({ browser }) => {
  own = await freshPage(browser);
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 56");
  await own.getByLabel("Your website (optional)").fill(`https://cedar-${suffix}.school.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  admin = await freshPage(browser);
  await signIn(admin, E2E.dashboardLanguagesAdminEmail, E2E.adminPassword);
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  const panel = admin.getByRole("complementary");
  await panel.getByLabel("Plan").selectOption("starter");
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  clientId = new URL(admin.url()).searchParams.get("client") ?? "";
  expect(clientId).toMatch(/^[0-9a-f-]{36}$/);

  // An academy without a website, so the app setup's Branding step comes next.
  await own.goto("/dashboard/app-type");
  await own.getByText("Academy", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
});

test.afterAll(async () => {
  await own.context().close();
  await admin.context().close();
});

test("the client switches the dashboard to Arabic: right to left, with Arabic menus", async () => {
  await own.goto("/dashboard");
  await expect(html(own)).toHaveAttribute("lang", "en");
  await expect(languages(own).getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
  await languages(own).getByRole("button", { name: "العربية" }).click();

  await expect(html(own)).toHaveAttribute("dir", "rtl");
  await expect(html(own)).toHaveAttribute("lang", "ar");
  await expect(languages(own).getByRole("button", { name: "العربية" })).toHaveAttribute("aria-pressed", "true");
  const nav = own.getByRole("navigation", { name: "لوحة التحكم" });
  await expect(nav.getByRole("link", { name: "نظرة عامة" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "إعداد التطبيق" })).toBeVisible();
  await expect(own.getByRole("button", { name: "تسجيل الخروج" })).toBeVisible();
  // The sidebar is on the right.
  const box = await nav.boundingBox();
  const width = own.viewportSize()?.width ?? 1280;
  expect(box!.x).toBeGreaterThan(width / 2);
});

test("a form's validation message comes in Arabic", async () => {
  await own.goto("/dashboard/setup");
  await expect(own.getByRole("heading", { name: "الهوية" })).toBeVisible();
  await own.getByLabel("اسم التطبيق", { exact: true }).fill("");
  await own.getByRole("button", { name: "حفظ ومتابعة" }).click();
  await expect(own.getByText("أدخل اسم تطبيقك.")).toBeVisible();
  await expect(own.getByText("Enter your app name.")).toHaveCount(0);
});

test("the choice stays after signing out and in, in another browser, and in their emails", async ({ browser }) => {
  await own.getByRole("button", { name: "تسجيل الخروج" }).click();
  await expect(own).toHaveURL(/\/sign-in$/);
  await signIn(own, client.email, client.password);
  await own.waitForURL((url) => url.pathname.startsWith("/dashboard"));
  await expect(html(own)).toHaveAttribute("dir", "rtl");
  await expect(own.getByRole("navigation", { name: "لوحة التحكم" }).getByRole("link", { name: "نظرة عامة" })).toBeVisible();

  // Another browser has no cookie: the language comes from their account.
  const other = await freshPage(browser);
  await signIn(other, client.email, client.password);
  await other.waitForURL((url) => url.pathname.startsWith("/dashboard"));
  await expect(html(other)).toHaveAttribute("dir", "rtl");
  await expect(other.getByRole("navigation", { name: "لوحة التحكم" }).getByRole("link", { name: "إعداد التطبيق" })).toBeVisible();

  // Yallapp's emails to them follow it: a password link, asked for on the English page.
  await other.context().clearCookies();
  await other.goto("/forgot-password");
  await other.getByLabel("Email").fill(client.email);
  await other.getByRole("button", { name: "Send reset link" }).click();
  await expect(other.getByRole("status")).toBeVisible();
  await expect
    .poll(async () => (await mailsTo(client.email)).at(-1)?.subject)
    .toBe("إعادة تعيين كلمة مرور Yallapp");
  const mail = (await mailsTo(client.email)).at(-1)!;
  expect(mail.text).toContain("مرحبًا Cedar Academy،");
  expect(mail.text).toContain("/ar/reset-password?token=");
  expect(mail.html).toContain('dir="rtl"');
  await other.context().close();
});

test("Turkish works the same way, left to right", async () => {
  await own.goto("/dashboard/builds");
  await languages(own).getByRole("button", { name: "Türkçe" }).click();
  await expect(html(own)).toHaveAttribute("lang", "tr");
  await expect(html(own)).toHaveAttribute("dir", "ltr");
  await expect(own.getByRole("heading", { level: 1, name: "Derlemeler ve indirmeler" })).toBeVisible();
  await expect(own.getByRole("navigation", { name: "Panel" }).getByRole("link", { name: "Genel bakış" })).toBeVisible();
});

test("our team member sees the client's dashboard in their own language, and the admin stays English", async () => {
  await admin.goto(`/admin/clients/${clientId}`);
  await admin.getByRole("button", { name: "Edit their app settings" }).click();
  await expect(admin).toHaveURL(/\/dashboard$/);
  // The client chose Turkish; our team member hasn't chosen yet.
  await expect(html(admin)).toHaveAttribute("lang", "en");
  await languages(admin).getByRole("button", { name: "العربية" }).click();
  await expect(html(admin)).toHaveAttribute("dir", "rtl");
  await expect(admin.getByRole("button", { name: "العودة إلى الإدارة" })).toBeVisible();

  await admin.getByRole("button", { name: "العودة إلى الإدارة" }).click();
  await expect(admin).toHaveURL(/\/admin\/clients\//);
  await expect(html(admin)).toHaveAttribute("lang", "en");
  await expect(html(admin)).not.toHaveAttribute("dir", "rtl");
  await expect(admin.getByRole("button", { name: "Edit their app settings" })).toBeVisible();
  await admin.goto("/admin");
  await expect(html(admin)).toHaveAttribute("lang", "en");
  await expect(admin.getByRole("link", { name: "Clients" }).first()).toBeVisible();

  // The client's own choice didn't change.
  await own.reload();
  await expect(html(own)).toHaveAttribute("lang", "tr");
});
