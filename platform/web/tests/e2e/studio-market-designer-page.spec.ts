import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * 106.14 A designer's public page, end to end: a designer publishes a free
 * template and the team approves it. In Designer area › Your page they pick
 * an address (a reserved one refused), write the line about them, upload a
 * photo, show their country and a link, and see their page: their photo
 * and line wait for the team (initials, no line). The team approves them in
 * Admin › Studio Market › Designers; the page shows them. A buyer gets the
 * template, rates it (4 stars), changes it (5 stars); the designer replies
 * once from Ratings. The page shows the rating, the buyer and the answer;
 * the market's cards link the designer's name to the page; the page in
 * Arabic reads right to left and in dark. The team hides the rating (the
 * page shows none) and locks the page ("page not found").
 */
test.describe.configure({ mode: "serial", timeout: 240_000 });

const suffix = Date.now().toString(36);
const designer = { name: "Nur Aydın", email: `page-designer-${suffix}@market.test`, password: "nur-page-strong-password-1" };
const buyer = { name: "Ahmed Kamal", email: `page-buyer-${suffix}@market.test`, password: "ahmed-page-strong-password-1" };
const title = `Rose Atelier ${suffix}`;
const handle = `nur-studio-${suffix}`;
const shown = `Studio Nur ${suffix}`;
const bio = "Calm shop designs with photos first.";
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.237" };
const problems: string[] = [];
const contexts: BrowserContext[] = [];
let admin: Page;
let dz: Page;
let own: Page;
let slug = "";

async function page(browser: Browser, options: { colorScheme?: "light" | "dark"; locale?: string } = {}): Promise<Page> {
  const context = await browser.newContext({ extraHTTPHeaders, colorScheme: options.colorScheme ?? "light", ...(options.locale ? { locale: options.locale } : {}) });
  contexts.push(context);
  const p = await context.newPage();
  const browserNote = /was preloaded using link preload|WebGL|GL Driver Message/;
  const ours = () => /^\/(?:(?:ar|tr)\/)?designers\//.test(new URL(p.url()).pathname);
  p.on("console", (m) => {
    if (ours() && (m.type() === "error" || m.type() === "warning") && !m.location().url.includes("/api/v1/fonts/") && !browserNote.test(m.text())) problems.push(`${m.type()} on ${p.url()}: ${m.text()}`);
  });
  p.on("pageerror", (e) => {
    if (ours()) problems.push(`pageerror on ${p.url()}: ${e.message}`);
  });
  return p;
}

async function signUp(p: Page, who: { name: string; email: string; password: string }, phone: string): Promise<void> {
  await p.goto("/sign-up");
  await p.getByLabel("Full name").fill(who.name);
  await p.getByLabel("Email").fill(who.email);
  await p.getByLabel("WhatsApp number").fill(phone);
  await p.getByLabel("Password", { exact: true }).fill(who.password);
  await p.getByRole("checkbox").check();
  await p.getByRole("button", { name: "Create account" }).click();
  await expect(p).toHaveURL(/\/start$/);
}

async function newProject(p: Page, kind: string, name: string): Promise<void> {
  await p.goto("/studio/new");
  await p.getByRole("radio", { name: new RegExp(`^${kind}( |$)`) }).check();
  await p.getByLabel("Project name").fill(name);
  await p.getByRole("button", { name: "Next" }).click();
  await p.getByRole("radio", { name: "Blank page" }).click();
  await p.getByRole("button", { name: "Next" }).click();
  await expect(p).toHaveURL(/\/studio\/project$/);
}

async function jsonLd(p: Page): Promise<Record<string, unknown>[]> {
  return (await p.locator('script[type="application/ld+json"]').allTextContents()).flatMap((text) => {
    const data = JSON.parse(text) as Record<string, unknown> | Record<string, unknown>[];
    return Array.isArray(data) ? data : [data];
  });
}

test.beforeAll(async ({ browser }) => {
  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.designerPageAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
});

test.afterAll(async () => {
  for (const context of contexts) await context.close().catch(() => undefined);
  await admin?.close();
});

test("a designer's free template, published by the team", async ({ browser }) => {
  dz = await page(browser);
  await signUp(dz, designer, "+90 532 000 0337");
  await dz.goto("/designer/join");
  await dz.getByLabel("Your name as buyers see it").fill(shown);
  await dz.getByRole("button", { name: "Continue" }).click();
  await dz.getByLabel("Where you live and are paid").selectOption("TR");
  await dz.getByRole("button", { name: "Continue" }).click();
  // The terms say the page is public.
  await dz.getByRole("button", { name: "Read the full terms" }).click();
  await expect(dz.getByText(/Your designer page at yallapp\.com\.tr\/designers\/your-address is public/)).toBeVisible();
  await dz.getByRole("checkbox", { name: /I agree to the Studio Market designer terms/ }).check();
  await dz.getByRole("button", { name: "Agree and continue" }).click();
  await expect(dz).toHaveURL(/\/designer\/join\?joined=1$/);

  await newProject(dz, "Store", "Rose Flowers");
  await dz.goto("/studio/project/setup?step=website");
  await dz.getByRole("button", { name: "Save & continue" }).click();
  await expect(dz).toHaveURL(/step=branding$/);
  const ids = (await dz.locator('input[name="designChoice"]').evaluateAll((inputs) => inputs.map((i) => (i as HTMLInputElement).value))).filter(Boolean);
  await dz.locator(`input[name="designChoice"][value="${ids.find((id) => id.startsWith("studio-")) ?? ids[0]!}"]`).click();
  await dz.getByLabel("Name under the app icon").fill("Rose");
  await dz.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [150, 40, 70]) });
  await expect(dz.getByText("Replace file").first()).toBeVisible();
  await dz.getByRole("button", { name: "Save & continue" }).click();
  await expect(dz).toHaveURL(/step=listing$/);

  await dz.goto("/designer/publish");
  await dz.getByRole("button", { name: "Save and continue" }).click();
  await expect(dz).toHaveURL(/\/designer\/publish\?id=[0-9a-f-]+/);
  const texts = dz.locator("#step-texts");
  await texts.getByRole("textbox", { name: "Title", exact: true }).fill(title);
  await texts.getByRole("textbox", { name: "Short line", exact: true }).fill("Roses and a calm checkout.");
  await texts.getByRole("textbox", { name: "Description", exact: true }).fill("A flower shop where the photos lead.");
  await texts.getByRole("button", { name: "Save and continue" }).click();
  await expect(texts.getByText("Saved.")).toBeVisible();
  for (const id of ["#step-screens", "#step-kinds", "#step-plans", "#step-after"]) {
    await dz.locator(id).getByRole("button", { name: "Save and continue" }).click();
    await expect(dz.locator(id).getByText("Saved.")).toBeVisible();
  }
  await dz.reload();
  const send = dz.locator("#step-send");
  await send.getByRole("checkbox", { name: /every photo, font and icon/ }).check();
  await send.getByRole("button", { name: "Send for review" }).click();
  await expect(dz).toHaveURL(/\/designer\/templates\?sent=1$/);

  await admin.goto("/admin/market");
  await admin.getByRole("link", { name: new RegExp(title) }).click();
  await admin.getByRole("button", { name: "Approve and publish" }).click();
  await expect(admin.getByText("Approved and published. The designer was emailed.")).toBeVisible();

  await dz.goto(`/studio/market?q=${encodeURIComponent(title)}`);
  const href = await dz.locator(`[data-template-card] a`).first().getAttribute("href");
  slug = href!.split("/").pop()!;
  expect(slug).toMatch(/^[a-z0-9-]+$/);
});

test("the designer sets up their page: a reserved address refused, the photo and line waiting for the team", async () => {
  await dz.goto("/designer/templates");
  await dz.getByRole("link", { name: "Your page" }).click();
  await expect(dz).toHaveURL(/\/designer\/profile$/);
  const form = dz.locator("[data-designer-profile]");
  await expect(form.getByText("Add a photo and a line about you")).toBeVisible();

  await form.getByLabel("Your address").fill("admin");
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect(form.getByText("This address is kept for Yallapp. Choose another one.")).toBeVisible();

  await form.getByLabel("Your address").fill(handle);
  await form.getByLabel("A line about you (optional)").fill(bio);
  await form.locator('input[type="file"][name="photo"]').setInputFiles({ name: "me.png", mimeType: "image/png", buffer: solidPng(400, 400, [30, 110, 90]) });
  await expect(form.locator("[data-photo-preview]")).toBeVisible();
  await form.getByRole("checkbox", { name: "Show my country on my page" }).check();
  await form.getByRole("textbox", { name: "Address 1" }).fill("http://nur.example");
  await form.getByRole("checkbox", { name: "Show these links on my page" }).check();
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect(form.getByText("Enter up to 4 addresses that start with https://.")).toBeVisible();
  // Fields keep what was typed, the photo is chosen again.
  await form.locator('input[type="file"][name="photo"]').setInputFiles({ name: "me.png", mimeType: "image/png", buffer: solidPng(400, 400, [30, 110, 90]) });
  await form.getByRole("textbox", { name: "Address 1" }).fill("https://www.behance.net/nur-studio");
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect(form.getByText("Saved.")).toBeVisible();
  await dz.reload();
  await expect(dz.locator("[data-designer-profile]").getByText(/Our team is looking at your photo and the line about you/)).toBeVisible();
  await expect(dz.locator("[data-see-page]")).toHaveAttribute("href", `/designers/${handle}`);
  await dz.screenshot({ path: "test-results/designer-profile.png", fullPage: true });

  // The page: name, country, the link and the template; initials and no line until the team approves.
  const v = await page(dz.context().browser()!);
  await v.goto(`/designers/${handle}`);
  await expect(v.getByRole("heading", { level: 1, name: shown })).toBeVisible();
  await expect(v.locator("[data-designer-photo]")).toHaveCount(0);
  await expect(v.locator("[data-designer-bio]")).toHaveCount(0);
  await expect(v.locator("[data-designer-country]")).toContainText(/Türkiye|Turkey/);
  await expect(v.locator("[data-designer-links] a")).toHaveAttribute("href", "https://www.behance.net/nur-studio");
  await expect(v.locator("[data-designer-links] a")).toHaveAttribute("rel", /nofollow/);
  await expect(v.locator(`[data-designer-templates] [data-template-card="${slug}"]`)).toBeVisible();
  await expect(v.getByText("No ratings yet.")).toBeVisible();
  await expect(v.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/designers/${handle}$`));
  await expect(v.locator('link[rel="alternate"][hreflang="ar"]')).toHaveAttribute("href", new RegExp(`/ar/designers/${handle}$`));
  expect(await v.content()).not.toContain(designer.email);
});

test("the team approves the photo and line; the page shows them", async ({ browser }) => {
  await admin.goto("/admin/market/designers");
  const row = admin.locator(`[data-profile-review="${handle}"]`);
  await expect(row).toContainText(bio);
  await admin.screenshot({ path: "test-results/admin-designers.png", fullPage: true });
  await expect(row.getByRole("img", { name: `${shown}'s photo` })).toBeVisible();
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(admin.getByText("Approved. The photo and line show on the designer's page.")).toBeVisible();

  const v = await page(browser);
  await v.goto(`/designers/${handle}`);
  await expect(v.locator("[data-designer-photo]")).toBeVisible();
  await expect(v.locator("[data-designer-bio]")).toHaveText(bio);
  const profile = (await jsonLd(v)).find((d) => d["@type"] === "ProfilePage")!;
  expect(profile).toMatchObject({ mainEntity: { "@type": "Person", name: shown, description: bio, sameAs: ["https://www.behance.net/nur-studio"] } });
});

test("a buyer gets the template, rates it once, changes the rating; the designer replies once", async ({ browser }) => {
  own = await page(browser);
  await signUp(own, buyer, "+90 532 000 0338");
  await newProject(own, "Store", "Kamal Flowers");
  await own.goto(`/studio/market/t/${slug}`);
  // Before getting it: nothing to rate.
  await expect(own.locator("[data-rate-form]")).toHaveCount(0);
  await own.getByRole("button", { name: "Apply to my app" }).click();
  // Its only fitting app has it now (the page shows it on the app).
  await expect(own.locator("#apply").getByText("On Kamal Flowers now")).toBeVisible();

  await own.goto(`/studio/market/t/${slug}`);
  const rate = own.locator("[data-rate-form]");
  await expect(rate.getByText("Ahmed K.", { exact: false })).toBeVisible();
  await rate.locator("label").filter({ hasText: "4 stars" }).click();
  await rate.getByLabel("Your comment (optional)").fill("Lovely and calm, the cart could be bigger.");
  await rate.getByRole("button", { name: "Send my rating" }).click();
  await expect(own.getByText("Thanks. Your rating is on the template's page.")).toBeVisible();
  await expect(own.locator("[data-my-rating]")).toHaveAttribute("data-my-rating", "4");
  // Changed, not a second one.
  await own.getByRole("button", { name: "Change your rating" }).click();
  await own.locator("[data-rate-form] label").filter({ hasText: "5 stars" }).click();
  await own.getByRole("button", { name: "Save my rating" }).click();
  await expect(own.getByText("Your rating was changed.")).toBeVisible();
  await own.reload();
  await expect(own.locator("[data-my-rating]")).toHaveAttribute("data-my-rating", "5");
  await expect(own.locator("[data-template-ratings] [data-rating-item]")).toHaveCount(1);
  await own.locator("[data-template-ratings]").screenshot({ path: "test-results/template-rating.png" });

  await dz.goto("/designer/ratings");
  const item = dz.locator("[data-designer-rating]").first();
  await expect(item).toContainText("Lovely and calm");
  await item.getByLabel("Your reply").fill("Thank you! A bigger cart is coming.");
  await item.getByRole("button", { name: "Reply", exact: true }).click();
  await expect(dz.getByText("Your reply is under the rating.")).toBeVisible();
  await expect(item.locator("[data-own-reply]")).toContainText("A bigger cart is coming.");
  await expect(item.getByLabel("Your reply")).toHaveCount(0);
});

test("the page shows the rating, the buyer and the answer; the cards link to it; in Arabic and dark too", async ({ browser }) => {
  const v = await page(browser);
  await v.goto(`/designers/${handle}`);
  const stats = v.locator("[data-designer-stats]");
  await expect(stats).toContainText("5.0");
  await expect(stats).toContainText("1Ratings");
  await expect(stats).toContainText("1Buyer");
  const rating = v.locator("[data-rating-item]");
  await expect(rating).toHaveCount(1);
  await expect(rating).toContainText("Ahmed K.");
  await expect(rating).toContainText("Lovely and calm");
  await expect(rating.locator("[data-rating-reply]")).toContainText(`Reply from ${shown}`);
  await expect(rating.locator("[data-rating-reply]")).toContainText("A bigger cart is coming.");
  expect(await v.content()).not.toContain(buyer.email);
  await v.screenshot({ path: "test-results/designer-page-en.png", fullPage: true });

  // The template's page on the website: the rating, and the designer's name to their page.
  await v.goto(`/templates/${slug}`);
  await expect(v.locator("[data-template-ratings] [data-rating-item]")).toHaveCount(1);
  const product = (await jsonLd(v)).find((d) => d["@type"] === "Product")!;
  expect(product.aggregateRating).toMatchObject({ ratingValue: "5.0", ratingCount: 1 });
  await expect(v.locator(`[data-designer-link="${handle}"]`).first()).toHaveAttribute("href", `/designers/${handle}`);
  // The market's card: the rating and the designer's name linking to the page.
  await v.goto(`/templates?q=${encodeURIComponent(title)}`);
  const card = v.locator(`[data-template-card="${slug}"]`).first();
  await expect(card.locator("[data-rating]")).toHaveAttribute("data-rating", "5");
  await card.locator(`[data-designer-link="${handle}"]`).click();
  await expect(v).toHaveURL(new RegExp(`/designers/${handle}$`));

  // Arabic, right to left; dark.
  const ar = await page(browser, { colorScheme: "dark" });
  await ar.goto(`/ar/designers/${handle}`);
  await expect(ar.locator("html")).toHaveAttribute("lang", "ar");
  await expect(ar.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(ar.getByText("ماذا يقول المشترون")).toBeVisible();
  await expect(ar.locator("[data-rating-reply]")).toContainText(`رد من ${shown}`);
  await ar.screenshot({ path: "test-results/designer-page-ar-dark.png", fullPage: true });
  const tr = await page(browser);
  await tr.goto(`/tr/designers/${handle}`);
  await expect(tr.getByText("Alıcılar ne diyor")).toBeVisible();

  // Phone width: no sideways scroll.
  await v.setViewportSize({ width: 375, height: 800 });
  await v.goto(`/designers/${handle}`);
  expect(await v.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(problems).toEqual([]);
});

test("the team hides the rating and locks the page", async ({ browser }) => {
  await admin.goto("/admin/market/designers");
  const rating = admin.locator("[data-admin-rating]").filter({ hasText: "Lovely and calm" });
  await rating.getByLabel("Why it is hidden (team only)").fill("Test of hiding");
  await rating.getByRole("button", { name: "Hide" }).click();
  await expect(admin.getByText("The rating is hidden from the pages and the averages.")).toBeVisible();
  const v = await page(browser);
  await v.goto(`/designers/${handle}`);
  await expect(v.getByText("No ratings yet.")).toBeVisible();
  await expect(v.locator("[data-rating-item]")).toHaveCount(0);
  // The buyer sees theirs is hidden; the designer sees it marked.
  await own.goto(`/studio/market/t/${slug}`);
  await expect(own.getByText("Our team hid your rating: it doesn't show on the pages.")).toBeVisible();
  await dz.goto("/designer/ratings");
  await expect(dz.getByText("Hidden by our team")).toBeVisible();

  await admin.goto("/admin/market/designers");
  const row = admin.locator(`[data-admin-designer="${handle}"]`);
  await row.getByLabel(`Why the page of ${shown} is locked (the designer sees it)`).fill("Checking the links");
  await row.getByRole("button", { name: "Lock the page" }).click();
  await expect(admin.getByText(/The page is locked/)).toBeVisible();
  const response = await v.goto(`/designers/${handle}`);
  expect(response?.status()).toBe(404);
  const sitemap = await (await v.request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain(`/designers/${handle}`);
  // The designer is told why; their templates stay on the market.
  await dz.goto("/designer/profile");
  await expect(dz.locator("[data-designer-profile]").getByText("Our team locked your page")).toBeVisible();
  await expect(dz.locator("[data-designer-profile]").getByText("Why: Checking the links")).toBeVisible();
  await v.goto(`/templates/${slug}`);
  await expect(v.getByRole("heading", { level: 1, name: title })).toBeVisible();

  await admin.locator(`[data-admin-designer="${handle}"]`).getByRole("button", { name: "Unlock" }).click();
  await expect(admin.getByText("The page opens again.")).toBeVisible();
  expect((await v.goto(`/designers/${handle}`))?.status()).toBe(200);
  expect(await (await v.request.get("/sitemap.xml")).text()).toContain(`/designers/${handle}`);
});
