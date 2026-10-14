import { readdir, readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 26 A café without a website: the owner sets a menu with options and
 * pickup and delivery, a customer orders a dish with options for delivery
 * and pays (against a fake iyzico), the kitchen moves the order on and the
 * app sees each step.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so the sign-up and sign-in limits per IP don't reach the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.226" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Defne Café", email: `defne-${suffix}@cafe.test`, password: "defne-strong-password-1" };
let own: Page;
let api = "";
let headers: Record<string, string> = {};
let server: Server;
const payments = new Map<string, { callbackUrl: string; basketId: string; price: string }>();

test.beforeAll(async ({ browser }) => {
  // A fake iyzico, as in catalog.spec.ts.
  const base = `http://localhost:${E2E.iyzicoPort}`;
  server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => {
      const url = new URL(request.url ?? "/", base);
      const send = (json: unknown) => response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(json));
      if (url.pathname === "/payment/bin/check") return send({ status: "success" });
      if (url.pathname.endsWith("/checkoutform/initialize/auth/ecom")) {
        const input = JSON.parse(body) as { callbackUrl: string; basketId: string; price: string };
        const token = `iyzi-r-${payments.size + 1}`;
        payments.set(token, input);
        return send({ status: "success", token, paymentPageUrl: `${base}/pay?token=${token}` });
      }
      if (url.pathname.endsWith("/checkoutform/auth/ecom/detail")) {
        const { token } = JSON.parse(body) as { token: string };
        const payment = payments.get(token)!;
        return send({ status: "success", paymentStatus: "SUCCESS", paymentId: "888", paidPrice: Number(payment.price), basketId: payment.basketId });
      }
      if (url.pathname === "/pay") {
        const token = url.searchParams.get("token")!;
        response.writeHead(200, { "content-type": "text/html" }).end(
          `<!doctype html><title>iyzico</title><form method="post" action="${payments.get(token)!.callbackUrl}"><input type="hidden" name="token" value="${token}"><button>Pay with test card</button></form>`,
        );
        return;
      }
      response.writeHead(404).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(E2E.iyzicoPort, resolve));

  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 46");
  await own.getByLabel("Your website (optional)").fill(`https://defne-${suffix}.cafe.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.restaurantAdminEmail);
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
  await new Promise((resolve) => server.close(resolve));
});

async function mailsTo(to: string): Promise<{ to: string; subject: string; text: string; sentAt: string }[]> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = (await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as { to: string; subject: string; text: string; sentAt: string }))).filter(
    (m) => m.to === to,
  );
  return mails.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

test("the café sets up its menu with options, pickup and delivery", async () => {
  await own.goto("/dashboard/app-type");
  await own.getByText("Restaurant & café", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await expect(own.getByText("on the Menu page, and follow orders on the Kitchen page")).toBeVisible();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();

  // The menu speaks of a menu and a kitchen.
  const nav = own.getByRole("navigation", { name: "Dashboard" });
  await expect(nav.getByRole("link", { name: "Kitchen" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Products" })).toHaveCount(0);
  await nav.getByRole("link", { name: "Menu", exact: true }).click();
  await expect(own.getByRole("heading", { name: "Menu", level: 1 })).toBeVisible();

  await own.getByLabel("New category").fill("Mains");
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByLabel("Category name")).toHaveValue("Mains");

  await own.getByLabel("API key").fill("sandbox-api-key");
  await own.getByLabel("Secret key").fill("sandbox-secret-key");
  await own.getByText("Sandbox keys").click();
  await own.getByRole("button", { name: "Save keys" }).click();
  await expect(own.getByText("iyzico keys saved.")).toBeVisible();

  // Pickup and delivery: open all day (so the test never runs while closed), a fee, a minimum and two districts.
  const kitchen = own.getByRole("region", { name: "Pickup and delivery" });
  for (const day of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]) {
    await kitchen.getByLabel(`${day} opens at`).fill("00:00");
    await kitchen.getByLabel(`${day} closes at`).fill("23:59");
  }
  await kitchen.getByLabel("Delivery fee (TRY)").fill("30");
  await kitchen.getByLabel("Minimum order for delivery (TRY)").fill("100");
  await kitchen.getByLabel("Delivery areas").fill("Moda\nCaferağa");
  await kitchen.getByLabel("Pickup address").fill("Moda Caddesi 41");
  await kitchen.getByRole("button", { name: "Save pickup and delivery" }).click();
  await expect(kitchen.getByText("Pickup and delivery saved.")).toBeVisible();

  await own.getByRole("link", { name: "Add dish" }).click();
  await expect(own.getByRole("heading", { name: "New dish" })).toBeVisible();
  await expect(own.getByText("Digital product")).toHaveCount(0);
  await own.getByLabel("Name", { exact: true }).fill("Defne Burger");
  await own.getByLabel("Price (TRY)", { exact: true }).fill("460");
  await own.getByLabel("Mains").check();
  await own.getByRole("button", { name: "Add an option group" }).click();
  await own.getByLabel("Group 1 name").fill("Size");
  await own.getByLabel("Group 1 option 1", { exact: true }).fill("Single");
  await own.getByLabel("Group 1 option 2", { exact: true }).fill("Double");
  await own.getByLabel("Group 1 option 2 extra price").fill("150");
  await own.getByRole("button", { name: "Add an option group" }).click();
  await own.getByLabel("Group 2 name").fill("Extras");
  await own.getByLabel("Group 2 at least").fill("0");
  await own.getByLabel("Group 2 at most").fill("3");
  await own.getByLabel("Group 2 option 1", { exact: true }).fill("Cheddar");
  await own.getByLabel("Group 2 option 1 extra price").fill("40");
  await own.getByLabel("Group 2 option 2", { exact: true }).fill("Bacon");
  await own.getByLabel("Group 2 option 2 extra price").fill("50");
  await own.getByRole("button", { name: "Add dish" }).click();
  // Three extras out of two isn't possible: the server says so and keeps what was typed.
  await expect(own.getByText('Extras: "at most" can be 1 to 2.')).toBeVisible();
  await own.getByLabel("Group 2 at most").fill("2");
  // The category tick starts again after a refused save (React resets the form's own fields).
  await own.getByLabel("Mains").check();
  await own.getByRole("button", { name: "Add dish" }).click();
  await expect(own.getByRole("status")).toContainText("Saved “Defne Burger”.");
  await expect(own.getByRole("link", { name: /Defne Burger/ })).toContainText("₺460.00 · 2 option groups · Mains");

  // The options come back in the editor as saved.
  await own.getByRole("link", { name: /Defne Burger/ }).click();
  await expect(own.getByLabel("Group 1 option 2 extra price")).toHaveValue("150.00");
});

async function signInCustomer(request: APIRequestContext) {
  await own.getByRole("link", { name: "App sign-in" }).click();
  await own.getByText("Phone number or email address").click();
  await own.getByRole("button", { name: "Save sign-in methods" }).click();
  await expect(own.getByRole("status").first()).toContainText("Saved.");
  const email = `diner-${suffix}@example.com`;
  const device = { id: `e2e-cafe-${suffix}`, platform: "ios", name: "iPhone", app_version: "1.0.0" };
  const asked = (await (await request.post(`${api}/auth/email/request`, { data: { email } })).json()) as { request_id: string };
  const code = (await mailsTo(email)).at(-1)!.subject.slice(0, 6);
  const verified = (await (await request.post(`${api}/auth/otp/verify`, { data: { request_id: asked.request_id, code, device } })).json()) as { signup_token: string };
  const registered = await request.post(`${api}/auth/register`, { data: { signup_token: verified.signup_token, name: "Deniz Aç", device } });
  expect(registered.status()).toBe(201);
  headers = { authorization: `Bearer ${((await registered.json()) as { access_token: string }).access_token}` };
}

test("a customer orders the dish with options for delivery, on the iPhone, and pays", async ({ page, request }) => {
  const config = await (await request.get(`${api}/config?platform=ios&app_version=1.0.0`)).json();
  expect(config.vertical).toBe("restaurant");
  expect(config.store).toMatchObject({
    guest_checkout: false,
    fulfilment: { pickup: true, delivery: true, delivery_fee: "30.00", min_order: "100.00", delivery_areas: ["Moda", "Caferağa"], pickup_address: "Moda Caddesi 41" },
  });
  const times = await (await request.get(`${api}/store/order-times`)).json();
  expect(times).toMatchObject({ open_now: true, asap: true });

  const products = await (await request.get(`${api}/store/products`)).json();
  const id = products.items[0].id as number;
  const dish = await (await request.get(`${api}/store/products/${id}`)).json();
  const [size, extras] = dish.option_groups as { options: { id: string; name: string }[] }[];
  const double = size!.options.find((o) => o.name === "Double")!.id;
  const cheddar = extras!.options[0]!.id;

  // The server prices the choices; a missing size is refused.
  const quote = await (await request.post(`${api}/store/cart?platform=ios`, { data: { lines: [{ product_id: id, quantity: 1, options: [double, cheddar] }] } })).json();
  expect(quote).toMatchObject({ subtotal: "₺650.00", lines: [{ unit_price: "₺650.00", options: [{ name: "Double" }, { name: "Cheddar" }] }] });
  const missing = await (await request.post(`${api}/store/cart?platform=ios`, { data: { lines: [{ product_id: id, quantity: 1, options: [cheddar] }] } })).json();
  expect(missing.lines[0]).toMatchObject({ available: false, problem: "Choose a size." });

  await signInCustomer(request);
  const lines = [{ product_id: id, quantity: 1, options: [double, cheddar] }];
  const outside = await request.post(`${api}/store/checkout-link?platform=ios`, {
    headers,
    data: { lines, fulfilment: "delivery", delivery_address: { address: "Bağdat Caddesi 1", district: "Suadiye" } },
  });
  expect(outside.status()).toBe(400);
  expect(await outside.json()).toMatchObject({ code: "outside_delivery_area" });
  // Food is a physical good: the iPhone app sells it.
  const link = await request.post(`${api}/store/checkout-link?platform=ios`, {
    headers,
    data: { lines, fulfilment: "delivery", delivery_address: { address: "Moda Cd. 12, flat 3", district: "Moda", notes: "Door code 12" } },
  });
  expect(link.status()).toBe(200);
  const { url } = (await link.json()) as { url: string };

  await page.goto(url);
  const summary = page.getByRole("region", { name: /Order \d+/ });
  await expect(summary).toContainText("Double, Cheddar");
  await expect(summary).toContainText("Delivery fee");
  await expect(summary).toContainText("₺680.00");
  await expect(summary).toContainText("Delivery as soon as possible to Moda Cd. 12, flat 3, Moda");
  await expect(page.getByLabel("Address")).toHaveValue("Moda Cd. 12, flat 3");
  await page.getByLabel("Full name").fill("Deniz Aç");
  await page.getByLabel("Mobile number").fill("0532 765 43 21");
  await page.getByLabel("Email").fill(`diner-${suffix}@example.com`);
  await page.getByLabel("City").fill("Istanbul");
  await page.getByRole("button", { name: "Pay ₺680.00" }).click();
  await page.getByRole("button", { name: "Pay with test card" }).click();
  await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();

  const mine = await (await request.get(`${api}/me/orders`, { headers })).json();
  expect(mine.items[0]).toMatchObject({ status: "processing", fulfilment_status: "received", status_label: "Received", items: [{ options: ["Double", "Cheddar"] }] });

  const mail = (await mailsTo(client.email)).filter((m) => m.subject.includes("order")).at(-1)!;
  expect(mail.text).toContain("Defne Burger (Double, Cheddar) × 1: ₺650.00");
  expect(mail.text).toContain("Delivery as soon as possible: Moda Cd. 12, flat 3, Moda (Door code 12)");
});

test("the kitchen moves the order on and the app sees every step", async ({ request }) => {
  const { items } = await (await request.get(`${api}/me/orders`, { headers })).json();
  const orderId = items[0].id as number;
  const step = async () => (await (await request.get(`${api}/me/orders/${orderId}`, { headers })).json()) as { fulfilment_status: string; status: string };

  await own.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Kitchen" }).click();
  await expect(own.getByRole("heading", { name: "Kitchen", level: 1 })).toBeVisible();
  const card = own.getByRole("listitem", { name: `Order ${items[0].number}` });
  await expect(card).toContainText("Delivery · as soon as possible");
  await expect(card).toContainText("Double, Cheddar");
  await expect(card).toContainText("Deliver to: Moda Cd. 12, flat 3, Moda (Door code 12)");
  await expect(card.getByRole("button", { name: "Cancel order" })).toBeVisible();

  for (const [button, status] of [
    ["Preparing", "preparing"],
    ["Ready", "ready"],
    ["Out for delivery", "out_for_delivery"],
  ] as const) {
    await card.getByRole("button", { name: button, exact: true }).click();
    await expect(card.getByRole("button", { name: button, exact: true })).toHaveCount(0);
    expect((await step()).fulfilment_status).toBe(status);
  }
  await card.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(own.getByText("No orders in the kitchen")).toBeVisible();
  await expect(own.getByRole("region", { name: "Finished orders" })).toContainText("Double, Cheddar");
  expect(await step()).toMatchObject({ fulfilment_status: "completed", status: "completed" });

  // Each step reached the customer's inbox.
  const inbox = await (await request.get(`${api}/me/notifications`, { headers })).json();
  expect((inbox.items as { title: string }[]).map((n) => n.title)).toEqual(
    expect.arrayContaining([
      `Order ${items[0].number} is being prepared`,
      `Order ${items[0].number} is ready`,
      `Order ${items[0].number} is on its way`,
      `Order ${items[0].number} is complete`,
    ]),
  );
  // Someone else's order is not found.
  expect((await request.get(`${api}/me/orders/${orderId + 1000}`, { headers })).status()).toBe(404);
});
