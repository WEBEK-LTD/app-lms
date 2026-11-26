import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 231 "Continue with Yallapp" on the community's website: the button on Log
 * in, Yallapp's sign-in on the way, "Continue" on yallapp.com.tr, and back
 * signed in to a new member linked to the account (who runs nothing);
 * "Cancel" comes back signed out with the reason.
 */
test.describe.configure({ mode: "serial" });
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.233" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const API = `${E2E.baseURL}/api/community/v1`;
const person = { name: "Salma Haddad", email: `salma-${suffix}@yallapp-signin.test`, password: "salma-strong-password-1" };

async function freshPage(browser: Browser): Promise<Page> {
  return (await browser.newContext({ extraHTTPHeaders })).newPage();
}

/** A Yallapp account, signed in in this browser. */
async function signUpToYallapp(page: Page): Promise<void> {
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(person.name);
  await page.getByLabel("Email").fill(person.email);
  await page.getByLabel("WhatsApp number").fill("+90 544 000 02 33");
  await page.getByLabel("Password", { exact: true }).fill(person.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/start$/);
}

test("231 Cancel on Yallapp's page comes back signed out", async ({ browser }) => {
  const page = await freshPage(browser);
  await signUpToYallapp(page);
  await page.goto("/community/sign-in");
  await page.getByRole("link", { name: "Continue with Yallapp" }).click();
  await expect(page).toHaveURL(/\/link-community\?mode=signin&request=/);
  await expect(page.getByRole("heading", { name: "Continue to Yallapp Community" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/community\/sign-in\?error=yallapp_cancelled$/);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Signing in didn't finish");
  await page.context().close();
});

test("231 Continue with Yallapp: approve on yallapp.com.tr and come back signed in, never an admin", async ({ browser, request }) => {
  const page = await freshPage(browser);
  // Signed out of Yallapp: its sign-in first, then back to the approval page.
  await page.goto("/community/sign-in");
  await page.getByRole("link", { name: "Continue with Yallapp" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByLabel("Email").fill(person.email);
  await page.getByLabel("Password", { exact: true }).fill(person.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/link-community\?mode=signin&request=/);
  await expect(page.getByText(`Signed in to Yallapp as ${person.name} (${person.email}).`)).toBeVisible();
  // Its email isn't confirmed yet: the page offers to.
  await expect(page.getByRole("button", { name: "Send me a confirmation email" })).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${E2E.baseURL}/community/?$`));

  // Signed in on the site: Settings opens, and the session is the new member's.
  await page.goto("/community/settings");
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
  const access = (await page.context().cookies()).find((c) => c.name === "yc_access")?.value;
  expect(access).toBeTruthy();
  const me = await request.get(`${API}/me`, { headers: { authorization: `Bearer ${access}` } });
  expect(await me.json()).toMatchObject({ display_name: person.name, email: person.email, email_verified: false, providers: ["yallapp"], community_role: null });
  const link = await request.get(`${API}/me/yallapp-link`, { headers: { authorization: `Bearer ${access}` } });
  expect(await link.json()).toMatchObject({ linked: true, account_name: person.name });
  await page.context().close();
});
