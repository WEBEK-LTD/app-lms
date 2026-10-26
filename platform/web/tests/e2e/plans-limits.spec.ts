import { createHmac } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * Plans, limits and owner notices (roadmap 13): the pricing page shows the
 * four plans; the team changes what a plan includes; a Starter app on the
 * hosted API gets ready-made pages, one language and a users limit; the
 * owner sees the usage, the notices and the Upgrade buttons, changes plans
 * on License & plugin, and gets the plan-ending reminder from the daily job.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Olive Market", email: `olive-${suffix}@market.test`, password: "olive-strong-password-1" };
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.131" };
const codes = new Map<string, string>();
const payments = new Map<string, { callbackUrl: string; basketId: string; price: string }>();
let otpServer: Server;
let iyzico: Server;
let admin: Page;
let own: Page;
let api = "";
let clientUrl = "";
/** When the team saved the Starter limit: the hosted API reads the plans through a 30-second cache per server bundle. */
let limitSavedAt = 0;

interface SentMail {
  to: string;
  subject: string;
  text: string;
}

async function mailsTo(email: string): Promise<SentMail[]> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as SentMail));
  return mails.filter((m) => m.to === email);
}

function listen(server: Server, port: number) {
  return new Promise<void>((resolve) => server.listen(port, resolve));
}

test.beforeAll(async ({ browser }) => {
  otpServer = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => {
      const expected = `sha256=${createHmac("sha256", E2E.otpWebhookSecret).update(body).digest("base64url")}`;
      if (request.headers["x-yallapp-signature"] !== expected) return void response.writeHead(401).end();
      const { phone, code } = JSON.parse(body) as { phone: string; code: string };
      codes.set(phone, code);
      response.writeHead(204).end();
    });
  });
  await listen(otpServer, E2E.otpWebhookPort);

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
        const token = `plans-iyzi-${payments.size + 1}`;
        payments.set(token, input);
        return send({ status: "success", token, paymentPageUrl: `${base}/pay?token=${token}` });
      }
      if (url.pathname.endsWith("/checkoutform/auth/ecom/detail")) {
        const { token } = JSON.parse(body) as { token: string };
        const payment = payments.get(token)!;
        return send({ status: "success", paymentStatus: "SUCCESS", paymentId: "1313", paidPrice: Number(payment.price), basketId: payment.basketId });
      }
      if (url.pathname === "/pay") {
        const payment = payments.get(url.searchParams.get("token")!)!;
        response
          .writeHead(200, { "content-type": "text/html" })
          .end(
            `<!doctype html><title>iyzico</title><p>Total ${payment.price}</p><form method="post" action="${payment.callbackUrl}"><input type="hidden" name="token" value="${url.searchParams.get("token")}"><button>Pay with test card</button></form>`,
          );
        return;
      }
      response.writeHead(404).end();
    });
  });
  await listen(iyzico, E2E.iyzicoPort);

  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.plansAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  own = await browser.newPage({ extraHTTPHeaders });
});

test.afterAll(async () => {
  await own.close();
  await admin.close();
  await new Promise((resolve) => otpServer.close(resolve));
  await new Promise((resolve) => iyzico.close(resolve));
});

const starterLimits = () => admin.getByRole("form", { name: "Starter: features and limits" });

async function signUpUser(request: APIRequestContext, phone: string) {
  const device = { id: `install-${phone}`, platform: "android", name: "Pixel 8", app_version: "1.0.0" };
  const requested = await request.post(`${api}/auth/otp/request`, { data: { country_code: "+90", phone } });
  expect(requested.status()).toBe(200);
  const { request_id } = (await requested.json()) as { request_id: string };
  await expect.poll(() => codes.get(`+90${phone}`)).toBeTruthy();
  const verified = await request.post(`${api}/auth/otp/verify`, { data: { request_id, code: codes.get(`+90${phone}`), device } });
  codes.delete(`+90${phone}`);
  const body = (await verified.json()) as { signup_token?: string; access_token?: string; code?: string };
  if (!body.signup_token) return { status: verified.status(), body };
  const registered = await request.post(`${api}/auth/register`, { data: { signup_token: body.signup_token, name: "Deniz Kaya", device } });
  return { status: registered.status(), body: (await registered.json()) as Record<string, unknown> };
}

test("the pricing page shows the four plans and compares every feature", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "A plan for every app" })).toBeVisible();
  for (const name of ["Starter", "Growth", "Pro", "Business"]) await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  const table = page.getByRole("table", { name: "Everything each plan includes" });
  await expect(table.getByRole("row", { name: /^iOS app/ })).toBeVisible();
  await expect(table.getByRole("row", { name: /^App users/ })).toContainText("1,000");
  await expect(table.getByRole("row", { name: /^App users/ })).toContainText("10,000");
  await expect(table.getByRole("row", { name: /^Publishing/ })).toContainText("We publish for you");
  await expect(page.getByText("Netlify")).toHaveCount(0);
  // On a phone the table scrolls inside its box; the page itself never scrolls sideways.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pricing");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("the team changes what a plan includes, and it's logged", async ({ page }) => {
  await admin.goto("/admin/plans");
  const form = starterLimits();
  await expect(form.getByLabel("App users")).toHaveValue("1000");
  await form.getByLabel("App users").fill("2");
  await form.getByRole("button", { name: "Save features and limits" }).click();
  await expect(form.getByText("Starter: features and limits saved.")).toBeVisible();
  limitSavedAt = Date.now();

  await admin.goto("/admin/audit");
  await expect(admin.getByText("Changed what the Starter plan includes").first()).toBeVisible();

  await page.goto("/pricing");
  const users = page.getByRole("table", { name: "Everything each plan includes" }).getByRole("row", { name: /^App users/ });
  await expect(users.getByRole("cell").nth(0)).toHaveText("2");
});

test("a Starter app on the hosted API: ready-made pages, one language, usage and Upgrade", async ({ request }) => {
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 51");
  await own.getByLabel(/^Your (WordPress )?website/).fill(`https://olive-${suffix}.market.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  const panel = admin.getByRole("complementary");
  await panel.getByLabel("Plan").selectOption("starter");
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");

  await own.goto("/pending");
  await expect(own).toHaveURL(/\/dashboard\/app-type$/);
  await own.getByText("Store", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.getByLabel("App name").fill("Olive Market");
  await own.getByLabel("Name under the app icon").fill("Olive");
  await own.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [90, 120, 40]) });
  await expect(own.getByText("Replace file")).toBeVisible();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByLabel("Android package name")).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
  expect(api).toMatch(/\/api\/app\/[0-9a-f-]{36}$/);
  await own.goto("/dashboard/app-sign-in");
  await own.getByLabel("Support WhatsApp").fill("+90 532 111 22 33");
  await own.getByRole("button", { name: "Save", exact: true }).click();
  await expect(own.getByRole("status").first()).toBeVisible();

  // The overview: usage, what the plan has, and Upgrade to the plan that has the rest.
  await own.goto("/dashboard");
  await expect(own.getByText("0 / 2")).toBeVisible();
  await expect(own.getByRole("link", { name: "Upgrade", exact: true })).toHaveAttribute("href", "/dashboard/license?plan=growth#change-plan");
  const features = own.getByRole("region", { name: "In your Starter plan" });
  await expect(features).toContainText("Push notifications");
  await expect(features.locator("[data-upgrade-hint]").filter({ hasText: "iOS app" }).getByRole("link", { name: "Upgrade to Growth" })).toBeVisible();
  await expect(features.locator("[data-upgrade-hint]").filter({ hasText: "We publish for you" }).getByRole("link", { name: "Upgrade to Pro" })).toBeVisible();

  // 94.1 What you pay for: the plan's limits with what the app uses, what it includes, and what is on a higher plan.
  await own.goto("/dashboard/license");
  const usage = own.getByRole("region", { name: "What you pay for" });
  await expect(usage).toContainText(/^What you pay forStarter for .+:/);
  await expect(usage.locator('[data-usage-row="app_users"]')).toContainText("0 of 2");
  await expect(usage.locator('[data-usage-row="languages"]')).toContainText("1 of 1");
  await expect(usage.locator('[data-usage-row="languages"]')).toHaveAttribute("data-level", "full");
  await expect(usage.locator('[data-usage-row="storage"]')).toContainText(/0 B of [\d.]+ GB/);
  await expect(usage.locator('[data-usage-row="analytics"]')).toContainText("months");
  await expect(usage).toContainText("Push notifications");
  await expect(usage).toContainText("iOS app · Growth");

  // The page editor: ready-made pages only.
  await own.goto("/dashboard/pages");
  await expect(own.getByRole("tab", { name: "Look" })).toHaveAttribute("aria-selected", "true");
  await own.getByRole("tab", { name: "Pages" }).click();
  await expect(own.getByText("Full page editor")).toBeVisible();
  await expect(own.getByRole("button", { name: "Add page" })).toHaveCount(0);

  // The hosted API serves the plan: no offline mode, one language.
  const config = await request.get(`${api}/config?platform=android&app_version=1.0.0`);
  expect(config.status()).toBe(200);
  const json = (await config.json()) as { features: { offline: boolean }; languages: { available: string[] } };
  expect(json.features.offline).toBe(false);
  expect(json.languages.available).toHaveLength(1);
});

test("the users limit: new users are refused with the owner's contact, the owner is told once", async ({ request }) => {
  // The hosted API may still hold the plans from before the team's change for up to 30 seconds.
  await own.waitForTimeout(Math.max(0, limitSavedAt + 31_000 - Date.now()));
  const first = await signUpUser(request, "5321110001");
  expect(first.status).toBe(201);
  expect((await signUpUser(request, "5321110002")).status).toBe(201);
  const refused = await signUpUser(request, "5321110003");
  expect(refused.status).toBe(403);
  expect(refused.body).toEqual({
    code: "app_user_limit",
    message: "Olive Market isn't taking new members right now. Please contact Olive Market.",
    contact: { name: "Olive Market", whatsapp: "+905321112233", email: null },
  });
  // Existing users keep using the app (signing in again is checked in the unit tests).
  const me = await request.get(`${api}/me`, { headers: { authorization: `Bearer ${String(first.body.access_token)}` } });
  expect(me.status()).toBe(200);
  const refreshed = await request.post(`${api}/auth/refresh`, { data: { refresh_token: (first.body as Record<string, unknown>).refresh_token } });
  expect(refreshed.status()).toBe(200);

  await own.goto("/dashboard");
  await expect(own.getByText("2 / 2")).toBeVisible();
  const notice = own.locator('[data-notice="app_users_100"]');
  await expect(notice).toContainText("Olive Market reached its app users limit");
  await expect(notice.getByRole("link", { name: "Upgrade to Growth" })).toBeVisible();
  await expect.poll(async () => (await mailsTo(client.email)).filter((m) => m.subject === "Olive Market reached its app users limit").length).toBe(1);
  await notice.getByRole("button", { name: /^Close/ }).click();
  await expect(own.locator('[data-notice="app_users_100"]')).toHaveCount(0);

  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: client.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  clientUrl = admin.url();
  await expect(admin.getByRole("region", { name: "Plan and license" }).locator("[data-usage]")).toHaveText("2 / 2");
});

test("a paused app tells its users to contact the owner", async ({ request }) => {
  await admin.goto(clientUrl);
  await admin.getByRole("button", { name: /^Suspend/ }).first().click();
  await expect(admin.getByRole("status")).toBeVisible();
  const paused = await request.get(`${api}/config?platform=android&app_version=1.0.0`);
  expect(paused.status()).toBe(503);
  expect(await paused.json()).toMatchObject({ code: "account_suspended", contact: { name: "Olive Market", whatsapp: "+905321112233" } });
  await admin.goto(clientUrl);
  await admin.getByRole("button", { name: /^Reinstate/ }).first().click();
  await expect(admin.getByRole("status")).toBeVisible();
  expect((await request.get(`${api}/config?platform=android&app_version=1.0.0`)).status()).toBe(200);
});

test("changing plans: a lower plan from the end of the period, an upgrade by card with credited days", async () => {
  // On Pro for a year, by the team.
  await admin.goto(clientUrl);
  const plan = admin.getByRole("region", { name: "Plan and license" });
  await plan.getByLabel("Plan").selectOption("pro");
  await plan.getByLabel("Active until").fill(new Date(Date.now() + 100 * 86_400_000).toISOString().slice(0, 10));
  await plan.getByRole("button", { name: "Save & notify client" }).click();
  await expect(admin.getByRole("status")).toBeVisible();

  await own.goto("/dashboard/license");
  const change = own.getByRole("region", { name: "Change plan" });
  await expect(change.locator('[data-plan="pro"]')).toContainText("Current plan");
  await change.locator('[data-plan="growth"]').getByRole("button", { name: "Switch when this period ends" }).click();
  await expect(own.getByRole("status").first()).toContainText("moves to Growth on");
  await expect(own.getByRole("region", { name: "Plan", exact: true })).toContainText("Moves to Growth on");
  await own.getByRole("button", { name: "Keep Pro" }).click();
  await expect(own.getByRole("status").first()).toContainText("stays on Pro");

  // Card payments on, with a price for Business: upgrade at once.
  await admin.goto("/admin/settings");
  const keys = admin.getByRole("region", { name: "Yallapp's iyzico account" });
  await keys.getByLabel("API key").fill("sandbox-yallapp-api");
  await keys.getByLabel("Secret key").fill("sandbox-yallapp-secret");
  await keys.getByRole("button", { name: "Save keys" }).click();
  await expect(keys.getByText("iyzico account saved.")).toBeVisible();
  // 52 Plans through iyzico: it charges the dollar price (the same figure here).
  const billing = admin.getByRole("region", { name: "Yallapp's plan payments" });
  await billing.getByLabel("Gateway for plans").selectOption("iyzico");
  await billing.getByRole("button", { name: "Save plan payments" }).click();
  await expect(billing.getByText("Plans are paid through Yallapp's iyzico account.")).toBeVisible();
  await admin.goto("/admin/plans");
  const business = admin.getByRole("region", { name: "Business" });
  await business.getByLabel("A price").check();
  await business.getByLabel("Price in EGP").fill("9000");
  await business.getByLabel("Price in USD (optional)").fill("9000");
  await business.getByLabel("Billed").selectOption("12");
  await business.getByRole("button", { name: "Save plan" }).click();
  await expect(business.getByText("Business saved.")).toBeVisible();

  await own.goto("/dashboard/license");
  await own.getByRole("region", { name: "Change plan" }).locator('[data-plan="business"]').getByRole("link", { name: "Upgrade to Business" }).click();
  await expect(own).toHaveURL(/\/dashboard\/license\?plan=business#renew$/);
  // Pro has no card price: its 100 days carry over one for one.
  await expect(own.getByText(/Upgrade: starts today, with (99|100) days credited/)).toBeVisible();
  await own.getByLabel("City").fill("Izmir");
  await own.getByLabel("Billing address").fill("Kordon Boyu 9, Konak");
  await own.getByRole("button", { name: "Pay by card" }).click();
  await expect(own.getByText("Total 9000.00")).toBeVisible();
  await own.getByRole("button", { name: "Pay with test card" }).click();
  await expect(own).toHaveURL(/\/dashboard\/license\?payment=paid$/);
  await expect(own.getByRole("region", { name: "Change plan" }).locator('[data-plan="business"]')).toContainText("Current plan");

  // Put the settings back.
  await admin.goto("/admin/plans");
  await admin.getByRole("region", { name: "Business" }).getByRole("button", { name: "Back to the default plan" }).click();
  await admin.goto("/admin/settings");
  const billingBack = admin.getByRole("region", { name: "Yallapp's plan payments" });
  await billingBack.getByLabel("Gateway for plans").selectOption("kashier");
  await billingBack.getByRole("button", { name: "Save plan payments" }).click();
  await expect(billingBack.getByText(/Plans are paid through Yallapp's Kashier account\./)).toBeVisible();
  await admin.getByRole("region", { name: "Yallapp's iyzico account" }).getByRole("button", { name: "Remove keys" }).click();
});

test("the daily job reminds the owner before the plan ends, once", async ({ request }) => {
  expect((await request.post("/api/internal/daily")).status()).toBe(401);
  expect((await request.post("/api/internal/daily", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);

  await admin.goto(clientUrl);
  const plan = admin.getByRole("region", { name: "Plan and license" });
  await plan.getByLabel("Active until").fill(new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10));
  await plan.getByRole("button", { name: "Save & notify client" }).click();
  await expect(admin.getByRole("status")).toBeVisible();

  const job = { authorization: `Bearer ${E2E.internalJobSecret}` };
  const first = await request.post("/api/internal/daily", { headers: job });
  expect(first.status()).toBe(200);
  expect(await first.json()).toMatchObject({ reminders: expect.any(Number) });
  await request.post("/api/internal/daily", { headers: job });

  const reminders = (await mailsTo(client.email)).filter((m) => m.subject.startsWith("Olive Market: your plan ends on"));
  expect(reminders).toHaveLength(1);
  expect(reminders[0]!.text).toContain("/dashboard/open?app=");

  await own.goto("/dashboard");
  const notice = own.locator('[data-notice="plan_ends_7"]');
  await expect(notice).toContainText("Olive Market's plan ends in 3 days");
  await notice.getByRole("link", { name: "Renew by card" }).click();
  await expect(own).toHaveURL(/\/dashboard\/license#renew$/);

  // Put the Starter limit back.
  await admin.goto("/admin/plans");
  await admin.getByRole("region", { name: "Starter" }).getByRole("button", { name: "Back to the default plan" }).click();
});
