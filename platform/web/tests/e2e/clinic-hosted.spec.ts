import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/** 21 A clinic without a website: doctors with profiles, an intake form, and visits with the patient's answers. */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Kardelen Clinic", email: `kardelen-${suffix}@clinic.test`, password: "kardelen-strong-password-1" };
/** Health data: it must reach the dashboard and the patient, never an email. */
const REASON = `Sensitive tooth on the left ${suffix}`;
let own: Page;
let api = "";

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 42");
  await own.getByLabel("Your website (optional)").fill(`https://kardelen-${suffix}.clinic.test`);
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

/** The emails captured for this address (YALLAPP_MAIL_DIR), oldest first. */
async function mailsTo(to: string): Promise<{ to: string; subject: string; text: string; sentAt: string }[]> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = (await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as { to: string; subject: string; text: string; sentAt: string }))).filter(
    (m) => m.to === to,
  );
  return mails.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

/** The next Saturday, two weeks out. */
function saturday(): string {
  const day = new Date(Date.now() + 14 * 86_400_000);
  day.setUTCDate(day.getUTCDate() + ((6 - day.getUTCDay() + 7) % 7));
  return day.toISOString().slice(0, 10);
}

test("the clinic sets up doctors and an intake form, in a clinic's words", async () => {
  await own.goto("/dashboard/app-type");
  await own.getByText("Clinic", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await expect(own.getByText("add your services, your doctors, their hours and your intake questions")).toBeVisible();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();

  // The menu speaks of doctors, visits and patients.
  const nav = own.getByRole("navigation", { name: "Dashboard" });
  await expect(nav.getByRole("link", { name: "Visits" })).toBeVisible();
  await expect(nav.getByText("Patients")).toBeVisible();
  await expect(nav.getByRole("link", { name: "Services & team" })).toHaveCount(0);
  await nav.getByRole("link", { name: "Doctors & services" }).click();
  await expect(own.getByRole("heading", { name: "Doctors & services", level: 1 })).toBeVisible();
  await expect(own.getByText("Patients can book once you add a service and a doctor")).toBeVisible();

  const services = own.getByRole("region", { name: "Services" });
  await services.getByLabel("Service name").fill("Dental check-up");
  await services.getByLabel("Duration (minutes)").fill("30");
  await services.getByLabel("Price").fill("1500");
  await services.getByRole("button", { name: "Add service" }).click();
  await expect(services.getByText("Dental check-up", { exact: true })).toBeVisible();

  const doctors = own.getByRole("region", { name: "Doctors" });
  await doctors.getByLabel("Name", { exact: true }).fill("Dr. Kerem Aksoy");
  await doctors.getByLabel("Role").fill("Dentist");
  await doctors.getByLabel("Specialties").fill("General dentistry, Children's dentistry");
  await doctors.getByLabel("Languages").fill("Turkish, English");
  await doctors.getByLabel("About them").fill("Kerem studied in Istanbul and Berlin.");
  await doctors.getByRole("checkbox", { name: "Dental check-up" }).check();
  await doctors.getByLabel("Works on Saturday").check();
  await doctors.getByLabel("Saturday from").fill("10:00");
  await doctors.getByLabel("Saturday until").fill("12:00");
  await doctors.getByRole("button", { name: "Add doctor" }).click();
  await expect(doctors.getByText("General dentistry · Children's dentistry")).toBeVisible();

  const intake = own.getByRole("region", { name: "Intake form" });
  await expect(intake.getByText("never put in emails or notifications")).toBeVisible();
  await intake.getByText("Add a question").click();
  await intake.locator("#intake-new-label").fill("Reason for your visit");
  await intake.locator("#intake-new-type").selectOption("textarea");
  await intake.getByRole("checkbox", { name: "Must be answered" }).check();
  await intake.getByRole("button", { name: "Add question" }).click();
  await expect(intake.getByText("Added “Reason for your visit”.")).toBeVisible();

  if (!(await intake.locator("#intake-new-label").isVisible())) await intake.getByText("Add a question").click();
  await intake.locator("#intake-new-label").fill("First visit?");
  await intake.locator("#intake-new-type").selectOption("choice");
  await intake.locator("#intake-new-options").fill("Yes");
  await intake.getByRole("button", { name: "Add question" }).click();
  await expect(intake.getByText("Write 2 to 20 options, one per line.")).toBeVisible();
  await intake.locator("#intake-new-options").fill("Yes\nNo");
  await intake.getByRole("checkbox", { name: "Must be answered" }).last().check();
  await intake.getByRole("button", { name: "Add question" }).click();
  await expect(intake.getByText("Added “First visit?”.")).toBeVisible();
  await expect(intake.locator("summary").getByText("One of a list")).toBeVisible();

  const rules = own.getByRole("region", { name: "Booking rules" });
  await rules.getByLabel("Book at least (hours ahead)").fill("0");
  await rules.getByRole("button", { name: "Save rules" }).click();
  await expect(rules.getByText("Booking rules saved.")).toBeVisible();
});

test("the app gets the questions and the doctor's profile; answers are checked and kept", async ({ request }) => {
  const config = await (await request.get(`${api}/config?platform=android&app_version=1.0.0`)).json();
  expect(config.vertical).toBe("clinic");
  expect(config.bookings.intake_fields).toEqual([
    { id: "reason_for_your_visit", label: "Reason for your visit", type: "textarea", required: true },
    { id: "first_visit", label: "First visit?", type: "choice", options: ["Yes", "No"], required: true },
  ]);
  const services = await (await request.get(`${api}/bookings/services`)).json();
  const service = services.items[0].id as number;
  const detail = await (await request.get(`${api}/bookings/services/${service}`)).json();
  expect(detail.staff[0]).toMatchObject({
    name: "Dr. Kerem Aksoy",
    title: "Dentist",
    specialties: ["General dentistry", "Children's dentistry"],
    languages: ["Turkish", "English"],
    bio: "Kerem studied in Istanbul and Berlin.",
  });

  // A patient who signs in by email.
  await own.getByRole("link", { name: "App sign-in" }).click();
  await own.getByText("Phone number or email address").click();
  await own.getByRole("button", { name: "Save sign-in methods" }).click();
  await expect(own.getByRole("status").first()).toContainText("Saved.");
  const email = `patient-${suffix}@example.com`;
  const device = { id: `e2e-clinic-${suffix}`, platform: "android", name: "Pixel", app_version: "1.0.0" };
  const asked = (await (await request.post(`${api}/auth/email/request`, { data: { email } })).json()) as { request_id: string };
  const code = (await mailsTo(email)).at(-1)!.subject.slice(0, 6);
  const verified = (await (await request.post(`${api}/auth/otp/verify`, { data: { request_id: asked.request_id, code, device } })).json()) as { signup_token: string };
  const registered = await request.post(`${api}/auth/register`, { data: { signup_token: verified.signup_token, name: "Deniz Hasta", device } });
  expect(registered.status()).toBe(201);
  const headers = { authorization: `Bearer ${((await registered.json()) as { access_token: string }).access_token}` };

  const free = await (await request.get(`${api}/bookings/availability?service=${service}&from=${saturday()}&days=1`)).json();
  const start = free.days[0].slots[0].start as string;
  const missing = await request.post(`${api}/bookings/appointments?platform=android`, { data: { service_id: service, start }, headers });
  expect(missing.status()).toBe(400);
  expect(await missing.json()).toMatchObject({ code: "invalid_answers", details: { fields: { reason_for_your_visit: "Please answer this.", first_visit: "Please choose one." } } });

  const booked = await request.post(`${api}/bookings/appointments?platform=android`, {
    data: { service_id: service, start, answers: { reason_for_your_visit: REASON, first_visit: "Yes" } },
    headers,
  });
  expect(booked.status()).toBe(201);
  const visit = await booked.json();
  expect(visit.answers).toEqual([
    { id: "reason_for_your_visit", label: "Reason for your visit", value: REASON },
    { id: "first_visit", label: "First visit?", value: "Yes" },
  ]);
  expect((await (await request.get(`${api}/me/appointments/${visit.id}`, { headers })).json()).answers).toHaveLength(2);
  expect((await request.get(`${api}/me/appointments/${visit.id}`)).status()).toBe(401);
});

test("only the Visits page shows the answers; the email points there", async () => {
  await own.getByRole("link", { name: "Visits" }).click();
  await expect(own.getByRole("heading", { name: "Visits", level: 1 })).toBeVisible();
  await own.getByText("Intake answers").click();
  await expect(own.getByText(REASON)).toBeVisible();
  await expect(own.getByText("First visit?")).toBeVisible();

  const mail = (await mailsTo(client.email)).filter((m) => m.subject.startsWith("New appointment")).at(-1)!;
  expect(mail.text).toContain("Deniz Hasta booked Dental check-up with Dr. Kerem Aksoy");
  expect(mail.text).toContain("See the intake answers on your dashboard.");
  expect(`${mail.subject}\n${mail.text}`).not.toContain(REASON);
  expect(mail.text).not.toContain("Reason for your visit");
});
