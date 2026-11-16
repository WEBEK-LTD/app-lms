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

/** Console errors and hydration warnings on [page]. Not the fonts (this spec runs no font server), nor headless Chrome's notes on the app preview. */
function watch(page: Page): void {
  const browserNote = /was preloaded using link preload|WebGL|GL Driver Message|Failed to load resource/;
  page.on("console", (m) => {
    // Nor the app preview's own (the Flutter web app in its frame), which a quick move to the next page cuts off while it loads its fonts.
    const preview = m.location().url.includes("/preview-app/") || (page.url().endsWith("/studio/project/preview") && /Failed to load font|Failed to fetch/.test(m.text()));
    if ((m.type() === "error" || m.type() === "warning") && !preview && !m.location().url.includes("/api/v1/fonts/") && !browserNote.test(m.text())) {
      problems.push(`${m.type()} on ${page.url()}: ${m.text()}`);
    }
  });
  page.on("pageerror", (e) => problems.push(`pageerror on ${page.url()}: ${e.message}`));
}

/** A new tab of the same browser, signed in: each kind's pages in their own (a long run of maps and the app preview in one tab runs it out of memory). */
async function freshTab(): Promise<void> {
  const next = await own.context().newPage();
  watch(next);
  await own.close();
  own = next;
}

test.beforeAll(async ({ browser }) => {
  own = await (await browser.newContext({ extraHTTPHeaders, viewport: { width: 1280, height: 860 } })).newPage();
  watch(own);
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
  await own.context().close();
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

/** The side column's menu, in any language (the phone's sheet has one too, after it). */
const sideMenu = () => own.locator("nav:has([data-studio-search])").first();

for (const [i, kind] of KINDS.entries()) {
  test(`${kind}: every link of the menu opens in Studio's frame`, async () => {
    test.setTimeout(240_000);
    await freshTab();
    await newProject(kind, `Project ${i + 1}`.slice(0, 30));
    const links = await sideMenu()
      .locator("ul a[href]:not([target=_blank])")
      .evaluateAll((all) => all.map((a) => (a as HTMLAnchorElement).getAttribute("href")!));
    // The pages the owner missed are there.
    for (const page of ["/studio/project/media", "/studio/project/team", "/studio/project/protection", "/studio/project/preview", "/studio/project/stability", "/studio/project/announcements", "/studio/project/phones", "/studio/project/account", "/studio/project/integrations"]) {
      expect(links, page).toContain(page);
    }
    expect(new Set(links).size).toBe(links.length);
    const before = problems.length;
    for (const href of links) {
      // A page still finishing its own work (the app preview's frame) can cut the next navigation off once: then again.
      const response = await own.goto(href).catch(async (e: Error) => {
        if (!/ERR_ABORTED|frame was detached/.test(e.message)) throw e;
        await own.waitForLoadState("load");
        return own.goto(href);
      });
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
  const search = own.getByRole("combobox", { name: "Search pages" });
  // Once the page is live.
  await expect(async () => {
    await own.keyboard.press("Control+k");
    await expect(search).toBeFocused({ timeout: 1000 });
  }).toPass();
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

  // 132.4 The account's menu on the bar: every page about the account, in Studio's frame.
  const account = own.locator("[data-studio-account]");
  const accountPages: [string, RegExp][] = [
    ["Your account", /\/studio\/project\/account$/],
    ["Team", /\/studio\/project\/team$/],
    ["Plan", /\/studio\/project\/license$/],
    ["Invoices", /\/studio\/project\/invoices$/],
    ["Your phones", /\/studio\/project\/phones$/],
    ["Updates from Yallapp", /\/studio\/project\/announcements$/],
  ];
  for (const [name, url] of accountPages) {
    await account.locator("summary").click();
    await account.getByRole("link", { name, exact: true }).click();
    await expect(own).toHaveURL(url);
    await expect(own.locator("[data-studio-frame]")).toHaveCount(1);
    await expect(account).not.toHaveAttribute("open", "");
  }
  // Your account: two-step sign-in, signing out everywhere, Yallapp's emails and deleting the account.
  await own.goto("/studio/project/account");
  await expect(own.getByRole("heading", { name: "Your account", level: 1 })).toBeVisible();
  await expect(own.getByRole("heading", { name: "Two-step sign-in" })).toBeVisible();
  await expect(own.getByRole("heading", { name: "Delete your Yallapp account" })).toBeVisible();
  // The person at the menu's foot opens it too; the language and dark mode are in the account's menu.
  await own.goto("/studio/project");
  await sideMenu().getByRole("link", { name: new RegExp(client.name) }).click();
  await expect(own).toHaveURL(/\/studio\/project\/account$/);
  await account.locator("summary").click();
  await expect(account.getByRole("button", { name: "Dark mode" })).toBeVisible();
  await expect(account.getByRole("button", { name: "Sign out" })).toBeVisible();
  await own.keyboard.press("Escape");
  await expect(account).not.toHaveAttribute("open", "");

  // Dark: the frame's colours turn.
  const board = () => own.locator("[data-studio-frame]").evaluate((el) => getComputedStyle(el).backgroundColor);
  const light = await board();
  await sideMenu().getByRole("button", { name: "Dark mode" }).click();
  await expect.poll(board).not.toBe(light);
  await sideMenu().getByRole("button", { name: "Dark mode" }).click();
  await expect.poll(board).toBe(light);
  expect(problems).toEqual([]);
});
