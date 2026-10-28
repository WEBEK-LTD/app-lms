import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * A Ride hailing app (roadmap 105.2), a Yallapp Studio project only: the
 * company makes it in Studio, the team activates it on a Studio plan without
 * rides, the company finds that the app can't take rides before it has a
 * vehicle type, adds one with its fares and a driver with their car, saves
 * its ride settings, and finds its empty Rides page. Rides aren't on that
 * plan, so the dashboard says so and the app's ride routes answer that the
 * feature is off.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Nile Rides", email: `rides-${suffix}@rides.test`, password: "nile-rides-strong-password-1" };
let own: Page;
let admin: Page;
let api = "";
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.198" };

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0198");
  await own.getByLabel("Your website (optional)").fill(`https://rides-${suffix}.rides.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.ridesAdminEmail);
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

test("the company makes a Ride hailing project in Yallapp Studio, not among the regular apps", async () => {
  await own.goto("/dashboard/app-type?new=1");
  await expect(own.getByText("Rides, like Uber", { exact: true })).toHaveCount(0);

  await own.goto("/studio/new");
  await own.getByRole("radio", { name: "Rides, like Uber" }).check();
  const sources = own.getByRole("radiogroup", { name: "2 · Where does the content come from?" }).getByRole("radio");
  await expect(sources).toHaveText(["No website: everything from here"]);
  await own.getByLabel("Project name").fill(client.name);
  await own.getByRole("button", { name: "Next" }).click();
  // Its own three designs come first.
  await expect(own.getByRole("radio", { name: "Rides", exact: true })).toBeVisible();
  await own.getByRole("radio", { name: "Blank page" }).click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
  const nav = own.getByRole("navigation", { name: "Project dashboard" });
  for (const link of ["Rides", "Drivers", "Vehicle types", "Statements", "Ride settings"]) {
    await expect(nav.getByRole("link", { name: link, exact: true })).toBeVisible();
  }

  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
  expect(api).toMatch(/\/api\/app\/[0-9a-f-]{36}$/);

  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: client.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  const plan = admin.getByRole("region", { name: client.name }).getByRole("region", { name: "Plan and license" });
  await plan.getByLabel("Plan").selectOption("studio_1");
  await plan.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
});

test("Vehicle types: not on the plan yet; one added with its fares", async () => {
  await own.goto("/dashboard/vehicle-types");
  await expect(own).toHaveURL(/\/studio\/project\/vehicle-types$/);
  await expect(own.getByText("Ride hailing isn't included in this app's plan yet")).toBeVisible();
  await expect(own.getByText("No vehicle types yet.")).toBeVisible();
  await own.getByLabel("Name", { exact: true }).fill("Economy");
  await own.getByLabel("Seats").fill("4");
  await own.getByLabel(/^Start \(/).fill("15");
  await own.getByLabel(/^Per km \(/).fill("6");
  await own.getByLabel(/^Per minute \(/).fill("1");
  await own.getByLabel(/^Smallest fare \(/).fill("30");
  await own.getByRole("button", { name: "Save" }).click();
  await expect(own.getByText("Added. Riders choose it when they ask for a ride.")).toBeVisible();
  await own.reload();
  await expect(own.getByText("Economy", { exact: true })).toBeVisible();
  await expect(own.getByText(/15\.00 \+ .*6\.00\/km \+ .*1\.00\/min · at least .*30\.00/)).toBeVisible();
});

test("Drivers: one added with their car", async () => {
  await own.goto("/dashboard/drivers");
  await expect(own.getByText("No drivers yet. Add the first one above.")).toBeVisible();
  await own.getByLabel("Name", { exact: true }).fill("Mahmoud Adel");
  await own.getByLabel("Mobile number").fill("+20 100 555 6677");
  await own.getByLabel("Vehicle type").selectOption({ label: "Economy" });
  await own.getByLabel("Car (make and model)").fill("Toyota Corolla");
  await own.getByLabel("Colour").fill("White");
  await own.getByLabel("Plate").fill("ABC 123");
  await own.getByRole("button", { name: "Save" }).click();
  await expect(own.getByText("Added. They sign in to the app with this number, go online and get rides.")).toBeVisible();
  await own.reload();
  await expect(own.getByText("1 driver")).toBeVisible();
  await expect(own.getByText("Mahmoud Adel")).toBeVisible();
});

test("Ride settings are saved; Rides is empty; the app's ride routes wait for the plan", async ({ request }) => {
  await own.goto("/dashboard/ride-settings");
  await expect(own.getByRole("heading", { name: "Ride settings", level: 1 })).toBeVisible();
  await own.getByRole("radio", { name: "By the meter" }).check();
  await own.getByRole("button", { name: "Save settings" }).click();
  await expect(own.getByText("Saved. The app shows it the next time it opens.")).toBeVisible();
  await own.reload();
  await expect(own.getByRole("radio", { name: "By the meter" })).toBeChecked();

  await own.goto("/dashboard/rides");
  await expect(own.getByRole("heading", { name: "Rides", level: 1 })).toBeVisible();
  await expect(own.getByText("No rides here")).toBeVisible();

  const estimate = await request.post(`${api}/rides/estimate`, { data: {} });
  expect(estimate.status()).toBe(403);
  expect((await estimate.json()).code).toBe("feature_disabled");
});
