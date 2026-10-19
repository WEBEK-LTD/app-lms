import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 57 The dashboard's bell, "Notifications from Yallapp": the team publishes
 * an Update (also a banner) and a bell-only Maintenance notice; the client
 * sees 2 unread, opens the bell, sees both and the count clears; our team
 * member managing the same dashboard still has both unread (read state is
 * per person); "See all" lists them; the overview's banner has only the
 * one marked as a banner. On the memory store, and on MariaDB with
 * E2E_DATABASE_URL.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so its sign-up never uses up the shared sign-up limit of the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.57" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Linden Academy", email: `linden-${suffix}@school.test`, password: "linden-strong-password-1" };
const update = `Faster builds ${suffix}`;
const maintenance = `Planned maintenance ${suffix}`;
const announcementUrls: string[] = [];
let clientId = "";
let admin: Page;
let own: Page;

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 57");
  await own.getByLabel("Your website (optional)").fill(`https://linden-${suffix}.school.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.bellAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  const panel = admin.getByRole("complementary");
  await panel.getByLabel("Plan").selectOption("starter");
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  clientId = new URL(admin.url()).searchParams.get("client") ?? "";
  expect(clientId).toMatch(/^[0-9a-f-]{36}$/);

  // An academy without a website, to reach the overview.
  await own.goto("/dashboard/app-type");
  await own.getByText("Academy", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
});

test.afterAll(async () => {
  // The announcements go, so the other specs' clients never see them.
  for (const url of announcementUrls) {
    await admin.goto(url);
    await admin.getByRole("button", { name: "Delete" }).click();
    await expect(admin.getByText("Announcement deleted.")).toBeVisible();
  }
  await own.close();
  await admin.close();
});

/** The bell in the dashboard's top bar. */
const bell = (page: Page) => page.getByRole("button", { name: /^Notifications from Yallapp/ });
const panelOf = (page: Page) => page.getByRole("dialog", { name: "Notifications from Yallapp" });

test("the team publishes an Update and a bell-only Maintenance notice", async () => {
  await admin.goto("/admin/announcements/new");
  await admin.getByLabel("Title", { exact: true }).fill(update);
  await admin.getByLabel("Message", { exact: true }).fill("Android builds now take **half** the time.");
  await admin.getByRole("radio", { name: "All clients" }).check();
  await admin.getByRole("radio", { name: "Update", exact: true }).check();
  // "Show as a banner too" is the default.
  await expect(admin.getByRole("radio", { name: /^Show as a banner too/ })).toBeChecked();
  await admin.getByRole("button", { name: "Publish announcement" }).click();
  await expect(admin.getByText("Announcement published.")).toBeVisible();
  announcementUrls.push(admin.url().replace(/\?.*$/, ""));

  await admin.goto("/admin/announcements/new");
  await admin.getByLabel("Title", { exact: true }).fill(maintenance);
  await admin.getByLabel("Message", { exact: true }).fill("Builds pause tonight from 22:00 to 23:00 UTC.");
  await admin.getByRole("radio", { name: "All clients" }).check();
  await admin.getByRole("radio", { name: "Maintenance", exact: true }).check();
  await admin.getByRole("radio", { name: /^Bell only/ }).check();
  // 57 A Turkish text next to the English one; an Arabic title without its message is refused.
  await admin.getByText("Arabic and Turkish (optional)").click();
  await admin.getByLabel("Arabic title").fill("صيانة مجدولة");
  await admin.getByLabel("Turkish title").fill("Planlı bakım");
  await admin.getByLabel("Turkish message").fill("Derlemeler bu gece 22:00 ile 23:00 arasında durur.");
  await admin.getByRole("button", { name: "Publish announcement" }).click();
  await expect(admin.getByText("Enter the message too, or remove the title.")).toBeVisible();
  await admin.getByLabel("Arabic title").fill("");
  await admin.getByRole("button", { name: "Publish announcement" }).click();
  await expect(admin.getByText("Announcement published.")).toBeVisible();
  announcementUrls.push(admin.url().replace(/\?.*$/, ""));
  await expect(admin.getByLabel("Turkish title")).toHaveValue("Planlı bakım");
  await expect(admin.getByRole("radio", { name: /^Bell only/ })).toBeChecked();
  await expect(admin.getByRole("radio", { name: "Maintenance", exact: true })).toBeChecked();

  await admin.goto("/admin/announcements");
  await expect(admin.getByRole("row", { name: new RegExp(maintenance) })).toContainText("Maintenance · bell only");
  await expect(admin.getByRole("row", { name: new RegExp(update) })).toContainText("Update");
});

test("the client sees 2 unread, opens the bell, sees both, and the count clears", async () => {
  await own.goto("/dashboard");
  await expect(bell(own)).toHaveAccessibleName("Notifications from Yallapp, 2 unread");
  await expect(bell(own).locator("[data-badge]")).toHaveText("2");
  await expect(panelOf(own)).toBeHidden();

  // The overview's banner has only the one marked as a banner.
  await expect(own.getByRole("region", { name: `Announcement: ${update}` })).toContainText("Android builds now take half the time.");
  await expect(own.getByRole("region", { name: `Announcement: ${maintenance}` })).toHaveCount(0);

  await bell(own).click();
  const panel = panelOf(own);
  await expect(panel).toBeVisible();
  await expect(own.getByRole("heading", { name: "Notifications from Yallapp" })).toBeFocused();
  const items = panel.getByRole("list", { name: "Newest notifications" }).getByRole("listitem");
  const maintenanceItem = items.filter({ hasText: maintenance });
  const updateItem = items.filter({ hasText: update });
  await expect(maintenanceItem).toContainText("Maintenance");
  await expect(maintenanceItem).toContainText("Builds pause tonight from 22:00 to 23:00 UTC.");
  await expect(updateItem).toContainText("Update");
  await expect(updateItem).toContainText("Android builds now take half the time.");
  // Newest first, both marked new while the panel is open.
  await expect(items.first()).toContainText(maintenance);
  await expect(maintenanceItem).toHaveAttribute("data-new", "");
  await expect(updateItem).toHaveAttribute("data-new", "");
  // Opening it read them: the count clears.
  await expect(bell(own)).toHaveAccessibleName("Notifications from Yallapp");
  await expect(bell(own).locator("[data-badge]")).toHaveCount(0);

  // Escape closes it and focus goes back to the bell.
  await own.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(bell(own)).toBeFocused();

  // Still read after a reload; the items are no longer new.
  await own.reload();
  await expect(bell(own)).toHaveAccessibleName("Notifications from Yallapp");
  await bell(own).click();
  await expect(panelOf(own).locator("[data-new]")).toHaveCount(0);
  await expect(panelOf(own).getByRole("button", { name: "Mark all as read" })).toHaveCount(0);
  // A click outside closes it.
  await own.mouse.click(1200, 680);
  await expect(panelOf(own)).toBeHidden();
});

test("our team member managing the same dashboard still has both unread", async () => {
  await admin.goto(`/admin/clients/${clientId}`);
  await admin.getByRole("button", { name: "Edit their app settings" }).click();
  await expect(admin).toHaveURL(/\/dashboard$/);
  await expect(bell(admin)).toHaveAccessibleName("Notifications from Yallapp, 2 unread");
  await bell(admin).click();
  await expect(panelOf(admin).getByRole("listitem").filter({ hasText: maintenance })).toBeVisible();
  // Marking all as read clears the marks at once.
  await panelOf(admin).getByRole("button", { name: "Mark all as read" }).click();
  await expect(panelOf(admin).locator("[data-new]")).toHaveCount(0);
  await expect(bell(admin)).toHaveAccessibleName("Notifications from Yallapp");
  await admin.getByRole("button", { name: "Back to admin" }).click();
  await expect(admin).toHaveURL(/\/admin\/clients\//);
});

test("See all lists them on Updates from Yallapp; on a phone the bell opens a full-width sheet", async () => {
  await own.goto("/dashboard");
  await bell(own).click();
  await panelOf(own).getByRole("link", { name: "See all" }).click();
  await expect(own).toHaveURL(/\/dashboard\/announcements$/);
  await expect(own.getByRole("heading", { level: 1, name: "Updates from Yallapp" })).toBeVisible();
  await expect(panelOf(own)).toBeHidden();
  const list = own.getByRole("list", { name: "Updates from Yallapp" });
  await expect(list.getByRole("article", { name: update })).toContainText("Update");
  await expect(list.getByRole("article", { name: maintenance })).toContainText("Builds pause tonight from 22:00 to 23:00 UTC.");

  // The phone's top bar: the bell next to Menu, and its panel the screen's width.
  await own.setViewportSize({ width: 390, height: 844 });
  await own.goto("/dashboard");
  await expect(own.getByRole("button", { name: "Menu", exact: true })).toBeVisible();
  await bell(own).click();
  const box = await panelOf(own).boundingBox();
  expect(box?.width).toBe(390);
  await panelOf(own).getByRole("button", { name: "Close notifications" }).click();
  await expect(panelOf(own)).toBeHidden();
  await expect(bell(own)).toBeFocused();
  await own.setViewportSize({ width: 1280, height: 720 });
});

test("a new announcement counts again, and the full list marks it read", async () => {
  await admin.goto("/admin/announcements/new");
  const offer = `Offer ${suffix}`;
  await admin.getByLabel("Title", { exact: true }).fill(offer);
  await admin.getByLabel("Message", { exact: true }).fill("20% off a year of Growth this week.");
  await admin.getByRole("radio", { name: "Clients in chosen states" }).check();
  await admin.getByRole("checkbox", { name: "Active", exact: true }).check();
  await admin.getByRole("radio", { name: "Offer", exact: true }).check();
  await admin.getByRole("radio", { name: /^Bell only/ }).check();
  await admin.getByRole("button", { name: "Publish announcement" }).click();
  await expect(admin.getByText("Announcement published.")).toBeVisible();
  announcementUrls.push(admin.url().replace(/\?.*$/, ""));

  await own.goto("/dashboard/announcements");
  const article = own.getByRole("article", { name: offer });
  await expect(article).toContainText("New");
  // The page marks it read and tells the bell.
  await expect(bell(own)).toHaveAccessibleName("Notifications from Yallapp");
  await own.reload();
  await expect(own.getByRole("article", { name: offer })).not.toContainText("New");
});
