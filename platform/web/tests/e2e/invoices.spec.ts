import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 95.2 Admin › Invoices: every invoice, and a new one for a client who paid
 * by bank transfer, which activates the plan and is emailed as a PDF.
 */
test.describe.configure({ mode: "serial" });
// Its own address: sign-ins from the shared one reach the per-IP limit when every spec runs in one 15-minute window.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.195" } });

const suffix = Date.now().toString(36);
const client = { name: "Hana Bakery", email: `hana-${suffix}@bakery.test`, password: "hana-strong-password-1" };
const reference = `FT${suffix.toUpperCase()}`;

interface SentMail {
  to: string;
  subject: string;
  text: string;
  attachments?: { filename: string; contentType: string; size: number }[];
}

async function mailsTo(email: string): Promise<SentMail[]> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as SentMail));
  return mails.filter((m) => m.to === email);
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

test("a client who paid by bank transfer gets an invoice that activates their plan", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(client.name);
  await page.getByLabel("Email").fill(client.email);
  await page.getByLabel("WhatsApp number").fill("+20 100 000 0195");
  await page.getByLabel("Password", { exact: true }).fill(client.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pending$/);
  await page.context().clearCookies();

  await signIn(page, E2E.invoicesAdminEmail, E2E.adminPassword);
  await page.getByRole("navigation", { name: "Super admin" }).getByRole("link", { name: "Invoices" }).click();
  await expect(page).toHaveURL(/\/admin\/invoices$/);
  const bank = page.getByRole("region", { name: "New invoice for a bank transfer" });
  await bank.getByLabel("Client's email").fill(`nobody-${suffix}@bakery.test`);
  await bank.getByRole("button", { name: "Find the client" }).click();
  await expect(bank).toContainText(`No client signed up with nobody-${suffix}@bakery.test.`);

  await bank.getByLabel("Client's email").fill(client.email);
  await bank.getByRole("button", { name: "Find the client" }).click();
  await expect(bank.getByRole("link", { name: client.name })).toBeVisible();
  // No app yet: the transfer pays for the one they make first.
  await expect(bank.getByLabel("App")).toHaveValue("");
  await expect(bank.getByLabel("App").locator("option:checked")).toHaveText("Their first app (not made yet)");
  await bank.getByLabel("Plan").selectOption("growth");
  await bank.getByLabel("Pays for").selectOption("12");
  await bank.getByLabel("Amount that arrived").fill("1500");
  await bank.getByLabel("Currency").selectOption("EGP");
  // The bank's reference is needed: it goes on the invoice.
  await bank.getByRole("button", { name: "Record the transfer and send the invoice" }).click();
  await expect(bank.getByText("Enter the bank's reference for the transfer.")).toBeVisible();
  await bank.getByLabel("Bank reference").fill(reference);
  await bank.getByRole("button", { name: "Record the transfer and send the invoice" }).click();

  await expect(page).toHaveURL(/\/admin\/invoices\?recorded=/);
  const notice = page.getByRole("status").filter({ hasText: "recorded" });
  await expect(notice).toContainText(/Invoice YA-[0-9A-F]{8} recorded: EGP\s1,500(\.00)? for the account's first app\. It's on Growth until/);
  await expect(notice).toContainText("The client got the invoice by email.");

  const row = page.locator('tr[data-invoice="bank"]').filter({ hasText: client.name });
  await expect(row).toContainText(`Bank transfer to Yallapp (reference ${reference})`);
  await expect(row).toContainText(`Recorded by ${E2E.invoicesAdminEmail}`);
  await expect(row).toContainText("Growth · 1 year");
  // Its PDF, as the client got it.
  const pdfHref = await row.getByRole("link", { name: "PDF" }).getAttribute("href");
  const pdf = await page.request.get(pdfHref!);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");

  // The filters: a bank transfer isn't a card payment.
  await page.getByRole("navigation", { name: "Show invoices" }).getByRole("link", { name: "Card" }).click();
  await expect(page.locator("tr[data-invoice]").filter({ hasText: client.name })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Show invoices" }).getByRole("link", { name: "Bank transfer" }).click();
  await expect(page.locator('tr[data-invoice="bank"]').filter({ hasText: client.name })).toHaveCount(1);

  // The client's page shows the plan it activated and the payment.
  await row.getByRole("link", { name: client.name }).click();
  await expect(page.getByRole("main")).toContainText("Growth");
  await expect(page.getByRole("main")).toContainText(`by bank transfer (${reference})`);

  // The client got the activation email with the invoice attached, saying how it was paid.
  await expect.poll(async () => (await mailsTo(client.email)).some((m) => (m.attachments ?? []).some((a) => a.contentType === "application/pdf"))).toBe(true);
  const mail = (await mailsTo(client.email)).find((m) => (m.attachments ?? []).length > 0)!;
  expect(mail.text).toMatch(/Paid: EGP\s1,500/);
  expect(mail.text).toContain("by bank transfer to Yallapp.");
});

test("the client finds the invoice on their Plan page, and it says how it was paid", async ({ page }) => {
  await signIn(page, client.email, client.password);
  // Activated: no longer waiting.
  await expect(page).not.toHaveURL(/\/pending$/);
  await page.goto("/dashboard/license");
  await page.getByRole("region", { name: "Payments" }).getByRole("link", { name: "Receipt", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/license\/receipts\//);
  await expect(page.getByRole("main")).toContainText(`Bank transfer to Yallapp (reference ${reference})`);
});
