import { expect, test } from "@playwright/test";

/**
 * 115.7 The vendors' web panel: only a marketplace app has one, and the
 * design preview with sample orders stays out of production. The panel's
 * sign-in, board and pages are covered by tests/unit/market-panel.test.ts.
 */

test("an app that isn't a marketplace has no partner panel", async ({ page }) => {
  const res = await page.goto("/partner/app_does_not_exist");
  expect(res?.status()).toBe(404);
});

test("the panel's design preview isn't served in production", async ({ page }) => {
  const res = await page.goto("/partner/preview");
  expect(res?.status()).toBe(404);
});

test("the panel's board and statement endpoints need a panel sign-in", async ({ request }) => {
  expect((await request.get("/api/partner/app_does_not_exist/board")).status()).toBe(401);
  expect((await request.post("/api/partner/app_does_not_exist/board", { data: { action: "desk", paused: true } })).status()).toBe(401);
  expect((await request.get("/api/partner/app_does_not_exist/statement?format=csv")).status()).toBe(404);
});
