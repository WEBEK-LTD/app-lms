import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * A News & blog app without a website (roadmap 23): the editor writes and
 * publishes articles on the Articles page, sends one as breaking news, and
 * the hosted API serves them to the app.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Harbour Post", email: `harbour-${suffix}@news.test`, password: "harbour-strong-password-1" };
let own: Page;
let api = "";
let articleId = "";
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.73" };

test.beforeAll(async ({ browser }) => {
  own = await browser.newPage({ extraHTTPHeaders });
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 00 73");
  await own.getByLabel("Your website (optional)").fill(`https://harbour-${suffix}.news.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.newsAdminEmail);
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

test("the editor picks News & blog and articles written in Yallapp", async () => {
  await own.goto("/dashboard/app-type");
  await own.getByText("News & blog", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  // WordPress, an RSS feed, the dashboard or an own API.
  await expect(own.getByText("My site's RSS feed")).toBeVisible();
  await expect(own.getByText("My WordPress site")).toBeVisible();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
  await own.goto("/dashboard/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).textContent())!.trim();
  expect(api).toMatch(/\/api\/app\/[0-9a-f-]{36}$/);
});

test("sections, an article with a picture, published as breaking news", async () => {
  await own.getByRole("link", { name: "Articles", exact: true }).click();
  await expect(own.getByText("No articles yet.")).toBeVisible();
  const sections = own.getByRole("region", { name: "Sections" });
  await sections.getByLabel("New section").fill("City");
  await sections.getByRole("button", { name: "Add section" }).click();
  await expect(sections.getByText("Added “City”.")).toBeVisible();
  await sections.getByLabel("New section").fill("Sport");
  await sections.getByRole("button", { name: "Add section" }).click();
  await expect(sections.getByText("Added “Sport”.")).toBeVisible();
  await sections.getByRole("button", { name: "Move Sport up" }).click();
  await expect(sections.getByLabel("Name of Sport")).toBeVisible();
  await expect(own.getByLabel(/^Name of /).first()).toHaveValue("Sport");

  await own.getByRole("link", { name: "Write an article" }).click();
  await own.getByLabel("Title").fill("Night ferries return to the harbour");
  await own.getByLabel("Text").fill("Late ferries return on Monday.\n\nBoats every 40 minutes.\n\n<script>alert(1)</script>");
  await own.getByLabel("Author").fill("Ayla Demir");
  await own.getByRole("checkbox", { name: "City" }).check();
  await own.getByLabel("Add a picture").setInputFiles({ name: "ferry.png", mimeType: "image/png", buffer: solidPng(64, 36, [30, 90, 160]) });
  await own.getByRole("checkbox", { name: "Send as breaking news when I publish" }).check();
  await own.getByRole("button", { name: "Publish" }).click();
  await expect(own.getByRole("status")).toContainText("Published “Night ferries return to the harbour”. Breaking news sent to your readers' inboxes.");
  await expect(own.getByText("Top story")).toHaveCount(0);

  // A draft stays out of the app.
  await own.getByRole("link", { name: "Write an article" }).click();
  await own.getByLabel("Title").fill("Next week's plans");
  await own.getByLabel("Text").fill("Not yet.");
  await own.getByRole("button", { name: "Save as draft" }).click();
  await expect(own.getByRole("status")).toContainText("Saved “Next week's plans”.");
});

test("the hosted API serves the published article like a lesson", async ({ request }) => {
  const config = await request.get(`${api}/config?platform=android&app_version=1.0.0`);
  expect((await config.json()).news).toEqual({ show_author: true, show_dates: true, breaking_news_push: false });

  const list = await (await request.get(`${api}/news/articles`)).json();
  expect(list.items.map((a: { title: string }) => a.title)).toEqual(["Night ferries return to the harbour"]);
  const [summary] = list.items;
  articleId = summary.id;
  expect(summary).toMatchObject({ author: "Ayla Demir", excerpt: "Late ferries return on Monday. Boats every 40 minutes.", categories: [{ name: "City" }] });
  expect(summary.image_url).toContain("/api/v1/assets/");

  const article = await (await request.get(`${api}/news/articles/${articleId}`)).json();
  expect(article).toMatchObject({ render_mode: "native", embeds: [] });
  expect(article.html).toContain("<p>Late ferries return on Monday.</p><p>Boats every 40 minutes.</p>");
  expect(article.html).not.toContain("script");
  expect(article.html).not.toContain("alert");
  const sections = await (await request.get(`${api}/news/categories`)).json();
  expect(sections.items).toEqual([{ id: expect.any(String), name: "City", count: 1 }]);
  const home = await (await request.get(`${api}/news/home`)).json();
  expect(home.featured.map((a: { id: string }) => a.id)).toEqual([articleId]);
});

test("a top story, then unpublished: the app no longer has it", async ({ request }) => {
  await own.getByRole("link", { name: "Night ferries return to the harbour" }).click();
  await own.getByRole("button", { name: "Make it a top story" }).click();
  await expect(own.getByText("It's a top story")).toBeVisible();
  expect((await (await request.get(`${api}/news/articles?featured=true`)).json()).total).toBe(1);

  await own.getByRole("button", { name: "Unpublish" }).click();
  await expect(own.getByText("A draft: only you see it.")).toBeVisible();
  expect((await (await request.get(`${api}/news/articles`)).json()).total).toBe(0);
  expect((await request.get(`${api}/news/articles/${articleId}`)).status()).toBe(404);

  // Republished, without breaking news this time.
  await own.getByRole("region", { name: "Status" }).getByRole("button", { name: "Publish" }).click();
  await expect(own.getByText("Published: it's in the app.")).toBeVisible();
  expect((await (await request.get(`${api}/news/articles`)).json()).total).toBe(1);

  await own.goto("/dashboard/articles");
  await own.getByRole("checkbox", { name: "Show who wrote each article" }).uncheck();
  await own.getByRole("region", { name: "In the app" }).getByRole("button", { name: "Save" }).click();
  await expect(own.getByText("Saved. The app shows it the next time it opens.")).toBeVisible();
  const config = await (await request.get(`${api}/config?platform=android&app_version=1.0.0`)).json();
  expect(config.news.show_author).toBe(false);
  expect((await (await request.get(`${api}/news/articles`)).json()).items[0].author).toBeNull();
});
