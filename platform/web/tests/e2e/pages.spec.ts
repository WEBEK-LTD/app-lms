import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * Pages, looks and languages (roadmap 10.4, 10.6, 10.8 and 11.9): the team
 * sets the defaults for new apps, a client builds and publishes a page, and
 * the hosted API serves it in English and Arabic.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Nil Academy", email: `nil-academy-${suffix}@school.test`, password: "academy-strong-password-1" };
let admin: Page;
let own: Page;
let api = "";

test.beforeAll(async ({ browser }) => {
  admin = await browser.newPage();
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.pagesAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
});

test.afterAll(async () => {
  // Back to the built-in defaults, for the specs that run after this one.
  await admin.goto("/admin/settings");
  const defaults = admin.getByRole("region", { name: "Defaults for new apps" });
  if (await defaults.getByRole("button", { name: "Use the built-in defaults" }).isVisible()) {
    await defaults.getByRole("button", { name: "Use the built-in defaults" }).click();
    await expect(defaults.getByText("Now: the built-in defaults.")).toBeVisible();
  }
  await admin.close();
  await own?.close();
});

test("the team sets the look and languages new apps start with", async () => {
  await admin.goto("/admin/settings");
  const defaults = admin.getByRole("region", { name: "Defaults for new apps" });
  await defaults.getByLabel("Template").selectOption("minimal");
  await defaults.getByLabel("Corners").selectOption("sharp");
  await defaults.getByLabel("Font").selectOption("Lexend");
  await defaults.getByRole("checkbox", { name: "Arabic" }).check();
  await defaults.getByRole("button", { name: "Save defaults" }).click();
  await expect(defaults.getByText("Defaults saved. New apps start with them.")).toBeVisible();
  await expect(defaults.getByText(`Set here by ${E2E.pagesAdminEmail}`)).toBeVisible();
});

test("a new client's app starts with those defaults", async ({ browser }) => {
  // Its own address: sign-ups are limited per IP, and the other specs sign up from the default one.
  own = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.61" } });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 61");
  await own.getByLabel("Your WordPress website").fill(`https://nil-${suffix}.school.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");

  await own.goto("/dashboard/app-type");
  await own.getByText("Academy", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();

  await own.getByRole("link", { name: "Pages & look" }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Pages & look" })).toBeVisible();
  await expect(own.getByText("Not published yet")).toBeVisible();
  await own.getByRole("tab", { name: "Look" }).click();
  await expect(own.getByRole("radio", { name: "Minimal" })).toBeChecked();
  await expect(own.getByLabel("Corners")).toHaveValue("sharp");
  await expect(own.getByLabel("Font")).toHaveValue("Lexend");
  await own.getByRole("tab", { name: "Languages" }).click();
  await expect(own.getByRole("checkbox", { name: "Arabic" })).toBeChecked();

  // Before the first publish the app gets the default pages.
  const nav = await (await own.request.get(`${api}/pages?platform=android`)).json();
  expect(nav.version).toMatch(/^default\./);
  expect(nav.tabs.map((t: { label: string }) => t.label)).toEqual(["Home", "Courses", "My courses", "Account"]);
});

test("the client builds a page, reorders it and publishes", async () => {
  await own.getByRole("tab", { name: "Pages" }).click();
  const page = own.getByRole("region", { name: /^Page: / });
  const blocks = page.getByRole("list", { name: "Blocks" }).getByRole("listitem");
  const before = await blocks.count();

  await page.getByRole("button", { name: "Add Text block" }).click();
  await page.getByRole("group", { name: `Block ${before + 1} settings` }).getByLabel("Text", { exact: true }).fill("<p>Learn with Nil</p><script>alert(1)</script>");
  await page.getByRole("button", { name: "Add Button block" }).click();
  const button = page.getByRole("group", { name: `Block ${before + 2} settings` });
  await button.getByLabel("Button text").fill("See courses");
  await button.getByLabel("Screen").selectOption("courses");
  await page.getByRole("button", { name: "Add Space block" }).click();
  await expect(blocks).toHaveCount(before + 3);

  // The space moves above the button, then the text moves to the top.
  await page.getByRole("button", { name: `Move block ${before + 3} up` }).click();
  await expect(blocks.nth(before + 1)).toContainText("Space");
  for (let i = before + 1; i > 1; i -= 1) await page.getByRole("button", { name: `Move block ${i} up` }).click();
  await expect(blocks.first()).toContainText("Text: Learn with Nil");

  await expect(own.getByRole("figure", { name: "Phone preview" })).toContainText("See courses");
  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(own.getByText("Published. Your app shows the new pages")).toBeVisible();
  await expect(own.getByText(/Published version 20\d\d-.*\.1,/)).toBeVisible();
});

test("the hosted API serves the published page", async ({ request }) => {
  // The look and languages the app started with, now published.
  const config = await (await request.get(`${api}/config?platform=android&app_version=1.0.0`)).json();
  expect(config.appearance).toMatchObject({ template: "minimal", corners: "sharp", font: "Lexend" });
  expect(config.languages).toEqual({ default: "en", available: ["en", "ar"] });
  const navResponse = await request.get(`${api}/pages?platform=android`);
  expect(navResponse.headers()["vary"]).toContain("Accept-Language");
  const nav = await navResponse.json();
  expect(nav.version).toMatch(/\.1$/);
  expect(navResponse.headers()["etag"]).toBe(`"${nav.version}"`);
  expect((await request.get(`${api}/pages?platform=android`, { headers: { "if-none-match": `"${nav.version}"` } })).status()).toBe(304);
  const home = await (await request.get(`${api}/pages/home?platform=android`)).json();
  const ids = home.blocks.map((b: { type: string }) => b.type);
  expect(ids.slice(0, 1)).toEqual(["text"]);
  expect(home.blocks[0]).toMatchObject({ type: "text", html: "<p>Learn with Nil</p>" });
  const types = home.blocks.map((b: { type: string }) => b.type);
  expect(types.indexOf("spacer")).toBeLessThan(types.indexOf("button"));
  expect(home.blocks.find((b: { type: string }) => b.type === "button")).toMatchObject({ label: "See courses", action: { type: "screen", screen: "courses" } });
});

test("the client writes Arabic texts and the app gets them in Arabic", async ({ request }) => {
  await own.getByLabel("Edit texts in").selectOption("ar");
  const preview = own.getByRole("figure", { name: "Phone preview" });
  await expect(preview.locator('[dir="rtl"]')).toBeVisible();
  const page = own.getByRole("region", { name: /^Page: / });
  await page.getByLabel("Page title (Arabic)").fill("الرئيسية");
  await page.getByRole("button", { name: /^Text: / }).first().click();
  await page.getByRole("group", { name: "Block 1 settings" }).getByLabel("Text (Arabic)").fill("<p>تعلم مع نيل</p>");
  await expect(preview).toContainText("تعلم مع نيل");
  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(own.getByText("Published. Your app shows the new pages")).toBeVisible();

  const arabic = await (await request.get(`${api}/pages/home?platform=android`, { headers: { "accept-language": "ar" } })).json();
  expect(arabic.title).toBe("الرئيسية");
  expect(arabic.blocks[0]).toMatchObject({ html: "<p>تعلم مع نيل</p>" });
  const english = await (await request.get(`${api}/pages/home?platform=android`, { headers: { "accept-language": "en" } })).json();
  expect(english.blocks[0]).toMatchObject({ html: "<p>Learn with Nil</p>" });
  const nav = await (await request.get(`${api}/pages?platform=android`, { headers: { "accept-language": "ar-EG,ar;q=0.9" } })).json();
  expect(nav.version).toMatch(/\.2$/);
  expect(nav.pages[0].title).toBe("الرئيسية");
});
