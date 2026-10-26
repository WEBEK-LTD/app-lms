import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * 96.2 A shop takes no cards, only a bank transfer and its own method (cash
 * on delivery): the customer picks one on the payment page and sees the
 * shop's details there and by email; the order waits on Orders until the
 * owner marks it paid (then the customer gets their receipt), or cancels it.
 * Yallapp never sees this money.
 */
test.describe.configure({ mode: "serial" });
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.197" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const shop = { name: "Harbour Atlases", email: `atlases-${suffix}@shop.test`, password: "atlases-strong-password-1" };
const buyer = `ada-${suffix}@example.com`;
const IBAN = "IBAN TR00 0001 0002 0003 0004 0005 06";
let api = "";

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

async function mailsTo(to: string) {
  const dir = path.resolve(E2E.mailDir);
  const files = (await readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith(".json"));
  const mails = (await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as { to: string; subject: string; text: string; sentAt: string }))).filter((m) => m.to === to);
  return mails.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

/** The customer checks out one atlas and fills in their details on the payment page. */
async function checkOut(page: Page, request: APIRequestContext) {
  const products = await (await request.get(`${api}/store/products`)).json();
  const checkout = await request.post(`${api}/store/checkout-link?platform=android`, { data: { lines: [{ product_id: products.items[0].id, quantity: 1 }] } });
  await page.goto(((await checkout.json()) as { url: string }).url);
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Mobile number").fill("+90 532 111 22 44");
  await page.getByLabel("Email").fill(buyer);
  await page.getByLabel("City").fill("Istanbul");
  await page.getByLabel("Address").fill("Moda Caddesi 12, Kadıköy");
}

test("a shop takes a bank transfer, marks it paid, and cancels an unpaid order", async ({ page, request }) => {
  test.setTimeout(180_000);
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(shop.name);
  await page.getByLabel("Email").fill(shop.email);
  await page.getByLabel("WhatsApp number").fill("+44 7700 900457");
  await page.getByLabel("Password", { exact: true }).fill(shop.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pending$/);

  await signIn(page, E2E.manualPayAdminEmail, E2E.adminPassword);
  await page.goto("/admin/clients");
  await page.getByRole("searchbox", { name: "Search clients" }).fill(shop.email);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: `Activate ${shop.name}` }).click();
  const panel = page.getByRole("complementary");
  await panel.getByLabel("Active until").fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(page.getByRole("status")).toContainText("Activated");

  await signIn(page, shop.email, shop.password);
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("I don't have a website").click();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();
  await page.getByRole("link", { name: "Products", exact: true }).click();

  // No card keys: the bank details and the shop's own method.
  const other = page.getByRole("region", { name: "Bank transfer and your own method" });
  await expect(other).toContainText("Yallapp never sees this money.");
  await other.getByLabel("Your own method's name").fill("Cash on delivery");
  await other.getByRole("button", { name: "Save payment methods" }).click();
  await expect(other.getByText("Write what the customer does to pay this way.")).toBeVisible();
  await other.getByLabel("Bank details").fill(`Harbour Atlases Ltd\n${IBAN}`);
  await other.getByLabel("What the customer does").fill("Pay the courier when your atlas arrives.");
  await other.getByRole("button", { name: "Save payment methods" }).click();
  await expect(other.getByText("Payment methods saved.")).toBeVisible();
  await expect(other.getByText("On: Bank transfer and Cash on delivery")).toBeVisible();
  // With these, the shop takes orders: no "can't pay" warning.
  await expect(page.getByText("can't pay for them until you set up")).toHaveCount(0);

  await page.getByRole("link", { name: "Add product" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Atlas of Harbours");
  await page.getByLabel("Price (TRY)", { exact: true }).fill("450");
  await page.locator('input[name="images"]').setInputFiles({ name: "atlas.png", mimeType: "image/png", buffer: solidPng(64, 64, [30, 80, 140]) });
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByRole("status")).toContainText("Saved “Atlas of Harbours”.");
  await page.getByRole("link", { name: /Atlas of Harbours/ }).click();
  const link = (await page.getByRole("link", { name: /\/shop\// }).textContent())!;
  api = `${E2E.baseURL}/api/app/${/\/shop\/([0-9a-f-]{36})\//.exec(link)![1]}`;

  // The customer chooses a bank transfer: the shop's details before and after placing the order.
  const customer = await page.context().browser()!.newPage({ extraHTTPHeaders });
  await checkOut(customer, request);
  await expect(customer.getByText("Card payments are processed securely")).toHaveCount(0);
  await customer.getByRole("radio", { name: "Bank transfer" }).check();
  await expect(customer.getByRole("note")).toContainText(IBAN);
  await customer.getByRole("button", { name: "Place order · ₺450.00" }).click();
  await expect(customer).toHaveURL(/\/pay\/[\w-]+\/order-received$/);
  await expect(customer.getByRole("heading", { name: "Order placed" })).toBeVisible();
  await expect(customer.getByText(IBAN)).toBeVisible();
  const placed = customer.url();
  // The payment page now leads to these details.
  await customer.goto(placed.replace(/\/order-received$/, ""));
  await expect(customer).toHaveURL(placed);

  await expect.poll(async () => (await mailsTo(buyer)).map((m) => m.subject)).toContainEqual(expect.stringMatching(/^Your order \d+ from .*: how to pay$/));
  expect((await mailsTo(buyer)).find((m) => m.subject.endsWith("how to pay"))!.text).toContain(IBAN);
  await expect.poll(async () => (await mailsTo(shop.email)).map((m) => m.subject)).toContainEqual(expect.stringMatching(/waiting for payment$/));

  // The owner sees it waiting, and marks it paid when the money arrives.
  await page.getByRole("link", { name: "Orders", exact: true }).click();
  const waiting = page.getByRole("region", { name: "Waiting for payment" });
  await expect(waiting.getByRole("listitem").filter({ hasText: "Ada Lovelace" })).toHaveCount(1);
  await expect(waiting).toContainText("Bank transfer");
  await waiting.getByRole("button", { name: "Mark as paid" }).click();
  await expect(page.getByRole("region", { name: "Waiting for payment" })).toHaveCount(0);
  const paid = page.getByRole("listitem").filter({ hasText: "Ada Lovelace" });
  await expect(paid).toHaveCount(1);
  await expect(paid).toContainText("Paid");
  await expect(paid.getByRole("link", { name: "Receipt (PDF)" })).toBeVisible();
  // The customer gets their receipt, and their page says so.
  await expect.poll(async () => (await mailsTo(buyer)).map((m) => m.subject)).toContainEqual(expect.stringMatching(/^Your receipt from /));
  await customer.goto(placed);
  await expect(customer.getByRole("heading", { name: "Thank you!" })).toBeVisible();

  // Cash on delivery, never paid: the owner cancels it.
  await checkOut(customer, request);
  await customer.getByRole("radio", { name: "Cash on delivery" }).check();
  await expect(customer.getByRole("note")).toContainText("Pay the courier when your atlas arrives.");
  await customer.getByRole("button", { name: "Place order · ₺450.00" }).click();
  await expect(customer.getByRole("heading", { name: "Order placed" })).toBeVisible();
  await customer.close();
  await page.reload();
  await expect(waiting).toContainText("Cash on delivery");
  await waiting.getByRole("button", { name: "Cancel order" }).click();
  await expect(page.getByRole("region", { name: "Waiting for payment" })).toHaveCount(0);
});
