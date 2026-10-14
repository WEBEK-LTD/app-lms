import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 17 "Preview your app": the real app (its web build in public/preview-app)
 * runs in a phone frame on the dashboard with a preview link for the current
 * app, reads its config from the platform and talks to the hosted API, also
 * before the app is set up or active.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so the other specs' sign-ups and this one stay under the per-IP limits.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.171" } });

const suffix = Date.now().toString(36);
const client = { name: "Peony Corner", email: `peony-${suffix}@shop.test`, password: "peony-strong-password-1" };

/**
 * The app draws with CanvasKit, which browsers load from Google's servers.
 * Where those can't be reached (a sandbox), a local Flutter SDK's copy
 * stands in; elsewhere the browser loads it as visitors do.
 */
function localCanvasKit(): string | null {
  const roots = [process.env.FLUTTER_ROOT, "/opt/flutter-3.47.5"].filter((r): r is string => Boolean(r));
  for (const root of roots) {
    const dir = path.join(root, "bin/cache/flutter_web_sdk/canvaskit");
    if (existsSync(path.join(dir, "canvaskit.wasm"))) return dir;
  }
  return null;
}

async function serveCanvasKit(page: Page) {
  const dir = localCanvasKit();
  if (!dir) return;
  await page.route("https://www.gstatic.com/flutter-canvaskit/**", async (route) => {
    const [, file] = /flutter-canvaskit\/[0-9a-f]+\/(.+)$/.exec(new URL(route.request().url()).pathname) ?? [];
    const local = file ? path.join(dir, file) : "";
    if (!file || file.includes("..") || !existsSync(local)) return route.fulfill({ status: 404 });
    await route.fulfill({ body: readFileSync(local), contentType: file.endsWith(".wasm") ? "application/wasm" : "text/javascript" });
  });
}

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

test("the app preview runs a shop that isn't set up yet", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(client.name);
  await page.getByLabel("Email").fill(client.email);
  await page.getByLabel("WhatsApp number").fill("+90 544 000 00 17");
  await page.getByLabel("Password", { exact: true }).fill(client.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/pending$/);

  await signIn(page, E2E.settingsAdminEmail, E2E.adminPassword);
  await page.goto("/admin/clients");
  await page.getByRole("searchbox", { name: "Search clients" }).fill(client.email);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: `Activate ${client.name}` }).click();
  const panel = page.getByRole("complementary");
  await panel.getByLabel("Active until").fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(page.getByRole("status")).toContainText("Activated");

  await signIn(page, client.email, client.password);
  await page.getByText("Store", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("I don't have a website").click();
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { name: "Branding" })).toBeVisible();

  // From the setup steps, the preview is one click away.
  await serveCanvasKit(page);
  const configRead = page.waitForResponse((r) => /\/api\/preview\/p1\.[^/]+\/config$/.test(new URL(r.url()).pathname), { timeout: 45_000 });
  const apiRead = page.waitForResponse((r) => /\/api\/app\/[0-9a-f-]{36}\/config$/.test(new URL(r.url()).pathname), { timeout: 45_000 });
  await page.getByRole("link", { name: "Preview your app" }).first().click();
  await expect(page.getByRole("heading", { name: "Preview your app" })).toBeVisible();

  // What's missing, next to the preview.
  const missing = page.getByRole("region", { name: "What's missing" });
  await expect(missing.getByRole("link", { name: "Branding" })).toBeVisible();
  await expect(missing.getByRole("link", { name: "Store listing" })).toBeVisible();

  // The same short-lived link for a phone, as a QR code made here.
  const qr = page.getByRole("img", { name: /QR code that opens the preview/ });
  await expect(qr).toHaveAttribute("data-qr", new RegExp(`^${E2E.baseURL}/preview-app/index\\.html\\?token=p1\\.`));

  // The app itself in the frame: it reads its config, then the hosted API answers its preview (the app isn't set up yet).
  const frame = page.locator("iframe[data-testid=app-preview]");
  await expect(frame).toHaveAttribute("src", /^\/preview-app\/index\.html\?token=p1\./);
  const config = await configRead;
  expect(config.status()).toBe(200);
  const body = (await config.json()) as { config: { app_type: string; app_name: string }; preview: { content_source: string; placeholders: string[] } };
  expect(body.config).toMatchObject({ app_type: "store", app_name: "Your app" });
  expect(body.preview.content_source).toBe("hosted");
  expect(body.preview.placeholders).toContain("app_name");
  const api = await apiRead;
  expect(api.request().headers()["x-yallapp-preview"]).toMatch(/^p1\./);
  expect(api.status()).toBe(200);
  await expect(page.frameLocator("iframe[data-testid=app-preview]").locator("flutter-view, flt-glass-pane").first()).toBeAttached();

  // The look switch reloads the frame in dark.
  await page.getByRole("button", { name: "Dark" }).click();
  await expect(frame).toHaveAttribute("src", /theme=dark/);

  // Hosted apps can preview the Pages & look draft.
  await page.getByRole("link", { name: "Draft from Pages & look" }).click();
  await expect(page.getByRole("link", { name: "Draft from Pages & look" })).toHaveAttribute("aria-current", "page");
});

test("preview links can't be used for anything else", async ({ request }) => {
  const broken = await request.get("/api/preview/p1.not-a-token/config");
  expect(broken.status()).toBe(403);
  expect(((await broken.json()) as { code: string }).code).toBe("invalid_token");
  const page = await request.get("/preview-app/index.html");
  expect(page.status()).toBe(200);
  expect(page.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  expect(page.headers()["content-security-policy"]).toBe("frame-ancestors 'self'");
  // Every other page still refuses to be framed.
  const home = await request.get("/faq");
  expect(home.headers()["x-frame-options"]).toBe("DENY");
});
