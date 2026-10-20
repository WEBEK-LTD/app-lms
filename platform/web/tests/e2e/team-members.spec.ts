import { createHmac } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * 60 Team members: the owner of a shop invites a Staff member with only
 * Orders & kitchen; they join from the email's link with their own
 * password, see only Orders in the dashboard and in the Owner API, complete
 * a paid order (the owner sees who did it on the Team page), can't open
 * License, Team or Analytics; the owner removes them and their session ends
 * on the website and on the phone.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so the sign-up and sign-in limits per IP don't reach the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.166" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Defne Yıldız", email: `defne-${suffix}@shop.test`, password: "defne-strong-password-1" };
const staff = { name: "Kerem Aydın", email: `kerem-${suffix}@shop.test`, password: "kerem-strong-password-1" };
const owner = `${E2E.baseURL}/api/owner/v1`;
let own: Page;
let admin: Page;
let member: Page;
let shopApi = "";
let shopId = "";
let memberAccess = "";
const codes = new Map<string, string>();
const payments = new Map<string, { callbackUrl: string; basketId: string; price: string }>();
let otp: Server;
let iyzico: Server;

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

test.beforeAll(async ({ browser }) => {
  // Sign-in codes for the shop's customer, as in hosted-api.spec.ts.
  otp = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => {
      if (request.headers["x-yallapp-signature"] !== `sha256=${createHmac("sha256", E2E.otpWebhookSecret).update(body).digest("base64url")}`) return void response.writeHead(401).end();
      const { phone, code } = JSON.parse(body) as { phone: string; code: string };
      codes.set(phone, code);
      response.writeHead(204).end();
    });
  });
  await new Promise<void>((resolve) => otp.listen(E2E.otpWebhookPort, resolve));
  // A fake iyzico, as in catalog.spec.ts.
  const base = `http://localhost:${E2E.iyzicoPort}`;
  iyzico = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => {
      const url = new URL(request.url ?? "/", base);
      const send = (json: unknown) => response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(json));
      if (url.pathname === "/payment/bin/check") return send({ status: "success" });
      if (url.pathname.endsWith("/checkoutform/initialize/auth/ecom")) {
        const input = JSON.parse(body) as { callbackUrl: string; basketId: string; price: string };
        const token = `iyzi-t-${payments.size + 1}`;
        payments.set(token, input);
        return send({ status: "success", token, paymentPageUrl: `${base}/pay?token=${token}` });
      }
      if (url.pathname.endsWith("/checkoutform/auth/ecom/detail")) {
        const { token } = JSON.parse(body) as { token: string };
        const payment = payments.get(token)!;
        return send({ status: "success", paymentStatus: "SUCCESS", paymentId: "960", paidPrice: Number(payment.price), basketId: payment.basketId });
      }
      if (url.pathname === "/pay") {
        const token = url.searchParams.get("token")!;
        return void response
          .writeHead(200, { "content-type": "text/html" })
          .end(`<!doctype html><title>iyzico</title><form method="post" action="${payments.get(token)!.callbackUrl}"><input type="hidden" name="token" value="${token}"><button>Pay with test card</button></form>`);
      }
      response.writeHead(404).end();
    });
  });
  await new Promise<void>((resolve) => iyzico.listen(E2E.iyzicoPort, resolve));

  own = await freshPage(browser);
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 01 66");
  await own.getByLabel("Your website (optional)").fill(`https://defne-${suffix}.shop.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  admin = await freshPage(browser);
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.teamMembersAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
});

test.afterAll(async () => {
  for (const page of [own, admin, member]) await page?.context().close();
  await new Promise((resolve) => otp.close(resolve));
  await new Promise((resolve) => iyzico.close(resolve));
});

test("the owner sets up a shop and a customer pays for an order", async ({ request, page }) => {
  await own.goto("/dashboard/app-type");
  await own.getByText("Store", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await own.getByLabel("App name").fill("Defne Shop");
  await own.getByLabel("Name under the app icon").fill("Defne");
  await own.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [200, 90, 40]) });
  await expect(own.getByText("Replace file")).toBeVisible();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByLabel("Android package name")).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  shopApi = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
  shopId = shopApi.split("/").pop()!;
  await own.goto("/dashboard/catalog");
  await own.getByLabel("API key").fill("sandbox-api-key");
  await own.getByLabel("Secret key").fill("sandbox-secret-key");
  await own.getByText("Sandbox keys").click();
  await own.getByRole("button", { name: "Save keys" }).click();
  await expect(own.getByText("iyzico keys saved.")).toBeVisible();
  await own.getByRole("link", { name: "Add product" }).click();
  await own.getByLabel("Name", { exact: true }).fill("Copper pot");
  await own.getByLabel("Price (TRY)", { exact: true }).fill("320");
  await own.getByLabel("Stock").fill("5");
  await own.getByRole("button", { name: "Add product" }).click();
  await expect(own.getByRole("status")).toContainText("Saved “Copper pot”.");

  // A customer signs in to the app and pays.
  const device = { id: `install-${suffix}`, platform: "android", name: "Pixel 8", app_version: "1.0.0" };
  const requested = await request.post(`${shopApi}/auth/otp/request`, { data: { country_code: "+90", phone: "532 765 01 66" } });
  const { request_id } = (await requested.json()) as { request_id: string };
  await expect.poll(() => codes.get("+905327650166")).toBeTruthy();
  const verified = (await (await request.post(`${shopApi}/auth/otp/verify`, { data: { request_id, code: codes.get("+905327650166"), device } })).json()) as { signup_token: string };
  const registered = await request.post(`${shopApi}/auth/register`, { data: { signup_token: verified.signup_token, name: "Mona Adel", device } });
  const customer = { authorization: `Bearer ${((await registered.json()) as { access_token: string }).access_token}` };
  const products = await (await request.get(`${shopApi}/store/products`)).json();
  const link = await request.post(`${shopApi}/store/checkout-link?platform=android`, { headers: customer, data: { lines: [{ product_id: products.items[0].id, quantity: 1 }] } });
  await page.goto(((await link.json()) as { url: string }).url);
  await page.getByLabel("Full name").fill("Mona Adel");
  await page.getByLabel("Mobile number").fill("0532 765 01 66");
  await page.getByLabel("Email").fill(`mona-${suffix}@example.com`);
  await page.getByLabel("City").fill("Istanbul");
  await page.getByLabel("Address").fill("Moda Cd. 12");
  await page.getByRole("button", { name: "Pay ₺320.00" }).click();
  await page.getByRole("button", { name: "Pay with test card" }).click();
  await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();
});

test("the owner invites a Staff member with only Orders & kitchen", async () => {
  await own.goto("/dashboard");
  await own.getByRole("link", { name: "Team", exact: true }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Team" })).toBeVisible();
  const invite = own.getByRole("region", { name: "Invite someone" });
  await invite.getByLabel("Name").fill(staff.name);
  await invite.getByLabel("Email").fill(staff.email);
  await invite.getByRole("radio", { name: /Staff/ }).check();
  await invite.getByRole("checkbox", { name: "Orders & kitchen" }).check();
  await invite.getByRole("button", { name: "Send invitation" }).click();
  await expect(invite.getByRole("status")).toContainText(`Invitation sent to ${staff.email}.`);
  await own.reload();
  await expect(own.locator(`[data-invitation="${staff.email}"]`)).toContainText("Staff");
  // The team sees it on the client's page in the admin.
  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: client.name, exact: true }).click();
  await expect(admin.getByRole("region", { name: "The client's team" })).toContainText(`${staff.email}`);
  await expect(admin.getByRole("region", { name: "The client's team" })).toContainText("Staff: Orders & kitchen");
});

test("the member joins from the email, and sees only Orders", async ({ browser }) => {
  await expect.poll(async () => (await mailsTo(staff.email)).length).toBe(1);
  const [mail] = await mailsTo(staff.email);
  expect(mail!.subject).toBe(`${client.name} invited you to Defne Shop on Yallapp`);
  const joinUrl = /https?:\/\/\S+\/team\/join\?token=\S+/.exec(mail!.text)![0];
  member = await freshPage(browser);
  await member.goto(joinUrl.replace(/^https?:\/\/[^/]+/, ""));
  await expect(member.getByRole("heading", { level: 1, name: "Join Defne Shop on Yallapp" })).toBeVisible();
  await member.getByLabel("Your name").fill(staff.name);
  await member.getByLabel("Password", { exact: true }).fill(staff.password);
  await member.getByLabel("Confirm the password").fill(staff.password);
  await member.getByRole("button", { name: "Join the team" }).click();
  await expect(member).toHaveURL(/\/dashboard$/);
  await expect(member.getByRole("heading", { level: 1, name: "Hello, Kerem" })).toBeVisible();
  // The link works once.
  const again = await freshPage(browser);
  await again.goto(joinUrl.replace(/^https?:\/\/[^/]+/, ""));
  await expect(again.getByRole("status")).toContainText("This invitation was used or cancelled already.");
  await again.context().close();

  const nav = member.getByRole("navigation", { name: "Dashboard" });
  await expect(nav.getByRole("link", { name: "Orders" })).toBeVisible();
  for (const hidden of ["License & plugin", "Team", "Analytics", "Pages & look", "App setup", "Products", "Builds & downloads"]) {
    await expect(nav.getByRole("link", { name: hidden, exact: true })).toHaveCount(0);
  }
  // Pages outside their role send them back to the overview, which says why.
  for (const address of ["/dashboard/license", "/dashboard/team", "/dashboard/analytics", "/dashboard/catalog"]) {
    await member.goto(address);
    await expect(member).toHaveURL(/\/dashboard\?denied=/);
    await expect(member.getByRole("status").filter({ hasText: "Your role here doesn't include that page." })).toBeVisible();
  }
});

test("the member completes the order on the dashboard, and the owner sees who did it", async () => {
  await member.goto("/dashboard/orders");
  await expect(member.getByText("Copper pot")).toBeVisible();
  await member.getByRole("button", { name: "Mark completed" }).click();
  await expect(member.getByText("Completed").first()).toBeVisible();
  await own.goto("/dashboard/team");
  await expect(own.getByTestId("team-activity")).toContainText(`${staff.name} · Order`);
  await expect(own.getByTestId("team-activity")).toContainText("Completed");
  await expect(own.locator(`[data-member="${staff.email}"]`)).toContainText("Orders & kitchen");
  // 64 The activity of one person: the member's order step, not the owner's invitation.
  await own.getByTestId("team-activity-filter").getByLabel("Who").selectOption({ label: staff.name });
  await own.getByTestId("team-activity-filter").getByRole("button", { name: "Show" }).click();
  await expect(own).toHaveURL(/person=/);
  await expect(own.getByTestId("team-activity")).toContainText(`${staff.name} · Order`);
  await expect(own.getByTestId("team-activity")).not.toContainText("Invited");
  await own.getByTestId("team-activity-filter").getByLabel("Who").selectOption({ label: "Everyone" });
  await own.getByTestId("team-activity-filter").getByRole("button", { name: "Show" }).click();
  await expect(own.getByTestId("team-activity")).toContainText("Invited");
});

test("the member's phone sees only Orders in the Owner API", async ({ request }) => {
  const signedIn = await request.post(`${owner}/auth/sign-in`, { data: { email: staff.email, password: staff.password, device: { name: "Kerem's Pixel", platform: "android" } } });
  expect(signedIn.status()).toBe(200);
  memberAccess = ((await signedIn.json()) as { access_token: string }).access_token;
  const headers = { authorization: `Bearer ${memberAccess}` };
  const me = await (await request.get(`${owner}/me`, { headers })).json();
  expect(me.business).toMatchObject({ role: "staff", name: "Defne Shop" });
  expect(me.apps[0]).toMatchObject({ id: shopId, access: { role: "staff", areas: ["orders"], license: false, team: false, settings: false }, features: { orders: true, products: false, analytics: false } });
  const orders = await request.get(`${owner}/apps/${shopId}/orders`, { headers });
  expect(orders.status()).toBe(200);
  expect((await orders.json()).items[0]).toMatchObject({ status: "completed" });
  for (const refused of [`apps/${shopId}/products`, `apps/${shopId}/license`, `apps/${shopId}/analytics`, "team"]) {
    const response = await request.get(`${owner}/${refused}`, { headers });
    expect(response.status(), refused).toBe(403);
    expect(await response.json()).toMatchObject({ code: "not_allowed" });
  }
});

test("the owner removes the member, and their session ends everywhere", async ({ request }) => {
  await own.goto("/dashboard/team");
  const row = own.locator(`[data-member="${staff.email}"]`);
  await row.getByLabel(`Remove ${staff.name} from the team`).click();
  await row.getByRole("button", { name: "Yes, remove" }).click();
  await expect(own.getByRole("status")).toContainText(`${staff.name} is off the team and signed out everywhere.`);
  await expect(own.locator(`[data-member="${staff.email}"]`)).toHaveCount(0);
  // The website: the next page asks them to sign in.
  await member.goto("/dashboard/orders");
  await expect(member).toHaveURL(/\/sign-in/);
  // The phone: its token stops at once.
  const me = await request.get(`${owner}/me`, { headers: { authorization: `Bearer ${memberAccess}` } });
  expect(me.status()).toBe(401);
  expect(await me.json()).toMatchObject({ code: "invalid_token" });
});
