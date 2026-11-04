import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 114 Admin › Email campaigns: a campaign built from a template in the
 * builder (a block dragged in, a block changed), its audience narrowed to one
 * account, a test sent (YALLAPP_MAIL_DIR), scheduled and taken off the
 * schedule, then sent; the email carries the one-click unsubscribe headers
 * and its link's page unsubscribes the address.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Nour Bakery", email: `nour-${suffix}@bakery.test`, password: "nour-strong-password-1" };
const tester = `tester-${suffix}@yallapp.test`;
let admin: Page;
let campaignUrl = "";

interface SentMail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
  sentAt: string;
}

async function mailsTo(email: string): Promise<SentMail[]> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as SentMail));
  return mails.filter((m) => m.to === email).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

test.beforeAll(async ({ browser }) => {
  // The account the campaign goes to.
  const page = await browser.newPage();
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(client.name);
  await page.getByLabel("Email").fill(client.email);
  await page.getByLabel("WhatsApp number").fill("+90 544 000 01 14");
  await page.getByLabel("Your website (optional)").fill(`https://nour-${suffix}.shop.test`);
  await page.getByLabel("Password", { exact: true }).fill(client.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pending$/);
  await page.close();
  admin = await browser.newPage();
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.mailAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
});

test("builds a campaign from a template: drag a block in, change one", async () => {
  await admin.goto("/admin/email-campaigns");
  await admin.getByTestId("new-campaign").click();
  await admin.locator('[data-template="ready:welcome"]').getByRole("button", { name: "Use this design" }).click();
  await admin.waitForURL(/\/admin\/email-campaigns\/[0-9a-f-]+\?step=design/);
  campaignUrl = admin.url().split("?")[0]!;
  const canvas = admin.getByTestId("canvas");
  await expect(canvas.locator('[data-canvas-block="heading"]')).toHaveCount(1);
  // A block dragged from the library onto the email.
  await admin.locator('[data-block-type="coupon"]').dragTo(canvas.locator('[data-canvas-block="button"]').first());
  await expect(canvas.locator('[data-canvas-block="coupon"]')).toHaveCount(1);
  await admin.getByTestId("coupon-code").fill(`NOUR${suffix}`.toUpperCase());
  // The heading changed in its settings.
  await canvas.locator('[data-canvas-block="heading"]').click();
  await admin.getByTestId("heading-text").fill("Hi {{first_name|there}}, your bakery's app starts here");
  await expect(canvas).toContainText("your bakery's app starts here");
  await admin.getByRole("button", { name: "Undo (Ctrl+Z)" }).click();
  await admin.getByRole("button", { name: "Redo (Ctrl+Shift+Z)" }).click();
  await expect(canvas).toContainText("your bakery's app starts here");
  // Desktop and phone previews.
  await admin.getByTestId("preview-tab").click();
  await expect(admin.getByTestId("email-preview")).toBeVisible();
  await admin.getByTestId("device-phone").click();
  await expect(admin.getByTestId("save-state")).toHaveText(/Saved/, { timeout: 15_000 });
});

test("narrows the audience, sends a test, schedules it and takes it off", async () => {
  await admin.goto(`${campaignUrl}?step=audience`);
  await admin.getByTestId("audience-emails").fill(client.email);
  await expect(admin.getByTestId("audience-count")).toHaveText("1", { timeout: 15_000 });
  await admin.locator('[data-step="review"]').click();
  await expect(admin.getByTestId("ready")).toBeVisible({ timeout: 20_000 });
  await admin.getByTestId("test-to").fill(tester);
  await admin.getByTestId("send-test").click();
  await expect(admin.getByText("Test sent.")).toBeVisible({ timeout: 15_000 });
  const tests = await mailsTo(tester);
  expect(tests).toHaveLength(1);
  expect(tests[0]!.subject).toBe("[Test] Welcome to Yallapp, Mona");
  expect(tests[0]!.html).toContain("your bakery's app starts here");
  expect(tests[0]!.html).toContain(`NOUR${suffix}`.toUpperCase());
  // Scheduled for the day after tomorrow, in UTC.
  await admin.getByRole("radio", { name: "Later" }).click();
  const when = new Date(Date.now() + 2 * 86_400_000);
  await admin.getByTestId("schedule-at").fill(`${when.toISOString().slice(0, 10)}T10:30`);
  await admin.getByLabel("Time zone").selectOption("UTC");
  await admin.getByTestId("schedule").click();
  await expect(admin.getByText(/Scheduled for/)).toBeVisible({ timeout: 15_000 });
  await admin.goto("/admin/email-campaigns?show=scheduled");
  await expect(admin.locator("[data-campaign]")).toContainText("Welcome");
  await admin.goto(`${campaignUrl}?step=review`);
  await admin.getByRole("button", { name: "Take it off the schedule" }).click();
  await expect(admin.getByText("Taken off the schedule")).toBeVisible();
});

test("sends it; the email unsubscribes in one click", async () => {
  admin.once("dialog", (d) => d.accept());
  await admin.getByRole("radio", { name: "Now" }).click();
  await expect(admin.getByTestId("ready")).toBeVisible({ timeout: 20_000 });
  await admin.getByTestId("send-now").click();
  await admin.waitForURL(/\/report$/, { timeout: 30_000 });
  await expect.poll(async () => (await mailsTo(client.email)).filter((m) => m.subject.startsWith("Welcome")).length, { timeout: 30_000 }).toBe(1);
  const [mail] = (await mailsTo(client.email)).filter((m) => m.subject.startsWith("Welcome"));
  expect(mail!.subject).toBe("Welcome to Yallapp, Nour");
  expect(mail!.headers!["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  expect(mail!.headers!["List-Unsubscribe"]).toMatch(/\/api\/mail\/unsubscribe\//);
  expect(mail!.text).toContain("Yallapp · Cairo, Egypt");
  await admin.reload();
  await expect(admin.getByTestId("recipients")).toContainText(client.email);
  const link = /href="([^"]*\/unsubscribe\/[^"]+)"/.exec(mail!.html!)![1]!;
  const page = await admin.context().browser()!.newPage();
  await page.goto(new URL(link).pathname);
  await page.getByTestId("unsubscribe").click();
  await expect(page.getByText("You're unsubscribed")).toBeVisible();
  await page.close();
  await admin.goto("/admin/email-campaigns/never-mailed");
  await expect(admin.getByText(client.email)).toBeVisible();
});
