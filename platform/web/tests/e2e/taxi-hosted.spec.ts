import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * A Live taxi app (roadmap 105.9), a Yallapp Studio project only: the
 * company makes it in Studio, the team activates it on a Studio plan
 * without live taxis, the company chooses OpenStreetMap with its tile
 * server and its Firebase Realtime Database, then Google Maps with its own
 * key. Live taxis aren't on that plan, so the dashboard says so and the
 * app's taxi routes answer that the feature is off.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Lamha Taxi", email: `taxi-${suffix}@taxi.test`, password: "lamha-taxi-strong-password-1" };
const GOOGLE_KEY = `AIza${"T".repeat(35)}`;
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
  await own.getByLabel("Your website (optional)").fill(`https://taxi-${suffix}.taxi.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.taxiAdminEmail);
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

test("the company makes a Live taxi project in Yallapp Studio, apart from ride hailing", async () => {
  await own.goto("/studio/new");
  await expect(own.getByRole("radio", { name: "Rides, like Uber" })).toBeVisible();
  await own.getByRole("radio", { name: "Live taxi on the map" }).check();
  const sources = own.getByRole("radiogroup", { name: "2 · Where does the content come from?" }).getByRole("radio");
  await expect(sources).toHaveText(["No website: everything from here"]);
  await own.getByLabel("Project name").fill(client.name);
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: "Blank page" }).click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
  const nav = own.getByRole("navigation", { name: "Project dashboard" });
  for (const link of ["Rides", "Drivers", "Vehicle types", "Ride settings", "Maps & live"]) {
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

test("Maps & live: OpenStreetMap from the company's tile server and its Realtime Database", async () => {
  await own.goto("/dashboard/taxi/settings");
  await expect(own).toHaveURL(/\/studio\/project\/taxi\/settings$/);
  await expect(own.getByText("Live taxis aren't included in this app's plan yet", { exact: false })).toBeVisible();
  await own.getByRole("radio", { name: "OpenStreetMap" }).check();
  await own.getByLabel("Tile server", { exact: true }).fill("https://tile.openstreetmap.org/{z}/{x}.png");
  await own.getByLabel("Realtime Database address", { exact: true }).fill("https://lamha-taxi.example.com");
  await own.getByRole("button", { name: "Save", exact: true }).click();
  await expect(own.getByText("Enter an https address with {z}, {x} and {y}", { exact: false })).toBeVisible();
  await expect(own.getByText("Enter your database's address", { exact: false })).toBeVisible();

  await own.getByLabel("Tile server", { exact: true }).fill("https://tiles.lamha.test/{z}/{x}/{y}.png");
  await own.getByLabel("Realtime Database address", { exact: true }).fill("https://lamha-taxi-default-rtdb.firebaseio.com/");
  await own.getByRole("button", { name: "Save", exact: true }).click();
  await expect(own.getByText("Saved. The app shows it the next time it opens.")).toBeVisible();
  await own.reload();
  await expect(own.getByLabel("Tile server", { exact: true })).toHaveValue("https://tiles.lamha.test/{z}/{x}/{y}.png");
  await expect(own.getByLabel("Map credit", { exact: true })).toHaveValue("© OpenStreetMap contributors");
  await expect(own.getByLabel("Realtime Database address", { exact: true })).toHaveValue("https://lamha-taxi-default-rtdb.firebaseio.com");

  // No Firebase service account yet: the test says where to add it. The rules are there to paste.
  await own.getByRole("button", { name: "Test the database" }).click();
  await expect(own.getByText("Add your app's Firebase service account first", { exact: false })).toBeVisible();
  await expect(own.getByRole("region", { name: "Database rules" }).locator("pre")).toContainText('"yallapp"');
});

test("Maps & live: Google Maps with the company's own key, kept hidden", async () => {
  await own.goto("/dashboard/taxi/settings");
  await own.getByRole("radio", { name: "Google Maps" }).check();
  await own.getByLabel("Google Maps API key", { exact: true }).fill("not-a-key");
  await own.getByRole("button", { name: "Save", exact: true }).click();
  await expect(own.getByText("This isn't a Google API key.", { exact: false })).toBeVisible();
  await own.getByLabel("Google Maps API key", { exact: true }).fill(GOOGLE_KEY);
  await own.getByRole("button", { name: "Save", exact: true }).click();
  await expect(own.getByText("Saved. The app shows it the next time it opens.")).toBeVisible();
  await own.reload();
  await expect(own.getByLabel("Google Maps API key", { exact: true })).toHaveValue("");
  await expect(own.getByText(`Saved: AIza${"•".repeat(16)}TTT.`, { exact: false })).toBeVisible();
  await expect(own.locator("body")).not.toContainText(GOOGLE_KEY);
  await own.getByRole("button", { name: "Remove the key" }).click();
  await expect(own.getByText("Saved: AIza", { exact: false })).toHaveCount(0);
});

test("the app's taxi routes wait for the plan", async ({ request }) => {
  const nearby = await request.get(`${api}/taxi/nearby?lat=30.04&lng=31.23`);
  expect(nearby.status()).toBe(403);
  expect((await nearby.json()).code).toBe("feature_disabled");
});
