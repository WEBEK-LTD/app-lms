import http from "node:http";
import { expect, test } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 231 Yallapp Community's website as visitors reach it: through our reverse
 * proxy (deploy/apache-proxy-community.conf). The browser asks for
 * http://community.yallapp.com.tr/…; a stand-in for Apache forwards it to
 * the platform with the platform's own Host (ProxyPreserveHost Off),
 * X-Yallapp-Host and the shared secret, and maps redirects back
 * (ProxyPassReverse). A visitor joins with email and lands, signed in, on
 * the community's home, with the host's own addresses (/, not /community).
 */
const COMMUNITY = "http://community.yallapp.com.tr";
const backend = new URL(E2E.baseURL);
let server: http.Server;

test.use({ proxy: { server: `http://127.0.0.1:${E2E.communityProxyPort}` } });

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", COMMUNITY);
    const headers = { ...req.headers };
    delete headers["proxy-connection"];
    // Other hosts (Yallapp itself, here at localhost) are passed on as they are.
    const community = url.host === "community.yallapp.com.tr";
    const upstream = http.request(
      {
        host: community ? backend.hostname : url.hostname,
        port: community ? backend.port : url.port || 80,
        method: req.method,
        path: `${url.pathname}${url.search}`,
        headers: community
          ? {
              ...headers,
              host: backend.host,
              "x-yallapp-host": "community.yallapp.com.tr",
              "x-yallapp-proxy-secret": E2E.proxySecret,
              "x-yallapp-client-ip": "203.0.113.235",
              "x-forwarded-proto": "http",
            }
          : headers,
      },
      (answer) => {
        const out = { ...answer.headers };
        if (community && typeof out.location === "string") out.location = out.location.replace(E2E.baseURL, COMMUNITY);
        res.writeHead(answer.statusCode ?? 502, out);
        answer.pipe(res);
      },
    );
    upstream.on("error", () => res.writeHead(502).end());
    req.pipe(upstream);
  });
  await new Promise<void>((resolve) => server.listen(E2E.communityProxyPort, "127.0.0.1", resolve));
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test("through the reverse proxy: join with email, land signed in on the community's home", async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400 && r.url().startsWith(COMMUNITY)) problems.push(`${r.status()} ${r.url()}`);
  });
  const suffix = Date.now().toString(36);

  // Where the owner was: the sign-up form at its internal address, going back to the home.
  await page.goto(`${COMMUNITY}/community/sign-up?next=%2Fcommunity`);
  await page.getByLabel("Name").fill("Proxy Member");
  await page.getByLabel("Email").fill(`proxy-${suffix}@community.test`);
  await page.getByLabel("Password").fill("proxy-strong-password-1");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  // Sent on by the browser, through the proxy, to the host's own address of the home.
  await page.waitForURL((url) => url.origin === COMMUNITY && url.pathname === "/");
  await expect(page.getByRole("heading", { name: "Hi Proxy 👋" })).toBeVisible();
  await expect(page.getByText("This page couldn’t load")).toHaveCount(0);

  // The public files (logo, icon) are found on the community's host too, and so is its own sitemap.
  // The Community's own manifest and icons, found through the proxy.
  await expect(page.locator("link[rel='manifest']")).toHaveAttribute("href", "/community/site.webmanifest");
  const manifest = await page.evaluate(async () => (await fetch("/community/site.webmanifest")).json());
  expect(manifest.name).toBe("Yallapp Community");

  // Settings → Link account starts the link on Yallapp's own /link-community (signed out there, its sign-in follows).
  const visited: string[] = [];
  page.on("request", (r) => {
    if (r.isNavigationRequest()) visited.push(r.url());
  });
  await page.goto(`${COMMUNITY}/settings`);
  await page.getByRole("button", { name: "Link account" }).click();
  await page.waitForURL((url) => url.origin === E2E.baseURL);
  expect(visited.some((u) => u.startsWith(`${E2E.baseURL}/link-community?state=`))).toBe(true);

  // Log out from the side menu: signed out, on the welcome.
  await page.goto(`${COMMUNITY}/`);
  await page.getByTestId("cm-nav-logout").click();
  await page.waitForURL((url) => url.origin === COMMUNITY && url.pathname === "/welcome");
  await page.goto(`${COMMUNITY}/settings`);
  await page.waitForURL((url) => url.pathname === "/community/sign-in" || url.pathname === "/sign-in");

  expect(problems).toEqual([]);
  const sitemap = await page.goto(`${COMMUNITY}/sitemap.xml`);
  expect(await sitemap!.text()).toContain("/delete-account");
});
