import { createHmac } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * 58 Yallapp Business, the owners' own app, through the Owner API
 * (docs/api/owner.yaml): a shop, an academy and an events app set up on the
 * dashboard; the owner signs in on a phone with the dashboard's account,
 * reads today's numbers, completes a paid order (and its push reached the
 * phone), checks a ticket in at the door, adds a lesson, sends a
 * notification to the app's users, sees the phone on Dashboard › Your
 * phones, and signs out.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so the sign-up and sign-in limits per IP don't reach the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.158" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Selin Arslan", email: `selin-${suffix}@academy.test`, password: "selin-strong-password-1" };
const owner = `${E2E.baseURL}/api/owner/v1`;
let own: Page;
let admin: Page;
let shopApi = "";
let academyApi = "";
let eventsApi = "";
let shopId = "";
let academyId = "";
let eventsId = "";
let courseId = 0;
let topicId = 0;
let access = "";
let refresh = "";
let deviceId = "";
let customer: Record<string, string> = {};
const codes = new Map<string, string>();
const payments = new Map<string, { callbackUrl: string; basketId: string; price: string }>();
let otp: Server;
let iyzico: Server;

const appIdOf = (api: string) => api.split("/").pop()!;
// The app sends the phone's language with every request (it decides the API's words when the person chose none).
const bearer = () => ({ authorization: `Bearer ${access}`, "accept-language": "en-GB" });

async function setUpApp(kind: string, website: string | null) {
  if (website) await own.getByText(website).click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.getByLabel("App name").fill(kind);
  await own.getByLabel("Name under the app icon").fill(kind.split(" ")[1]!);
  await own.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [40, 90, 200]) });
  await expect(own.getByText("Replace file")).toBeVisible();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByLabel("Android package name")).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  return (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
}

async function signInCustomer(request: APIRequestContext, api: string, phone: string): Promise<Record<string, string>> {
  const device = { id: `install-${phone}-${suffix}`, platform: "android", name: "Pixel 8", app_version: "1.0.0" };
  const requested = await request.post(`${api}/auth/otp/request`, { data: { country_code: "+90", phone } });
  expect(requested.status()).toBe(200);
  const { request_id } = (await requested.json()) as { request_id: string };
  const e164 = `+90${phone.replace(/\s/g, "")}`;
  await expect.poll(() => codes.get(e164)).toBeTruthy();
  const verified = (await (await request.post(`${api}/auth/otp/verify`, { data: { request_id, code: codes.get(e164), device } })).json()) as { signup_token?: string; access_token?: string };
  if (verified.access_token) return { authorization: `Bearer ${verified.access_token}` };
  const registered = await request.post(`${api}/auth/register`, { data: { signup_token: verified.signup_token, name: "Mona Adel", device } });
  expect(registered.status()).toBe(201);
  return { authorization: `Bearer ${((await registered.json()) as { access_token: string }).access_token}` };
}

async function ownerPushes(): Promise<{ to: string[]; message: { title: string; body: string; data: Record<string, string> } }[]> {
  const dir = path.resolve(E2E.ownerPushDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  return Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8"))));
}

test.beforeAll(async ({ browser }) => {
  // Sign-in codes for the app's customers, as in hosted-api.spec.ts.
  otp = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => {
      if (request.headers["x-yallapp-signature"] !== `sha256=${createHmac("sha256", E2E.otpWebhookSecret).update(body).digest("base64url")}`) return void response.writeHead(401).end();
      const { phone, code } = JSON.parse(body) as { phone: string; code: string };
      codes.set(phone, code);
      response.writeHead(204).end();
    });
  });
  await new Promise<void>((resolve) => otp.listen(E2E.otpWebhookPort, resolve));
  // A fake iyzico, as in catalog.spec.ts.
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
        const token = `iyzi-o-${payments.size + 1}`;
        payments.set(token, input);
        return send({ status: "success", token, paymentPageUrl: `${base}/pay?token=${token}` });
      }
      if (url.pathname.endsWith("/checkoutform/auth/ecom/detail")) {
        const { token } = JSON.parse(body) as { token: string };
        const payment = payments.get(token)!;
        return send({ status: "success", paymentStatus: "SUCCESS", paymentId: "958", paidPrice: Number(payment.price), basketId: payment.basketId });
      }
      if (url.pathname === "/pay") {
        const token = url.searchParams.get("token")!;
        return void response
          .writeHead(200, { "content-type": "text/html" })
          .end(`<!doctype html><title>iyzico</title><form method="post" action="${payments.get(token)!.callbackUrl}"><input type="hidden" name="token" value="${token}"><button>Pay with test card</button></form>`);
      }
      response.writeHead(404).end();
    });
  });
  await new Promise<void>((resolve) => iyzico.listen(E2E.iyzicoPort, resolve));

  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 01 58");
  await own.getByLabel("Your website (optional)").fill(`https://selin-${suffix}.academy.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.ownerApiAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
});

test.afterAll(async () => {
  await own.close();
  await admin.close();
  await new Promise((resolve) => otp.close(resolve));
  await new Promise((resolve) => iyzico.close(resolve));
});

test("the owner runs a shop, an academy and an events app with a free ticket", async () => {
  await own.goto("/dashboard/app-type");
  await own.getByText("Store", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  shopApi = await setUpApp("Selin Shop", "I don't have a website");
  shopId = appIdOf(shopApi);
  await own.goto("/dashboard/catalog");
  await own.getByLabel("API key").fill("sandbox-api-key");
  await own.getByLabel("Secret key").fill("sandbox-secret-key");
  await own.getByText("Sandbox keys").click();
  await own.getByRole("button", { name: "Save keys" }).click();
  await expect(own.getByText("iyzico keys saved.")).toBeVisible();
  await own.getByRole("link", { name: "Add product" }).click();
  await own.getByLabel("Name", { exact: true }).fill("Tea set");
  await own.getByLabel("Price (TRY)", { exact: true }).fill("450");
  await own.getByLabel("Stock").fill("5");
  await own.getByRole("button", { name: "Add product" }).click();
  await expect(own.getByRole("status")).toContainText("Saved “Tea set”.");

  await own.goto("/dashboard/app-type?new=1");
  await own.getByText("Academy", { exact: true }).click();
  await own.getByRole("button", { name: "Add the app" }).click();
  await expect(own).toHaveURL(/\/dashboard\/setup\?step=website$/);
  academyApi = await setUpApp("Selin Academy", "I don't have a website");
  academyId = appIdOf(academyApi);
  await own.getByRole("link", { name: "Courses", exact: true }).click();
  const add = own.getByRole("region", { name: "Add a course" });
  await add.getByLabel("Title").fill("Turkish for Beginners");
  await add.getByLabel("Description").fill("Speak from day one.");
  await add.getByRole("button", { name: "Add course" }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Turkish for Beginners" })).toBeVisible();
  courseId = Number(new URL(own.url()).pathname.split("/").pop());
  const curriculum = own.getByRole("region", { name: "Sections and lessons" });
  await curriculum.getByLabel("New section").fill("Hello");
  await curriculum.getByRole("button", { name: "Add section" }).click();
  await expect(curriculum.getByRole("heading", { name: "Hello" })).toBeVisible();

  await own.goto("/dashboard/app-type?new=1");
  await own.getByText("Events & tickets", { exact: true }).click();
  await own.getByRole("button", { name: "Add the app" }).click();
  await expect(own).toHaveURL(/\/dashboard\/setup\?step=website$/);
  eventsApi = await setUpApp("Selin Events", null);
  eventsId = appIdOf(eventsApi);
  await own.getByRole("link", { name: "Events", exact: true }).click();
  await own.getByRole("link", { name: "Add an event" }).click();
  const soon = (hours: number) => new Date(Date.now() + hours * 3_600_000 + 3 * 3_600_000).toISOString().slice(0, 16);
  await own.getByLabel("Title").fill("Language Café");
  await own.getByLabel("Description").fill("Practise Turkish over tea.");
  await own.getByLabel("Starts").fill(soon(1));
  await own.getByLabel("Ends").fill(soon(3));
  await own.getByLabel("Venue").fill("Studio 2");
  await own.getByLabel("Address").fill("Moda Cd. 120, Kadıköy");
  await own.getByRole("button", { name: "Publish" }).click();
  await expect(own.getByRole("status")).toContainText("Saved.");
  const types = own.getByRole("region", { name: "Ticket types" });
  await types.getByLabel("Ticket name").fill("Free seat");
  await types.getByLabel("Price (TRY)").fill("0");
  await types.getByLabel("How many").fill("20");
  await types.getByLabel("Most per person").fill("2");
  await types.getByRole("button", { name: "Add ticket type" }).click();
  await expect(types.getByText("Added “Free seat”.")).toBeVisible();

  // The team activates the two new apps, each on its own plan.
  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: client.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  for (const name of ["Selin Academy", "Selin Events"]) {
    await admin.getByRole("region", { name }).getByRole("region", { name: "Plan and license" }).getByRole("button", { name: "Activate & send license" }).click();
    await expect(admin.getByRole("status")).toContainText("Activated");
  }
});

test("Yallapp Business signs in with the dashboard's account and registers its push token", async ({ request }) => {
  const wrong = await request.post(`${owner}/auth/sign-in`, { data: { email: client.email, password: "not-it", device: { name: "Pixel 8", platform: "android" } }, headers: { "accept-language": "tr" } });
  expect(wrong.status()).toBe(401);
  expect(await wrong.json()).toEqual({ code: "invalid_credentials", message: "E-posta veya şifre hatalı." });
  // Yallapp's own team uses the website.
  const staff = await request.post(`${owner}/auth/sign-in`, { data: { email: E2E.ownerApiAdminEmail, password: E2E.adminPassword, device: { name: "Pixel", platform: "android" } } });
  expect(staff.status()).toBe(403);
  expect(await staff.json()).toMatchObject({ code: "use_website" });

  const signedIn = await request.post(`${owner}/auth/sign-in`, { data: { email: client.email, password: client.password, device: { name: "Selin's Pixel", platform: "android", app_version: "1.0.0" } } });
  expect(signedIn.status()).toBe(200);
  const session = (await signedIn.json()) as { access_token: string; refresh_token: string; device_id: string; account_state: string };
  expect(session.account_state).toBe("active");
  ({ access_token: access, refresh_token: refresh, device_id: deviceId } = session);
  expect((await request.put(`${owner}/me/push-token`, { headers: bearer(), data: { token: `fcm-owner-${suffix}` } })).status()).toBe(204);

  const me = await (await request.get(`${owner}/me`, { headers: bearer() })).json();
  expect(me).toMatchObject({ user: { email: client.email }, account: { state: "active" } });
  expect(me.apps.map((a: { id: string; name: string; features: Record<string, boolean> }) => [a.name, a.features.products, a.features.courses, a.features.check_in])).toEqual([
    ["Selin Shop", true, false, false],
    ["Selin Academy", false, true, false],
    ["Selin Events", false, false, true],
  ]);
  // Another client's app, or one that doesn't exist: not found.
  const stranger = await request.get(`${owner}/apps/3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f/today`, { headers: bearer() });
  expect(stranger.status()).toBe(404);
  // A refresh gives a new pair; the old refresh token stops working.
  const renewed = await request.post(`${owner}/auth/refresh`, { data: { refresh_token: refresh } });
  expect(renewed.status()).toBe(200);
  const next = (await renewed.json()) as { access_token: string; refresh_token: string };
  expect((await request.post(`${owner}/auth/refresh`, { data: { refresh_token: refresh } })).status()).toBe(401);
  ({ access_token: access, refresh_token: refresh } = next);
});

test("a customer buys in the shop; the owner's phone hears of it, sees today and completes the order", async ({ request, page }) => {
  customer = await signInCustomer(request, shopApi, "532 765 01 58");
  const products = await (await request.get(`${shopApi}/store/products`)).json();
  const link = await request.post(`${shopApi}/store/checkout-link?platform=android`, { headers: customer, data: { lines: [{ product_id: products.items[0].id, quantity: 1 }] } });
  expect(link.status()).toBe(200);
  await page.goto(((await link.json()) as { url: string }).url);
  await page.getByLabel("Full name").fill("Mona Adel");
  await page.getByLabel("Mobile number").fill("0532 765 01 58");
  await page.getByLabel("Email").fill(`mona-${suffix}@example.com`);
  await page.getByLabel("City").fill("Istanbul");
  await page.getByLabel("Address").fill("Moda Cd. 12");
  await page.getByRole("button", { name: "Pay ₺450.00" }).click();
  await page.getByRole("button", { name: "Pay with test card" }).click();
  await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();

  await expect.poll(async () => (await ownerPushes()).filter((p) => p.to.includes(deviceId) && p.message.data.kind === "new_order").length).toBe(1);
  const push = (await ownerPushes()).find((p) => p.to.includes(deviceId) && p.message.data.kind === "new_order")!;
  expect(push.message).toMatchObject({ body: "Selin Shop: ₺450.00", data: { type: "owner", app_id: shopId } });

  const today = await (await request.get(`${owner}/apps/${shopId}/today`, { headers: bearer() })).json();
  expect(today).toMatchObject({ sales: [{ amount_cents: 45000, currency: "TRY", formatted: "₺450.00" }], counts: { orders: 1 } });
  expect(today.needs_you).toContainEqual(expect.objectContaining({ kind: "orders_in_progress", count: 1 }));

  const orders = await (await request.get(`${owner}/apps/${shopId}/orders`, { headers: bearer() })).json();
  expect(orders).toMatchObject({ total: 1, items: [{ status: "processing", next_statuses: ["completed", "cancelled"], lines: [{ name: "Tea set" }], customer: { name: "Mona Adel" } }] });
  const orderId = orders.items[0].id as number;
  expect(Number(push.message.data.order_id)).toBe(orderId);
  const done = await request.post(`${owner}/apps/${shopId}/orders/${orderId}/status`, { headers: bearer(), data: { status: "completed" } });
  expect(done.status()).toBe(200);
  expect(await done.json()).toMatchObject({ status: "completed", next_statuses: [], refund: { refundable: true } });
  const again = await request.post(`${owner}/apps/${shopId}/orders/${orderId}/status`, { headers: bearer(), data: { status: "cancelled" } });
  expect(again.status()).toBe(409);
  // The customer's app shows it completed too: the same order in the same store.
  expect((await (await request.get(`${shopApi}/me/orders/${orderId}`, { headers: customer })).json()).status).toBe("completed");
});

test("the door checks a ticket in once from the phone", async ({ request }) => {
  const visitor = await signInCustomer(request, eventsApi, "533 111 01 58");
  const list = await (await request.get(`${eventsApi}/events`)).json();
  const event = list.items[0] as { id: number };
  const detail = await (await request.get(`${eventsApi}/events/${event.id}?platform=android`)).json();
  const taken = await request.post(`${eventsApi}/events/${event.id}/register`, { headers: visitor, data: { ticket_type_id: detail.ticket_types[0].id, quantity: 1, attendee_names: ["Ali Adel"] } });
  expect(taken.status()).toBe(201);
  const tickets = (await (await request.get(`${eventsApi}/me/tickets`, { headers: visitor })).json()) as { items: { qr_payload: string }[] };
  const code = tickets.items[0]!.qr_payload;

  const events = await (await request.get(`${owner}/apps/${eventsId}/events`, { headers: bearer() })).json();
  expect(events.items[0]).toMatchObject({ id: event.id, title: "Language Café", tickets: { valid: 1, used: 0 } });
  const first = await (await request.post(`${owner}/apps/${eventsId}/check-in`, { headers: bearer(), data: { code, event_id: event.id } })).json();
  expect(first).toMatchObject({ outcome: "admitted", admitted: true, ticket: { holder_name: "Ali Adel", event_title: "Language Café" } });
  const second = await (await request.post(`${owner}/apps/${eventsId}/check-in`, { headers: { ...bearer(), "accept-language": "ar" }, data: { code } })).json();
  expect(second).toMatchObject({ outcome: "used", admitted: false });
  // The shop has no door.
  expect((await request.post(`${owner}/apps/${shopId}/check-in`, { headers: bearer(), data: { code } })).status()).toBe(404);
});

test("the owner adds a lesson from the phone, and the app has it", async ({ request }) => {
  const courses = await (await request.get(`${owner}/apps/${academyId}/courses`, { headers: bearer() })).json();
  expect(courses.items[0]).toMatchObject({ id: courseId, published: true, students: 0, topics: [{ title: "Hello", lessons: [] }] });
  topicId = courses.items[0].topics[0].id;
  const refused = await request.post(`${owner}/apps/${academyId}/courses/${courseId}/topics/${topicId}/lessons`, { headers: bearer(), data: { title: "Greetings" } });
  expect(refused.status()).toBe(400);
  expect(await refused.json()).toMatchObject({ errors: { text: "Add a video address or some text." } });
  const added = await request.post(`${owner}/apps/${academyId}/courses/${courseId}/topics/${topicId}/lessons`, {
    headers: bearer(),
    data: { title: "Greetings", video_url: "https://www.youtube.com/watch?v=abc123", duration_minutes: 8, preview: true },
  });
  expect(added.status()).toBe(201);
  expect(await added.json()).toMatchObject({ topics: [{ lessons: [{ title: "Greetings", video: "link", duration_minutes: 8, preview: true }] }] });
  const curriculum = await (await request.get(`${academyApi}/courses/${courseId}/curriculum`)).json();
  expect(curriculum.topics[0].items[0]).toMatchObject({ title: "Greetings", preview: true });
});

test("the owner sends a notification to the app's users from the phone", async ({ request }) => {
  const sent = await request.post(`${owner}/apps/${shopId}/notifications`, { headers: bearer(), data: { title: "New tea sets", body: "Fresh from the kiln this week." } });
  expect(sent.status()).toBe(201);
  expect(await sent.json()).toMatchObject({ pushed: 0 });
  const inbox = await (await request.get(`${shopApi}/me/notifications`, { headers: customer })).json();
  expect(inbox.items.map((n: { title: string }) => n.title)).toContain("New tea sets");
  const listed = await (await request.get(`${owner}/apps/${shopId}/notifications`, { headers: bearer() })).json();
  expect(listed).toMatchObject({ push: false, items: [{ title: "New tea sets" }] });
});

test("the dashboard lists the phone and signs it out; the app signs out too", async ({ request }) => {
  await own.goto("/dashboard/phones");
  await expect(own.getByRole("heading", { name: "Your phones", level: 1 })).toBeVisible();
  const phone = own.locator(`[data-device="${deviceId}"]`);
  await expect(phone).toContainText("Selin's Pixel");
  await expect(phone).toContainText("Notifications on");
  // A second phone, signed out from the dashboard.
  const other = (await (await request.post(`${owner}/auth/sign-in`, { data: { email: client.email, password: client.password, device: { name: "Old iPhone", platform: "ios" } } })).json()) as {
    access_token: string;
    device_id: string;
  };
  await own.reload();
  await own.locator(`[data-device="${other.device_id}"]`).getByRole("button", { name: "Sign out Old iPhone" }).click();
  await expect(own.getByRole("status")).toContainText("Old iPhone is signed out.");
  expect((await request.get(`${owner}/me`, { headers: { authorization: `Bearer ${other.access_token}` } })).status()).toBe(401);

  expect((await request.post(`${owner}/auth/sign-out`, { headers: bearer() })).status()).toBe(204);
  const after = await request.get(`${owner}/me`, { headers: bearer() });
  expect(after.status()).toBe(401);
  expect(await after.json()).toMatchObject({ code: "invalid_token" });
  expect((await request.post(`${owner}/auth/refresh`, { data: { refresh_token: refresh } })).status()).toBe(401);
  await own.reload();
  await expect(own.getByText("No phones are signed in.")).toBeVisible();
});
