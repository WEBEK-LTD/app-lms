import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/** A shop on another platform connects it on the Website step (roadmap 8.5). */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Nar Shop", email: `nar-${suffix}@shop.test`, password: "nar-strong-password-1" };
let own: Page;

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 52");
  await own.getByLabel("Your website (optional)").fill(`https://nar-${suffix}.shop.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  const admin = await browser.newPage();
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.adminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();
});

test.afterAll(async () => {
  await own.close();
});

test("a shop picks its platform and its keys are checked with it", async () => {
  await own.goto("/dashboard/app-type");
  await own.getByText("Store", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();

  await own.getByText("Another store platform").click();
  // Store platforms only: no school or booking platforms here.
  await expect(own.getByRole("radio", { name: "ikas", exact: true })).toBeVisible();
  await expect(own.getByRole("radio", { name: "Ticimax", exact: true })).toBeVisible();
  await expect(own.getByRole("radio", { name: "IdeaSoft", exact: true })).toBeVisible();
  await expect(own.getByRole("radio", { name: "Wix", exact: true })).toBeVisible();
  await expect(own.getByRole("radio", { name: "Teachable", exact: true })).toHaveCount(0);

  await own.getByRole("radio", { name: "Ticimax", exact: true }).check();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByText(/^Enter your shop address/)).toBeVisible();

  // The test server can't reach Ticimax, so the keys can't be confirmed and nothing is saved.
  await own.getByLabel(/^Shop address/).fill("https://www.nar.test/admin");
  await own.getByLabel(/^Web service key/).fill("not-a-real-key");
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByText("Ticimax didn't accept these details.", { exact: false })).toBeVisible();
  await expect(own.getByLabel(/^Shop address/)).toHaveValue("https://www.nar.test/admin");
  await expect(own.getByLabel(/^Web service key/)).toHaveValue("");
});

test("22 a Wix store connects with its client ID, and the API key comes with the site ID", async () => {
  await own.getByRole("radio", { name: "Wix", exact: true }).check();
  await expect(own.getByText(/^In your Wix dashboard, open Settings, then Headless Settings/)).toBeVisible();
  await expect(own.getByLabel("API key (optional)")).toBeVisible();
  await expect(own.getByLabel("Site ID (optional)")).toBeVisible();

  // The key needs the site ID: said on the field, before asking Wix.
  await own.getByLabel(/^Client ID/).fill("0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b");
  await own.getByLabel("API key (optional)").fill("IST.not-a-real-key");
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByText("Enter your site ID too: Wix needs it with the API key.")).toBeVisible();

  // The test server can't reach Wix (or Wix refuses this client ID), so nothing is saved.
  await own.getByLabel("API key (optional)").fill("IST.not-a-real-key");
  await own.getByLabel("Site ID (optional)").fill("https://manage.wix.com/dashboard/11111111-2222-3333-4444-555555555555/home");
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByText(/^Wix didn't accept th/)).toBeVisible();
  await expect(own.getByLabel(/^Client ID/)).toHaveValue("0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b");
  await expect(own.getByLabel("API key (optional)")).toHaveValue("");
});
