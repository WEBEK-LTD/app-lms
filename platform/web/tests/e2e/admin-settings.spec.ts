import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/** Platform settings the team edits in the admin (roadmap 9.1). */
test.describe.configure({ mode: "serial" });

let page: Page;

// One sign-in for the whole file: sign-ins are rate limited per email.
test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(E2E.settingsAdminEmail);
  await page.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/admin"));
});

test.afterAll(async () => {
  await page.close();
});

async function openSettings() {
  await page.goto("/admin/settings");
}

test("the team sets the sign-in code sender and goes back to the variables", async () => {
  await openSettings();
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
  await expect(otp).toContainText(`Set here by ${E2E.settingsAdminEmail}`);
  await expect(otp.getByLabel("Gateway address")).toHaveValue("https://sms.yallapp.test/otp");
  await expect(otp.getByLabel("Signing secret")).toHaveValue("");
  await expect(page.locator("body")).not.toContainText("gateway-secret-0123456789");

  await otp.getByRole("button", { name: "Use the Netlify variables" }).click();
  await expect(otp).toContainText("Now: Netlify variables (webhook)");
});

test("the team sets the email server and sends a test email", async () => {
  await openSettings();
  const email = page.getByRole("region", { name: "Email" });
  await expect(email).toContainText("Now: Not set: emails are not sent");
  await email.getByRole("button", { name: "Send a test email to me" }).click();
  await expect(email.getByText(`Test email sent to ${E2E.settingsAdminEmail}`)).toBeVisible();

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

test("the team adds Yallapp's iyzico account", async () => {
  await openSettings();
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

test("the team changes a plan's price and the pricing page shows it", async () => {
  await openSettings();
  await page.goto("/admin/plans");
  const pro = page.getByRole("region", { name: "Pro" });
  await pro.getByLabel("Card price").fill("4800");
  await pro.getByLabel("Billed").selectOption("12");
  await pro.getByLabel("Tagline").fill("We publish the apps for you, every time");
  await pro.getByRole("button", { name: "Save plan" }).click();
  await expect(pro.getByText("Pro saved.")).toBeVisible();

  await page.goto("/pricing");
  await expect(page.getByText("₺4,800.00")).toBeVisible();
  await expect(page.getByText("We publish the apps for you, every time")).toBeVisible();

  await page.goto("/admin/plans");
  await page.getByRole("region", { name: "Pro" }).getByRole("button", { name: "Back to the default plan" }).click();
  await page.goto("/pricing");
  await expect(page.getByText("₺4,800.00")).toHaveCount(0);
});

test("the team changes the contact details shown everywhere", async () => {
  await openSettings();
  const contact = page.getByRole("region", { name: "Contact details" });
  await expect(contact).toContainText("Now: the defaults.");
  await contact.getByLabel("WhatsApp number").fill("0544");
  await contact.getByRole("button", { name: "Save" }).click();
  await expect(contact.getByText("Enter the number with its country code")).toBeVisible();
  await contact.getByLabel("WhatsApp number").fill("+90 555 111 22 33");
  await contact.getByLabel("Email").fill("hello@yallapp.test");
  await contact.getByRole("button", { name: "Save" }).click();
  await expect(contact.getByText("Contact details saved.")).toBeVisible();

  for (const path of ["/contact", "/terms"]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: "+90 555 111 22 33" }).first()).toHaveAttribute("href", "https://wa.me/905551112233");
    await expect(page.getByRole("link", { name: "hello@yallapp.test" }).first()).toBeVisible();
  }

  await openSettings();
  await contact.getByRole("button", { name: "Use the defaults" }).click();
  await expect(contact).toContainText("Now: the defaults.");
  await page.goto("/contact");
  await expect(page.getByRole("link", { name: "+90 544 673 19 42" }).first()).toBeVisible();
});
