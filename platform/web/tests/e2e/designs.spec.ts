import { expect, test, type Locator, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * Ready-made designs and the new page blocks (roadmap 33): the owner picks
 * a design in the Branding step, finds its blocks in Pages & look, adds one
 * of each new block, publishes, and the hosted API serves them; starting
 * from another design later replaces the draft only.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Bright Kids", email: `bright-${suffix}@kids.test`, password: "bright-strong-password-1" };
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.133" };
let own: Page;
let api = "";

const NEW_BLOCKS = ["Slider", "Notice", "Quick links", "Team", "Numbers", "Testimonials", "Questions", "Countdown", "Contact", "Opening hours", "Social links"];

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 01 33");
  await own.getByLabel("Your website (optional)").fill(`https://bright-${suffix}.kids.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.pagesAdminEmail);
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

test("the owner picks a design for their academy in the Branding step", async () => {
  await own.goto("/dashboard/app-type");
  await own.getByText("Academy", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();

  // The academy's four designs instead of three bare templates, and keeping the pages as they are.
  const design = own.getByRole("group", { name: "Design" });
  for (const name of ["Keep my pages", "Classic academy", "Online courses", "Coaching", "Kids academy"]) {
    await expect(design.getByRole("radio", { name: new RegExp(`^${name}`) })).toBeVisible();
  }
  await expect(design.getByRole("radio", { name: /^Keep my pages/ })).toBeChecked();
  await expect(design.getByRole("radio", { name: /^Fashion/ })).toHaveCount(0);

  await own.getByLabel("App name").fill("Bright Kids");
  await own.getByLabel("Name under the app icon").fill("Bright");
  await own.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [255, 183, 3]) });
  await expect(own.getByText("Replace file")).toBeVisible();
  // A design brings its template and font.
  await design.getByRole("radio", { name: /^Kids academy/ }).check();
  await expect(own.getByLabel("Template")).toHaveValue("bold");
  await expect(own.getByLabel("Font", { exact: true })).toHaveValue("Lexend");
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Store listing" })).toBeVisible();

  await own.goto("/dashboard/setup?step=branding");
  await expect(own.getByRole("group", { name: "Design" }).getByRole("radio", { name: /^Kids academy/ })).toBeChecked();
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
});

function pageRegion(): Locator {
  return own.getByRole("region", { name: /^Page: / });
}

test("Pages & look has the design's tabs, blocks and look, marked as samples", async () => {
  await own.goto("/dashboard/pages");
  const blocks = pageRegion().getByRole("list", { name: "Blocks" }).locator(":scope > li");
  await expect(blocks.first()).toContainText("Notice: Enrollment for the new term is open.");
  for (const name of ["Slider", "Quick links", "Opening hours", "Questions"]) await expect(blocks.filter({ hasText: name }).first()).toBeVisible();
  await expect(blocks.filter({ hasText: "Sample text" })).not.toHaveCount(0);
  // The FAQ's sample text is marked until the owner writes their own.
  const faq = blocks.filter({ hasText: "Questions" });
  await expect(faq).toContainText("Sample text");
  await faq.getByRole("button", { name: /^Questions/ }).click();
  // Typed once the editor answers (a slow machine may still be loading it).
  await expect(async () => {
    await faq.getByLabel("Question", { exact: true }).first().fill("When do lessons start?");
    await expect(faq).not.toContainText("Sample text", { timeout: 1000 });
  }).toPass();
  // 82.1 The real app is shown first; the quick view draws the draft at once.
  await own.getByRole("button", { name: "Quick view", exact: true }).click();
  await expect(own.getByRole("figure", { name: "Phone preview" })).toContainText("Fun lessons for curious kids");

  await own.getByRole("tab", { name: "Look" }).click();
  await expect(own.getByRole("radio", { name: "Bold" })).toBeChecked();
  await expect(own.getByLabel("Corners")).toHaveValue("round");
  await expect(own.getByLabel("Font", { exact: true })).toHaveValue("Lexend");
  await own.getByRole("tab", { name: "Pages" }).click();
});

test("the owner adds one of each new block from the grouped list and publishes", async () => {
  const region = pageRegion();
  // Grouped, with what each is for.
  for (const group of ["Content", "Lists", "Engage", "Contact", "Layout"]) await expect(region.getByRole("group", { name: group })).toBeVisible();
  await expect(region.getByRole("group", { name: "Contact" }).getByRole("button", { name: "Add Opening hours block" })).toContainText("Your hours, with Open now");

  const blocks = region.getByRole("list", { name: "Blocks" }).locator(":scope > li");
  for (const name of NEW_BLOCKS) {
    const before = await blocks.count();
    await region.getByRole("button", { name: `Add ${name} block` }).click();
    await expect(blocks).toHaveCount(before + 1);
    const settings = region.getByRole("group", { name: `Block ${before + 1} settings` });
    switch (name) {
      case "Slider":
        await settings.getByLabel("Heading", { exact: true }).nth(0).fill("Summer camp");
        await settings.getByLabel("Heading", { exact: true }).nth(1).fill("Art club");
        break;
      case "Notice":
        await settings.getByLabel("Text", { exact: true }).fill("Closed on Friday.");
        break;
      case "Team":
        await settings.getByLabel("Name", { exact: true }).fill("Ayse Demir");
        break;
      case "Numbers":
        for (let i = 0; i < 3; i += 1) {
          await settings.getByLabel("Number", { exact: true }).nth(i).fill(`${i + 1}0`);
          await settings.getByLabel("Label", { exact: true }).nth(i).fill(`Thing ${i + 1}`);
        }
        break;
      case "Testimonials":
        await settings.getByLabel("What they said").fill("My son loves it.");
        await settings.getByLabel("Name", { exact: true }).fill("Selin");
        break;
      case "Questions":
        await settings.getByLabel("Question", { exact: true }).fill("Is there parking?");
        await settings.getByLabel("Answer").fill("Yes, behind the school.");
        break;
      case "Countdown":
        await settings.getByLabel("Heading", { exact: true }).fill("Camp starts in");
        break;
      case "Contact":
        await settings.getByLabel("Phone number", { exact: true }).fill("+90 544 000 01 33");
        await settings.getByLabel("Address", { exact: true }).fill("Moda, Istanbul");
        break;
      case "Social links":
        await settings.getByLabel("Profile address").fill("https://instagram.com/brightkids");
        break;
    }
  }
  await expect(own.getByText("Draft saved")).toBeVisible();
  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(own.getByText("Published. Your app shows the new pages")).toBeVisible();
});

test("the hosted API serves the new blocks", async ({ request }) => {
  const nav = await (await request.get(`${api}/pages?platform=android`)).json();
  expect(nav.tabs.map((t: { label: string }) => t.label)).toEqual(["Home", "Courses", "My courses", "Account"]);
  const home = await (await request.get(`${api}/pages/home?platform=android`)).json();
  const types = home.blocks.map((b: { type: string }) => b.type);
  for (const type of ["slider", "quick_links", "testimonials", "faq", "countdown", "contact", "hours", "social", "team", "stats", "notice"]) expect(types, type).toContain(type);
  const byText = (type: string, field: string, value: string) => home.blocks.find((b: Record<string, unknown>) => b.type === type && JSON.stringify(b[field]).includes(value));
  expect(byText("slider", "slides", "Summer camp").slides.map((s: { heading: string }) => s.heading)).toEqual(["Summer camp", "Art club"]);
  expect(byText("contact", "phone", "+90")).toMatchObject({ phone: "+90 544 000 01 33", address: "Moda, Istanbul" });
  expect(byText("social", "profiles", "brightkids").profiles).toEqual([{ network: "instagram", url: "https://instagram.com/brightkids" }]);
  expect(byText("faq", "questions", "parking").questions).toEqual([{ question: "Is there parking?", answer: "Yes, behind the school." }]);
  expect(JSON.stringify(home)).not.toContain("translations");
});

test("starting from another design replaces the draft, not what's published", async ({ request }) => {
  await own.goto("/dashboard/pages");
  const designs = own.getByRole("region", { name: "Start from a design" });
  await designs.getByText("Show designs").click();
  await expect(designs.getByText("Your design")).toBeVisible();
  // 38 "Use this design" fits its button, also in four narrow columns.
  await own.setViewportSize({ width: 1360, height: 900 });
  for (const button of await designs.getByRole("button", { name: /^Use the / }).all()) {
    expect(await button.evaluate((b) => b.scrollHeight <= b.clientHeight + 1 && b.scrollWidth <= b.clientWidth + 1)).toBe(true);
  }
  await designs.getByRole("button", { name: "Use the Coaching design" }).click();
  await designs.getByRole("group", { name: "Switch to the Coaching design" }).getByRole("button", { name: "Use this design" }).click();
  await expect(own.getByText("Your draft now uses the Coaching design.")).toBeVisible();
  await expect(own.getByText("Unpublished changes")).toBeVisible();
  // Its About page and tab.
  await expect(own.getByRole("button", { name: "Duplicate About" })).toBeVisible();
  await own.getByRole("tab", { name: "Tabs" }).click();
  await expect(own.getByRole("group", { name: /^Tab 4/ }).getByLabel("Label")).toHaveValue("About");

  // The app still gets the published pages.
  const nav = await (await request.get(`${api}/pages?platform=android`)).json();
  expect(nav.tabs.map((t: { label: string }) => t.label)).toEqual(["Home", "Courses", "My courses", "Account"]);
  const home = await (await request.get(`${api}/pages/home?platform=android`)).json();
  expect(home.blocks.map((b: { type: string }) => b.type)).toContain("social");
});

test("84.2 a design comes with its About us and Contact pages in the side menu, and the colours chosen with it", async ({ request }) => {
  await own.goto("/dashboard/pages");
  const designs = own.getByRole("region", { name: "Start from a design" });
  await designs.getByText("Show designs").click();
  const card = designs.getByRole("listitem").filter({ has: own.getByRole("button", { name: "Use the Coaching design" }) });
  const colours = card.getByRole("group", { name: "Colours" }).getByRole("radio");
  await expect(colours).toHaveCount(3);
  await expect(colours.first()).toBeChecked();
  // The third colours: their second colour, as the swatch shows it.
  const third = card.getByRole("group", { name: "Colours" }).locator("label").nth(2);
  const swatch = await third.locator("span[aria-hidden]").nth(1).evaluate((el) => getComputedStyle(el).backgroundColor);
  const main = await third.locator("span[aria-hidden]").nth(0).evaluate((el) => getComputedStyle(el).backgroundColor);
  await third.click();
  await expect(colours.nth(2)).toBeChecked();
  await card.getByRole("button", { name: "Use the Coaching design" }).click();
  await designs.getByRole("group", { name: "Switch to the Coaching design" }).getByRole("button", { name: "Use this design" }).click();
  await expect(own.getByText("Your draft now uses the Coaching design.")).toBeVisible();

  // Its Contact page is in the side menu.
  await expect(own.getByRole("button", { name: "Duplicate Contact" })).toBeVisible();
  await own.getByRole("tab", { name: "Tabs" }).click();
  const menu = own.getByRole("region", { name: "Side menu" });
  await expect(menu.getByRole("group", { name: /^Menu entry/ }).filter({ has: own.getByRole("textbox", { name: "Label", exact: true }) })).not.toHaveCount(0);
  const labels = await menu.getByLabel("Label", { exact: true }).evaluateAll((inputs) => inputs.map((i) => (i as HTMLInputElement).value));
  expect(labels).toContain("Contact");

  // The second colour is the chosen one, and the app's main colour changed with it.
  await own.getByRole("tab", { name: /^Look/ }).click();
  const hex = (css: string) => `#${css.match(/\d+/g)!.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
  expect((await own.locator("#look-secondary").inputValue()).toLowerCase()).toBe(hex(swatch));
  const config = await (await request.get(`${api}/config?platform=android&app_version=1.0.0`)).json();
  expect(config.branding.primary_color.toLowerCase()).toBe(hex(main));
});

test("99.2 another design's look only, one step back, and everything with the owner's own pages kept", async () => {
  await own.goto("/dashboard/pages");
  // A page of the owner's own, which no design has.
  await own.getByLabel("New page title").fill("Timetable");
  await own.getByRole("button", { name: "Add page" }).click();
  await expect(own.getByRole("button", { name: "Duplicate Timetable" })).toBeVisible();
  await expect(own.getByText(/^Draft saved/)).toBeVisible();
  await own.getByRole("tab", { name: /^Look/ }).click();
  const corners = await own.locator("#look-corners").inputValue();
  await own.getByRole("tab", { name: "Pages", exact: true }).click();

  const designs = own.getByRole("region", { name: "Start from a design" });
  await designs.getByText("Show designs").click();
  await designs.getByRole("button", { name: "Use the Online courses design" }).click();
  const switching = designs.getByRole("group", { name: "Switch to the Online courses design" });
  await expect(switching.getByRole("figure")).toHaveCount(2);
  await switching.getByRole("radio", { name: /^Look only/ }).check();
  // Nothing to keep when the pages stay.
  await expect(switching.getByRole("checkbox")).toHaveCount(0);
  await switching.getByRole("button", { name: "Use this design" }).click();
  await expect(own.getByText("Your draft now has the Online courses design's look. Your pages stay as they are.")).toBeVisible();
  await expect(own.getByRole("button", { name: "Duplicate Timetable" })).toBeVisible();
  await own.getByRole("tab", { name: /^Look/ }).click();
  await expect(own.locator("#look-corners")).toHaveValue("round");
  expect(corners).not.toBe("round");

  // One step back.
  await own.getByRole("status").getByRole("button", { name: "Undo" }).click();
  await expect(own.getByText("Your draft is back as it was before the design.")).toBeVisible();
  await expect(own.locator("#look-corners")).toHaveValue(corners);

  // Everything, keeping the owner's page in the side menu.
  await own.getByRole("tab", { name: "Pages", exact: true }).click();
  await designs.getByText("Show designs").click();
  await designs.getByRole("button", { name: "Use the Kids academy design" }).click();
  const kids = designs.getByRole("group", { name: "Switch to the Kids academy design" });
  await expect(kids.getByRole("checkbox", { name: "Keep my other pages (1) in the side menu" })).toBeChecked();
  await kids.getByRole("button", { name: "Use this design" }).click();
  await expect(own.getByText("Your draft now uses the Kids academy design.")).toBeVisible();
  await expect(own.getByRole("button", { name: "Duplicate Timetable" })).toBeVisible();
  await own.getByRole("tab", { name: "Tabs" }).click();
  const labels = await own.getByRole("region", { name: "Side menu" }).getByLabel("Label", { exact: true }).evaluateAll((inputs) => inputs.map((i) => (i as HTMLInputElement).value));
  expect(labels).toContain("Timetable");

  // From the Branding step too: another design's look only.
  await own.goto("/dashboard/setup?step=branding");
  const design = own.getByRole("group", { name: "Design" });
  await expect(own.getByRole("group", { name: "From this design, take" })).toHaveCount(0);
  await design.getByRole("radio", { name: /^Coaching/ }).check();
  await own.getByRole("group", { name: "From this design, take" }).getByRole("radio", { name: "Its look only (my pages stay)" }).check();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Store listing" })).toBeVisible();
  await own.goto("/dashboard/pages");
  await expect(own.getByRole("button", { name: "Duplicate Timetable" })).toBeVisible();
  await own.getByRole("tab", { name: /^Look/ }).click();
  await expect(own.locator("#look-corners")).toHaveValue("sharp");
});

test("99.3 a block's style and where it shows, copied to another page; the page's background and picture", async ({ request }) => {
  await own.goto("/dashboard/pages");
  const first = own.getByRole("list", { name: "Blocks" }).getByRole("listitem").first();
  const id = (await first.getAttribute("id"))!.replace(/^block-/, "");
  await first.locator("[aria-expanded]").click();
  const settings = own.getByRole("group", { name: "Block 1 settings" });
  await settings.getByLabel("Text position").selectOption("center");
  await settings.getByLabel("Text size").selectOption("large");
  // Only on iPhones.
  await settings.getByRole("group", { name: "Shows on" }).getByLabel("Android").uncheck();
  // A copy on the owner's Timetable page.
  await settings.getByLabel("Copy to another page").selectOption({ label: "Timetable" });
  await settings.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(own.getByText("Copied to Timetable.")).toBeVisible();
  // The page's background and the picture across its top.
  await own.getByLabel("Page background").selectOption("tint");
  await own.getByLabel("Picture at the top").fill("https://yallapp.test/m/top.jpg");
  await own.getByRole("button", { name: "Quick view", exact: true }).click();
  await expect(own.locator("[data-page-header]")).toHaveAttribute("src", "https://yallapp.test/m/top.jpg");
  await expect(own.locator("[data-block-look]").first()).toHaveAttribute("data-block-look", "none medium center large");
  await expect(own.getByText(/^Draft saved/)).toBeVisible();
  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(own.getByText("Published. Your app shows the new pages")).toBeVisible();

  const page = async (slug: string, platform: string) => (await request.get(`${api}/pages/${slug}?platform=${platform}`)).json();
  const android = await page("home", "android");
  expect(android).toMatchObject({ background: "tint", header_image_url: "https://yallapp.test/m/top.jpg" });
  expect(android.blocks.map((b: { id: string }) => b.id)).not.toContain(id);
  const ios = await page("home", "ios");
  expect(ios.blocks.find((b: { id: string }) => b.id === id)).toMatchObject({ look: { background: "none", spacing: "medium", align: "center", text_size: "large" } });
  expect(ios.blocks.find((b: { id: string }) => b.id === id)).not.toHaveProperty("show");
  const timetable = await page("timetable", "ios");
  expect(timetable.blocks.at(-1)).toMatchObject({ type: ios.blocks.find((b: { id: string }) => b.id === id).type, look: { align: "center" } });
});

test("99.4 cards, a gallery, a location, a divider and a form; the form's answers go to the business", async ({ request }) => {
  await own.goto("/dashboard/pages");
  const region = pageRegion();
  const blocks = region.getByRole("list", { name: "Blocks" }).locator(":scope > li");
  const add = async (name: string) => {
    const before = await blocks.count();
    await region.getByRole("button", { name: `Add ${name} block` }).click();
    await expect(blocks).toHaveCount(before + 1);
    return region.getByRole("group", { name: `Block ${before + 1} settings` });
  };
  const cards = await add("Cards");
  await cards.getByLabel("Columns").selectOption("3");
  await cards.getByLabel("Title", { exact: true }).nth(0).fill("Swimming");
  await cards.getByLabel("Title", { exact: true }).nth(1).fill("Robotics");
  const gallery = await add("Photo gallery");
  await gallery.getByLabel("Image address", { exact: true }).fill("https://yallapp.test/m/hall.jpg");
  const map = await add("Location");
  await map.getByLabel("Latitude").fill("41.0082");
  await map.getByLabel("Longitude").fill("28.9784");
  await add("Divider");
  const form = await add("Form");
  await expect(form.getByLabel("Send the answers to")).toHaveValue("email");
  const formId = (await blocks.last().getAttribute("id"))!.replace(/^block-/, "");
  // The quick view draws them.
  await own.getByRole("button", { name: "Quick view", exact: true }).click();
  for (const kind of ["cards", "gallery", "map", "form"]) await expect(own.locator(`[data-preview-${kind}]`)).toBeVisible();
  await expect(own.getByText(/^Draft saved/)).toBeVisible();
  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(own.getByText("Published. Your app shows the new pages")).toBeVisible();

  const home = await (await request.get(`${api}/pages/home?platform=android`)).json();
  const types = home.blocks.map((b: { type: string }) => b.type);
  for (const type of ["cards", "gallery", "map", "divider", "form"]) expect(types, type).toContain(type);
  expect(home.blocks.find((b: { type: string }) => b.type === "cards")).toMatchObject({ columns: 3, cards: [{ title: "Swimming" }, { title: "Robotics" }] });

  const send = (answers: Record<string, string>) => request.post(`${api}/forms/home/${formId}`, { data: { answers }, headers: { "x-forwarded-for": "198.51.100.99" } });
  const wrong = await send({ name: "Ayşe", email: "not an email" });
  expect(wrong.status()).toBe(400);
  expect(await wrong.json()).toMatchObject({ code: "invalid_answers", details: { fields: { email: "Enter a valid email address." } } });
  expect((await send({ name: "Ayşe", email: "ayse@example.com", message: "Is there a trial lesson?" })).status()).toBe(202);
});
