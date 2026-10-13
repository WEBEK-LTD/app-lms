import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a production build (`npm run build` first) in
 * memory mode: no database, files in a temporary folder, emails in the log.
 */
const PORT = Number(process.env.E2E_PORT ?? 3210);
export const E2E = {
  baseURL: `http://localhost:${PORT}`,
  adminEmail: "admin@yallapp.test",
  adminPassword: "admin-password-for-e2e",
  pipelineToken: "pipeline-token-for-e2e-0123456789",
  filesSigningSecret: "e2e-files-signing-secret-0123456789abcdef",
  /** The hosted API sends sign-in codes here; tests/e2e/hosted-api.spec.ts listens. */
  otpWebhookPort: Number(process.env.E2E_OTP_PORT ?? 3299),
  otpWebhookSecret: "e2e-otp-webhook-secret",
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
      YALLAPP_DATA: "memory",
      YALLAPP_BLOBS: "fs",
      YALLAPP_BLOBS_DIR: ".data/e2e-blobs",
      SUPER_ADMIN_EMAILS: E2E.adminEmail,
      YALLAPP_SEED_ADMIN_PASSWORD: E2E.adminPassword,
      SESSION_SECRET: "e2e-session-secret-0123456789abcdef0123456789",
      SIGNING_SECRET: "e2e-signing-secret-0123456789abcdef0123456789",
      ENCRYPTION_KEY: "1".repeat(64),
      BUILD_PIPELINE_TOKEN: E2E.pipelineToken,
      FILES_SIGNING_SECRET: E2E.filesSigningSecret,
      OTP_SENDER: "webhook",
      OTP_WEBHOOK_URL: `http://localhost:${E2E.otpWebhookPort}/otp`,
      OTP_WEBHOOK_SECRET: E2E.otpWebhookSecret,
    },
  },
});
