import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/** A business without a website takes bookings: services, team and hours set in the dashboard (roadmap 8.6). */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Salon Lale", email: `lale-${suffix}@salon.test`, password: "lale-strong-password-1" };
let own: Page;
let api = "";

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 41");
  await own.getByLabel("Your website (optional)").fill(`https://lale-${suffix}.salon.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  const admin = await browser.newPage();
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.settingsAdminEmail);
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

test("the business sets up bookings without a website", async () => {
  await own.goto("/dashboard/app-type");
  await own.getByText("Bookings", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await expect(own.getByText("add your services, your team and their hours")).toBeVisible();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();

  await own.getByRole("link", { name: "Services & team" }).click();
  await expect(own.getByText("Customers can book once you add a service")).toBeVisible();
  const services = own.getByRole("region", { name: "Services" });
  await services.getByLabel("Service name").fill("Haircut");
  await services.getByLabel("Duration (minutes)").fill("2");
  await services.getByRole("button", { name: "Add service" }).click();
  await expect(services.getByText("Enter 5 to 720 minutes.")).toBeVisible();
  await services.getByLabel("Duration (minutes)").fill("30");
  await services.getByLabel("Price").fill("300");
  await services.getByLabel("Description").fill("A wash and a cut.");
  await services.getByRole("button", { name: "Add service" }).click();
  await expect(services.getByText("Haircut", { exact: true })).toBeVisible();

  const team = own.getByRole("region", { name: "Team" });
  await team.getByLabel("Name", { exact: true }).fill("Ayşe Kaya");
  await team.getByLabel("Role").fill("Stylist");
  await team.getByRole("checkbox", { name: "Haircut" }).check();
  await team.getByLabel("Works on Saturday").check();
  await team.getByLabel("Saturday from").fill("10:00");
  await team.getByLabel("Saturday until").fill("14:00");
  await team.getByRole("button", { name: "Add team member" }).click();
  await expect(team.getByText("Mon 09:00–17:00")).toBeVisible();
  await expect(team.getByText("Sat 10:00–14:00")).toBeVisible();

  const rules = own.getByRole("region", { name: "Booking rules" });
  await rules.getByLabel("Book at least (hours ahead)").fill("0");
  await rules.getByLabel("Approve new appointments at once").uncheck();
  await rules.getByRole("button", { name: "Save rules" }).click();
  await expect(rules.getByText("Booking rules saved.")).toBeVisible();
});

test("the app sees the services and free times", async ({ request }) => {
  const config = await (await request.get(`${api}/config?platform=android&app_version=1.0.0`)).json();
  expect(config.bookings).toMatchObject({ plugin: "yallapp", timezone: "Europe/Istanbul", currency: "TRY", staff_choice: false, min_minutes_ahead: 0 });
  const services = await (await request.get(`${api}/bookings/services`)).json();
  expect(services).toMatchObject({ total: 1, items: [{ name: "Haircut", duration_minutes: 30, price: { formatted: "₺300.00" } }] });
  const detail = await (await request.get(`${api}/bookings/services/${services.items[0].id}`)).json();
  expect(detail).toMatchObject({ description_html: "<p>A wash and a cut.</p>", staff: [{ name: "Ayşe Kaya", title: "Stylist" }] });

  // The next Saturday, two weeks out: 10:00 to 13:30 every 30 minutes.
  const day = new Date(Date.now() + 14 * 86_400_000);
  day.setUTCDate(day.getUTCDate() + ((6 - day.getUTCDay() + 7) % 7));
  const date = day.toISOString().slice(0, 10);
  const free = await (await request.get(`${api}/bookings/availability?service=${services.items[0].id}&from=${date}&days=2`)).json();
  expect(free.days[0].slots.map((s: { local_time: string }) => s.local_time)).toEqual(["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30"]);
  expect(free.days[1].slots).toEqual([]);
  expect((await request.post(`${api}/bookings/appointments?platform=android`, { data: { service_id: 1, start: free.days[0].slots[0].start } })).status()).toBe(401);

  await own.getByRole("link", { name: "Appointments" }).click();
  await expect(own.getByText("No upcoming appointments.")).toBeVisible();
  await expect(own.getByText("Approve new ones, or reject them.")).toBeVisible();
});

/** The sign-in code in the latest email to this address (captured in YALLAPP_MAIL_DIR). */
async function emailedCode(to: string): Promise<string> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = (await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as { to: string; subject: string; sentAt: string }))).filter(
    (m) => m.to === to,
  );
  mails.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  const subject = mails.at(-1)?.subject ?? "";
  expect(subject).toMatch(/^\d{6} is your .+ code$/);
  return subject.slice(0, 6);
}

test("19 someone who signs in by email books, and the business reaches them by email", async ({ request }) => {
  await own.getByRole("link", { name: "App sign-in" }).click();
  await own.getByText("Phone number or email address").click();
  await own.getByRole("button", { name: "Save sign-in methods" }).click();
  await expect(own.getByRole("status").first()).toContainText("Saved.");

  // A long address: it no longer has to fit the phone column.
  const email = `a-customer-with-a-rather-long-address-${suffix}@a-long-company-name.example.com`;
  const device = { id: `e2e-book-${suffix}`, platform: "android", name: "Pixel", app_version: "1.0.0" };
  const asked = (await (await request.post(`${api}/auth/email/request`, { data: { email } })).json()) as { request_id: string };
  const verified = (await (await request.post(`${api}/auth/otp/verify`, { data: { request_id: asked.request_id, code: await emailedCode(email), device } })).json()) as {
    signup_token: string;
  };
  const registered = await request.post(`${api}/auth/register`, { data: { signup_token: verified.signup_token, name: "Deniz Mail", device } });
  expect(registered.status()).toBe(201);
  const token = ((await registered.json()) as { access_token: string }).access_token;

  const services = await (await request.get(`${api}/bookings/services`)).json();
  const day = new Date(Date.now() + 14 * 86_400_000);
  day.setUTCDate(day.getUTCDate() + ((6 - day.getUTCDay() + 7) % 7));
  const free = await (await request.get(`${api}/bookings/availability?service=${services.items[0].id}&from=${day.toISOString().slice(0, 10)}&days=1`)).json();
  const booked = await request.post(`${api}/bookings/appointments?platform=android`, {
    data: { service_id: services.items[0].id, start: free.days[0].slots.at(-1).start },
    headers: { authorization: `Bearer ${token}` },
  });
  expect(booked.status()).toBe(201);

  await own.getByRole("link", { name: "Appointments" }).click();
  await expect(own.getByRole("link", { name: email })).toHaveAttribute("href", `mailto:${email}`);
  await expect(own.locator('a[href^="tel:"]')).toHaveCount(0);
});
