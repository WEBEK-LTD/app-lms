import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * A Real estate app (roadmap 10.7): the office sets up its listings in the
 * dashboard, the hosted API serves them with filters, and a user's message
 * gets the office's reply.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Nile Homes", email: `nile-${suffix}@homes.test`, password: "nile-strong-password-1" };
const codes = new Map<string, string>();
let server: Server;
let own: Page;
let api = "";
let listingId = 0;
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.71" };

test.beforeAll(async ({ browser }) => {
  // The hosted API sends sign-in codes to this webhook, as in hosted-api.spec.ts.
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

  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 71");
  await own.getByLabel("Your WordPress website").fill(`https://nile-${suffix}.homes.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.listingsAdminEmail);
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

test("the office picks Real estate, sets up the office and publishes a listing", async () => {
  await own.goto("/dashboard/app-type");
  await own.getByText("Real estate", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  // Real estate apps have no website: one choice only.
  await expect(own.getByText("Listings managed in Yallapp")).toBeVisible();
  await expect(own.getByText("My WordPress site")).toHaveCount(0);
  await expect(own.getByText("set up your office and add your properties")).toBeVisible();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
  expect(api).toMatch(/\/api\/app\/[0-9a-f-]{36}$/);

  await own.getByRole("link", { name: "Listings", exact: true }).click();
  await expect(own.getByText("No listings yet.")).toBeVisible();
  const office = own.getByRole("region", { name: "Your office" });
  await office.getByLabel("Office name").fill("Nile Homes Maadi");
  await office.getByLabel("Phone", { exact: true }).fill("0100");
  await office.getByRole("button", { name: "Save office" }).click();
  await expect(office.getByText("Use the international format")).toBeVisible();
  await office.getByLabel("Phone", { exact: true }).fill("+20 100 123 4567");
  await office.getByLabel("WhatsApp", { exact: true }).fill("+20 100 123 4567");
  await office.getByLabel("Office email").fill("office@nile.test");
  await office.getByLabel("Default currency").selectOption("EGP");
  await office.getByRole("button", { name: "Save office" }).click();
  await expect(office.getByText("Office settings saved.")).toBeVisible();

  await own.getByRole("link", { name: "Add listing" }).click();
  await own.getByRole("button", { name: "Publish" }).click();
  await expect(own.getByText("Enter a title.")).toBeVisible();
  await own.getByLabel("Title").fill("Bright apartment with a Nile view");
  await own.getByLabel("Property type").selectOption("apartment");
  await own.getByLabel("Reference").fill("NH-1042");
  await own.getByLabel("Description").fill("Sunny and quiet.\n\nTen minutes from the metro.");
  await own.getByLabel("Price", { exact: true }).fill("4250000");
  await expect(own.getByLabel("Currency")).toHaveValue("EGP");
  await own.getByLabel("Negotiable").check();
  await own.getByLabel("City").fill("Cairo");
  await own.getByLabel("District").fill("Maadi");
  await own.getByLabel("Area (m²)").fill("185");
  await own.getByLabel("Bedrooms").fill("3");
  await own.getByLabel("Bathrooms").fill("2");
  await own.getByLabel("Features").fill("Elevator\nNile view");
  await own.getByLabel("Add photos").setInputFiles({ name: "front.png", mimeType: "image/png", buffer: solidPng(64, 48, [30, 90, 160]) });
  await own.getByRole("button", { name: "Publish" }).click();
  await expect(own.getByRole("status")).toContainText("Saved “Bright apartment with a Nile view”.");

  // A draft for rent stays out of the app.
  await own.getByRole("link", { name: "Add listing" }).click();
  await own.getByLabel("Title").fill("Studio near the university");
  await own.getByText("For rent", { exact: true }).click();
  await own.getByLabel("Property type").selectOption("studio");
  await own.getByLabel("Price", { exact: true }).fill("9000");
  await own.getByLabel("Rent per").selectOption("month");
  await own.getByLabel("City").fill("Giza");
  await own.getByRole("button", { name: "Save as draft" }).click();
  await expect(own.getByRole("status")).toContainText("Saved “Studio near the university”.");
  await expect(own.getByRole("link", { name: /Studio near the university/ })).toContainText("EGP 9,000 / month");

  await own.getByLabel("Status").selectOption("published");
  await own.getByRole("button", { name: "Search" }).click();
  await expect(own.getByRole("link", { name: /Studio near the university/ })).toHaveCount(0);
  const published = own.getByRole("link", { name: /Bright apartment with a Nile view/ });
  await expect(published).toContainText("EGP 4,250,000 · Apartment · Maadi, Cairo · 185 m² · NH-1042");
  await published.click();
  await own.waitForURL(/\/dashboard\/listings\/\d+$/);
  listingId = Number(own.url().split("/").pop());

  // A second photo, moved first.
  await own.getByLabel("Add photos").setInputFiles({ name: "view.png", mimeType: "image/png", buffer: solidPng(64, 48, [200, 160, 60]) });
  await own.getByRole("button", { name: "Save listing" }).click();
  await expect(own.getByRole("status")).toContainText("Saved");
  await own.getByRole("link", { name: /Bright apartment with a Nile view/ }).click();
  await expect(own.getByRole("img", { name: "Photo 2" })).toBeVisible();
  const first = await own.getByRole("img", { name: "Photo 1" }).getAttribute("src");
  await own.getByRole("button", { name: "Move photo 2 earlier" }).click();
  await own.getByRole("button", { name: "Save listing" }).click();
  await expect(own.getByRole("status")).toContainText("Saved");
  await own.getByRole("link", { name: /Bright apartment with a Nile view/ }).click();
  await expect(own.getByRole("img", { name: "Photo 2" })).toHaveAttribute("src", first!);

  await own.getByRole("button", { name: "Mark as featured" }).click();
  await expect(own.getByRole("region", { name: "Status" }).getByText("Featured", { exact: true })).toBeVisible();
});

test("the app finds the listing with search and filters", async ({ request }) => {
  const config = await (await request.get(`${api}/config?platform=ios&app_version=1.0.0`)).json();
  expect(config.listings).toEqual({
    currency: "EGP",
    area_unit: "m2",
    contact: { name: "Nile Homes Maadi", phone: "+201001234567", whatsapp: "+201001234567", email: "office@nile.test" },
    messages: true,
  });
  const filters = await (await request.get(`${api}/listings/filters`)).json();
  expect(filters).toEqual({
    purposes: ["sale"],
    types: [{ key: "apartment", label: "Apartment", count: 1 }],
    cities: [{ name: "Cairo", count: 1, districts: ["Maadi"] }],
    price: { min: 4250000, max: 4250000 },
    area: { min: 185, max: 185 },
    bedrooms_max: 3,
  });
  const found = await (await request.get(`${api}/listings?type=apartment&city=cairo&min_price=1000000&bedrooms=2&search=nile`)).json();
  expect(found).toMatchObject({
    total: 1,
    items: [{ id: listingId, title: "Bright apartment with a Nile view", featured: true, favorited: false, price: { formatted: "EGP 4,250,000", negotiable: true } }],
  });
  expect((await (await request.get(`${api}/listings?purpose=rent`)).json()).total).toBe(0);
  expect((await request.get(`${api}/listings?sort=cheapest`)).status()).toBe(400);

  const detail = await (await request.get(`${api}/listings/${listingId}`)).json();
  expect(detail).toMatchObject({ reference: "NH-1042", features: ["Elevator", "Nile view"], description_html: "<p>Sunny and quiet.</p><p>Ten minutes from the metro.</p>" });
  expect(detail.images).toHaveLength(2);
  expect(detail.image_url).toBe(detail.images[0].url);
  const photo = await request.get(detail.images[0].url);
  expect(photo.status()).toBe(200);
  expect(photo.headers()["content-type"]).toBe("image/png");
});

test("a user messages the office and sees the reply", async ({ request }) => {
  const device = { id: `install-${suffix}`, platform: "android", name: "Pixel 8", app_version: "1.0.0" };
  const requested = await request.post(`${api}/auth/otp/request`, { data: { country_code: "+90", phone: "532 765 43 21" } });
  expect(requested.status()).toBe(200);
  const { request_id } = (await requested.json()) as { request_id: string };
  await expect.poll(() => codes.get("+905327654321")).toBeTruthy();
  const verified = await request.post(`${api}/auth/otp/verify`, { data: { request_id, code: codes.get("+905327654321"), device } });
  const { signup_token } = (await verified.json()) as { signup_token: string };
  const registered = await request.post(`${api}/auth/register`, { data: { signup_token, name: "Mona Adel", device } });
  expect(registered.status()).toBe(201);
  const auth = { authorization: `Bearer ${((await registered.json()) as { access_token: string }).access_token}` };

  expect((await request.put(`${api}/me/favorites/${listingId}`, { headers: auth })).status()).toBe(204);
  expect(await (await request.get(`${api}/me/favorites`, { headers: auth })).json()).toMatchObject({ total: 1, items: [{ id: listingId, favorited: true }] });

  const sent = await request.post(`${api}/listings/${listingId}/inquiries`, { headers: auth, data: { message: "Is it still available? Can I visit on Saturday?" } });
  expect(sent.status()).toBe(201);
  const inquiry = (await sent.json()) as { id: number };

  await own.getByRole("link", { name: "Inquiries", exact: true }).click();
  const row = own.getByRole("link", { name: /Mona Adel · Bright apartment with a Nile view/ });
  await expect(row).toContainText("1 new");
  await row.click();
  await expect(own.getByText("Is it still available? Can I visit on Saturday?")).toBeVisible();
  await own.getByLabel("Your reply").fill("Yes, Saturday at 11 works.");
  await own.getByRole("button", { name: "Send reply" }).click();
  await expect(own.getByRole("status")).toContainText("Reply sent.");
  await expect(own.getByText("Yes, Saturday at 11 works.", { exact: true })).toBeVisible();

  const list = await (await request.get(`${api}/me/inquiries`, { headers: auth })).json();
  expect(list).toMatchObject({ total: 1, items: [{ id: inquiry.id, unread: 1, messages: [{ from: "office", text: "Yes, Saturday at 11 works." }] }] });
  const conversation = await (await request.get(`${api}/me/inquiries/${inquiry.id}`, { headers: auth })).json();
  expect(conversation.messages.map((m: { from: string }) => m.from)).toEqual(["user", "office"]);
  expect((await (await request.get(`${api}/me/inquiries`, { headers: auth })).json()).items[0].unread).toBe(0);
  const inbox = await (await request.get(`${api}/me/notifications`, { headers: auth })).json();
  expect(inbox).toMatchObject({ unread_count: 1, items: [{ title: "Nile Homes Maadi replied" }] });

  await own.getByRole("button", { name: "Close conversation" }).click();
  await expect(own.getByRole("button", { name: "Reopen conversation" })).toBeVisible();
  const reply = await request.post(`${api}/me/inquiries/${inquiry.id}/messages`, { headers: auth, data: { message: "Thanks, see you then." } });
  expect(await reply.json()).toMatchObject({ status: "open" });
});
