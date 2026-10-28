import { createHmac } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakeKashier, type FakeGateway } from "./fake-gateways";
import { solidPng } from "./png";

/**
 * Roadmap 47: a shop with its own Kashier keys takes an order and refunds
 * it from the dashboard, first in part, then the rest: Kashier gets the
 * refund call with the shop's secret key, the order follows and the
 * customer gets an email. Then the team edits what a plan includes and the
 * WordPress site on that plan gets the signed refresh (a fake site, through
 * LICENSE_REFRESH_TEST_URL).
 */
test.describe.configure({ mode: "serial" });
// Its own address, so its sign-ups never use up the shared sign-up limit of the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.247" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const shop = { name: "Garden City Books", email: `garden-${suffix}@shop.test`, password: "garden-strong-password-1" };
const site = { name: "Maadi Academy", email: `maadi-${suffix}@academy.test`, password: "maadi-strong-password-1" };
const customer = `reader-${suffix}@example.com`;
let kashier: FakeGateway;
let wordpress: Server;
const refreshes: { body: { timestamp: number; signature: string } }[] = [];
let admin: Page;

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

async function signUpAndActivate(page: Page, who: { name: string; email: string; password: string }, whatsapp: string, plan?: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(who.name);
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("WhatsApp number").fill(whatsapp);
  await page.getByLabel("Your website (optional)").fill(`https://${who.email.split("@")[0]}.example.test`);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pending$/);
  await admin.goto(`/admin/clients?q=${encodeURIComponent(who.email)}`);
  await admin.getByRole("link", { name: `Activate ${who.name}` }).click();
  const panel = admin.getByRole("complementary");
  if (plan) await panel.getByLabel("Plan").selectOption(plan);
  await panel.getByLabel("Active until").fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
}

test.beforeAll(async ({ browser }) => {
  kashier = await startFakeKashier(E2E.kashierPort);
  wordpress = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => {
      if (request.url === "/wp-json/yallapp/v1/license/refresh" && request.method === "POST") {
        refreshes.push({ body: JSON.parse(body) as { timestamp: number; signature: string } });
        response.writeHead(202, { "content-type": "application/json" }).end(JSON.stringify({ status: "active" }));
        return;
      }
      response.writeHead(404).end();
    });
  });
  await new Promise<void>((resolve) => wordpress.listen(E2E.wpRefreshPort, resolve));
  admin = await browser.newPage({ extraHTTPHeaders });
  await signIn(admin, E2E.refundsAdminEmail, E2E.adminPassword);
});

test.afterAll(async () => {
  await admin.close();
  await kashier.close();
  await new Promise<void>((resolve) => wordpress.close(() => resolve()));
});

test("a shop refunds an order in part, then the rest, through Kashier", async ({ page, request }) => {
  await signUpAndActivate(page, shop, "+20 122 765 4400");
  await signIn(page, shop.email, shop.password);
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("I don't have a website").click();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();
  await page.getByRole("link", { name: "Products", exact: true }).click();
  await page.getByLabel("Currency").selectOption("EGP");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Shop settings saved.")).toBeVisible();

  const payments = page.getByRole("region", { name: "Card payments" });
  await payments.getByLabel("Payment provider").selectOption("kashier");
  await payments.getByLabel("Merchant ID").fill("MID-7777-047");
  await payments.getByLabel("Payment API key").fill("garden-kashier-api-key");
  await payments.getByLabel("Secret key").fill("garden-kashier-secret");
  await payments.getByText("Test mode keys").click();
  await payments.getByRole("button", { name: "Save keys" }).click();
  await expect(payments.getByText("Kashier keys saved.")).toBeVisible();

  await page.getByRole("link", { name: "Add product" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Cairo Trilogy");
  await page.getByLabel("Price (EGP)", { exact: true }).fill("850");
  await page.locator('input[name="images"]').setInputFiles({ name: "book.png", mimeType: "image/png", buffer: solidPng(64, 64, [200, 170, 120]) });
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByRole("status")).toContainText("Saved “Cairo Trilogy”.");
  await page.getByRole("link", { name: /Cairo Trilogy/ }).click();
  const link = (await page.getByRole("link", { name: /\/shop\// }).textContent())!;
  const api = `${E2E.baseURL}/api/app/${/\/shop\/([0-9a-f-]{36})\//.exec(link)![1]}`;

  const products = await (await request.get(`${api}/store/products`)).json();
  const checkout = await request.post(`${api}/store/checkout-link?platform=android`, { data: { lines: [{ product_id: products.items[0].id, quantity: 2 }] } });
  const { url } = (await checkout.json()) as { url: string };
  await page.goto(url);
  await page.getByLabel("Full name").fill("Nour Adel");
  await page.getByLabel("Mobile number").fill("+20 100 222 3355");
  await page.getByLabel("Email").fill(customer);
  await page.getByLabel("City").fill("Cairo");
  await page.getByLabel("Address").fill("9 Road 9, Maadi");
  await page.getByRole("button", { name: "Pay E£1,700.00" }).click();
  await page.getByRole("button", { name: "Pay with test card" }).click();
  await expect(page).toHaveURL(/\/pay\/[\w-]+\/order-received$/);
  const session = kashier.calls.filter((c) => c.path === "/v3/payment/sessions").length;
  expect(session).toBeGreaterThan(0);

  // In part: 300 of 1,700.
  await signIn(page, shop.email, shop.password);
  await page.goto("/dashboard/orders");
  const order = page.getByRole("listitem").filter({ hasText: "Nour Adel" });
  await expect(order).toContainText("E£1,700.00");
  await order.locator("summary", { hasText: "Refund" }).click();
  const form = order.getByRole("form", { name: /^Refund order \d+$/ });
  await expect(form.getByLabel("Amount (EGP)")).toHaveValue("1700.00");
  await expect(form).toContainText("Refund it through Kashier now");
  await form.getByLabel("Amount (EGP)").fill("2000");
  await form.getByRole("button", { name: "Refund" }).click();
  await expect(form.getByText("That's more than what's left to refund.")).toBeVisible();
  await form.getByLabel("Amount (EGP)").fill("300");
  await form.getByLabel("Note (optional)").fill("Damaged cover");
  await form.getByRole("button", { name: "Refund" }).click();
  await expect(order.getByRole("status")).toHaveText("Refunded E£300.00.");
  expect(kashier.refunds).toHaveLength(1);
  expect(kashier.refunds[0]).toMatchObject({
    authorization: "garden-kashier-secret",
    body: { apiOperation: "REFUND", reason: "Damaged cover", transaction: { amount: 300 } },
  });
  expect(kashier.refunds[0]!.orderId).toMatch(/^KO-/);
  expect(String((kashier.refunds[0]!.body.transaction as Record<string, unknown>).targetTransactionId)).toMatch(/^TX-/);

  await page.reload();
  const after = page.getByRole("listitem").filter({ hasText: "Nour Adel" });
  await expect(after).toContainText("Refunded E£300.00 of E£1,700.00");
  await expect(after.getByRole("list", { name: "Refunds" })).toContainText(`Refunded E£300.00 on`);
  await expect(after.getByRole("list", { name: "Refunds" })).toContainText(`by ${shop.email}: The customer asked (Damaged cover) · through Kashier · reference RF-1`);
  await expect.poll(async () => (await mailsTo(customer)).map((m) => m.subject).join("\n")).toMatch(/refunded E£300\.00 of order \d+/);

  // The rest: the order is refunded.
  await after.locator("summary", { hasText: "Refund" }).click();
  const rest = after.getByRole("form", { name: /^Refund order \d+$/ });
  await expect(rest.getByLabel("Amount (EGP)")).toHaveValue("1400.00");
  await rest.getByRole("button", { name: "Refund" }).click();
  // The form goes with nothing left to refund; the refunds list says it all.
  await expect(after.getByRole("list", { name: "Refunds" }).getByRole("listitem")).toHaveCount(2);
  await page.reload();
  const done = page.getByRole("listitem").filter({ hasText: "Nour Adel" });
  await expect(done).toContainText("Refunded");
  await expect(done.getByRole("form", { name: /^Refund order/ })).toHaveCount(0);
  expect(kashier.refunds.map((r) => (r.body.transaction as Record<string, unknown>).amount)).toEqual([300, 1400]);
  // Two refund emails; 71 the order's receipt came first, when it was paid.
  await expect.poll(async () => (await mailsTo(customer)).filter((m) => / refunded /.test(m.subject)).length).toBe(2);
  expect((await mailsTo(customer)).filter((m) => /^Your receipt from .+ · order \d+$/.test(m.subject))).toHaveLength(1);

  // The team's audit log has both.
  await admin.goto("/admin/audit");
  await expect(admin.getByText(/Refunded E£1,400\.00 of order \d+ through Kashier: The customer asked/).first()).toBeVisible();
});

test("the team edits what a plan includes, and the WordPress site on it is asked to check its license", async ({ page, request }) => {
  await signUpAndActivate(page, site, "+20 100 765 4401", "business");
  await signIn(page, site.email, site.password);
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.goto("/dashboard/license");
  const key = (await page.getByLabel("License key").textContent())!.trim();
  const activated = await request.post("/api/v1/licenses/activate", {
    headers: { "x-forwarded-for": "203.0.113.248" },
    data: { license_key: key, site_url: `https://maadi-${suffix}.academy.test/`, plugin_version: "0.4.2", store: "woocommerce" },
  });
  expect(activated.status()).toBe(200);
  // A new app is a WordPress app until the owner picks another source; only the plan's edit is counted from here.
  const before = refreshes.length;

  await admin.goto("/admin/plans?plan=business");
  const form = admin.getByRole("form", { name: "Business: features and limits" });
  await form.getByRole("button", { name: "Save features and limits" }).click();
  await expect(form.getByText("Business: features and limits saved.")).toBeVisible();
  const signed = (r: (typeof refreshes)[number]) => r.body.signature === createHmac("sha256", key.toUpperCase()).update(`yallapp-license-refresh:${r.body.timestamp}`).digest("hex");
  await expect.poll(() => refreshes.slice(before).filter(signed).length, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
});
