import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * The hosted API (roadmap 8.3): our team moves a Store app to it, and the
 * app signs a customer in with a code (delivered through the code webhook),
 * keeps the session and receives the notification the client sends from
 * the dashboard.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = {
  name: "Rose Florist",
  email: `rose-${suffix}@shop.test`,
  site: `https://rose-${suffix}.shop.test`,
  password: "rose-strong-password-1",
};
const codes = new Map<string, string>();
let server: Server;
let api = "";

test.beforeAll(async () => {
  server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => {
      const expected = `sha256=${createHmac("sha256", E2E.otpWebhookSecret).update(body).digest("base64url")}`;
      if (request.headers["x-yallapp-signature"] !== expected) {
        response.writeHead(401).end();
        return;
      }
      const { phone, code } = JSON.parse(body) as { phone: string; code: string };
      codes.set(phone, code);
      response.writeHead(204).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(E2E.otpWebhookPort, resolve));
});

test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

async function openClientAsAdmin(page: Page, action: "Activate" | "Manage") {
  await signIn(page, E2E.adminEmail, E2E.adminPassword);
  await page.goto("/admin/clients");
  await page.getByRole("searchbox", { name: "Search clients" }).fill(client.email);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: `${action} ${client.name}` }).click();
}

test("our team moves a Store app to the hosted API", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(client.name);
  await page.getByLabel("Email").fill(client.email);
  await page.getByLabel("WhatsApp number").fill("+90 544 000 00 02");
  await page.getByLabel("Your WordPress website").fill(client.site);
  await page.getByLabel("Password", { exact: true }).fill(client.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pending$/);

  await openClientAsAdmin(page, "Activate");
  const panel = page.getByRole("complementary");
  await panel.getByLabel("Active until").fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(page.getByRole("status")).toContainText("Activated");

  await signIn(page, client.email, client.password);
  await expect(page).toHaveURL(/\/dashboard\/app-type$/);
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Website" })).toBeVisible();

  await openClientAsAdmin(page, "Manage");
  await page.getByRole("complementary").getByRole("button", { name: "Use the hosted API" }).click();
  await expect(page.getByRole("status")).toContainText("now uses the hosted API");
  await expect(page.getByRole("complementary")).toContainText("Yallapp hosted API");

  await signIn(page, client.email, client.password);
  await page.goto("/dashboard/setup?step=website");
  await expect(page.getByText("doesn't need a website")).toBeVisible();
  api = (await page.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
  expect(api).toMatch(/\/api\/app\/[0-9a-f-]{36}$/);
});

test("the app signs a customer in and receives notifications", async ({ page, request }) => {
  const config = await request.get(`${api}/config?platform=android&app_version=1.0.0`);
  expect(config.status()).toBe(200);
  expect(await config.json()).toMatchObject({ features: { lms: null }, auth: { signup_allowed: true } });

  const device = { id: `install-${suffix}`, platform: "android", name: "Pixel 8", app_version: "1.0.0" };
  const requested = await request.post(`${api}/auth/otp/request`, { data: { country_code: "+90", phone: "532 123 45 67" } });
  expect(requested.status()).toBe(200);
  const { request_id } = (await requested.json()) as { request_id: string };
  await expect.poll(() => codes.get("+905321234567")).toBeTruthy();

  const wrong = await request.post(`${api}/auth/otp/verify`, { data: { request_id, code: "000000", device } });
  expect((await wrong.json()).code).toBe("invalid_code");
  const verified = await request.post(`${api}/auth/otp/verify`, { data: { request_id, code: codes.get("+905321234567"), device } });
  const { signup_token } = (await verified.json()) as { signup_token: string };
  const registered = await request.post(`${api}/auth/register`, { data: { signup_token, name: "Sara Yilmaz", device } });
  expect(registered.status()).toBe(201);
  const session = (await registered.json()) as { access_token: string; refresh_token: string };
  const auth = { authorization: `Bearer ${session.access_token}` };

  expect(await (await request.get(`${api}/me`, { headers: auth })).json()).toMatchObject({ name: "Sara Yilmaz", phone: "+905321234567" });
  expect((await request.put(`${api}/me/push-token`, { headers: auth, data: { token: "fcm-e2e" } })).status()).toBe(204);

  await signIn(page, client.email, client.password);
  await page.getByRole("link", { name: "App notifications" }).click();
  await expect(page.getByText("1 customer has signed in so far.")).toBeVisible();
  await page.getByLabel("Title").fill("Tulip week");
  await page.getByLabel("Message").fill("Fresh tulips every morning this week.");
  await page.getByRole("button", { name: "Send to everyone" }).click();
  await expect(page.getByRole("status")).toContainText("Push is off");
  await expect(page.getByRole("region", { name: "Sent" })).toContainText("Tulip week");

  const inbox = await request.get(`${api}/me/notifications`, { headers: auth });
  expect(await inbox.json()).toMatchObject({ unread_count: 1, items: [{ title: "Tulip week", read: false }] });

  const refreshed = await request.post(`${api}/auth/refresh`, { data: { refresh_token: session.refresh_token } });
  expect(refreshed.status()).toBe(200);
  expect((await request.post(`${api}/auth/refresh`, { data: { refresh_token: session.refresh_token } })).status()).toBe(401);
  const next = (await refreshed.json()) as { access_token: string };
  expect((await request.post(`${api}/auth/logout`, { headers: { authorization: `Bearer ${next.access_token}` } })).status()).toBe(204);
  expect((await request.get(`${api}/me`, { headers: { authorization: `Bearer ${next.access_token}` } })).status()).toBe(401);
});
