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
  await expect(page.getByRole("heading", { name: "Hi Proxy", exact: true })).toBeVisible();
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

  // Log out from the avatar menu: signed out, on the welcome.
  await page.goto(`${COMMUNITY}/`);
  await page.getByTestId("cm-avatar-trigger").click();
  await expect(page.getByTestId("cm-avatar-menu")).toBeVisible();
  await page.getByTestId("cm-menu-logout").click();
  await page.waitForURL((url) => url.origin === COMMUNITY && url.pathname === "/welcome");
  await page.goto(`${COMMUNITY}/settings`);
  await page.waitForURL((url) => url.pathname === "/community/sign-in" || url.pathname === "/sign-in");

  expect(problems).toEqual([]);
  const sitemap = await page.goto(`${COMMUNITY}/sitemap.xml`);
  expect(await sitemap!.text()).toContain("/delete-account");
});

/**
 * 231 The owner's report: linked, yet the profile said "Link your Yallapp
 * account". Through the proxy, a member links a Yallapp account that has
 * no app yet: Settings names the account and says it has none, the profile
 * says so too (not "link your account"); once the account makes an app,
 * the profile shows it.
 */
test("through the reverse proxy: link a Yallapp account, and the profile shows its apps", async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400 && r.url().startsWith(COMMUNITY)) problems.push(`${r.status()} ${r.url()}`);
  });
  const suffix = Date.now().toString(36);
  const yallapp = { name: "Defne Aksoy", email: `defne-${suffix}@proxy-link.test`, password: "defne-strong-password-1" };

  // A Yallapp account, signed in in this browser, without an app yet.
  await page.goto(`${E2E.baseURL}/sign-up`);
  await page.getByLabel("Full name").fill(yallapp.name);
  await page.getByLabel("Email").fill(yallapp.email);
  await page.getByLabel("WhatsApp number").fill("+90 544 000 02 38");
  await page.getByLabel("Password", { exact: true }).fill(yallapp.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/start$/);

  // A community member, through the proxy.
  await page.goto(`${COMMUNITY}/community/sign-up?next=%2Fcommunity`);
  await page.getByLabel("Name").fill("Proxy Linker");
  await page.getByLabel("Email").fill(`linker-${suffix}@community.test`);
  await page.getByLabel("Password").fill("linker-strong-password-1");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await page.waitForURL((url) => url.origin === COMMUNITY && url.pathname === "/");

  // Settings → Link account → Yallapp's page (already signed in there) → Link my account.
  await page.goto(`${COMMUNITY}/settings`);
  await page.getByRole("button", { name: "Link account" }).click();
  await page.waitForURL((url) => url.origin === E2E.baseURL && url.pathname === "/link-community");
  await expect(page.getByText(`Signed in to Yallapp as ${yallapp.name} (${yallapp.email}).`)).toBeVisible();
  await page.getByRole("button", { name: "Link my account" }).click();
  await expect(page.getByRole("main").getByRole("status")).toHaveText("Your Yallapp account is linked. You can go back to Yallapp Community.");
  const back = await page.getByRole("link", { name: "Back to Yallapp Community" }).getAttribute("href");
  const handle = decodeURIComponent(new URL(back!).pathname.split("/").pop()!);

  // Settings names the linked account; it has no apps yet, and says so.
  await page.goto(`${COMMUNITY}/settings`);
  await expect(page.getByTestId("cm-linked-account")).toHaveText(`Linked to the Yallapp account ${yallapp.name} (${yallapp.email}).`);
  await expect(page.getByText("No apps were found in this Yallapp account")).toBeVisible();
  await expect(page.getByRole("button", { name: "Unlink" })).toBeVisible();
  const apps = page.locator("section.cm-card").filter({ has: page.getByRole("heading", { name: "Linked apps" }) });
  await page.goto(`${COMMUNITY}/u/${handle}`);
  await expect(apps.getByText("Your linked Yallapp account has no apps yet.")).toBeVisible();
  await expect(apps.getByText("Link your Yallapp account in Settings")).toHaveCount(0);

  // The account makes its first app on Yallapp: the member's profile shows it.
  await page.goto(`${E2E.baseURL}/start`);
  await page.getByRole("link", { name: "Start from an empty app" }).click();
  await expect(page).toHaveURL(/\/dashboard\/app-type$/);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Website" })).toBeVisible();
  await page.goto(`${COMMUNITY}/u/${handle}`);
  await expect(apps.locator(".cm-apps")).toContainText("App");
  await expect(apps.getByText("has no apps yet")).toHaveCount(0);
  await page.goto(`${COMMUNITY}/settings`);
  await expect(page.getByText("1 apps are counted from it for your badges.")).toBeVisible();

  expect(problems).toEqual([]);
});
