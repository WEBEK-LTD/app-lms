import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/**
 * Takes the dashboard screenshots for yallapp.com.tr (tests/screens) with the
 * end-to-end server: `npm run build`, then
 * `npx playwright test --config playwright.screens.config.ts`.
 */
export default defineConfig({
  ...base,
  testDir: "tests/screens",
  testMatch: "*.screens.ts",
  reporter: "list",
});
