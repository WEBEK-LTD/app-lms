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
  for (const link of ["Live map", "Shipments", "Couriers", "Paid orders", "Delivery settings"]) {
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
  // 112.3 Couriers always work in their own app, which every Studio plan has unless the team unticks it: no choice of where.
  await expect(own.getByRole("heading", { name: "Your couriers' app" })).toBeVisible();
  await expect(own.getByText(`Your couriers work in their own app, ${client.name} Courier`)).toBeVisible();
  await expect(own.getByText("The couriers' app isn't in your plan yet")).toHaveCount(0);
  await expect(own.getByRole("radio", { name: "In your app" })).toHaveCount(0);

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

test("112.3 two apps: Builds, Setup and the preview show the customers' app and the couriers' app", async () => {
  await own.goto("/dashboard/builds");
  await expect(own).toHaveURL(/\/studio\/project\/builds$/);
  const two = own.getByRole("region", { name: "Your two apps" });
  await expect(two.locator('[data-app="customers"]')).toContainText("Customers' app");
  await expect(two.locator('[data-app="customers"]')).toContainText(client.name);
  await expect(two.locator('[data-app="courier"]')).toContainText("Couriers' app");
  await expect(two.locator('[data-app="courier"]')).toContainText(`${client.name} Courier`);
  await expect(two.getByRole("link", { name: "Notes for the stores' reviewers, for both apps" })).toHaveAttribute("href", "/studio/project/publishing#h-review");
  // Its own builds section, on the plan.
  await expect(own.getByRole("region", { name: "The couriers' app" })).toBeVisible();
  await expect(own.getByText("The courier app isn't on your plan.")).toHaveCount(0);

  await own.goto("/dashboard/setup?step=listing");
  await expect(own.getByRole("region", { name: "Your two apps" }).locator('[data-app="courier"]')).toContainText(`${client.name} Courier`);

  // The preview shows either app: the couriers' one with its own link.
  await own.goto("/dashboard/preview");
  const apps = own.locator("[data-preview-apps]");
  await expect(apps.getByRole("button", { name: "Customers' app" })).toHaveAttribute("aria-pressed", "true");
  await expect(own.getByTestId("app-preview")).not.toHaveAttribute("src", /\.courier\./);
  await apps.getByRole("button", { name: "Couriers' app" }).click();
  await expect(own.getByTestId("app-preview")).toHaveAttribute("src", /token=p1\.[0-9a-f-]+\.\d+\.[01]\.courier\./);
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

test("112.2 Live map: the couriers and the jobs, on a plain background until Yallapp's map is set", async () => {
  await own.goto("/dashboard/delivery/live");
  await expect(own).toHaveURL(/\/studio\/project\/delivery\/live$/);
  await expect(own.getByRole("heading", { level: 1, name: "Live map" })).toBeVisible();
  for (const [key, label] of [
    ["onDuty", "Couriers on duty"],
    ["onTheWay", "Parcels on the way"],
    ["waiting", "Waiting for a courier"],
    ["today", "Delivered today"],
  ] as const) {
    await expect(own.locator(`[data-count="${key}"]`)).toContainText(label);
  }
  await expect(own.locator("[data-no-map]")).toContainText("Yallapp's map isn't switched on yet");
  await expect(own.getByRole("region", { name: "Live map" })).toBeVisible();
  await expect(own.getByText("No jobs now.")).toBeVisible();
});

test("104.8.3 Delivery settings: the couriers can work in Yallapp Courier instead, and the Couriers page says so", async () => {
  await own.goto("/dashboard/delivery");
  const work = own.getByRole("group", { name: "Where your couriers work" });
  await expect(work.getByRole("radio", { name: `In your couriers' app, ${client.name} Courier` })).toBeChecked();
  await work.getByRole("radio", { name: "In Yallapp Courier" }).check();
  await expect(own.getByText("What your couriers do: download Yallapp Courier")).toBeVisible();
  await expect(own.getByRole("heading", { name: "Your couriers' app" })).toBeHidden();
  await own.getByRole("button", { name: "Save settings" }).click();
  await expect(own.getByText("Saved. The app shows it the next time it opens.")).toBeVisible();
  await own.reload();
  await expect(own.getByRole("radio", { name: "In Yallapp Courier" })).toBeChecked();
  // The prices stay as they were.
  await expect(own.getByLabel("Price (EGP)", { exact: true })).toHaveValue("45.00");

  await own.goto("/dashboard/couriers");
  await expect(own.locator('[data-couriers-app="yallapp_courier"]')).toContainText("Your couriers work in Yallapp Courier");
  await expect(own.locator("[data-hub-sign-in]").first()).toContainText("Not signed in to Yallapp Courier yet");
});
