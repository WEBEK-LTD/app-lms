import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 132.1–132.4 A Studio project's menu (roadmap 132): a company makes a
 * Studio project of every kind and opens every link of its menu. Each page
 * opens in Studio's frame with its menu, with no error on the page or in
 * the browser's console; the quick search (Ctrl+K) opens a page; the menu
 * fits a phone as a sheet and reads in Arabic; the frame turns dark.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Leila Studio", email: `studio-nav-${suffix}@studio.test`, password: "leila-studio-strong-password-1" };
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.212" };
let own: Page;
const problems: string[] = [];

/** Each kind as /studio/new names it (its radio's name starts with it). */
const KINDS = [
  "Academy",
  "Store",
  "Restaurant & café",
  "Bookings",
  "Clinic",
  "Gym & fitness",
  "Services & companies",
  "Real estate",
  "News & blog",
  "Events & tickets",
  "Charity & donations",
  "Delivery and couriers company",
  "Food delivery from many restaurants",
  "Marketplace: restaurants, supermarkets and stores",
  "Rides, like Uber",
  "Live taxi on the map",
  "An academy with many teachers",
  "A school for students, parents and teachers",
  "Travel: hotels and flights",
];

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders, viewport: { width: 1280, height: 860 } });
  // Console errors and hydration warnings. Not the fonts (this spec runs no font server), nor headless Chrome's notes on the app preview.
  const browserNote = /was preloaded using link preload|WebGL|GL Driver Message|Failed to load resource/;
  own.on("console", (m) => {
    if ((m.type() === "error" || m.type() === "warning") && !m.location().url.includes("/api/v1/fonts/") && !browserNote.test(m.text())) {
      problems.push(`${m.type()} on ${own.url()}: ${m.text()}`);
    }
  });
  own.on("pageerror", (e) => problems.push(`pageerror on ${own.url()}: ${e.message}`));
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0212");
  await own.getByLabel("Your website (optional)").fill(`https://studio-nav-${suffix}.studio.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  // The same team member as studio-setup.spec.ts: one sign-in each, under the limit per address.
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

/** A new Studio project of a kind, its content kept in Yallapp, from a blank page. */
async function newProject(kind: string, name: string): Promise<void> {
  await own.goto("/studio/new");
  await own.getByRole("radio", { name: new RegExp(`^${kind.replace(/[()&:,]/g, "\\$&")}( |$)`) }).first().check();
  await own.getByLabel("Project name").fill(name);
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: "Blank page" }).click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
}

const sideMenu = () => own.locator("nav[aria-label='Project dashboard']").first();

for (const [i, kind] of KINDS.entries()) {
  test(`${kind}: every link of the menu opens in Studio's frame`, async () => {
    test.setTimeout(240_000);
    await newProject(kind, `Project ${i + 1}`.slice(0, 30));
    const links = await sideMenu()
      .locator("a[href]:not([target=_blank])")
      .evaluateAll((all) => all.map((a) => (a as HTMLAnchorElement).getAttribute("href")!));
    // The pages the owner missed are there.
    for (const page of ["/studio/project/media", "/studio/project/team", "/studio/project/protection", "/studio/project/preview", "/studio/project/stability", "/studio/project/announcements", "/studio/project/phones", "/studio/project/account", "/studio/project/integrations"]) {
      expect(links, page).toContain(page);
    }
    expect(new Set(links).size).toBe(links.length);
    const before = problems.length;
    for (const href of links) {
      const response = await own.goto(href);
      expect(response?.status() ?? 0, href).toBeLessThan(400);
      const url = new URL(own.url());
      expect(url.pathname, href).toMatch(/^\/studio(\/|$)/);
      await expect(own.locator("body"), href).not.toContainText(/Application error|Something went wrong|This page could not be found/);
      if (href === "/studio/editor") {
        await expect(own.getByRole("link", { name: "Yallapp Studio" }).first(), href).toBeVisible();
        continue;
      }
      // In Studio's frame, with its menu and the page open marked.
      await expect(own.locator("[data-studio-frame]"), href).toHaveCount(1);
      await expect(sideMenu().locator("a[aria-current=page]"), href).toHaveCount(1);
    }
    expect(problems.slice(before)).toEqual([]);
  });
}

test("the quick search, the groups, the phone's sheet, Arabic and the dark frame", async () => {
  await own.goto("/studio/project");
  // Ctrl+K: type, then Enter.
  await own.keyboard.press("Control+k");
  const search = own.getByRole("combobox", { name: "Search pages" });
  await expect(search).toBeFocused();
  await search.fill("med");
  await expect(own.locator("[data-studio-palette] [role=option]").first()).toHaveAttribute("data-palette-href", "/studio/project/media");
  await search.press("Enter");
  await expect(own).toHaveURL(/\/studio\/project\/media$/);
  // A group folds away and stays folded on the next page; the one with the page open stays open.
  const publish = sideMenu().getByRole("button", { name: /Publishing/ });
  await publish.click();
  await expect(publish).toHaveAttribute("aria-expanded", "false");
  await own.goto("/studio/project/languages");
  await expect(sideMenu().getByRole("button", { name: /Publishing/ })).toHaveAttribute("aria-expanded", "false");
  await own.goto("/studio/project/builds");
  await expect(sideMenu().getByRole("button", { name: /Publishing/ })).toHaveAttribute("aria-expanded", "true");
  await expect(sideMenu().getByRole("link", { name: "Builds" })).toHaveAttribute("aria-current", "page");

  // A phone: the page open, the search and the menu as a sheet.
  await own.setViewportSize({ width: 390, height: 844 });
  await own.goto("/studio/project/media");
  await own.getByRole("button", { name: "Menu" }).click();
  const sheet = own.getByRole("dialog", { name: "Project dashboard" });
  await expect(sheet.getByRole("link", { name: "Media" })).toHaveAttribute("aria-current", "page");
  await sheet.getByRole("link", { name: "Team" }).click();
  await expect(own).toHaveURL(/\/studio\/project\/team$/);
  await expect(sheet).toBeHidden();
  const width = await own.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);

  // In Arabic, from the menu's own switcher, and back.
  await own.setViewportSize({ width: 1280, height: 860 });
  await own.goto("/studio/project");
  await sideMenu().getByRole("button", { name: "العربية" }).click();
  await expect(own.locator("html")).toHaveAttribute("lang", "ar");
  await expect(sideMenu().getByRole("link", { name: "الوسائط" })).toBeVisible();
  await expect(own.locator("[data-studio-frame]")).toHaveAttribute("dir", "rtl");
  await sideMenu().getByRole("button", { name: "English" }).click();
  await expect(own.locator("html")).toHaveAttribute("lang", "en");

  // Dark: the frame's colours turn.
  const board = () => own.locator("[data-studio-frame]").evaluate((el) => getComputedStyle(el).backgroundColor);
  const light = await board();
  await sideMenu().getByRole("button", { name: "Dark mode" }).click();
  await expect.poll(board).not.toBe(light);
  await sideMenu().getByRole("button", { name: "Dark mode" }).click();
  await expect.poll(board).toBe(light);
  expect(problems).toEqual([]);
});
