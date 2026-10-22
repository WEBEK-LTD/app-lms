import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/** The team changes a client's app from the admin, without the client (roadmap 9.3). */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = {
  name: "Poppy Studio",
  email: `poppy-${suffix}@studio.test`,
  password: "poppy-strong-password-1",
};
let page: Page;

test.beforeAll(async ({ browser }) => {
  const signUp = await browser.newPage();
  await signUp.goto("/sign-up");
  await signUp.getByLabel("Full name").fill(client.name);
  await signUp.getByLabel("Email").fill(client.email);
  await signUp.getByLabel("WhatsApp number").fill("+90 544 000 00 09");
  await signUp.getByLabel("Your website (optional)").fill(`https://poppy-${suffix}.studio.test`);
  await signUp.getByLabel("Password", { exact: true }).fill(client.password);
  await signUp.getByRole("checkbox").check();
  await signUp.getByRole("button", { name: "Create account" }).click();
  await expect(signUp).toHaveURL(/\/pending$/);
  await signUp.close();

  // One sign-in for the whole file: sign-ins are rate limited per email.
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

async function openClient() {
  await page.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await page.getByRole("link", { name: `Activate ${client.name}` }).click();
}

test("the team edits a client's details", async () => {
  await openClient();
  // 78.4 The client's errors and timeline: a new client has no errors and has signed up.
  await expect(page.getByRole("heading", { name: "Errors", exact: true })).toBeVisible();
  await expect(page.getByText(/Nothing failed for this client.s apps in the last 90 days/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
  const panel = page.getByRole("complementary");
  await panel.getByText("Edit details").click();
  await panel.getByLabel("WhatsApp number").fill("+90 544 000 00 10");
  await panel.getByRole("button", { name: "Save details" }).click();
  await expect(panel.getByText("Details saved.")).toBeVisible();
  await page.reload();
  await expect(panel).toContainText("+905440000010");
});

test("the team sets up a pending client's app from their dashboard", async () => {
  await openClient();
  await page.getByRole("button", { name: "Manage their app" }).click();
  await expect(page).toHaveURL(/\/dashboard\/app-type$/);
  await expect(page.getByRole("status")).toContainText(`You're managing ${client.name}'s dashboard as Yallapp staff`);

  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("I don't have a website").click();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();

  await page.getByRole("link", { name: "App sign-in" }).click();
  await expect(page.getByLabel("Country code")).toHaveValue("90");
  await expect(page.getByLabel("Devices per customer")).toHaveValue("2");
  await page.getByLabel("City").check();
  await page.getByLabel("Devices per customer").fill("3");
  await page.getByLabel("Review phone number").fill("555 000 00 01");
  await page.getByLabel("Review code").fill("12");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Enter the 6-digit code reviewers type.")).toBeVisible();
  await page.getByLabel("Review code").fill("246810");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved. The app uses these rules now")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Review phone number")).toHaveValue("+905550000001");
  await expect(page.getByLabel("Devices per customer")).toHaveValue("3");
  await expect(page.getByLabel("City")).toBeChecked();

  await page.getByRole("button", { name: "Back to admin" }).click();
  await expect(page).toHaveURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("region", { name: "App", exact: true })).toContainText("No website: products in the dashboard");
  // The admin's own pages no longer show the client's dashboard.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/admin$/);
});

test("the client sees what the team set", async ({ browser }) => {
  const own = await browser.newPage();
  await own.goto("/sign-in");
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("button", { name: "Sign in" }).click();
  // Still pending activation: the app waits for the team, but its setup is kept.
  await expect(own).toHaveURL(/\/pending$/);
  await own.close();
});

test("the team sends the app's users a notification from the client's page", async () => {
  await page.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await page.getByRole("link", { name: client.name, exact: true }).click();
  await expect(page.getByRole("region", { name: "App users (0)" })).toContainText("No app users yet.");
  const notifications = page.getByRole("region", { name: "Notifications" });
  await expect(notifications).toContainText("None sent yet.");
  await notifications.getByLabel("Title").fill("Spring sale");
  await notifications.getByLabel("Message").fill("Everything is 20% off this week.");
  await notifications.getByRole("button", { name: "Send to the app's users" }).click();
  await expect(notifications.getByText("Added to the app users' inboxes.")).toBeVisible();
  await page.reload();
  await expect(notifications).toContainText("Spring sale");
  await expect(page.getByRole("region", { name: "Changes by the team" })).toContainText('Sent "Spring sale" to the app\'s users');
});
