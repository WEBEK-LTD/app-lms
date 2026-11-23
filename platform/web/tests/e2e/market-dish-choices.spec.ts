import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 115.23 A dish with a required choice, ordered end to end on Studio's
 * multi-vendor demo (Zad): the server refuses it without its choice, prices
 * it with the choice (and what the choice adds), places it, and the order
 * keeps the choice's name for the customer (and the vendor's board, which
 * shows each line's choices). 115.22 The customer is told the order was sent,
 * in the app's inbox, opening it.
 */
test.describe.configure({ mode: "serial" });

const DEMO = { countryCode: "+1", number: "2025550123", code: "246810" };
const DEVICE = { id: "e2e-market-choices", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const headers = { "x-forwarded-for": "198.51.100.231" };
let admin: Page;
let zad = "";

type Product = { id: number; name: string; price: { amount: string }; choices: { id: number; name: string; min: number; max: number; choices: { id: number; name: string; extra: string }[] }[] };

test.beforeAll(async ({ browser }) => {
  admin = await browser.newPage({ extraHTTPHeaders: headers });
  // A refresh of demos already there asks first.
  admin.on("dialog", (dialog) => void dialog.accept());
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.marketChoicesAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
});

test.afterAll(async () => {
  await admin.close();
});

async function signIn(request: APIRequestContext): Promise<string> {
  const requested = await request.post(`/api/app/${zad}/auth/otp/request`, { data: { country_code: DEMO.countryCode, phone: DEMO.number }, headers });
  expect(requested.ok(), await requested.text()).toBe(true);
  const { request_id } = await requested.json();
  const verified = await request.post(`/api/app/${zad}/auth/otp/verify`, { data: { request_id, code: DEMO.code, device: DEVICE }, headers });
  expect(verified.status()).toBe(200);
  return ((await verified.json()) as { access_token: string }).access_token;
}

test("Studio's multi-vendor demo is there", async () => {
  test.setTimeout(120_000);
  await admin.goto("/admin/demos?family=studio");
  await admin.getByRole("button", { name: /Create Studio's demo apps|Refresh all of Studio's demo apps/ }).click();
  await expect(admin.getByRole("status")).toContainText("Yallapp Studio's demos are created and up to date.", { timeout: 60_000 });
  zad = await admin.locator(`form:not(:has(input[name="variant"])):has(button:has-text("Start a build of Zad")) input[name="appId"]`).inputValue();
  expect(zad).not.toBe("");
});

test("a dish with a required choice is refused without it, and ordered with it", async ({ request }) => {
  const token = await signIn(request);
  const auth = { ...headers, authorization: `Bearer ${token}` };
  const api = (path: string) => `/api/app/${zad}/${path}`;

  // The grill house's mixed grill: "For" (one or two) must be chosen.
  const vendors = (await (await request.get(api("market/vendors?kind=restaurant&per_page=50"), { headers })).json()) as { items: { id: number; name: string }[] };
  const grill = vendors.items.find((v) => v.name === "Bab El Sharq Grill");
  expect(grill, JSON.stringify(vendors.items.map((v) => v.name))).toBeTruthy();
  const page = (await (await request.get(api(`market/vendors/${grill!.id}`), { headers })).json()) as { sections: { items: Product[] }[] };
  const dish = page.sections.flatMap((s) => s.items).find((d) => d.name === "Mixed grill")!;
  const group = dish.choices.find((g) => g.min >= 1)!;
  expect(group).toMatchObject({ name: "For", min: 1, max: 1 });
  const two = group.choices.find((c) => c.name === "Two")!;

  const cart = (choices?: number[]) => ({ vendor_id: grill!.id, fulfilment: "pickup", lines: [{ product_id: dish.id, quantity: 1, ...(choices ? { choices } : {}) }] });
  const without = await request.post(api("market/quote"), { data: cart(), headers: auth });
  expect(without.status()).toBe(400);
  expect(await without.json()).toMatchObject({ code: "invalid_request", message: "Choose for for Mixed grill.", details: { field: "lines[0]" } });

  // With the choice, as the app now sends it: priced with what it adds.
  const quoted = await request.post(api("market/quote"), { data: cart([two.id]), headers: auth });
  expect(quoted.status(), await quoted.text()).toBe(200);
  const quote = (await quoted.json()) as { quote_id: string; lines: { choices: string[]; unit_price: { amount: string } }[] };
  expect(quote.lines[0]!.choices).toEqual(["Two"]);
  expect(Number(quote.lines[0]!.unit_price.amount)).toBe(Number(dish.price.amount) + Number(two.extra));

  const placed = await request.post(api("market/orders?platform=android"), { data: { ...cart([two.id]), quote_id: quote.quote_id, payment: "cash" }, headers: auth });
  expect(placed.status(), await placed.text()).toBe(201);
  const order = ((await placed.json()) as { order: { id: number; status: string; lines: { choices: string[] }[] } }).order;
  expect(order).toMatchObject({ status: "placed", lines: [{ choices: ["Two"] }] });

  // The customer's order keeps it.
  const mine = await (await request.get(api(`me/market-orders/${order.id}`), { headers: auth })).json();
  expect(mine).toMatchObject({ id: order.id, lines: [{ name: "Mixed grill", choices: ["Two"] }] });

  // 115.22 And she was told it was sent, opening the order.
  const inbox = (await (await request.get(api("me/notifications"), { headers: auth })).json()) as { items: { title: string; type: string; market_order_id?: number }[] };
  expect(inbox.items.find((n) => n.type === "market_order_update" && n.market_order_id === order.id)).toMatchObject({ title: "Your order was sent" });
});
