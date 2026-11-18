import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 159 Sizes are automatic, by hand only when the owner wants it (Kech Flora,
 * 18 November: the bag of the bar over the stories three quarters of the way
 * across the phone). A store made from Leqaa's Rose hour: the bar of the
 * search, the wordmark and the bag is at its automatic size, across the
 * cover. Changing its width in the inspector or dragging a corner of it asks
 * first; Cancel leaves it automatic, Change by hand makes it the owner's;
 * Back to automatic (or a double click on a corner) puts it back. A corner
 * dragged up to the edge of the cover makes it Fill again. With
 * YALLAPP_SHOTS_DIR the inspector is pictured there, light and dark.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Kech Flora", email: `kech-flora-${suffix}@flowers.test`, password: "kech-flora-strong-password-1" };
/** Its own address, so this spec's sign-up doesn't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.159" };
const SHOTS = process.env.YALLAPP_SHOTS_DIR;
let own: Page;

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders, viewport: { width: 1440, height: 900 } });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+212 600 000 159");
  await own.getByLabel("Your website (optional)").fill(`https://kech-flora-${suffix}.flowers.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.autoSizeAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();

  // A store from Leqaa's Rose hour, its content kept in Yallapp.
  await own.goto("/studio/new");
  await own.getByRole("radio", { name: "Store", exact: true }).check();
  await own.getByRole("radio", { name: "No website: everything from here" }).click();
  await own.getByRole("radio", { name: /Rose hour/ }).click();
  await own.getByLabel("Project name").fill(client.name);
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
  await own.getByRole("link", { name: "Open the editor" }).first().click();
  await expect(own).toHaveURL(/\/studio\/editor$/);
});

test.afterAll(async () => {
  await own.close();
});

const phone = () => own.getByRole("main", { name: "The page in the phone" });
const inspector = () => own.getByRole("complementary", { name: "Design" });
const ask = () => own.getByRole("alertdialog", { name: "Change this element's size by hand?" });
const corners = () => phone().locator("[data-studio-handles-for]");
const mode = () => inspector().locator("[data-studio-size-mode]");
const widthSelect = () => inspector().getByRole("combobox", { name: "Width" });

/** The bar over the stories, selected: its wordmark clicked, then what holds it. */
async function selectBar(): Promise<Locator> {
  await phone().getByText(client.name, { exact: true }).first().click();
  await own.getByRole("toolbar", { name: "Copy, paste and move" }).getByRole("button", { name: "Select what holds it" }).click();
  // 174.2 The selection's corners are drawn on a layer over the phone (`[data-studio-handles-for]`), not inside it.
  const bar = phone().locator("[data-studio-selected]");
  await expect(corners().locator("[data-studio-resize]")).toHaveCount(4);
  return bar;
}

/** How wide the bar is next to the cover it lies on, in the phone's pixels. */
async function widths(bar: Locator): Promise<{ bar: number; cover: number }> {
  return bar.evaluate((el) => ({ bar: (el as HTMLElement).offsetWidth, cover: (el.parentElement?.closest("[data-studio-node]") as HTMLElement).offsetWidth }));
}

async function picture(name: string, what: Locator): Promise<void> {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await what.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

test("159 the bar over the stories is at its automatic size, across the cover", async () => {
  const bar = await selectBar();
  await expect(mode()).toHaveAttribute("data-studio-size-mode", "auto");
  await expect(mode()).toContainText("Automatic size");
  await expect(inspector().getByRole("button", { name: "Back to automatic" })).toHaveCount(0);
  await expect(widthSelect()).toHaveValue("fill");
  const w = await widths(bar);
  expect(w.bar).toBe(w.cover);
  await picture("inspector-automatic-light", inspector());
});

test("159 a change of its width asks first: Cancel leaves it automatic", async () => {
  const bar = await selectBar();
  await widthSelect().selectOption("hug");
  await expect(ask()).toBeVisible();
  await expect(ask()).toContainText("It stops following the automatic layout. You can put it back any time.");
  await picture("dialog-light", ask());
  await ask().getByRole("button", { name: "Cancel" }).click();
  await expect(ask()).toHaveCount(0);
  await expect(widthSelect()).toHaveValue("fill");
  await expect(mode()).toHaveAttribute("data-studio-size-mode", "auto");
  // Escape is Cancel too.
  await widthSelect().selectOption("fixed");
  await expect(ask()).toBeVisible();
  await own.keyboard.press("Escape");
  await expect(ask()).toHaveCount(0);
  await expect(widthSelect()).toHaveValue("fill");
  const w = await widths(bar);
  expect(w.bar).toBe(w.cover);
});

test("159 Change by hand makes the size the owner's; Back to automatic puts it back", async () => {
  const bar = await selectBar();
  await widthSelect().selectOption("fixed");
  await ask().getByRole("button", { name: "Change by hand" }).click();
  await expect(ask()).toHaveCount(0);
  await expect(mode()).toHaveAttribute("data-studio-size-mode", "hand");
  await expect(mode()).toContainText("Size set by hand");
  await expect(inspector().getByRole("spinbutton", { name: "Width", exact: true })).toHaveValue("100");
  expect((await widths(bar)).bar).toBe(100);
  // Now it changes freely: no more asking.
  await inspector().getByRole("spinbutton", { name: "Width", exact: true }).fill("240");
  await expect(ask()).toHaveCount(0);
  expect((await widths(bar)).bar).toBe(240);
  await picture("inspector-by-hand-light", inspector());

  await inspector().getByRole("button", { name: "Back to automatic" }).click();
  await expect(mode()).toHaveAttribute("data-studio-size-mode", "auto");
  await expect(widthSelect()).toHaveValue("fill");
  await expect(inspector().getByRole("spinbutton", { name: "Width", exact: true })).toHaveCount(0);
  const w = await widths(bar);
  expect(w.bar).toBe(w.cover);
});

test("159 a corner asks first; dragged up to the cover's edge it is Fill; a double click is back to automatic", async () => {
  const bar = await selectBar();
  // The part of the corner inside the bar: across the cover, its outer part lies past the phone's edge.
  const corner = corners().locator('[data-studio-resize="bottom-right"]');
  const at = (await corner.boundingBox())!;
  const x = at.x + 2;
  const y = at.y + 2;
  // A click alone asks nothing.
  await own.mouse.move(x, y);
  await own.mouse.down();
  await own.mouse.up();
  await expect(ask()).toHaveCount(0);
  // Dragged: Studio asks, nothing moves; Cancel.
  const drag = async (by: number) => {
    await own.mouse.move(x, y);
    await own.mouse.down();
    await own.mouse.move(x - by, y);
    await own.mouse.up();
  };
  await drag(40);
  await expect(ask()).toBeVisible();
  await ask().getByRole("button", { name: "Cancel" }).click();
  await expect(mode()).toHaveAttribute("data-studio-size-mode", "auto");
  let w = await widths(bar);
  expect(w.bar).toBe(w.cover);
  // Dragged again, Change by hand: then it drags.
  await drag(40);
  await ask().getByRole("button", { name: "Change by hand" }).click();
  await expect(mode()).toHaveAttribute("data-studio-size-mode", "hand");
  await own.mouse.move(x, y);
  await own.mouse.down();
  for (let i = 1; i <= 5; i += 1) await own.mouse.move(x - 18 * i, y);
  await own.mouse.up();
  await expect(inspector().getByRole("spinbutton", { name: "Width", exact: true })).toHaveValue(/^\d+$/);
  const narrower = Number(await inspector().getByRole("spinbutton", { name: "Width", exact: true }).inputValue());
  expect(narrower).toBeLessThan((await widths(bar)).cover - 60);
  // Back out to the cover's edge: Fill, as on every phone (it stayed a number before 159).
  const back = (await corners().locator('[data-studio-resize="bottom-right"]').boundingBox())!;
  await own.mouse.move(back.x + 2, back.y + 2);
  await own.mouse.down();
  for (let i = 1; i <= 6; i += 1) await own.mouse.move(back.x + 2 + 20 * i, back.y + 2);
  await own.mouse.up();
  await expect(widthSelect()).toHaveValue("fill");
  // A double click on a corner: back to automatic.
  // On the part of the corner inside the phone (the locator's own click would scroll the phone's screen sideways).
  const last = (await corners().locator('[data-studio-resize="bottom-right"]').boundingBox())!;
  await own.mouse.dblclick(last.x + 2, last.y + 2);
  await expect(mode()).toHaveAttribute("data-studio-size-mode", "auto");
  await expect(own.getByRole("status").filter({ hasText: "Back to its automatic size." })).toBeVisible();
  w = await widths(bar);
  expect(w.bar).toBe(w.cover);
});

test("159 the inspector and the question by night", async () => {
  if (!SHOTS) test.skip();
  await own.emulateMedia({ colorScheme: "dark" });
  await selectBar();
  await expect(mode()).toHaveAttribute("data-studio-size-mode", "auto");
  await picture("inspector-automatic-dark", inspector());
  await widthSelect().selectOption("fixed");
  await expect(ask()).toBeVisible();
  await picture("dialog-dark", ask());
  await own.screenshot({ path: path.join(SHOTS!, "editor-dialog-dark.png") });
  await ask().getByRole("button", { name: "Change by hand" }).click();
  await expect(mode()).toHaveAttribute("data-studio-size-mode", "hand");
  await picture("inspector-by-hand-dark", inspector());
  await inspector().getByRole("button", { name: "Back to automatic" }).click();
  await expect(mode()).toHaveAttribute("data-studio-size-mode", "auto");
  await own.emulateMedia({ colorScheme: "light" });
});
