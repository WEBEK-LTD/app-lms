import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
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

/** 95.1 Each kind of setting has its own page. */
async function openSettings(which: string) {
  await page.goto(`/admin/settings/${which}`);
}

test("the team sets the sign-in code sender and goes back to the variables", async () => {
  await openSettings("sign-in-codes");
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

  // WABEK: its API key, kept encrypted and never shown again.
  await otp.getByRole("radio", { name: /^WABEK/ }).check();
  await expect(otp.getByLabel("WABEK address")).toHaveValue("https://waabek.com");
  await otp.getByRole("button", { name: "Save" }).click();
  await expect(otp.getByText("Paste the API key from your WABEK account.")).toBeVisible();
  await otp.getByLabel("API key").fill("wabek-test-key-0123456789");
  await otp.getByLabel("Instance ID").fill("bad id!");
  await otp.getByRole("button", { name: "Save" }).click();
  await expect(otp.getByText("Paste the instance ID from WABEK › Instances.")).toBeVisible();
  await otp.getByLabel("API key").fill("wabek-test-key-0123456789");
  await otp.getByLabel("Instance ID").fill("8f14e45f-ceea-467f-a9e1-0b0d4c1c5a2d");
  await otp.getByRole("button", { name: "Save" }).click();
  await expect(otp.getByText("Sign-in codes setting saved.")).toBeVisible();
  await page.reload();
  await expect(otp.getByRole("radio", { name: /^WABEK/ })).toBeChecked();
  await expect(otp.getByLabel("API key")).toHaveValue("");
  await expect(otp.getByLabel("Instance ID")).toHaveValue("8f14e45f-ceea-467f-a9e1-0b0d4c1c5a2d");
  await expect(page.locator("body")).not.toContainText("wabek-test-key-0123456789");

  await otp.getByRole("button", { name: "Use the Netlify variables" }).click();
  await expect(otp).toContainText("Now: Netlify variables (webhook)");
});

test("the team sends itself a test sign-in code and checks it", async () => {
  // The code gateway of the Netlify variables (OTP_SENDER=webhook in playwright.config.ts).
  const codes = new Map<string, string>();
  const gateway: Server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => {
      const expected = `sha256=${createHmac("sha256", E2E.otpWebhookSecret).update(body).digest("base64url")}`;
      if (request.headers["x-yallapp-signature"] !== expected) return response.writeHead(401).end();
      const { phone, code } = JSON.parse(body) as { phone: string; code: string };
      codes.set(phone, code);
      response.writeHead(204).end();
    });
  });
  await new Promise<void>((resolve) => gateway.listen(E2E.otpWebhookPort, resolve));
  try {
    await openSettings("sign-in-codes");
    const otp = page.getByRole("region", { name: "Sign-in codes" });
    await otp.getByRole("textbox", { name: "Your number" }).fill("123");
    await otp.getByRole("button", { name: "Send a test code" }).click();
    await expect(otp.getByText("Enter your number with the country code")).toBeVisible();

    await otp.getByRole("textbox", { name: "Your number" }).fill("+20 100 765 4321");
    await otp.getByRole("button", { name: "Send a test code" }).click();
    await expect(otp.getByText("Test code sent to +201007654321.")).toBeVisible();
    await expect.poll(() => codes.get("+201007654321")).toBeTruthy();
    const code = codes.get("+201007654321")!;

    await otp.getByLabel("The code you got").fill(code === "000000" ? "000001" : "000000");
    await otp.getByRole("button", { name: "Check the code" }).click();
    await expect(otp.getByText("That code isn't right.")).toBeVisible();
    await otp.getByLabel("The code you got").fill(code);
    await otp.getByRole("button", { name: "Check the code" }).click();
    await expect(otp.getByText("The code is right: sign-in codes work.")).toBeVisible();
  } finally {
    await new Promise((resolve) => gateway.close(resolve));
  }
});

test("the team sets the email server and sends a test email", async () => {
  await openSettings("email");
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
  await openSettings("payments");
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
  await page.goto("/admin/plans");
  const pro = page.getByRole("region", { name: "Pro" });
  await pro.getByLabel("A price").check();
  await pro.getByLabel("Price in EGP").fill("4800");
  await pro.getByLabel("Billed").selectOption("12");
  await pro.getByLabel("Tagline", { exact: true }).first().fill("We publish the apps for you, every time");
  // 62 The plan's texts in Arabic: the Arabic pricing page shows them.
  await pro.getByText("In Arabic (optional)").click();
  const arabic = pro.getByRole("group", { name: "Arabic texts" });
  await arabic.getByLabel("Name").fill("برو");
  await arabic.getByLabel("Tagline").fill("ننشر تطبيقاتك في كل مرة");
  await pro.getByRole("button", { name: "Save plan" }).click();
  await expect(pro.getByText("Pro saved.")).toBeVisible();
  await page.goto("/ar/pricing");
  await expect(page.locator('[data-pricing-plans] [data-plan="pro"]')).toContainText("برو");
  await expect(page.getByText("ننشر تطبيقاتك في كل مرة")).toBeVisible();

  // 52 Pounds for a visitor from Egypt; elsewhere too while there's no dollar price.
  await page.goto("/pricing");
  await expect(page.locator('[data-pricing-plans] [data-plan="pro"]')).toContainText(/EGP\s4,800/);
  await expect(page.getByText("We publish the apps for you, every time")).toBeVisible();

  await page.goto("/admin/plans");
  const reset = page.getByRole("region", { name: "Pro" }).getByRole("button", { name: "Back to the default plan" });
  await reset.click();
  // The button goes once the default is back; on a database that takes a moment.
  await expect(reset).toHaveCount(0);
  await page.goto("/pricing");
  await expect(page.locator('[data-pricing-plans] [data-plan="pro"]')).toContainText("On request");
});

test("the team changes the contact details shown everywhere", async () => {
  await openSettings("contact");
  const contact = page.getByRole("region", { name: "Contact details" });
  await expect(contact).toContainText("Now: the defaults.");
  // 72 Two numbers: outside Egypt and in Egypt.
  await expect(contact.getByLabel("WhatsApp number (in Egypt)")).toHaveValue("+20 104 256 0010");
  await contact.getByLabel("WhatsApp number (outside Egypt)").fill("0544");
  await contact.getByRole("button", { name: "Save" }).click();
  await expect(contact.getByText("Enter the number with its country code, like +90")).toBeVisible();
  await contact.getByLabel("WhatsApp number (outside Egypt)").fill("+90 555 111 22 33");
  await contact.getByLabel("WhatsApp number (in Egypt)").fill("+20 100 222 3344");
  await contact.getByLabel("Email").fill("hello@yallapp.test");
  await contact.getByRole("button", { name: "Save" }).click();
  await expect(contact.getByText("Contact details saved.")).toBeVisible();

  for (const path of ["/contact", "/terms"]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: "+90 555 111 22 33" }).first()).toHaveAttribute("href", "https://wa.me/905551112233");
    await expect(page.getByRole("link", { name: "+20 100 222 3344" }).first()).toHaveAttribute("href", "https://wa.me/201002223344");
    await expect(page.getByRole("link", { name: "hello@yallapp.test" }).first()).toBeVisible();
  }
  // The contact page says which number is for whom.
  await page.goto("/contact");
  await expect(page.locator('[data-whatsapp="egypt"]').first()).toContainText("In Egypt");
  await expect(page.locator('[data-whatsapp="international"]').first()).toContainText("Outside Egypt");
  await page.goto("/ar/contact");
  await expect(page.locator('main [data-whatsapp="egypt"]').first()).toContainText("داخل مصر");

  await openSettings("contact");
  await contact.getByRole("button", { name: "Use the defaults" }).click();
  await expect(contact).toContainText("Now: the defaults.");
  await page.goto("/contact");
  await expect(page.getByRole("link", { name: "+90 544 673 19 42" }).first()).toBeVisible();
});

test("each kind of setting has its own page, listed with what's set now (95.1)", async () => {
  await page.goto("/admin/settings");
  const cards = page.locator("[data-settings-card]");
  await expect(cards).toHaveCount(9);
  // 104 Map tiles for delivery apps: none set in the tests.
  await expect(cards.filter({ hasText: "The map delivery apps show live tracking on." })).toContainText("Now: No map: delivery apps show the courier's position without one.");
  await expect(cards.filter({ hasText: "Payments" })).toContainText(/Now: .*(Kashier|iyzico|Fawaterk)/);
  await expect(cards.filter({ hasText: "Email" }).first()).toContainText("Now: Not set: emails are not sent.");
  await expect(cards.filter({ hasText: "Sign-in codes" })).toContainText("Now: Netlify variables (webhook).");
  // One kind per page: Payments has the gateways, not the email server.
  await cards.filter({ hasText: "Payments" }).getByRole("link", { name: "Payments" }).click();
  await expect(page).toHaveURL(/\/admin\/settings\/payments$/);
  await expect(page.getByRole("navigation", { name: "Settings pages" }).getByRole("link", { name: "Payments" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("region", { name: "Yallapp's plan payments" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Yallapp's Kashier account" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Email" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Sign-in codes" })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Settings pages" }).getByRole("link", { name: "Sign-in codes" }).click();
  await expect(page).toHaveURL(/\/admin\/settings\/sign-in-codes$/);
  await expect(page.getByRole("region", { name: "Sign-in codes" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Yallapp's Kashier account" })).toHaveCount(0);
  // The menu still marks Settings.
  await expect(page.getByRole("navigation", { name: "Super admin" }).getByRole("link", { name: "Settings" })).toHaveAttribute("aria-current", "page");
});
