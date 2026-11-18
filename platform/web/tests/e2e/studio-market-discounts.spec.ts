import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { startFakeKashier, type FakeGateway } from "./fake-gateways";
import { solidPng } from "./png";

/**
 * 106.12 Studio Market, stage 4, end to end: a designer selling a template
 * for 3 months at $24 and lifetime at $149 makes a price drop ($4 off 3
 * months), a flash sale (20% off every plan for two hours) and coupon codes
 * (LALE30: 30% off 3 months, once; SPRING5, ended). The market shows the
 * template in its flash strip with a live countdown and the old price
 * struck through; at checkout the buyer's code gives the better price
 * ($16.80 instead of the flash sale's $19.20), paid on (a fake) Kashier,
 * and the sale's split is of what was paid. An unknown, an ended, a
 * used-up and another plan's code are refused, and so is a total changed
 * in the browser. Then the same in Arabic.
 */
test.describe.configure({ mode: "serial", timeout: 180_000 });

const suffix = Date.now().toString(36);
const designer = { name: "Lale Yıldız", email: `discount-designer-${suffix}@market.test`, password: "lale-discount-strong-password-1" };
const buyer = { name: "Zeynep Buyer", email: `discount-buyer-${suffix}@market.test`, password: "zeynep-discount-strong-password-1" };
const title = `Rose Atelier ${suffix}`;
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.234" };
const problems: string[] = [];
let kashier: FakeGateway;
let admin: Page;
let dz: Page;
let own: Page;
let templateId = "";
let slug = "";

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

/** A time from now as the designer's form takes it: their time zone (a +90 number: Istanbul). */
function istanbul(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(Date.now() + ms));
  const get = (type: string) => parts.find((x) => x.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Switches the dashboard's language from its own buttons (a click before the page is ready does nothing: tried again). */
async function language(p: Page, name: "العربية" | "English", dir: "rtl" | "ltr"): Promise<void> {
  await expect(async () => {
    await p.getByRole("button", { name }).first().click();
    await expect(p.locator("html")).toHaveAttribute("dir", dir, { timeout: 5_000 });
  }).toPass({ timeout: 30_000 });
}

/** The section of a kind of discount on the template's discounts page. */
const section = (kind: "drop" | "flash" | "coupon"): Locator => dz.locator(`section#${kind}`);

/** Applies a code on the checkout page (Enter or the button), and waits for the page to answer. */
async function applyCode(p: Page, code: string, button = "Apply"): Promise<void> {
  await p.locator("#discount-code").fill(code);
  await p.getByRole("button", { name: button, exact: true }).click();
  await expect(p).toHaveURL(new RegExp(`[?&]code=${encodeURIComponent(code)}(&|$)`));
  await expect(p.locator("[data-code-message]")).toBeVisible();
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
  await putSettingsBack().catch(() => undefined);
  await dz?.context().close();
  await own?.context().close();
  await admin?.close();
  await kashier?.close();
});

test("Yallapp's Kashier account and rate, and a paid template the team publishes", async ({ browser }) => {
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

  dz = await page(browser);
  await signUp(dz, designer, "+90 532 000 0333");
  await dz.goto("/designer/join");
  await dz.getByLabel("Your name as buyers see it").fill(`Studio Rose ${suffix}`);
  await dz.getByRole("button", { name: "Continue" }).click();
  await dz.getByLabel("Where you live and are paid").selectOption("TR");
  await dz.getByRole("button", { name: "Continue" }).click();
  await dz.getByRole("button", { name: "Read the full terms" }).click();
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
  templateId = new URL(dz.url()).searchParams.get("id")!;
  const texts = dz.locator("#step-texts");
  await texts.getByRole("textbox", { name: "Title", exact: true }).fill(title);
  await texts.getByRole("textbox", { name: "Short line", exact: true }).fill("Roses, ribbons and a calm checkout.");
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
});

test("the designer makes a price drop, a flash sale and coupon codes", async () => {
  // Designer area › Discounts: the paid template, with Manage discounts.
  await dz.goto("/designer/templates");
  await dz.getByRole("link", { name: "Discounts", exact: true }).first().click();
  await expect(dz).toHaveURL(/\/designer\/discounts$/);
  const row = dz.locator(`tr[data-template="${templateId}"]`);
  await expect(row).toContainText("3 months · $24");
  await expect(row).toContainText("No discount running");
  await row.getByRole("link", { name: "Manage discounts" }).click();
  await expect(dz).toHaveURL(new RegExp(`/designer/discounts/${templateId}$`));

  // A price drop: $4 off the 3-month plan, from now on; its prices shown as it is typed.
  await section("drop").getByRole("button", { name: "New price drop" }).click();
  const drop = section("drop").getByRole("form", { name: "New price drop" });
  await expect(drop.getByText("Times are in Europe/Istanbul.")).toBeVisible();
  await drop.getByText("An amount", { exact: true }).click();
  await drop.getByLabel("Amount off, in US dollars").fill("4");
  await drop.getByLabel("All plans, also those you add later").uncheck();
  await drop.getByLabel("Lifetime", { exact: true }).uncheck();
  await expect(drop.locator('[data-preview="3m"]')).toContainText("$20");
  await expect(drop.locator('[data-preview="life"]')).toHaveCount(0);
  await drop.getByRole("button", { name: "Save" }).click();
  await expect(section("drop").getByText("Saved. It works on its own from its start.")).toBeVisible();
  await expect(section("drop").locator("tr[data-discount]")).toHaveCount(1);
  await expect(section("drop").locator("tr[data-discount]")).toContainText("$4 off");
  await expect(section("drop").locator("tr[data-discount]")).toContainText("3 months");
  await expect(section("drop").locator("tr[data-discount]")).toContainText("Running");

  // A flash sale: 20% off every plan for two hours (up to 14 days; a longer one is refused).
  await section("flash").getByRole("button", { name: "New flash sale" }).click();
  const flash = section("flash").getByRole("form", { name: "New flash sale" });
  await flash.getByLabel("Percentage off").fill("20");
  await expect(flash.locator('[data-preview="life"]')).toContainText("$119.20");
  await flash.getByLabel("Ends", { exact: true }).fill(istanbul(15 * 24 * 3_600_000));
  await flash.getByRole("button", { name: "Save" }).click();
  await expect(flash.getByText("A flash sale runs up to 14 days.")).toBeVisible();
  await expect(flash.getByLabel("Percentage off")).toHaveValue("20");
  await flash.getByLabel("Ends", { exact: true }).fill(istanbul(2 * 3_600_000));
  await flash.getByRole("button", { name: "Save" }).click();
  await expect(section("flash").getByText("Saved. It works on its own from its start.")).toBeVisible();
  await expect(section("flash").locator("tr[data-discount]")).toContainText("20% off");
  await expect(section("flash").locator("tr[data-discount]")).toContainText("All plans");

  // Coupon codes: LALE30, 30% off 3 months, once (typed in small letters); SPRING5, $5 off, ended at once.
  await section("coupon").getByRole("button", { name: "New coupon code" }).click();
  let coupon = section("coupon").getByRole("form", { name: "New coupon code" });
  await coupon.getByLabel("Percentage off").fill("30");
  await coupon.getByLabel("All plans, also those you add later").uncheck();
  await coupon.getByLabel("Lifetime", { exact: true }).uncheck();
  await coupon.getByLabel("Code", { exact: true }).fill("la");
  await coupon.getByRole("button", { name: "Save" }).click();
  await expect(coupon.getByText("Use 3 to 24 letters (A to Z), numbers or dashes for the code.")).toBeVisible();
  await coupon.getByLabel("Code", { exact: true }).fill("lale30");
  await coupon.getByLabel("Usage limit").fill("1");
  await coupon.getByRole("button", { name: "Save" }).click();
  await expect(section("coupon").getByText("Saved. It works on its own from its start.")).toBeVisible();
  const lale = section("coupon").locator('tr[data-code="LALE30"]');
  await expect(lale).toContainText("30% off");
  await expect(lale).toContainText("0 of 1");
  await expect(lale).toContainText("Running");

  await section("coupon").getByRole("button", { name: "New coupon code" }).click();
  coupon = section("coupon").getByRole("form", { name: "New coupon code" });
  await coupon.getByText("An amount", { exact: true }).click();
  await coupon.getByLabel("Amount off, in US dollars").fill("5");
  await coupon.getByLabel("Code", { exact: true }).fill("lale30");
  await coupon.getByRole("button", { name: "Save" }).click();
  await expect(coupon.getByText("This template has this code already. Choose another one.")).toBeVisible();
  await coupon.getByLabel("Code", { exact: true }).fill("Spring5");
  await coupon.getByRole("button", { name: "Save" }).click();
  await expect(section("coupon").getByText("Saved. It works on its own from its start.")).toBeVisible();
  const spring = section("coupon").locator('tr[data-code="SPRING5"]');
  await expect(spring).toContainText("$5 off");
  await expect(spring).toContainText("0, no limit");
  dz.once("dialog", (d) => void d.accept());
  await spring.getByRole("button", { name: "End now" }).click();
  await expect(dz.getByText("Ended. Buyers pay the plan's own price again.")).toBeVisible();
  await expect(dz.locator('tr[data-code="SPRING5"]')).toContainText("Ended");

  // The prices now: the better automatic price on each plan, never both.
  await expect(dz.locator('[data-price-now="3m"]')).toContainText("$19.20");
  await expect(dz.locator('[data-price-now="3m"] [data-was]')).toContainText("$24");
  await expect(dz.locator('[data-price-now="life"]')).toContainText("$119.20");
  await dz.goto("/designer/discounts");
  await expect(dz.locator(`tr[data-template="${templateId}"]`)).toContainText("3 running");
});

test("the market shows the template in its flash strip, with a live countdown and the old price struck through", async ({ browser }) => {
  own = await page(browser);
  await signUp(own, buyer, "+90 532 000 0334");
  await newProject(own, "Store", "Zeynep Flowers");
  await newProject(own, "Store", "Zeynep Gifts");

  await own.goto("/dashboard/studio-market");
  const strip = own.locator("[data-flash-strip]");
  await expect(strip.getByRole("heading", { name: "Lower prices, for a few hours" })).toBeVisible();
  const card = strip.locator("[data-template-card]").filter({ hasText: title });
  await expect(card).toBeVisible();
  slug = (await card.getAttribute("data-template-card"))!;
  await expect(card).toContainText("Flash sale");
  await expect(card).toContainText("From $6.40/mo");
  await expect(card.locator("[data-was]")).toHaveText(/\$8\/mo/);
  // The countdown ticks: under two hours, then a second less.
  const timer = card.getByRole("timer").locator("time");
  await expect(timer).toHaveText(/^Ends in (01:5\d|0[01]:\d\d):\d\d$/);
  const first = await timer.textContent();
  await expect.poll(async () => timer.textContent(), { timeout: 5_000 }).not.toBe(first);

  // Searching keeps the struck price.
  await own.goto(`/dashboard/studio-market?q=${suffix}`);
  await expect(own.locator("[data-template-card]").filter({ hasText: title })).toContainText("From $6.40/mo");

  // The template's page: each plan at its price now, the plan's own struck through, the sale's countdown.
  await own.goto(`/dashboard/studio-market/t/${slug}`);
  await expect(own.locator("[data-price-tag]")).toHaveText("$6.40/mo");
  await expect(own.locator('button[data-plan="3m"]')).toContainText("$19.20");
  await expect(own.locator('button[data-plan="3m"] [data-was]')).toContainText("$24");
  await expect(own.locator('button[data-plan="life"]')).toContainText("$119.20");
  await expect(own.getByRole("timer").first().locator("time")).toHaveText(/^Ends in \d\d:\d\d:\d\d$/);
  await own.getByRole("link", { name: "Apply to my app · $19.20" }).click();
  await expect(own).toHaveURL(/\/studio-market\/checkout\/[\w-]+\?plan=3m$/);
});

test("at checkout the code gives the better price, refused when unknown, ended or for another plan; paid on Kashier", async () => {
  await own.locator("label[data-app]").filter({ hasText: "Zeynep Flowers" }).click();
  // The flash sale's price, with the original and the discount.
  await expect(own.locator("[data-total]")).toHaveText("$19.20");
  await expect(own.locator("[data-list]")).toHaveText("$24");
  await expect(own.locator('[data-discount="flash"]')).toContainText("Flash sale");
  await expect(own.locator('[data-discount="flash"]')).toContainText("−$4.80");

  await applyCode(own, "nope");
  await expect(own.locator("[data-code-message]")).toHaveText("We don't know this code. Check it and try again.");
  await applyCode(own, "spring5");
  await expect(own.locator("[data-code-message]")).toHaveText("This code has expired.");
  await expect(own.locator("[data-total]")).toHaveText("$19.20");

  // LALE30 is for 3 months only: on lifetime it does nothing.
  await applyCode(own, "lale30");
  await expect(own.locator("[data-code-message]")).toHaveText("Code LALE30: 30% off 3 months.");
  await own.locator('label[data-plan="life"]').click();
  await expect(own.locator("[data-code-note]")).toHaveText("This code isn't for the Lifetime plan.");
  await expect(own.locator("[data-total]")).toHaveText("$119.20");
  await own.locator('label[data-plan="3m"]').click();
  await expect(own.locator("[data-code-note]")).toHaveText("Your code gives the better price.");
  await expect(own.locator("[data-total]")).toHaveText("$16.80");
  await expect(own.locator("[data-list]")).toHaveText("$24");
  await expect(own.locator('[data-discount="coupon"]')).toContainText("Code LALE30");
  await expect(own.locator('[data-discount="coupon"]')).toContainText("−$7.20");
  await expect(own.locator("[data-charge-line]")).toHaveText("You'll be charged EGP 840 (about $16.80); your bank may convert it.");
  await expect(own.getByText("Discounts don't add up: you get the better of the sale price or your code.")).toBeVisible();
  await own.getByRole("checkbox", { name: /I understand this is digital content/ }).check();

  // A total changed in the browser is refused, and the page shows the price again.
  await own.locator('input[name="total"]').evaluate((input) => ((input as HTMLInputElement).value = "100"));
  await own.getByRole("button", { name: "Pay $16.80" }).click();
  await expect(own.getByText("The price changed. Check it, then pay again.")).toBeVisible();
  expect(kashier.started ?? []).toHaveLength(0);

  await expect(own.locator('input[name="total"]')).toHaveValue("1680");
  await own.getByRole("button", { name: "Pay $16.80" }).click();
  await payOnKashier(own, "840.00 EGP");
  expect(kashier.started!.at(-1)).toMatchObject({ amount: "840.00", currency: "EGP", type: "one-time" });
  await expect(own.getByText("Payment received. The template is on your app.")).toBeVisible();
  await expect(own.locator("tr[data-licence]").filter({ hasText: title })).toContainText("Zeynep Flowers");
});

test("the sale is split on the price paid, and the code is used up", async () => {
  // Admin › Studio Market › Sales: $16.80 paid, the designer's 75% and Yallapp's 25% of it.
  await admin.goto("/admin/market/sales");
  const sale = admin.locator("tr[data-order]").filter({ hasText: title }).filter({ hasText: "Code LALE30" });
  await expect(sale).toHaveCount(1);
  await expect(sale.locator("td").nth(4)).toContainText("$16.80");
  await expect(sale.locator("td").nth(4)).toContainText("Code LALE30 · $24 − $7.20");
  await expect(sale.locator("td").nth(5)).toHaveText("$12.60");
  await expect(sale.locator("td").nth(6)).toHaveText("$4.20");
  await expect(sale).toContainText("EGP 840");

  // The designer sees it used: once of once.
  await dz.goto(`/designer/discounts/${templateId}`);
  await expect(dz.locator('tr[data-code="LALE30"]')).toContainText("1 of 1");
  await expect(dz.locator('tr[data-code="LALE30"]')).toContainText("Used up");

  // Used up for the next purchase.
  await own.goto(`/dashboard/studio-market/checkout/${slug}?plan=3m`);
  await own.locator('label[data-app="later"]').click();
  await applyCode(own, "LALE30");
  await expect(own.locator("[data-code-message]")).toHaveText("This code is used up.");
  await expect(own.locator("[data-total]")).toHaveText("$19.20");
});

test("the same in Arabic: a new code, the flash strip, the better price paid, and the refusals", async () => {
  // The designer, in Arabic: a code of 50% off every plan, once.
  await dz.goto(`/designer/discounts/${templateId}`);
  await language(dz, "العربية", "rtl");
  await expect(dz.getByRole("heading", { name: "أكواد الخصم" })).toBeVisible();
  await section("coupon").getByRole("button", { name: "كود خصم جديد" }).click();
  const coupon = section("coupon").getByRole("form", { name: "كود خصم جديد" });
  await expect(coupon.getByText("المواعيد بتوقيت Europe/Istanbul.")).toBeVisible();
  await coupon.getByLabel("نسبة الخصم").fill("50");
  await coupon.getByLabel("الكود", { exact: true }).fill("ramadan");
  await coupon.getByLabel("عدد مرات الاستخدام").fill("1");
  await coupon.getByRole("button", { name: "احفظ" }).click();
  await expect(section("coupon").getByText("اتحفظ. هيشتغل لوحده من البداية بتاعته.")).toBeVisible();
  await expect(section("coupon").locator('tr[data-code="RAMADAN"]')).toContainText("خصم 50%");
  await expect(section("coupon").locator('tr[data-code="LALE30"]')).toContainText("خلصت مرّاته");

  // The buyer, in Arabic: the flash strip and its countdown.
  await own.goto("/dashboard/studio-market");
  await language(own, "العربية", "rtl");
  const strip = own.locator("[data-flash-strip]");
  await expect(strip.getByRole("heading", { name: "أسعار أقل لساعات بس" })).toBeVisible();
  const card = strip.locator("[data-template-card]").filter({ hasText: title });
  await expect(card).toContainText("عرض سريع");
  await expect(card.getByRole("timer").locator("time")).toHaveText(/^بيخلص بعد \u2066\d\d:\d\d:\d\d\u2069$/);
  await expect(card.locator("[data-was]")).toContainText("$8");

  // Checkout in Arabic: the refusals, then the code's better price, paid.
  await own.goto(`/dashboard/studio-market/checkout/${slug}?plan=3m`);
  await own.locator("label[data-app]").filter({ hasText: "Zeynep Gifts" }).click();
  await applyCode(own, "spring5", "طبّق");
  await expect(own.locator("[data-code-message]")).toHaveText("الكود ده خلص وقته.");
  await applyCode(own, "lale30", "طبّق");
  await expect(own.locator("[data-code-message]")).toHaveText("الكود ده خلصت مرّات استخدامه.");
  await applyCode(own, "wrong1", "طبّق");
  await expect(own.locator("[data-code-message]")).toHaveText("إحنا مش عارفين الكود ده. راجعه وجرّب تاني.");
  await applyCode(own, "Ramadan", "طبّق");
  await expect(own.locator("[data-code-message]")).toContainText("الكود RAMADAN: خصم");
  await expect(own.locator("[data-code-note]")).toHaveText("الكود بتاعك بيدّيك السعر الأحسن.");
  await expect(own.locator("[data-total]")).toContainText("$12");
  await expect(own.locator('[data-discount="coupon"]')).toContainText("الكود RAMADAN");
  await expect(own.locator('[data-discount="coupon"]')).toContainText("$12");
  await own.getByRole("checkbox", { name: /فاهم إن ده محتوى ديجيتال/ }).check();
  await own.getByRole("button", { name: /^ادفع/ }).click();
  await payOnKashier(own, "600.00 EGP");
  await expect(own.getByText("الدفع وصل. التمبلت اتطبّق على تطبيقك.")).toBeVisible();

  // Used up now, in Arabic too.
  await own.goto(`/dashboard/studio-market/checkout/${slug}?plan=3m`);
  await own.locator('label[data-app="later"]').click();
  await applyCode(own, "RAMADAN", "طبّق");
  await expect(own.locator("[data-code-message]")).toHaveText("الكود ده خلصت مرّات استخدامه.");

  // Its split: $12 paid, $9 and $3.
  await admin.goto("/admin/market/sales");
  const sale = admin.locator("tr[data-order]").filter({ hasText: title }).filter({ hasText: "Code RAMADAN" });
  await expect(sale.locator("td").nth(4)).toContainText("$12");
  await expect(sale.locator("td").nth(5)).toHaveText("$9");
  await expect(sale.locator("td").nth(6)).toHaveText("$3");

  await language(own, "English", "ltr");
  await dz.goto("/designer/discounts");
  await language(dz, "English", "ltr");
  expect(problems).toEqual([]);
});

test("the team puts the payment settings back", async () => {
  await putSettingsBack();
});
