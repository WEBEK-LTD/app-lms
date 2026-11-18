import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 156 What the owner changes in Studio and publishes is what the app gets,
 * in every language: a flower shop from Leqaa's Rose hour template, its
 * "Kind words" heading renamed in Studio's editor (English, the main
 * language) and published; hosted `GET /pages/home`, asked as the app asks
 * (its platform, its language, the preview of what's published), has the
 * owner's words in English, Arabic and Turkish, never the template's
 * "كلمات طيبة" or "Güzel sözler". The inspector says what each language
 * shows, and the language switch which language is the main one.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Kech Flora", email: `studio-publish-${suffix}@studio.test`, password: "kech-flora-strong-password-1" };
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.156" };
let own: Page;
let api = "";

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  own = await (await browser.newContext({ extraHTTPHeaders, viewport: { width: 1440, height: 900 } })).newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0156");
  await own.getByLabel("Your website (optional)").fill(`https://studio-publish-${suffix}.studio.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.studioPublishAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();

  // A flower shop from Leqaa's Rose hour template, as an owner makes it.
  await own.goto("/studio/new");
  await own.getByRole("radio", { name: /^Store( |$)/ }).first().check();
  await own.getByLabel("Project name").fill("Kech Flora");
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: /Rose hour/ }).first().click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
  await own.goto("/studio/project/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).first().textContent())!.trim();
  // Arabic and Turkish in the app too (the template wrote its words in them).
  await own.goto("/studio/project/languages");
  const list = own.getByRole("list", { name: "Languages in the app" }).getByRole("listitem");
  await expect(list).toHaveCount(1);
  for (const [code, n] of [["ar", 2], ["tr", 3]] as const) {
    await own.getByLabel("Add a language").selectOption(code);
    await own.getByRole("button", { name: "Add", exact: true }).click();
    await expect(list).toHaveCount(n);
  }
  await expect(own.getByText("Languages saved to your draft")).toBeVisible();
});

test.afterAll(async () => {
  await own.context().close();
});

/** The published preview's token: the app as it is, what's published, before the project has its plan. */
async function publishedToken(): Promise<string> {
  await own.goto("/studio/project/preview?pages=published");
  const src = (await own.locator("iframe[data-testid=app-preview]").getAttribute("src"))!;
  return new URL(src, E2E.baseURL).searchParams.get("token")!;
}

/** `GET /pages/home` as the app asks for it, in `lang`. */
async function home(request: APIRequestContext, token: string, lang: string): Promise<string> {
  const res = await request.get(`${api}/pages/home?platform=android&app_type=store`, { headers: { "accept-language": lang, "x-yallapp-preview": token } });
  expect(res.status()).toBe(200);
  return res.text();
}

test("a heading renamed in Studio and published reaches the app in English, Arabic and Turkish", async ({ request }) => {
  await own.goto("/studio/editor");
  const phone = own.getByRole("main", { name: "The page in the phone" });
  const inspector = own.getByRole("complementary", { name: "Design" });
  // English is the project's main language: an edit in another is a translation.
  await expect(own.locator("[data-main-language]")).toHaveText("Main language: English");

  await phone.getByText("Kind words", { exact: true }).first().click();
  const text = inspector.getByLabel("Text", { exact: true });
  await expect(text).toHaveValue("Kind words");
  // The template's own translations, while the heading is still its word.
  const inApp = inspector.locator('[data-text-in-app="text"]');
  await expect(inApp.locator('[data-language="ar"]')).toHaveAttribute("data-state", "template");
  await text.fill("What our customers say");
  // Changed: Arabic and Turkish show the owner's text now.
  await expect(inApp.locator('[data-language="ar"]')).toHaveAttribute("data-state", "none");
  await expect(inApp.locator('[data-language="ar"]')).toHaveText("Arabic: shows your text");
  await expect(inApp.locator('[data-language="tr"]')).toHaveAttribute("data-state", "none");

  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(own.getByText("Published. The app shows it the next time it opens.")).toBeVisible();

  const token = await publishedToken();
  for (const lang of ["en", "ar", "tr"]) {
    const served = await home(request, token, lang);
    expect(served, lang).toContain("What our customers say");
    expect(served, lang).not.toContain("كلمات طيبة");
    expect(served, lang).not.toContain("Güzel sözler");
  }
});

test("the Arabic translation the owner writes by hand is the one the Arabic app shows", async ({ request }) => {
  await own.goto("/studio/editor");
  const phone = own.getByRole("main", { name: "The page in the phone" });
  const inspector = own.getByRole("complementary", { name: "Design" });
  await own.getByRole("group", { name: "Language of the texts" }).getByRole("button", { name: "عربي" }).click();
  await expect(own.locator("[data-main-language]")).toContainText("a translation of your English texts");
  await phone.getByText("What our customers say", { exact: true }).first().click();
  await inspector.getByLabel("Text", { exact: true }).fill("آراء عملائنا");
  await expect(inspector.locator('[data-text-in-app="text"] [data-language="ar"]')).toHaveAttribute("data-state", "own");
  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(own.getByText("Published. The app shows it the next time it opens.")).toBeVisible();
  const token = await publishedToken();
  expect(await home(request, token, "ar")).toContain("آراء عملائنا");
  const english = await home(request, token, "en");
  expect(english).toContain("What our customers say");
  expect(english).not.toContain("آراء عملائنا");
});
