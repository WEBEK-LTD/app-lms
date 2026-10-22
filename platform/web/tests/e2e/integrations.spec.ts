import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 80.1 Dashboard › Integrations: an academy on a WordPress site whose plugin
 * isn't active yet. The page lists the website (waiting, with Test), the
 * stores (not set up); Test asks the site now, says it didn't work and keeps
 * the result; the page comes in Arabic too.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so its sign-up and sign-ins never use up the shared limits of the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.180" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Maple Academy", email: `maple-${suffix}@academy.test`, site: `https://maple-${suffix}.academy.test`, password: "maple-strong-password-1" };
let own: Page;

const card = (page: Page, key: string) => page.locator(`[data-integration="${key}"]`);

test.beforeAll(async ({ browser }) => {
  own = await (await browser.newContext({ extraHTTPHeaders })).newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 80");
  await own.getByLabel("Your website (optional)").fill(client.site);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  const admin = await (await browser.newContext({ extraHTTPHeaders })).newPage();
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.integrationsAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  const panel = admin.getByRole("complementary");
  await panel.getByLabel("Plan").selectOption("starter");
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.context().close();

  // An academy on the website given at sign-up.
  await own.goto("/dashboard/app-type");
  await own.getByRole("button", { name: "Continue" }).click();
  await own.waitForURL((url) => !url.pathname.endsWith("/app-type"));
});

test.afterAll(async () => {
  await own.context().close();
});

test("the page lists the app's connections with their state", async () => {
  await own.goto("/dashboard");
  await own.getByRole("navigation", { name: "Dashboard" }).getByRole("link", { name: "Integrations" }).click();
  await expect(own).toHaveURL(/\/dashboard\/integrations$/);
  await expect(own.getByRole("heading", { level: 1, name: "Integrations" })).toBeVisible();

  const website = card(own, "website");
  await expect(website).toHaveAttribute("data-state", "waiting");
  await expect(website.getByRole("heading", { name: "Website or platform" })).toBeVisible();
  await expect(website).toContainText(`maple-${suffix}.academy.test`);
  await expect(website).toContainText("the Yallapp plugin isn't active there yet.");
  await expect(website).toContainText("Not tested yet.");
  await expect(website).toContainText("No errors in the last 30 days.");

  await expect(card(own, "google_play")).toHaveAttribute("data-state", "not_set");
  await expect(card(own, "app_store")).toHaveAttribute("data-state", "not_set");
  await expect(card(own, "google_play").getByRole("link", { name: "Set up" })).toHaveAttribute("href", "/dashboard/setup?step=publishing");
  // A WordPress academy: no card payments or hosted sign-in here.
  await expect(card(own, "payments")).toHaveCount(0);
  await expect(card(own, "whatsapp")).toHaveCount(0);
});

test("Test asks the website now and keeps the result", async () => {
  const website = card(own, "website");
  await website.getByRole("button", { name: "Test" }).click();
  await expect(website.getByRole("alert")).toContainText("It didn't work. The details are below.");
  await own.reload();
  await expect(card(own, "website").locator("[data-last-check]")).toHaveAttribute("data-last-check", "failed");
  await expect(card(own, "website")).toContainText(new RegExp(`Didn.t answer as the app expects \\(.*maple-${suffix}\\.academy\\.test`));
  await expect(card(own, "website")).toContainText("Last tested");
});

test("the page comes in Arabic", async () => {
  await own.goto("/dashboard");
  await own.locator("[data-dashboard-languages]").getByRole("button", { name: "العربية" }).click();
  await expect(own.locator("html")).toHaveAttribute("dir", "rtl");
  await own.goto("/dashboard/integrations");
  await expect(own.getByRole("heading", { level: 1, name: "التكاملات" })).toBeVisible();
  await expect(card(own, "website").getByRole("button", { name: "اختبار" })).toBeVisible();
  await own.locator("[data-dashboard-languages]").getByRole("button", { name: "English" }).click();
});
