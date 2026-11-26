import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 231 Yallapp Community's website (community.yallapp.com.tr, here at
 * /community): the welcome's Apple, Google and email; a community admin
 * (their community account linked, on yallapp.com.tr, to a Yallapp admin);
 * two members join with email; one asks (seeing similar questions as they
 * type) and, as a new member, waits for review; the admin approves it in
 * the moderation queue; the other member answers (approved too); the asker
 * votes and accepts; they follow each other and become friends (asked,
 * then accepted); a post is reported and reaches the admin's reports; the
 * admin grants a badge, which shows beside the member's name and in the
 * audit log. The later sections lead nowhere, nothing is ever sold, and
 * the Arabic version is right to left.
 */
test.describe.configure({ mode: "serial" });
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.233" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
type Who = { name: string; email: string; password: string };
const admin: Who = { name: "Lina Community", email: `lina-${suffix}@community.test`, password: "lina-strong-password-1" };
const asker: Who = { name: "Mohamed Ali", email: `mohamed-${suffix}@community.test`, password: "mohamed-strong-password-1" };
const helper: Who = { name: "Nour El Hoda", email: `nour-${suffix}@community.test`, password: "nour-strong-password-1" };
const title = `How do I connect a payment gateway to my store ${suffix}?`;
const answerText = "Open Dashboard › Payments, choose your gateway, paste its keys and turn on card payments. Then place a test order.";
let adminPage: Page;
let askerPage: Page;
let helperPage: Page;
let questionUrl = "";

async function join(browser: Browser, who: Who): Promise<Page> {
  const page = await browser.newPage({ extraHTTPHeaders });
  await page.goto("/community/sign-up");
  await page.getByLabel("Name").fill(who.name);
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/community");
  await expect(page.getByRole("heading", { name: `Hi ${who.name.split(" ")[0]}`, exact: true })).toBeVisible();
  return page;
}

async function profileOf(page: Page): Promise<string> {
  // The header's avatar opens a menu whose first item is the profile.
  await page.getByTestId("cm-avatar-trigger").click();
  const href = await page.getByTestId("cm-avatar-menu").getByRole("menuitem", { name: "Your profile" }).getAttribute("href");
  await page.keyboard.press("Escape");
  expect(href).toMatch(/^\/community\/u\//);
  return href!;
}

/** The admin approves the moderation queue's item that shows this text. */
async function approve(text: string): Promise<void> {
  await adminPage.goto("/community/admin/moderation");
  const item = adminPage.locator("article.cm-adm", { hasText: text });
  await item.getByRole("button", { name: "Approve" }).click();
  // Approved, it leaves the open queue and shows under Approved.
  await expect(item).toHaveCount(0);
  await adminPage.goto("/community/admin/moderation?status=approved");
  await expect(adminPage.locator("article.cm-adm", { hasText: text })).toBeVisible();
}

test("the welcome offers Apple, then Google, then Yallapp, then email, and Log in", async ({ page }) => {
  await page.goto("/community/welcome");
  const buttons = page.locator(".cm-auth-btns > button, .cm-auth-btns > a");
  await expect(buttons).toHaveText(["Continue with Apple", "Continue with Google", "Continue with Yallapp", "mailSign up with email"]);
  await expect(page.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/community/sign-in");
});

test("a community admin: their account linked to a Yallapp admin on yallapp.com.tr", async ({ browser }) => {
  adminPage = await join(browser, admin);
  await adminPage.goto("/community/settings");
  await adminPage.getByRole("button", { name: "Link account" }).click();
  // Signed out of Yallapp: its sign-in first, then the confirm page.
  await adminPage.waitForURL(/\/sign-in$/);
  await adminPage.getByLabel("Email").fill(E2E.communitySiteAdminEmail);
  await adminPage.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await adminPage.getByRole("button", { name: "Sign in" }).click();
  await adminPage.waitForURL(/\/link-community\?state=/);
  await adminPage.getByRole("button", { name: "Link my account" }).click();
  await expect(adminPage.getByRole("main").getByRole("status")).toContainText("linked");
  await adminPage.goto("/community");
  await adminPage.locator(".cm-nav").getByRole("link", { name: "Admin" }).click();
  await expect(adminPage).toHaveURL(/\/community\/admin\/verifications$/);
});

test("two members join with email", async ({ browser }) => {
  askerPage = await join(browser, asker);
  helperPage = await join(browser, helper);
  // Members don't see the admin's pages.
  const response = await askerPage.goto("/community/admin/badges");
  expect(response?.status()).toBe(404);
});

test("a new member asks: it waits for review, then the admin approves it", async () => {
  const page = askerPage;
  await page.goto("/community");
  await page.getByRole("link", { name: "Ask the community" }).first().click();
  await page.waitForURL(/\/community\/ask$/);
  await page.locator("select[name=section]").selectOption({ label: "Stores" });
  await page.locator("input[name=title]").fill(title);
  await page.locator("textarea[name=body]").fill("I built my store with a template and want to accept cards. What are the steps, and what do I need first?");
  await page.locator("input[name=tags]").fill("payments, store");
  await page.getByRole("button", { name: "Post your question" }).click();
  await page.waitForURL(/\/community\/questions\/.+\?pending=1$/);
  await expect(page.getByRole("status").first()).toContainText("once a moderator reviews it");
  questionUrl = page.url().replace(/\?pending=1$/, "");
  await approve(title);
  // Now everyone sees it, and a close title lists it as similar.
  await helperPage.goto(questionUrl);
  await expect(helperPage.getByRole("heading", { name: title })).toBeVisible();
  await helperPage.goto("/community/ask");
  await helperPage.locator("select[name=section]").selectOption({ label: "Stores" });
  await helperPage.locator("input[name=title]").fill("How do I connect a payment gateway?");
  await expect(helperPage.getByRole("link", { name: title })).toBeVisible({ timeout: 15_000 });
});

test("another member answers; the asker votes and accepts", async () => {
  await helperPage.goto(questionUrl);
  await helperPage.locator("#answer textarea[name=body]").fill(answerText);
  await helperPage.getByRole("button", { name: "Post your answer" }).click();
  await expect(helperPage.locator("#answer").getByRole("status")).toContainText(/posted|review/);
  await approve(helper.name);

  await askerPage.goto(questionUrl);
  const answer = askerPage.locator(".cm-answer", { hasText: "Dashboard › Payments" });
  await answer.getByRole("button", { name: "Useful", exact: true }).click();
  await expect(answer.getByRole("button", { name: "Useful", exact: true })).toHaveAttribute("aria-pressed", "true");
  await answer.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(askerPage.locator(".cm-answer.accepted")).toContainText("Accepted answer");
});

test("follow, then friends: asked, then accepted", async () => {
  await askerPage.goto(await profileOf(helperPage));
  await askerPage.getByRole("button", { name: "Follow", exact: true }).click();
  await expect(askerPage.getByRole("button", { name: "Following" })).toBeVisible();
  await askerPage.getByRole("button", { name: "Add friend" }).click();
  await expect(askerPage.getByRole("button", { name: "Request sent" })).toBeVisible();

  await helperPage.goto(await profileOf(askerPage));
  await helperPage.getByRole("button", { name: "Accept request" }).click();
  await expect(helperPage.getByRole("button", { name: "Friends", exact: true })).toBeVisible();
});

test("a member reports a post; it reaches the admin's reports", async () => {
  await helperPage.goto(questionUrl);
  const question = helperPage.locator(".cm-answer").first();
  await question.getByRole("button", { name: "Report" }).click();
  await question.getByLabel("Spam").check();
  await question.getByRole("button", { name: "Send report" }).click();
  await expect(question.getByRole("status")).toContainText("moderators");
  await adminPage.goto("/community/admin/reports");
  await expect(adminPage.locator("article.cm-adm").first()).toContainText("Spam");
});

test("the admin grants a badge: it shows beside the name, and in the audit log", async () => {
  const handle = (await profileOf(helperPage)).split("/").pop()!;
  await adminPage.goto(`/community/admin/badges?member=${handle}`);
  const grant = adminPage.locator("form", { hasText: "Grant a badge" });
  await grant.locator("select[name=badge]").selectOption("blue");
  await grant.locator("input[name=reason]").fill("Helped many members this month");
  await grant.getByRole("button", { name: "Grant" }).click();
  await expect(grant.getByRole("status")).toContainText("Badge granted.");
  await helperPage.goto(`/community/u/${handle}`);
  await expect(helperPage.locator(".cm-profile h1").getByRole("img", { name: "Active Member" })).toBeVisible();
  await expect(helperPage.locator(".cm-badges")).toContainText("Active Member");
  await adminPage.goto("/community/admin/audit");
  await expect(adminPage.locator(".cm-table")).toContainText("Helped many members this month");
});

test("the later sections say Soon and lead nowhere", async () => {
  await askerPage.goto("/community");
  const nav = askerPage.locator(".cm-nav");
  for (const name of ["Academy", "Showcase", "Challenges", "Pros", "Events"]) {
    const item = nav.locator(".soon", { hasText: new RegExp(`${name}Soon$`) });
    await expect(item).toBeVisible();
    await expect(item.locator("a")).toHaveCount(0);
  }
});

test("no prices, buy buttons or payment links anywhere on the site", async () => {
  for (const path of ["/community", questionUrl, "/community/questions", "/community/tutorials", "/community/welcome", "/community/sign-in", "/community/verify"]) {
    await askerPage.goto(path);
    const text = await askerPage.locator("body").innerText();
    expect(text, path).not.toMatch(/[$€£₺]\s?\d|\b(buy|checkout|purchase|pricing)\b/i);
    const hrefs = await askerPage.locator("a[href]").evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
    expect(hrefs.filter((h) => /\/(pricing|checkout|billing|pay)(\/|\?|$)/.test(h)), path).toEqual([]);
  }
});

test("Arabic is right to left; Turkish too is offered", async () => {
  await askerPage.goto("/community");
  await askerPage.locator(".cm-hdr select").first().selectOption("ar");
  await expect(askerPage.locator(".cm")).toHaveAttribute("dir", "rtl");
  await expect(askerPage.getByRole("link", { name: "اسأل المجتمع" }).first()).toBeVisible();
  await askerPage.locator(".cm-hdr select").first().selectOption("tr");
  await expect(askerPage.locator(".cm")).toHaveAttribute("dir", "ltr");
  await expect(askerPage.getByRole("link", { name: "Topluluğa sor" }).first()).toBeVisible();
});
