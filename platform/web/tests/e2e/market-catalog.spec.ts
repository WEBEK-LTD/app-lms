import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";
import { startFakeKashier } from "./fake-gateways";

/**
 * 115.24 A marketplace's grocery edits its own catalog: the team puts the
 * marketplace on a Studio plan (the third, which no other spec uses), the company makes a
 * Marketplace project and adds a grocery (its kind chosen on the form) with
 * a manager who signs in by email; in the vendors' panel the manager adds a
 * product sold by weight (its step, least and most, its stock in kilos) with
 * its photo; a customer orders a kilo of it from the app; the stock goes down
 * by that kilo, in the product's stock history; and the owner sees what the
 * place added, with Undo. 115.29 Then the owner takes cards on their own
 * Kashier account, a customer pays 1 kg of the cheese by card, the place
 * picks 750 g and readies it, and the 25% that wasn't weighed goes back to
 * the card on its own, shown on the order.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const STUDIO = "studio_3";
const client = { name: "Souk Catalog", email: `catalog-${suffix}@market.test`, password: "souk-catalog-strong-password-1" };
const managerEmail = `manager-${suffix}@market.test`;
const customerEmail = `customer-${suffix}@market.test`;
const SHOP = { lat: 30.0444, lng: 31.2357 };
const HOME = { address: "Cairo Tower, Zamalek", details: "Flat 4", lat: 30.0459, lng: 31.2243 };
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const device = { id: `e2e-catalog-${suffix}`, platform: "android", name: "Pixel", app_version: "1.0.0" };
let own: Page;
let admin: Page;
let api = "";
let appId = "";
let placeId = 0;
let cheeseId = 0;
let managerPanel: Page | null = null;
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.124" };

/** The latest code emailed to this address (captured in YALLAPP_MAIL_DIR). */
async function emailedCode(to: string): Promise<string> {
  const dir = path.resolve(E2E.mailDir);
  let subject = "";
  await expect(async () => {
    const files = await readdir(dir).catch(() => [] as string[]);
    const mails = (await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as { to: string; subject: string; sentAt: string }))).filter((m) => m.to === to);
    mails.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
    subject = mails.at(-1)?.subject ?? "";
    expect(subject).toMatch(/^\d{6} is your .+ code$/);
  }).toPass({ timeout: 10_000 });
  return subject.slice(0, 6);
}

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0124");
  await own.getByLabel("Your website (optional)").fill(`https://catalog-${suffix}.market.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.catalogAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
});

test.afterAll(async () => {
  await admin.close();
  await own.close();
});

test("the company makes a Marketplace project on a Studio plan with the marketplace", async () => {
  // Only this spec's plan gets the marketplace.
  await admin.goto(`/admin/plans?family=studio&plan=${STUDIO}`);
  const planForm = () => admin.locator('form[aria-label$=": the plan"]').filter({ has: admin.locator(`input[name="plan"][value="${STUDIO}"]`) });
  const plan = planForm();
  for (const feature of [/^Food delivery from many restaurants/, /^Marketplace: restaurants, supermarkets and stores/]) {
    const box = plan.getByRole("checkbox", { name: feature });
    if (!(await box.isChecked())) await box.check();
  }
  await plan.getByRole("button", { name: "Save plan" }).click();
  await admin.reload();
  await expect(planForm().getByRole("checkbox", { name: /^Marketplace: restaurants/ })).toBeChecked();

  await own.goto("/studio/new");
  await own.getByRole("radio", { name: "Marketplace: restaurants, supermarkets and stores" }).check();
  await own.getByLabel("Project name").fill(client.name);
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: "Blank page" }).click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
  appId = api.split("/api/app/")[1]!;
  expect(appId).toMatch(/^[0-9a-f-]{36}$/);

  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: client.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  const license = admin.getByRole("region", { name: client.name }).getByRole("region", { name: "Plan and license" });
  await license.getByLabel("Plan").selectOption(STUDIO);
  await license.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
});

test("the company signs customers in by email, prices delivery and adds a grocery with a manager", async () => {
  await own.goto("/dashboard/app-sign-in");
  const ways = own.getByRole("group", { name: "People sign in with" });
  await ways.getByRole("checkbox", { name: /^Email address and a code/ }).check();
  await ways.getByRole("checkbox", { name: /^Phone number and a code/ }).uncheck();
  await own.getByRole("region", { name: "How people sign in" }).getByRole("button", { name: "Save" }).click();
  await expect(async () => {
    await own.reload();
    await expect(own.getByRole("group", { name: "People sign in with" }).getByRole("checkbox", { name: /^Phone number and a code/ })).not.toBeChecked();
  }).toPass({ timeout: 15_000 });

  await own.goto("/dashboard/delivery");
  await own.getByLabel("Price (EGP)", { exact: true }).fill("30");
  await own.getByRole("button", { name: "Save settings" }).click();
  await expect(own.getByText("Saved. The app shows it the next time it opens.")).toBeVisible();

  await own.goto("/dashboard/restaurants");
  const add = own.getByRole("region", { name: "Add a restaurant" });
  await add.getByLabel("Name", { exact: true }).fill("Green Basket");
  // 115.24 The kind, on the owner's form.
  await add.getByRole("radio", { name: "A grocery (products by department)" }).check();
  await add.getByLabel("Address", { exact: true }).fill("Tahrir Square, Cairo");
  await add.getByLabel("Place on the map").fill(`${SHOP.lat}, ${SHOP.lng}`);
  await add.getByRole("radio", { name: "Up to a distance from its address" }).check();
  await add.getByLabel("km", { exact: true }).fill("20");
  await add.getByRole("button", { name: "Add" }).click();
  await expect(own).toHaveURL(/\/restaurants\/\d+\?added=1$/);
  placeId = Number(/\/restaurants\/(\d+)/.exec(own.url())![1]);
  for (const day of DAYS) {
    await own.getByLabel(`${day} Opens`).first().fill("00:00");
    await own.getByLabel(`${day} Closes`).first().fill("23:59");
  }
  await own.getByRole("button", { name: "Save hours" }).click();
  await expect(own.getByText("Saved.").first()).toBeVisible();
  // A grocery's page sends the owner to its products.
  await expect(own.getByTestId("open-catalog")).toBeVisible();

  await own.getByRole("tab", { name: /Staff/ }).click();
  await own.locator("#f-staff-name").fill("Rana");
  await own.locator("#f-staff-email").fill(managerEmail);
  await own.locator("form", { has: own.locator("#f-staff-name") }).getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText(managerEmail)).toBeVisible();
});

test("the place's manager adds a product sold by weight, a customer orders it, and the stock goes down", async ({ browser, request }) => {
  test.setTimeout(150_000);
  const panel = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.125" } });
  await panel.goto(`/partner/${appId}?lang=en`);
  await panel.getByLabel("Email").fill(managerEmail);
  await panel.getByRole("button", { name: "Send the code" }).click();
  await panel.getByLabel("Code").fill(await emailedCode(managerEmail));
  await panel.getByRole("button", { name: "Sign in" }).click();
  await expect(panel.getByRole("button", { name: "Sign out" })).toBeVisible();

  await panel.goto(`/partner/${appId}?tab=catalog&lang=en`);
  await panel.getByTestId("add-product").click();
  const editor = panel.getByTestId("product-editor");
  await editor.getByLabel("Name", { exact: true }).fill("Roumi cheese");
  await editor.getByLabel("Name in Arabic").fill("جبنة رومي");
  await editor.getByLabel("Price (EGP)", { exact: true }).fill("200");
  await editor.getByRole("radio", { name: "By weight" }).check();
  await editor.getByRole("combobox", { name: /^Unit/ }).selectOption("kg");
  await editor.getByLabel("Step", { exact: true }).fill("0.25");
  await editor.getByLabel("Least", { exact: true }).fill("0.5");
  await editor.getByLabel("Most", { exact: true }).fill("2");
  await editor.getByLabel("SKU", { exact: true }).fill(`ROUMI-${suffix}`);
  await editor.getByLabel("Stock", { exact: true }).fill("3");
  await editor.getByTestId("save-product").click();
  await expect(panel.getByText("Saved.")).toBeVisible();
  await expect(panel.getByTestId("product-editor").getByLabel("Stock", { exact: true })).toHaveValue("3");

  // Its photo (customers see only products with one).
  const card = panel.locator("li", { hasText: "Roumi cheese" }).first();
  await card.getByText("Add a photo").click();
  await card.locator('input[type="file"][name="photo"]').first().setInputFiles({ name: "cheese.png", mimeType: "image/png", buffer: solidPng(400, 400, [236, 214, 160]) });
  await card.getByRole("button", { name: "Upload" }).first().click();
  await expect(panel.locator("li", { hasText: "Roumi cheese" }).first().getByText("Photo · 1")).toBeVisible();

  // A customer signs in by email and orders a kilo, in steps of a quarter.
  const asked = (await (await request.post(`${api}/auth/email/request`, { data: { email: customerEmail }, headers: { "x-forwarded-for": "198.51.100.126" } })).json()) as { request_id: string };
  const verified = (await (await request.post(`${api}/auth/otp/verify`, { data: { request_id: asked.request_id, code: await emailedCode(customerEmail), device } })).json()) as { signup_token: string };
  const registered = await request.post(`${api}/auth/register`, { data: { signup_token: verified.signup_token, name: "Mona Adel", device } });
  expect(registered.status()).toBe(201);
  const headers = { authorization: `Bearer ${((await registered.json()) as { access_token: string }).access_token}` };
  // The plan's change reaches the app's API once the platform settings' cache (30 seconds) renews.
  let listed = await request.get(`${api}/market/vendors/${placeId}/products?cursor=`, { headers });
  await expect(async () => {
    listed = await request.get(`${api}/market/vendors/${placeId}/products?cursor=`, { headers });
    expect(listed.status(), await listed.text()).toBe(200);
  }).toPass({ timeout: 45_000, intervals: [2_000] });
  const products = (await listed.json()) as { items: { id: number; name: string; sold_by: { kind: string; step: number; min: number; max: number } }[]; next_cursor: string | null };
  const cheese = products.items.find((p) => p.name === "Roumi cheese")!;
  cheeseId = cheese.id;
  expect(cheese.sold_by).toMatchObject({ kind: "weight", step: 0.25, min: 0.5, max: 2 });
  const cart = { vendor_id: placeId, lines: [{ product_id: cheese.id, quantity: 1 }], fulfilment: "delivery", dropoff: HOME };
  const quote = await request.post(`${api}/market/quote`, { headers, data: cart });
  expect(quote.status(), await quote.text()).toBe(200);
  const placed = await request.post(`${api}/market/orders?platform=android`, { headers, data: { ...cart, quote_id: ((await quote.json()) as { quote_id: string }).quote_id, payment: "cash" } });
  expect(placed.status(), await placed.text()).toBe(201);
  const order = ((await placed.json()) as { order: { reference: string; estimated: boolean } }).order;
  expect(order.estimated).toBe(true);

  // 3 kg less the kilo: 2 kg left, and the order in the product's stock history.
  await panel.goto(`/partner/${appId}?tab=catalog&lang=en&edit=${cheese.id}`);
  await expect(panel.getByTestId("product-editor").getByLabel("Stock", { exact: true })).toHaveValue("2");
  await expect(panel.getByTestId("stock-history")).toContainText(`Order ${order.reference}`);
  await expect(panel.getByTestId("stock-history")).toContainText("3 kg → 2 kg");
  const after = (await (await request.get(`${api}/market/vendors/${placeId}/products?q=${encodeURIComponent("جبنه")}`, { headers })).json()) as { items: { id: number; stock: number | null }[] };
  expect(after.items.find((p) => p.id === cheese.id)?.stock).toBe(2);
  managerPanel = panel;

  // The owner sees what the place added, with Undo.
  await own.goto(`/dashboard/restaurants/${placeId}/catalog`);
  await expect(own.getByTestId("place-changes")).toContainText("Added the product Roumi cheese");
  await expect(own.getByTestId("place-changes").getByRole("button", { name: "Undo" }).first()).toBeVisible();
});

test("a weighed card order picked lighter gets the difference back on its card, shown on the order", async ({ request }) => {
  test.setTimeout(150_000);
  const kashier = await startFakeKashier(E2E.kashierPort);
  try {
    // The owner's own Kashier account, and the marketplace takes cards through it.
    await own.goto("/dashboard/payments");
    const payments = own.getByRole("region", { name: "Card payments" });
    await payments.getByRole("button", { name: "Connect", exact: true }).click();
    await payments.locator('[data-gateway="kashier"]').click();
    await payments.getByLabel("Merchant ID").fill("MID-1524-001");
    await payments.getByLabel("Payment API key").fill("souk-kashier-api-key");
    await payments.getByLabel("Secret key").fill("souk-kashier-secret");
    await payments.getByText("Test mode keys").click();
    await payments.getByRole("button", { name: "Save keys" }).click();
    await expect(payments.getByText("Kashier keys saved.")).toBeVisible();
    await own.goto("/dashboard/market/settings");
    await own.getByLabel("Payment gateway").selectOption("kashier");
    await own.getByRole("button", { name: "Save the settings" }).click();
    await expect(own.getByText("The marketplace settings are saved.")).toBeVisible();

    // The customer pays 1 kg (EGP 200) by card on Kashier's form.
    const asked = (await (await request.post(`${api}/auth/email/request`, { data: { email: `card-${customerEmail}` }, headers: { "x-forwarded-for": "198.51.100.127" } })).json()) as { request_id: string };
    const verified = (await (await request.post(`${api}/auth/otp/verify`, { data: { request_id: asked.request_id, code: await emailedCode(`card-${customerEmail}`), device: { ...device, id: `${device.id}-card` } } })).json()) as { signup_token: string };
    const registered = await request.post(`${api}/auth/register`, { data: { signup_token: verified.signup_token, name: "Karim Card", device: { ...device, id: `${device.id}-card` } } });
    const headers = { authorization: `Bearer ${((await registered.json()) as { access_token: string }).access_token}` };
    const cart = { vendor_id: placeId, lines: [{ product_id: cheeseId, quantity: 1 }], fulfilment: "delivery", dropoff: HOME };
    let placed = await request.post(`${api}/market/orders?platform=android`, { headers, data: cart });
    await expect(async () => {
      const quote = await request.post(`${api}/market/quote`, { headers, data: cart });
      placed = await request.post(`${api}/market/orders?platform=android`, { headers, data: { ...cart, quote_id: ((await quote.json()) as { quote_id: string }).quote_id, payment: "card" } });
      // Cards are offered once the settings' cache (30 seconds) has the gateway.
      expect(placed.status(), await placed.text()).toBe(201);
    }).toPass({ timeout: 45_000, intervals: [3_000] });
    const { order, pay_url: payUrl } = (await placed.json()) as { order: { id: number; status: string }; pay_url: string };
    expect(order.status).toBe("awaiting_payment");
    const page = managerPanel!;
    await page.goto(payUrl);
    for (const [field, value] of [["Full name", "Karim Card"], ["Mobile number", "+20 100 222 3345"], ["Email", `card-${customerEmail}`], ["City", "Cairo"], ["Address", "Cairo Tower, Zamalek"]] as const) {
      const input = page.getByLabel(field, { exact: true });
      if (await input.count()) await input.fill(value);
    }
    await page.getByRole("button", { name: /^Pay / }).click();
    await page.frameLocator("iframe[data-kashier-embedded]").getByRole("button", { name: "Pay with test card" }).click();
    await expect(page).toHaveURL(/order-received$/);
    await expect(async () => {
      const mine = (await (await request.get(`${api}/me/market-orders/${order.id}`, { headers })).json()) as { status: string; payment: { status: string } };
      expect(mine).toMatchObject({ status: "placed", payment: { status: "paid" } });
    }).toPass({ timeout: 15_000 });

    // The place accepts it, weighs 750 g and readies it, from its board.
    const board = `/api/partner/${appId}/board`;
    await page.goto(`/partner/${appId}?lang=en`);
    expect((await page.request.post(board, { data: { action: "accept", order_id: order.id, prep_minutes: 10 } })).status()).toBe(200);
    expect((await page.request.post(board, { data: { action: "lines", order_id: order.id, lines: [{ line_id: 1, outcome: "picked", quantity: 0.75 }] } })).status()).toBe(200);
    expect((await page.request.post(board, { data: { action: "ready", order_id: order.id } })).status()).toBe(200);

    // EGP 50 back to the card, once, through the owner's Kashier keys.
    const seen = await (await request.get(`${api}/me/market-orders/${order.id}`, { headers })).text();
    expect(kashier.refunds, seen).toHaveLength(1);
    expect(kashier.refunds[0]!.authorization).toBe("souk-kashier-secret");
    expect(JSON.stringify(kashier.refunds[0]!.body)).toContain("50");
    const settled = (await (await request.get(`${api}/me/market-orders/${order.id}`, { headers })).json()) as { estimated: boolean; settlement: Record<string, { amount: string }>; price: { kind: string; amount: { amount: string } }[]; payment: { status: string } };
    expect(settled).toMatchObject({ estimated: false, payment: { status: "partly_refunded" }, settlement: { paid: { amount: "200.00" }, final: { amount: "150.00" }, to_card: { amount: "50.00" }, to_wallet: { amount: "0.00" } } });
    expect(settled.price.at(-1)).toMatchObject({ kind: "refund", amount: { amount: "-50.00" } });
    // Readied again (a second tap): nothing more goes back.
    await page.request.post(board, { data: { action: "ready", order_id: order.id } });
    expect(kashier.refunds).toHaveLength(1);
    await page.close();
  } finally {
    await kashier.close();
  }
});
