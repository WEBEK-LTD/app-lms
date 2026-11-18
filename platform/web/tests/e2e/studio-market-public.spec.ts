import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * 106.13 Studio Market on the website, end to end: a designer publishes a
 * paid template (3 months at $24, lifetime at $149) and the team approves
 * it. A visitor who isn't signed in browses /templates (search, the price
 * filter, the app kinds), opens the template's page (its price, plans,
 * what to know, the demo) and chooses a plan: sign-up first, then straight
 * to the dashboard's checkout for that plan. Signed in, the same button goes
 * straight there, and "Preview it on my app first" opens the dashboard's
 * demo on their app. The same in Arabic (right to left, Modern Standard
 * Arabic): browsing, filtering, the template, and "I have an account: sign
 * in" back to the checkout. A template that isn't public is "page not found"
 * (the draft, in-review and changes-requested cases are in the unit test);
 * the sitemap lists the published one in each language.
 */
test.describe.configure({ mode: "serial", timeout: 180_000 });

const suffix = Date.now().toString(36);
const designer = { name: "Lale Yıldız", email: `public-designer-${suffix}@market.test`, password: "lale-public-strong-password-1" };
const buyer = { name: "Zeynep Buyer", email: `public-buyer-${suffix}@market.test`, password: "zeynep-public-strong-password-1" };
const title = `Peony Gallery ${suffix}`;
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.236" };
const problems: string[] = [];
let admin: Page;
let dz: Page;
let slug = "";
const contexts: BrowserContext[] = [];

async function page(browser: Browser, options: { colorScheme?: "light" | "dark" } = {}): Promise<Page> {
  const context = await browser.newContext({ extraHTTPHeaders, colorScheme: options.colorScheme ?? "light" });
  contexts.push(context);
  const p = await context.newPage();
  const browserNote = /was preloaded using link preload|WebGL|GL Driver Message/;
  const ours = () => /^\/(?:(?:ar|tr)\/)?templates(?:[/?#]|$)/.test(new URL(p.url()).pathname);
  p.on("console", (m) => {
    if (ours() && (m.type() === "error" || m.type() === "warning") && !m.location().url.includes("/api/v1/fonts/") && !browserNote.test(m.text())) problems.push(`${m.type()} on ${p.url()}: ${m.text()}`);
  });
  p.on("pageerror", (e) => {
    if (ours()) problems.push(`pageerror on ${p.url()}: ${e.message}`);
  });
  return p;
}

async function signUp(p: Page, who: { name: string; email: string; password: string }, phone: string): Promise<void> {
  await p.getByLabel("Full name").fill(who.name);
  await p.getByLabel("Email").fill(who.email);
  await p.getByLabel("WhatsApp number").fill(phone);
  await p.getByLabel("Password", { exact: true }).fill(who.password);
  await p.getByRole("checkbox").check();
  await p.getByRole("button", { name: "Create account" }).click();
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

/** The JSON-LD blocks of the page. */
async function jsonLd(p: Page): Promise<Record<string, unknown>[]> {
  return (await p.locator('script[type="application/ld+json"]').allTextContents()).flatMap((text) => {
    const data = JSON.parse(text) as Record<string, unknown> | Record<string, unknown>[];
    return Array.isArray(data) ? data : [data];
  });
}

test.beforeAll(async ({ browser }) => {
  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.marketPublicAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
});

test.afterAll(async () => {
  for (const context of contexts) await context.close().catch(() => undefined);
  await admin?.close();
});

test("a designer's paid template, published by the team", async ({ browser }) => {
  dz = await page(browser);
  await dz.goto("/sign-up");
  await signUp(dz, designer, "+90 532 000 0336");
  await expect(dz).toHaveURL(/\/start$/);
  await dz.goto("/designer/join");
  await dz.getByLabel("Your name as buyers see it").fill(`Studio Peony ${suffix}`);
  await dz.getByRole("button", { name: "Continue" }).click();
  await dz.getByLabel("Where you live and are paid").selectOption("TR");
  await dz.getByRole("button", { name: "Continue" }).click();
  await dz.getByRole("button", { name: "Read the full terms" }).click();
  await dz.getByRole("checkbox", { name: /I agree to the Studio Market designer terms/ }).check();
  await dz.getByRole("button", { name: "Agree and continue" }).click();
  await expect(dz).toHaveURL(/\/designer\/join\?joined=1$/);

  await newProject(dz, "Store", "Peony Flowers");
  await dz.goto("/studio/project/setup?step=website");
  await dz.getByRole("button", { name: "Save & continue" }).click();
  await expect(dz).toHaveURL(/step=branding$/);
  const ids = (await dz.locator('input[name="designChoice"]').evaluateAll((inputs) => inputs.map((i) => (i as HTMLInputElement).value))).filter(Boolean);
  await dz.locator(`input[name="designChoice"][value="${ids.find((id) => id.startsWith("studio-")) ?? ids[0]!}"]`).click();
  await dz.getByLabel("Name under the app icon").fill("Peony");
  await dz.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [150, 40, 70]) });
  await expect(dz.getByText("Replace file").first()).toBeVisible();
  await dz.getByRole("button", { name: "Save & continue" }).click();
  await expect(dz).toHaveURL(/step=listing$/);

  await dz.goto("/designer/publish");
  await dz.getByRole("button", { name: "Save and continue" }).click();
  await expect(dz).toHaveURL(/\/designer\/publish\?id=[0-9a-f-]+/);
  const texts = dz.locator("#step-texts");
  await texts.getByRole("textbox", { name: "Title", exact: true }).fill(title);
  await texts.getByRole("textbox", { name: "Short line", exact: true }).fill("Peonies, ribbons and a calm checkout.");
  await texts.getByRole("textbox", { name: "Description", exact: true }).fill("A flower shop where the photos lead.");
  await texts.getByRole("button", { name: "Save and continue" }).click();
  await expect(texts.getByText("Saved.")).toBeVisible();
  for (const id of ["#step-screens", "#step-kinds"]) {
    await dz.locator(id).getByRole("button", { name: "Save and continue" }).click();
    await expect(dz.locator(id).getByText("Saved.")).toBeVisible();
  }
  const plans = dz.locator("#step-plans");
  await plans.getByRole("switch", { name: /Free template/ }).uncheck();
  await plans.getByLabel("Price of 3 months, in US dollars").fill("24");
  await plans.getByLabel("Price of Lifetime, in US dollars").fill("149");
  await plans.getByRole("button", { name: "Save and continue" }).click();
  await expect(plans.getByText("Saved.")).toBeVisible();
  await dz.locator("#step-after").getByRole("button", { name: "Save and continue" }).click();
  await expect(dz.locator("#step-after").getByText("Saved.")).toBeVisible();
  await dz.reload();
  const send = dz.locator("#step-send");
  await send.getByRole("checkbox", { name: /every photo, font and icon/ }).check();
  await send.getByRole("button", { name: "Send for review" }).click();
  await expect(dz).toHaveURL(/\/designer\/templates\?sent=1$/);

  await admin.goto("/admin/market");
  await admin.getByRole("link", { name: new RegExp(title) }).click();
  await admin.getByRole("button", { name: "Approve and publish" }).click();
  await expect(admin.getByText("Approved and published. The designer was emailed.")).toBeVisible();

  // Its address, from the dashboard's market.
  await dz.goto(`/studio/market?q=${encodeURIComponent(title)}`);
  const href = await dz.locator(`[data-template-card] a`).first().getAttribute("href");
  slug = href!.split("/").pop()!;
  expect(slug).toMatch(/^[a-z0-9-]+$/);

});

test("a visitor browses and filters the market, opens the template and signs up to its checkout", async ({ browser }) => {
  const v = await page(browser);
  await v.goto("/templates");
  await expect(v.locator("html")).toHaveAttribute("lang", "en");
  await expect(v.getByRole("heading", { level: 1, name: "Ready designs for your whole app." })).toBeVisible();
  await expect(v).toHaveTitle(/Studio Market/);
  await expect(v.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/templates$/);
  await expect(v.locator('link[rel="alternate"][hreflang="ar"]')).toHaveAttribute("href", /\/ar\/templates$/);
  // The market is in the website's header (Studio's list) and footer.
  await expect(v.locator("footer").getByRole("link", { name: "Studio Market" })).toHaveAttribute("href", "/templates");
  const list = (await jsonLd(v)).find((d) => d["@type"] === "ItemList")!;
  expect(JSON.stringify(list)).toContain(`/templates/${slug}`);
  const card = v.locator(`[data-template-card="${slug}"]`).first();
  await expect(card).toBeVisible();
  await expect(card.locator("[data-price]")).toHaveText("From $8/mo");

  // Search, the price filter and the app kinds.
  await v.getByRole("searchbox", { name: "Search the templates" }).fill(title);
  await v.getByRole("searchbox", { name: "Search the templates" }).press("Enter");
  await expect(v).toHaveURL(/\/templates\?q=/);
  await expect(v.locator("[data-results]")).toHaveAttribute("data-results", "1");
  await expect(v.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await v.getByRole("navigation", { name: "Price" }).getByRole("link", { name: "Free" }).click();
  await expect(v).toHaveURL(/price=free/);
  await expect(v.locator(`[data-template-card="${slug}"]`)).toHaveCount(0);
  await v.getByRole("navigation", { name: "Price" }).getByRole("link", { name: "Paid" }).click();
  await expect(v.locator(`[data-template-card="${slug}"]`)).toBeVisible();
  await v.goto("/templates");
  await v.getByRole("navigation", { name: "Kinds of app" }).getByRole("link", { name: /Store/ }).click();
  await expect(v).toHaveURL(/kind=store/);
  await expect(v.locator(`[data-template-card="${slug}"]`)).toBeVisible();

  // The template's page: its price, the plans and what to know; the demo.
  await v.locator(`[data-template-card="${slug}"] a`).first().click();
  await expect(v).toHaveURL(new RegExp(`/templates/${slug}$`));
  await expect(v.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(v.locator("[data-price-tag]")).toHaveText("$8/mo");
  await expect(v.getByRole("radio", { name: /3 months/ })).toBeVisible();
  await expect(v.getByRole("radio", { name: /Lifetime/ })).toBeVisible();
  await expect(v.locator("[data-know]")).toContainText("No refunds");
  await expect(v.locator("[data-know]")).toContainText("No automatic renewal");
  const product = (await jsonLd(v)).find((d) => d["@type"] === "Product")!;
  expect(product).toMatchObject({ name: title, sku: slug });
  expect((product.offers as { price: string }[]).map((o) => o.price).sort()).toEqual(["149.00", "24.00"]);
  expect(JSON.stringify(product)).not.toContain(designer.email);
  await expect(v.locator("[data-designer]")).not.toContainText(designer.email);
  await v.getByRole("button", { name: "Try the demo" }).first().click();
  await expect(v.getByRole("dialog")).toBeVisible();
  await v.keyboard.press("Escape");
  await expect(v.getByRole("dialog")).toHaveCount(0);

  // Signed out: the plan's button makes an account first, then opens that plan's checkout.
  await expect(v.locator("[data-visitor-note]")).toBeVisible();
  await v.getByRole("radio", { name: /3 months/ }).click();
  await v.getByRole("link", { name: "Apply to my app · $24" }).click();
  await expect(v).toHaveURL(/\/sign-up$/);
  await signUp(v, buyer, "+90 532 000 0337");
  await expect(v).toHaveURL(new RegExp(`/studio/market/checkout/${slug}\\?plan=3m$`));

  // Signed in: straight there, and "Preview it on my app first" opens the dashboard's demo.
  await v.goto(`/templates/${slug}`);
  await expect(v.locator("[data-visitor-note]")).toHaveCount(0);
  await v.getByRole("radio", { name: /Lifetime/ }).click();
  await v.getByRole("link", { name: "Apply to my app · $149" }).click();
  await expect(v).toHaveURL(new RegExp(`/studio/market/checkout/${slug}\\?plan=life$`));
  await v.goto(`/templates/${slug}`);
  await v.getByRole("link", { name: "Preview it on my app first" }).click();
  await expect(v).toHaveURL(new RegExp(`/studio/market/t/${slug}\\?demo=mine$`));
  await expect(v.getByRole("dialog")).toBeVisible();
});

test("in Arabic: right to left, filtered, the template, and signing in back to its checkout", async ({ browser }) => {
  const v = await page(browser, { colorScheme: "dark" });
  await v.goto("/ar/templates");
  await expect(v.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(v.locator("html")).toHaveAttribute("lang", "ar");
  await expect(v.getByRole("heading", { level: 1, name: "تصاميم جاهزة لتطبيقك كله." })).toBeVisible();
  await expect(v.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/ar\/templates$/);
  await expect(v.locator(`[data-template-card="${slug}"] [data-price]`).first()).toContainText("ابتداءً من");
  await v.getByRole("navigation", { name: "السعر" }).getByRole("link", { name: "مدفوع" }).click();
  await expect(v).toHaveURL(/\/ar\/templates\?price=paid/);
  await expect(v.locator(`[data-template-card="${slug}"]`)).toBeVisible();
  await v.locator(`[data-template-card="${slug}"] a`).first().click();
  await expect(v).toHaveURL(new RegExp(`/ar/templates/${slug}$`));
  await expect(v.locator("[data-know]")).toContainText("لا تُسترد المبالغ المدفوعة");
  await expect(v.getByRole("link", { name: /طبّقه على تطبيقي/ })).toBeVisible();
  const product = (await jsonLd(v)).find((d) => d["@type"] === "Product")!;
  expect(product.inLanguage).toBe("ar");
  // "I have an account: sign in": the sign-in in Arabic, then the checkout.
  await v.getByRole("link", { name: "لديّ حساب: تسجيل الدخول" }).click();
  await expect(v).toHaveURL(/\/ar\/sign-in$/);
  await v.getByLabel("البريد الإلكتروني").fill(buyer.email);
  await v.getByLabel("كلمة المرور", { exact: true }).fill(buyer.password);
  await v.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(v).toHaveURL(new RegExp(`/studio/market/checkout/${slug}\\?plan=(3m|life)$`));
});

test("a template not published is page not found, and the sitemap lists the published one in each language", async ({ request }) => {
  // (A draft, one in review and one with changes requested: tests/unit/studio-market-public.test.ts.)
  for (const path of ["/templates/no-such-template", "/ar/templates/no-such-template", "/templates/Not_A_Slug"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  expect((await request.get(`/tr/templates/${slug}`)).status()).toBe(200);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const prefix of ["", "/ar", "/tr"]) expect(sitemap).toContain(`/templates/${slug}</loc>`.replace("/templates", `${prefix}/templates`));
  expect(sitemap).toContain("/templates</loc>");
  expect(sitemap).not.toContain("no-such-template");
  // The Studio demo page links the market.
  const demo = await (await request.get("/demo/studio")).text();
  expect(demo).toContain('href="/templates"');
  expect(problems).toEqual([]);
});
