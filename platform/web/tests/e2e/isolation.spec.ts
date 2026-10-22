import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 79.3 The dashboard: a client given another client's app (in an email's
 * link, or in the cookie that picks the current app) still sees only their
 * own. The Owner and hosted APIs are tried route by route in
 * tests/unit/isolation.test.ts.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.190" };
const mine = { name: "Iso Mine", email: `iso-mine-${suffix}@academy.test`, site: `https://iso-mine-${suffix}.academy.test`, password: "iso-mine-strong-password-1" };
const theirs = { name: "Iso Theirs", email: `iso-theirs-${suffix}@academy.test`, site: `https://iso-theirs-${suffix}.academy.test`, password: "iso-theirs-strong-password-1" };
let theirAppId = "";

async function signUp(browser: Browser, who: typeof mine, phone: string): Promise<void> {
  const page = await browser.newPage({ extraHTTPHeaders });
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(who.name);
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("WhatsApp number").fill(phone);
  await page.getByLabel("Your website (optional)").fill(who.site);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pending$/);
  await page.close();
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

test("two clients, each activated", async ({ browser }) => {
  await signUp(browser, mine, "+90 544 000 00 91");
  await signUp(browser, theirs, "+90 544 000 00 92");
  const admin = await browser.newPage({ extraHTTPHeaders });
  await signIn(admin, E2E.isolationAdminEmail, E2E.adminPassword);
  for (const who of [mine, theirs]) {
    await admin.goto("/admin/clients");
    await admin.getByRole("searchbox", { name: "Search clients" }).fill(who.email);
    await admin.getByRole("button", { name: "Search" }).click();
    await admin.getByRole("link", { name: `Activate ${who.name}` }).click();
    const panel = admin.getByRole("complementary");
    await panel.getByLabel("Plan").selectOption("growth");
    await panel.getByLabel("Active until").fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
    await panel.getByRole("button", { name: "Activate & send license" }).click();
    await expect(admin.getByRole("status")).toContainText("Activated");
  }
  await admin.close();

  // Each starts an app (an academy); the other client's is chosen in their dashboard's cookie.
  for (const who of [mine, theirs]) {
    const context = await browser.newContext({ extraHTTPHeaders });
    const page = await context.newPage();
    await signIn(page, who.email, who.password);
    await expect(page).toHaveURL(/\/dashboard\/app-type$/);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL((url) => !url.pathname.endsWith("/app-type"));
    if (who === theirs) theirAppId = (await context.cookies()).find((c) => c.name === "yallapp_app")?.value ?? "";
    await context.close();
  }
  expect(theirAppId).toMatch(/^[0-9a-f-]{36}$/);
});

test("another client's app, in a link or in the cookie, never opens", async ({ browser }) => {
  const context = await browser.newContext({ extraHTTPHeaders });
  const page = await context.newPage();
  await signIn(page, mine.email, mine.password);
  const theirsShown = () => page.getByText(new RegExp(`${theirs.name}|iso-theirs-${suffix}`));

  // An email's link to their app: the dashboard opens on the client's own.
  const opened = await page.goto(`/dashboard/open/${theirAppId}?to=license`);
  expect(opened?.url()).toContain("/dashboard/license");
  expect((await context.cookies()).find((c) => c.name === "yallapp_app")?.value).not.toBe(theirAppId);
  await expect(page.getByRole("main")).toBeVisible();
  await expect(theirsShown()).toHaveCount(0);

  // The cookie set to their app by hand: still the client's own, on every page that reads it.
  await context.addCookies([{ name: "yallapp_app", value: theirAppId, url: page.url() }]);
  for (const path of ["/dashboard", "/dashboard/license", "/dashboard/setup", "/dashboard/builds", "/dashboard/analytics"]) {
    await page.goto(path);
    await expect(page.getByRole("main"), path).toBeVisible();
    await expect(theirsShown(), path).toHaveCount(0);
  }
  // The website step shows the client's own site.
  await page.goto("/dashboard/setup?step=website");
  await expect(page.getByLabel("Your WordPress website")).toHaveValue(mine.site);
  await expect(theirsShown()).toHaveCount(0);
  await context.close();
});
