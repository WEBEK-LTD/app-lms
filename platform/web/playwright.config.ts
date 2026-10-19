import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a production build (`npm run build` first) in
 * memory mode: no database, files in a temporary folder, emails in the log.
 */
const PORT = Number(process.env.E2E_PORT ?? 3210);
export const E2E = {
  baseURL: `http://localhost:${PORT}`,
  adminEmail: "admin@yallapp.test",
  /** A second super admin, so the specs stay under the sign-in limit per email. */
  settingsAdminEmail: "settings-admin@yallapp.test",
  /** Super admin of tests/e2e/listings-hosted.spec.ts (10.7). */
  listingsAdminEmail: "listings-admin@yallapp.test",
  /** Super admin of tests/e2e/pages.spec.ts (10.4 and 11.9). */
  pagesAdminEmail: "pages-admin@yallapp.test",
  /** The owner in tests/e2e/admin-team.spec.ts (roadmap 11.7). */
  teamAdminEmail: "team-owner@yallapp.test",
  /** The super admin of tests/e2e/admin-content.spec.ts (11.3, 11.4, 11.6, 11.8). */
  contentAdminEmail: "content-admin@yallapp.test",
  /** The super admin of tests/e2e/several-apps.spec.ts (roadmap 12). */
  appsAdminEmail: "apps-admin@yallapp.test",
  /** The super admin of tests/e2e/publishing.spec.ts (roadmap 14). */
  publishingAdminEmail: "publishing-admin@yallapp.test",
  /** The super admin of tests/e2e/plans-limits.spec.ts (roadmap 13). */
  plansAdminEmail: "plans-admin@yallapp.test",
  /** The super admin of tests/e2e/demo-apps.spec.ts (roadmap 16). */
  demosAdminEmail: "demos-admin@yallapp.test",
  /** The super admin of tests/e2e/clinic-hosted.spec.ts (roadmap 21). */
  clinicAdminEmail: "clinic-admin@yallapp.test",
  /** The super admin of tests/e2e/news-hosted.spec.ts (roadmap 23). */
  newsAdminEmail: "news-admin@yallapp.test",
  /** The super admin of tests/e2e/restaurant-hosted.spec.ts (roadmap 26). */
  restaurantAdminEmail: "restaurant-admin@yallapp.test",
  /** The super admin of tests/e2e/fitness-hosted.spec.ts (roadmap 27). */
  fitnessAdminEmail: "fitness-admin@yallapp.test",
  /** The super admin of tests/e2e/events-hosted.spec.ts (roadmap 28). */
  eventsAdminEmail: "events-admin@yallapp.test",
  /** The super admin of tests/e2e/donations-hosted.spec.ts (roadmap 29). */
  charityAdminEmail: "charity-admin@yallapp.test",
  /** Bearer token of the daily job, POST /api/internal/daily (13.4). */
  internalJobSecret: "e2e-internal-job-secret-0123456789abcdef",
  /** Emails the server would send, as JSON files (YALLAPP_MAIL_DIR, memory mode only). */
  mailDir: ".data/e2e-mail",
  adminPassword: "admin-password-for-e2e",
  pipelineToken: "pipeline-token-for-e2e-0123456789",
  filesSigningSecret: "e2e-files-signing-secret-0123456789abcdef",
  /** The hosted API sends sign-in codes here; tests/e2e/hosted-api.spec.ts listens. */
  otpWebhookPort: Number(process.env.E2E_OTP_PORT ?? 3299),
  otpWebhookSecret: "e2e-otp-webhook-secret",
  /** A fake iyzico for the payment page; tests/e2e/catalog.spec.ts runs it. */
  iyzicoPort: Number(process.env.E2E_IYZICO_PORT ?? 3298),
  /** 37 Fake Kashier and Fawaterk APIs; tests/e2e/egypt-payments.spec.ts runs them. */
  kashierPort: Number(process.env.E2E_KASHIER_PORT ?? 3297),
  fawaterkPort: Number(process.env.E2E_FAWATERK_PORT ?? 3296),
  /** The super admin of tests/e2e/egypt-payments.spec.ts (roadmap 37). */
  paymentsAdminEmail: "payments-admin@yallapp.test",
  /** 34 A client's own API that checks Yallapp's tokens; tests/e2e/yallapp-sign-in.spec.ts runs it. */
  clientApiPort: Number(process.env.E2E_CLIENT_API_PORT ?? 3295),
  /** The super admin of tests/e2e/yallapp-sign-in.spec.ts (roadmap 34). */
  signInAdminEmail: "signin-admin@yallapp.test",
  /** The super admin of tests/e2e/translations.spec.ts (roadmap 43). */
  translationsAdminEmail: "translations-admin@yallapp.test",
  /** The super admin of tests/e2e/analytics.spec.ts (roadmap 44). */
  analyticsAdminEmail: "analytics-admin@yallapp.test",
  /** The super admin of tests/e2e/links-crashes.spec.ts (roadmap 46). */
  linksAdminEmail: "links-admin@yallapp.test",
  /** The super admin of tests/e2e/yallapp-prices.spec.ts (roadmap 52). */
  pricesAdminEmail: "prices-admin@yallapp.test",
  /** The super admin of tests/e2e/refunds.spec.ts (roadmap 47). */
  refundsAdminEmail: "refunds-admin@yallapp.test",
  /** 47 A fake WordPress site that every license refresh goes to (LICENSE_REFRESH_TEST_URL); tests/e2e/refunds.spec.ts runs it. */
  wpRefreshPort: Number(process.env.E2E_WP_REFRESH_PORT ?? 3294),
  /** The super admin of tests/e2e/media.spec.ts (roadmap 51). */
  mediaAdminEmail: "media-admin@yallapp.test",
  /** The super admin of tests/e2e/dashboard-bell.spec.ts (roadmap 57). */
  bellAdminEmail: "bell-admin@yallapp.test",
  /** SIGNING_SECRET below: the analytics spec makes the app's analytics key with it, as the build config would. */
  signingSecret: "e2e-signing-secret-0123456789abcdef0123456789",
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  // The client journey is serial and the memory store keeps state, so a retry would start from a used state.
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  use: {
    baseURL: E2E.baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `${E2E.baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      NODE_ENV: "production",
      APP_URL: E2E.baseURL,
      // E2E_DATABASE_URL runs the suite against a MySQL or MariaDB database (migrations applied first).
      ...(process.env.E2E_DATABASE_URL
        ? { YALLAPP_DATA: "mysql", DATABASE_URL: process.env.E2E_DATABASE_URL, DATABASE_SSL: "disabled" }
        : { YALLAPP_DATA: "memory" }),
      YALLAPP_BLOBS: "fs",
      YALLAPP_BLOBS_DIR: ".data/e2e-blobs",
      // 51 The Media library's files, served by the platform's own /media gate.
      YALLAPP_MEDIA: "fs",
      YALLAPP_MEDIA_DIR: ".data/e2e-media",
      YALLAPP_MAIL_DIR: E2E.mailDir,
      SUPER_ADMIN_EMAILS: `${E2E.adminEmail},${E2E.settingsAdminEmail},${E2E.listingsAdminEmail},${E2E.pagesAdminEmail},${E2E.teamAdminEmail},${E2E.contentAdminEmail},${E2E.appsAdminEmail},${E2E.publishingAdminEmail},${E2E.plansAdminEmail},${E2E.demosAdminEmail},${E2E.clinicAdminEmail},${E2E.newsAdminEmail},${E2E.restaurantAdminEmail},${E2E.fitnessAdminEmail},${E2E.eventsAdminEmail},${E2E.charityAdminEmail},${E2E.paymentsAdminEmail},${E2E.signInAdminEmail},${E2E.translationsAdminEmail},${E2E.analyticsAdminEmail},${E2E.linksAdminEmail},${E2E.pricesAdminEmail},${E2E.refundsAdminEmail},${E2E.mediaAdminEmail},${E2E.bellAdminEmail}`,
      YALLAPP_SEED_ADMIN_PASSWORD: E2E.adminPassword,
      SESSION_SECRET: "e2e-session-secret-0123456789abcdef0123456789",
      SIGNING_SECRET: E2E.signingSecret,
      ENCRYPTION_KEY: "1".repeat(64),
      BUILD_PIPELINE_TOKEN: E2E.pipelineToken,
      INTERNAL_JOB_SECRET: E2E.internalJobSecret,
      FILES_SIGNING_SECRET: E2E.filesSigningSecret,
      OTP_SENDER: "webhook",
      OTP_WEBHOOK_URL: `http://localhost:${E2E.otpWebhookPort}/otp`,
      OTP_WEBHOOK_SECRET: E2E.otpWebhookSecret,
      IYZICO_API_URL: `http://localhost:${E2E.iyzicoPort}`,
      KASHIER_API_URL: `http://localhost:${E2E.kashierPort}`,
      FAWATERK_API_URL: `http://localhost:${E2E.fawaterkPort}`,
      LICENSE_REFRESH_TEST_URL: `http://localhost:${E2E.wpRefreshPort}`,
    },
  },
});
