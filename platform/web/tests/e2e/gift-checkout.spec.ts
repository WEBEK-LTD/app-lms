import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakeStripe, type FakeServer } from "./fake-stripe-paypal-servers";

/**
 * 168 The gift checkout end to end (docs/qa/2026-11-18-gift-checkout/NOTES.md):
 * a flower shop started from Leqaa in Studio, in dirhams, with the gift
 * checkout, delivery times and shipping by distance, and its own Stripe (a
 * fake). The app's cart keeps the pin's shipping while the day waits for
 * its time and reads its breakdown in Arabic; the payment page doesn't ask
 * again for a city the order never had; the owner opens the pin on a map.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Salma Bennani", email: `gift-${suffix}@kechflora.test`, password: "kech-flora-strong-password-1" };
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.168" };
const MEDINA = { lat: 31.6258, lng: -7.9891 };
let own: Page;
let api = "";
let stripe: FakeServer;
let rosesId = 0;
let cardId = 0;
const problems: string[] = [];

/** The shop's tomorrow, in its time zone. */
const tomorrow = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Casablanca" }).format(new Date(Date.now() + 86_400_000));

test.beforeAll(async ({ browser }, info) => {
  // Two sign-ups, a demo made into an app and its plan.
  info.setTimeout(180_000);
  stripe = await startFakeStripe(E2E.stripePort, { accountName: "KechFlora" });
  own = await browser.newPage({ extraHTTPHeaders });
  own.on("pageerror", (e) => problems.push(`pageerror on ${own.url()}: ${e.message}`));
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+212 600 000 168");
  await own.getByLabel("Your website (optional)").fill(`https://gift-${suffix}.kechflora.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.giftCheckoutAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");

  // The owner's way: Studio's demos, Leqaa, its name.
  await own.goto("/start?for=studio");
  await own.locator('[data-section="studio"] a[data-demo="flowers"]').click();
  await own.getByRole("link", { name: "Start with this app" }).click();
  await own.getByLabel("Your app's name").fill("KechFlora");
  await own.getByRole("button", { name: "Create my app" }).click();
  await expect(own).toHaveURL(/\/studio\/editor\?from=demo$/);
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();

  // Its plan, so the app's API answers.
  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: client.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  // The Studio app's own plan (its region is the app's).
  const plan = admin.getByRole("region", { name: "Plan and license" }).first();
  await plan.getByLabel("Plan").selectOption("studio_1");
  await plan.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();
});

test.afterAll(async () => {
  await own.close();
  await stripe.close();
});

test("the shop: dirhams, the gift checkout, delivery times, shipping by distance and its Stripe", async () => {
  await own.goto("/dashboard/catalog/settings");
  await own.getByLabel("Currency", { exact: true }).selectOption("MAD");
  // Every order pays its delivery (Leqaa's demo delivers free over an amount).
  await own.getByLabel("Free shipping from").fill("");
  await own.getByRole("button", { name: "Save settings" }).click();
  await expect(own.getByLabel("Currency", { exact: true })).toHaveValue("MAD");

  await own.goto("/dashboard/selling");
  const mode = own.locator("[data-checkout-mode]");
  await mode.getByLabel(/^Gift checkout/).check();
  await mode.getByRole("button", { name: "Save" }).click();
  await expect(mode.getByText("Saved.")).toBeVisible();
  await own.getByRole("tab", { name: "Delivery times" }).click();
  const delivery = own.locator("[data-delivery-form]");
  await delivery.getByLabel("Customers choose the delivery day").check();
  await delivery.locator("select[name=timezone]").selectOption("Africa/Casablanca");
  await delivery.getByRole("textbox", { name: "Extra fee (MAD), time 3" }).fill("20");
  await delivery.getByRole("button", { name: "Save delivery times" }).click();
  await expect(delivery.getByText("Saved.")).toBeVisible();
  await own.getByRole("tab", { name: "Areas and fees" }).click();
  await own.locator("input[name=shippingMode][value=distance]").check();
  await own.getByLabel("Your shop's latitude").fill("31.6295");
  await own.getByLabel("Your shop's longitude").fill("-7.9811");
  await own.getByLabel("Up to (km)").fill("30");
  await own.getByLabel(/^Base fee/).fill("20");
  await own.getByLabel(/^Per km/).fill("4");
  await own.getByRole("button", { name: "Save where you deliver" }).click();
  // The app's config has it: by distance, from the shop, with the gift checkout and its times.
  await expect
    .poll(async () => ((await (await own.request.get(`${api}/config?platform=android&app_version=1.0.0`)).json()) as { store?: { shipping?: { mode?: string } } }).store?.shipping?.mode)
    .toBe("distance");

  await own.goto("/dashboard/payments");
  const payments = own.getByRole("region", { name: "Card payments" });
  await payments.getByRole("button", { name: "Connect", exact: true }).click();
  await payments.locator('[data-gateway="stripe"]').click();
  await payments.getByLabel("Publishable key").fill("pk_test_51KechFloraKey");
  await payments.getByLabel("Secret key").fill("sk_test_51KechFloraKey");
  await payments.getByLabel("Webhook signing secret").fill("whsec_KechFloraSigningSecret01");
  await payments.getByRole("button", { name: "Save keys" }).click();
  await expect(payments.getByText("Stripe keys saved.")).toBeVisible();

  // The shop's own bouquet, with its photo; Leqaa's card comes with it as an add-on.
  await own.goto("/dashboard/catalog/new");
  await own.getByLabel("Name", { exact: true }).fill("Marrakech Red Roses");
  await own.getByLabel("Description").fill("Twenty-four red roses from the Ourika valley.");
  await own.getByLabel("Price (MAD)", { exact: true }).fill("450");
  await own.locator('input[name="images"]').setInputFiles("public/flower-photos/red-rose.jpg");
  await own.getByRole("button", { name: "Add product" }).click();
  await expect(own.getByRole("button", { name: "Marrakech Red Roses", exact: true })).toBeVisible();
  const products = (await (await own.request.get(`${api}/store/products?per_page=50`)).json()) as { items: { id: number; name: string }[] };
  rosesId = products.items.find((p) => p.name === "Marrakech Red Roses")!.id;
  const detail = (await (await own.request.get(`${api}/store/products/${rosesId}`)).json()) as { addons: { id: number; name: string }[] };
  cardId = detail.addons.find((a) => a.name === "Greeting Card")!.id;
  expect(cardId).toBeGreaterThan(0);
});

test("the cart keeps the pin's shipping while the day waits for its time, and reads it in Arabic", async ({ request }) => {
  const lines = [{ product_id: rosesId, quantity: 1 }];
  const recipient = { name: "", phone: "", ...MEDINA };
  const quote = async (body: Record<string, unknown>, lang = "en") =>
    (await (await request.post(`${api}/store/cart?platform=android`, { data: { lines, recipient, ...body }, headers: { "accept-language": lang } })).json()) as {
      shipping: string | null;
      total: string;
      delivery_problem: { message: string } | null;
      shipping_breakdown: { label: string; rule: string }[] | null;
    };
  const pinned = await quote({});
  // 20 base and about 0.9 km at 4 a km.
  expect(pinned.shipping).toMatch(/^MAD\s23\.\d0$/);
  // The day chosen, its time not yet: the shipping stays (it went to nothing before 168).
  const waiting = await quote({ delivery_date: tomorrow() });
  expect(waiting).toMatchObject({ shipping: pinned.shipping, total: pinned.total, delivery_problem: { message: "Choose a delivery time." } });
  // The evening, with its fee; the breakdown in the customer's language.
  const evening = await quote({ delivery_date: tomorrow(), delivery_slot: "s3" }, "ar");
  expect(evening.delivery_problem).toBeNull();
  expect(evening.shipping_breakdown!.map((l) => l.label)).toEqual(["الرسوم الأساسية", expect.stringMatching(/ كم$/), "16:00–20:00"]);
});

test("the payment page takes the gift without a city the order never had, and the owner opens the pin", async ({ page, request }) => {
  const link = await request.post(`${api}/store/checkout-link?platform=android`, {
    data: {
      lines: [
        { product_id: rosesId, quantity: 1 },
        { product_id: cardId, quantity: 1, addon_of: rosesId },
      ],
      delivery_date: tomorrow(),
      delivery_slot: "s3",
      gift_message: "Happy birthday Amina!",
      sender: { name: "Salma Bennani", phone: "+212600000168", email: "salma@example.com" },
      recipient: { name: "Amina El Idrissi", phone: "+212611223344", address: "Riad Laarous, Derb Sidi Bouloukat 12, Medina", ...MEDINA },
    },
  });
  expect(link.status(), await link.text()).toBe(200);
  await page.goto(((await link.json()) as { url: string }).url);
  await expect(page.locator("[data-pay-delivery]")).toContainText("16:00–20:00 to Amina El Idrissi");
  // The sender pays; it goes to the recipient's address; no city to type.
  await expect(page.getByLabel("Full name")).toHaveValue("Salma Bennani");
  await expect(page.getByLabel("Address")).toHaveValue("Riad Laarous, Derb Sidi Bouloukat 12, Medina");
  await expect(page.getByLabel("City (optional)")).toHaveValue("");
  await page.getByRole("button", { name: /^Pay MAD/ }).click();
  await expect(page.getByText("Enter your city.")).toHaveCount(0);
  await page.getByRole("button", { name: "Pay with test card" }).click();
  await expect(page).toHaveURL(/\/order-received$/);
  await expect(page.getByText(/is placed and paid/)).toBeVisible();

  // The owner's order: the card, the slot, the add-on, and the pin on a map for the courier.
  await own.goto("/dashboard/orders");
  await own.getByRole("button", { name: /Order \d+ · MAD/ }).first().click();
  const order = own.getByRole("dialog");
  await expect(order).toContainText("Add-on: Greeting Card");
  await expect(order).toContainText("Happy birthday Amina!");
  await expect(order).toContainText("16:00–20:00");
  await expect(order.locator("[data-order-pin]")).toHaveAttribute("href", `https://www.google.com/maps/search/?api=1&query=${MEDINA.lat},${MEDINA.lng}`);
  await expect(order.locator("[data-order-pin]")).toHaveText("The pin on the map");
  expect(problems).toEqual([]);
});
