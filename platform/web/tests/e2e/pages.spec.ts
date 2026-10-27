import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * Pages, looks and languages (roadmap 10.4, 10.6, 10.8 and 11.9): the team
 * sets the defaults for new apps, a client builds and publishes a page, and
 * the hosted API serves it in English and Arabic. 97.1 Any free font, served
 * from Yallapp: a fake google/fonts stands in for GitHub (GOOGLE_FONTS_TEST_URL).
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Nil Academy", email: `nil-academy-${suffix}@school.test`, password: "academy-strong-password-1" };
let admin: Page;
let own: Page;
let api = "";
let fonts: Server;
const fontsAsked: string[] = [];
const OUTFIT = readFileSync(path.resolve(__dirname, "../../../../mobile/assets/fonts/outfit/Outfit-Variable.ttf"));

/** Picks a font in a font picker: typed, then chosen from the list. */
async function chooseFont(field: Locator, page: Page, family: string) {
  await field.fill(family);
  await page.getByRole("option", { name: family, exact: true }).click();
  await expect(field).toHaveValue(family);
}

test.beforeAll(async ({ browser }) => {
  fonts = createServer((req, res) => {
    fontsAsked.push(req.url ?? "");
    res.writeHead(200, { "content-type": "application/octet-stream" }).end(OUTFIT);
  });
  await new Promise<void>((resolve) => fonts.listen(E2E.googleFontsPort, resolve));
  admin = await browser.newPage();
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.pagesAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
});

test.afterAll(async () => {
  // Back to the built-in defaults, for the specs that run after this one.
  await admin.goto("/admin/settings/app-defaults");
  const defaults = admin.getByRole("region", { name: "Defaults for new apps" });
  if (await defaults.getByRole("button", { name: "Use the built-in defaults" }).isVisible()) {
    await defaults.getByRole("button", { name: "Use the built-in defaults" }).click();
    await expect(defaults.getByText("Now: the built-in defaults.")).toBeVisible();
  }
  await admin.close();
  await own?.close();
  await new Promise((resolve) => fonts.close(resolve));
});

test("the team sets the look and languages new apps start with", async () => {
  await admin.goto("/admin/settings/app-defaults");
  const defaults = admin.getByRole("region", { name: "Defaults for new apps" });
  await defaults.getByLabel("Template").selectOption("minimal");
  await defaults.getByLabel("Corners").selectOption("sharp");
  // 97.1 Any free font, and the Arabic text's own.
  await chooseFont(defaults.getByLabel("Font", { exact: true }), admin, "Cairo");
  await chooseFont(defaults.getByLabel("Font for Arabic text"), admin, "Tajawal");
  await defaults.getByRole("checkbox", { name: "Arabic", exact: true }).check();
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
  await own.getByLabel("Your website (optional)").fill(`https://nil-${suffix}.school.test`);
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
  await expect(own.getByLabel("Font", { exact: true })).toHaveValue("Cairo");
  await expect(own.getByLabel("Font for Arabic text")).toHaveValue("Tajawal");
  await own.getByRole("tab", { name: "Languages" }).click();
  // 43 Any language, in the owner's order.
  await expect(own.getByRole("list", { name: "Languages in the app" }).getByRole("listitem")).toContainText(["English", "Arabic"]);

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

  // 82.1 The real app is shown first; the quick view draws the draft at once.
  await own.getByRole("button", { name: "Quick view", exact: true }).click();
  await expect(own.getByRole("figure", { name: "Phone preview" })).toContainText("See courses");
  // 19 The draft sits in the shared phone frame, clipped to its rounded screen.
  await expect(own.getByRole("figure", { name: "Phone preview" }).locator("[data-phone-frame] .phone-screen")).toContainText("See courses");
  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(own.getByText("Published. Your app shows the new pages")).toBeVisible();
  await expect(own.getByText(/Published version 20\d\d-.*\.1,/)).toBeVisible();
});

test("the hosted API serves the published page", async ({ request }) => {
  // The look and languages the app started with, now published.
  const config = await (await request.get(`${api}/config?platform=android&app_version=1.0.0`)).json();
  // 97.1 The free fonts with their files on Yallapp; the bundled font closest to Cairo until it's on the phone.
  expect(config.appearance).toMatchObject({
    template: "minimal",
    corners: "sharp",
    font: "DM Sans",
    font_family: "Cairo",
    font_files: [{ url: expect.stringMatching(/\/api\/v1\/fonts\/ofl\/cairo\/Cairo%5Bslnt%2Cwght%5D\.ttf$/), weight: null }],
    arabic_font: "Tajawal",
  });
  expect(config.appearance.arabic_font_files.map((f: { weight: number }) => f.weight)).toEqual([400, 500, 700]);
  // The file is copied once from google/fonts at the catalog's commit, then served from Yallapp.
  const fontUrl = new URL(config.appearance.font_files[0].url).pathname;
  for (let i = 0; i < 2; i++) {
    const file = await request.get(fontUrl);
    expect(file.status()).toBe(200);
    expect(file.headers()["content-type"]).toBe("font/ttf");
    expect(file.headers()["access-control-allow-origin"]).toBe("*");
    expect(file.headers()["cache-control"]).toContain("immutable");
    expect((await file.body()).equals(OUTFIT)).toBe(true);
  }
  // Once in all, the picker's preview included, at the catalog's commit.
  const cairo = fontsAsked.filter((u) => u.endsWith("/ofl/cairo/Cairo%5Bslnt%2Cwght%5D.ttf"));
  expect(cairo).toHaveLength(1);
  expect(cairo[0]).toMatch(/^\/[0-9a-f]{40}\/ofl\/cairo\//);
  expect((await request.get("/api/v1/fonts/ofl/cairo/Other.ttf")).status()).toBe(404);
  const found = await (await request.get("/api/v1/fonts?q=taja&arabic=1")).json();
  expect(found.fonts[0]).toMatchObject({ family: "Tajawal", arabic: true, bundled: false });
  expect(config.languages).toMatchObject({ default: "en", available: ["en", "ar"], list: [{ code: "en", native_name: "English" }, { code: "ar", direction: "rtl", strings: null }] });
  const navResponse = await request.get(`${api}/pages?platform=android`);
  expect(navResponse.headers()["vary"]).toContain("Accept-Language");
  const nav = await navResponse.json();
  // 43 With Yallapp's Arabic for its own tab names in the layout, the version says so.
  expect(nav.version).toMatch(/\.1~t[0-9a-f]{8}$/);
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
  // 43 Yallapp's Arabic for the tab names it wrote, as the app shows them.
  await expect(preview.getByRole("navigation")).toContainText("الحساب");
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
  expect(nav.version).toMatch(/\.2~t[0-9a-f]{8}\.ar$/);
  // 43 Yallapp's Arabic for the tab names it wrote.
  expect(nav.tabs.map((t: { label: string }) => t.label)).toEqual(["الرئيسية", "الدورات", "دوراتي", "الحساب"]);
  expect(nav.pages[0].title).toBe("الرئيسية");
});

test("97.2 the client uploads a font of their own and the app gets it", async ({ request }) => {
  await own.getByLabel("Edit texts in").selectOption("en");
  await own.getByRole("tab", { name: "Look" }).click();
  const mine = own.getByRole("region", { name: "Your own fonts" });
  await mine.getByLabel("Font name").fill("Nil Sans");
  await mine.getByLabel("Font files").setInputFiles({ name: "NilSans-Variable.ttf", mimeType: "font/ttf", buffer: OUTFIT });
  // The licence is confirmed first.
  await mine.getByRole("button", { name: "Upload font" }).click();
  await expect(mine.getByRole("alert")).toHaveText("Confirm that you have a licence to use this font in apps.");
  await mine.getByLabel("Font files").setInputFiles({ name: "NilSans-Variable.ttf", mimeType: "font/ttf", buffer: OUTFIT });
  await mine.getByRole("checkbox", { name: "I have a licence to use this font in apps." }).check();
  await mine.getByRole("button", { name: "Upload font" }).click();
  await expect(mine.getByRole("status")).toHaveText("Font added. Choose it as your app's font above.");
  await expect(mine.getByRole("listitem")).toContainText("Every weight (variable font)");

  // Chosen like any font, marked as the owner's.
  const field = own.getByLabel("Font", { exact: true });
  await field.fill("Nil");
  await own.getByRole("option", { name: "Nil Sans Your font" }).click();
  await expect(field).toHaveValue("Nil Sans");
  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(own.getByText("Published. Your app shows the new pages")).toBeVisible();
  const config = await (await request.get(`${api}/config?platform=android&app_version=1.0.0`)).json();
  expect(config.appearance).toMatchObject({ font: "DM Sans", font_family: "Nil Sans", font_files: [{ url: expect.stringMatching(/\/api\/v1\/assets\/[0-9a-f-]{36}$/), weight: null }] });
  const file = await request.get(new URL(config.appearance.font_files[0].url).pathname);
  expect(file.headers()["content-type"]).toBe("font/ttf");
  expect((await file.body()).equals(OUTFIT)).toBe(true);

  // Deleted: the draft goes back to the bundled font.
  await mine.getByRole("button", { name: "Delete Nil Sans" }).click();
  await expect(mine.getByRole("status")).toHaveText("Font deleted.");
  await expect(field).toHaveValue("DM Sans");
  await own.reload();
  await own.getByRole("tab", { name: "Look" }).click();
  await expect(own.getByLabel("Font", { exact: true })).toHaveValue("DM Sans");
});

test("97.3 the client brings a look from Figma, apart from the standard one", async ({ request }) => {
  await own.getByRole("tab", { name: "Look" }).click();
  // No Figma file yet: the standard look only.
  await expect(own.getByRole("radio", { name: "Standard look" })).toBeChecked();
  await expect(own.getByRole("radio", { name: "Figma look" })).toBeDisabled();
  const tokens = {
    color: { $type: "color", brand: { primary: { $value: "#1F4E5F" }, accent: { $value: "#FF5A1F" } }, neutral: { 100: { $value: "#F4F4F4" } } },
    font: { body: { $type: "fontFamily", $value: "Tajawal" }, display: { $type: "fontFamily", $value: "Harbour Display" } },
    radius: { card: { $type: "dimension", $value: "16px" } },
  };
  const importer = own.getByRole("region", { name: "Import from Figma files" });
  await importer.getByLabel("Design tokens (JSON)").setInputFiles({ name: "harbour-tokens.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(tokens)) });
  const found = importer.getByRole("region", { name: "What we found in harbour-tokens.json" });
  await expect(found.getByLabel("Main color")).toHaveValue("#1F4E5F");
  await expect(found.getByLabel("Second color")).toHaveValue("#FF5A1F");
  await expect(found.getByLabel("Font")).toHaveValue("Tajawal");
  await expect(found.getByLabel("Corners")).toHaveValue("round");
  // A font that isn't a free one is said so.
  await found.getByLabel("Font").selectOption("Harbour Display");
  await expect(importer.getByRole("alert")).toContainText("Harbour Display isn't one of the free fonts.");
  await found.getByLabel("Font").selectOption("Tajawal");
  await expect(importer.getByRole("alert")).toHaveCount(0);
  await importer.getByLabel("Logo", { exact: true }).setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: solidPng(120, 40, [31, 78, 95]) });
  await importer.getByLabel("Pictures", { exact: true }).setInputFiles([{ name: "harbour.png", mimeType: "image/png", buffer: solidPng(320, 180, [255, 90, 31]) }]);
  await expect(importer.getByRole("list", { name: "Logo · Pictures" }).getByRole("listitem")).toHaveCount(2);
  await importer.getByRole("button", { name: "Save as the Figma look" }).click();
  await expect(importer.getByRole("status")).toHaveText("Saved in your draft and shown in the preview. Publish to show it in your app.");
  await expect(own.getByRole("radio", { name: "Figma look" })).toBeChecked();
  // The standard look's font, colors and corners wait, as they were.
  await expect(own.getByText("The Figma look sets the font, colors and corners.")).toBeVisible();
  await expect(own.getByLabel("Corners", { exact: true })).toHaveCount(0);

  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(own.getByText("Published. Your app shows the new pages")).toBeVisible();
  const figma = (await (await request.get(`${api}/config?platform=android&app_version=1.0.0`)).json()).appearance;
  expect(figma).toMatchObject({ primary_color: "#1F4E5F", secondary_color: "#FF5A1F", font_family: "Tajawal", corners: "round", logo_url: expect.stringMatching(/\/api\/v1\/assets\/[0-9a-f-]{36}$/) });
  expect((await request.get(new URL(figma.logo_url).pathname)).headers()["content-type"]).toBe("image/png");

  // Back to the standard look: as it was before the import.
  await own.getByRole("radio", { name: "Standard look" }).check();
  await expect(own.getByLabel("Corners", { exact: true })).toHaveValue("sharp");
  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(own.getByText("Published. Your app shows the new pages")).toBeVisible();
  const standard = (await (await request.get(`${api}/config?platform=android&app_version=1.0.0`)).json()).appearance;
  expect(standard).toMatchObject({ corners: "sharp", font: "DM Sans" });
  expect(standard.primary_color).toBeUndefined();
  expect(standard.logo_url).toBeUndefined();
  // The Figma look is kept, to switch back to.
  await expect(own.getByRole("radio", { name: "Figma look" })).toBeEnabled();
});

test("31 the editor offers only what the app's type has, and flags what a type change left behind", async () => {
  await own.goto("/dashboard/pages");
  await own.getByLabel("Edit texts in").selectOption("en");
  // An Academy app lists courses, and its tabs open only the screens its module has.
  await expect(own.getByRole("button", { name: "Add List block" })).toContainText("Courses");
  await expect(own.getByRole("button", { name: "Add List block" })).not.toContainText("products");
  await own.getByRole("tab", { name: "Tabs" }).click();
  const second = own.getByRole("group", { name: /^Tab 2/ });
  const offered = await second.getByLabel("Screen").locator("option").allTextContents();
  expect(offered).toContain("All courses");
  expect(offered).not.toContain("Cart");
  expect(offered).not.toContain("Appointments");
  await expect(own.getByText("Needs a fix")).toHaveCount(0);

  // The owner makes it a Store app: the "My courses" tab now opens nothing, so it says so.
  await own.goto("/dashboard/app-type");
  await own.getByText("Store", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.waitForURL(/step=website/);
  await own.goto("/dashboard/pages");
  await expect(own.getByRole("button", { name: "Add List block" })).toContainText("Products");
  await expect(own.getByRole("button", { name: "Add List block" })).not.toContainText("Courses");
  await own.getByRole("tab", { name: "Tabs" }).click();
  const third = own.getByRole("group", { name: /^Tab 3/ });
  await expect(third).toContainText("Needs a fix");
  await expect(third.getByRole("alert")).toContainText('This app has no "My courses" screen. Choose another screen.');
  const now = await third.getByLabel("Screen").locator("option").allTextContents();
  expect(now).toContain("Cart");
  expect(now).toContain("All products");
  expect(now).not.toContain("All courses");
  await third.getByLabel("Screen").selectOption("cart");
  await expect(third.getByRole("alert")).toHaveCount(0);
  await expect(third).not.toContainText("Needs a fix");
});
