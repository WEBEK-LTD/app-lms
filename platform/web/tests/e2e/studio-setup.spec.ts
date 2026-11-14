import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { readFileSync } from "node:fs";
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
  await expect(own).toHaveURL(/\/start$/);

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
  // 124.6 The premium academy (the Studio template for the whole project) first, in its real picture; templates = demos: the demo's design, then the academy's own.
  // 130.17 130.18 Ufuq Academy's two Signature looks before it, each in its own picture.
  expect(ids).toEqual(["studio-premium_academy_signature_a", "studio-premium_academy_signature_b", "studio-academy_premium", "demo-lms", "academy-classic", "academy-online", "academy-coaching", "academy-kids"]);
  await expect(card("studio-premium_academy_signature_a").getByRole("img", { name: "Night cinema: its home in the app" })).toHaveAttribute("src", "/screens/ufuq-sig-a-home.png");
  await expect(card("studio-academy_premium").getByRole("img", { name: "Premium academy: its home in the app" })).toHaveAttribute("src", "/screens/premium-home.png");
  await expect(card("studio-academy_premium")).toContainText("The whole app: the home, the tab bar");
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

test("124.6 Academy: the premium academy's whole project from App setup, then shown as chosen", async ({ request }) => {
  await own.goto("/studio/project/setup?step=branding");
  await expectChosen("academy-online");
  await designRadio("studio-academy_premium").click();
  await expectChosen("studio-academy_premium");
  // With pages of its own, its pages and look unless the owner keeps theirs.
  await expect(take().getByRole("radio", { name: "Its pages and look" })).toBeChecked();
  // The template's font comes with it (128.8 Manrope).
  await expect(own.getByLabel("Font", { exact: true })).toHaveValue("Manrope");
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own).toHaveURL(/step=listing$/);
  // The project as a new one from the template starts: its tabs, with the blog of the website from sign-up.
  const premium = await draftPages(request);
  expect(premium.tabs).toEqual(["Home", "Explore", "Blog", "My courses", "Account"]);
  await own.goto("/studio/project/setup?step=branding");
  await expectChosen("studio-academy_premium");
  await expect(take()).toHaveCount(0);
  // Its sign-in screen and account menu too.
  await own.goto("/studio/project/screens");
  await expect(own.getByRole("radio", { name: /Premium/ }).first()).toBeChecked();
});

test("124.6 a new project: the premium academy among the Studio projects, its template already picked", async () => {
  await own.goto("/studio/new");
  const studioOnly = own.locator("section#step-1 div.grid").first();
  const tile = studioOnly.getByRole("radio", { name: /^Premium academy / });
  await expect(tile).toBeVisible();
  await tile.check();
  await expect(own.locator('input[type=hidden][name="kind"]')).toHaveValue("academy");
  await expect(own.locator('input[type=hidden][name="template"]')).toHaveValue("academy_premium");
  await expect(own.getByRole("radiogroup", { name: "3 · Where do you start?" }).getByRole("radio", { checked: true })).toContainText("Premium academy");
  // Another start can still be picked; back to the premium academy.
  await own.getByRole("radiogroup", { name: "3 · Where do you start?" }).getByRole("radio", { name: "Blank page" }).click();
  await expect(own.locator('input[type=hidden][name="template"]')).toHaveValue("blank");
  await own.getByRole("radiogroup", { name: "3 · Where do you start?" }).getByRole("radio", { name: /Premium academy/ }).click();
  await own.getByLabel("Project name").fill("Nour Premium");
  // On the third step already: Next makes the project.
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
  await own.goto("/studio/project/setup?step=branding");
  await expectChosen("studio-academy_premium");
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

    // The first design, saved: the app's draft is its pages. 130 Page designs here (a whole project's template, a kind's
    // Signature look, is its own project: tests/unit/studio-signature-learn.test.ts).
    const pageDesigns = ids.filter((id) => !id.startsWith("studio-"));
    await designRadio(pageDesigns[0]!).click();
    await own.getByLabel("Name under the app icon").fill(short);
    await uploadIcon();
    await own.getByRole("button", { name: "Save & continue" }).click();
    await expect(own).toHaveURL(/\/studio\/project\/setup\?step=listing$/);
    const first = await draftPages(request);

    // With pages of its own: Keep my pages to each design and back, then another design's pages.
    await own.goto("/studio/project/setup?step=branding");
    await expectChosen(pageDesigns[0]!);
    await everyDesignAndBack();
    const second = pageDesigns[1]!;
    await designRadio(second).click();
    await expectChosen(second);
    await own.getByRole("button", { name: "Save & continue" }).click();
    await expect(own).toHaveURL(/step=listing$/);
    expect((await draftPages(request)).home).not.toEqual(first.home);
    await own.goto("/studio/project/setup?step=branding");
    await expectChosen(second);
  });
}

test("124 Branding keeps what was entered while the icon is still missing, and a Studio page can be deleted", async () => {
  await newProject("Academy", "Keep Academy");
  await own.goto("/studio/project/setup?step=branding");
  await own.getByLabel("Name under the app icon").fill("Keep");
  await own.locator("#upload-logo").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: solidPng(600, 200, [10, 40, 90]) });
  await expect(own.getByText("Replace file").first()).toBeVisible();
  await own.getByRole("button", { name: "Save & continue" }).click();
  // The step isn't done (no icon), but what was entered is saved and the page says so.
  await expect(own.getByText("Saved what you entered. To finish this step, fill in what is marked below.")).toBeVisible();
  await expect(own.getByText("Upload your app icon.")).toBeVisible();
  await own.goto("/studio/project/setup?step=branding");
  await expect(own.getByLabel("Name under the app icon")).toHaveValue("Keep");
  await expect(own.getByText("Replace file")).toHaveCount(1);

  // Studio's page menu: a new page, then deleted (the home never is).
  await own.goto("/studio/editor");
  await own.getByRole("button", { name: /^Page: / }).click();
  await own.getByLabel("Page name").fill("Promo");
  await own.getByRole("button", { name: "Add the page" }).click();
  await own.getByRole("button", { name: /^Page: Promo/ }).click();
  own.once("dialog", (d) => void d.accept());
  await own.getByRole("menuitem", { name: "Delete this page" }).click();
  await expect(own.getByRole("button", { name: /^Page: Home/ })).toBeVisible();
  await own.getByRole("button", { name: /^Page: / }).click();
  await expect(own.getByRole("menuitemradio", { name: "Promo" })).toHaveCount(0);
  await expect(own.getByRole("menuitem", { name: "Delete this page" })).toHaveCount(0);
  await own.keyboard.press("Escape");
});

test("124.11 a project's file brings the whole app into another project: pages, tabs, bar, colours and screens", async ({ request }) => {
  // A premium academy, taken out as a file.
  await newProject("Academy", "Whole From");
  await own.goto("/studio/project/setup?step=branding");
  await own.getByLabel("Name under the app icon").fill("Whole");
  await uploadIcon();
  await designRadio("studio-academy_premium").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own).toHaveURL(/step=listing$/);
  await own.goto("/studio/editor");
  await own.getByRole("button", { name: /^Page: / }).click();
  const [exported] = await Promise.all([own.waitForEvent("download"), own.getByRole("menuitem", { name: "Export the whole project as a file" }).click()]);
  const file = JSON.parse(readFileSync((await exported.path())!, "utf8"));
  expect(file.kind).toBe("project");
  expect(file.look.tabs.map((t: { label: string }) => t.label)).toEqual(["Home", "Explore", "Blog", "My courses", "Account"]);
  expect(file.look.tab_bar).toMatchObject({ design: "float", margin: 12 });
  expect(file.look.screens.looks).toMatchObject({ my_courses: "premium", lesson: "premium" });
  // As another owner's brand would have it.
  file.look.primary_color = "#002F5D";
  file.look.secondary_color = "#D50313";

  // A blank academy takes it whole.
  await newProject("Academy", "Whole To");
  await own.goto("/studio/editor");
  await own.getByRole("button", { name: /^Page: / }).click();
  await own.getByRole("menuitem", { name: "Import a design…" }).click();
  const importing = own.getByRole("dialog", { name: "Import a design" });
  await importing.getByLabel("Choose a file").setInputFiles({ name: "Whole From.yallapp", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(file)) });
  await importing.getByRole("button", { name: "Next" }).click();
  await expect(importing.getByRole("radio", { name: "The whole project: pages, tabs, colours and screens" })).toBeChecked();
  await expect(importing.getByText("The status bar and the tab bar are the app's own")).toHaveCount(0);
  await importing.getByRole("button", { name: /^Import \d+ pages$/ }).click();
  await expect(importing).toHaveCount(0);
  await expect(own.getByRole("status").filter({ hasText: "The design is applied." })).toBeVisible({ timeout: 15_000 });
  // One step undone and done again, then saved.
  await own.getByRole("button", { name: "Undo" }).click();
  await own.getByRole("button", { name: "Redo" }).click();
  await expect(own.getByRole("status").filter({ hasText: "Saved just now" })).toBeVisible({ timeout: 10_000 });
  // Its pages, with no second home.
  await own.getByRole("button", { name: /^Page: / }).click();
  await expect(own.getByRole("menuitemradio", { name: "Home" })).toHaveCount(1);
  await expect(own.getByRole("menuitemradio", { name: "My courses" })).toHaveCount(1);
  await own.keyboard.press("Escape");
  // The app gets its tabs; the main colour and the screens' looks are the project's now.
  expect((await draftPages(request)).tabs).toEqual(["Home", "Explore", "Blog", "My courses", "Account"]);
  await own.goto("/studio/project/setup?step=branding");
  await expect(own.locator('input[name="primaryColor"]')).toHaveValue("#002f5d");
  await own.goto("/studio/project/screens");
  await expect(own.getByRole("radio", { name: /Premium/ }).first()).toBeChecked();
});

test("124.12 Studio's menu leads to how people sign in", async () => {
  await own.goto("/studio/project");
  await own.getByRole("navigation", { name: "Project dashboard" }).getByRole("link", { name: "How people sign in", exact: true }).click();
  await expect(own).toHaveURL(/\/studio\/project\/app-sign-in$/);
  await expect(own.getByRole("heading", { name: "App sign-in", level: 1 })).toBeVisible();
  await expect(own.getByRole("heading", { name: "How people sign in", level: 2 })).toBeVisible();
  await expect(own.getByRole("navigation", { name: "Project dashboard" }).getByRole("link", { name: "How people sign in", exact: true })).toHaveAttribute("aria-current", "page");
});

test("124.15 the launch screen: a look, its background in light and dark, the words, saved", async () => {
  await newProject("Academy", "Launch");
  await own.goto("/studio/project/screens");
  const launch = own.getByTestId("launch-section");
  const preview = launch.getByTestId("launch-preview");
  await expect(launch.getByRole("heading", { name: "Launch screen" })).toBeVisible();
  // Signature until the owner chooses: its bar.
  await expect(preview).toHaveAttribute("data-look", "signature");
  await expect(launch.getByRole("radiogroup", { name: "Loading sign" }).getByRole("radio", { name: "Bar" })).toHaveAttribute("aria-checked", "true");
  // Editorial brings its steps and its photo (the gradient until there is one).
  await launch.getByRole("radiogroup", { name: "Look" }).getByRole("radio", { name: "Editorial" }).click();
  await expect(preview).toHaveAttribute("data-look", "editorial");
  await expect(launch.getByRole("radiogroup", { name: "Loading sign" }).getByRole("radio", { name: "Steps" })).toHaveAttribute("aria-checked", "true");
  await expect(launch.getByRole("radiogroup", { name: "Background" }).getByRole("radio", { name: "Photo" })).toHaveAttribute("aria-checked", "true");
  await expect(launch.getByText("Until there is a photo, the main to second colour gradient shows.")).toBeVisible();
  // In light a gradient from the centre; in dark a colour of the owner's.
  await launch.getByRole("radiogroup", { name: "Background" }).getByRole("radio", { name: "Gradient" }).click();
  await launch.getByRole("radiogroup", { name: "Direction" }).getByRole("radio", { name: "From the centre" }).click();
  await launch.getByRole("button", { name: "In dark" }).click();
  await expect(preview).toHaveAttribute("data-dark", "");
  await launch.getByLabel("In dark, the look's own dark colours").uncheck();
  await launch.getByRole("radiogroup", { name: "Background" }).getByRole("radio", { name: "Colour" }).click();
  await launch.getByLabel("Its colour").fill("#331100");
  // The words, shown as they are typed.
  await launch.getByLabel("Title in English").fill("Ufuq Academy");
  await launch.getByLabel("Line under it in English").fill("Learn what changes your path.");
  await expect(preview.getByText("Ufuq Academy")).toBeVisible();
  await expect(preview.getByText("Learn what changes your path.")).toBeVisible();
  await launch.getByRole("radiogroup", { name: "Shape" }).getByRole("radio", { name: "Circle" }).click();
  await own.getByRole("button", { name: "Save", exact: true }).click();
  await expect(own.getByText("Saved. The app shows it the next time it opens; no new build is needed.")).toBeVisible();
  // Kept as saved.
  await own.reload();
  await expect(preview).toHaveAttribute("data-look", "editorial");
  await expect(launch.getByLabel("Title in English")).toHaveValue("Ufuq Academy");
  await expect(launch.getByRole("radiogroup", { name: "Background" }).getByRole("radio", { name: "Gradient" })).toHaveAttribute("aria-checked", "true");
  await launch.getByRole("button", { name: "In dark" }).click();
  await expect(launch.getByLabel("Its colour")).toHaveValue("#331100");
});

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
  // The project menu on a phone: a bar with the page open and a Menu button; the sheet opens from the right.
  const toggle = own.locator("[aria-controls=studio-project-menu]");
  await expect(own.getByRole("navigation", { name: "لوحة المشروع" })).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await own.getByRole("button", { name: "القايمة" }).click();
  const sheet = own.getByRole("dialog", { name: "لوحة المشروع" });
  await expect(sheet.getByRole("link", { name: "اللغات" })).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const box = await sheet.boundingBox();
  expect(Math.round(box!.x + box!.width)).toBe(390);
  await own.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
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
  // The project menu on a phone: a tap beside the sheet closes it, and so does picking a page.
  const toggle = own.getByRole("button", { name: "Menu", exact: true });
  const sheet = own.getByRole("dialog", { name: "Project dashboard" });
  await toggle.click();
  await expect(sheet).toBeVisible();
  await own.mouse.click(370, 400);
  await expect(sheet).toBeHidden();
  await toggle.click();
  await sheet.getByRole("link", { name: "Languages" }).click();
  await expect(own).toHaveURL(/\/studio\/project\/languages$/);
  await expect(sheet).toBeHidden();
  // The bar names the page now open.
  await expect(toggle.locator("..")).toContainText("Languages");
  await own.setViewportSize({ width: 1280, height: 720 });
  await expect(own.getByRole("navigation", { name: "Project dashboard" }).getByRole("link", { name: "Languages" })).toHaveAttribute("aria-current", "page");
  await expect(toggle).toBeHidden();
  expect(problems).toEqual([]);
});
