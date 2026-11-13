import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * A travel app (roadmap 126), a Yallapp Studio project only: the company
 * makes it in Studio, the team activates it on a Studio plan without
 * Travel, the team switches its parts in Admin (Hotels and Flights, the
 * outside sources coming soon, the tabs live), and the company adds a hotel
 * and its room in the dashboard. Travel isn't on that plan, so the
 * dashboard says so and the app's travel routes answer that it is off.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Safra Trips", email: `travel-${suffix}@travel.test`, password: "safra-travel-strong-password-1" };
let own: Page;
let admin: Page;
let api = "";
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.126" };

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0126");
  await own.getByLabel("Your website (optional)").fill(`https://travel-${suffix}.travel.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.travelAdminEmail);
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

test("the company makes a Travel project in Yallapp Studio, with Safra's design first", async () => {
  await own.goto("/studio/new");
  await own.getByRole("radio", { name: "Travel: hotels and flights" }).check();
  const sources = own.getByRole("radiogroup", { name: "2 · Where does the content come from?" }).getByRole("radio");
  await expect(sources).toHaveText(["No website: everything from here"]);
  await own.getByLabel("Project name").fill(client.name);
  await own.getByRole("button", { name: "Next" }).click();
  // The demo's own template is offered first.
  await expect(own.getByRole("radio", { name: "Our demo: Safra" })).toBeVisible();
  await own.getByRole("radio", { name: "Blank page" }).click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
  const nav = own.getByRole("navigation", { name: "Project dashboard" });
  for (const link of ["Bookings", "Hotels", "Flights", "Travel settings"]) {
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

test("Admin › Travel: hotels and flights switched, outside sources coming soon, the tabs live", async () => {
  await admin.reload();
  const form = admin.locator("[data-travel-parts]");
  await expect(form).toBeVisible();
  const tabs = form.getByRole("list", { name: "The app's tabs" }).getByRole("listitem");
  await expect(tabs).toHaveText(["Explore", "Stays", "Flights", "Trips", "Account"]);
  // The hotel's own system, a supplier and a live flight provider aren't connected yet.
  await expect(form.getByText("Coming soon · ask Yallapp")).toHaveCount(3);
  for (const radio of await form.getByRole("radio").all()) {
    if (await radio.isDisabled()) await expect(radio).not.toBeChecked();
  }
  // Flights off: the tabs of a hotels-only app.
  await form.getByRole("checkbox", { name: "Flights" }).uncheck({ force: true });
  await expect(tabs).toHaveText(["Explore", "Saved", "Bookings", "Messages", "Account"]);
  // Both off isn't allowed: one part stays on.
  await form.getByRole("checkbox", { name: "Hotels" }).uncheck({ force: true });
  await expect(form.getByText("At least one part stays on", { exact: false })).toBeVisible();
  await expect(form.getByRole("button", { name: "Save" })).toBeDisabled();
  await form.getByRole("checkbox", { name: "Hotels" }).check({ force: true });
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form.getByRole("status")).toContainText("Saved");

  const config = await own.request.get(`${api}/config?platform=android&app_version=1.0.0`);
  expect(config.status()).toBe(200);
  const travel = ((await config.json()) as { travel: { mode: string; hotels: boolean; flights: boolean } }).travel;
  expect(travel).toMatchObject({ mode: "hotels", hotels: true, flights: false });
});

test("Hotels: not on the plan yet; a hotel and its room added", async () => {
  await own.goto("/dashboard/travel/hotels");
  await expect(own).toHaveURL(/\/studio\/project\/travel\/hotels$/);
  await expect(own.getByText("Travel isn't included in this project's plan yet", { exact: false })).toBeVisible();
  await expect(own.getByText("No hotels yet")).toBeVisible();
  await own.getByRole("textbox", { name: "Name", exact: true }).fill("Nile Garden Resort");
  await own.getByRole("textbox", { name: "City", exact: true }).fill("Luxor");
  await own.getByRole("textbox", { name: "Country", exact: true }).fill("Egypt");
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Nile Garden Resort" })).toBeVisible();
  await expect(own.getByText("No rooms yet", { exact: false })).toBeVisible();

  await own.getByRole("button", { name: "Add a room" }).click();
  const sheet = own.getByRole("dialog");
  await sheet.getByLabel("Name", { exact: true }).fill("Deluxe Nile View");
  await sheet.getByLabel("Rooms of this kind", { exact: true }).fill("4");
  await sheet.getByLabel("A night (USD)", { exact: true }).fill("150");
  await sheet.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.getByText("Deluxe Nile View", { exact: true }).first()).toBeVisible();
  await expect(own.getByText("$150.00 a night", { exact: false })).toBeVisible();

  await own.goto("/dashboard/travel/hotels");
  await expect(own.getByText("Nile Garden Resort")).toBeVisible();
  await expect(own.getByText("1 kind of room")).toBeVisible();
});

test("the app's travel routes answer that Travel is off on this plan", async () => {
  const hotels = await own.request.get(`${api}/travel/hotels`);
  expect(hotels.status()).toBe(403);
  expect(((await hotels.json()) as { code: string }).code).toBe("feature_disabled");
});
