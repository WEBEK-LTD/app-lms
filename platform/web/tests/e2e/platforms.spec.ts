import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/** A shop on another platform connects it on the Website step (roadmap 8.5). */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Nar Shop", email: `nar-${suffix}@shop.test`, password: "nar-strong-password-1" };
let own: Page;
/** 25 Kept open to save the Salla partner app in admin Settings (one sign-in). */
let admin: Page;

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

  admin = await browser.newPage();
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.adminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
});

test.afterAll(async () => {
  await own.close();
  await admin.close();
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
  await expect(own.getByRole("radio", { name: "Salla", exact: true })).toBeVisible();
  await expect(own.getByRole("radio", { name: "Zid", exact: true })).toBeVisible();
  await expect(own.getByRole("radio", { name: "Teachable", exact: true })).toHaveCount(0);

  await own.getByRole("radio", { name: "Ticimax", exact: true }).check();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByText(/^Enter your shop address/)).toBeVisible();

  // The test server can't reach Ticimax, so the keys can't be confirmed and nothing is saved.
  await own.getByLabel(/^Shop address/).fill("https://www.nar.test/admin");
  await own.getByLabel(/^Web service key/).fill("not-a-real-key");
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByText("Ticimax didn't accept these details.", { exact: false })).toBeVisible();
  await expect(own.getByRole("radio", { name: "Ticimax", exact: true })).toBeChecked();
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
  // The choices stay chosen after a failed save.
  await expect(own.getByRole("radio", { name: "Wix", exact: true })).toBeChecked();
  await expect(own.getByLabel(/^Client ID/)).toHaveValue("0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b");
  await expect(own.getByLabel("API key (optional)")).toHaveValue("");
});

test("25 Salla and Zid connect with OAuth once the team sets each partner app; until then they aren't available", async () => {
  await own.goto("/dashboard/setup?step=website");
  await own.getByText("Another store platform").click();
  for (const name of ["Salla", "Zid"]) {
    await own.getByRole("radio", { name, exact: true }).check();
    await expect(own.getByText("Not available yet", { exact: true })).toBeVisible();
    await expect(own.getByText(`Connecting a ${name} store isn't available yet.`, { exact: false })).toBeVisible();
    await expect(own.getByRole("button", { name: `Connect with ${name}` })).toHaveCount(0);
  }

  // The team saves Yallapp's Salla partner app in admin Settings.
  await admin.goto("/admin/settings");
  const salla = admin.getByRole("region", { name: "Salla partner app" });
  await expect(salla.getByText("Now: not set.", { exact: false })).toBeVisible();
  await expect(salla.getByText(`${new URL(admin.url()).origin}/oauth/salla`).first()).toBeVisible();
  await salla.getByLabel("Client ID").fill("e2e-salla-client");
  await salla.getByLabel("Client Secret").fill("e2e-salla-secret");
  await salla.getByLabel("Webhook Secret (optional)").fill("e2e-salla-webhook");
  await salla.getByRole("button", { name: "Save Salla app" }).click();
  await expect(salla.getByText("Salla partner app saved.", { exact: false })).toBeVisible();
  await expect(admin.getByRole("region", { name: "Zid partner app" }).getByText("Now: not set.", { exact: false })).toBeVisible();

  await own.goto("/dashboard/setup?step=website");
  await own.getByText("Another store platform").click();
  await own.getByRole("radio", { name: "Zid", exact: true }).check();
  await expect(own.getByText("Not available yet", { exact: true })).toBeVisible();
  await own.getByRole("radio", { name: "Salla", exact: true }).check();
  await expect(own.getByText("Not available yet", { exact: true })).toHaveCount(0);
  const connect = own.getByRole("button", { name: "Connect with Salla" });
  await expect(connect).toBeVisible();

  // Saving without connecting says what to do.
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByText("Connect your Salla store first", { exact: false })).toBeVisible();
  await expect(own.getByRole("radio", { name: "Salla", exact: true })).toBeChecked();

  // The button opens Salla's approval page with the partner app, our callback and a signed state.
  await own.route("https://accounts.salla.sa/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<p>Salla approval</p>" }));
  await own.getByRole("button", { name: "Connect with Salla" }).click();
  await own.waitForURL(/^https:\/\/accounts\.salla\.sa\/oauth2\/auth\?/);
  const approval = new URL(own.url());
  expect(approval.searchParams.get("client_id")).toBe("e2e-salla-client");
  expect(approval.searchParams.get("response_type")).toBe("code");
  expect(approval.searchParams.get("redirect_uri")).toBe(`${E2E.baseURL}/oauth/salla`);
  expect(approval.searchParams.get("scope")).toBe("offline_access");
  expect(approval.searchParams.get("state")).toMatch(/^[\w-]+\.[\w-]+$/);

  // Coming back with a state this server didn't sign connects nothing.
  await own.goto("/oauth/salla?code=not-a-code&state=forged.state");
  await expect(own.getByRole("heading", { name: "This link has expired" })).toBeVisible();
  await own.getByRole("link", { name: "Back to the Website step" }).click();
  await expect(own).toHaveURL(/\/dashboard\/setup\?step=website$/);
});
