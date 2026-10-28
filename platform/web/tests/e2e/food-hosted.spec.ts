import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * A Food delivery app (roadmap 105.1), a Yallapp Studio project only: the
 * company makes it in Studio, the team activates it on a Studio plan without
 * food delivery, the company sets one delivery price and its cuisines, adds a
 * restaurant with its hours, a menu section, a dish with choices and a staff
 * member, and finds its empty Food orders page. Food delivery isn't on that
 * plan, so the dashboard says so and the app's food routes answer that the
 * feature is off.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Nile Eats", email: `eats-${suffix}@food.test`, password: "nile-eats-strong-password-1" };
let own: Page;
let admin: Page;
let api = "";
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.197" };

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0197");
  await own.getByLabel("Your website (optional)").fill(`https://eats-${suffix}.food.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.foodAdminEmail);
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

test("the company makes a Food delivery project in Yallapp Studio, not among the regular apps", async () => {
  await own.goto("/dashboard/app-type?new=1");
  await expect(own.getByText("Food delivery", { exact: true })).toHaveCount(0);

  await own.goto("/studio/new");
  await own.getByRole("radio", { name: "Food delivery from many restaurants" }).check();
  const sources = own.getByRole("radiogroup", { name: "2 · Where does the content come from?" }).getByRole("radio");
  await expect(sources).toHaveText(["No website: everything from here"]);
  await own.getByLabel("Project name").fill(client.name);
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: "Blank page" }).click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
  const nav = own.getByRole("navigation", { name: "Project dashboard" });
  for (const link of ["Food orders", "Restaurants", "Courier jobs", "Couriers", "Paid orders", "Delivery settings"]) {
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

test("Delivery settings: not on the plan yet, one price, the cuisines, no parcel services", async () => {
  await own.goto("/dashboard/delivery");
  await expect(own).toHaveURL(/\/studio\/project\/delivery$/);
  await expect(own.getByText("Food delivery isn't included in this app's plan yet")).toBeVisible();
  await expect(own.getByRole("heading", { name: "Services" })).toHaveCount(0);
  await own.getByLabel("Price (EGP)", { exact: true }).fill("30");
  await own.getByLabel("Cuisines").fill("Koshari\nGrill");
  await own.getByRole("radio", { name: "When the food is ready" }).check();
  await own.getByRole("button", { name: "Save settings" }).click();
  await expect(own.getByText("Saved. The app shows it the next time it opens.")).toBeVisible();
  await own.reload();
  await expect(own.getByLabel("Cuisines")).toHaveValue("Koshari\nGrill");
  await expect(own.getByRole("radio", { name: "When the food is ready" })).toBeChecked();
});

test("Restaurants: one added with its hours, a section, a dish with choices and a staff member", async () => {
  await own.goto("/dashboard/restaurants");
  await expect(own.getByText("No restaurants yet.")).toBeVisible();
  const add = own.getByRole("region", { name: "Add a restaurant" });
  await add.getByLabel("Name", { exact: true }).fill("Abou Tarek");
  await add.getByLabel("Address", { exact: true }).fill("16 Maarouf, Downtown Cairo");
  await add.getByLabel("Place on the map").fill("30.0505, 31.2410");
  await add.getByLabel("Koshari").check();
  await add.getByLabel("Your share of each order (%)").fill("12.5");
  await add.getByRole("button", { name: "Add" }).click();
  await expect(own).toHaveURL(/\/studio\/project\/restaurants\/\d+\?added=1$/);
  await expect(own.getByText("Added. Now set its opening hours")).toBeVisible();
  await expect(own.getByText("No opening hours yet")).toBeVisible();

  await own.getByLabel("Monday Opens").first().fill("10:00");
  await own.getByLabel("Monday Closes").first().fill("23:30");
  await own.getByRole("button", { name: "Save hours" }).click();
  await expect(own.getByText("Saved.").first()).toBeVisible();

  const menu = own.getByRole("region", { name: "Menu" });
  await menu.getByPlaceholder("Mains, Sandwiches, Drinks").last().fill("Mains");
  await menu.getByRole("button", { name: "Add", exact: true }).last().click();
  await expect(own.getByText("Added. Add its dishes under it.")).toBeVisible();
  await own.reload();
  await expect(own.getByRole("heading", { name: "Mains", level: 3 })).toBeVisible();

  await menu.getByLabel("Dish name").last().fill("Koshari");
  await menu.getByLabel("Price (EGP)").last().fill("50");
  await menu.getByLabel("Choices (optional)").last().fill("Size (1-1): Regular, Large +15");
  await menu.getByRole("button", { name: "Add", exact: true }).first().click();
  // The dish shows in its section; its add box folds once the section has one.
  await expect(menu.getByText("Edit Koshari")).toBeVisible();
  await own.reload();
  await expect(menu.getByText("E£50.00 · Size")).toBeVisible();
  await menu.getByRole("button", { name: "Sold out", exact: true }).click();
  await expect(own.getByRole("button", { name: "Available again" })).toBeVisible();

  const staff = own.getByRole("region", { name: "Staff" });
  await staff.getByLabel("Mobile number").fill("+20 111 222 3335");
  await staff.getByLabel("Name", { exact: true }).fill("Chef Ali");
  await staff.getByRole("button", { name: "Add" }).click();
  await expect(own.getByText("Added. They sign in to the app with this number")).toBeVisible();

  await own.goto("/dashboard/restaurants");
  await expect(own.getByText("1 restaurant")).toBeVisible();
  await expect(own.getByText("Your share 12.5%")).toBeVisible();
});

test("Food orders: none yet, no statement; the app's food routes wait for the plan", async ({ request }) => {
  await own.goto("/dashboard/food-orders");
  await expect(own.getByRole("heading", { name: "Food orders", level: 1 })).toBeVisible();
  await expect(own.getByText("No orders here")).toBeVisible();
  await expect(own.getByText("No delivered orders in this month.")).toBeVisible();

  const restaurants = await request.get(`${api}/food/restaurants`);
  expect(restaurants.status()).toBe(403);
  expect((await restaurants.json()).code).toBe("feature_disabled");
});
