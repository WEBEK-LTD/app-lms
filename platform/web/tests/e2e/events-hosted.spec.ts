import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * An Events & tickets app (roadmap 28): the organiser publishes an event
 * with free and paid tickets, people take free tickets through the hosted
 * API (never more than there are, even all at once), the door checks them in
 * once on a phone, and cancelling the event tells the ticket holders.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Kuzey Centre", email: `kuzey-${suffix}@events.test`, password: "kuzey-strong-password-1" };
const codes = new Map<string, string>();
let server: Server;
let own: Page;
let api = "";
let eventId = 0;
let auth: Record<string, string> = {};
let tickets: { code: string; qr_payload: string }[] = [];
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.74" };

/** A day a week from now, as a datetime-local field takes it. */
const inDays = (n: number, time: string) => `${new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)}T${time}`;

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
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 74");
  await own.getByLabel("Your website (optional)").fill(`https://kuzey-${suffix}.events.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.eventsAdminEmail);
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

async function signIn(request: APIRequestContext, phone: string, name: string): Promise<Record<string, string>> {
  const device = { id: `install-${phone}-${suffix}`, platform: "android", name: "Pixel 8", app_version: "1.0.0" };
  const requested = await request.post(`${api}/auth/otp/request`, { headers: extraHTTPHeaders, data: { country_code: "+90", phone } });
  expect(requested.status()).toBe(200);
  const { request_id } = (await requested.json()) as { request_id: string };
  const e164 = `+90${phone.replace(/\s/g, "")}`;
  await expect.poll(() => codes.get(e164)).toBeTruthy();
  const verified = await request.post(`${api}/auth/otp/verify`, { headers: extraHTTPHeaders, data: { request_id, code: codes.get(e164), device } });
  const { signup_token } = (await verified.json()) as { signup_token: string };
  const registered = await request.post(`${api}/auth/register`, { headers: extraHTTPHeaders, data: { signup_token, name, device } });
  expect(registered.status()).toBe(201);
  return { authorization: `Bearer ${((await registered.json()) as { access_token: string }).access_token}` };
}

test("the organiser picks Events & tickets: events managed in Yallapp", async () => {
  await own.goto("/dashboard/app-type");
  await own.getByText("Events & tickets", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  // Hosted only: one choice.
  await expect(own.getByText("Events managed in Yallapp")).toBeVisible();
  await expect(own.getByText("My WordPress site")).toHaveCount(0);
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
  expect(api).toMatch(/\/api\/app\/[0-9a-f-]{36}$/);
});

test("an event with a picture, published, with a free and a paid ticket type", async () => {
  await own.getByRole("link", { name: "Events", exact: true }).click();
  await expect(own.getByText("No events yet.")).toBeVisible();
  await own.getByRole("link", { name: "Add an event" }).click();
  await own.getByLabel("Title").fill("Saturday Film Club");
  await own.getByLabel("Category").fill("Film");
  await own.getByLabel("Description").fill("An old film on the waterfront.\n\n<script>alert(1)</script>Tea after.");
  await own.getByLabel("Starts").fill(inDays(7, "15:00"));
  await own.getByLabel("Ends").fill(inDays(7, "17:30"));
  await own.getByLabel("Venue").fill("Studio 2");
  await own.getByLabel("Address").fill("Moda Cd. 120, Kadıköy");
  await own.getByLabel("Latitude").fill("40.9837");
  await own.getByLabel("Longitude").fill("29.0262");
  await own.getByLabel("Add pictures").setInputFiles({ name: "film.png", mimeType: "image/png", buffer: solidPng(64, 36, [90, 40, 130]) });
  await own.getByRole("button", { name: "Publish" }).click();
  await expect(own.getByRole("status")).toContainText("Saved.");
  eventId = Number(new URL(own.url()).pathname.split("/").pop());
  expect(eventId).toBeGreaterThan(0);
  await expect(own.getByText("Published: it's in the app, with its tickets.")).toBeVisible();

  const types = own.getByRole("region", { name: "Ticket types" });
  await types.getByLabel("Ticket name").fill("Free seat");
  await types.getByLabel("Price (TRY)").fill("0");
  await types.getByLabel("How many").fill("5");
  await types.getByLabel("Most per person").fill("2");
  await types.getByRole("button", { name: "Add ticket type" }).click();
  await expect(types.getByText("Added “Free seat”.")).toBeVisible();
  await types.getByLabel("Ticket name").last().fill("Supporter");
  await types.getByLabel("Price (TRY)").last().fill("150");
  await types.getByRole("button", { name: "Add ticket type" }).click();
  await expect(types.getByText("Added “Supporter”.")).toBeVisible();
  // Card payments aren't set up: the Events page says so.
  await own.getByRole("link", { name: "← Events" }).click();
  await expect(own.getByText("Paid tickets can't be bought until you set up")).toBeVisible();
  await expect(own.getByRole("link", { name: /Saturday Film Club/ })).toContainText("0 tickets");
});

test("the hosted API serves the event; free tickets are taken, never more than there are", async ({ request }) => {
  const config = await (await request.get(`${api}/config?platform=ios&app_version=1.0.0`)).json();
  expect(config.events).toEqual({ show_map: true, allow_cancel_hours: 24, time_zone: "Europe/Istanbul", currency: "TRY" });
  const list = await (await request.get(`${api}/events`)).json();
  expect(list.items).toHaveLength(1);
  expect(list.items[0]).toMatchObject({ id: eventId, title: "Saturday Film Club", category: { id: "film", name: "Film" }, price_label: "Free · from ₺150.00", spots_left: null, status: "scheduled" });
  expect(list.items[0].venue).toMatchObject({ name: "Studio 2", latitude: 40.9837 });
  const detail = await (await request.get(`${api}/events/${eventId}?platform=ios`)).json();
  expect(detail.html).toContain("<p>An old film on the waterfront.</p>");
  expect(detail.html).not.toContain("script");
  // Without card payments the paid tickets have no button; free ones are taken in the app.
  expect(detail.ticket_types.map((t: { name: string; action: string }) => [t.name, t.action])).toEqual([
    ["Free seat", "register"],
    ["Supporter", "none"],
  ]);
  expect((await (await request.get(`${api}/events/filters`)).json()).categories).toEqual([{ id: "film", name: "Film", count: 1 }]);

  auth = await signIn(request, "532 765 43 28", "Mona Adel");
  const taken = await request.post(`${api}/events/${eventId}/register`, { headers: auth, data: { ticket_type_id: detail.ticket_types[0].id, quantity: 2, attendee_names: ["Mona Adel", "Ali Adel"] } });
  expect(taken.status()).toBe(201);
  tickets = ((await taken.json()) as { tickets: { code: string; qr_payload: string }[] }).tickets;
  expect(tickets).toHaveLength(2);
  expect(tickets[0]!.code).toMatch(/^[A-HJ-NP-Z2-9]{12}$/);

  // Three places left, twelve requests at the same moment: three tickets, the rest sold out.
  const rush = await Promise.all(
    Array.from({ length: 12 }, () => request.post(`${api}/events/${eventId}/register`, { headers: auth, data: { ticket_type_id: detail.ticket_types[0].id, quantity: 1 } })),
  );
  expect(rush.filter((r) => r.status() === 201)).toHaveLength(3);
  expect(rush.filter((r) => r.status() === 409)).toHaveLength(9);
  const after = await (await request.get(`${api}/events/${eventId}?platform=android`, { headers: auth })).json();
  expect(after.ticket_types[0]).toMatchObject({ remaining: 0, on_sale: false, action: "none" });
  expect(after.my_tickets).toBe(5);
  const paid = await request.post(`${api}/events/checkout-link?platform=android`, { headers: auth, data: { event_id: eventId, ticket_type_id: detail.ticket_types[1].id, quantity: 1 } });
  expect((await paid.json()).code).toBe("purchase_not_allowed");
  const mine = await (await request.get(`${api}/me/tickets`, { headers: auth })).json();
  expect(mine.items).toHaveLength(5);
});

test("the door checks a ticket in once, on a phone", async ({ browser }) => {
  await own.goto(`/dashboard/events/${eventId}`);
  const attendees = own.getByRole("region", { name: "Attendees" });
  await expect(attendees.getByRole("row", { name: /Ali Adel/ })).toContainText("Valid");
  const download = await own.request.get(`/api/dashboard/events/${eventId}/attendees`);
  expect(download.headers()["content-type"]).toContain("text/csv");
  const file = await download.text();
  expect(file).toContain("Ticket code,Name on ticket,Ticket type");
  expect(file).toContain("Ali Adel,Free seat,Free,Valid,Mona Adel");

  // The same dashboard on a phone.
  const phone = await browser.newPage({ viewport: { width: 360, height: 740 }, extraHTTPHeaders, storageState: await own.context().storageState() });
  await phone.goto("/dashboard/check-in");
  await expect(phone.getByRole("heading", { name: "Check-in" })).toBeVisible();
  expect(await phone.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  const typed = tickets[0]!.code.match(/.{4}/g)!.join("-").toLowerCase();
  await phone.getByLabel("Ticket code").fill(typed);
  await phone.getByRole("button", { name: "Check in" }).click();
  await expect(phone.getByRole("status")).toContainText("Valid ticket: let them in");
  await expect(phone.getByRole("status")).toContainText("Mona Adel");
  await phone.getByLabel("Ticket code").fill(tickets[0]!.code);
  await phone.getByRole("button", { name: "Check in" }).click();
  await expect(phone.getByRole("status")).toContainText("Already used at");
  // What a QR code holds works too; a made-up one doesn't.
  await phone.getByLabel("Ticket code").fill(tickets[1]!.qr_payload);
  await phone.getByRole("button", { name: "Check in" }).click();
  await expect(phone.getByRole("status")).toContainText("Ali Adel");
  await expect(phone.getByRole("status")).toContainText("Valid ticket");
  await phone.getByLabel("Ticket code").fill(`YT1.${tickets[1]!.code}.AAAAAAAAAAAAAAAAAAAAAA`);
  await phone.getByRole("button", { name: "Check in" }).click();
  await expect(phone.getByRole("status")).toContainText("Not one of your tickets");
  await phone.close();

  await own.reload();
  await expect(own.getByRole("region", { name: "Attendees" }).getByText("Used")).toHaveCount(2);
});

test("cancelling the event cancels its tickets and tells their holders", async ({ request }) => {
  await own.goto(`/dashboard/events/${eventId}`);
  await own.getByRole("button", { name: "Cancel the event" }).click();
  await expect(own.getByRole("status")).toContainText("The event is cancelled, with its tickets. 1 ticket holder was told.");
  const mine = await (await request.get(`${api}/me/tickets`, { headers: auth })).json();
  expect(mine.items.map((t: { status: string }) => t.status).sort()).toEqual(["cancelled", "cancelled", "cancelled", "used", "used"]);
  const inbox = await (await request.get(`${api}/me/notifications`, { headers: auth })).json();
  expect(inbox.items[0]).toMatchObject({ type: "event", event_id: eventId, title: "Cancelled: Saturday Film Club" });
  const list = await (await request.get(`${api}/events`)).json();
  expect(list.items[0]).toMatchObject({ status: "cancelled" });
});
