import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { E2E } from "../../playwright.config";

/**
 * 110.2 Sample entries: a shop made in Yallapp Studio from the Shop template
 * starts with eight sample products, each with a "Sample" badge, under a
 * banner with "Remove all samples". The first product of its own asks
 * whether to remove them; a sample saved by the owner is theirs; Builds
 * says nothing goes to the stores while samples are left; removing them
 * clears it. Screenshots in English and Arabic go to SAMPLES_SHOTS.
 */
test.describe.configure({ mode: "serial" });

const SHOTS = process.env.SAMPLES_SHOTS ?? "test-results/samples";
const suffix = Date.now().toString(36);
const client = { name: "Lale Flowers", email: `lale-${suffix}@samples.test`, password: "lale-flowers-strong-password-1" };
let own: Page;
let admin: Page;
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.188" };

const banner = (page: Page) => page.locator("[data-samples]");
const guard = (page: Page) => page.locator("[data-samples-guard]");

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
}

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders, viewport: { width: 1280, height: 900 } });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 532 000 0188");
  await own.getByLabel("Your website (optional)").fill(`https://lale-${suffix}.samples.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.samplesAdminEmail);
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

test("a Studio shop from the Shop template starts with sample products, each marked", async () => {
  await own.goto("/studio/new");
  await own.getByRole("radio", { name: "Store", exact: true }).check();
  await own.getByRole("radio", { name: "No website: everything from here" }).click();
  await own.getByLabel("Project name").fill(client.name);
  await own.getByRole("radio", { name: "Shop", exact: true }).click();
  await expect(own.getByRole("radio", { name: "Shop", exact: true })).toHaveAttribute("aria-checked", "true");
  // The project is made with its sample products (their pictures drawn): it may take a few seconds.
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/, { timeout: 30_000 });

  await own.goto("/dashboard/catalog");
  await expect(own).toHaveURL(/\/studio\/project\/catalog$/);
  await expect(banner(own)).toContainText("You have 8 sample entries.");
  await expect(banner(own).getByRole("button", { name: "Remove all samples" })).toBeVisible();
  const list = own.getByRole("link", { name: /Blush Rose Bouquet/ });
  await expect(list).toContainText("Sample");
  await expect(own.getByText("Sample", { exact: true })).toHaveCount(8);
  await shot(own, "en-list-banner");
});

test("the first own product asks whether to remove the samples; no keeps them", async () => {
  await own.goto("/dashboard/catalog/new");
  await own.getByLabel("Name", { exact: true }).fill("Our own bouquet");
  await own.getByLabel("Price (TRY)", { exact: true }).fill("990");
  await own.getByRole("button", { name: "Add product" }).click();
  await expect(own).toHaveURL(/samples=products/);
  await expect(banner(own)).toContainText("Remove the samples now?");
  await expect(banner(own).getByRole("button", { name: "Yes, remove them" })).toBeVisible();
  await shot(own, "en-ask");
  await banner(own).getByRole("link", { name: "No, keep them for now" }).click();
  await expect(banner(own)).toContainText("You have 8 sample entries.");
  await expect(own.getByRole("link", { name: /Our own bouquet/ })).not.toContainText("Sample");
});

test("a sample saved by the owner is theirs: its badge goes", async () => {
  await own.getByRole("link", { name: /Spring Tulip Bunch/ }).click();
  await own.getByLabel("Name", { exact: true }).fill("Our spring tulips");
  await own.getByRole("button", { name: "Save product" }).click();
  await expect(own.getByRole("status")).toContainText("Saved “Our spring tulips”.");
  await expect(own.getByRole("link", { name: /Our spring tulips/ })).not.toContainText("Sample");
  await expect(banner(own)).toContainText("You have 7 sample entries.");
});

test("Builds and Publishing say the app can't go to the stores while samples are left", async () => {
  await own.goto("/dashboard/builds");
  await expect(guard(own)).toContainText("Your app still has sample entries (7). Remove them, or edit them to make them yours, before it goes to the stores.");
  await shot(own, "en-guard");
  await own.goto("/dashboard/publishing");
  await expect(guard(own)).toContainText("Your app still has sample entries (7).");
  await guard(own).getByRole("link", { name: "See the sample entries" }).click();
  await expect(own).toHaveURL(/\/catalog$/);
});

test("in Arabic: the badge, the banner and the stores' guard", async () => {
  // The dashboard's language switcher (Studio's frame has none): on the page for a new regular app.
  await own.goto("/dashboard/app-type?new=1");
  await own.locator("[data-dashboard-languages]").getByRole("button", { name: "العربية" }).click();
  await expect(own.locator("html")).toHaveAttribute("lang", "ar");
  await own.goto("/dashboard/catalog");
  await expect(banner(own)).toContainText("لديك 7 من الإدخالات التجريبية.");
  await expect(banner(own).getByRole("button", { name: "إزالة كل الإدخالات التجريبية" })).toBeVisible();
  await expect(own.getByText("تجريبي", { exact: true })).toHaveCount(7);
  await shot(own, "ar-list-banner");
  await own.goto("/dashboard/builds");
  await expect(guard(own)).toContainText("ما زال في تطبيقك إدخالات تجريبية (7).");
  await shot(own, "ar-guard");
  await own.goto("/dashboard/app-type?new=1");
  await own.locator("[data-dashboard-languages]").getByRole("button", { name: "English" }).click();
  await expect(own.locator("html")).toHaveAttribute("lang", "en");
});

test("Remove all samples removes them, keeps the owner's, and the guard goes", async () => {
  await own.goto("/dashboard/catalog");
  await banner(own).getByRole("button", { name: "Remove all samples" }).click();
  await expect(own.getByRole("status").filter({ hasText: "Removed 7 sample entries and their pictures." })).toBeVisible();
  await expect(own.getByText("You have", { exact: false })).toHaveCount(0);
  await expect(own.getByRole("link", { name: /Our own bouquet/ })).toBeVisible();
  await expect(own.getByRole("link", { name: /Our spring tulips/ })).toBeVisible();
  await expect(own.getByRole("link", { name: /Blush Rose Bouquet/ })).toHaveCount(0);
  await own.goto("/dashboard/builds");
  await expect(guard(own)).toHaveCount(0);
});
