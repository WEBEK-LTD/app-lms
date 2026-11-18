import { expect, test, type Locator, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 174 Studio's QA on Leqaa's flower shop (Rose hour), fixed at the root:
 * Pill corners save (and saving goes on), a selected element's corners can
 * be grabbed whatever clips it, the Motion tab says what the plan leaves
 * out, the texts still the template's [placeholders] are said before
 * Publish and listed under What's missing with a jump to each, the canvas's
 * sample coupon is marked, and a review's Stars show the 5 drawn.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Kech Flora", email: `studio-qa-${suffix}@studio.test`, password: "kech-flora-strong-password-174" };
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.174" };
let own: Page;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  own = await (await browser.newContext({ extraHTTPHeaders, viewport: { width: 1440, height: 900 } })).newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+212 600 000 174");
  await own.getByLabel("Your website (optional)").fill(`https://studio-qa-${suffix}.studio.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.studioQaAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();

  await own.goto("/studio/new");
  await own.getByRole("radio", { name: /^Store( |$)/ }).first().check();
  await own.getByLabel("Project name").fill("Kech Flora");
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: /Rose hour/ }).first().click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
});

test.afterAll(async () => {
  await own.context().close();
});

const phoneOf = (page: Page) => page.getByRole("main", { name: "The page in the phone" });
const inspectorOf = (page: Page) => page.getByRole("complementary", { name: "Design" });
const saved = (page: Page) => expect(page.getByRole("status").filter({ hasText: /Saved/ }).first()).toBeVisible({ timeout: 15_000 });

/** The element under the middle of `handle` is the handle itself (nothing clips it or covers it). */
async function reachable(handle: Locator): Promise<boolean> {
  return handle.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === el;
  });
}

test("174.1 Pill corners save, a later edit is kept after a reload, and Publish stays on", async () => {
  await own.goto("/studio/editor");
  const phone = phoneOf(own);
  const inspector = inspectorOf(own);
  await phone.getByText("Collections", { exact: true }).first().click();
  await inspector.getByRole("group", { name: "Ready values" }).first().getByRole("button", { name: "Pill" }).click();
  await saved(own);
  await expect(own.getByRole("status").filter({ hasText: "Not saved" })).toHaveCount(0);
  await inspector.getByLabel("Text", { exact: true }).fill("Our collections");
  await saved(own);
  await own.reload();
  await expect(phoneOf(own).getByText("Our collections", { exact: true }).first()).toBeVisible();
  await expect(own.getByRole("button", { name: "Publish", exact: true })).toBeEnabled();
});

test("174.2 a rounded button's corner handles can be grabbed: a drag sizes it, a double click gives its size back", async () => {
  await own.goto("/studio/editor");
  const phone = phoneOf(own);
  const inspector = inspectorOf(own);
  await phone.getByText("Start", { exact: true }).first().click();
  const corner = phone.locator('[data-studio-resize="bottom-right"]');
  await expect(corner).toHaveCount(1);
  await corner.scrollIntoViewIfNeeded();
  expect(await reachable(corner)).toBe(true);
  const at = (await corner.boundingBox())!;
  await own.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
  await own.mouse.down();
  for (let i = 1; i <= 5; i += 1) await own.mouse.move(at.x + at.width / 2 + 8 * i, at.y + at.height / 2 + 2 * i);
  await own.mouse.up();
  await expect(inspector.getByRole("spinbutton", { name: "Width", exact: true })).toHaveValue(/^\d+$/);
  await phone.locator('[data-studio-resize="top-left"]').dblclick();
  await expect(inspector.getByRole("spinbutton", { name: "Width", exact: true })).toHaveCount(0);
  // A full-width row: its handles are on the phone's frame, still reachable.
  await phone.getByText("Collections", { exact: true }).first().click();
  await own.keyboard.press("Escape");
});

test("174.4 the Motion tab says the plan leaves motion out, and what a plan with it turns on", async () => {
  await own.goto("/studio/editor");
  await phoneOf(own).getByText("Kind words", { exact: true }).first().click();
  await inspectorOf(own).getByRole("tab", { name: "Motion" }).click();
  const note = own.locator("[data-motion-off-plan]");
  await expect(note).toContainText("Motion isn't on your plan");
  await expect(note).toContainText("A plan with Motion in the editor turns on");
  await expect(note.getByRole("link", { name: "See the plans" })).toHaveAttribute("href", "/studio/project/license");
});

test("174.7 a review's Stars show the 5 stars drawn", async () => {
  await own.goto("/studio/editor");
  const phone = phoneOf(own);
  await phone.locator("[data-studio-node]").filter({ has: own.getByRole("img", { name: "5 / 5" }) }).last().click();
  await expect(inspectorOf(own).getByRole("spinbutton", { name: "Stars" }).first()).toHaveValue("5");
});

test("174.5 the template's [placeholders] are said before Publish and listed under What's missing, with a jump", async () => {
  await own.goto("/studio/editor");
  const toWrite = own.locator("[data-studio-to-write]");
  await expect(toWrite).toBeVisible();
  expect(Number(await toWrite.getAttribute("data-studio-to-write"))).toBeGreaterThan(0);
  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(own.getByText(/^Published\. The app shows it the next time it opens\. \d+ texts in \[brackets\] stay out of the app until you write them\.$/)).toBeVisible();

  await own.goto("/studio/project/preview");
  const missing = own.locator("#missing");
  await expect(missing).toContainText("[Another customer's words]");
  const jump = missing.locator("[data-placeholder-spot]").filter({ hasText: "[Another customer's words]" }).getByRole("link").first();
  await expect(jump).toHaveAttribute("href", /\/studio\/editor\?page=home&select=/);
  const href = (await jump.getAttribute("href"))!;
  const id = new URL(href, E2E.baseURL).searchParams.get("select")!;
  await jump.click();
  await expect(own).toHaveURL(/\/studio\/editor\?page=home&select=/);
  // The element still to write is the one selected: its corners are drawn.
  await expect(phoneOf(own).locator(`[data-studio-handles-for="${id}"]`)).toHaveCount(1);
});

test("174.6 the Overview's canvas marks the demo's coupon as a sample", async () => {
  await own.goto("/studio/project");
  const sample = own.locator("[data-studio-coupon-sample]");
  await expect(sample).toHaveCount(1);
  await expect(sample).toContainText("Sample");
});
