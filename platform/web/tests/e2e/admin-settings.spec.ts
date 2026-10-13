import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/** Platform settings the team edits in the admin (roadmap 9.1). */
test.describe.configure({ mode: "serial" });

async function signInAsAdmin(page: Page) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(E2E.adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/admin"));
  await page.goto("/admin/settings");
}

test("the team sets the sign-in code sender and goes back to the variables", async ({ page }) => {
  await signInAsAdmin(page);
  const otp = page.getByRole("region", { name: "Sign-in codes" });
  await expect(otp).toContainText("Now: Netlify variables (webhook)");
  await otp.getByLabel("Our gateway").check();
  await otp.getByLabel("Gateway address").fill("http://insecure.test/otp");
  await otp.getByLabel("Signing secret").fill("short");
  await otp.getByRole("button", { name: "Save" }).click();
  await expect(otp.getByText("Enter the gateway's https address.")).toBeVisible();
  await expect(otp.getByText("Use at least 16 characters.")).toBeVisible();

  await otp.getByLabel("Gateway address").fill("https://sms.yallapp.test/otp");
  await otp.getByLabel("Signing secret").fill("gateway-secret-0123456789");
  await otp.getByRole("button", { name: "Save" }).click();
  await expect(otp.getByText("Sign-in codes setting saved.")).toBeVisible();
  await page.reload();
  await expect(otp).toContainText(`Set here by ${E2E.adminEmail}`);
  await expect(otp.getByLabel("Gateway address")).toHaveValue("https://sms.yallapp.test/otp");
  await expect(otp.getByLabel("Signing secret")).toHaveValue("");
  await expect(page.locator("body")).not.toContainText("gateway-secret-0123456789");

  await otp.getByRole("button", { name: "Use the Netlify variables" }).click();
  await expect(otp).toContainText("Now: Netlify variables (webhook)");
});

test("the team sets the email server and sends a test email", async ({ page }) => {
  await signInAsAdmin(page);
  const email = page.getByRole("region", { name: "Email" });
  await expect(email).toContainText("Now: Not set: emails are not sent");
  await email.getByRole("button", { name: "Send a test email to me" }).click();
  await expect(email.getByText(`Test email sent to ${E2E.adminEmail}`)).toBeVisible();

  await email.getByLabel("Mail server").fill("mail.yallapp.test");
  await email.getByLabel("Port", { exact: true }).fill("587");
  await email.getByLabel("Username").fill("info@yallapp.test");
  await email.getByLabel("Password").fill("mail-password");
  await email.getByRole("button", { name: "Save" }).click();
  await expect(email.getByText("Email setting saved.")).toBeVisible();
  await page.reload();
  await expect(email.getByLabel("Password")).toHaveAttribute("placeholder", /Saved/);
  await email.getByRole("button", { name: "Use the Netlify variables" }).click();
  await expect(email).toContainText("Now: Not set: emails are not sent");
});

test("the team adds Yallapp's iyzico account", async ({ page }) => {
  await signInAsAdmin(page);
  const iyzico = page.getByRole("region", { name: "Yallapp's iyzico account" });
  await expect(iyzico).toContainText("Now: not set.");
  await iyzico.getByLabel("API key").fill("sandbox-yallapp-api");
  await iyzico.getByLabel("Secret key").fill("sandbox-yallapp-secret");
  await iyzico.getByRole("button", { name: "Save keys" }).click();
  // No iyzico runs during this test, so the keys can't be checked.
  await expect(iyzico.getByText("Saved. iyzico couldn't be reached to check the keys.")).toBeVisible();
  await expect(iyzico).toContainText("Sandbox keys saved by");
  await iyzico.getByRole("button", { name: "Remove keys" }).click();
  await expect(iyzico).toContainText("Now: not set.");
});
