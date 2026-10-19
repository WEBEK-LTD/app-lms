import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 46 Links that open the app and crash reports: the owner enters the Play
 * signing fingerprint and the Team ID, the platform's link files list the
 * app, "Check links" fetches the WordPress site's files, a link without the
 * app shows the app's page with no price, and crash reports reach the
 * team's Crashes page and the owner's Stability page.
 */
test.describe.configure({ mode: "serial" });
// Its own address: sign-ups are limited per address, and the other specs share the default one.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.246" } });

const suffix = Date.now().toString(36);
const client = {
  name: "Linden Shop",
  email: `linden-${suffix}@shop.test`,
  site: `https://linden-${suffix}.shop.test`,
  password: "linden-strong-password-1",
};
const pkg = `com.linden${suffix}.shop`;
const PLAY = "146de983c5730650d8eeb9952f34fc6416a08342e61dbea88a0496b23fcf44e5";
const PLAY_PAIRS = PLAY.toUpperCase().match(/../g)!.join(":");
let appId = "";

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

test("Links to your app: the fingerprint, the Team ID and Check links", async ({ page, request }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(client.name);
  await page.getByLabel("Email").fill(client.email);
  await page.getByLabel("WhatsApp number").fill("+90 544 000 00 46");
  await page.getByLabel("Your website (optional)").fill(client.site);
  await page.getByLabel("Password", { exact: true }).fill(client.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pending$/);

  await signIn(page, E2E.adminEmail, E2E.adminPassword);
  await page.goto("/admin/clients");
  await page.getByRole("searchbox", { name: "Search clients" }).fill(client.email);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: `Activate ${client.name}` }).click();
  const panel = page.getByRole("complementary");
  await panel.getByLabel("Plan").selectOption("pro");
  await panel.getByLabel("Active until").fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(page.getByRole("status")).toContainText("Activated");

  await signIn(page, client.email, client.password);
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Website" })).toBeVisible();
  await page.goto("/dashboard/setup?step=listing");
  await page.getByLabel("Android package name").fill(pkg);
  await page.getByLabel("iOS bundle ID").fill(pkg);
  await page.getByLabel("Store title").fill("Linden Shop");
  await page.getByLabel("Short description").fill("Shop Linden on your phone.");
  await page.getByLabel("Full description").fill("Linden brings every product to your phone, with checkout and order history.");
  await page.getByLabel("Support email").fill("help@linden.test");
  await page.getByLabel("Privacy policy URL").fill("https://linden.test/privacy");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Publishing" })).toBeVisible();

  await page.goto("/dashboard/publishing");
  await page.getByRole("link", { name: "Links to your app" }).click();
  await expect(page.getByRole("heading", { name: "Links to your app", level: 1 })).toBeVisible();
  // The app's link on Yallapp's domain, and on its WordPress site.
  const yallappLink = (await page.getByText(/\/a\/[0-9a-f-]{36}\/product\/12$/).textContent())!.trim();
  appId = /\/a\/([0-9a-f-]{36})\//.exec(yallappLink)![1]!;
  await expect(page.getByText(`${client.site}/a/product/12`)).toBeVisible();

  const fingerprint = page.getByLabel("App signing key certificate: SHA-256 fingerprint");
  await fingerprint.fill("DA:39:A3:EE:5E:6B:4B:0D:32:55:BF:EF:95:60:18:90:AF:D8:07:09");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("That's the SHA-1 fingerprint. Copy the SHA-256 one, just below it in Play Console.")).toBeVisible();
  await fingerprint.fill(PLAY);
  await page.getByLabel("Apple Team ID").fill("a1b2c3d4e5");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  await page.reload();
  await expect(fingerprint).toHaveValue(PLAY_PAIRS);
  await expect(page.getByLabel("Apple Team ID")).toHaveValue("A1B2C3D4E5");

  // Yallapp's own link files list the app, at the root, as JSON.
  const android = await request.get("/.well-known/assetlinks.json");
  expect(android.status()).toBe(200);
  expect(android.headers()["content-type"]).toContain("application/json");
  const statements = (await android.json()) as { target: { package_name: string; sha256_cert_fingerprints: string[] } }[];
  expect(statements.find((s) => s.target.package_name === pkg)?.target.sha256_cert_fingerprints).toEqual([PLAY_PAIRS]);
  const apple = await request.get("/.well-known/apple-app-site-association");
  expect(apple.headers()["content-type"]).toContain("application/json");
  const details = ((await apple.json()) as { applinks: { details: { appIDs: string[]; components: { "/": string }[] }[] } }).applinks.details;
  expect(details.find((d) => d.appIDs.includes(`A1B2C3D4E5.${pkg}`))?.components).toEqual([{ "/": `/a/${appId}/*` }]);

  // Check links: the facts here, and the site's files (this test site doesn't exist).
  await page.getByRole("button", { name: "Check links" }).click();
  const checks = page.locator("[data-links-check]");
  await expect(checks.locator('[data-check="play_signing"]')).toHaveAttribute("data-ok", "true");
  await expect(checks.locator('[data-check="team_id"]')).toHaveAttribute("data-ok", "true");
  await expect(checks.locator('[data-check="upload_key"]')).toContainText("It's added with your next build.");
  await expect(checks.locator('[data-check="site_android"]')).toContainText("We couldn't find this site.");
  await expect(page.getByText("Some links don't open your app yet.")).toBeVisible();

  // App setup shows the same status.
  await page.goto("/dashboard/setup?step=publishing");
  await expect(page.getByRole("heading", { name: "Links to your app" })).toBeVisible();
  await expect(page.locator('[data-check="site_android"]')).toContainText("We couldn't find this site.");
});

test("a link without the app: the app's page, its store link, no price", async ({ page }) => {
  for (const userAgent of ["Mozilla/5.0 (Linux; Android 14; Pixel 8)", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"]) {
    await page.setExtraHTTPHeaders({ "user-agent": userAgent });
    await page.goto(`/a/${appId}/product/12`);
    await expect(page.getByRole("heading", { name: "A product in Linden Shop" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Get it on Google Play" })).toHaveAttribute("href", `https://play.google.com/store/apps/details?id=${pkg}`);
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/buy|add to cart|checkout|₺|\$|€/i);
  }
  expect((await page.goto(`/a/${appId}/lesson/12`))?.status()).toBe(404);
});

test("crash reports reach the team's Crashes page and the owner's Stability", async ({ page, request }) => {
  const report = (at: string) => ({
    fingerprint: `46${suffix}`.padEnd(32, "0").replace(/[^0-9a-f]/g, "a").slice(0, 32),
    error: "StateError: Bad state: No product for ada@linden.test",
    stack: "#0 ProductScreen.build (package:yallapp/modules/store/screens/product_screen.dart:42:7)",
    app_version: "1.0.0",
    build_number: 1,
    platform: "android",
    os_version: "14",
    device: "phone",
    screen: "/product/12",
    at,
  });
  const url = `/api/app/${appId}/crashes`;
  const first = await request.post(url, { data: { reports: [report(new Date().toISOString())], sessions: 9, crashed_sessions: 1 } });
  expect(first.status()).toBe(204);
  expect((await request.post(url, { data: { reports: [report(new Date().toISOString())], sessions: 1 } })).status()).toBe(204);
  expect((await request.post(url, { data: { reports: [{ fingerprint: "nope" }] } })).status()).toBe(400);

  await signIn(page, client.email, client.password);
  await page.goto("/dashboard/stability");
  await expect(page.locator("[data-crash-free]")).toHaveText("90%");
  await expect(page.locator("[data-top-crashes]")).toContainText("StateError: Bad state: No product for <email>");
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Stability" })).toHaveCount(0);

  await signIn(page, E2E.adminEmail, E2E.adminPassword);
  await page.goto("/admin/crashes");
  const issue = page.locator("[data-crash]").filter({ hasText: "No product for <email>" });
  await expect(issue).toContainText("on /product/:id");
  await expect(issue.locator("[data-count]")).toHaveText("2");
  await expect(issue).not.toContainText("ada@linden.test");
  await issue.getByText("Stack trace").click();
  await expect(issue.locator("pre")).toContainText("package:yallapp/modules/store/screens/product_screen.dart");
  await issue.getByRole("button", { name: /Mark resolved/ }).click();
  await expect(page.locator("[data-crash]").filter({ hasText: "No product for <email>" })).toHaveCount(0);
  await page.getByRole("link", { name: "Resolved", exact: true }).click();
  await expect(page.locator("[data-crash]").filter({ hasText: "No product for <email>" })).toBeVisible();

  // The owner turns crash reports off: taken and dropped.
  await signIn(page, client.email, client.password);
  await page.goto("/dashboard/stability");
  await page.getByLabel(/Send crash reports/).uncheck();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
  expect((await request.post(url, { data: { reports: [report(new Date().toISOString())], sessions: 3 } })).status()).toBe(204);
  await signIn(page, E2E.adminEmail, E2E.adminPassword);
  await page.goto("/admin/crashes?status=all");
  await expect(page.locator("[data-crash]").filter({ hasText: "No product for <email>" }).locator("[data-count]")).toHaveText("2");
});
