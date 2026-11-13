import { expect, test, type Page } from "@playwright/test";
import { DEMO_COURSES, DEMO_DELIVERY_SERVICES } from "../../src/lib/demo/content";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * 127 Choosing your app from our real demos, both ways: a new account
 * starts on /start (what does your business do?), sees every demo once in
 * its own product's section (the App editor's light, Yallapp Studio's dark
 * with gold), opens Nour Academy, makes it its own (name, logo, the colour
 * taken from the logo) and lands in the dashboard's editor with the demo's
 * pages, its courses marked "From Nour Academy" and its first steps; then,
 * in Arabic and dark, "New project" in Studio opens the same page with
 * Studio chosen, and Sahm Express becomes a Studio project in Studio's
 * editor, with the demo's own words where its template had brackets. Every
 * page fits a phone.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Selin Kaya", email: `choose-app-${suffix}@choose.test`, password: "selin-choose-strong-password-1" };
/** Its own address, so this spec's sign-up doesn't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.127" };
let own: Page;
const problems: string[] = [];

/** The App editor's ten demos and Studio's nine, as the code has them (lib/demo/constants.ts). */
const EDITOR = ["lms", "store", "restaurant", "booking", "clinic", "fitness", "real_estate", "news", "events", "donations"];
const STUDIO = ["premium_academy", "instructors", "food", "marketplace", "delivery", "rides", "taxi", "school", "travel"];

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  // Not the browser's notes, nor the app preview's own fonts (the Flutter app in Pages & look) cut off when the test moves on.
  const browserNote = /was preloaded using link preload|WebGL|GL Driver Message|Flutter Web engine failed|Failed to load font|^TypeError: Failed to fetch$/;
  own.on("console", (m) => {
    if ((m.type() === "error" || m.type() === "warning") && !m.location().url.includes("/api/v1/fonts/") && !browserNote.test(m.text())) problems.push(`${m.type()} on ${own.url()}: ${m.text()}`);
  });
  own.on("pageerror", (e) => problems.push(`pageerror on ${own.url()}: ${e.message}`));
});

test.afterAll(async () => {
  await own.close();
});

/** No sideways scrolling at a phone's width. */
async function fitsPhone(page: Page): Promise<void> {
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: 375, height: 800 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.setViewportSize(size);
}

const demosIn = (page: Page, section: "editor" | "studio") => page.locator(`[data-section="${section}"] a[data-demo]`).evaluateAll((links) => links.map((a) => a.getAttribute("data-demo")));

test("a new account chooses Nour Academy and gets the whole demo in the app editor", async () => {
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 532 000 0127");
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  // 1 · What does your business do?
  await expect(own.getByRole("heading", { level: 1, name: "What does your business do?" })).toBeVisible();
  await expect(own.getByText("Welcome, Selin")).toBeVisible();
  await expect(own.getByRole("button", { name: "All apps", pressed: true })).toBeVisible();
  // Every demo once, in its own product's section, and nothing else.
  expect(await demosIn(own, "editor")).toEqual(EDITOR);
  expect(await demosIn(own, "studio")).toEqual(STUDIO);
  expect(await own.locator("a[data-demo]").count()).toBe(EDITOR.length + STUDIO.length);
  await expect(own.locator('[data-section="editor"]').getByText("10 apps")).toBeVisible();
  await expect(own.locator('[data-section="studio"]').getByText("9 apps")).toBeVisible();
  // Each card says its product, and shows the demo's own screenshot.
  for (const id of EDITOR) await expect(own.locator(`[data-section="editor"] a[data-demo="${id}"]`)).toContainText("App editor");
  for (const id of STUDIO) await expect(own.locator(`[data-section="studio"] a[data-demo="${id}"]`)).toContainText("STUDIO");
  await expect(own.locator('a[data-demo="lms"] img')).toHaveAttribute("src", "/screens/academy-home.png");
  await expect(own.locator('a[data-demo="premium_academy"] img')).toHaveAttribute("src", "/screens/premium-home.png");
  // Every card's screenshot is there to load.
  for (const src of await own.locator("a[data-demo] img").evaluateAll((imgs) => imgs.map((i) => i.getAttribute("src")!))) {
    const shot = await own.request.get(src);
    expect(shot.status(), src).toBe(200);
    expect(shot.headers()["content-type"], src).toContain("image/png");
  }
  // The switch: one product, the other, both.
  await own.getByRole("button", { name: "Studio" }).click();
  await expect(own.locator('[data-section="editor"]')).toBeHidden();
  await expect(own.locator('[data-section="studio"]')).toBeVisible();
  await own.getByRole("button", { name: "App editor" }).click();
  await expect(own.locator('[data-section="studio"]')).toBeHidden();
  await own.getByRole("button", { name: "All apps" }).click();
  await expect(own.locator('[data-section="studio"]')).toBeVisible();
  // The other ways in stay.
  await expect(own.getByRole("link", { name: "Describe my business" })).toHaveAttribute("href", "/dashboard/builder");
  await expect(own.getByText("Use my website")).toBeVisible();
  await fitsPhone(own);

  // 2 · Try a real app.
  await own.locator('a[data-demo="lms"]').click();
  await expect(own).toHaveURL(/\/start\/[a-z-]+$/);
  await expect(own.getByRole("heading", { level: 1, name: "Nour Academy" })).toBeVisible();
  await expect(own.locator("[data-demo-page]")).toHaveAttribute("data-product", "editor");
  await expect(own.getByText("APP EDITOR", { exact: true })).toBeVisible();
  await expect(own.getByRole("link", { name: "Teaching and courses" })).toBeVisible();
  const shots = await own.locator("[data-demo-page] img").evaluateAll((imgs) => imgs.map((i) => i.getAttribute("src")));
  expect(shots.sort()).toEqual(["/screens/academy-course.png", "/screens/academy-home.png", "/screens/academy-lesson.png"]);
  await expect(own.locator('[data-fact="items"]')).toContainText(`${DEMO_COURSES.length}`);
  await expect(own.locator('[data-fact="items"]')).toContainText("courses inside");
  await expect(own.locator('[data-fact="languages"]')).toContainText("3");
  await expect(own.getByText("Opens in the app editor")).toBeVisible();
  // The teaching apps in Studio, in their dark section.
  expect(await own.locator('[data-section="studio"] [data-demo]').evaluateAll((cards) => cards.map((c) => c.getAttribute("data-demo")))).toEqual(["premium_academy", "instructors"]);
  // Try it on the phone: the demo's number and code, as /demo has them.
  await own.getByText("Try it on your phone").click();
  await expect(own.locator("[data-try-phone]")).toContainText("+1 202 555 0123");
  await fitsPhone(own);

  // 3 · Make it yours.
  await own.getByRole("link", { name: "Start with this app" }).click();
  await expect(own).toHaveURL(/\/start\/[a-z-]+\/make$/);
  await expect(own.getByRole("heading", { level: 1, name: "Make it yours" })).toBeVisible();
  await expect(own.getByText("APP EDITOR · from Nour Academy")).toBeVisible();
  await expect(own.locator("[data-comes]")).toContainText(`${DEMO_COURSES.length} courses with lessons`);
  await expect(own.locator("[data-comes]")).toContainText("Sign-in and the account menu");
  await own.getByLabel("Your app's name").fill("Selin's Academy");
  await expect(own.locator("[data-preview]")).toContainText("Selin's Academy");
  // The logo: its colour is taken, and the icon made from it.
  await own.locator("#logo-file").setInputFiles({ name: "selin-logo.png", mimeType: "image/png", buffer: solidPng(240, 240, [31, 92, 74]) });
  await expect(own.getByText("We made the app's icon from it")).toBeVisible();
  await expect(own.getByRole("radio", { name: "Your logo's colour, chosen" })).toBeVisible();
  await expect(own.locator("[data-preview-bar]")).toHaveAttribute("data-preview-bar", "#1F5C4A");
  await fitsPhone(own);
  await own.getByRole("button", { name: "Create my app" }).click();

  // 4 · The editor on first open: the app editor, with the demo's pages and its first steps.
  await expect(own).toHaveURL(/\/dashboard\/pages\?from=demo$/);
  await expect(own.locator('[data-product="editor"]')).toHaveText("APP EDITOR");
  const steps = own.locator("[data-first-steps]");
  await expect(steps.getByRole("heading", { name: "Your first steps" })).toBeVisible();
  await expect(steps).toContainText("1 of 4 done");
  await expect(steps.locator('[data-step="brand"][data-done]')).toBeVisible();
  await expect(steps).toContainText(`Your app has Nour Academy's ${DEMO_COURSES.length} courses.`);
  await expect(own.getByText("Tap anything in the app to change it")).toBeVisible();
  await expect(steps.getByRole("button", { name: "Remove the demo's things" })).toBeVisible();
  // Its real courses, marked the demo's.
  await steps.getByRole("link", { name: "Open my courses" }).click();
  await expect(own).toHaveURL(/\/dashboard\/courses$/);
  await expect(own.getByText(DEMO_COURSES[0]!.title).first()).toBeVisible();
  await expect(own.locator("[data-from-demo]")).toHaveCount(DEMO_COURSES.length);
  await expect(own.locator("[data-from-demo]").first()).toHaveText("From Nour Academy · change");
  // The app is the demo's kind, named and branded by the owner.
  await own.goto("/dashboard/setup?step=branding");
  await expect(own.getByLabel("App name")).toHaveValue("Selin's Academy");
  await fitsPhone(own);

  // The first steps are kept with the app: a step marked done, the demo's things removed, then hidden.
  await own.goto("/dashboard/pages");
  await steps.getByRole("button", { name: "Remove the demo's things" }).click();
  await expect(own).toHaveURL(/\/dashboard\/pages\?samplesRemoved=all\.\d+$/);
  await expect(steps).toContainText("2 of 4 done");
  await steps.getByRole("button", { name: "I did this" }).click();
  await expect(steps).toContainText("3 of 4 done");
  await steps.getByRole("button", { name: "Hide these steps" }).click();
  await expect(own.locator("[data-first-steps]")).toHaveCount(0);
  await own.reload();
  await expect(own.locator("[data-first-steps]")).toHaveCount(0);
});

test("in Arabic and dark, Studio's New project opens the same page with Studio chosen, and Sahm Express becomes a Studio project", async () => {
  await own.context().addCookies([{ name: "yallapp_lang", value: "ar", url: E2E.baseURL }]);
  await own.emulateMedia({ colorScheme: "dark" });
  await own.goto("/studio");
  await own.locator('a[href="/start?new=1&for=studio"]').first().click();
  await expect(own).toHaveURL(/\/start\?new=1&for=studio$/);
  await expect(own.locator("[data-picker-step]")).toHaveAttribute("dir", "rtl");
  await expect(own.locator("html")).toHaveAttribute("lang", "ar");
  await expect(own.getByRole("heading", { level: 1, name: "شغلك إيه؟" })).toBeVisible();
  // Studio chosen: the App editor's section is hidden, Studio's shows.
  await expect(own.getByRole("button", { name: "Studio", pressed: true })).toBeVisible();
  await expect(own.locator('[data-section="editor"]')).toBeHidden();
  expect(await demosIn(own, "studio")).toEqual(STUDIO);
  // Dark: the page in Midnight, Studio's cards dark with gold.
  await expect.poll(() => own.locator("[data-picker-step]").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(14, 13, 36)");
  await fitsPhone(own);

  await own.locator('[data-section="studio"] a[data-demo="delivery"]').click();
  await expect(own.getByRole("heading", { level: 1, name: "Sahm Express" })).toBeVisible();
  await expect(own.locator("[data-demo-page]")).toHaveAttribute("data-product", "studio");
  await expect(own.locator("[data-demo-page]").getByText("STUDIO", { exact: true })).toBeVisible();
  await expect(own.getByText("بيفتح في Yallapp Studio")).toBeVisible();
  await fitsPhone(own);
  await own.getByRole("link", { name: "ابدأ بالتطبيق ده" }).click();
  await expect(own.getByText("STUDIO · من Sahm Express")).toBeVisible();
  await expect(own.locator("[data-comes]")).toContainText(`${DEMO_DELIVERY_SERVICES.length}`);
  await own.getByLabel("اسم تطبيقك").fill("Selin Express");
  // No logo: the icon is made from the name; a colour of the five.
  await own.locator('button[data-colour="#B4235A"]').click();
  await expect(own.locator("[data-preview-bar]")).toHaveAttribute("data-preview-bar", "#B4235A");
  await fitsPhone(own);
  await own.getByRole("button", { name: "اعمل تطبيقي" }).click();

  // Studio's editor, the project marked Studio, its first steps over the canvas.
  await expect(own).toHaveURL(/\/studio\/editor\?from=demo$/);
  await expect(own.locator('header [data-product="studio"]')).toHaveText("STUDIO");
  const steps = own.locator("[data-first-steps]");
  await expect(steps.getByRole("heading", { name: "أول خطواتك" })).toBeVisible();
  await expect(steps).toContainText("دوس على أي حاجة في التطبيق عشان تغيّرها");
  // The demo's own words where its template asked for the owner's: no brackets left.
  await expect(own.getByText("Downtown Cairo, by Tahrir Square · Every day, 09:00 to 22:00")).toBeVisible();
  await expect(own.getByText("[Your address and opening hours]")).toHaveCount(0);
  // Its delivery services, the demo's, marked so.
  await own.goto("/studio/project/delivery");
  await expect(own.locator("[data-from-demo]")).toHaveCount(DEMO_DELIVERY_SERVICES.length);
  await expect(own.locator("[data-from-demo]").first()).toHaveText("من Sahm Express · غيّر");
  // A Studio project, not a regular app: the Studio editor, never the dashboard's.
  await own.goto("/studio");
  await expect(own.getByRole("article").filter({ hasText: "Selin Express" })).toHaveCount(1);
  await own.context().clearCookies({ name: "yallapp_lang" });
  await own.emulateMedia({ colorScheme: "light" });
  expect(problems).toEqual([]);
});
