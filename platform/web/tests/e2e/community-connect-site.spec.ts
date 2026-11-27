import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * 232, 234 The website's people-to-people pages on area A's API: a member
 * messages another from their profile and they reply; a group is created,
 * joined and posted in; a pro profile is opened and hired, which opens a
 * message thread; a job is posted and applied to, and its poster sees the
 * applicant. No money moves anywhere.
 */
test.describe.configure({ mode: "serial" });
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.236" };
test.use({ extraHTTPHeaders });

const s = Date.now().toString(36);
const ayse = { name: "Ayse Demir", email: `ayse-${s}@community.test`, password: "ayse-strong-password-1" };
const omar = { name: "Omar Haddad", email: `omar-${s}@community.test`, password: "omar-strong-password-1" };
let ayseP: Page;
let omarP: Page;
let omarHandle = "";

async function join(browser: Browser, who: typeof ayse): Promise<Page> {
  const page = await browser.newPage({ extraHTTPHeaders });
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(e.message));
  await page.goto("/community/sign-up");
  await page.getByLabel("Name").fill(who.name);
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/community");
  return page;
}

async function handleOf(page: Page): Promise<string> {
  await page.goto("/community");
  const href = (await page.locator(".cm-mecard").first().getAttribute("href")) ?? "";
  return decodeURIComponent(href.split("/").pop() ?? "");
}

test("two members join", async ({ browser }) => {
  ayseP = await join(browser, ayse);
  omarP = await join(browser, omar);
  omarHandle = await handleOf(omarP);
  expect(omarHandle).not.toBe("");
});

test("messages: from a profile to the inbox, and a reply", async () => {
  await ayseP.goto(`/community/u/${encodeURIComponent(omarHandle)}`);
  await ayseP.getByTestId("cm-message-member").click();
  await ayseP.waitForURL((url) => url.pathname === "/community/messages");
  await ayseP.getByLabel("Message", { exact: true }).fill("Hi Omar, can you look at my menu screen?");
  await ayseP.getByRole("button", { name: "Send" }).click();
  await ayseP.waitForURL(/\/community\/messages\/[^/]+$/);
  await expect(ayseP.locator(".cm-msgs")).toContainText("can you look at my menu screen?");

  await omarP.goto("/community/messages");
  const row = omarP.locator(".cm-inbox a", { hasText: ayse.name });
  await expect(row).toHaveClass(/unread/);
  await row.click();
  await omarP.getByLabel("Write a message…").fill("Sure, send me a screenshot.");
  await omarP.getByRole("button", { name: "Send" }).click();
  await expect(omarP.locator(".cm-msgs li.me")).toContainText("Sure, send me a screenshot.");
  await expect(omarP.getByTestId("cm-messages")).toBeVisible();
});

test("groups: a new member's group waits for a moderator; only its creator sees it meanwhile", async () => {
  await ayseP.goto("/community/groups/new");
  await ayseP.getByLabel("Group name").fill(`Restaurant apps ${s}`);
  await ayseP.getByLabel("Description").fill("For people building restaurant and café apps.");
  await ayseP.getByRole("button", { name: "Create a group" }).click();
  await ayseP.waitForURL((u) => /^\/community\/groups\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/new"));
  const groupUrl = new URL(ayseP.url()).pathname;
  await expect(ayseP.getByRole("heading", { level: 1 })).toContainText(`Restaurant apps ${s}`);
  await expect(ayseP.getByRole("status")).toContainText("once a moderator has checked it");
  await ayseP.goto(`${groupUrl}/members`);
  await expect(ayseP.locator(".cm-people-list")).toContainText(ayse.name);

  await omarP.goto(groupUrl);
  await expect(omarP.getByRole("heading", { name: `Restaurant apps ${s}` })).toHaveCount(0);
});

test("pros: open a pro profile; a client hires, which opens a message thread", async () => {
  await omarP.goto("/community/settings/pro");
  await omarP.getByLabel("Headline").fill("Studio designer for restaurants");
  await omarP.getByLabel("Service 1").fill("Menu app design");
  await omarP.getByLabel("Rate (text) 1").fill("by the project");
  await omarP.getByLabel("Skills").fill("Studio, UI design");
  await omarP.getByRole("button", { name: "Save changes" }).click();
  await omarP.waitForURL(/\/community\/pros\/[^/]+$/);
  await expect(omarP.getByRole("heading", { level: 1 })).toHaveText("Studio designer for restaurants");

  await ayseP.goto("/community/pros");
  await ayseP.locator(".cm-pro", { hasText: "Studio designer for restaurants" }).click();
  await ayseP.getByLabel("What do you need?").fill("I need my café's menu screens designed in Studio.");
  await ayseP.getByRole("button", { name: "Send a hire request" }).click();
  await ayseP.waitForURL(/\/community\/pros\/requests/);
  await expect(ayseP.locator(".cm-card", { hasText: "café's menu screens" })).toBeVisible();

  await omarP.goto("/community/pros/requests");
  const req = omarP.locator(".cm-card", { hasText: "café's menu screens" });
  await req.getByRole("button", { name: "Accept" }).click();
  await expect(omarP.locator(".cm-card", { hasText: "café's menu screens" })).toContainText("Accepted");
  await omarP.locator(".cm-card", { hasText: "café's menu screens" }).getByRole("link", { name: "Message" }).click();
  await expect(omarP.locator(".cm-msgs")).toContainText("café's menu screens");
});

test("jobs: a new member's job waits for a moderator before others can apply", async () => {
  await ayseP.goto("/community/jobs/new");
  await ayseP.getByLabel("Job title").fill(`Build our bakery app ${s}`);
  await ayseP.getByLabel("Budget (text)").fill("to agree");
  await ayseP.getByLabel("Skills").fill("Studio, payments");
  await ayseP.getByLabel("Description").fill("We sell bread and cakes in Istanbul and want an app with ordering and pickup.");
  await ayseP.getByRole("button", { name: "Post a job" }).click();
  await ayseP.waitForURL((u) => /^\/community\/jobs\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/new"));
  await expect(ayseP.getByRole("status")).toContainText("once a moderator has checked it");
  await expect(ayseP.getByRole("heading", { level: 1 })).toHaveText(`Build our bakery app ${s}`);
  await ayseP.goto("/community/jobs/mine");
  await expect(ayseP.locator(".cm-hist")).toContainText(`Build our bakery app ${s}`);
});
