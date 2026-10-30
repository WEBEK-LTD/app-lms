import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { createPreviewToken, previewAppPath, previewKey } from "../../src/lib/preview/token";

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
  // The regular apps' demos and Yallapp Studio's, each on their own tab.
  await admin.getByRole("button", { name: /Create the regular demo apps|Refresh all regular demo apps/ }).click();
  await expect(admin.getByRole("status")).toContainText("The regular apps' demos are created and up to date.", { timeout: 30_000 });
  for (const name of ["Nour Academy", "Lale Flowers", "Defne Café", "Studio Nur", "Kardelen Clinic", "Pulse Studio", "Nile Homes", "The Harbour Post", "Kuzey Culture Centre", "Bereket Food Bank"]) {
    await expect(admin.getByRole("heading", { name, level: 2 })).toBeVisible();
    appIds[name] = await admin.locator(`form:has(button:has-text("Start a build of ${name}")) input[name="appId"]`).inputValue();
  }
  await expect(admin.getByRole("heading", { name: "Masar Rides", level: 2 })).toHaveCount(0);
  await admin.getByRole("tab", { name: "Yallapp Studio" }).click();
  await expect(admin).toHaveURL(/\/admin\/demos\?family=studio$/);
  await admin.getByRole("button", { name: /Create Studio's demo apps|Refresh all of Studio's demo apps/ }).click();
  await expect(admin.getByRole("status")).toContainText("Yallapp Studio's demos are created and up to date.", { timeout: 30_000 });
  await expect(admin).toHaveURL(/family=studio/);
  // 110.5 And the live taxi app, the school and the academy with many teachers.
  for (const name of ["Sahm Express", "Sofra Eats", "Masar Rides", "Lamha Taxi", "Nakhla School", "Rawaq Academy"]) {
    await expect(admin.getByRole("heading", { name, level: 2 })).toBeVisible();
    appIds[name] = await admin.locator(`form:has(button:has-text("Start a build of ${name}")) input[name="appId"]`).inputValue();
  }
  await expect(admin.getByText("Live taxi on the map demo")).toBeVisible();
  await expect(admin.getByRole("heading", { name: "Lale Flowers", level: 2 })).toHaveCount(0);
  await admin.getByRole("tab", { name: "Regular apps" }).click();
  // Again: updated, not duplicated.
  await admin.getByRole("button", { name: "Refresh all regular demo apps" }).click();
  await expect(admin.getByRole("status")).toContainText("up to date", { timeout: 30_000 });
  expect(await admin.locator(`form:has(button:has-text("Start a build of Lale Flowers")) input[name="appId"]`).inputValue()).toBe(appIds["Lale Flowers"]);
  await admin.goto("/admin/audit");
  await expect(admin.getByText("the demo apps:").first()).toBeVisible();
});

// 17 Every demo app opens in the app preview: the preview link's config, then the hosted API's
// /config and /pages answer as JSON, and the app writes no failed request to the console.
test("every demo app runs in the app preview", async ({ browser }) => {
  test.setTimeout(16 * 45_000);
  const key = previewKey(E2E.signingSecret);
  for (const [name, appId] of Object.entries(appIds)) {
    const page = await browser.newPage({ extraHTTPHeaders: ip(170) });
    const failures: string[] = [];
    page.on("console", (m) => {
      if (m.text().startsWith("Yallapp preview:")) failures.push(m.text());
    });
    const hosted = (path: string) => (r: { url(): string }) => new URL(r.url()).pathname === `/api/app/${appId}/${path}`;
    const config = page.waitForResponse(hosted("config"), { timeout: 40_000 });
    const pages = page.waitForResponse(hosted("pages"), { timeout: 40_000 });
    await page.goto(`${previewAppPath(createPreviewToken({ appId, draft: false }, key))}&lang=en`);
    const answer = await config;
    expect(answer.status(), name).toBe(200);
    expect(answer.headers()["content-type"], name).toContain("application/json");
    expect((await answer.json()).site.name, name).toBe(name);
    // /pages is asked only once the app is past its /config.
    expect((await pages).status(), name).toBe(200);
    expect(failures, name).toEqual([]);
    await page.close();
  }
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
  const report = await daily.json();
  expect(report.demo).toMatchObject({ apps: 16, deleted: 0 });
  // 27 The gym demo's timetable is kept 8 weeks ahead.
  expect(report.classes.apps).toBeGreaterThanOrEqual(1);
  const orders = await (await request.get(`/api/app/${appIds["Lale Flowers"]}/me/orders`, { headers: { authorization: `Bearer ${token}` } })).json();
  expect(orders.total).toBe(1);
});

test("/demo shows the ten demos, the sign-in and Coming soon before a build is picked", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Demo", exact: true }).click();
  await page.waitForURL("**/demo");
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Demo", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Try a real app on your phone" })).toBeVisible();
  await expect(page.getByTestId("demo-phone")).toHaveText(DEMO.display);
  await expect(page.getByTestId("demo-code")).toHaveText(DEMO.code);
  for (const name of ["Nour Academy", "Lale Flowers", "Defne Café", "Studio Nur", "Kardelen Clinic", "Pulse Studio", "Nile Homes", "The Harbour Post", "Kuzey Culture Centre", "Bereket Food Bank"]) await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
  await expect(page.getByText("Coming soon", { exact: true })).toHaveCount(10);
  await expect(page.getByRole("link", { name: "Download for Android" })).toHaveCount(0);
  await expect(page.getByText("iPhone demos are available on request through TestFlight")).toBeVisible();
  const download = await page.request.get("/demo/download/store", { maxRedirects: 0 });
  expect(download.status()).toBe(303);
  expect(download.headers().location).toContain("/demo?download=unavailable");
  await page.goto("/solutions/bookings");
  await page.getByRole("link", { name: "Try the bookings demo" }).click();
  await page.waitForURL("**/demo#bookings");
});

test("/demo/studio shows Studio's own demos apart from the regular ones", async ({ page }) => {
  await page.goto("/demo/studio");
  await expect(page.getByTestId("demo-phone")).toHaveText(DEMO.display);
  await expect(page.getByTestId("demo-code")).toHaveText(DEMO.code);
  for (const name of ["Sahm Express", "Sofra Eats", "Masar Rides", "Lamha Taxi", "Nakhla School", "Rawaq Academy"]) await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
  await expect(page.getByText("Coming soon", { exact: true })).toHaveCount(6);
  // 110.5 What to try as each of the demo number's people.
  await expect(page.locator("#taxi")).toContainText("Account › Driver mode");
  await expect(page.locator("#school")).toContainText("In the Classroom tab");
  await expect(page.locator("#teachers")).toContainText("In the Teacher tab");
  // The regular demo page keeps its ten.
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Masar Rides", level: 2 })).toHaveCount(0);
  const download = await page.request.get("/demo/download/rides", { maxRedirects: 0 });
  expect(download.status()).toBe(303);
  expect(download.headers().location).toContain("/demo/studio?download=unavailable");
  for (const slug of ["taxi", "school", "teachers"]) {
    const other = await page.request.get(`/demo/download/${slug}`, { maxRedirects: 0 });
    expect(other.headers().location).toContain(`/demo/studio?download=unavailable#${slug}`);
  }
  // In Arabic, the new cards in Arabic.
  await page.goto("/ar/demo/studio");
  await expect(page.getByRole("heading", { name: "Lamha Taxi", level: 2 })).toBeVisible();
  await expect(page.locator("#school")).toContainText("تبويب «الفصل»");
});

test("110.5 the Studio demos' people: the visitor is a student, a parent and a teacher; taxis drive around them", async ({ request }) => {
  const signIn = async (appId: string, from: number) => {
    const requested = await demoRequest(request, appId, DEMO.number, DEMO.countryCode, from);
    const { request_id } = await requested.json();
    const verified = await request.post(`/api/app/${appId}/auth/otp/verify`, { data: { request_id, code: DEMO.code, device: DEVICE }, headers: ip(from) });
    expect(verified.status()).toBe(200);
    return (await verified.json()) as { access_token: string; user: { roles: string[] } };
  };
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });
  const school = await signIn(appIds["Nakhla School"]!, 40);
  expect(school.user.roles).toEqual(["student", "parent", "teacher"]);
  const me = await (await request.get(`/api/app/${appIds["Nakhla School"]}/school/me`, { headers: auth(school.access_token) })).json();
  expect(me.students.map((s: { name: string }) => s.name)).toEqual(["Lina Haddad", "Adam Haddad"]);
  const academy = await signIn(appIds["Rawaq Academy"]!, 41);
  expect(academy.user.roles).toEqual(["teacher"]);
  const teachers = await (await request.get(`/api/app/${appIds["Rawaq Academy"]}/teachers`)).json();
  expect(teachers.items).toHaveLength(7);
  const taxi = await signIn(appIds["Lamha Taxi"]!, 42);
  expect(taxi.user.roles).toEqual(["driver"]);
  const near = await (await request.get(`/api/app/${appIds["Lamha Taxi"]}/taxi/nearby?lat=41.0082&lng=28.9784`, { headers: auth(taxi.access_token) })).json();
  expect(near.items).toHaveLength(8);
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

