import { createServer, type Server } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * 81.3 One step to a draft app: a new client gives their website's address
 * and gets an app made from it: an academy with the site's name, colour,
 * font and logo, an academy design, and the site's menu as pages and tabs
 * showing the site's own pages, ready to edit in Pages & look and in the
 * Branding step. The website here is a fake one every scan reads
 * (SITE_SCAN_TEST_URL).
 */
test.describe.configure({ mode: "serial" });
// Its own address, so its sign-up and sign-ins never use up the shared limits of the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.181" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const host = `cedar-${suffix}.academy.test`;
const client = { name: "Cedar Academy", email: `cedar-${suffix}@academy.test`, password: "cedar-strong-password-1" };
let own: Page;
let site: Server;

const HOME = `<!DOCTYPE html>
<html lang="en">
<head>
<title>Cedar Academy – Learn design online</title>
<meta name="generator" content="WordPress 6.8.3" />
<meta name="description" content="Online courses in design and illustration." />
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Poppins:400,600&display=swap" />
<link rel="stylesheet" href="/wp-content/plugins/tutor/assets/css/tutor.min.css" />
<style>:root{--wp--preset--color--primary: #1f7a5c;--wp--preset--color--secondary: #f2a33a;}</style>
</head>
<body class="tutor-lms">
<header><a href="/" class="custom-logo-link"><img src="/wp-content/uploads/cedar-logo.png" class="custom-logo" alt="Cedar Academy" /></a>
<nav class="main-navigation"><a href="/">Home</a><a href="/courses/">Courses</a><a href="/about-us/">About us</a><a href="/contact/">Contact</a><a href="/my-account/">My account</a></nav></header>
<main><h1>Learn design with our online courses</h1><div class="tutor-course-card">Enroll now</div></main>
</body></html>`;

test.beforeAll(async ({ browser }) => {
  const logo = solidPng(240, 80, [31, 122, 92]);
  site = createServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(HOME);
    } else if (req.url === "/wp-content/uploads/cedar-logo.png") {
      res.writeHead(200, { "content-type": "image/png" });
      res.end(logo);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((resolve) => site.listen(E2E.siteScanPort, resolve));

  own = await (await browser.newContext({ extraHTTPHeaders })).newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 01 81");
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  const admin = await (await browser.newContext({ extraHTTPHeaders })).newPage();
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.siteStartAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.context().close();
});

test.afterAll(async () => {
  await own.context().close();
  await new Promise<void>((resolve) => site.close(() => resolve()));
});

test("a new app starts from the website's address", async () => {
  await own.goto("/dashboard/app-type");
  const start = own.getByRole("form", { name: "Start from your website" });
  await expect(start).toBeVisible();
  await expect(own.getByRole("heading", { name: "Or pick the type yourself" })).toBeVisible();

  // An address that isn't one says so, and keeps what was typed.
  await start.getByLabel("Your website's address").fill("not a website");
  await start.getByRole("button", { name: "Make my app" }).click();
  await expect(own.getByRole("form", { name: "Start from your website" }).getByRole("alert")).toContainText("Enter your website's address, like example.com.");
  await expect(own.getByLabel("Your website's address")).toHaveValue("not a website");

  await own.getByLabel("Your website's address").fill(host);
  await own.getByRole("button", { name: "Make my app" }).click();
  await own.waitForURL(/\/dashboard\/pages\?from=site$/);
  await expect(own.getByRole("status").filter({ hasText: "We made this first version from" })).toContainText(host);
});

test("the draft has the site's menu as tabs and pages, in an academy design", async () => {
  await own.getByRole("tab", { name: "Tabs" }).click();
  const labels = await own.getByRole("group", { name: /^Tab \d/ }).getByLabel("Label", { exact: true }).evaluateAll((inputs) => inputs.map((i) => (i as HTMLInputElement).value));
  // Courses is the academy's own screen; About us and Contact show the website's pages.
  expect(labels[0]).toBe("Home");
  expect(labels.at(-1)).toBe("Account");
  expect(labels.filter((l) => l === "Courses")).toHaveLength(1);
  await own.getByRole("tab", { name: "Pages" }).click();
  for (const name of ["About us", "Contact"]) await expect(own.getByRole("button", { name: `Delete ${name}` })).toBeVisible();
  // Each shows the website's page in the app.
  await own.getByRole("button", { name: /^About us \/site-about-us/ }).click();
  await expect(own.getByRole("list", { name: "Blocks" })).toContainText("Web page");
  await expect(own.getByText("Needs a fix")).toHaveCount(0);
});

test("the Branding step has the site's name, colour, font and logo", async () => {
  await own.goto("/dashboard/setup?step=branding");
  await expect(own.getByLabel("App name")).toHaveValue("Cedar Academy");
  await expect(own.getByLabel("Name under the app icon")).toHaveValue("Cedar");
  // 97.1 The site's own font, any free one.
  await expect(own.getByLabel("Font", { exact: true })).toHaveValue("Poppins");
  await expect(own.locator('input[name="primaryColor"]')).toHaveValue("#1f7a5c");
  await expect(own.locator('input[name="logoAssetId"]')).not.toHaveValue("");
  // The academy's design is the one chosen.
  await expect(own.getByRole("group", { name: "Design" }).getByRole("radio", { checked: true })).not.toHaveAccessibleName(/^Keep my pages/);
});

test("the next app is the client's choice again: an app made already keeps its own", async () => {
  await own.goto("/dashboard/app-type");
  await expect(own.getByRole("form", { name: "Start from your website" })).toHaveCount(0);
  await own.goto("/dashboard/app-type?new=1");
  await expect(own.getByRole("form", { name: "Start from your website" })).toBeVisible();
  await expect(own.getByLabel("Your website's address")).toHaveValue("");
});
