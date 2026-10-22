import { expect, test } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 78.3 Admin › Watching: the scheduled jobs' runs are recorded, the health
 * check answers part by part, and the menu shows how many alerts are open.
 */

test("the jobs' runs and the health check in Admin › Watching", async ({ browser, request }) => {
  const job = { authorization: `Bearer ${E2E.internalJobSecret}` };
  const frequent = await request.post("/api/internal/frequent", { headers: job });
  expect(frequent.ok()).toBe(true);
  expect((await frequent.json()).watch).toEqual({ alerts: expect.any(Number), closed: expect.any(Number) });
  expect((await request.post("/api/internal/webhooks", { headers: job })).ok()).toBe(true);
  // A refused call isn't a run.
  expect((await request.post("/api/internal/webhooks")).status()).toBe(401);

  const page = await browser.newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(E2E.watchingAdminEmail);
  await page.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/admin"));
  await page.getByRole("link", { name: /^Watching/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Watching" })).toBeVisible();

  const health = page.getByRole("table", { name: "Health checks" });
  await expect(health.getByRole("row", { name: /Database/ })).toContainText("Fine");
  await expect(health.getByRole("row", { name: /Frequent job/ })).toContainText("Fine");
  // The e2e server has no GITHUB_DISPATCH_TOKEN: the pipeline says so.
  await expect(health.getByRole("row", { name: /Build pipeline/ })).toContainText("GITHUB_DISPATCH_TOKEN isn't set");

  const runs = page.getByRole("table", { name: "Recent job runs" });
  await expect(runs.getByRole("row", { name: /Frequent job/ }).first()).toContainText("Done");
  await expect(runs.getByRole("row", { name: /API webhooks/ }).first()).toContainText("Done");
  await page.close();
});
