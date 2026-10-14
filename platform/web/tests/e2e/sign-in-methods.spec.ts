import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 18 App sign-in: the owner chooses phone, email or both, and can send codes
 * from their own WhatsApp number (WABEK). The hosted API follows the choice.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so the other specs' sign-ups and this one stay under the per-IP limits.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.181" } });

const suffix = Date.now().toString(36);
const client = { name: "Lilac Corner", email: `lilac-${suffix}@shop.test`, password: "lilac-strong-password-1" };

/** The sign-in code in the latest email to this address (captured in YALLAPP_MAIL_DIR). */
async function emailedCode(to: string): Promise<string> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = (await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as { to: string; subject: string; sentAt: string }))).filter(
    (m) => m.to === to,
  );
  mails.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  const subject = mails.at(-1)?.subject ?? "";
  expect(subject).toMatch(/^\d{6} is your .+ code$/);
  return subject.slice(0, 6);
}

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

test("the owner turns on email sign-in and their own WhatsApp number", async ({ page }) => {
  // A new email code waits a minute after the first one.
  test.setTimeout(180_000);
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(client.name);
  await page.getByLabel("Email").fill(client.email);
  await page.getByLabel("WhatsApp number").fill("+90 544 000 00 18");
  await page.getByLabel("Password", { exact: true }).fill(client.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pending$/);

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
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("I don't have a website").click();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();
  await page.goto("/dashboard/setup?step=website");
  const api = (await page.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();

  // Phone until the owner chooses.
  const config = async () => (await (await page.request.get(`${api}/config?platform=android&app_version=1.0.0`)).json()) as { auth: { methods: string[]; email_sign_in?: string } };
  expect((await config()).auth.methods).toEqual(["phone"]);

  await page.getByRole("link", { name: "App sign-in" }).click();
  await expect(page.getByRole("heading", { name: "How people sign in" })).toBeVisible();
  await expect(page.getByLabel("Phone number", { exact: false }).first()).toBeChecked();
  await page.getByText("Phone number or email address").click();
  await page.getByRole("button", { name: "Save sign-in methods" }).click();
  await expect(page.getByRole("status").first()).toContainText("Saved.");
  expect((await config()).auth).toMatchObject({ methods: ["phone", "email"], email_sign_in: "code" });
  // A customer signs up by email with the emailed code, then signs in again.
  const buyer = `buyer-${suffix}@example.com`;
  const device = { id: `e2e-${suffix}`, platform: "android", name: "Pixel", app_version: "1.0.0" };
  const emailCode = await page.request.post(`${api}/auth/email/request`, { data: { email: buyer } });
  expect(emailCode.status()).toBe(200);
  const { request_id: first } = (await emailCode.json()) as { request_id: string };
  const verified = (await (await page.request.post(`${api}/auth/otp/verify`, { data: { request_id: first, code: await emailedCode(buyer), device } })).json()) as {
    signup_token: string;
  };
  const created = await page.request.post(`${api}/auth/register`, { data: { signup_token: verified.signup_token, name: "Buyer", device } });
  expect(created.status()).toBe(201);
  expect(((await created.json()) as { user: { email: string; phone: string | null } }).user).toMatchObject({ email: buyer, phone: null });
  await page.waitForTimeout(61_000);
  const again = (await (await page.request.post(`${api}/auth/email/request`, { data: { email: buyer } })).json()) as { request_id: string };
  const signedIn = await page.request.post(`${api}/auth/otp/verify`, { data: { request_id: again.request_id, code: await emailedCode(buyer), device } });
  expect(signedIn.status()).toBe(200);
  expect(((await signedIn.json()) as { user: { email: string } }).user.email).toBe(buyer);

  // The owner's own WhatsApp number: the key is never shown again.
  await expect(page.getByText("Your app's codes go out from Yallapp's WhatsApp number")).toBeVisible();
  await page.getByRole("button", { name: "Save WhatsApp number" }).click();
  await expect(page.getByText("Paste the API key from your WABEK account.")).toBeVisible();
  await page.getByLabel("WABEK API key").fill("wk-e2e-secret-9876");
  await page.getByLabel("Instance ID").fill("inst-3");
  await page.getByRole("button", { name: "Save WhatsApp number" }).click();
  await expect(page.getByText("Saved. Send a test code to check it.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("API key ending 9876, instance inst-3")).toBeVisible();
  await expect(page.getByLabel("WABEK API key")).toHaveValue("");
  expect(await page.content()).not.toContain("wk-e2e-secret");
  await expect(page.getByRole("button", { name: "Send a test code" })).toBeVisible();
  await page.getByRole("button", { name: "Use Yallapp's number again" }).click();
  await expect(page.getByText("Your app's codes go out from Yallapp's WhatsApp number")).toBeVisible();

  // The rules are still there, and still saved separately.
  await expect(page.getByLabel("Devices per customer")).toHaveValue("2");
});
