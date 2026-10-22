import { expect, test, type Page } from "@playwright/test";

/**
 * 78.1 The sign-up's source: the first page's campaign values reach the
 * sign-up form's hidden fields while the visitor moves between our pages,
 * a look at the demo apps says "demo", and nothing is kept in the browser
 * (a reload forgets them).
 */

const field = (page: Page, name: string) => page.locator(`form input[type="hidden"][name="src_${name}"]`);

async function toSignUp(page: Page) {
  await page.locator('a[href="/sign-up"]:visible').first().click();
  await expect(page).toHaveURL(/\/sign-up$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test("the campaign of the first page goes with the sign-up, and only in the page's memory", async ({ page }) => {
  await page.goto("/pricing?utm_source=newsletter&utm_medium=email&utm_campaign=autumn");
  await toSignUp(page);
  await expect(field(page, "utm_source")).toHaveValue("newsletter");
  await expect(field(page, "utm_medium")).toHaveValue("email");
  await expect(field(page, "utm_campaign")).toHaveValue("autumn");
  await expect(field(page, "from")).toHaveValue("");

  // No cookie and nothing stored for it.
  expect((await page.context().cookies()).map((c) => c.name)).not.toContain(expect.stringMatching(/utm|campaign|source/i));
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }))).not.toMatch(/newsletter/);
  await page.reload();
  await expect(field(page, "utm_source")).toHaveValue("");
});

test("a sign-up link with its own campaign, and a look at the demo apps", async ({ page }) => {
  await page.goto("/sign-up?utm_source=partner&from=webinar");
  await expect(field(page, "utm_source")).toHaveValue("partner");
  await expect(field(page, "from")).toHaveValue("webinar");

  await page.goto("/demo");
  await toSignUp(page);
  await expect(field(page, "from")).toHaveValue("demo");
  await expect(field(page, "utm_source")).toHaveValue("");
});
