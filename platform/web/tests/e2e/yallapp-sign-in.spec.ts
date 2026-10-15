import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakeClientApi, type FakeClientApi } from "./fake-client-api";

/**
 * 34 An app on its own API switches to "Yallapp signs people in": Yallapp
 * signs people in with the owner's rules and gives ES256 tokens; a fake
 * client API checks them with the app's key set, as the developer guide
 * says. Also the test token, replacing the key, refresh and sign-out, the
 * app preview (sign-in to Yallapp, content to the client's API) and
 * switching back.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Cedar Learning", email: `cedar-${suffix}@learn.test`, password: "cedar-strong-password-1" };
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.134" };
// Never resolves: the browser's calls to it are answered by the fake client API.
const clientApiAddress = `https://api.cedar-${suffix}.test/yallapp/v1`;
const DEVICE = { id: "e2e-install-34", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
let own: Page;
let fake: FakeClientApi;
let hosted = "";
let appId = "";

async function fakeGet(path: string, token?: string) {
  const response = await fetch(`http://localhost:${E2E.clientApiPort}/yallapp/v1${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: response.status, body: (await response.json().catch(() => null)) as { who?: Record<string, string | null> } | null };
}

test.beforeAll(async ({ browser }) => {
  fake = await startFakeClientApi(E2E.clientApiPort);
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 34");
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.signInAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();
});

test.afterAll(async () => {
  await own.close();
  await fake.close();
});

test("the owner of an own API app lets Yallapp sign people in", async () => {
  await own.goto("/pending");
  await expect(own).toHaveURL(/\/dashboard\/app-type$/);
  await own.getByText("Academy", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByRole("radio", { name: /My own API/ }).check();
  await own.getByLabel("Your website", { exact: true }).fill(`https://cedar-${suffix}.test`);
  await own.getByLabel("Your API address").fill(clientApiAddress);
  await own.getByRole("button", { name: "Save & continue" }).click();
  // The address can't be reached from here: saved anyway.
  await expect(own.getByText("Saved. Your API didn't pass every check below")).toBeVisible();

  await own.goto("/dashboard/app-sign-in");
  await expect(own.getByRole("heading", { name: "Who signs people in" })).toBeVisible();
  await expect(own.getByRole("radio", { name: /Your API signs people in/ })).toBeChecked();
  await expect(own.getByRole("heading", { name: "How people sign in" })).toHaveCount(0);
  await own.getByRole("radio", { name: /Yallapp signs people in/ }).check();
  await own.getByRole("button", { name: "Save", exact: true }).first().click();
  await expect(own.getByText("Saved. Yallapp signs people in to your app from its next build.")).toBeVisible();

  // The hosted API's choices, and what the developer needs.
  await expect(own.getByRole("heading", { name: "How people sign in" })).toBeVisible();
  await expect(own.getByRole("heading", { name: "Sign-in rules" })).toBeVisible();
  const developer = own.getByRole("region", { name: "For your developer" });
  const jwks = (await developer.locator("code").filter({ hasText: "/.well-known/jwks.json" }).textContent())!.trim();
  hosted = jwks.replace(/\/\.well-known\/jwks\.json$/, "");
  appId = hosted.split("/").pop()!;
  expect(hosted).toBe(`${E2E.baseURL}/api/app/${appId}`);
  await expect(developer.locator("code").filter({ hasText: appId }).first()).toBeVisible();
  fake.trust({ jwksUrl: jwks, issuer: E2E.baseURL, audience: appId });

  // Phone or email, and the store review number for Apple, Google and the preview.
  await own.getByText("Phone number or email address").click();
  await own.getByRole("button", { name: "Save sign-in methods" }).click();
  await expect(own.getByText("Saved. The app shows it the next time it opens")).toBeVisible();
  await own.getByLabel("Review phone number").fill("+90 532 000 00 34");
  await own.getByLabel("Review code").fill("343434");
  await own.getByRole("button", { name: "Save", exact: true }).last().click();
  await expect(own.getByText("Saved. The app uses these rules now")).toBeVisible();
});

test("Yallapp's tokens work on the client's API, and only there", async ({ request }) => {
  // Yallapp's /config for the app: the sign-in part, with where to send it.
  const config = await request.get(`${hosted}/config?platform=android&app_version=1.0.0`, { headers: extraHTTPHeaders });
  expect(config.status()).toBe(200);
  expect(((await config.json()) as { auth: unknown }).auth).toMatchObject({ provider: "yallapp", base_url: hosted, methods: ["phone", "email"], email_sign_in: "code" });

  // The key set: public parts only, cacheable.
  const keys = await request.get(`${hosted}/.well-known/jwks.json`);
  expect(keys.status()).toBe(200);
  expect(keys.headers()["cache-control"]).toBe("public, max-age=300");
  const set = (await keys.json()) as { keys: Record<string, string>[] };
  expect(set.keys).toHaveLength(1);
  expect(set.keys[0]).toMatchObject({ kty: "EC", crv: "P-256", alg: "ES256", use: "sig" });
  expect(set.keys[0]!.d).toBeUndefined();

  // Sign in with the store review number (no code is sent), as the app does.
  const requested = await request.post(`${hosted}/auth/otp/request`, { headers: extraHTTPHeaders, data: { country_code: "+90", phone: "5320000034" } });
  expect(requested.status()).toBe(200);
  const { request_id } = (await requested.json()) as { request_id: string };
  const verified = await request.post(`${hosted}/auth/otp/verify`, { headers: extraHTTPHeaders, data: { request_id, code: "343434", device: DEVICE } });
  const { signup_token } = (await verified.json()) as { signup_token: string };
  const registered = await request.post(`${hosted}/auth/register`, { headers: extraHTTPHeaders, data: { signup_token, name: "Nour Adel", device: DEVICE } });
  expect(registered.status()).toBe(201);
  const session = (await registered.json()) as { access_token: string; refresh_token: string; user: { id: number } };

  // The client's API accepts it and knows who signed in; without it, or changed, 401.
  const signedIn = await fakeGet("/me/courses", session.access_token);
  expect(signedIn.status).toBe(200);
  expect(signedIn.body?.who).toEqual({ sub: String(session.user.id), phone: "+905320000034", email: null, name: "Nour Adel" });
  expect((await fakeGet("/me/courses")).status).toBe(401);
  const [h, p, s] = session.access_token.split(".");
  const changed = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p!, "base64url").toString()), sub: String(session.user.id + 1000) })).toString("base64url");
  expect((await fakeGet("/me/courses", `${h}.${changed}.${s}`)).status).toBe(401);
  // Yallapp's own account endpoint takes the same token.
  expect((await request.get(`${hosted}/me`, { headers: { ...extraHTTPHeaders, authorization: `Bearer ${session.access_token}` } })).status()).toBe(200);

  // A test token from the dashboard: the same review account.
  await own.goto("/dashboard/app-sign-in");
  const developer = own.getByRole("region", { name: "For your developer" });
  await developer.getByRole("button", { name: "Copy a test token" }).click();
  const testToken = await developer.getByLabel("Test token").inputValue();
  expect(testToken).toMatch(/^eyJ/);
  expect((await fakeGet("/me/courses", testToken)).body?.who).toMatchObject({ sub: String(session.user.id), name: "Nour Adel" });

  // A new key: tokens signed before keep working, new ones use the new key.
  await developer.getByRole("button", { name: "Replace the signing key" }).click();
  await expect(own.getByText("Replaced. New tokens are signed with the new key")).toBeVisible();
  expect(((await (await request.get(`${hosted}/.well-known/jwks.json`)).json()) as { keys: unknown[] }).keys).toHaveLength(2);
  expect((await fakeGet("/me/courses", session.access_token)).status).toBe(200);
  const refreshed = await request.post(`${hosted}/auth/refresh`, { headers: extraHTTPHeaders, data: { refresh_token: session.refresh_token } });
  expect(refreshed.status()).toBe(200);
  const next = (await refreshed.json()) as { access_token: string; refresh_token: string };
  expect(JSON.parse(Buffer.from(next.access_token.split(".")[0]!, "base64url").toString()).kid).not.toBe(set.keys[0]!.kid);
  expect((await fakeGet("/me/courses", next.access_token)).status).toBe(200);
  // Refresh tokens work once; signing out ends the device's sign-in.
  expect((await request.post(`${hosted}/auth/refresh`, { headers: extraHTTPHeaders, data: { refresh_token: session.refresh_token } })).status()).toBe(401);
  expect((await request.post(`${hosted}/auth/logout`, { headers: { ...extraHTTPHeaders, authorization: `Bearer ${next.access_token}` } })).status()).toBe(204);
  expect((await request.post(`${hosted}/auth/refresh`, { headers: extraHTTPHeaders, data: { refresh_token: next.refresh_token } })).status()).toBe(401);
  // Content is never Yallapp's for this app.
  expect((await request.get(`${hosted}/home`, { headers: extraHTTPHeaders })).status()).toBe(404);
});

test("the app preview signs in at Yallapp and reads content from the client's API", async () => {
  // The browser can't reach the client's address: the fake client API answers for it.
  await own.context().route(`${new URL(clientApiAddress).origin}/**`, async (route) => {
    const url = route.request().url().replace(new URL(clientApiAddress).origin, `http://localhost:${E2E.clientApiPort}`);
    await route.fulfill({ response: await route.fetch({ url }) });
  });
  const configRead = own.waitForResponse((r) => /\/api\/preview\/[^/]+\/config$/.test(new URL(r.url()).pathname));
  const yallappConfig = own.waitForRequest((r) => new URL(r.url()).pathname === `/api/app/${appId}/config`, { timeout: 45_000 });
  const clientConfig = own.waitForRequest((r) => r.url().startsWith(`${clientApiAddress}/config`), { timeout: 45_000 });
  fake.calls.length = 0;
  await own.goto("/dashboard/preview");
  await expect(own.getByText(/Sign in with your store review number, .+, and its code\./)).toBeVisible();
  const preview = (await (await configRead).json()) as { config: Record<string, unknown>; preview: { content_source: string; api_token: string | null } };
  expect(preview.config).toMatchObject({ api_base_url: clientApiAddress, auth_base_url: hosted });
  expect(preview.preview.content_source).toBe("custom_api");
  expect(preview.preview.api_token).toMatch(/^p1\./);

  // The preview token goes to Yallapp only, never to the client's API.
  expect((await yallappConfig).headers()["x-yallapp-preview"]).toMatch(/^p1\./);
  expect((await clientConfig).headers()["x-yallapp-preview"]).toBeUndefined();
  await expect.poll(() => fake.calls.some((c) => c.path === "/config")).toBe(true);
  expect(fake.calls.filter((c) => c.previewHeader)).toEqual([]);
  expect(fake.calls.filter((c) => c.path.startsWith("/auth/"))).toEqual([]);
  await own.context().unroute(`${new URL(clientApiAddress).origin}/**`);
});

test("back to the client's own sign-in", async ({ request }) => {
  await own.goto("/dashboard/app-sign-in");
  await own.getByRole("radio", { name: /Your API signs people in/ }).check();
  await own.getByRole("button", { name: "Save", exact: true }).first().click();
  await expect(own.getByText("Saved. Your API signs people in to your app again")).toBeVisible();
  await expect(own.getByRole("heading", { name: "What your API offers" })).toBeVisible();
  expect((await request.get(`${hosted}/config?platform=android&app_version=1.0.0`, { headers: extraHTTPHeaders })).status()).toBe(404);
  expect((await request.get(`${hosted}/.well-known/jwks.json`)).status()).toBe(404);
});
