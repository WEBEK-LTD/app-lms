import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * Phase 132.50–132.99, Studio's finishing touches: the account menu on
 * Studio's bar (the language, Your account and Team in Studio's own frame,
 * signing out), the overview's counts and first steps, the editor's bar in
 * one line, its Ctrl+S, phone QR code, heading and the search of each tab,
 * the preview opening on the draft until the first publish, and the
 * notices of a project with no plan yet saying what is the case.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Selin Polish", email: `studio-polish-${suffix}@studio.test`, password: "selin-polish-strong-password-1" };
/** Its own address, so this spec's sign-up doesn't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.132" };
let own: Page;
const problems: string[] = [];

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders, viewport: { width: 1440, height: 900 } });
  // Console errors and hydration warnings; not the fonts (no font server here) nor headless Chrome's WebGL notes,
  // nor the preview's own app (its fonts' downloads cut short when a test moves on: the dashboard is checked here).
  const browserNote = /was preloaded using link preload|WebGL|GL Driver Message/;
  own.on("console", (m) => {
    const from = m.location().url;
    if ((m.type() === "error" || m.type() === "warning") && !from.includes("/api/v1/fonts/") && !from.includes("/preview-app/") && !browserNote.test(m.text())) problems.push(`${m.type()} on ${own.url()}: ${m.text()}`);
  });
  own.on("pageerror", (e) => problems.push(`pageerror on ${own.url()}: ${e.message}`));
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0132");
  await own.getByLabel("Your website (optional)").fill(`https://studio-polish-${suffix}.studio.test`);
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

  // A Studio store, its content kept in Yallapp, from a blank page.
  await own.goto("/studio/new");
  await own.getByRole("radio", { name: /^Store( |$)/ }).check();
  await own.getByLabel("Project name").fill("Polish Store");
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: "Blank page" }).click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
});

test.afterAll(async () => {
  await own.close();
});

const menu = () => own.locator("[data-studio-account]");

test("132.51 Studio's bar has the account menu: who is signed in, the language, Your account, Team and Sign out", async () => {
  await own.goto("/studio");
  await expect(menu()).toHaveCount(1);
  await menu().locator("summary").click();
  await expect(menu()).toContainText(client.email);
  await expect(menu().getByRole("link", { name: "Your account" })).toHaveAttribute("href", "/studio/account");
  await expect(menu().getByRole("link", { name: "Team" })).toHaveAttribute("href", "/studio/team");
  await expect(menu().getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(menu().locator("[data-dashboard-languages]").getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");

  // The project's own bar has it too.
  await own.goto("/studio/project");
  await menu().locator("summary").click();
  await menu().getByRole("link", { name: "Your account" }).click();
  await expect(own).toHaveURL(/\/studio\/account$/);
  await expect(own.getByRole("heading", { level: 1, name: "Your account" })).toBeVisible();
  // Studio's frame: the way back to the project, the account and the team side by side, no dashboard menu.
  await expect(own.locator("[data-studio-back]")).toHaveAttribute("href", "/studio/project");
  await expect(own.locator("[data-studio-back]")).toContainText("Polish Store");
  const tabs = own.getByRole("navigation", { name: "Your account and team" });
  await expect(tabs.getByRole("link", { name: "Your account" })).toHaveAttribute("aria-current", "page");
  await expect(own.getByRole("navigation", { name: "Dashboard" })).toHaveCount(0);
  await tabs.getByRole("link", { name: "Team" }).click();
  await expect(own).toHaveURL(/\/studio\/team$/);
  await expect(own.getByRole("heading", { level: 1, name: "Team" })).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Team" })).toHaveAttribute("aria-current", "page");
});

test("132.50 the dashboard's account and team open in Studio's frame while a Studio project is open", async () => {
  await own.goto("/dashboard/account");
  await expect(own).toHaveURL(/\/studio\/account$/);
  await own.goto("/dashboard/team");
  await expect(own).toHaveURL(/\/studio\/team$/);
});

test("132.51 the language is changed from Studio's menu, right to left in Arabic, and back", async () => {
  await own.goto("/studio/project");
  await menu().locator("summary").click();
  await menu().locator("[data-dashboard-languages]").getByRole("button", { name: "العربية" }).click();
  await expect(own.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(own.locator("html")).toHaveAttribute("lang", "ar");
  // 132.64 The numbers in Latin digits, as everywhere in the dashboard; no "#" left from a plural.
  const meta = own.locator("#h-project").locator("xpath=../following-sibling::div[1]");
  await expect(meta).toContainText("صفح");
  await expect(meta).not.toContainText("#");
  await expect(own.getByRole("group", { name: "المشروع بالأرقام" })).toContainText(/\d/);
  await expect(own.getByRole("group", { name: "المشروع بالأرقام" })).not.toContainText(/[٠-٩]/);
  // 132.66 The Languages page hydrates in Arabic: the languages to add are named the same on the server and here (no console error below).
  await own.goto("/studio/project/languages");
  await expect(own.locator("select").first()).toBeVisible();
  await own.goto("/studio/project");
  // The page renders again in the language chosen; the menu may still be open.
  if (!(await menu().evaluate((d) => (d as HTMLDetailsElement).open))) await menu().locator("summary").click();
  await menu().locator("[data-dashboard-languages]").getByRole("button", { name: "English" }).click();
  await expect(own.locator("html")).toHaveAttribute("dir", "ltr");
});

test("132.62 the overview counts its pages and lists the owner's own products and publishing the design", async () => {
  await own.goto("/studio/project");
  const meta = own.locator("#h-project").locator("xpath=../following-sibling::div[1]");
  await expect(meta).toContainText(/\d+ pages?/);
  await expect(meta).not.toContainText("#");
  const steps = own.getByRole("list").filter({ hasText: "Design the pages in the editor" });
  const products = steps.getByRole("listitem").filter({ hasText: "Put in your own products" });
  await expect(products.getByRole("link", { name: "Open my products" })).toHaveAttribute("href", "/studio/project/catalog");
  const publish = steps.getByRole("listitem").filter({ hasText: "Publish your design from the editor" });
  await expect(publish.getByRole("link", { name: "Open the editor" })).toHaveAttribute("href", "/studio/editor");
});

test("132.60 before the first publish the preview opens on the draft, Published a tap away", async () => {
  await own.goto("/studio/project/preview");
  await expect(own.getByRole("link", { name: "Draft from Pages & look" })).toHaveAttribute("aria-current", "page");
  await expect(own.getByRole("link", { name: "Published" })).toHaveAttribute("href", "/dashboard/preview?pages=published");
  await own.getByRole("link", { name: "Published" }).click();
  await expect(own).toHaveURL(/pages=published$/);
  await expect(own.getByRole("link", { name: "Published" })).toHaveAttribute("aria-current", "page");
});

test("132.59 132.63 a project with no plan yet: notifications and analytics say so, and only Studio's plans are offered", async () => {
  await own.goto("/studio/project/notifications");
  await expect(own.getByText("This app isn't activated yet, so notifications aren't sent.")).toBeVisible();
  await expect(own.getByText("The app's plan has ended")).toHaveCount(0);
  await expect(own.getByText(/Upgrade to (Starter|Growth|Pro|Business)/)).toHaveCount(0);
  await own.goto("/studio/project/analytics");
  await expect(own.getByText(/Until it has a plan, this app keeps daily totals/)).toBeVisible();
  await expect(own.getByText(/Your Starter plan/)).toHaveCount(0);
});

test("132.52–132.61 the editor: one line of tools, Ctrl+S, the phone's QR code, its heading and the search of each tab", async () => {
  await own.goto("/studio/editor");
  // The screen's heading, for screen readers.
  await expect(own.getByRole("heading", { level: 1 })).toHaveText("Editor · Polish Store");
  // At 1440 pixels the bar is one line: Publish beside the pages' menu.
  const pages = await own.getByRole("button", { name: /^Page:/ }).boundingBox();
  const publish = await own.getByRole("button", { name: "Publish", exact: true }).boundingBox();
  expect(Math.abs(publish!.y + publish!.height / 2 - (pages!.y + pages!.height / 2))).toBeLessThan(8);

  // Ctrl+S: nothing left to save says so; after a change it saves now.
  const status = own.locator("header [role=status]");
  await own.keyboard.press("Control+s");
  await expect(status).toContainText("Everything is saved");
  await own.getByRole("button", { name: "Text", exact: true }).first().click();
  await expect(status).toContainText("Not saved yet");
  await own.keyboard.press("Control+s");
  await expect(status).toContainText("Saved just now");
  await own.getByRole("button", { name: "Shortcuts" }).click();
  await expect(own.getByRole("dialog", { name: "Shortcuts" })).toContainText("Ctrl S");
  await own.keyboard.press("Escape");

  // The phone's QR code: the preview with the saved draft.
  await own.getByRole("button", { name: "Open on my phone" }).click();
  const phone = own.getByRole("dialog", { name: "Open on my phone" });
  await expect(phone).toContainText("Scan it with your phone's camera");
  await expect(phone.locator("svg[data-qr]")).toHaveAttribute("data-qr", /\/preview-app\/index\.html\?token=p1\./);
  await own.keyboard.press("Escape");
  await expect(phone).toHaveCount(0);

  // Each tab's search says what it looks through, and says when nothing matches.
  await own.getByRole("tab", { name: "Templates" }).click();
  const search = own.getByPlaceholder("Search the templates");
  await search.fill("zzzz");
  await expect(own.locator("[data-studio-no-results]")).toBeVisible();
  await search.fill("");
  await own.getByRole("tab", { name: "Ready sections" }).click();
  await expect(own.getByPlaceholder("Search the ready sections")).toBeVisible();
});

test("132.67 translations typed and not saved: leaving by the menu asks first", async () => {
  // One of the app's texts typed in, not saved.
  await own.goto("/studio/project/languages");
  const row = own.locator('[data-row-id="languageName"]');
  await row.getByRole("textbox").fill("Polish Store");
  await expect(row).toContainText("Not saved");
  const overview = own.getByRole("navigation", { name: "Project dashboard" }).getByRole("link", { name: "Overview" });
  // Staying: the page and the text stay.
  own.once("dialog", (dialog) => {
    expect(dialog.message()).toBe("Leave without saving your changes?");
    void dialog.dismiss();
  });
  await overview.click();
  await expect(own).toHaveURL(/\/studio\/project\/languages$/);
  await expect(row.getByRole("textbox")).toHaveValue("Polish Store");
  // Leaving anyway.
  own.once("dialog", (dialog) => void dialog.accept());
  await overview.click();
  await expect(own).toHaveURL(/\/studio\/project$/);
});

test("132.68 a project's page that isn't there says so in Studio's frame, with the way back", async () => {
  await own.goto("/studio/project/catalog/999999");
  await expect(own.locator("[data-dashboard-not-found]")).toBeVisible();
  await expect(own.getByRole("heading", { level: 1, name: "This page isn't here" })).toBeVisible();
  await expect(own.getByRole("navigation", { name: "Project dashboard" })).toBeVisible();
  await own.getByRole("link", { name: "Back to the overview" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
  await expect(own.getByRole("group", { name: "The project in numbers" })).toBeVisible();
  // A 404's own console error isn't one of the page's; nor React's note (#419, at times) that the missing
  // product's page, behind its loading screen (catalog/[id]/loading.tsx, 132.10), was finished in the browser.
  problems.splice(0, problems.length, ...problems.filter((p) => !p.includes("404") && !p.includes("error #419")));
});

// ——— Round 2 (132.69–132.77) ———

test("132.69 an app with no plan says so the same way everywhere: No plan yet", async () => {
  await own.goto("/studio/project");
  await expect(own.getByRole("group", { name: "The project in numbers" })).toContainText("No plan yet");
  await own.goto("/studio/project/setup?step=branding");
  await expect(own.getByText("Plan: No plan yet", { exact: false })).toBeVisible();
  await own.goto("/studio/project/license");
  await expect(own.locator("dl").first()).toContainText("No plan yet");
});

test("132.70 132.77 Studio follows the dashboard's dark mode; its bar stays dark, its links meet AA in light", async () => {
  const frameBackground = () => own.locator("[data-studio-frame]").first().evaluate((el) => getComputedStyle(el).backgroundColor);
  const barBackground = () => own.locator("header").first().evaluate((el) => getComputedStyle(el).backgroundColor);
  await own.goto("/studio/project");
  expect(await frameBackground()).toBe("rgb(233, 229, 220)");
  // A deeper accent on the board: 5.2:1.
  expect(await own.locator("[data-studio-frame]").first().evaluate((el) => getComputedStyle(el).getPropertyValue("--color-accent").trim())).toBe("#a8360a");
  await own.emulateMedia({ colorScheme: "dark" });
  await own.reload();
  expect(await frameBackground()).toBe("rgb(16, 15, 38)");
  expect(await barBackground()).toBe("rgb(14, 13, 36)");
  await own.goto("/studio/editor");
  expect(await frameBackground()).toBe("rgb(16, 15, 38)");
  // The switch in the account menu: light again, whatever the system says.
  await own.goto("/studio/project");
  await own.locator("[data-studio-account] summary").click();
  await own.locator("[data-studio-account]").getByRole("button", { name: "Dark mode" }).click();
  await expect(own.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await frameBackground()).toBe("rgb(233, 229, 220)");
  await own.evaluate(() => localStorage.removeItem("yallapp-theme"));
  await own.emulateMedia({ colorScheme: "light" });
});

test("132.71 the preview can be shared: a signed link for a week", async () => {
  await own.goto("/studio/project/preview");
  const link = own.getByRole("textbox", { name: "The link to share" });
  const url = await link.inputValue();
  expect(url).toMatch(/\/preview-app\/index\.html\?token=p1\./);
  const expires = Number(decodeURIComponent(url.split("token=")[1]!).split(".")[2]);
  expect(expires * 1000 - Date.now()).toBeGreaterThan(6 * 86_400_000);
  await expect(own.locator("[data-preview-share]").getByRole("button", { name: "Copy the link" })).toBeVisible();
  // The editor's phone popover offers it too.
  await own.goto("/studio/editor");
  await own.getByRole("button", { name: "Open on my phone" }).click();
  await expect(own.locator("[data-studio-share]")).toHaveAttribute("data-studio-share", /token=p1\./);
  await own.keyboard.press("Escape");
});

test("132.73 132.74 the editor: a template seen before it's used, and the changes named with a click to go back", async () => {
  await own.goto("/studio/editor");
  const layers = own.locator('[role="tree"] [role="treeitem"]');
  const before = await layers.count();
  // A template: previewed, cancelled, nothing changed; then used.
  await own.getByRole("tab", { name: "Templates" }).click();
  await own.locator("[data-studio-template]").first().click();
  const preview = own.getByRole("dialog", { name: /^Preview: / });
  await expect(preview).toBeVisible();
  await preview.getByRole("button", { name: "Cancel" }).click();
  await expect(preview).toHaveCount(0);
  await own.getByRole("tab", { name: "Elements" }).click();
  await expect(layers).toHaveCount(before);
  await own.getByRole("tab", { name: "Templates" }).click();
  await own.locator("[data-studio-template]").first().click();
  await preview.getByRole("button", { name: "Use this template" }).click();
  await expect(preview).toHaveCount(0);
  // The changes, newest first; back to the first step in one click.
  await own.getByRole("tab", { name: "Elements" }).click();
  await own.getByRole("button", { name: "Text", exact: true }).first().click();
  await own.getByRole("button", { name: "Changes" }).click();
  const changes = own.getByRole("dialog", { name: "Changes" });
  await expect(changes.locator("[data-history-step]").first()).toContainText("Added Text");
  await expect(changes.locator('[aria-current="step"]')).toContainText("Added Text");
  await expect(changes).toContainText("Started Home from a template");
  await changes.locator("[data-history-step]").filter({ hasText: "Opened the editor" }).click();
  await expect(layers).toHaveCount(before);
  await own.getByRole("button", { name: "Redo" }).click();
  await own.getByRole("button", { name: "Undo" }).click();
});

test("132.75 Setup: a change not saved asks before the page is left", async () => {
  await own.goto("/studio/project/setup?step=branding");
  await own.getByLabel("App name", { exact: true }).fill("Polish Store Two");
  const overview = own.getByRole("navigation", { name: "Project dashboard" }).getByRole("link", { name: "Overview" });
  own.once("dialog", (dialog) => {
    expect(dialog.message()).toBe("Leave without saving your changes?");
    void dialog.dismiss();
  });
  await overview.click();
  await expect(own).toHaveURL(/step=branding$/);
  await expect(own.getByLabel("App name", { exact: true })).toHaveValue("Polish Store Two");
  own.once("dialog", (dialog) => void dialog.accept());
  await overview.click();
  await expect(own).toHaveURL(/\/studio\/project$/);
});

test("132.72 a project from a demo: the first steps docked beside the elements, folded and remembered", async () => {
  await own.goto("/start/rides/make?new=1");
  await own.getByLabel("Your app's name").fill("Polish Rides");
  await own.getByRole("button", { name: "Create my app" }).click();
  await expect(own).toHaveURL(/\/studio\/editor\?from=demo$/);
  const dock = own.locator("[data-first-steps-dock]");
  const panel = own.locator("[data-first-steps-float]");
  await expect(panel).toBeVisible();
  // On the elements' side: its far edge stops before the inspector.
  const box = await panel.boundingBox();
  const inspector = await own.getByRole("complementary", { name: "Design" }).boundingBox().catch(() => null);
  if (inspector) expect(box!.x + box!.width).toBeLessThanOrEqual(inspector.x + 1);
  await own.locator("[data-first-steps-fold]").click();
  await expect(panel).toBeHidden();
  await expect(own.locator("[data-first-steps-pill]")).toBeVisible();
  await own.reload();
  await expect(dock).toHaveAttribute("data-first-steps-dock", "folded");
  await expect(panel).toBeHidden();
  await own.locator("[data-first-steps-pill]").click();
  await expect(panel).toBeVisible();
});

test("132.76 the dashboard's Arabic is Egyptian on Setup", async () => {
  await own.goto("/studio/project");
  await menu().locator("summary").click();
  await menu().locator("[data-dashboard-languages]").getByRole("button", { name: "العربية" }).click();
  await expect(own.locator("html")).toHaveAttribute("dir", "rtl");
  await own.goto("/studio/project/setup?step=branding");
  await expect(own.getByRole("button", { name: "احفظ وكمّل" })).toBeVisible();
  await own.goto("/studio/project");
  if (!(await menu().evaluate((d) => (d as HTMLDetailsElement).open))) await menu().locator("summary").click();
  await menu().locator("[data-dashboard-languages]").getByRole("button", { name: "English" }).click();
  await expect(own.locator("html")).toHaveAttribute("dir", "ltr");
});

test("the pages opened here had no console errors", async () => {
  expect(problems).toEqual([]);
});
