import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 100.7 An academy on its own API sells in the app: In-app purchases asks
 * for Yallapp's sign-in first, then the owner lists the courses and plans
 * the app sells (made into store products), changes and stops them, and
 * the page shows the developer what the API answers and the purchase
 * notices it was sent.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Birch Learning", email: `birch-${suffix}@learn.test`, password: "birch-strong-password-1" };
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.171" };
// Never resolves: nothing here calls it.
const clientApiAddress = `https://api.birch-${suffix}.test/yallapp/v1`;
let own: Page;

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 01 71");
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.inAppAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();
});

test.afterAll(async () => {
  await own.close();
});

test("an academy on its own API needs Yallapp's sign-in to sell in the app", async () => {
  await own.goto("/pending");
  await expect(own).toHaveURL(/\/dashboard\/app-type$/);
  await own.getByText("Academy", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByRole("radio", { name: /My own API/ }).check();
  await own.getByLabel("Your website", { exact: true }).fill(`https://birch-${suffix}.test`);
  await own.getByLabel("Your API address").fill(clientApiAddress);
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByText("Saved. Your API didn't pass every check below")).toBeVisible();

  await own.goto("/dashboard");
  await own.getByRole("link", { name: "In-app purchases" }).click();
  await expect(own.getByRole("heading", { level: 1, name: "In-app purchases" })).toBeVisible();
  await expect(own.getByText("To sell in the app, an app on its own API lets Yallapp sign people in")).toBeVisible();
  await expect(own.getByRole("region", { name: "What the app sells" })).toHaveCount(0);
  await own.getByRole("main").getByRole("link", { name: "App sign-in" }).click();
  await expect(own).toHaveURL(/\/dashboard\/app-sign-in$/);
  await own.getByRole("radio", { name: /Yallapp signs people in/ }).check();
  await own.getByRole("button", { name: "Save", exact: true }).first().click();
  await expect(own.getByText("Saved. Yallapp signs people in to your app from its next build.")).toBeVisible();
});

test("the owner lists the courses and plans the app sells, changes and stops them", async () => {
  await own.goto("/dashboard/in-app-purchases");
  await expect(own.getByRole("region", { name: "Selling in the app" })).toContainText("Yallapp tells your API of each purchase with a signed notice.");
  const sells = own.getByRole("region", { name: "What the app sells" });
  await expect(sells.getByText("Nothing listed yet.")).toBeVisible();
  const add = sells.locator("[data-add-item]");

  // A course: its ID in the owner's system must be a whole number.
  await add.getByLabel("ID in your system").fill("intro");
  await add.getByLabel("Title").fill("Arabic for beginners");
  await add.getByLabel("Price on your site").fill("450");
  await add.getByLabel("Currency").selectOption("TRY");
  await add.getByRole("button", { name: "Add" }).click();
  await expect(add.getByText("A course's ID is the whole number your system gives it, like 12.")).toBeVisible();
  await add.getByLabel("ID in your system").fill("12");
  await add.getByRole("button", { name: "Add" }).click();
  await expect(add.getByText("Saved. The stores get it within minutes once selling in the app is on.")).toBeVisible();
  const course = sells.locator('tr[data-item="course-12"]');
  await expect(course).toContainText("Arabic for beginners");
  await expect(course).toContainText("₺450.00");
  await expect(course).toHaveAttribute("data-state", "sold");

  // A yearly plan that opens two courses.
  await add.getByLabel("What it is").selectOption("membership");
  await add.getByLabel("ID in your system").fill("gold");
  await add.getByLabel("Title").fill("Gold");
  await add.getByLabel("Price on your site").fill("990");
  await add.getByLabel("Renews").selectOption("year");
  await add.getByLabel("Course IDs it opens").fill("12, 15");
  await add.getByRole("button", { name: "Add" }).click();
  await expect(add.getByText("Saved. The stores get it within minutes once selling in the app is on.")).toBeVisible();
  await expect(sells.locator('tr[data-item="membership-gold"]')).toContainText("12, 15");

  // Both are store products now, at the site's price.
  const products = own.getByRole("region", { name: "Products" });
  await expect(products.locator('tr[data-product="course_12"]')).toContainText("₺450.00");
  await expect(products.locator('tr[data-product="plan_gold"]')).toContainText("Membership, yearly");

  // A new price for the course.
  await course.getByText("Change").click();
  await course.getByLabel("Price on your site").fill("500");
  await course.getByRole("button", { name: "Save", exact: true }).click();
  await expect(course.getByText("Saved. The stores get it within minutes once selling in the app is on.")).toBeVisible();
  await own.reload();
  await expect(own.locator('tr[data-product="course_12"]')).toContainText("₺500.00");

  // The plan is stopped: its product too, kept for the people who bought it.
  const plan = own.locator('tr[data-item="membership-gold"]');
  await plan.getByRole("button", { name: /Stop selling/ }).click();
  await expect(plan.getByText("Stopped. The stores stop selling it within minutes; people who bought it keep it.")).toBeVisible();
  await own.reload();
  await expect(own.locator('tr[data-item="membership-gold"]')).toHaveAttribute("data-state", "stopped");
  await expect(own.locator('tr[data-product="plan_gold"]')).toHaveAttribute("data-active", "no");
  await own.locator('tr[data-item="membership-gold"]').getByRole("button", { name: /Sell again/ }).click();
  await expect(own.locator('tr[data-item="membership-gold"]').getByText("It's sold again.")).toBeVisible();

  // Selling on.
  const selling = own.getByRole("region", { name: "Selling in the app" });
  await selling.getByLabel("Sell my courses and memberships in the app").check();
  await selling.getByRole("button", { name: "Save" }).click();
  await expect(selling.getByText("In-app purchases are on. The stores get your products within minutes.")).toBeVisible();
});

test("the developer sees what the API answers, and the purchase notices", async ({ request }) => {
  await own.goto("/dashboard/in-app-purchases");
  const developer = own.getByRole("region", { name: "For your developer" });
  const config = (await developer.locator('[data-code="config"]').textContent())!;
  const base = /"base_url": "([^"]+)"/.exec(config)![1]!;
  expect(base).toMatch(new RegExp(`^${E2E.baseURL}/api/app/[0-9a-f-]{36}$`));
  expect(config).toContain('"session": "access_token"');
  await expect(developer).toContainText('"store_product_id": "course_12"');
  await expect(developer).toContainText(`POST ${clientApiAddress}/webhooks/yallapp`);
  await expect(developer.getByText("None in the last 30 days.")).toBeVisible();
  // No key yet: nothing is ready in the stores, so the public list is empty.
  const listed = await request.get(`${base}/billing/products?platform=android`);
  expect(listed.status()).toBe(200);
  expect(await listed.json()).toEqual({ items: [] });

  // The same page in Turkish.
  await own.context().addCookies([{ name: "yallapp_lang", value: "tr", url: E2E.baseURL }]);
  await own.reload();
  await expect(own.getByRole("region", { name: "Uygulamanın sattıkları" })).toBeVisible();
  await own.context().clearCookies({ name: "yallapp_lang" });
});
