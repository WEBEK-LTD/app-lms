import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * 231 Yallapp Community's website (community.yallapp.com.tr, here at
 * /community): two members join with email; one asks (seeing similar
 * questions as they type), the other answers; the asker votes and accepts
 * the answer; they follow each other, become friends (asked, then
 * accepted), and a member reports a reply. The site never shows a price, a
 * buy button or a payment link. English first; the Arabic version is right
 * to left.
 */
test.describe.configure({ mode: "serial" });
const extraHTTPHeaders = { "x-forwarded-for": "203.0.113.233" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const asker = { name: "Mohamed Ali", email: `mohamed-${suffix}@community.test`, password: "mohamed-strong-password-1" };
const helper = { name: "Nour El Hoda", email: `nour-${suffix}@community.test`, password: "nour-strong-password-1" };
const title = `How do I connect a payment gateway to my store ${suffix}?`;
let askerPage: Page;
let helperPage: Page;
let questionUrl = "";

async function join(browser: Browser, who: typeof asker): Promise<Page> {
  const page = await browser.newPage({ extraHTTPHeaders });
  await page.goto("/community/welcome");
  await expect(page.getByRole("button", { name: "Continue with Apple" })).toBeVisible();
  // Google sits between Apple and email.
  const order = await page.locator(".cm-auth-btns > *").allTextContents();
  expect(order.slice(0, 3).map((t) => t.trim())).toEqual(["Continue with Apple", "Continue with Google", "mailSign up with email"]);
  await page.getByRole("link", { name: "Sign up with email" }).click();
  await page.getByLabel("Name").fill(who.name);
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/community");
  await expect(page.getByRole("heading", { name: `Hi ${who.name.split(" ")[0]} 👋` })).toBeVisible();
  return page;
}

test("two members join with email", async ({ browser }) => {
  askerPage = await join(browser, asker);
  helperPage = await join(browser, helper);
});

test("a member asks, with similar questions shown as they type", async () => {
  const page = askerPage;
  await page.getByRole("link", { name: "Ask the community" }).first().click();
  await page.waitForURL(/\/community\/ask$/);
  await page.locator("select[name=section]").selectOption({ label: "Stores" });
  await page.locator("input[name=title]").fill(title);
  await page.locator("textarea[name=body]").fill("I built my store with a template and want to accept cards. What are the steps, and what do I need first?");
  await page.locator("input[name=tags]").fill("payments, store");
  await page.getByRole("button", { name: "Post your question" }).click();
  await page.waitForURL(/\/community\/questions\//);
  questionUrl = page.url();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  // A second question with a close title lists the first as similar.
  await page.goto("/community/ask");
  await page.locator("select[name=section]").selectOption({ label: "Stores" });
  await page.locator("input[name=title]").fill("How do I connect a payment gateway?");
  await expect(page.getByRole("link", { name: title })).toBeVisible({ timeout: 15_000 });
});

test("another member answers; the asker votes and accepts", async () => {
  await helperPage.goto(questionUrl);
  await helperPage.locator("#answer textarea[name=body]").fill("Open Dashboard › Payments, choose your gateway, paste its keys and turn on card payments. Then place a test order.");
  await helperPage.getByRole("button", { name: "Post your answer" }).click();
  await expect(helperPage.getByRole("status")).toContainText(/posted|review/);

  await askerPage.goto(questionUrl);
  const answer = askerPage.locator(".cm-answer").nth(1);
  await expect(answer).toContainText("Dashboard › Payments");
  await answer.getByRole("button", { name: "Useful" }).click();
  await expect(answer.getByRole("button", { name: "Useful" })).toHaveAttribute("aria-pressed", "true");
  await answer.getByRole("button", { name: "Accept" }).click();
  await expect(askerPage.locator(".cm-answer.accepted")).toContainText("Accepted answer");
});

test("follow, then friends: asked, then accepted", async () => {
  const handle = await helperPage.locator(".cm-hdr a[aria-label='Your profile']").getAttribute("href");
  expect(handle).toMatch(/\/community\/u\//);
  await askerPage.goto(handle!);
  await askerPage.getByRole("button", { name: "Follow" }).click();
  await expect(askerPage.getByRole("button", { name: "Following" })).toBeVisible();
  await askerPage.getByRole("button", { name: "Add friend" }).click();
  await expect(askerPage.getByRole("button", { name: "Request sent" })).toBeVisible();

  const askerHandle = await askerPage.locator(".cm-hdr a[aria-label='Your profile']").getAttribute("href");
  await helperPage.goto(askerHandle!);
  await helperPage.getByRole("button", { name: "Accept request" }).click();
  await expect(helperPage.getByRole("button", { name: "Friends" })).toBeVisible();
});

test("a member reports a post to the moderators", async () => {
  await helperPage.goto(questionUrl);
  const question = helperPage.locator(".cm-answer").first();
  await question.getByRole("button", { name: "Report" }).click();
  await question.getByLabel("Spam").check();
  await question.getByRole("button", { name: "Send report" }).click();
  await expect(question.getByRole("status")).toContainText("moderators");
});

test("the later sections say Coming soon and lead nowhere", async () => {
  const nav = askerPage.locator(".cm-nav");
  for (const name of ["Academy", "Showcase", "Challenges", "Pros", "Events"]) {
    const item = nav.locator(".soon", { hasText: name });
    await expect(item).toBeVisible();
    await expect(item.locator("a")).toHaveCount(0);
  }
});

test("no prices, buy buttons or payment links anywhere on the site", async () => {
  for (const path of ["/community", questionUrl, "/community/questions", "/community/tutorials", "/community/welcome", "/community/sign-in"]) {
    await askerPage.goto(path);
    const text = await askerPage.locator("body").innerText();
    expect(text).not.toMatch(/[$€£₺]\s?\d|\b(buy|checkout|purchase|pricing)\b/i);
    const hrefs = await askerPage.locator("a[href]").evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
    expect(hrefs.filter((h) => /\/(pricing|checkout|billing|pay)(\/|\?|$)/.test(h))).toEqual([]);
  }
});

test("Arabic is right to left; Turkish too is offered", async () => {
  await askerPage.getByLabel("Language").first().selectOption("ar");
  await expect(askerPage.locator(".cm")).toHaveAttribute("dir", "rtl");
  await expect(askerPage.getByRole("link", { name: "اسأل المجتمع" }).first()).toBeVisible();
  await askerPage.getByLabel("اللغة").first().selectOption("tr");
  await expect(askerPage.locator(".cm")).toHaveAttribute("dir", "ltr");
  await expect(askerPage.getByRole("link", { name: "Topluluğa sor" }).first()).toBeVisible();
});
