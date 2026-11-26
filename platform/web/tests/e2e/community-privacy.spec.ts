import { expect, test } from "@playwright/test";

/**
 * 231 The Community's privacy policy and deleting an account on the
 * website: the policy is linked in the footer and in sign-up; the public
 * /delete-account page explains how; a signed-out visitor is sent to log in
 * and back; a member joins, deletes their account (wrong password first,
 * then the right one with DELETE typed), sees the done page, and can't log
 * in any more.
 */
test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.234" } });

const suffix = Date.now().toString(36);
const member = { name: "Deniz Kaya", email: `deniz-${suffix}@community.test`, password: "deniz-strong-password-1" };

test("the privacy policy, and deleting an account on the website", async ({ page }) => {
  await page.goto("/community/privacy");
  const policy = page.getByTestId("cm-privacy");
  await expect(policy.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeVisible();
  await expect(policy).toContainText("No tracking, analytics or advertising");
  await expect(policy).toContainText("deleted 30 days after the decision");
  await expect(policy.locator("a[href^='mailto:']").first()).toBeVisible();

  await page.goto("/community/delete-account");
  await expect(page.getByTestId("cm-delete-info")).toContainText("Settings and tap Delete account");

  // Signed out, the form sends the visitor to log in, then back.
  await page.goto("/community/settings/delete-account");
  await page.waitForURL((url) => url.pathname === "/community/sign-in" && url.searchParams.get("next") === "/community/settings/delete-account");

  await page.goto("/community/sign-up");
  await expect(page.getByTestId("cm-agree").getByRole("link", { name: "privacy policy" })).toHaveAttribute("href", "/community/privacy");
  await page.getByLabel("Name").fill(member.name);
  await page.getByLabel("Email").fill(member.email);
  await page.getByLabel("Password").fill(member.password);
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/community");
  await expect(page.getByTestId("cm-footer-privacy").first()).toHaveAttribute("href", "/community/privacy");

  await page.goto("/community/settings");
  await page.getByTestId("cm-settings-delete").click();
  await page.waitForURL((url) => url.pathname === "/community/settings/delete-account");
  const form = page.getByTestId("cm-delete-form");
  await expect(form).toContainText("Your profile, name, username and picture");

  await form.getByLabel("Your password").fill("not-my-password-1");
  await form.getByLabel("Type DELETE to confirm").fill("DELETE");
  await form.getByRole("button", { name: "Delete my account" }).click();
  await expect(form.getByRole("alert")).toContainText("That password isn't right.");

  await form.getByLabel("Your password").fill(member.password);
  await form.getByLabel("Type DELETE to confirm").fill("DELETE");
  await form.getByRole("button", { name: "Delete my account" }).click();
  await page.waitForURL((url) => url.pathname === "/community/delete-account" && url.searchParams.get("done") === "1");
  await expect(page.getByTestId("cm-deleted")).toContainText("Your account is deleted");

  // Signed out, and the account is gone: logging in fails.
  await page.goto("/community/sign-in");
  await page.getByLabel("Email").fill(member.email);
  await page.getByLabel("Password").fill(member.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/community\/sign-in/);
});
