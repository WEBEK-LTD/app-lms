import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * 132.10–132.15 Products and Courses, each job on its own page: a shop's
 * categories put in order (by the buttons and the keyboard, as the app
 * shows them), a product made in its editor (what was typed kept when a
 * field needs fixing, the photos put in order, leaving with unsaved changes
 * asks), the list's filters and bulk actions, the old addresses sent to the
 * new pages; then an academy's course categories, the course editor's tabs,
 * the curriculum in order and a lesson on its own page.
 */
test.describe.configure({ mode: "serial", timeout: 240_000 });

const suffix = Date.now().toString(36);
const client = { name: "Manage Shop", email: `manage-${suffix}@manage.test`, password: "manage-shop-strong-password-1" };
/** Its own address, so this spec's sign-ups don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.133" };
let own: Page;
let api = "";

const tabs = (page: Page) => page.getByRole("navigation", { name: "Products", exact: true });
const order = (page: Page, selector: string, attribute: string) => page.locator(selector).evaluateAll((els, a) => els.map((el) => el.getAttribute(a)), attribute);

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  own = await browser.newPage({ extraHTTPHeaders, viewport: { width: 1280, height: 900 } });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 532 000 0133");
  await own.getByLabel("Your website (optional)").fill(`https://manage-${suffix}.manage.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.samplesAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();

  // Signed in since signing up.
  await own.goto("/dashboard/app-type");
  await own.getByText("Store", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
});

test.afterAll(async () => {
  await own.close();
});

test("132.12 categories have their own page: added, renamed and put in the app's order", async () => {
  await own.goto("/dashboard/catalog");
  // An empty list: its first action, and the tabs to the other pages.
  await expect(own.getByText("No products yet.")).toBeVisible();
  await expect(tabs(own).getByRole("link", { name: /^Products/ })).toHaveAttribute("aria-current", "page");
  await tabs(own).getByRole("link", { name: /^Categories/ }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Categories" })).toBeVisible();
  await expect(own.getByText("No categories yet.")).toBeVisible();
  for (const name of ["Bouquets", "Gifts", "Vases"]) {
    await own.getByLabel("New category").fill(name);
    await own.getByRole("button", { name: "Add", exact: true }).click();
    await expect(own.locator(`[data-category="${name}"]`)).toBeVisible();
  }
  expect(await order(own, "[data-category]", "data-category")).toEqual(["Bouquets", "Gifts", "Vases"]);

  // The buttons move one place; the order is saved at once.
  await own.getByRole("button", { name: "Move up: Vases" }).click();
  await own.getByRole("button", { name: "Move up: Vases" }).click();
  await expect(own.getByText("Order saved. The app shows them in this order.")).toBeVisible();
  // The keyboard on the handle too.
  await own.getByRole("button", { name: "Move: Gifts", exact: true }).focus();
  await own.keyboard.press("ArrowUp");
  await expect.poll(() => order(own, "[data-category]", "data-category")).toEqual(["Vases", "Gifts", "Bouquets"]);
  await expect(own.getByText("Order saved. The app shows them in this order.")).toBeVisible();
  await own.reload();
  expect(await order(own, "[data-category]", "data-category")).toEqual(["Vases", "Gifts", "Bouquets"]);

  // Renamed where it is.
  const gifts = own.locator('[data-category="Gifts"]');
  await gifts.getByLabel("Category name").fill("Gift boxes");
  await gifts.getByRole("button", { name: "Rename" }).click();
  await expect(own.locator('[data-category="Gift boxes"]')).toBeVisible();
});

test("132.11 the product editor keeps what was typed, puts the photos in order and asks before leaving unsaved changes", async () => {
  await tabs(own).getByRole("link", { name: /^Products/ }).click();
  await own.getByRole("link", { name: "Add product" }).click();
  await expect(own.getByRole("heading", { level: 1, name: "New product" })).toBeVisible();
  await expect(own.locator('[data-save-bar="saved"]')).toContainText("A new product: not saved yet");
  await own.getByLabel("Name", { exact: true }).fill("Tulip Bouquet");
  await expect(own.locator('[data-save-bar="unsaved"]')).toContainText("Unsaved changes");
  await own.getByLabel("Description").fill("Twenty fresh tulips.");
  await own.getByLabel("Bouquets").check();
  await own.locator('input[name="images"]').setInputFiles([
    { name: "red.png", mimeType: "image/png", buffer: solidPng(64, 64, [220, 40, 60]) },
    { name: "white.png", mimeType: "image/png", buffer: solidPng(64, 64, [250, 250, 250]) },
  ]);
  await expect(own.getByRole("list", { name: "New photos, added when you save" }).getByRole("listitem")).toHaveCount(2);
  // How it's found and shared, as it's typed.
  await expect(own.locator("[data-share-preview]")).toContainText("Tulip Bouquet");
  await expect(own.locator("[data-share-preview]")).toContainText("Twenty fresh tulips.");

  // No price: the editor says so, and nothing typed or chosen is lost.
  await own.getByRole("button", { name: "Add product" }).click();
  await expect(own.getByText("Enter a price, like 450 or 450.50.")).toBeVisible();
  await expect(own.locator('[data-save-bar="errors"]')).toContainText("One field needs fixing.");
  await expect(own.getByLabel("Name", { exact: true })).toHaveValue("Tulip Bouquet");
  await expect(own.getByLabel("Bouquets")).toBeChecked();
  expect(await own.locator('input[name="images"]').evaluate((el) => (el as HTMLInputElement).files?.length)).toBe(2);

  await own.getByLabel("Price (TRY)", { exact: true }).fill("400");
  await own.getByLabel("Sale price (TRY)").fill("350");
  await expect(own.locator("[data-sale-preview]")).toContainText("13% off");
  await own.getByRole("button", { name: "Add product" }).click();
  await expect(own.getByRole("status").filter({ hasText: "Saved" })).toContainText("Saved “Tulip Bouquet”.");
  const row = own.locator('[data-product="Tulip Bouquet"]');
  await expect(row).toContainText("₺350.00");
  await expect(row).toContainText("13% off");

  // The second photo made the cover.
  await row.getByRole("link", { name: /Tulip Bouquet/ }).click();
  await expect(own.locator("[data-photo]")).toHaveCount(2);
  const before = await order(own, "[data-photo]", "data-photo");
  expect(before).toHaveLength(2);
  await own.getByRole("button", { name: "Move photo 2 earlier" }).click();
  expect(await order(own, "[data-photo]", "data-photo")).toEqual([before[1], before[0]]);
  await expect(own.locator('[data-save-bar="unsaved"]')).toBeVisible();

  // Leaving with unsaved changes asks: staying keeps them.
  own.once("dialog", (dialog) => {
    expect(dialog.message()).toBe("Leave without saving your changes?");
    void dialog.dismiss();
  });
  await own.getByRole("link", { name: "Cancel" }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Tulip Bouquet" })).toBeVisible();

  await own.getByRole("button", { name: "Save product" }).click();
  await expect(own.getByRole("status").filter({ hasText: "Saved" })).toContainText("Saved “Tulip Bouquet”.");
  await own.locator('[data-product="Tulip Bouquet"]').getByRole("link", { name: /Tulip Bouquet/ }).click();
  await expect(own.locator("[data-photo]")).toHaveCount(2);
  expect(await order(own, "[data-photo]", "data-photo")).toEqual([before[1], before[0]]);
  await expect(own.locator(`[data-photo="${before[1]}"]`)).toContainText("Cover");

  // Leaving anyway goes.
  await own.getByLabel("Name", { exact: true }).fill("Tulip Bouquet (large)");
  own.once("dialog", (dialog) => void dialog.accept());
  await own.getByRole("link", { name: "Cancel" }).click();
  await expect(own).toHaveURL(/\/dashboard\/catalog$/);
  await expect(own.locator('[data-product="Tulip Bouquet"]')).toBeVisible();
});

test("132.11 the list finds, filters, sorts and changes products in bulk", async ({ request }) => {
  for (const [name, price] of [
    ["Linen Tote", "100"],
    ["Ceramic Vase", "200"],
    ["Olive Soap", "300"],
  ] as const) {
    await own.goto("/dashboard/catalog/new");
    await own.getByLabel("Name", { exact: true }).fill(name);
    await own.getByLabel("Price (TRY)", { exact: true }).fill(price);
    await own.getByRole("button", { name: "Add product" }).click();
    await expect(own.getByRole("status").filter({ hasText: "Saved" })).toContainText(`Saved “${name}”.`);
  }
  const rows = () => order(own, "[data-product]", "data-product");
  await expect.poll(rows).toEqual(["Olive Soap", "Ceramic Vase", "Linen Tote", "Tulip Bouquet"]);
  await own.getByLabel("Sort").selectOption({ label: "Price, low to high" });
  await expect.poll(rows).toEqual(["Linen Tote", "Ceramic Vase", "Olive Soap", "Tulip Bouquet"]);
  await expect(own).toHaveURL(/sort=priceLow/);
  await own.getByRole("searchbox", { name: "Search products" }).fill("vase");
  await expect.poll(rows).toEqual(["Ceramic Vase"]);
  await own.getByRole("button", { name: "Clear filters" }).first().click();
  await own.getByRole("button", { name: /^On sale/ }).click();
  await expect.poll(rows).toEqual(["Tulip Bouquet"]);
  await own.getByRole("button", { name: /^On sale/ }).click();

  // Two hidden at once.
  await own.getByLabel("Select Ceramic Vase").check();
  await own.getByLabel("Select Olive Soap").check();
  const bar = own.getByRole("region", { name: "With the chosen ones" });
  await expect(bar).toContainText("2");
  await bar.getByRole("button", { name: "Hide" }).click();
  await expect(own.getByText("Hidden from the app: 2.")).toBeVisible();
  await own.getByLabel("Status").selectOption("hidden");
  await expect.poll(rows).toEqual(["Ceramic Vase", "Olive Soap"]);
  await own.getByLabel("Status").selectOption("all");

  // Every price 10% up: a sale price too.
  await own.getByLabel("Select all").check();
  await bar.locator("summary", { hasText: "Change price" }).click();
  await bar.getByLabel("Change prices by (%)").fill("10");
  await bar.getByRole("button", { name: "Apply" }).click();
  await expect(own.getByText("Prices changed: 4.")).toBeVisible();
  await expect(own.locator('[data-product="Linen Tote"]')).toContainText("₺110.00");
  await expect(own.locator('[data-product="Tulip Bouquet"]')).toContainText("₺385.00");
  await expect(own.locator('[data-product="Tulip Bouquet"]')).toContainText("₺440.00");

  // One put in a category, one deleted.
  await own.getByLabel("Select Linen Tote").check();
  await bar.locator("summary", { hasText: "Set category" }).click();
  await bar.getByLabel("Set category").selectOption({ label: "Gift boxes" });
  await bar.getByRole("button", { name: "Apply" }).click();
  await expect(own.getByText("Category set: 1.")).toBeVisible();
  await expect(own.locator('[data-product="Linen Tote"]')).toContainText("Gift boxes");
  await own.getByLabel("Select Olive Soap").check();
  await bar.getByRole("button", { name: "Delete" }).click();
  await expect(bar).toContainText("Delete this product?");
  await bar.getByRole("button", { name: "Delete" }).click();
  await expect(own.getByText("Deleted: 1.")).toBeVisible();
  await expect(own.locator('[data-product="Olive Soap"]')).toHaveCount(0);

  // A category's count opens its products.
  await tabs(own).getByRole("link", { name: /^Categories/ }).click();
  await own.locator('[data-category="Gift boxes"]').getByRole("link", { name: "1 product" }).click();
  await expect(own).toHaveURL(/\/dashboard\/catalog\?category=\d+$/);
  await expect.poll(rows).toEqual(["Linen Tote"]);
  // The app lists the categories with products in the order they were put in (Vases has none).
  const listed = (await (await request.get(`${api}/store/categories`)).json()) as { items: { name: string }[] };
  expect(listed.items.map((c) => c.name)).toEqual(["Gift boxes", "Bouquets"]);

  // The grid, remembered.
  await own.goto("/dashboard/catalog");
  await own.getByRole("button", { name: "Grid" }).click();
  await expect(own.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "true");
  await own.reload();
  await expect(own.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "true");
  await expect(own.locator('[data-product="Tulip Bouquet"] img')).toBeVisible();
  await own.getByRole("button", { name: "List" }).click();
});

test("132.10 the long page's old addresses open their own pages", async () => {
  for (const [hash, page] of [
    ["h-payments", "payments"],
    ["h-categories", "categories"],
    ["h-coupons", "coupons"],
    ["h-shop", "settings"],
  ] as const) {
    await own.goto(`/dashboard/catalog#${hash}`);
    await expect(own).toHaveURL(new RegExp(`/dashboard/catalog/${page}$`));
  }
  await expect(own.getByRole("region", { name: "Shop settings" })).toBeVisible();
  // A shop has no pickup-and-delivery page (a restaurant's): its shipping is in Settings.
  await own.goto("/dashboard/catalog/delivery");
  await expect(own).toHaveURL(/\/dashboard\/catalog\/settings$/);
});

test("132.13–132.15 an academy's course categories, the course editor's tabs, the curriculum in order and a lesson's own page", async () => {
  await own.goto("/dashboard/app-type?new=1");
  await own.getByText("Academy", { exact: true }).click();
  await own.getByRole("button", { name: "Add the app" }).click();
  await expect(own).toHaveURL(/\/dashboard\/setup\?step=website$/);
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();

  const courseTabs = own.getByRole("navigation", { name: "Courses", exact: true });
  await own.goto("/dashboard/courses/categories");
  for (const name of ["Languages", "Design"]) {
    await own.getByLabel("New category").fill(name);
    await own.getByRole("button", { name: "Add", exact: true }).click();
    await expect(own.locator(`[data-category="${name}"]`)).toBeVisible();
  }
  await own.getByRole("button", { name: "Move up: Design" }).click();
  await expect(own.getByText("Order saved. The app shows them in this order.")).toBeVisible();
  await own.reload();
  expect(await order(own, "[data-category]", "data-category")).toEqual(["Design", "Languages"]);
  await own.locator('[data-category="Design"]').getByLabel("Category name").fill("UX Design");
  await own.locator('[data-category="Design"]').getByRole("button", { name: "Rename" }).click();
  await expect(own.locator('[data-category="UX Design"]')).toBeVisible();

  await courseTabs.getByRole("link", { name: /^Courses/ }).click();
  const add = own.getByRole("region", { name: "Add a course" });
  await add.getByLabel("Title").fill("Turkish Basics");
  await add.getByLabel("Languages").check();
  await add.getByRole("button", { name: "Add course" }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Turkish Basics" })).toBeVisible();
  const courseUrl = own.url();

  // The tabs: Details first, a tab in the address.
  for (const name of ["Details", "Curriculum", "Pricing and access", "Students", "Certificate", "Settings"]) await expect(own.getByRole("tab", { name: new RegExp(`^${name}`) })).toBeVisible();
  await expect(own.getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true");
  await own.getByLabel("Description").fill("Speak from the first day.");
  // A tab with unsaved changes shows it.
  await expect(own.getByRole("tab", { name: "Details" }).locator("span.bg-ember")).toBeVisible();
  await own.getByRole("tab", { name: "Pricing and access" }).click();
  await expect(own).toHaveURL(/\?tab=pricing$/);
  await own.getByLabel("Price (TRY)").fill("250");
  await own.getByRole("button", { name: "Save course" }).click();
  await expect(own.getByText("Saved “Turkish Basics”.")).toBeVisible();
  await expect(own.locator('[data-save-bar="saved"]')).toBeVisible();
  await own.reload();
  await expect(own.getByRole("tab", { name: "Pricing and access" })).toHaveAttribute("aria-selected", "true");
  await expect(own.getByLabel("Price (TRY)")).toHaveValue("250.00");
  await own.getByRole("tab", { name: "Details" }).click();
  await expect(own.getByLabel("Description")).toHaveValue("Speak from the first day.");

  // The curriculum: two sections, three lessons added in place, dragged into order by the keyboard.
  await own.getByRole("tab", { name: /^Curriculum/ }).click();
  const curriculum = own.getByRole("region", { name: "Sections and lessons" });
  await expect(curriculum.getByText("No sections yet")).toBeVisible();
  for (const section of ["Hello", "Numbers"]) {
    await curriculum.getByLabel("New section").fill(section);
    await curriculum.getByRole("button", { name: "Add section" }).click();
    await expect(curriculum.getByRole("heading", { name: section })).toBeVisible();
  }
  const hello = curriculum.locator("[data-topic]").first();
  for (const [title, video] of [
    ["Greetings", "abc1"],
    ["Goodbyes", "abc2"],
    ["Thanks", "abc3"],
  ] as const) {
    await hello.getByLabel("Lesson title").fill(title);
    await hello.getByLabel("Video address").fill(`https://www.youtube.com/watch?v=${video}`);
    await hello.getByRole("button", { name: "Add lesson" }).click();
    await expect(hello.locator("[data-item]").filter({ hasText: title })).toBeVisible();
  }
  const titles = () => hello.locator("[data-item] a").evaluateAll((els) => els.map((el) => el.querySelector("span.font-semibold")?.textContent));
  expect(await titles()).toEqual(["Greetings", "Goodbyes", "Thanks"]);
  await hello.getByRole("button", { name: "Move: Thanks", exact: true }).focus();
  await own.keyboard.press("ArrowUp");
  await expect.poll(titles).toEqual(["Greetings", "Thanks", "Goodbyes"]);
  await expect(hello.getByRole("button", { name: "Move: Thanks", exact: true })).toBeFocused();
  await own.keyboard.press("ArrowUp");
  await expect.poll(titles).toEqual(["Thanks", "Greetings", "Goodbyes"]);
  // The sections too.
  await curriculum.getByRole("button", { name: "Move up: Numbers" }).click();
  await expect.poll(() => curriculum.locator("[data-topic] h3").allTextContents()).toEqual(["Numbers", "Hello"]);
  await expect(curriculum.getByText("Saving…")).toHaveCount(0);
  await own.reload();
  await expect.poll(() => own.getByRole("region", { name: "Sections and lessons" }).locator("[data-topic] h3").allTextContents()).toEqual(["Numbers", "Hello"]);

  // A lesson on its own page: the ones before and after it, and deleting it goes back to the curriculum.
  await own.getByRole("region", { name: "Sections and lessons" }).getByRole("link", { name: /Greetings/ }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Greetings" })).toBeVisible();
  const steps = own.getByRole("navigation", { name: "The lessons before and after it" });
  await expect(steps).toContainText("Thanks");
  await expect(steps).toContainText("Goodbyes");
  await steps.getByRole("link", { name: /Goodbyes/ }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Goodbyes" })).toBeVisible();
  await own.getByRole("button", { name: "Delete lesson" }).click();
  await expect(own).toHaveURL(new RegExp(`${new URL(courseUrl).pathname}\\?tab=curriculum$`));
  await expect(own.getByRole("region", { name: "Sections and lessons" }).locator("[data-item]")).toHaveCount(2);

  // The old long page's parts: the course categories at their own page.
  await own.goto("/dashboard/courses#h-course-categories");
  await expect(own).toHaveURL(/\/dashboard\/courses\/categories$/);
  await own.goto("/dashboard/courses#h-offline");
  await expect(own).toHaveURL(/\/dashboard\/courses\/settings$/);
});

test("132.10 in Arabic, the tabs and the list speak the dashboard's Arabic", async () => {
  await own.goto("/dashboard/app-type?new=1");
  await own.locator("[data-dashboard-languages]").getByRole("button", { name: "العربية" }).click();
  await expect(own.locator("html")).toHaveAttribute("lang", "ar");
  await own.goto("/dashboard/courses");
  await expect(own.getByRole("navigation", { name: "الدورات", exact: true }).getByRole("link", { name: /^الإعدادات/ })).toBeVisible();
  await own.goto("/dashboard/courses/categories");
  await expect(own.getByText("اسحب الفئة من المقبض علشان تغيّر ترتيبها في التطبيق.")).toBeVisible();
  await own.goto("/dashboard/app-type?new=1");
  await own.locator("[data-dashboard-languages]").getByRole("button", { name: "English" }).click();
  await expect(own.locator("html")).toHaveAttribute("lang", "en");
});
