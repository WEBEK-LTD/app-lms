import { readdir, readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";
import { expectReceiptAttached, pdfBehind } from "./receipts";

/**
 * A Charity & donations app (roadmap 29): the charity adds its own iyzico
 * keys and a campaign, a supporter donates on the donation page (against a
 * fake iyzico), the campaign's total moves only once the payment is
 * confirmed, the donor gets a receipt, and the dashboard lists the donation,
 * exports it and shows the donor. iPhone apps always get the browser.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Bereket Food Bank", email: `bereket-${suffix}@charity.test`, password: "bereket-strong-password-1" };
const donor = { name: "Elif Yilmaz", email: `elif-${suffix}@example.com` };
let own: Page;
let server: Server;
let api = "";
let campaignId = 0;
const payments = new Map<string, { callbackUrl: string; basketId: string; price: string }>();
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.74" };

test.beforeAll(async ({ browser }) => {
  const base = `http://localhost:${E2E.iyzicoPort}`;
  server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => {
      const url = new URL(request.url ?? "/", base);
      const send = (json: unknown) => response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(json));
      if (url.pathname === "/payment/bin/check") return send({ status: "success" });
      if (url.pathname.endsWith("/checkoutform/initialize/auth/ecom")) {
        const input = JSON.parse(body) as { callbackUrl: string; basketId: string; price: string };
        const token = `iyzi-gift-${payments.size + 1}`;
        payments.set(token, input);
        return send({ status: "success", token, paymentPageUrl: `${base}/pay?token=${token}` });
      }
      if (url.pathname.endsWith("/checkoutform/auth/ecom/detail")) {
        const { token } = JSON.parse(body) as { token: string };
        const payment = payments.get(token)!;
        return send({ status: "success", paymentStatus: "SUCCESS", paymentId: "9001", paidPrice: Number(payment.price), basketId: payment.basketId });
      }
      if (url.pathname === "/pay") {
        const token = url.searchParams.get("token")!;
        response.writeHead(200, { "content-type": "text/html" }).end(
          `<!doctype html><title>iyzico</title><form method="post" action="${payments.get(token)!.callbackUrl}"><input type="hidden" name="token" value="${token}"><button>Pay with test card</button></form>`,
        );
        return;
      }
      response.writeHead(404).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(E2E.iyzicoPort, resolve));

  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 74");
  await own.getByLabel("Your website (optional)").fill(`https://bereket-${suffix}.charity.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.charityAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();
});

test.afterAll(async () => {
  await own.close();
  await new Promise((resolve) => server.close(resolve));
});

/** The emails captured for this address (YALLAPP_MAIL_DIR), oldest first. */
async function mailsTo(to: string): Promise<{ to: string; subject: string; text: string; sentAt: string }[]> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = (await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as { to: string; subject: string; text: string; sentAt: string }))).filter(
    (m) => m.to === to,
  );
  return mails.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

test("the charity picks Charity & donations and adds its own iyzico keys", async () => {
  await own.goto("/dashboard/app-type");
  await own.getByText("Charity & donations", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  // Hosted only: campaigns managed in Yallapp.
  await expect(own.getByText("My WordPress site")).toHaveCount(0);
  await own.getByText("Campaigns managed in Yallapp").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
  expect(api).toMatch(/\/api\/app\/[0-9a-f-]{36}$/);

  await own.getByRole("link", { name: "Campaigns", exact: true }).click();
  // Before the keys: a setup step, and no "sell through Yallapp" for donations.
  await expect(own.getByText("nobody can donate until your payment keys are saved")).toBeVisible();
  await expect(own.getByText("Sell through Yallapp")).toHaveCount(0);
  await own.getByLabel("API key").fill("sandbox-api-key");
  await own.getByLabel("Secret key").fill("sandbox-secret-key");
  await own.getByText("Sandbox keys").click();
  await own.getByRole("button", { name: "Save keys" }).click();
  await expect(own.getByText("On · your iyzico account · sandbox (test payments)")).toBeVisible();
});

test("a campaign with a goal, suggested amounts and a picture, published", async ({ request }) => {
  await own.getByRole("link", { name: "Add a campaign" }).click();
  await own.getByLabel("Title").fill("Winter food parcels");
  await own.getByLabel("Story").fill("Every winter more families come to our centres.\n\nA parcel feeds a family for two weeks.\n\n<script>alert(1)</script>");
  await own.getByLabel("Goal (TRY)").fill("50000");
  await own.getByLabel("Smallest donation (TRY)").fill("20");
  await own.getByLabel("Suggested amounts (TRY)").fill("10, 300");
  await own.getByRole("button", { name: "Publish" }).click();
  await expect(own.getByText("Every suggested amount must be at least the smallest donation.")).toBeVisible();
  await own.getByLabel("Suggested amounts (TRY)").fill("150, 300, 600");
  await own.getByRole("checkbox", { name: "Let people type their own amount" }).uncheck();
  await own.getByLabel("Add pictures").setInputFiles({ name: "parcels.png", mimeType: "image/png", buffer: solidPng(64, 36, [200, 150, 90]) });
  await own.getByRole("button", { name: "Publish" }).click();
  await expect(own.getByRole("status")).toContainText("Published “Winter food parcels”.");
  await expect(own.getByRole("link", { name: /Winter food parcels/ })).toContainText("₺0.00 of ₺50,000.00");

  const config = await (await request.get(`${api}/config?platform=ios&app_version=1.0.0`)).json();
  expect(config).toMatchObject({ vertical: "charity", donations: { currency: "TRY", ios_mode: "browser", monthly: false, updates_push: false } });
  const list = await (await request.get(`${api}/donations/campaigns`)).json();
  expect(list.items).toHaveLength(1);
  campaignId = list.items[0].id;
  expect(list.items[0]).toMatchObject({ title: "Winter food parcels", goal: "50000.00", raised: "0.00", donor_count: 0, progress: 0, status: "open" });
  expect(list.items[0].image_url).toContain("/api/v1/assets/");
  const campaign = await (await request.get(`${api}/donations/campaigns/${campaignId}`)).json();
  expect(campaign).toMatchObject({ preset_amounts: ["150.00", "300.00", "600.00"], min_amount: "20.00", allow_custom_amount: false, render_mode: "native" });
  expect(campaign.html).not.toContain("script");
});

test("iPhone links always open in the browser; Android in the app", async ({ request }) => {
  const ios = await request.post(`${api}/donations/checkout-link?platform=ios`, { data: { campaign_id: campaignId, amount: "150" } });
  expect(ios.status()).toBe(200);
  expect((await ios.json()).open_in).toBe("browser");
  const android = await request.post(`${api}/donations/checkout-link?platform=android`, { data: { campaign_id: campaignId, amount: "150" } });
  expect((await android.json()).open_in).toBe("in_app");
  const custom = await request.post(`${api}/donations/checkout-link?platform=android`, { data: { campaign_id: campaignId, amount: "200" } });
  expect(custom.status()).toBe(400);
  const monthly = await request.post(`${api}/donations/checkout-link?platform=android`, { data: { campaign_id: campaignId, amount: "150", recurring: "monthly" } });
  expect(monthly.status()).toBe(400);
});

test("a supporter donates; the campaign moves once iyzico confirms, with a receipt", async ({ page, request }) => {
  const link = await request.post(`${api}/donations/checkout-link?platform=ios`, {
    data: { campaign_id: campaignId, amount: "300", anonymous: true, message: "Stay warm" },
  });
  const { url } = (await link.json()) as { url: string };
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Your donation" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Winter food parcels" })).toContainText("₺300.00");
  await page.getByLabel("Full name").fill(donor.name);
  await page.getByLabel("Email").fill(donor.email);
  await page.getByLabel("City").fill("Izmir");
  await page.getByRole("button", { name: "Donate ₺300.00" }).click();

  // On iyzico's page: nothing counted yet.
  await expect(page.getByRole("button", { name: "Pay with test card" })).toBeVisible();
  expect((await (await request.get(`${api}/donations/campaigns/${campaignId}`)).json()).raised).toBe("0.00");
  await page.getByRole("button", { name: "Pay with test card" }).click();
  await expect(page).toHaveURL(/\/give\/[\w-]+\/thank-you$/);
  await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();

  const after = await (await request.get(`${api}/donations/campaigns/${campaignId}`)).json();
  expect(after).toMatchObject({ raised: "300.00", donor_count: 1, recent_donations: [{ name: null, amount_formatted: "₺300.00", message: "Stay warm" }] });

  const receipt = (await mailsTo(donor.email)).at(-1)!;
  expect(receipt.subject).toMatch(/^Your donation to .+ · D-\d+$/);
  expect(receipt.text).toContain("Amount: ₺300.00");
  expect(receipt.text).not.toMatch(/tax/i);
  const receiptUrl = /(https?:\/\/\S+\/receipts\/\S+)/.exec(receipt.text)![1]!;
  await page.goto(new URL(new URL(receiptUrl).pathname, E2E.baseURL).toString());
  await expect(page.getByRole("heading", { name: "Donation receipt" })).toBeVisible();
  await expect(page.getByText(donor.name)).toBeVisible();
  // 71 The receipt as a PDF: on its page, and attached to the email.
  await pdfBehind(page, "Download PDF", page.locator("main"));
  await expectReceiptAttached(donor.email, /^Your donation to .+ · D-\d+$/);
});

test("the dashboard lists the donation, exports it and shows the donor", async () => {
  await own.goto("/dashboard/donations");
  const row = own.getByRole("row").filter({ hasText: donor.email });
  await expect(row).toContainText("₺300.00");
  await expect(row).toContainText("Anonymous");
  await expect(row).toContainText("Stay warm");

  const csv = await own.request.get("/api/dashboard/donations");
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const text = await csv.text();
  expect(text).toContain("Reference,Date (UTC),Status,Campaign,Amount");
  expect(text).toContain(`Winter food parcels,300.00,TRY,One-off,${donor.name},${donor.email}`);

  await own.getByRole("link", { name: "Donors" }).click();
  await expect(own.getByRole("row").filter({ hasText: donor.email })).toContainText("₺300.00 in 1 donation");

  // A campaign with donations can only be closed: its donors keep their receipts.
  await own.goto("/dashboard/campaigns");
  await own.getByRole("link", { name: /Winter food parcels/ }).click();
  await expect(own.getByText("₺300.00 of ₺50,000.00 from 1 donor")).toBeVisible();
  await own.getByRole("button", { name: "Delete" }).click();
  await expect(own.getByText("This campaign has donations, so it can't be deleted")).toBeVisible();
  await own.getByRole("button", { name: "Close the campaign" }).click();
  await expect(own.getByText("Ended: it's still in the app, but takes no donations.")).toBeVisible();
  const closed = await own.request.post(`${api}/donations/checkout-link?platform=android`, { data: { campaign_id: campaignId, amount: "150" } });
  expect(closed.status()).toBe(409);
});
