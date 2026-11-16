import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakeKashier, type FakeGateway } from "./fake-gateways";
import { solidPng } from "./png";

/**
 * 106.2 Studio Market, stage 2, end to end: a designer offers a template
 * for 3 months at $24 (and lifetime at $149); an owner buys the 3-month
 * plan for one of their apps through (a fake) Kashier, in pounds at the
 * team's rate, and the template goes on the app; renews it from its end
 * date; the daily job reminds them 14 days before and on the last day,
 * then ends the plan: the design stays without updates. With "back to the
 * previous design", a second app goes back to its own design at the end.
 */
// Each test opens several pages and app previews: more time than the default minute.
test.describe.configure({ mode: "serial", timeout: 180_000 });

const suffix = Date.now().toString(36);
const designer = { name: "Lale Demir", email: `paid-designer-${suffix}@market.test`, password: "lale-market-strong-password-1" };
const buyer = { name: "Zeynep Owner", email: `paid-buyer-${suffix}@market.test`, password: "zeynep-market-strong-password-1" };
const title = `Peony House ${suffix}`;
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.233" };
const job = { authorization: `Bearer ${E2E.internalJobSecret}` };
const problems: string[] = [];
let kashier: FakeGateway;
let admin: Page;
let dz: Page;
let own: Page;

interface SentMail {
  to: string;
  subject: string;
  text: string;
  sentAt: string;
}

async function mailsTo(email: string): Promise<SentMail[]> {
  const dir = path.resolve(E2E.mailDir);
  const files = await readdir(dir).catch(() => [] as string[]);
  const mails = await Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as SentMail));
  return mails.filter((m) => m.to === email).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

async function page(browser: Browser): Promise<Page> {
  const p = await (await browser.newContext({ extraHTTPHeaders })).newPage();
  const browserNote = /was preloaded using link preload|WebGL|GL Driver Message/;
  const ours = () => /\/(?:dashboard\/studio-market|designer|admin\/market)(?:[/?#]|$)/.test(new URL(p.url()).pathname + "/");
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

async function openProject(p: Page, name: string): Promise<void> {
  await p.goto("/studio");
  await p.locator("article").filter({ has: p.getByRole("heading", { name, exact: true }) }).getByRole("button", { name: "Project dashboard" }).click();
  await expect(p).toHaveURL(/\/studio\/project$/);
}

/** Every text on a project's home page as the app gets its draft. */
async function homeTexts(p: Page, request: APIRequestContext, name: string): Promise<string[]> {
  await openProject(p, name);
  await p.goto("/studio/project/setup?step=website");
  const api = (await p.locator("code").filter({ hasText: "/api/app/" }).first().textContent())!.trim();
  // Only the preview's address (its draft token) is needed: the app itself isn't loaded in it.
  await p.route("**/preview-app/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Preview</title>" }));
  await p.goto("/studio/project/preview?pages=draft");
  const src = (await p.locator("iframe[data-testid=app-preview]").first().getAttribute("src"))!;
  const headers = { "x-yallapp-preview": new URL(src, E2E.baseURL).searchParams.get("token")! };
  const home = await request.get(`${api}/pages/home?platform=android`, { headers });
  expect(home.status()).toBe(200);
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) return v.forEach(walk);
    const o = v as Record<string, unknown>;
    if (typeof o.text === "string" && o.text.trim()) out.push(o.text);
    Object.values(o).forEach(walk);
  };
  walk(((await home.json()) as { studio?: unknown }).studio);
  return out.sort();
}

/** The template's design on an app: its texts (what shows depends on each app's own data, like a flash sale). */
function expectDesigned(texts: string[]): void {
  expect(texts.filter((text) => !designed.includes(text))).toEqual([]);
  expect(texts.length).toBeGreaterThan(designed.length / 2);
}

/** The licence's end, set by the team (Admin › Studio Market › Sales), `hours` from now. */
async function endIn(hours: number, row: string): Promise<void> {
  await admin.goto("/admin/market/sales");
  const tr = admin.locator("tr[data-order]").filter({ hasText: title }).filter({ hasText: row }).first();
  const when = new Date(Date.now() + hours * 3_600_000).toISOString().slice(0, 16);
  await tr.locator('input[name="ends"]').fill(when);
  await tr.getByRole("button", { name: "Change end" }).click();
  await expect(admin.getByText("The end date was changed.")).toBeVisible();
}

/** Pays on the fake Kashier page, back to My templates. */
async function payOnKashier(p: Page, total: string): Promise<void> {
  await expect(p.getByText(`Total ${total}`)).toBeVisible();
  await p.getByRole("button", { name: "Pay with test card" }).click();
  await expect(p).toHaveURL(/\/dashboard\/studio-market\/mine\?done=/);
}

test.beforeAll(async ({ browser }) => {
  kashier = await startFakeKashier(E2E.kashierPort);
  admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.marketAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
});

/** Yallapp's Kashier account and rate as they were (no keys, no rate), for the other specs. */
async function putSettingsBack(): Promise<void> {
  await admin.goto("/admin/settings/payments");
  const billing = admin.getByRole("region", { name: "Yallapp's plan payments" });
  await billing.getByLabel("EGP for 1 US dollar").fill("");
  await billing.getByRole("button", { name: "Save plan payments" }).click();
  await expect(billing.getByText(/Plans are paid through Yallapp's Kashier account\./)).toBeVisible();
  const keys = admin.getByRole("region", { name: "Yallapp's Kashier account" });
  if (await keys.getByRole("button", { name: "Remove keys" }).count()) await keys.getByRole("button", { name: "Remove keys" }).click();
  await expect(keys).toContainText("Now: not set.");
}

test.afterAll(async () => {
  // Even when a test failed on the way.
  await putSettingsBack().catch(() => undefined);
  await dz?.context().close();
  await own?.context().close();
  await admin?.close();
  await kashier?.close();
});

test("the team's Kashier account and rate: templates are paid in pounds through Yallapp's own account", async () => {
  await admin.goto("/admin/settings/payments");
  const k = admin.getByRole("region", { name: "Yallapp's Kashier account" });
  await k.getByLabel("Merchant ID").fill("MID-5252-525");
  await k.getByLabel("Payment API key").fill("kashier-test-api-key");
  await k.getByLabel("Secret key").fill("kashier-test-secret");
  await k.getByRole("button", { name: "Save keys" }).click();
  await expect(k.getByText("Kashier account saved.")).toBeVisible();
  const billing = admin.getByRole("region", { name: "Yallapp's plan payments" });
  await billing.getByLabel("EGP for 1 US dollar").fill("50");
  await billing.getByRole("button", { name: "Save plan payments" }).click();
  await expect(billing.getByText(/Plans are paid through Yallapp's Kashier account\./)).toBeVisible();
});

test("a designer offers a template for 3 months at $24 and for good at $149, and the team publishes it", async ({ browser }) => {
  dz = await page(browser);
  await signUp(dz, designer, "+90 532 000 0233");
  await dz.goto("/designer/join");
  await dz.getByLabel("Your name as buyers see it").fill(`Studio Lale ${suffix}`);
  await dz.getByRole("button", { name: "Continue" }).click();
  await dz.getByLabel("Where you live and are paid").selectOption("TR");
  await dz.getByRole("button", { name: "Continue" }).click();
  await dz.getByRole("button", { name: "Read the full terms" }).click();
  await dz.getByRole("checkbox", { name: /I agree to the Studio Market designer terms/ }).check();
  await dz.getByRole("button", { name: "Agree and continue" }).click();
  await expect(dz).toHaveURL(/\/designer\/join\?joined=1$/);

  await newProject(dz, "Store", "Lale Flowers");
  await dz.goto("/studio/project/setup?step=website");
  await dz.getByRole("button", { name: "Save & continue" }).click();
  await expect(dz).toHaveURL(/step=branding$/);
  const ids = (await dz.locator('input[name="designChoice"]').evaluateAll((inputs) => inputs.map((i) => (i as HTMLInputElement).value))).filter(Boolean);
  await dz.locator(`input[name="designChoice"][value="${ids.find((id) => id.startsWith("studio-")) ?? ids[0]!}"]`).click();
  await dz.getByLabel("Name under the app icon").fill("Lale");
  await dz.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [120, 40, 80]) });
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
  // Paid: 3 months and lifetime, each with the designer's share shown as it is typed.
  const plans = dz.locator("#step-plans");
  await plans.getByRole("switch", { name: /Free template/ }).uncheck();
  await plans.getByRole("button", { name: "Save and continue" }).click();
  await expect(plans.getByText("Offer at least one plan, or make the template free.")).toBeVisible();
  await plans.getByLabel("Price of 3 months, in US dollars").fill("0.5");
  await plans.getByRole("button", { name: "Save and continue" }).click();
  await expect(plans.getByText("Enter a price from $1 to $10,000, like 24 or 24.50.")).toBeVisible();
  await plans.getByLabel("Price of 3 months, in US dollars").fill("24");
  await expect(plans.locator('[data-plan-row="3m"]')).toContainText("You get $18");
  await expect(plans.locator('[data-plan-row="3m"]')).toContainText("$8/mo");
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
  await expect(admin.getByText("$24")).toBeVisible();
  await admin.getByRole("button", { name: "Approve and publish" }).click();
  await expect(admin.getByText("Approved and published. The designer was emailed.")).toBeVisible();
});

let flowersBefore: string[] = [];
let giftsBefore: string[] = [];
let designed: string[] = [];
let firstEnd = "";

test("an owner buys the 3-month plan for one of their apps: paid in pounds on Kashier, the template on the app, a receipt", async ({ browser, request }) => {
  designed = await homeTexts(dz, request, "Lale Flowers");
  own = await page(browser);
  await signUp(own, buyer, "+90 532 000 0234");
  await newProject(own, "Store", "Zeynep Flowers");
  await newProject(own, "Store", "Zeynep Gifts");
  await newProject(own, "Restaurant", "Zeynep Café");
  flowersBefore = await homeTexts(own, request, "Zeynep Flowers");
  giftsBefore = await homeTexts(own, request, "Zeynep Gifts");

  await own.goto(`/dashboard/studio-market?q=${suffix}`);
  const card = own.locator(`[data-template-card]`).filter({ hasText: title });
  await expect(card).toContainText("From $8/mo");
  await card.getByRole("link", { name: title }).click();
  await expect(own.locator("[data-price-tag]")).toHaveText("$8/mo");
  await expect(own.getByRole("radio", { name: /3 months/ })).toHaveAttribute("aria-checked", "true");
  await own.getByRole("link", { name: "Apply to my app · $24" }).click();

  // Checkout: the plan, the app (the café greyed out with why), Kashier's charge in pounds.
  await expect(own).toHaveURL(/\/studio-market\/checkout\/[\w-]+\?plan=3m$/);
  await expect(own.getByRole("heading", { name: "Checkout.", level: 1 })).toBeVisible();
  const cafe = own.locator('label[data-app]').filter({ hasText: "Zeynep Café" });
  await expect(cafe).toContainText("Made for Store apps only.");
  await expect(cafe.getByRole("radio")).toBeDisabled();
  await own.locator('label[data-app]').filter({ hasText: "Zeynep Flowers" }).click();
  await expect(own.locator("[data-total]")).toHaveText("$24");
  await expect(own.locator("[data-charge-line]")).toHaveText("You'll be charged EGP 1,200 (about $24); your bank may convert it.");
  await expect(own.getByText(/Then the design stays in Zeynep Flowers, without updates\./)).toBeVisible();
  await own.getByRole("button", { name: "Pay $24" }).click();
  await expect(own.getByText("Tick the box to agree: it's digital content, applied right away, without refunds.")).toBeVisible();
  await own.getByRole("checkbox", { name: /I understand this is digital content/ }).check();
  await own.getByRole("button", { name: "Pay $24" }).click();
  await payOnKashier(own, "1200.00 EGP");
  expect(kashier.started!.at(-1)).toMatchObject({ amount: "1200.00", currency: "EGP", type: "one-time" });
  await expect(own.getByText("Payment received. The template is on your app.")).toBeVisible();
  const row = own.locator("tr[data-licence]").filter({ hasText: title });
  await expect(row).toContainText("3 months");
  await expect(row).toContainText("Zeynep Flowers");
  firstEnd = (await row.locator("[data-ends]").textContent())!;
  expect(firstEnd).toMatch(/^Ends /);
  expectDesigned(await homeTexts(own, request, "Zeynep Flowers"));
  // The webhook and the return delivered it once.
  expect(kashier.webhooks.at(-1)).toMatchObject({ status: 200 });
  await expect.poll(async () => (await mailsTo(buyer.email)).map((m) => m.subject)).toContain(`Receipt: ${title} on Studio Market`);
  const receipt = (await mailsTo(buyer.email)).find((m) => m.subject.startsWith("Receipt:"))!;
  expect(receipt.text).toMatch(/Paid: EGP\s1,200 \(about \$24\) by card through Kashier/);
  expect(receipt.text).toContain("It's on Zeynep Flowers now.");
  expect(receipt.text).toContain("can't be refunded");
});

test("they renew it from its end date", async () => {
  await own.goto("/dashboard/studio-market/mine");
  const row = own.locator("tr[data-licence]").filter({ hasText: title });
  await row.getByRole("link", { name: "Renew" }).click();
  await expect(own.getByRole("heading", { name: "Renew.", level: 1 })).toBeVisible();
  await expect(own.getByText(/It stays on Zeynep Flowers; the new period starts/)).toBeVisible();
  await own.getByRole("checkbox", { name: /I understand this is digital content/ }).check();
  await own.getByRole("button", { name: "Pay $24" }).click();
  await payOnKashier(own, "1200.00 EGP");
  await expect(own.getByText("Payment received. Your plan was renewed.")).toBeVisible();
  const ends = (await own.locator("tr[data-licence]").filter({ hasText: title }).locator("[data-ends]").textContent())!;
  expect(ends).toMatch(/^Ends /);
  expect(ends).not.toBe(firstEnd);
});

test("the daily job reminds them 14 days before and on the last day, once each, then the plan ends and the design stays", async ({ request }) => {
  expect((await request.post("/api/internal/daily")).status()).toBe(401);
  const reminders = async () => (await mailsTo(buyer.email)).filter((m) => m.subject.includes("your plan ends on"));

  await endIn(10 * 24, buyer.name);
  expect((await request.post("/api/internal/daily", { headers: job })).status()).toBe(200);
  await request.post("/api/internal/daily", { headers: job });
  await expect.poll(async () => (await reminders()).length).toBe(1);
  expect((await reminders())[0]!.text).toContain("ends in 10 days");
  expect((await reminders())[0]!.text).toContain("/dashboard/studio-market/checkout/");

  await endIn(12, buyer.name);
  await request.post("/api/internal/daily", { headers: job });
  await request.post("/api/internal/daily", { headers: job });
  await expect.poll(async () => (await reminders()).length).toBe(2);
  expect((await reminders())[1]!.text).toContain("Today is the last day");

  await endIn(-1, buyer.name);
  const ran = await request.post("/api/internal/daily", { headers: job });
  expect((await ran.json()).studioMarket).toMatchObject({ ended: 1 });
  await expect.poll(async () => (await mailsTo(buyer.email)).map((m) => m.subject)).toContain(`${title}: your plan ended`);
  expect((await mailsTo(buyer.email)).find((m) => m.subject.endsWith("your plan ended"))!.text).toContain("The design stays on Zeynep Flowers as it is now, without updates.");
  await own.goto("/dashboard/studio-market/mine");
  const row = own.locator("tr[data-licence]").filter({ hasText: title });
  await expect(row).toContainText("Ended");
  await expect(row.getByRole("link", { name: "Buy again" })).toBeVisible();
});

test("with “back to the previous design”, the other app goes back to its own design when its plan ends", async ({ request }) => {
  // The designer's choice changes for the next purchases.
  await dz.goto("/designer/templates");
  await dz.locator("tr").filter({ hasText: title }).getByRole("link", { name: "Edit" }).click();
  await dz.locator("#step-after").getByText("The app goes back to its previous design").click();
  await dz.locator("#step-after").getByRole("button", { name: "Save and continue" }).click();
  await expect(dz.locator("#step-after").getByText("Saved.")).toBeVisible();

  await own.goto(`/dashboard/studio-market?q=${suffix}`);
  const slug = await own.locator("[data-template-card]").filter({ hasText: title }).getAttribute("data-template-card");
  await own.goto(`/dashboard/studio-market/checkout/${slug}?plan=3m`);
  await own.locator('label[data-app]').filter({ hasText: "Zeynep Gifts" }).click();
  await expect(own.getByText(/Then Zeynep Gifts goes back to the design it had before\./)).toBeVisible();
  await own.getByRole("checkbox", { name: /I understand this is digital content/ }).check();
  await own.getByRole("button", { name: "Pay $24" }).click();
  await payOnKashier(own, "1200.00 EGP");
  expectDesigned(await homeTexts(own, request, "Zeynep Gifts"));

  await endIn(-1, buyer.name);
  const ran = await request.post("/api/internal/daily", { headers: job });
  expect((await ran.json()).studioMarket).toMatchObject({ ended: 1, restored: 1 });
  expect(await homeTexts(own, request, "Zeynep Gifts")).toEqual(giftsBefore);
  // The first app kept the template's design (it ended without updates).
  expectDesigned(await homeTexts(own, request, "Zeynep Flowers"));
  expect(flowersBefore).not.toEqual(designed);
  expect(problems).toEqual([]);
});

test("the team puts the payment settings back", async () => {
  await putSettingsBack();
});
