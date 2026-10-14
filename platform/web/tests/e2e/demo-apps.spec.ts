import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * Demo apps people can try (roadmap 16): the team creates them from
 * Admin › Demo apps, visitors sign in with the public demo number (and
 * nothing else), check out without a card, the daily job cleans up, and
 * /demo offers the download the team picked, with "Coming soon" before.
 */
test.describe.configure({ mode: "serial" });

const DEMO = { countryCode: "+1", number: "2025550123", code: "246810", display: "+1 202 555 0123" };
const DEVICE = { id: "e2e-demo-install", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
let admin: Page;
const appIds: Record<string, string> = {};
let token = "";

const ip = (n: number) => ({ "x-forwarded-for": `198.51.100.${n}` });

test.beforeAll(async ({ browser }) => {
  admin = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.161" } });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.demosAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
});

test.afterAll(async () => {
  await admin.close();
});

async function demoRequest(request: APIRequestContext, appId: string, phone = DEMO.number, countryCode = DEMO.countryCode, from = 1) {
  return request.post(`/api/app/${appId}/auth/otp/request`, { data: { country_code: countryCode, phone }, headers: ip(from) });
}

test("the team creates the demo apps from the admin", async () => {
  await admin.goto("/admin/demos");
  await expect(admin.getByRole("heading", { name: "Demo apps", level: 1 })).toBeVisible();
  await expect(admin.getByText(DEMO.display).first()).toBeVisible();
  await admin.getByRole("button", { name: /Create the demo apps|Refresh all demo apps/ }).click();
  await expect(admin.getByRole("status")).toContainText("The demo apps are created and up to date.", { timeout: 30_000 });
  for (const name of ["Nour Academy", "Lale Flowers", "Studio Nur", "Kardelen Clinic", "Nile Homes"]) {
    await expect(admin.getByRole("heading", { name, level: 2 })).toBeVisible();
    appIds[name] = await admin.locator(`form:has(button:has-text("Start a build of ${name}")) input[name="appId"]`).inputValue();
  }
  // Again: updated, not duplicated.
  await admin.getByRole("button", { name: "Refresh all demo apps" }).click();
  await expect(admin.getByRole("status")).toContainText("up to date", { timeout: 30_000 });
  expect(await admin.locator(`form:has(button:has-text("Start a build of Lale Flowers")) input[name="appId"]`).inputValue()).toBe(appIds["Lale Flowers"]);
  await admin.goto("/admin/audit");
  await expect(admin.getByText("the demo apps:").first()).toBeVisible();
});

test("visitors sign in with the demo number only, within limits", async ({ request }) => {
  const shop = appIds["Lale Flowers"]!;
  const config = await (await request.get(`/api/app/${shop}/config?platform=android&app_version=1.0.0`)).json();
  expect(config.auth.default_country_code).toBe(DEMO.countryCode);
  expect(config.site.name).toBe("Lale Flowers");

  const other = await demoRequest(request, shop, "5321234567", "+90", 2);
  expect(other.status()).toBe(403);
  expect((await other.json()).code).toBe("demo_number_only");

  const requested = await demoRequest(request, shop, DEMO.number, DEMO.countryCode, 3);
  expect(requested.status()).toBe(200);
  const { request_id } = await requested.json();
  const wrong = await request.post(`/api/app/${shop}/auth/otp/verify`, { data: { request_id, code: "000000", device: DEVICE }, headers: ip(3) });
  expect(wrong.status()).toBe(400);
  const verified = await request.post(`/api/app/${shop}/auth/otp/verify`, { data: { request_id, code: DEMO.code, device: DEVICE }, headers: ip(3) });
  expect(verified.status()).toBe(200);
  const body = await verified.json();
  expect(body.user).toMatchObject({ name: "Demo visitor", phone: "+12025550123" });
  token = body.access_token;

  // Ten requests an hour per visitor.
  for (let i = 0; i < 10; i++) expect((await demoRequest(request, appIds["Studio Nur"]!, DEMO.number, DEMO.countryCode, 4)).status()).toBe(200);
  const limited = await demoRequest(request, appIds["Studio Nur"]!, DEMO.number, DEMO.countryCode, 4);
  expect(limited.status()).toBe(429);
  expect((await limited.json()).code).toBe("rate_limited");
});

test("checkout in a demo app takes no card", async ({ request, page }) => {
  const shop = appIds["Lale Flowers"]!;
  const products = await (await request.get(`/api/app/${shop}/store/products`)).json();
  expect(products.items.length).toBeGreaterThan(5);
  const link = await request.post(`/api/app/${shop}/store/checkout-link?platform=android`, {
    data: { lines: [{ product_id: products.items[0].id, quantity: 1 }] },
    headers: { authorization: `Bearer ${token}` },
  });
  expect(link.status()).toBe(200);
  const { url } = await link.json();
  await page.goto(url);
  await expect(page.getByRole("note")).toContainText("nothing is charged");
  await expect(page.getByLabel("Card number")).toHaveCount(0);
  await page.getByRole("button", { name: "Place demo order" }).click();
  await page.waitForURL(/order-received/);
  await expect(page.getByText("Nothing was charged")).toBeVisible();
  const orders = await (await request.get(`/api/app/${shop}/me/orders`, { headers: { authorization: `Bearer ${token}` } })).json();
  expect(orders.total).toBe(1);
});

test("the daily job cleans the demo apps and keeps what's newer than a day", async ({ request }) => {
  const daily = await request.post("/api/internal/daily", { headers: { authorization: `Bearer ${E2E.internalJobSecret}` } });
  expect(daily.status()).toBe(200);
  expect((await daily.json()).demo).toMatchObject({ apps: 4, deleted: 0 });
  const orders = await (await request.get(`/api/app/${appIds["Lale Flowers"]}/me/orders`, { headers: { authorization: `Bearer ${token}` } })).json();
  expect(orders.total).toBe(1);
});

test("/demo shows the five demos, the sign-in and Coming soon before a build is picked", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Demo", exact: true }).click();
  await page.waitForURL("**/demo");
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Demo", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Try a real app on your phone" })).toBeVisible();
  await expect(page.getByTestId("demo-phone")).toHaveText(DEMO.display);
  await expect(page.getByTestId("demo-code")).toHaveText(DEMO.code);
  for (const name of ["Nour Academy", "Lale Flowers", "Studio Nur", "Kardelen Clinic", "Nile Homes"]) await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
  await expect(page.getByText("Coming soon", { exact: true })).toHaveCount(5);
  await expect(page.getByRole("link", { name: "Download for Android" })).toHaveCount(0);
  await expect(page.getByText("iPhone demos are available on request through TestFlight")).toBeVisible();
  const download = await page.request.get("/demo/download/store", { maxRedirects: 0 });
  expect(download.status()).toBe(303);
  expect(download.headers().location).toContain("/demo?download=unavailable");
  await page.goto("/solutions/bookings");
  await page.getByRole("link", { name: "Try the bookings demo" }).click();
  await page.waitForURL("**/demo#bookings");
});

// A full build and the published download are unit tested (tests/unit/demo-apps.test.ts):
// the hosted API's build config needs an https address, and this server runs on http.
test("the build and download controls answer in the admin", async ({ page }) => {
  await admin.goto("/admin/demos");
  await admin.getByRole("button", { name: "Start a build of Lale Flowers" }).click();
  await expect(admin.getByRole("alert").filter({ hasText: "The build config isn't valid" })).toBeVisible();
  await expect(admin.getByLabel("Public download").nth(1).locator("option")).toHaveCount(1);
  await admin.getByRole("button", { name: "Save the download of Lale Flowers" }).click();
  await expect(admin.getByRole("status")).toContainText("shows \"Coming soon\" for this app again");
  await page.goto("/demo");
  await expect(page.locator("#store").getByText("Coming soon", { exact: true })).toBeVisible();
  await admin.goto("/admin/audit");
  await expect(admin.getByText("Lale Flowers on /demo shows").first()).toBeVisible();
});

test("only the team with the permission sees the demo controls", async ({ request }) => {
  const anonymous = await request.get("/admin/demos", { maxRedirects: 0 });
  expect([303, 307, 308]).toContain(anonymous.status());
});

