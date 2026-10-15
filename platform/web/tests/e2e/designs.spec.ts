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
  await expect(own.getByLabel("Font")).toHaveValue("Lexend");
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
  await faq.getByLabel("Question", { exact: true }).first().fill("When do lessons start?");
  await expect(faq).not.toContainText("Sample text");
  await expect(own.getByRole("figure", { name: "Phone preview" })).toContainText("Fun lessons for curious kids");

  await own.getByRole("tab", { name: "Look" }).click();
  await expect(own.getByRole("radio", { name: "Bold" })).toBeChecked();
  await expect(own.getByLabel("Corners")).toHaveValue("round");
  await expect(own.getByLabel("Font")).toHaveValue("Lexend");
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
  own.once("dialog", (dialog) => void dialog.accept());
  await designs.getByRole("button", { name: "Use the Coaching design" }).click();
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
