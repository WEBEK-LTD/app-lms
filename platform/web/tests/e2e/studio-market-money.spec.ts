import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakeKashier, type FakeGateway } from "./fake-gateways";
import { solidPng } from "./png";

/**
 * 106.11 The designer's money, end to end: a designer sells a template's
 * lifetime plan at $400 through (a fake) Kashier; they see the sale with its
 * split ($100 Yallapp's, $300 theirs) and their balance, and enter their
 * checks (their ID and its photo, their bank for SWIFT) in the designer
 * area; the team approves them, sees the payout due, prepares and downloads
 * the bank file and marks the payout sent with the bank's reference; the
 * designer, now in Arabic, sees it paid out with its receipt (the page,
 * its PDF and the email in Arabic).
 */
test.describe.configure({ mode: "serial", timeout: 180_000 });

const suffix = Date.now().toString(36);
const designer = { name: "Nur Yılmaz", email: `money-designer-${suffix}@market.test`, password: "nur-money-strong-password-1" };
const buyer = { name: "Selim Owner", email: `money-buyer-${suffix}@market.test`, password: "selim-money-strong-password-1" };
const studio = `Studio Nur ${suffix}`;
const title = `Tulip Market ${suffix}`;
const IBAN = "TR330006100519786457841326";
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.241" };
const problems: string[] = [];
let kashier: FakeGateway;
let admin: Page;
let dz: Page;
let own: Page;
const month = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date());

interface SentMail {
  to: string;
  subject: string;
  text: string;
  sentAt: string;
  attachments?: { filename: string; contentType: string; size: number; base64: string }[];
}

async function mailsTo(email: string): Promise<SentMail[]> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as SentMail));
  return mails.filter((m) => m.to === email).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

async function page(browser: Browser): Promise<Page> {
  const p = await (await browser.newContext({ extraHTTPHeaders })).newPage();
  const browserNote = /was preloaded using link preload|WebGL|GL Driver Message/;
  const ours = () => /\/(?:dashboard\/studio-market|designer|admin\/market)(?:[/?#]|$)/.test(new URL(p.url()).pathname + "/");
  p.on("console", (m) => {
    if (ours() && (m.type() === "error" || m.type() === "warning") && !m.location().url.includes("/api/v1/fonts/") && !browserNote.test(m.text())) problems.push(`${m.type()} on ${p.url()}: ${m.text()}`);
  });
  p.on("pageerror", (e) => {
    if (ours()) problems.push(`pageerror on ${p.url()}: ${e.message}`);
  });
  return p;
}

async function signUp(p: Page, who: { name: string; email: string; password: string }, phone: string): Promise<void> {
  await p.goto("/sign-up");
  await p.getByLabel("Full name").fill(who.name);
  await p.getByLabel("Email").fill(who.email);
  await p.getByLabel("WhatsApp number").fill(phone);
  await p.getByLabel("Password", { exact: true }).fill(who.password);
  await p.getByRole("checkbox").check();
  await p.getByRole("button", { name: "Create account" }).click();
  await expect(p).toHaveURL(/\/start$/);
}

test.beforeAll(async ({ browser }) => {
  kashier = await startFakeKashier(E2E.kashierPort);
  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.marketMoneyAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
});

/** Yallapp's Kashier account and rate as they were (no keys, no rate), for the other specs. */
async function putSettingsBack(): Promise<void> {
  await admin.goto("/admin/settings/payments");
  const billing = admin.getByRole("region", { name: "Yallapp's plan payments" });
  await billing.getByLabel("EGP for 1 US dollar").fill("");
  await billing.getByRole("button", { name: "Save plan payments" }).click();
  await expect(billing.getByText(/Plans are paid through Yallapp's Kashier account\./)).toBeVisible();
  const keys = admin.getByRole("region", { name: "Yallapp's Kashier account" });
  if (await keys.getByRole("button", { name: "Remove keys" }).count()) await keys.getByRole("button", { name: "Remove keys" }).click();
  await expect(keys).toContainText("Now: not set.");
}

test.afterAll(async () => {
  await putSettingsBack().catch(() => undefined);
  await dz?.context().close();
  await own?.context().close();
  await admin?.close();
  await kashier?.close();
});

test("a designer's template sells its lifetime plan at $400 through Kashier", async ({ browser }) => {
  // Yallapp's Kashier account and the team's rate.
  await admin.goto("/admin/settings/payments");
  const k = admin.getByRole("region", { name: "Yallapp's Kashier account" });
  await k.getByLabel("Merchant ID").fill("MID-5252-525");
  await k.getByLabel("Payment API key").fill("kashier-test-api-key");
  await k.getByLabel("Secret key").fill("kashier-test-secret");
  await k.getByRole("button", { name: "Save keys" }).click();
  await expect(k.getByText("Kashier account saved.")).toBeVisible();
  const billing = admin.getByRole("region", { name: "Yallapp's plan payments" });
  await billing.getByLabel("EGP for 1 US dollar").fill("50");
  await billing.getByRole("button", { name: "Save plan payments" }).click();
  await expect(billing.getByText(/Plans are paid through Yallapp's Kashier account\./)).toBeVisible();

  // The designer joins and publishes a template, lifetime at $400.
  dz = await page(browser);
  await signUp(dz, designer, "+90 532 000 0241");
  await dz.goto("/designer/join");
  await dz.getByLabel("Your name as buyers see it").fill(studio);
  await dz.getByRole("button", { name: "Continue" }).click();
  await dz.getByLabel("Where you live and are paid").selectOption("TR");
  await dz.getByRole("button", { name: "Continue" }).click();
  await dz.getByRole("button", { name: "Read the full terms" }).click();
  await dz.getByRole("checkbox", { name: /I agree to the Studio Market designer terms/ }).check();
  await dz.getByRole("button", { name: "Agree and continue" }).click();
  await expect(dz).toHaveURL(/\/designer\/join\?joined=1$/);

  await dz.goto("/studio/new");
  await dz.getByRole("radio", { name: /^Store( |$)/ }).check();
  await dz.getByLabel("Project name").fill("Nur Flowers");
  await dz.getByRole("button", { name: "Next" }).click();
  await dz.getByRole("radio", { name: "Blank page" }).click();
  await dz.getByRole("button", { name: "Next" }).click();
  await expect(dz).toHaveURL(/\/studio\/project$/);
  await dz.goto("/studio/project/setup?step=website");
  await dz.getByRole("button", { name: "Save & continue" }).click();
  await expect(dz).toHaveURL(/step=branding$/);
  const ids = (await dz.locator('input[name="designChoice"]').evaluateAll((inputs) => inputs.map((i) => (i as HTMLInputElement).value))).filter(Boolean);
  await dz.locator(`input[name="designChoice"][value="${ids.find((id) => id.startsWith("studio-")) ?? ids[0]!}"]`).click();
  await dz.getByLabel("Name under the app icon").fill("Nur");
  await dz.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [200, 60, 90]) });
  await expect(dz.getByText("Replace file").first()).toBeVisible();
  await dz.getByRole("button", { name: "Save & continue" }).click();
  await expect(dz).toHaveURL(/step=listing$/);

  await dz.goto("/designer/publish");
  await dz.getByRole("button", { name: "Save and continue" }).click();
  await expect(dz).toHaveURL(/\/designer\/publish\?id=[0-9a-f-]+/);
  const texts = dz.locator("#step-texts");
  await texts.getByRole("textbox", { name: "Title", exact: true }).fill(title);
  await texts.getByRole("textbox", { name: "Short line", exact: true }).fill("Tulips by the bunch, delivered.");
  await texts.getByRole("textbox", { name: "Description", exact: true }).fill("A flower shop for the whole year.");
  await texts.getByRole("button", { name: "Save and continue" }).click();
  await expect(texts.getByText("Saved.")).toBeVisible();
  for (const id of ["#step-screens", "#step-kinds"]) {
    await dz.locator(id).getByRole("button", { name: "Save and continue" }).click();
    await expect(dz.locator(id).getByText("Saved.")).toBeVisible();
  }
  const plans = dz.locator("#step-plans");
  await plans.getByRole("switch", { name: /Free template/ }).uncheck();
  await plans.getByLabel("Price of Lifetime, in US dollars").fill("400");
  await expect(plans.locator('[data-plan-row="life"]')).toContainText("You get $300");
  await plans.getByRole("button", { name: "Save and continue" }).click();
  await expect(plans.getByText("Saved.")).toBeVisible();
  await dz.locator("#step-after").getByRole("button", { name: "Save and continue" }).click();
  await expect(dz.locator("#step-after").getByText("Saved.")).toBeVisible();
  await dz.reload();
  const send = dz.locator("#step-send");
  await send.getByRole("checkbox", { name: /every photo, font and icon/ }).check();
  await send.getByRole("button", { name: "Send for review" }).click();
  await expect(dz).toHaveURL(/\/designer\/templates\?sent=1$/);

  await admin.goto("/admin/market");
  await admin.getByRole("link", { name: new RegExp(title) }).click();
  await admin.getByRole("button", { name: "Approve and publish" }).click();
  await expect(admin.getByText("Approved and published. The designer was emailed.")).toBeVisible();

  // An owner buys it for good, to apply later: EGP 20,000 at the team's rate.
  own = await page(browser);
  await signUp(own, buyer, "+90 532 000 0242");
  await own.goto(`/dashboard/studio-market?q=${suffix}`);
  const slug = await own.locator("[data-template-card]").filter({ hasText: title }).getAttribute("data-template-card");
  await own.goto(`/dashboard/studio-market/checkout/${slug}?plan=life`);
  await own.locator('label[data-app="later"]').click();
  await expect(own.locator("[data-total]")).toHaveText("$400");
  await own.getByRole("checkbox", { name: /I understand this is digital content/ }).check();
  await own.getByRole("button", { name: "Pay $400" }).click();
  await expect(own.getByText("Total 20000.00 EGP")).toBeVisible();
  await own.getByRole("button", { name: "Pay with test card" }).click();
  await expect(own).toHaveURL(/\/dashboard\/studio-market\/mine\?done=/);
  await expect(own.getByText("Payment received. Apply it to one of your apps when you're ready.")).toBeVisible();
});

test("the designer sees the sale with its split and their balance, and enters their checks", async () => {
  await dz.goto("/designer/templates");
  await dz.getByRole("link", { name: "Earnings" }).click();
  await expect(dz).toHaveURL(/\/designer\/money$/);
  await expect(dz.getByRole("heading", { name: "Earnings", level: 1 })).toBeVisible();
  await expect(dz.locator('[data-money="available"] [data-cents]')).toHaveText("$300");
  await expect(dz.locator('[data-money="pending"] [data-cents]')).toHaveText("$0");
  await expect(dz.locator('[data-money="paid"] [data-cents]')).toHaveText("$0");
  await expect(dz.locator('[data-money="earned"]')).toContainText("From 1 sale");
  const sale = dz.locator("tr[data-sale]").filter({ hasText: title });
  await expect(sale).toContainText("Lifetime");
  await expect(sale).toContainText("Purchase");
  await expect(sale.locator("td").nth(3)).toHaveText("$400");
  await expect(sale.locator("td").nth(4)).toHaveText("$100");
  await expect(sale.locator("[data-you]")).toHaveText("$300");
  await expect(dz.locator("[data-checks]")).toContainText("Details needed");
  await expect(dz.locator("[data-next-payout]")).toContainText("Before your first payout, add your ID and bank details.");
  await expect(dz.getByText("No payouts yet.")).toBeVisible();

  await dz.getByRole("link", { name: "Add your payout details" }).click();
  await expect(dz).toHaveURL(/\/designer\/money\/details$/);
  await dz.getByLabel("Full name as on your ID").fill("Nur Yılmaz");
  await expect(dz.getByLabel("Country you live in")).toHaveValue("TR");
  await dz.getByRole("radio", { name: "National ID card" }).check();
  await dz.getByLabel("ID number").fill("12345678950");
  await dz.getByLabel("Photo or PDF of your ID").setInputFiles({ name: "id.png", mimeType: "image/png", buffer: solidPng(600, 380, [90, 120, 200]) });
  await dz.getByLabel("Name on the account").fill("Nur Yılmaz");
  await dz.getByLabel("Bank name").fill("Ziraat Bankası");
  // A mistyped IBAN (its check digits don't match), then right.
  await dz.getByLabel("IBAN or account number").fill("TR33 0006 1005 1978 6457 8413 27");
  await dz.getByLabel("SWIFT/BIC").fill("TCZBTR2A");
  await dz.getByLabel("Your address").fill("Moda Cd. 12, Kadıköy, 34710 İstanbul");
  await dz.getByRole("checkbox", { name: "These are my details and they're right." }).check();
  await dz.getByRole("button", { name: "Send to our team" }).click();
  await expect(dz.getByText("This IBAN isn't right: check its letters and numbers.")).toBeVisible();
  // Secrets aren't sent back to the page: the ID number and the account are typed again.
  await expect(dz.getByLabel("ID number")).toHaveValue("");
  await expect(dz.getByLabel("Name on the account")).toHaveValue("Nur Yılmaz");
  await dz.getByLabel("ID number").fill("12345678950");
  await dz.getByLabel("Photo or PDF of your ID").setInputFiles({ name: "id.png", mimeType: "image/png", buffer: solidPng(600, 380, [90, 120, 200]) });
  await dz.getByLabel("IBAN or account number").fill("TR33 0006 1005 1978 6457 8413 26");
  await dz.getByRole("checkbox", { name: "These are my details and they're right." }).check();
  await dz.getByRole("button", { name: "Send to our team" }).click();
  await expect(dz).toHaveURL(/\/designer\/money\?details=sent$/);
  await expect(dz.getByText("Sent to our team. We check them within 2 working days and email you.")).toBeVisible();
  await expect(dz.locator("[data-checks]")).toContainText("Being checked");

  // Saved masked: never the IBAN or the ID number in the page.
  await dz.goto("/designer/money/details");
  await expect(dz.getByText("Saved: TR33 •••• 1326. Leave it empty to keep it.")).toBeVisible();
  await expect(dz.getByText("Saved: •••• 8950. Leave it empty to keep it.")).toBeVisible();
  expect(await dz.content()).not.toContain(IBAN);
  expect(await dz.content()).not.toContain("12345678950");
});

test("the team approves the checks: full details and the ID only for the payouts permission", async ({ request }) => {
  await admin.goto("/admin/market/payouts");
  await expect(admin.locator("tr[data-waiting]").filter({ hasText: studio })).toContainText("Sent, to review");
  await admin.getByRole("link", { name: "Payout checks", exact: true }).first().click();
  await expect(admin).toHaveURL(/\/admin\/market\/payouts\/checks/);
  await admin.getByRole("link", { name: new RegExp(studio) }).click();
  const checks = admin.locator("section[data-checks]");
  await expect(checks.locator("[data-account]")).toHaveText(IBAN);
  await expect(checks.locator("[data-id-number]")).toHaveText("12345678950");
  // The ID document: a short signed link, for a signed-in team member only.
  const link = (await checks.getByRole("link", { name: /^Open \(picture/ }).getAttribute("href"))!;
  expect(link).toMatch(/^\/admin\/market\/payouts\/documents\/[0-9a-f-]{36}\?expires=\d+&sig=/);
  const opened = await admin.request.get(link);
  expect(opened.status()).toBe(200);
  expect(opened.headers()["content-type"]).toBe("image/png");
  expect(opened.headers()["cache-control"]).toContain("no-store");
  expect((await admin.request.get(link.replace(/sig=[^&]+/, "sig=forged"))).status()).toBe(404);
  // Signed out, or at the public asset address: nothing.
  expect((await request.get(link, { maxRedirects: 0 })).status()).not.toBe(200);
  const assetId = /documents\/([0-9a-f-]{36})/.exec(link)![1]!;
  expect((await request.get(`/api/v1/assets/${assetId}`)).status()).toBe(404);

  await checks.getByRole("button", { name: "Approve" }).click();
  await expect(admin.getByText("Approved. Their payouts can go out; they were emailed.")).toBeVisible();
  await expect.poll(async () => (await mailsTo(designer.email)).map((m) => m.subject)).toContain("Your payout details are approved");
  await admin.goto("/admin/audit");
  await expect(admin.getByText(`Approved the payout checks of “${studio}”`)).toBeVisible();
  await expect(admin.getByText(`Opened the ID document of “${studio}” for their payout checks`)).toBeVisible();
});

test("the designer switches to Arabic; the team prepares the bank file, downloads it and marks the payout sent", async () => {
  // In Arabic from now on: the designer area and the receipt email.
  await dz.goto("/designer/money");
  await dz.getByRole("button", { name: "العربية" }).first().click();
  await expect(dz.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(dz.getByRole("heading", { name: "أرباحك", level: 1 })).toBeVisible();
  await expect(dz.locator("[data-checks]")).toContainText("البيانات اتراجعت");
  await expect(dz.locator("[data-next-payout]")).toContainText("هيتحوّل في تحويل الشهر ده");

  await admin.goto("/admin/market/payouts");
  await expect(admin.getByRole("heading", { name: `Due in ${month}`, level: 2 })).toBeVisible();
  const due = admin.locator("tr[data-due]").filter({ hasText: studio });
  await expect(due).toContainText("$300");
  await expect(due).toContainText("TR33 •••• 1326");
  await admin.getByRole("button", { name: "Prepare the bank file" }).click();
  await expect(admin.getByText(/^Prepared \d+ payouts?: download the bank file/)).toBeVisible();
  const row = admin.locator("tr[data-processing]").filter({ hasText: studio });
  await expect(row).toContainText("$300");
  // The designer's balance is on its way.
  await dz.reload();
  await expect(dz.locator('[data-money="pending"] [data-cents]')).toHaveText("$300");
  await expect(dz.locator('[data-money="available"] [data-cents]')).toHaveText("$0");

  // The bank's file: the account in full, the amount with its cents.
  const [download] = await Promise.all([admin.waitForEvent("download"), admin.getByRole("link", { name: "Download the bank file (CSV)" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^yallapp-studio-market-payouts-\d{4}-\d{2}\.csv$/);
  const csv = await readFile((await download.path())!, "utf8");
  expect(csv.split("\r\n")[0]).toBe("﻿Payout ID,Designer,Beneficiary name,Beneficiary address,Beneficiary country,Account type,IBAN or account number,SWIFT/BIC,Bank code,Bank name,Bank country,Amount,Currency,Payment reference");
  const line = csv.split("\r\n").find((l) => l.includes(studio))!;
  expect(line).toContain(`,Nur Yılmaz,"Moda Cd. 12, Kadıköy, 34710 İstanbul",TR,IBAN,${IBAN},TCZBTR2A,,Ziraat Bankası,TR,300.00,USD,Yallapp Studio Market `);

  // Mark as sent: a reference too short first, then the bank's.
  await row.getByLabel("Bank reference").fill("x");
  await row.getByRole("button", { name: "Mark as sent" }).click();
  await expect(row.getByText("Enter the bank's reference for the transfer, 3 to 64 characters.")).toBeVisible();
  await row.getByLabel("Bank reference").fill(`SWIFT-${suffix}`);
  await row.getByRole("button", { name: "Mark as sent" }).click();
  await expect(admin.getByText("Marked as sent. The designer was emailed a receipt.")).toBeVisible();
  const sent = admin.locator("tr[data-sent]").filter({ hasText: studio });
  await expect(sent).toContainText(`SWIFT-${suffix}`);
  await expect(sent).toContainText("$300");
  await expect(sent).toContainText("Emailed");
  await expect(admin.locator("tr[data-processing]").filter({ hasText: studio })).toHaveCount(0);
  await admin.goto("/admin/audit");
  await expect(admin.getByText(/Downloaded the bank file: \d+ payouts?/).first()).toBeVisible();
  await expect(admin.getByText(`Marked the $300 payout to “${studio}” for ${new Date().toISOString().slice(0, 7)} sent (bank reference SWIFT-${suffix}, ${new Date().toISOString().slice(0, 10)})`)).toBeVisible();
});

test("the designer, in Arabic, sees it paid out and its receipt: the page, the PDF and the email", async () => {
  await dz.goto("/designer/money");
  await expect(dz.locator('[data-money="paid"] [data-cents]')).toHaveText("$300");
  await expect(dz.locator('[data-money="pending"] [data-cents]')).toHaveText("$0");
  await expect(dz.locator('[data-money="available"] [data-cents]')).toHaveText("$0");
  const payout = dz.locator("tr[data-payout]");
  await expect(payout).toHaveCount(1);
  await expect(payout).toContainText("اتبعت");
  await expect(payout).toContainText(`SWIFT-${suffix}`);
  await payout.getByRole("link", { name: "الإيصال" }).click();
  await expect(dz).toHaveURL(/\/designer\/money\/payouts\/[0-9a-f-]{36}$/);
  const receipt = dz.locator('section[data-receipt="sent"]');
  await expect(receipt).toContainText("$300.00");
  await expect(receipt).toContainText(`SWIFT-${suffix}`);
  await expect(receipt).toContainText("TR33 •••• 1326");
  await expect(receipt).toContainText("تحويل بنكي SWIFT");
  const pdf = await dz.request.get(`${new URL(dz.url()).pathname}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString("latin1")).toBe("%PDF-");
  // Another account can't open it.
  expect((await own.request.get(`${new URL(dz.url()).pathname}/pdf`)).status()).toBe(404);

  await expect.poll(async () => (await mailsTo(designer.email)).map((m) => m.subject)).toContain("دفعتك من ماركت Studio: $300.00");
  const mail = (await mailsTo(designer.email)).find((m) => m.subject.startsWith("دفعتك"))!;
  expect(mail.text).toContain(`مرجع البنك: SWIFT-${suffix}`);
  expect(mail.text).toContain("TR33 •••• 1326");
  expect(mail.text).not.toContain(IBAN);
  expect(mail.attachments?.[0]).toMatchObject({ contentType: "application/pdf" });
  expect(Buffer.from(mail.attachments![0]!.base64, "base64").subarray(0, 5).toString("latin1")).toBe("%PDF-");
  expect(problems).toEqual([]);
});

test("the team puts the payment settings back", async () => {
  await putSettingsBack();
});
