import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 180 Safra as an owner makes it and a customer books it
 * (docs/qa/2026-11-18-travel-bookings/NOTES.md): started from
 * /start?for=studio, Travel on its plan, Studio's canvas signed out first and
 * then signed in (180.11), and a customer who signs in with the store review
 * number searching the stays, opening one, pricing a room and booking it,
 * then finding the trip, with its prices in their currency when asked
 * (180.12).
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Safra QA", email: `safra-${suffix}@travel.test`, password: "safra-qa-strong-password-1" };
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.180" };
const REVIEW = { phone: "+201000180180", code: "180180" };
const DEVICE = { id: `install-${suffix}`, platform: "android", name: "Pixel 8", app_version: "1.0.0" };
let own: Page;
let api = "";

/** A day this many days from today, as the app sends it. */
const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

test.beforeAll(async ({ browser }, info) => {
  info.setTimeout(180_000);
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0180");
  await own.getByLabel("Your website (optional)").fill(`https://safra-${suffix}.travel.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.travelQaAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");

  await own.goto("/start?for=studio");
  await own.locator('[data-section="studio"] a[data-demo="travel"]').click();
  await own.getByRole("link", { name: "Start with this app" }).click();
  await own.getByLabel("Your app's name").fill(client.name);
  await own.getByRole("button", { name: "Create my app" }).click();
  await expect(own).toHaveURL(/\/studio\/editor\?from=demo$/);
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();

  // Travel on Studio plan 1, and the plan on the app.
  await admin.goto("/admin/plans?family=studio&plan=studio_1");
  const features = admin.getByRole("form", { name: "Studio plan 1: the plan" });
  await features.locator('input[name="features"][value="travel"]').check();
  await features.getByRole("button", { name: "Save plan" }).click();
  await expect(features.getByRole("status").or(features.getByText(/saved/i)).first()).toBeVisible();
  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: client.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  const plan = admin.getByRole("region", { name: "Plan and license" }).first();
  await plan.getByLabel("Plan").selectOption("studio_1");
  await plan.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();

  // The store review number, so a customer signs in without a text message.
  await own.goto("/dashboard/app-sign-in");
  // In the folded Sign-in rules.
  if (!(await own.getByLabel("Review phone number").isVisible())) await own.getByRole("region", { name: "Sign-in rules" }).getByText("Change the rules").click();
  await own.getByLabel("Review phone number").fill(REVIEW.phone);
  await own.getByLabel("Review code").fill(REVIEW.code);
  await own.getByLabel("Review code").locator("xpath=ancestor::form").getByRole("button", { name: "Save" }).click();
  await expect(own.getByLabel("Review code")).toHaveValue(REVIEW.code);
});

test.afterAll(async () => {
  await own.close();
});

test("180.11 Studio's canvas: signed out first, the question; signed in, the next trip", async () => {
  await own.goto("/studio/editor");
  const canvas = own.locator(".studio-screen");
  const signed = own.locator("[data-canvas-signed]");
  await expect(signed).toHaveAttribute("data-canvas-signed", "out");
  await expect(canvas.getByText("Where does the next story begin?").first()).toBeVisible();
  await expect(canvas.getByText("Bali")).toHaveCount(0);
  const toggle = own.getByRole("button").filter({ has: signed });
  await expect(toggle).toHaveAttribute("title", "Show the page as a customer who is signed in, or not, sees it");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(signed).toHaveAttribute("data-canvas-signed", "in");
  await expect(canvas.getByText("Bali").first()).toBeVisible();
  await expect(canvas.getByText("Where does the next story begin?")).toHaveCount(0);
});

test("a customer finds a stay, prices a room and books it; the trip is theirs", async ({ request }) => {
  const call = (method: "GET" | "POST", path: string, opts: { data?: unknown; token?: string; headers?: Record<string, string> } = {}) =>
    request.fetch(`${api}${path}`, {
      method,
      data: opts.data,
      headers: { ...extraHTTPHeaders, ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}), ...opts.headers },
    });
  // Signed in with the review number and its code.
  const otp = await (await call("POST", "/auth/otp/request", { data: { country_code: "+20", phone: REVIEW.phone.slice(3) } })).json();
  const verified = await (await call("POST", "/auth/otp/verify", { data: { request_id: otp.request_id, code: REVIEW.code, device: DEVICE } })).json();
  const token: string = verified.access_token ?? (await (await call("POST", "/auth/register", { data: { signup_token: verified.signup_token, name: "Layla Hassan", device: DEVICE } })).json()).access_token;
  expect(token).toBeTruthy();

  const stay = { check_in: day(30), check_out: day(33), guests: "2" };
  const found = await call("GET", `/travel/hotels?${new URLSearchParams(stay)}`, { token });
  expect(found.status()).toBe(200);
  const hotels = (await found.json()) as { items: { id: number; name: string; currency: string; pay_at_hotel: boolean; price: { total: string } | null }[] };
  // A stay paid at the hotel: the new app has no card gateway yet.
  const hotel = hotels.items.find((h) => h.price && h.pay_at_hotel)!;
  expect(hotel, "a stay with a price for the dates").toBeTruthy();
  // 180.12 Each price with its currency and amount.
  expect(hotel.currency).toMatch(/^[A-Z]{3}$/);

  const page = (await (await call("GET", `/travel/hotels/${hotel.id}?${new URLSearchParams(stay)}`, { token })).json()) as { rooms: { id: number; rates: { id: string; pay_at_hotel: boolean; price: { total: string } | null }[] }[] };
  const room = page.rooms.find((r) => r.rates.some((x) => x.price && x.pay_at_hotel))!;
  const rate = room.rates.find((x) => x.price && x.pay_at_hotel)!;
  const choice = { stay: { hotel_id: hotel.id, room_id: room.id, rate_id: rate.id, check_in: stay.check_in, check_out: stay.check_out, guests: 2, rooms: 1 } };
  const quote = await call("POST", "/travel/quote", { token, data: choice });
  expect(quote.status()).toBe(200);
  const priced = (await quote.json()) as { total: string; payment: { now: boolean; at_hotel: boolean } };
  expect(Number(priced.total)).toBeGreaterThan(0);
  expect(priced.payment.at_hotel).toBe(true);

  const booked = await call("POST", "/me/travel/bookings", {
    token,
    data: { ...choice, payment: "at_hotel", travellers: [{ first_name: "Layla", last_name: "Hassan" }], contact: { name: "Layla Hassan", email: `layla-${suffix}@travel.test`, phone: REVIEW.phone }, requests: [] },
  });
  expect(booked.status(), await booked.text()).toBeLessThan(300);
  const booking = (await booked.json()) as { id: number; reference: string; status: string };
  expect(booking.reference).toBeTruthy();
  expect(booking.status).toBe("confirmed");
  const trips = (await (await call("GET", "/me/travel/bookings", { token })).json()) as { items: { reference: string }[] };
  expect(trips.items.map((t) => t.reference)).toContain(booking.reference);
});
