import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 73 Light and dark on Yallapp's own pages (the system setting, then the
 * switch's choice, remembered by the browser and set before the page paints,
 * in English, Arabic and Turkish); the account's country on Your account and
 * the License page; and deleting an app: the owner from Setup with the app's
 * name and their password, gone at once (its license refused), restored by
 * our team from Admin › Deleted apps, deleted again and purged with Delete now.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so the sign-up and sign-in limits per IP don't reach the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.173" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Omar Farouk", email: `omar-${suffix}@academy.test`, password: "omar-strong-password-73" };
let own: Page;
let admin: Page;
let licenseKey = "";

const IVORY = "rgb(244, 239, 230)";
const MIDNIGHT = "rgb(14, 13, 36)";

async function freshPage(browser: Browser, colorScheme: "light" | "dark" = "light"): Promise<Page> {
  return (await browser.newContext({ extraHTTPHeaders, colorScheme })).newPage();
}

const pageColor = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.afterAll(async () => {
  await own?.context().close();
  await admin?.context().close();
});

test("73 the website follows the system setting until the switch is pressed, and remembers it", async ({ browser, request }) => {
  const page = await freshPage(browser, "dark");
  await page.goto("/");
  expect(await pageColor(page)).toBe(MIDNIGHT);
  const toggle = page.getByRole("banner").getByRole("button", { name: "Dark mode" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(await pageColor(page)).toBe(IVORY);
  // Remembered: the next page is light from its first paint (the attribute is set in <head>).
  await page.goto("/pricing");
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe("light");
  expect(await pageColor(page)).toBe(IVORY);
  const html = await (await request.get("/")).text();
  expect(html.indexOf('<script id="yallapp-theme">')).toBeGreaterThan(-1);
  expect(html.indexOf('<script id="yallapp-theme">')).toBeLessThan(html.indexOf("</head>"));
  // The switch in Arabic and Turkish.
  await page.goto("/ar");
  await expect(page.getByRole("banner").getByRole("button", { name: "الوضع الداكن" })).toHaveAttribute("aria-pressed", "false");
  await page.goto("/tr");
  await page.getByRole("banner").getByRole("button", { name: "Koyu mod" }).click();
  expect(await pageColor(page)).toBe(MIDNIGHT);
  // The sign-in pages too.
  await page.goto("/sign-in");
  expect(await pageColor(page)).toBe(MIDNIGHT);
  await expect(page.getByRole("button", { name: "Dark mode" })).toHaveAttribute("aria-pressed", "true");
  await page.context().close();
});

test("73 the client's dashboard is light or dark, and the account's country is theirs to set", async ({ browser }) => {
  own = await freshPage(browser);
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0173");
  await own.getByLabel("Your website (optional)").fill(`https://omar-${suffix}.academy.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  admin = await freshPage(browser);
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.phase73AdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");

  await own.goto("/pending");
  await expect(own).toHaveURL(/\/dashboard\/app-type$/);
  await own.getByText("Store", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await expect(own).toHaveURL(/\/dashboard\/setup/);

  // Light, then dark with the switch in the sidebar; the admin too.
  expect(await pageColor(own)).toBe(IVORY);
  await own.getByRole("button", { name: "Dark mode" }).click();
  expect(await pageColor(own)).toBe(MIDNIGHT);
  await own.goto("/dashboard/account");
  expect(await pageColor(own)).toBe(MIDNIGHT);
  await own.getByRole("button", { name: "Dark mode" }).click();
  expect(await pageColor(own)).toBe(IVORY);
  await admin.goto("/admin/deleted-apps");
  await admin.getByRole("button", { name: "Dark mode" }).click();
  expect(await pageColor(admin)).toBe(MIDNIGHT);
  await admin.getByRole("button", { name: "Dark mode" }).click();

  // The country: Egypt's prices on the License page.
  const country = own.getByRole("region", { name: "Your country" });
  await country.getByLabel("Country").selectOption("EG");
  await country.getByRole("button", { name: "Save country" }).click();
  await expect(country.getByRole("status")).toContainText("Your country was saved.");
  await own.goto("/dashboard/license");
  await expect(own.locator("[data-country]")).toContainText("Prices for Egypt.");
  licenseKey = (await own.getByLabel("License key").textContent())!.trim();
  expect(licenseKey).toMatch(/^YALL-/);
  // In Arabic, on Your account.
  await own.goto("/dashboard/account");
  await own.getByRole("button", { name: "العربية" }).click();
  await expect(own.getByRole("region", { name: "بلدك" }).getByLabel("البلد").locator("option:checked")).toHaveText("مصر");
  await own.getByRole("button", { name: "English" }).click();
});

test("73 the owner deletes the app; our team restores it, then deletes it for good", async ({ request }) => {
  const site = { license_key: licenseKey, site_url: `https://omar-${suffix}.academy.test`, plugin_version: "0.4.7", wp_version: "6.8" };
  expect((await request.post("/api/v1/licenses/activate", { data: site })).status()).toBe(200);

  await own.goto("/dashboard/setup");
  const zone = own.getByRole("region", { name: "Delete this app" });
  await zone.locator("summary").click();
  await expect(zone).toContainText("What stays");
  await zone.getByLabel("Type the app's name, Untitled app, to confirm").fill("Something else");
  await zone.getByLabel("Your password").fill("not-the-password");
  await zone.getByRole("button", { name: "Delete this app" }).click();
  await expect(zone.getByText("Type the app's name exactly as it shows here.")).toBeVisible();
  await zone.getByLabel("Type the app's name, Untitled app, to confirm").fill("untitled app");
  await zone.getByLabel("Your password").fill("not-the-password");
  await zone.getByRole("button", { name: "Delete this app" }).click();
  await expect(zone.getByText("The password is incorrect.")).toBeVisible();
  await zone.getByLabel("Your password").fill(client.password);
  await zone.getByRole("button", { name: "Delete this app" }).click();
  // Its only app: back to choosing one, with what happened.
  await expect(own).toHaveURL(/\/dashboard\/app-type\?deleted=/);
  await expect(own.getByRole("status")).toContainText("Untitled app was deleted. Write to us within 7 days if you want it back.");
  // Gone at once for the plugin.
  const refused = await request.post("/api/v1/licenses/check", { data: site });
  expect(refused.status()).toBe(404);
  expect(await refused.json()).toMatchObject({ code: "license_not_found" });

  await admin.goto("/admin/deleted-apps");
  const card = admin.locator("section[data-deletion]", { hasText: client.email });
  await expect(card).toContainText("Untitled app");
  await expect(card).toContainText("Waiting");
  await card.getByRole("button", { name: "Restore" }).click();
  await expect(admin.getByRole("status")).toContainText("The app is back, as it was");
  expect((await request.post("/api/v1/licenses/check", { data: site })).status()).toBe(200);
  await own.goto("/dashboard");
  await expect(own).toHaveURL(/\/dashboard$/);

  // Deleted again; our team deletes it for good at once.
  await own.goto("/dashboard/setup");
  await own.getByRole("region", { name: "Delete this app" }).locator("summary").click();
  await own.getByLabel("Type the app's name, Untitled app, to confirm").fill("Untitled app");
  await own.getByLabel("Your password").fill(client.password);
  await own.getByRole("button", { name: "Delete this app" }).click();
  await expect(own).toHaveURL(/\/dashboard\/app-type\?deleted=/);
  await admin.goto("/admin/deleted-apps");
  const again = admin.locator("section[data-deletion]", { hasText: client.email });
  await again.getByRole("button", { name: "Delete now" }).click();
  await expect(admin.getByRole("status")).toContainText("Tick the box to confirm");
  await admin.locator("section[data-deletion]", { hasText: client.email }).getByRole("checkbox").check();
  await admin.locator("section[data-deletion]", { hasText: client.email }).getByRole("button", { name: "Delete now" }).click();
  await expect(admin.getByRole("status")).toContainText("The app was deleted for good");
  await admin.goto("/admin/deleted-apps?show=purged");
  await expect(admin.locator("section[data-deletion]", { hasText: client.email }).first()).toContainText("Deleted for good");
  expect((await request.post("/api/v1/licenses/check", { data: site })).status()).toBe(404);
  // The account stays, with no app.
  await own.goto("/dashboard");
  await expect(own).toHaveURL(/\/dashboard\/app-type$/);
});
