import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/** 27 A gym without a website: a weekly timetable, spots that never overbook, memberships and members told when a class is called off. */
test.describe.configure({ mode: "serial" });
// Its own address, so the sign-up and sign-in limits per IP don't reach the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.227" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Pulse Studio", email: `pulse-${suffix}@gym.test`, password: "pulse-strong-password-1" };
let own: Page;
let api = "";
const members: Record<string, { email: string; headers: Record<string, string> }> = {};

/** Tomorrow's weekday in Istanbul (the booking setup's default time zone), as the Day list names it. */
const TOMORROW = new Date(Date.now() + 86_400_000).toLocaleDateString("en-US", { weekday: "long", timeZone: "Europe/Istanbul" });

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 57");
  await own.getByLabel("Your website (optional)").fill(`https://pulse-${suffix}.gym.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.fitnessAdminEmail);
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

/** The emails captured for this address (YALLAPP_MAIL_DIR), oldest first. */
async function mailsTo(to: string): Promise<{ to: string; subject: string; text: string; sentAt: string }[]> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = (await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as { to: string; subject: string; text: string; sentAt: string }))).filter(
    (m) => m.to === to,
  );
  return mails.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

/** A member who signs in to the app by email, each from their own address. */
async function signUp(request: APIRequestContext, name: string, n: number) {
  const email = `${name.toLowerCase()}-${suffix}@example.com`;
  const ip = { "x-forwarded-for": `198.51.100.${40 + n}` };
  const device = { id: `e2e-gym-${suffix}-${n}`, platform: "android", name: "Pixel", app_version: "1.0.0" };
  const asked = (await (await request.post(`${api}/auth/email/request`, { data: { email }, headers: ip })).json()) as { request_id: string };
  const code = (await mailsTo(email)).at(-1)!.subject.slice(0, 6);
  const verified = (await (await request.post(`${api}/auth/otp/verify`, { data: { request_id: asked.request_id, code, device }, headers: ip })).json()) as { signup_token: string };
  const registered = await request.post(`${api}/auth/register`, { data: { signup_token: verified.signup_token, name, device }, headers: ip });
  expect(registered.status()).toBe(201);
  members[name] = { email, headers: { authorization: `Bearer ${((await registered.json()) as { access_token: string }).access_token}` } };
}

test("the gym sets up its classes, coach, timetable and plans, in a gym's words", async () => {
  await own.goto("/dashboard/app-type");
  await own.getByText("Gym & fitness", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await expect(own.getByText("then your weekly classes on the Timetable page")).toBeVisible();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();

  const nav = own.getByRole("navigation", { name: "Dashboard" });
  for (const name of ["Timetable", "Membership plans", "Members", "Personal sessions"]) await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Classes & coaches" }).click();
  await expect(own.getByRole("heading", { name: "Classes & coaches", level: 1 })).toBeVisible();

  const services = own.getByRole("region", { name: "Services" });
  await services.getByLabel("Service name").fill("Yoga flow");
  await services.getByLabel("Duration (minutes)").fill("60");
  await services.getByRole("button", { name: "Add service" }).click();
  await expect(services.getByText("Yoga flow", { exact: true })).toBeVisible();

  const coaches = own.getByRole("region", { name: "Coaches" });
  await coaches.getByLabel("Name", { exact: true }).fill("Selin Aydın");
  await coaches.getByLabel("Role").fill("Yoga coach");
  await coaches.getByRole("checkbox", { name: "Yoga flow" }).check();
  await coaches.getByRole("button", { name: "Add coach" }).click();
  await expect(coaches.locator("summary").getByText("Selin Aydın", { exact: true })).toBeVisible();

  // Tomorrow at 18:00, two spots.
  await nav.getByRole("link", { name: "Timetable", exact: true }).click();
  await expect(own.getByRole("heading", { name: "Timetable", level: 1 })).toBeVisible();
  const weekly = own.getByRole("region", { name: "Weekly classes" });
  await weekly.locator("#class-new-service").selectOption({ label: "Yoga flow" });
  await weekly.locator("#class-new-coach").selectOption({ label: "Selin Aydın" });
  await weekly.locator("#class-new-day").selectOption({ label: TOMORROW });
  await weekly.locator("#class-new-time").fill("18:00");
  await weekly.locator("#class-new-capacity").fill("0");
  await weekly.getByRole("button", { name: "Add to timetable" }).click();
  await expect(weekly.getByText("Enter 1 to 500 spots.")).toBeVisible();
  await weekly.locator("#class-new-capacity").fill("2");
  await weekly.getByRole("button", { name: "Add to timetable" }).click();
  await expect(weekly.getByText(`${TOMORROW} 18:00 · Yoga flow`)).toBeVisible();
  await expect(own.getByRole("region", { name: "Coming 7 days" }).getByText("0 of 2 booked")).toBeVisible();

  await nav.getByRole("link", { name: "Membership plans" }).click();
  await own.getByRole("checkbox", { name: /Classes need a membership/ }).check();
  await own.getByRole("button", { name: "Save", exact: true }).click();
  await expect(own.getByText("Booking a class now needs a membership")).toBeVisible();
  const plans = own.getByRole("region", { name: "Plans" });
  await plans.locator("#plan-new-name").fill("5-class pack");
  await plans.locator("#plan-new-price").fill("600");
  await plans.locator("#plan-new-period").selectOption("pack");
  await plans.getByRole("button", { name: "Add plan" }).click();
  await expect(plans.getByText("A class pack needs a number of classes.")).toBeVisible();
  await plans.locator("#plan-new-credits").fill("5");
  await plans.getByRole("button", { name: "Add plan" }).click();
  await expect(plans.locator("summary").getByText("5-class pack", { exact: true })).toBeVisible();
  if (!(await plans.locator("#plan-new-name").isVisible())) await plans.getByText("Add a plan").click();
  await plans.locator("#plan-new-name").fill("Monthly unlimited");
  await plans.locator("#plan-new-price").fill("1800");
  await plans.getByRole("button", { name: "Add plan" }).click();
  await expect(plans.locator("summary").getByText("Monthly unlimited", { exact: true })).toBeVisible();
  // Without card payments, nothing is on sale yet.
  await expect(own.getByText("Plans go on sale in the app once card payments are set up below.")).toBeVisible();
});

test("members need a membership; spots never overbook when two book at once", async ({ request }) => {
  const config = await (await request.get(`${api}/config?platform=ios&app_version=1.0.0`)).json();
  expect(config.vertical).toBe("fitness");
  expect(config.bookings.classes).toEqual({ membership_required: true, cancel_before_minutes: 1440, memberships: false });
  const from = new Date().toISOString().slice(0, 10);
  const week = await (await request.get(`${api}/bookings/classes?from=${from}&to=${new Date(Date.now() + 8 * 86_400_000).toISOString().slice(0, 10)}`)).json();
  const yoga = week.items[0];
  expect(yoga).toMatchObject({ service: { name: "Yoga flow" }, staff: { name: "Selin Aydın" }, local_time: "18:00", capacity: 2, spots_left: 2, booked: false });

  await own.getByRole("link", { name: "App sign-in" }).click();
  await own.getByText("Phone number or email address").click();
  await own.getByRole("button", { name: "Save sign-in methods" }).click();
  await expect(own.getByRole("status").first()).toContainText("Saved.");
  for (const [n, name] of ["Ada", "Burak", "Cem"].entries()) await signUp(request, name, n);

  const book = (name: string) => request.post(`${api}/bookings/classes/${yoga.id}/book`, { headers: members[name]!.headers });
  const refused = await book("Ada");
  expect(refused.status()).toBe(403);
  expect((await refused.json()).code).toBe("membership_required");
  expect((await request.post(`${api}/memberships/checkout-link?platform=ios`, { data: { plan_id: 1 }, headers: members.Ada!.headers })).status()).toBe(404);

  // Paid at the desk: the gym adds their memberships.
  await own.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Members", exact: true }).click();
  const give = own.getByRole("region", { name: "Add a membership" });
  for (const [name, plan] of [
    ["Ada", "5-class pack"],
    ["Burak", "Monthly unlimited"],
    ["Cem", "Monthly unlimited"],
  ] as const) {
    await give.getByLabel("Their mobile number or email").fill(members[name]!.email);
    await give.getByLabel("Plan").selectOption({ label: plan });
    await give.getByRole("button", { name: "Add membership" }).click();
    await expect(give.getByText(`${name} now has “${plan}”.`)).toBeVisible();
  }

  const first = await book("Ada");
  expect(first.status()).toBe(200);
  expect(await first.json()).toMatchObject({ booked: true, spots_left: 1 });
  expect((await (await request.get(`${api}/me/memberships`, { headers: members.Ada!.headers })).json()).items[0]).toMatchObject({ plan: { name: "5-class pack", period: "pack" }, status: "active", credits_left: 4 });

  // The last spot, booked by two at the same moment: one gets it.
  const [b, c] = await Promise.all([book("Burak"), book("Cem")]);
  expect([b.status(), c.status()].sort()).toEqual([200, 409]);
  const loser = b.status() === 409 ? b : c;
  expect((await loser.json()).code).toBe("class_full");
  const after = await (await request.get(`${api}/bookings/classes?from=${yoga.local_date}&to=${yoga.local_date}`)).json();
  expect(after.items[0].spots_left).toBe(0);
});

test("the timetable lists who's coming; calling a class off frees spots, gives credits back and tells members", async ({ request }) => {
  await own.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Timetable", exact: true }).click();
  const coming = own.getByRole("region", { name: "Coming 7 days" });
  await expect(coming.getByText("2 of 2 booked")).toBeVisible();
  await coming.getByText("Who's coming (2)").click();
  await expect(coming.getByText(new RegExp(`Ada · ${members.Ada!.email}`))).toBeVisible();

  await own.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Members", exact: true }).click();
  await expect(own.getByText("4 classes left")).toBeVisible();

  await own.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Timetable", exact: true }).click();
  await own.getByRole("region", { name: "Coming 7 days" }).getByRole("button", { name: /^Cancel class/ }).first().click();
  await expect(own.getByRole("region", { name: "Coming 7 days" }).getByText("Cancelled", { exact: true }).first()).toBeVisible();

  const inbox = await (await request.get(`${api}/me/notifications`, { headers: members.Ada!.headers })).json();
  expect(inbox.items[0]).toMatchObject({ title: "Yoga flow is cancelled" });
  expect((await (await request.get(`${api}/me/memberships`, { headers: members.Ada!.headers })).json()).items[0].credits_left).toBe(5);

  // The owner adds classes to Ada's pack by hand.
  await own.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Members", exact: true }).click();
  await own.getByLabel("Add classes for Ada").fill("3");
  await own.getByRole("button", { name: "Add", exact: true }).first().click();
  await expect(own.getByText("Added 3 classes.")).toBeVisible();
  await expect(own.getByText("8 classes left")).toBeVisible();

  // The reviewers are told memberships are paid outside the app.
  await own.goto("/dashboard/publishing");
  if (await own.getByText("For the store reviewers (optional)").isVisible()) await expect(own.getByText(/3\.1\.3\(e\)/)).toBeVisible();
});
