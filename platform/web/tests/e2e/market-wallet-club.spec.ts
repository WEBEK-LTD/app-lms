import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 115.60–115.63 The wallet and the club, end to end, on Zad (Studio's
 * multi-vendor demo): the team, working in the demo's dashboard, adds
 * credit to the demo visitor's wallet with a reason they read, takes some
 * back, and can't take back more than there is (in the team's audit too);
 * the visitor pays part of an order from the wallet and the rest in cash;
 * then renews the club by its payment link on the app's payment page
 * (/pay/[token]), from the end of the period. Demo apps' payment page
 * takes no card ("Place demo order"); what it pays goes through the same
 * path as a gateway's payment.
 */
test.describe.configure({ mode: "serial", timeout: 120_000 });

const DEMO = { countryCode: "+1", number: "2025550123", code: "246810" };
const DEVICE = { id: "e2e-wallet-install", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.115" };
let admin: Page;
let zad = "";
let token = "";

const api = (path: string) => `/api/app/${zad}${path}`;
const auth = () => ({ authorization: `Bearer ${token}`, ...extraHTTPHeaders });

async function wallet(request: APIRequestContext) {
  const res = await request.get(api("/me/wallet"), { headers: auth() });
  expect(res.status()).toBe(200);
  return (await res.json()) as { balance: { amount: string }; entries: { kind: string; label: string; amount: { amount: string }; order_reference: string | null; rest_paid_by: string | null }[] };
}

const minor = (amount: string) => Math.round(Number(amount) * 100);

test.beforeAll(async ({ browser }) => {
  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.marketWalletAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
});

test.afterAll(async () => {
  await admin.close();
});

test("Zad's demo is there, and the demo visitor signs in to its app", async ({ request }) => {
  await admin.goto("/admin/demos?family=studio");
  await admin.getByRole("button", { name: /Create Studio's demo apps|Refresh all of Studio's demo apps/ }).click();
  await expect(admin.getByRole("status")).toContainText("Yallapp Studio's demos are created and up to date.", { timeout: 60_000 });
  zad = await admin.locator(`form:not(:has(input[name="variant"])):has(button:has-text("Start a build of Zad")) input[name="appId"]`).first().inputValue();
  expect(zad).toMatch(/^[0-9a-f-]{36}$/);
  const asked = await request.post(api("/auth/otp/request"), { data: { country_code: DEMO.countryCode, phone: DEMO.number }, headers: extraHTTPHeaders });
  expect(asked.status()).toBe(200);
  const verified = await request.post(api("/auth/otp/verify"), { data: { request_id: (await asked.json()).request_id, code: DEMO.code, device: DEVICE }, headers: extraHTTPHeaders });
  expect(verified.status()).toBe(200);
  token = (await verified.json()).access_token;
});

test("the owner's team adds credit with a reason the customer reads, and takes some back, never below zero", async ({ request }) => {
  const before = minor((await wallet(request)).balance.amount);
  await admin.goto("/admin/demos?family=studio");
  await admin.getByRole("button", { name: "Open in the dashboard (Zad)" }).click();
  await admin.waitForURL((url) => !url.pathname.startsWith("/admin"));
  await admin.goto("/dashboard/market/wallets");
  await expect(admin.getByRole("heading", { name: "Wallets", level: 1 })).toBeVisible();
  await expect(admin.getByText("no top-up by card, no cash-out, and it never expires")).toBeVisible();
  await admin.getByLabel("Customer's phone, name or email").fill("Demo visitor");
  await admin.getByRole("button", { name: "Find" }).click();
  await admin.getByRole("link", { name: /Demo visitor/ }).first().click();
  await expect(admin.getByRole("heading", { name: "Demo visitor's wallet" })).toBeVisible();

  const credit = admin.locator("form").filter({ has: admin.getByRole("heading", { name: "Add credit" }) });
  await credit.getByLabel(/Amount/).fill("50");
  await credit.getByLabel("Reason the customer sees").fill("Welcome to Zad Club");
  await credit.getByRole("button", { name: "Add credit" }).click();
  await expect(admin.getByText("Credit added. The customer sees it in their wallet now.")).toBeVisible();

  const back = admin.locator("form").filter({ has: admin.getByRole("heading", { name: "Take back credit" }) });
  await back.getByLabel(/Amount/).fill("20");
  await back.getByLabel("Reason the customer sees").fill("Given by mistake");
  await back.getByRole("button", { name: "Take back credit" }).click();
  await expect(admin.getByText("Credit taken back.")).toBeVisible();

  // More than the wallet holds: refused, nothing taken.
  const again = admin.locator("form").filter({ has: admin.getByRole("heading", { name: "Take back credit" }) });
  await again.getByLabel(/Amount/).fill(String((before + 30_00) / 100 + 1));
  await again.getByLabel("Reason the customer sees").fill("Too much");
  await again.getByRole("button", { name: "Take back credit" }).click();
  await expect(admin.getByText("The wallet doesn't have that much: you can take back up to its balance.")).toBeVisible();

  const w = await wallet(request);
  expect(minor(w.balance.amount)).toBe(before + 30_00);
  expect(w.entries.slice(0, 2).map((e) => [e.kind, e.label, e.amount.amount])).toEqual([
    ["taken_back", "Given by mistake", "-20.00"],
    ["credit", "Welcome to Zad Club", "50.00"],
  ]);

  // In the team's audit, as Yallapp's team made it.
  await admin.goto("/admin/audit");
  await expect(admin.getByText(/Added EGP\s?50\.00 to Demo visitor's wallet: Welcome to Zad Club/).first()).toBeVisible();
});

test("the owner's credit pays part of an order, the rest in cash, never below zero", async ({ request }) => {
  const balance = minor((await wallet(request)).balance.amount);
  const vendors = (await (await request.get(api("/market/vendors?lat=30.0349&lng=31.2316"), { headers: auth() })).json()) as { items: { id: number; name: string }[] };
  const grill = vendors.items.find((v) => v.name === "Bab El Sharq Grill")!;
  const menu = (await (await request.get(api(`/market/vendors/${grill.id}`), { headers: auth() })).json()) as { sections: { items: { id: number; name: string }[] }[] };
  const tawook = menu.sections.flatMap((s) => s.items).find((d) => d.name === "Shish tawook")!;
  // More than the wallet holds, so a part is left to pay.
  const quantity = Math.ceil(balance / 170_00) + 1;
  const cart = { vendor_id: grill.id, lines: [{ product_id: tawook.id, quantity }], fulfilment: "delivery", dropoff: { address: "8 Kasr El Ainy Street, Garden City", lat: 30.0349, lng: 31.2316 }, use_wallet: true };
  const quote = await request.post(api("/market/quote"), { data: cart, headers: auth() });
  expect(quote.status(), await quote.text()).toBe(200);
  const q = await quote.json();
  expect(minor(q.total.amount) - minor(q.pay_now.amount)).toBe(balance);
  const placed = await request.post(api("/market/orders?platform=android"), { data: { ...cart, quote_id: q.quote_id, payment: "cash" }, headers: auth() });
  expect(placed.status(), await placed.text()).toBe(201);
  const { order } = (await placed.json()) as { order: { id: number } };
  // The wallet's part is taken with the order, and says where it went.
  const paid = await wallet(request);
  expect(minor(paid.balance.amount)).toBe(0);
  expect(paid.entries[0]).toMatchObject({ kind: "payment", rest_paid_by: "cash" });
  expect(paid.entries[0]!.order_reference).toMatch(/^M-\d+$/);
  expect(minor(paid.entries[0]!.amount.amount)).toBe(-balance);
  const mine = (await (await request.get(api(`/me/market-orders/${order.id}`), { headers: auth() })).json()) as { payment: { method: string; wallet_used: { amount: string } | null } };
  expect(mine.payment.method).toBe("cash");
  expect(minor(mine.payment.wallet_used!.amount)).toBe(balance);
  // A second order can't spend the wallet again.
  const second = await request.post(api("/market/quote"), { data: { ...cart, lines: [{ product_id: tawook.id, quantity: 1 }] }, headers: auth() });
  const q2 = await second.json();
  expect(q2.pay_now.amount).toBe(q2.total.amount);
});

test("the club renews through the app's payment page, from the end of the period", async ({ request, page }) => {
  const club = async () => (await (await request.get(api("/me/club"), { headers: auth() })).json()).membership as { status: string; renews: boolean; current_period_end: string; plan: { id: number; period: string }; savings: { total: { amount: string } } | null };
  const before = await club();
  expect(before.status).toBe("active");
  expect(before.savings).not.toBeNull();
  const renew = await request.post(api("/me/club/renew?platform=android"), { data: {}, headers: auth() });
  expect(renew.status(), await renew.text()).toBe(201);
  const { pay_url } = (await renew.json()) as { pay_url: string };
  expect(pay_url).toMatch(/\/pay\/[\w-]+$/);
  // Nothing is charged by itself: until the page is paid, the period is the same.
  expect((await club()).current_period_end).toBe(before.current_period_end);

  await page.goto(pay_url);
  await page.getByRole("button", { name: "Place demo order" }).click();
  await page.waitForURL(/order-received/);
  const after = await club();
  const end = new Date(before.current_period_end);
  if (before.plan.period === "month") end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setUTCFullYear(end.getUTCFullYear() + 1);
  expect(new Date(after.current_period_end).toISOString().slice(0, 10)).toBe(end.toISOString().slice(0, 10));
  expect(after).toMatchObject({ status: "active", renews: true });

  // The owner's Club members page: renewed, with its new end date.
  await admin.goto("/dashboard/market/club?show=renewed");
  await expect(admin.getByRole("heading", { name: "Club members", level: 1 })).toBeVisible();
  await expect(admin.getByRole("link", { name: /Demo visitor/ })).toBeVisible();
  await expect(admin.getByText("Renewed").first()).toBeVisible();
});
