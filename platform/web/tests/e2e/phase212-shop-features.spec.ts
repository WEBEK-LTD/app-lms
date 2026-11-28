import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 212 A store's wishlist, reviews with photos, back in stock, filters and
 * product languages: a shop without a website gives a product its Arabic
 * name and its brand, the hosted API serves it in Arabic with the new
 * config and filters, the dashboard's Reviews and Waiting & saved are
 * there, and the app preview reads the shop's config with them.
 */
test.describe.configure({ mode: "serial" });
test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.212" } });

const suffix = Date.now().toString(36);
const client = { name: "Noun Studio", email: `noun-${suffix}@shop.test`, password: "noun-strong-password-1" };
let api = "";

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

test("a product in Arabic with its brand, served in the customer's language with the shop's new features", async ({ page, request }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(client.name);
  await page.getByLabel("Email").fill(client.email);
  await page.getByLabel("WhatsApp number").fill("+90 544 000 02 12");
  await page.getByLabel("Password", { exact: true }).fill(client.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/start$/);

  await signIn(page, E2E.settingsAdminEmail, E2E.adminPassword);
  await page.goto("/admin/clients");
  await page.getByRole("searchbox", { name: "Search clients" }).fill(client.email);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: `Activate ${client.name}` }).click();
  const panel = page.getByRole("complementary");
  await panel.getByLabel("Active until").fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(page.getByRole("status")).toContainText("Activated");

  await signIn(page, client.email, client.password);
  await page.goto((await page.locator('[data-classic] a[href^="/dashboard/app-type"]').getAttribute("href"))!); // the app editor's empty start, under "Other app types"
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("I don't have a website").click();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();

  await page.goto("/dashboard/catalog/new");
  await page.getByLabel("Name", { exact: true }).fill("Linen Shirt");
  await page.getByLabel("Description").fill("Light linen.");
  await page.getByLabel("Price (TRY)", { exact: true }).fill("400");
  // 212 Its Arabic name and description, and its brand.
  const langs = page.locator("#p-langs");
  await langs.getByText("Arabic", { exact: true }).click();
  await langs.getByLabel("Title in Arabic").fill("قميص كتان");
  await langs.getByLabel("About it in Arabic").fill("كتان خفيف.");
  await langs.getByLabel("Brand").fill("Noun");
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toContainText("Saved “Linen Shirt”.");

  await page.locator('[data-product="Linen Shirt"]').getByRole("button", { name: /^Linen Shirt/ }).click();
  await page.getByRole("link", { name: "Edit product" }).click();
  const share = (await page.getByRole("link", { name: /\/shop\// }).textContent())!;
  const [, appId] = /\/shop\/([0-9a-f-]{36})\/\d+$/.exec(share)!;
  api = `${E2E.baseURL}/api/app/${appId}`;
  // Saved: the Arabic fold opens with its words.
  await expect(page.locator("#p-langs").getByLabel("Title in Arabic")).toHaveValue("قميص كتان");

  const arabic = await request.get(`${api}/store/products?platform=android`, { headers: { "accept-language": "ar" } });
  expect(arabic.status()).toBe(200);
  expect(((await arabic.json()) as { items: { name: string; rating: number | null }[] }).items.map((p) => p.name)).toContain("قميص كتان");
  const english = await request.get(`${api}/store/products?platform=android`, { headers: { "accept-language": "en" } });
  expect(((await english.json()) as { items: { name: string }[] }).items.map((p) => p.name)).toContain("Linen Shirt");

  const config = await request.get(`${api}/config?platform=android&app_version=1.0.0`);
  expect(((await config.json()) as { store: Record<string, unknown> }).store).toMatchObject({ wishlist: true, back_in_stock: true, reviews: true });
  const filters = await request.get(`${api}/store/filters?platform=android`);
  expect(((await filters.json()) as { brands: { value: string }[] }).brands.map((b) => b.value)).toEqual(["Noun"]);
  const byBrand = await request.get(`${api}/store/products?platform=android&brand=noun`);
  expect(((await byBrand.json()) as { total: number }).total).toBe(1);
  // The wishlist is the signed-in customer's.
  expect((await request.get(`${api}/store/wishlist?platform=android`)).status()).toBe(401);
});

test("the dashboard's Reviews and Waiting & saved, and the preview's config", async ({ page }) => {
  await signIn(page, client.email, client.password);
  await page.goto("/dashboard/selling/reviews");
  await expect(page.getByRole("heading", { name: "Reviews", exact: true })).toBeVisible();
  await expect(page.getByText("No reviews yet. Customers who bought a product can review it in the app.")).toBeVisible();
  await expect(page.getByTestId("product-reviews-average")).toHaveText(/No ratings yet/);
  await page.getByRole("link", { name: "With photos" }).click();
  await expect(page).toHaveURL(/filter=photos/);

  await page.goto("/dashboard/selling/wishes");
  await expect(page.getByRole("heading", { name: "Waiting & saved" })).toBeVisible();
  await expect(page.getByText("Nobody is waiting for a product right now.")).toBeVisible();
  await expect(page.getByText("No customer saved a product yet.")).toBeVisible();

  // The app preview reads the shop's config with the new features.
  const apiRead = page.waitForResponse((r) => /\/api\/app\/[0-9a-f-]{36}\/config$/.test(new URL(r.url()).pathname), { timeout: 45_000 });
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Preview your app" }).first().click();
  const read = await apiRead;
  expect(read.status()).toBe(200);
  expect(((await read.json()) as { store: Record<string, unknown> }).store).toMatchObject({ wishlist: true, back_in_stock: true });
  await expect(page.frameLocator("iframe[data-testid=app-preview]").locator("flutter-view, flt-glass-pane").first()).toBeAttached();
});
