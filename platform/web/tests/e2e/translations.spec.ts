import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 43 Languages and translations: the owner adds French (a language Yallapp
 * doesn't ship) and Arabic to an Academy app on the hosted API, translates a
 * tab name and one of the app's own texts on the Languages page (a wrong
 * placeholder is refused), exports and imports a file, publishes, and the
 * app gets the French over English, Yallapp's Arabic for the tab names it
 * wrote, and a string pack; the preview opens in French and reads them.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so the other specs' sign-ups and this one stay under the per-IP limits.
test.use({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.143" } });

const suffix = Date.now().toString(36);
const client = { name: "Lumière Academy", email: `lumiere-${suffix}@school.test`, password: "lumiere-strong-password-1" };
let own: Page;
let api = "";

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

test.afterAll(async () => {
  await own?.close();
});

test("an Academy app on the hosted API", async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.143" } });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 01 43");
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  await signIn(own, E2E.translationsAdminEmail, E2E.adminPassword);
  await own.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await own.getByRole("link", { name: `Activate ${client.name}` }).click();
  const panel = own.getByRole("complementary");
  await panel.getByLabel("Plan").selectOption("pro");
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(own.getByRole("status")).toContainText("Activated");

  await signIn(own, client.email, client.password);
  await own.goto("/dashboard/app-type");
  await own.getByText("Academy", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
});

test("the owner adds French and Arabic from the list", async () => {
  await own.getByRole("link", { name: "Languages", exact: true }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Languages" })).toBeVisible();
  const list = own.getByRole("list", { name: "Languages in the app" }).getByRole("listitem");
  await expect(list).toHaveCount(1);

  await own.getByLabel("Add a language").selectOption("fr");
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(list).toHaveCount(2);
  await expect(list.nth(1)).toContainText("French");
  await expect(list.nth(1)).toContainText("Français");
  await expect(list.nth(1)).toContainText("You translate");
  await own.getByLabel("Add a language").selectOption("ar");
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(list).toHaveCount(3);
  await expect(list.nth(2)).toContainText("Right to left");
  await expect(list.nth(2)).toContainText("Translated by Yallapp");
  // Reordered: Arabic before French in the app's picker.
  await own.getByRole("button", { name: "Move Arabic up" }).click();
  await expect(list.nth(1)).toContainText("Arabic");
  await expect(own.getByText("Languages saved to your draft")).toBeVisible();
});

test("French starts empty; Arabic has Yallapp's translations", async () => {
  await own.getByRole("navigation", { name: "Language to translate" }).getByRole("link", { name: /Arabic/ }).click();
  await expect(own).toHaveURL(/lang=ar/);
  await expect(own.getByText(/^Arabic: ([\d,]+) of \1 translated \(100%\)$/)).toBeVisible();
  const home = own.locator('[data-row-id="tab|home|label"]');
  await expect(home).toContainText("Yallapp's translation");
  await expect(home.getByRole("textbox")).toHaveAttribute("placeholder", "الرئيسية");
  await expect(home.getByRole("textbox")).toHaveAttribute("dir", "rtl");

  await own.getByRole("navigation", { name: "Language to translate" }).getByRole("link", { name: /French/ }).click();
  await expect(own).toHaveURL(/lang=fr/);
  await expect(own.getByText(/^French: 0 of [\d,]+ translated \(0%\)$/)).toBeVisible();
  await expect(own.getByLabel("Show")).toHaveValue("missing");
});

test("the owner translates a tab name and one of the app's texts; a wrong placeholder is refused", async () => {
  const tab = own.locator('[data-row-id="tab|home|label"]');
  await tab.getByRole("textbox").fill("Accueil");
  await expect(tab).toContainText("Not saved");

  await own.getByLabel("Search", { exact: true }).fill("itemCount");
  const count = own.locator('[data-row-id="itemCount"]');
  await count.getByRole("textbox").fill("{total} articles");
  await expect(count.getByRole("alert")).toHaveText("{total} isn't a placeholder here. Use {count}.");
  await expect(own.getByRole("button", { name: /^Save translations/ }).last()).toBeDisabled();
  await count.getByRole("textbox").fill("articles");
  await count.getByRole("button", { name: "{count}" }).click();
  await expect(count.getByRole("textbox")).toHaveValue("articles{count}");
  await count.getByRole("textbox").fill("{count, plural, =1{1 article} other{{count} articles}}");
  await expect(count.getByRole("alert")).toHaveCount(0);

  // "Copy English" for a brand word.
  await own.getByLabel("Search", { exact: true }).fill("tabHome");
  const tabHome = own.locator('[data-row-id="tabHome"]');
  await tabHome.getByRole("button", { name: "Copy English" }).click();
  await expect(tabHome.getByRole("textbox")).toHaveValue("Home");
  await tabHome.getByRole("textbox").fill("Accueil");

  await own.getByRole("button", { name: "Save translations (3)" }).click();
  await expect(own.getByText("Saved to your draft. Publish to send your translations to your app.")).toBeVisible();
  await expect(own.getByText(/^French: 3 of [\d,]+ translated/)).toBeVisible();
});

test("export and import a translations file", async () => {
  await own.getByLabel("Search", { exact: true }).fill("");
  const download = own.waitForEvent("download");
  await own.getByRole("button", { name: "CSV" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("translations-fr.csv");
  const csv = readFileSync((await file.path())!, "utf8");
  expect(csv).toContain("tab|home|label,Home,Accueil");
  expect(csv).toContain("itemCount,");

  await own.getByLabel("Import translations").setInputFiles({
    name: "translations-fr.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ language: "fr", translations: { "tab|courses|label": { source: "Courses", translation: "Cours" }, nope: { translation: "x" } } })),
  });
  await expect(own.getByText("1 translation imported, 1 didn't match a text of this app. Check them, then save.")).toBeVisible();
  await expect(own.locator('[data-row-id="tab|courses|label"]').getByRole("textbox")).toHaveValue("Cours");
  await own.getByRole("button", { name: "Save translations (1)" }).click();
  await expect(own.getByText("Saved to your draft.", { exact: false })).toBeVisible();
});

test("the preview opens in French with the draft's texts", async () => {
  // The app in the preview's frame reads the draft's string pack and asks for its pages in French.
  const pack = own.context().waitForEvent("response", { timeout: 60_000, predicate: (r) => /\/api\/app\/[0-9a-f-]{36}\/strings\/fr$/.test(new URL(r.url()).pathname) });
  const pages = own.context().waitForEvent("response", {
    timeout: 60_000,
    predicate: (r) => /\/api\/app\/[0-9a-f-]{36}\/pages$/.test(new URL(r.url()).pathname) && r.request().headers()["accept-language"] === "fr",
  });
  const popup = own.waitForEvent("popup");
  await own.getByRole("link", { name: /Preview in French/ }).click();
  const preview = await popup;
  await expect(preview.locator("iframe[data-testid=app-preview]")).toHaveAttribute("src", /lang=fr/);
  const strings = await (await pack).json();
  expect(strings).toMatchObject({ language: "fr", strings: { tabHome: "Accueil", itemCount: "{count, plural, =1{1 article} other{{count} articles}}" } });
  expect(new URL((await pack).url()).searchParams.get("draft")).toBe("1");
  const nav = await (await pages).json();
  expect(nav.tabs.map((t: { label: string }) => t.label)).toEqual(["Accueil", "Cours", "My courses", "Account"]);
  await preview.close();
});

test("published: French over English, Yallapp's Arabic, and the string pack", async ({ request }) => {
  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(own.getByText("Published. Your app shows your languages and translations the next time it opens.")).toBeVisible();

  const config = await (await request.get(`${api}/config?platform=android&app_version=1.0.0`)).json();
  expect(config.languages.available).toEqual(["en", "ar", "fr"]);
  const fr = config.languages.list.find((l: { code: string }) => l.code === "fr");
  expect(fr).toMatchObject({ name: "French", native_name: "Français", direction: "ltr", strings: { version: expect.any(String) } });
  expect(config.languages.list.find((l: { code: string }) => l.code === "ar")).toMatchObject({ direction: "rtl", strings: null });

  const tabs = async (lang: string) =>
    ((await (await request.get(`${api}/pages?platform=android`, { headers: { "accept-language": lang } })).json()) as { tabs: { label: string }[] }).tabs.map((t) => t.label);
  expect(await tabs("fr")).toEqual(["Accueil", "Cours", "My courses", "Account"]);
  // The owner wrote no Arabic: Yallapp's for the tab names it wrote.
  expect(await tabs("ar")).toEqual(["الرئيسية", "الدورات", "دوراتي", "الحساب"]);
  expect(await tabs("en")).toEqual(["Home", "Courses", "My courses", "Account"]);

  const pack = await request.get(fr.strings.url);
  expect(pack.status()).toBe(200);
  expect(await pack.json()).toEqual({ language: "fr", version: fr.strings.version, strings: { tabHome: "Accueil", itemCount: "{count, plural, =1{1 article} other{{count} articles}}" } });
  expect((await request.get(fr.strings.url, { headers: { "if-none-match": `"${fr.strings.version}"` } })).status()).toBe(304);

  // The hosted API's messages come in Arabic too.
  const error = await (await request.get(`${api}/pages/Bad?platform=android`, { headers: { "accept-language": "ar" } })).json();
  expect(error).toEqual({ code: "invalid_request", message: "عنوان هذه الصفحة غير صالح." });
});
