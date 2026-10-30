import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * Studio › App setup (roadmap 111): a company makes Studio projects of
 * several kinds and goes through /studio/project/setup step by step. In
 * Branding it moves from "Keep my pages" to each design and back, saves a
 * design, then (with pages of its own) another one's pages or only its look,
 * and the app's draft gets what was chosen. A save that doesn't go through
 * keeps the choice on screen and says why; every link stays in Studio; the
 * page reads in Arabic and fits a phone.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Nour Studio", email: `studio-setup-${suffix}@studio.test`, password: "nour-studio-strong-password-1" };
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.211" };
let own: Page;
const problems: string[] = [];

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  // Console errors and hydration warnings. Not the fonts (this spec runs no font server), nor headless Chrome's WebGL notes on the app preview.
  const browserNote = /was preloaded using link preload|WebGL|GL Driver Message/;
  own.on("console", (m) => {
    if ((m.type() === "error" || m.type() === "warning") && !m.location().url.includes("/api/v1/fonts/") && !browserNote.test(m.text())) {
      problems.push(`${m.type()} on ${own.url()}: ${m.text()}`);
    }
  });
  own.on("pageerror", (e) => problems.push(`pageerror on ${own.url()}: ${e.message}`));
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0211");
  await own.getByLabel("Your website (optional)").fill(`https://studio-setup-${suffix}.studio.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.studioSetupAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();
});

test.afterAll(async () => {
  await own.close();
});

/** A new Studio project of a kind (its radio's name starts with `kind`), its content kept in Yallapp. */
async function newProject(kind: string, name: string): Promise<void> {
  await own.goto("/studio/new");
  await own.getByRole("radio", { name: new RegExp(`^${kind.replace(/[()]/g, "\\$&")}( |$)`) }).check();
  await own.getByLabel("Project name").fill(name);
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: "Blank page" }).click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
}

const designGroup = () => own.locator("fieldset").filter({ has: own.locator('input[name="designChoice"]') }).first();
/** A design's radio by its id ("" for Keep my pages). */
const designRadio = (id: string) => designGroup().locator(`input[name="designChoice"][value="${id}"]`);
const KEEP = "";

/** The card of a design: its label, with the thumbnail. */
const card = (id: string) => designGroup().locator("label").filter({ has: own.locator(`input[name="designChoice"][value="${id}"]`) });

/** What a card's thumbnail draws. */
const thumbText = (id: string) => card(id).locator("[aria-hidden=true]").first().evaluate((el) => el.textContent ?? "");

/** The design shown as chosen: its radio checked, only its card outlined, and the same value sent with the form. */
async function expectChosen(id: string): Promise<void> {
  await expect(designRadio(id)).toBeChecked();
  await expect(designGroup().locator('input[name="designChoice"]:checked')).toHaveCount(1);
  await expect(designGroup().locator("div.outline-midnight")).toHaveCount(1);
  await expect(card(id).locator("div.outline-midnight")).toHaveCount(1);
  await expect(own.locator('input[type=hidden][name="design"]')).toHaveValue(id);
}

/** From "Keep my pages" to each design and back, every choice shown at once; the designs' ids. */
async function everyDesignAndBack(): Promise<string[]> {
  await designRadio(KEEP).click();
  await expectChosen(KEEP);
  const ids = (await designGroup().locator('input[name="designChoice"]').evaluateAll((inputs) => inputs.map((i) => (i as HTMLInputElement).value))).filter(Boolean);
  expect(ids.length).toBeGreaterThanOrEqual(3);
  for (const id of ids) {
    await designRadio(id).click();
    await expectChosen(id);
    await designRadio(KEEP).click();
    await expectChosen(KEEP);
  }
  // Straight from one design to another, and by a click on the thumbnail.
  await designRadio(ids[0]!).click();
  await card(ids[1]!).locator("div.overflow-hidden").first().click();
  await expectChosen(ids[1]!);
  await card(KEEP).locator("div.overflow-hidden").first().click();
  await expectChosen(KEEP);
  return ids;
}

async function uploadIcon(): Promise<void> {
  await own.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [255, 183, 3]) });
  await expect(own.getByText("Replace file").first()).toBeVisible();
}

/** The app's Pages & look draft as the app gets it: the hosted API with the dashboard preview's draft token. */
async function draftPages(request: APIRequestContext): Promise<{ tabs: string[]; home: string }> {
  await own.goto("/studio/project/setup?step=website");
  const api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
  await own.goto("/studio/project/preview?pages=draft");
  const src = (await own.locator("iframe[data-testid=app-preview]").getAttribute("src"))!;
  const headers = { "x-yallapp-preview": new URL(src, E2E.baseURL).searchParams.get("token")! };
  const nav = await request.get(`${api}/pages?platform=android`, { headers });
  const home = await request.get(`${api}/pages/home?platform=android`, { headers });
  expect(nav.status()).toBe(200);
  expect(home.status()).toBe(200);
  return { tabs: (await nav.json()).tabs.map((t: { label: string }) => t.label), home: JSON.stringify((await home.json()).blocks) };
}

const take = () => own.getByRole("group", { name: "From this design, take" });

test("Academy in Studio: every step, its links in Studio, and moving between them", async () => {
  await newProject("Academy", "Rawaq Academy");
  await own.goto("/studio/project/setup");
  // Content kept in Yallapp: the Website step is done, so Branding comes first.
  await expect(own.getByRole("heading", { name: "Branding", exact: true })).toBeVisible();
  await expect(own.getByText("Plan: Not set", { exact: false })).toBeVisible();

  // The steps and the page's links open Studio's pages; the kind was chosen when the project was made.
  const steps = own.getByRole("list", { name: "Setup steps" });
  await expect(steps.getByRole("link")).toHaveCount(4);
  await expect(steps.getByText("App type")).toBeVisible();
  for (const [label, step] of [
    ["Website", "website"],
    ["Branding", "branding"],
    ["Store listing", "listing"],
    ["Publishing", "publishing"],
  ]) {
    await expect(steps.getByRole("link").filter({ hasText: label })).toHaveAttribute("href", `/studio/project/setup?step=${step}`);
  }
  await expect(own.getByRole("link", { name: "Preview your app" })).toHaveAttribute("href", "/studio/project/preview");
  await expect(own.getByRole("link", { name: "pay it on Plan" })).toHaveAttribute("href", "/studio/project/license");

  // Website: the content kept in Yallapp, and no way back to the regular dashboard's App type.
  await steps.getByRole("link").filter({ hasText: "Website" }).click();
  await expect(own).toHaveURL(/\/studio\/project\/setup\?step=website$/);
  await expect(own.getByRole("link", { name: "Back", exact: true })).toHaveCount(0);
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own).toHaveURL(/\/studio\/project\/setup\?step=branding$/);
  await expect(own.getByRole("link", { name: "Back", exact: true })).toHaveAttribute("href", "/studio/project/setup?step=website");

  // Branding: every design and back, each with its own thumbnail.
  await expectChosen(KEEP);
  const ids = await everyDesignAndBack();
  expect(ids).toEqual(["academy-classic", "academy-online", "academy-coaching", "academy-kids"]);
  expect(await thumbText("academy-kids")).toContain("Fun lessons for curious kids");
  expect(await thumbText(KEEP)).not.toContain("Fun lessons for curious kids");

  // A save that doesn't go through (no icon, no short name) says why, and the choice stays as it was.
  await designRadio("academy-kids").click();
  await expect(own.getByLabel("Template")).toHaveValue("bold");
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByText("Upload your app icon.")).toBeVisible();
  await expect(own.getByText("Enter the name shown under the app icon.")).toBeVisible();
  await expect(own).toHaveURL(/step=branding$/);
  await expectChosen("academy-kids");
  await expect(own.getByLabel("Template")).toHaveValue("bold");
  await expect(own.getByLabel("Font", { exact: true })).toHaveValue("Lexend");
  // It can still be changed afterwards: to Keep my pages and to every design.
  await everyDesignAndBack();
  await designRadio("academy-kids").click();
  await expectChosen("academy-kids");

  await own.getByLabel("Name under the app icon").fill("Rawaq");
  await uploadIcon();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own).toHaveURL(/\/studio\/project\/setup\?step=listing$/);

  // Store listing: a mistake is shown at its field, then the step is done.
  await expect(own.getByRole("link", { name: "Back", exact: true })).toHaveAttribute("href", "/studio/project/setup?step=branding");
  await own.getByLabel("Android package name").fill("com.rawaq.academy");
  await own.getByLabel("iOS bundle ID").fill("com.rawaq.academy");
  await own.getByLabel("Short description").fill("Courses and lessons from Rawaq.");
  await own.getByLabel("Full description").fill("Rawaq Academy: courses, lessons and quizzes from our teachers, wherever you are.");
  await own.getByLabel("Support email").fill(`help-${suffix}@rawaq.test`);
  await own.getByLabel("Privacy policy URL").fill("not a link");
  await own.getByLabel("Frame the screenshots").check();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.locator("#f-privacyUrl-error")).toBeVisible();
  await expect(own).toHaveURL(/step=listing$/);
  // The box stays ticked after the save that didn't go through, with its captions.
  await expect(own.getByLabel("Frame the screenshots")).toBeChecked();
  await expect(own.getByLabel("Captions", { exact: true })).toBeVisible();
  await own.getByLabel("Frame the screenshots").uncheck();
  await expect(own.getByLabel("Captions", { exact: true })).toHaveCount(0);
  await own.getByLabel("Privacy policy URL").fill("https://rawaq.test/privacy");
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own).toHaveURL(/\/studio\/project\/setup\?step=publishing$/);

  // Publishing: Studio's own links, and no regular plan offered to a Studio project.
  await expect(own.getByRole("link", { name: "Back", exact: true })).toHaveAttribute("href", "/studio/project/setup?step=listing");
  await expect(own.getByRole("link", { name: "More Android stores" })).toHaveAttribute("href", "/studio/project/publishing/more-stores");
  await expect(own.getByRole("link", { name: "Fingerprint and Team ID" })).toHaveAttribute("href", "/studio/project/publishing/links");
  await expect(own.getByText(/Upgrade to (Growth|Pro|Business)/)).toHaveCount(0);
  await own.getByRole("button", { name: "Finish setup" }).click();
  await own.waitForURL((url) => !url.search.includes("step=publishing"));
  expect(new URL(own.url()).pathname).toMatch(/^\/studio\//);

  // Back on Branding, the saved design is the one chosen.
  await own.goto("/studio/project/setup?step=branding");
  await expectChosen("academy-kids");
});

test("Academy with pages of its own: another design's look only, its pages, or keeping the pages; the app's draft follows", async ({ request }) => {
  const kids = await draftPages(request);
  expect(kids.home).toContain("Enrollment for the new term is open");

  await own.goto("/studio/project/setup?step=branding");
  await expectChosen("academy-kids");
  await expect(take()).toHaveCount(0);
  await everyDesignAndBack();
  await expect(take()).toHaveCount(0);

  // Another design: its pages and look, or its look only, each with its thumbnail.
  await designRadio("academy-coaching").click();
  await expectChosen("academy-coaching");
  await expect(take().getByRole("radio", { name: "Its pages and look" })).toBeChecked();
  const coachingPages = await thumbText("academy-coaching");
  await take().getByRole("radio", { name: "Its look only (my pages stay)" }).check();
  const coachingLook = await thumbText("academy-coaching");
  expect(coachingLook).not.toEqual(coachingPages);
  expect(coachingLook).toContain("Fun lessons for curious kids");
  // Keep my pages and back again: still its look only.
  await designRadio(KEEP).click();
  await expect(take()).toHaveCount(0);
  await designRadio("academy-coaching").click();
  await expect(take().getByRole("radio", { name: "Its look only (my pages stay)" })).toBeChecked();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own).toHaveURL(/step=listing$/);
  const look = await draftPages(request);
  expect(look.home).toContain("Enrollment for the new term is open");
  expect(look.tabs).toEqual(kids.tabs);

  // Another design's pages and look. (Its look only kept the pages: they are still the design's they came from.)
  await own.goto("/studio/project/setup?step=branding");
  await expectChosen("academy-kids");
  await designRadio("academy-online").click();
  await expect(take().getByRole("radio", { name: "Its pages and look" })).toBeChecked();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own).toHaveURL(/step=listing$/);
  const online = await draftPages(request);
  expect(online.home).not.toContain("Enrollment for the new term is open");
  expect(online.home).not.toEqual(look.home);

  // Keep my pages: the draft stays as it is.
  await own.goto("/studio/project/setup?step=branding");
  await expectChosen("academy-online");
  await designRadio(KEEP).click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own).toHaveURL(/step=listing$/);
  expect(await draftPages(request)).toEqual(online);
});

const KINDS = [
  ["Store", "Store"],
  ["Delivery and couriers company", "Delivery"],
  ["Food delivery from many restaurants", "Food"],
  ["Rides, like Uber", "Rides"],
  ["Live taxi on the map", "Taxi"],
  ["A school for students, parents and teachers", "School"],
  ["An academy with many teachers", "Teachers"],
] as const;

for (const [kind, short] of KINDS) {
  test(`${short} in Studio: Keep my pages to each design and back, before and after a design is saved`, async ({ request }) => {
    await newProject(kind, `Nour ${short}`);
    await own.goto("/studio/project/setup?step=branding");
    await expectChosen(KEEP);
    const ids = await everyDesignAndBack();

    // The first design, saved: the app's draft is its pages.
    await designRadio(ids[0]!).click();
    await own.getByLabel("Name under the app icon").fill(short);
    await uploadIcon();
    await own.getByRole("button", { name: "Save & continue" }).click();
    await expect(own).toHaveURL(/\/studio\/project\/setup\?step=listing$/);
    const first = await draftPages(request);

    // With pages of its own: Keep my pages to each design and back, then another design's pages.
    await own.goto("/studio/project/setup?step=branding");
    await expectChosen(ids[0]!);
    await everyDesignAndBack();
    await designRadio(ids[1]!).click();
    await expectChosen(ids[1]!);
    await own.getByRole("button", { name: "Save & continue" }).click();
    await expect(own).toHaveURL(/step=listing$/);
    expect((await draftPages(request)).home).not.toEqual(first.home);
    await own.goto("/studio/project/setup?step=branding");
    await expectChosen(ids[1]!);
  });
}

test("in Arabic: the designs' names, the messages in place, and every step on a phone", async () => {
  await newProject("Live taxi on the map", "Lamha");
  await own.context().addCookies([{ name: "yallapp_lang", value: "ar", url: E2E.baseURL }]);
  await own.goto("/studio/project/setup?step=branding");
  await expect(own.locator("html")).toHaveAttribute("dir", "rtl");
  const group = own.getByRole("group", { name: "التصميم" });
  for (const name of ["الإبقاء على صفحاتي", "تاكسي مباشر", "تاكسي المدينة", "تاكسي الليل"]) await expect(group.getByRole("radio", { name })).toBeVisible();
  await expect(own.getByText("Not set")).toHaveCount(0);
  await group.getByRole("radio", { name: "تاكسي الليل" }).click();
  await own.getByRole("button", { name: "حفظ ومتابعة" }).click();
  await expect(own.getByText("ارفع أيقونة تطبيقك.")).toBeVisible();
  await expect(own.getByText("أدخل الاسم الذي يظهر تحت أيقونة التطبيق.")).toBeVisible();
  await expect(own.getByText("Upload your app icon.")).toHaveCount(0);
  await expect(group.getByRole("radio", { name: "تاكسي الليل" })).toBeChecked();

  await own.setViewportSize({ width: 390, height: 844 });
  for (const step of ["website", "branding", "listing", "publishing"]) {
    await own.goto(`/studio/project/setup?step=${step}`);
    await expect(own.getByRole("heading", { level: 1, name: "إعداد التطبيق" })).toBeVisible();
    expect(await own.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), step).toBeLessThanOrEqual(0);
  }
  await own.setViewportSize({ width: 1280, height: 720 });
  await own.context().clearCookies({ name: "yallapp_lang" });
});

test("every step on a phone in English, and no console errors or hydration warnings on the way", async () => {
  await own.setViewportSize({ width: 390, height: 844 });
  for (const step of ["website", "branding", "listing", "publishing"]) {
    await own.goto(`/studio/project/setup?step=${step}`);
    await expect(own.getByRole("heading", { level: 1, name: "App setup" })).toBeVisible();
    expect(await own.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), step).toBeLessThanOrEqual(0);
  }
  await own.setViewportSize({ width: 1280, height: 720 });
  expect(problems).toEqual([]);
});
