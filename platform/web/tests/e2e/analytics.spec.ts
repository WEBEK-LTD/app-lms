import { createHmac, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 44 Analytics for app owners: an app sends its usage events to the
 * platform, the owner reads the numbers on Dashboard › Analytics and exports
 * them, and the team sees the same summary on the client's admin page.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Tulip House", email: `tulip-${suffix}@analytics.test`, password: "tulip-house-strong-password-1" };
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.144" };
let own: Page;
let appId = "";
const a = randomUUID();
const b = randomUUID();

const day = (offset: number, hour = 10) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  date.setUTCHours(hour, 0, 0, 0);
  // Today's events are a minute in the past at most, never ahead of the server.
  return new Date(Math.min(date.getTime(), Date.now() - 60_000)).toISOString();
};

/** The app's analytics key, as the platform puts it in the build config. */
const keyOf = (id: string) => createHmac("sha256", E2E.signingSecret).update(`analytics:v1:${id}`).digest("base64url").slice(0, 32);

async function send(request: APIRequestContext, body: unknown, key = keyOf(appId)) {
  return request.post(`/api/v1/apps/${appId}/events`, {
    headers: { "x-yallapp-analytics-key": key, "x-country": "TR", "x-forwarded-for": "203.0.113.44" },
    data: body,
  });
}

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 01 44");
  await own.getByLabel("Your website (optional)").fill(`https://tulip-${suffix}.shop.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.analyticsAdminEmail);
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
});

test("Analytics explains when its numbers appear", async () => {
  await own.goto("/dashboard/app-type");
  await own.getByText("Store", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  const api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
  appId = /\/api\/app\/([0-9a-f-]{36})$/.exec(api)![1]!;

  await own.getByRole("link", { name: "Analytics" }).click();
  await expect(own.getByRole("heading", { name: "Analytics", level: 1 })).toBeVisible();
  await expect(own.getByText("Installs are counted when the app is first opened.")).toBeVisible();
  await expect(own.getByText("No usage in this range yet")).toBeVisible();
  await expect(own.getByText("The app preview in the dashboard isn't counted.")).toBeVisible();
  await expect(own.getByRole("link", { name: "Last 30 days" })).toHaveAttribute("aria-current", "page");
});

test("the app's events arrive, and bad ones are refused", async ({ request }) => {
  const batch = (install: string, platform: string, events: Record<string, unknown>[]) => ({
    install_id: install,
    platform,
    app_version: platform === "ios" ? "1.1.0" : "1.2.0",
    os_version: platform === "ios" ? "iOS 18.1" : "Android 14",
    locale: platform === "ios" ? "en-GB" : "tr",
    events,
  });
  const first = await send(
    request,
    batch(a, "android", [
      { type: "app_open", at: day(-2), first_open: true },
      { type: "app_open", at: day(-1) },
      { type: "app_open", at: day(0, 0) },
      { type: "screen_view", at: day(0, 0), screen: "home" },
      { type: "item_view", at: day(0, 0), item_kind: "product", item_id: "7", title: "Tulip Bouquet" },
      { type: "add_to_cart", at: day(0, 0), item_kind: "product", item_id: "7", title: "Tulip Bouquet" },
      { type: "purchase_click", at: day(0, 0), item_kind: "product", item_id: "7", amount: 350, currency: "TRY" },
      { type: "search", at: day(0, 0), query: "Tulips" },
      { type: "search", at: day(0, 0), query: "ada@example.com" },
      { type: "push_open", at: day(0, 0), push_type: "announcement" },
      { type: "app_open", at: day(-9) },
    ]),
  );
  expect(first.status()).toBe(202);
  expect(await first.json()).toEqual({ accepted: 10, dropped: 1 });
  const second = await send(
    request,
    batch(b, "ios", [
      { type: "app_open", at: day(0, 0), first_open: true },
      { type: "item_view", at: day(0, 0), item_kind: "product", item_id: "7", title: "Tulip Bouquet" },
      { type: "search", at: day(0, 0), query: "tulips " },
    ]),
  );
  expect(second.status()).toBe(202);

  expect((await send(request, batch(a, "android", [{ type: "app_open", at: day(0, 0) }]), keyOf(randomUUID()))).status()).toBe(403);
  const invalid = await send(request, batch(a, "android", [{ type: "app_open", at: day(0, 0), email: "a@b.c" }]));
  expect(invalid.status()).toBe(400);
  expect((await invalid.json()).code).toBe("invalid_request");
  expect((await request.post(`/api/v1/apps/${randomUUID()}/events`, { data: {} })).status()).toBe(404);
});

test("Dashboard › Analytics shows the numbers, compared and split", async () => {
  await own.goto("/dashboard/analytics?range=7");
  await expect(own.getByRole("link", { name: "Last 7 days" })).toHaveAttribute("aria-current", "page");
  const tile = (key: string) => own.locator(`[data-kpi="${key}"] [data-value]`);
  await expect(tile("installs")).toHaveText("2");
  await expect(tile("sessions")).toHaveText("4");
  await expect(tile("weekly")).toHaveText("2");
  await expect(own.locator('[data-kpi="installs"]')).toContainText("New vs previous 7 days");
  // A's first open two days ago came back the next day.
  await expect(own.locator('[data-retention="1"] [data-value]')).toHaveText("100%");
  await expect(own.locator('[data-retention="1"]')).toContainText("1 of 1 came back on day 1");

  await expect(own.getByRole("list", { name: "Platforms" })).toContainText("Android");
  await expect(own.getByRole("list", { name: "Platforms" })).toContainText("iOS");
  await expect(own.getByRole("list", { name: "Countries" })).toContainText(/Türkiye|Turkey/);
  await expect(own.getByRole("list", { name: "Languages" })).toContainText("Turkish");
  await expect(own.getByRole("list", { name: "Languages" })).toContainText("English");
  await expect(own.getByRole("list", { name: "Top screens" })).toContainText("Home");

  const products = own.getByRole("region", { name: "Top products" });
  await expect(products.getByRole("row", { name: /Tulip Bouquet/ })).toContainText("2");
  const funnel = own.getByRole("list", { name: "Conversions" });
  await expect(funnel).toContainText("Viewed");
  await expect(funnel).toContainText("Added to cart");
  await expect(funnel).toContainText("50.0% of views");
  await expect(own.getByText(/Value taken to checkout: ₺350\.00/)).toBeVisible();
  // A search made twice shows; the one that looked like an email address was never kept.
  const searches = own.getByRole("region", { name: "Top searches" });
  await expect(searches.getByRole("row", { name: /tulips/ })).toContainText("2");
  await expect(searches).not.toContainText("example.com");
  await expect(own.getByRole("region", { name: "Notifications" })).toContainText("Announcements");

  // The chart reads out each day on keyboard focus; its numbers are also in a table.
  const chart = own.getByRole("img", { name: /Daily active users/ });
  await chart.focus();
  await expect(own.locator("[data-chart-tooltip]")).toContainText("Last 7 days");
  await own.getByText("Show as a table").click();
  await expect(own.getByRole("table", { name: "Daily active users, installs and sessions" })).toBeVisible();

  // A custom range.
  const custom = own.getByRole("form", { name: "Custom range" });
  const yesterday = day(-1).slice(0, 10);
  await custom.getByLabel("From").fill(yesterday);
  await custom.getByLabel("To").fill(yesterday);
  await custom.getByRole("button", { name: "Apply" }).click();
  await expect(own).toHaveURL(/range=custom/);
  await expect(tile("installs")).toHaveText("0");
  await expect(tile("sessions")).toHaveText("1");
});

test("Export CSV downloads the same totals", async () => {
  await own.goto("/dashboard/analytics?range=7");
  const [download] = await Promise.all([own.waitForEvent("download"), own.getByRole("link", { name: "Export CSV" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^analytics-\d{4}-\d{2}-\d{2}-to-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = (await readFile((await download.path())!, "utf8")).replace(/^﻿/, "");
  const lines = csv.trim().split("\r\n");
  expect(lines[0]).toBe("section,name,detail,value,previous_period");
  expect(lines).toContain("Summary,Installs (first opens),,2,0");
  expect(lines).toContain("Top items,Tulip Bouquet,Product 7,2,");
  expect(lines).toContain("Searches,tulips,,2,");
  // Totals only: never an install.
  expect(csv).not.toContain(a);
  expect(csv).not.toContain(b);
});

test("the team sees the summary on the client's admin page, and the daily job counts", async ({ browser, request }) => {
  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.analyticsAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: client.name, exact: true }).click();
  const card = admin.getByRole("region", { name: "Analytics, last 30 days" });
  await expect(card.locator('[data-kpi="installs"] [data-value]')).toHaveText("2");
  await expect(card).toContainText("Tulip Bouquet");
  await admin.close();

  const daily = await request.post("/api/internal/daily", { headers: { authorization: `Bearer ${E2E.internalJobSecret}` } });
  expect(daily.status()).toBe(200);
  expect((await daily.json()).analytics).toMatchObject({ finished: true, apps: expect.any(Number) });
});

test("47 days are counted in the owner's time zone, which they change on the page", async ({ request }) => {
  await own.goto("/dashboard/analytics?range=7");
  // The account's WhatsApp number is Turkish: Istanbul's days until the owner picks a zone.
  await expect(own.getByText("Days in Europe/Istanbul (GMT+3), from your account's country · Change")).toBeVisible();
  await own.getByText("Days in Europe/Istanbul").click();
  const form = own.getByRole("form", { name: "Time zone" });
  await form.getByLabel("Time zone").selectOption("Pacific/Kiritimati");
  await form.getByRole("button", { name: "Save time zone" }).click();
  await expect(form.getByRole("status")).toHaveText("Time zone saved: days are counted in Pacific/Kiritimati from now on.");

  // An event sent now is filed under Kiritimati's date (UTC+14), whatever the UTC date is.
  const kiritimatiToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Kiritimati", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const c = randomUUID();
  expect((await send(request, {
        install_id: c,
        platform: "android",
        app_version: "1.2.0",
        os_version: "Android 14",
        locale: "tr",
        events: [{ type: "app_open", at: new Date(Date.now() - 30_000).toISOString(), first_open: true }],
      })).status()).toBe(202);
  await own.goto(`/dashboard/analytics?range=custom&from=${kiritimatiToday}&to=${kiritimatiToday}`);
  await expect(own.locator('[data-kpi="installs"] [data-value]')).toHaveText("1");
  await expect(own.getByText(/Days in Pacific\/Kiritimati \(GMT\+14\) · Change/)).toBeVisible();
});
