import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * A Delivery & couriers app (roadmap 104), a Yallapp Studio project only: the
 * company makes it in Studio, the team activates it on a Studio plan without
 * delivery, the company sets one price, adds a service and a courier, and
 * finds its empty Shipments page. Delivery isn't on that plan, so the
 * dashboard says so and the app's delivery routes answer that the feature is off.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Nile Express", email: `nile-${suffix}@delivery.test`, password: "nile-express-strong-password-1" };
let own: Page;
let admin: Page;
let api = "";
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.196" };

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0196");
  await own.getByLabel("Your website (optional)").fill(`https://nile-${suffix}.delivery.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.deliveryAdminEmail);
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

test("the company makes a Delivery & couriers project in Yallapp Studio, not among the regular apps", async () => {
  // 103R.3 Delivery companies are Studio projects only.
  await own.goto("/dashboard/app-type?new=1");
  await expect(own.getByText("Delivery & couriers", { exact: true })).toHaveCount(0);

  await own.goto("/studio/new");
  await own.getByRole("radio", { name: "Delivery and couriers company" }).check();
  // Its content is kept in Yallapp only.
  const sources = own.getByRole("radiogroup", { name: "2 · Where does the content come from?" }).getByRole("radio");
  await expect(sources).toHaveText(["No website: everything from here"]);
  await own.getByLabel("Project name").fill(client.name);
  await own.getByRole("button", { name: "Next" }).click();
  // 103R.7 The delivery company's own template, with no shop or menu.
  await expect(own.getByRole("radio", { name: "Delivery", exact: true })).toBeVisible();
  await expect(own.getByRole("radio", { name: "Shop", exact: true })).toHaveCount(0);
  await own.getByRole("radio", { name: "Blank page" }).click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
  await expect(own.getByRole("heading", { level: 1, name: client.name })).toBeVisible();
  // The approved design's delivery group, checklist and numbers.
  const nav = own.getByRole("navigation", { name: "Project dashboard" });
  for (const link of ["Shipments", "Couriers", "Paid orders", "Delivery settings"]) {
    await expect(nav.getByRole("link", { name: link, exact: true })).toBeVisible();
  }
  await expect(own.getByText("Prices and how customers pay, in Delivery settings")).toBeVisible();
  await expect(own.getByText("Shipments today")).toBeVisible();
  await expect(own.getByText("Couriers on duty")).toBeVisible();

  await own.goto("/dashboard/setup?step=website");
  await expect(own).toHaveURL(/\/studio\/project\/setup\?step=website$/);
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
  expect(api).toMatch(/\/api\/app\/[0-9a-f-]{36}$/);

  // The team activates the project on a Studio plan, which leaves delivery out.
  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: client.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  const plan = admin.getByRole("region", { name: client.name }).getByRole("region", { name: "Plan and license" });
  // Studio's plans only.
  await expect(plan.getByLabel("Plan").locator("option")).toHaveCount(3);
  await expect(plan.getByLabel("Plan").locator("option", { hasText: "Starter" })).toHaveCount(0);
  await plan.getByLabel("Plan").selectOption("studio_1");
  await plan.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
});

test("Delivery settings: not on the plan yet, one price, a service", async () => {
  await own.goto("/dashboard/delivery");
  await expect(own).toHaveURL(/\/studio\/project\/delivery$/);
  await expect(own.getByRole("heading", { name: "Delivery settings", level: 1 })).toBeVisible();
  await expect(own.getByText("Delivery & couriers isn't included in this app's plan yet")).toBeVisible();
  // A second courier app isn't on the plan either.
  await expect(own.getByText("A second app for couriers isn't in your plan.")).toBeVisible();

  await own.getByLabel("Price (EGP)", { exact: true }).fill("45");
  await own.getByRole("button", { name: "Save settings" }).click();
  await expect(own.getByText("Saved. The app shows it the next time it opens.")).toBeVisible();
  await own.reload();
  await expect(own.getByLabel("Price (EGP)", { exact: true })).toHaveValue("45.00");

  await own.getByLabel("Name", { exact: true }).fill("Same-day");
  await own.getByLabel("How long it takes (optional)").fill("Within 4 hours");
  await own.getByRole("button", { name: "Save service" }).click();
  await expect(own.getByText("Added. Customers choose it when they send a parcel.")).toBeVisible();
  await own.reload();
  await expect(own.getByText("Edit Same-day")).toBeVisible();
});

test("Couriers: one added by mobile number, then a second with the same number is refused", async () => {
  await own.goto("/dashboard/couriers");
  await expect(own.getByText("No couriers yet.")).toBeVisible();
  const add = own.getByRole("region", { name: "Add a courier" });
  await add.getByLabel("Name", { exact: true }).fill("Karim Hassan");
  await add.getByLabel("Mobile number").fill("+20 111 222 3334");
  await add.getByLabel("Vehicle (optional)").fill("Motorbike");
  await add.getByRole("button", { name: "Add" }).click();
  await expect(own.getByText("Added. They sign in to the app with this number and see their jobs.")).toBeVisible();
  await own.reload();
  await expect(own.getByText("Karim Hassan").first()).toBeVisible();

  await add.getByLabel("Name", { exact: true }).fill("Someone else");
  await add.getByLabel("Mobile number").fill("+20 111 222 3334");
  await add.getByRole("button", { name: "Add" }).click();
  await expect(own.getByText("You already have a courier with this number or email.")).toBeVisible();
});

test("Shipments: none yet; the app's delivery routes wait for the plan", async ({ request }) => {
  await own.goto("/dashboard/shipments");
  await expect(own.getByRole("heading", { name: "Shipments", level: 1 })).toBeVisible();
  await expect(own.getByText("No shipments here")).toBeVisible();

  const services = await request.get(`${api}/delivery/services`);
  expect(services.status()).toBe(403);
  expect((await services.json()).code).toBe("feature_disabled");
});
