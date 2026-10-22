import { expect, test } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 69.12 The signed-in pages and the sign-in forms limit scripts to a nonce
 * fresh for each request (src/proxy.ts): Next.js's scripts carry it, nothing
 * the policy refuses runs, and the website's pages keep their static policy.
 */

const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.191" };

test("the sign-in form and the admin run only scripts with the request's nonce", async ({ browser, request }) => {
  const first = await request.get("/sign-in", { headers: extraHTTPHeaders });
  const policy = first.headers()["content-security-policy"] ?? "";
  const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
  expect(nonce, policy).toBeTruthy();
  expect(policy).toContain("'strict-dynamic'");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).not.toContain("unsafe-inline");
  // Every script of the page has it, but data (JSON-LD) and the theme script (allowed by its hash).
  const html = await first.text();
  const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]!);
  expect(scripts.length).toBeGreaterThan(1);
  for (const attrs of scripts) {
    if (/type="application\/ld\+json"/.test(attrs) || /id="yallapp-theme"/.test(attrs)) continue;
    expect(attrs, attrs).toContain(`nonce="${nonce}"`);
  }
  // A new one each time.
  const second = await request.get("/sign-in", { headers: extraHTTPHeaders });
  expect(/'nonce-([^']+)'/.exec(second.headers()["content-security-policy"] ?? "")?.[1]).not.toBe(nonce);
  // The website stays static, without a nonce.
  const home = await request.get("/", { headers: extraHTTPHeaders });
  expect(home.headers()["content-security-policy"]).not.toContain("nonce-");

  // In the browser: signing in and the admin work, and the policy refuses nothing.
  const page = await browser.newPage({ extraHTTPHeaders });
  await page.addInitScript(() => {
    (window as unknown as { violations: string[] }).violations = [];
    document.addEventListener("securitypolicyviolation", (e) => (window as unknown as { violations: string[] }).violations.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(E2E.isolationAdminEmail);
  await page.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/admin"));
  await page.getByRole("link", { name: /^Watching/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Watching" })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { violations: string[] }).violations)).toEqual([]);
  await page.close();

  // A script put into the page's HTML (as a stored injection would be) doesn't run, and the browser says why.
  const injected = await browser.newPage({ extraHTTPHeaders });
  await injected.addInitScript(() => {
    (window as unknown as { violations: string[] }).violations = [];
    document.addEventListener("securitypolicyviolation", (e) => (window as unknown as { violations: string[] }).violations.push(e.violatedDirective));
  });
  await injected.route("**/sign-in", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace("</body>", "<script>window.injected = 1</script></body>");
    await route.fulfill({ response, body });
  });
  await injected.goto("/sign-in");
  await expect(injected.getByLabel("Email")).toBeVisible();
  expect(await injected.evaluate(() => (window as unknown as { injected?: number }).injected)).toBeUndefined();
  expect(await injected.evaluate(() => (window as unknown as { violations: string[] }).violations)).toContain("script-src-elem");
  await injected.close();
});

