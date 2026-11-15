import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * 106.1 Studio Market, stage 1, end to end: a freelancer signs up from
 * "Become a designer" (no app, no plan) and joins; designs a store in
 * Studio and publishes it as a template, step by step; the team sends it
 * back with notes, the designer sends it again, the team approves it (the
 * designer is emailed each time); an owner finds it on the market, applies
 * it to one of their apps (the app's draft becomes the template's design),
 * moves it to their other app of the same kind (the first goes back to
 * its own design; not again for 30 days) and goes back to the previous
 * design. The designer can't get their own template.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const designer = { name: "Nur Yılmaz", email: `market-designer-${suffix}@market.test`, password: "nur-market-strong-password-1" };
const buyer = { name: "Tulip Owner", email: `market-buyer-${suffix}@market.test`, password: "tulip-market-strong-password-1" };
const studioName = `Studio Nur ${suffix}`;
const title = `Rose Atelier ${suffix}`;
/** Its own address, so this spec's sign-ups and sign-ins don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.231" };
const problems: string[] = [];
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
  // Studio Market's own pages (Studio's and the app preview's are other specs').
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
  await p.getByLabel("Full name").fill(who.name);
  await p.getByLabel("Email").fill(who.email);
  await p.getByLabel("WhatsApp number").fill(phone);
  await p.getByLabel("Password", { exact: true }).fill(who.password);
  await p.getByRole("checkbox").check();
  await p.getByRole("button", { name: "Create account" }).click();
}

/** A new Studio project of a kind, its content kept in Yallapp. */
async function newProject(p: Page, kind: string, name: string): Promise<void> {
  await p.goto("/studio/new");
  await p.getByRole("radio", { name: new RegExp(`^${kind}( |$)`) }).check();
  await p.getByLabel("Project name").fill(name);
  await p.getByRole("button", { name: "Next" }).click();
  await p.getByRole("radio", { name: "Blank page" }).click();
  await p.getByRole("button", { name: "Next" }).click();
  await expect(p).toHaveURL(/\/studio\/project$/);
}

/** Opens one of the account's Studio projects (its dashboard). */
async function openProject(p: Page, name: string): Promise<void> {
  await p.goto("/studio");
  await p.locator("article").filter({ has: p.getByRole("heading", { name, exact: true }) }).getByRole("button", { name: "Project dashboard" }).click();
  await expect(p).toHaveURL(/\/studio\/project$/);
}

/** Every text on a project's home page as the app gets its draft (the hosted API with the preview's draft token). */
async function homeTexts(p: Page, request: APIRequestContext, name: string): Promise<string[]> {
  await openProject(p, name);
  await p.goto("/studio/project/setup?step=website");
  const api = (await p.locator("code").filter({ hasText: "/api/app/" }).first().textContent())!.trim();
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

test.afterAll(async () => {
  await dz?.context().close();
  await own?.context().close();
});

test("a freelancer signs up from Become a designer, without an app or a plan, and joins", async ({ browser }) => {
  dz = await page(browser);
  await dz.goto("/designer/join");
  await expect(dz.getByRole("heading", { name: "Sell the apps you design in Studio" })).toBeVisible();
  await dz.getByRole("button", { name: "Create an account" }).click();
  await expect(dz).toHaveURL(/\/sign-up$/);
  await signUp(dz, designer, "+90 532 000 0231");
  // Back to finish: the profile, the country, the terms.
  await expect(dz).toHaveURL(/\/designer\/join$/);
  await expect(dz.getByText("Step 1 of 4")).toBeVisible();
  await dz.getByLabel("Your name as buyers see it").fill(studioName);
  await expect(dz.getByLabel("Your address")).toHaveValue(`studio-nur-${suffix}`);
  await dz.getByRole("button", { name: "Continue" }).click();
  await dz.getByLabel("Where you live and are paid").selectOption("TR");
  await dz.getByRole("button", { name: "Continue" }).click();
  await expect(dz.getByText("How a sale is shared")).toBeVisible();
  const agree = dz.getByRole("button", { name: "Agree and continue" });
  await expect(agree).toBeDisabled();
  await dz.getByRole("button", { name: "Read the full terms" }).click();
  await expect(dz.getByText("Studio Market designer terms", { exact: true })).toBeVisible();
  await dz.getByRole("checkbox", { name: /I agree to the Studio Market designer terms/ }).check();
  await agree.click();
  await expect(dz).toHaveURL(/\/designer\/join\?joined=1$/);
  await expect(dz.getByText("You're a designer")).toBeVisible();
  // The designer area, in the dashboard's shell: nothing yet.
  await dz.goto("/designer");
  await expect(dz).toHaveURL(/\/designer\/templates$/);
  await expect(dz.getByText("No templates yet", { exact: true })).toBeVisible();
  await expect(dz.getByRole("link", { name: "Designer area" })).toHaveAttribute("aria-current", "page");
});

test("the designer designs a store in Studio and sends it for review, step by step", async () => {
  // Designing in Studio is free: a store, its look and pages from one of Studio's whole designs.
  await newProject(dz, "Store", "Nur Flowers");
  await dz.goto("/studio/project/setup?step=website");
  await dz.getByRole("button", { name: "Save & continue" }).click();
  await expect(dz).toHaveURL(/step=branding$/);
  const radios = dz.locator('input[name="designChoice"]');
  const ids = (await radios.evaluateAll((inputs) => inputs.map((i) => (i as HTMLInputElement).value))).filter(Boolean);
  const whole = ids.find((id) => id.startsWith("studio-")) ?? ids[0]!;
  await dz.locator(`input[name="designChoice"][value="${whole}"]`).click();
  await dz.getByLabel("Name under the app icon").fill("Nur");
  await dz.locator("#upload-icon").setInputFiles({ name: "icon.png", mimeType: "image/png", buffer: solidPng(1024, 1024, [31, 90, 62]) });
  await expect(dz.getByText("Replace file").first()).toBeVisible();
  await dz.getByRole("button", { name: "Save & continue" }).click();
  await expect(dz).toHaveURL(/step=listing$/);

  await dz.goto("/designer/publish");
  await expect(dz.getByRole("heading", { name: "Publish a template" })).toBeVisible();
  await dz.getByRole("button", { name: "Save and continue" }).click();
  await expect(dz).toHaveURL(/\/designer\/publish\?id=[0-9a-f-]+/);
  const texts = dz.locator("#step-texts");
  // The English tab (Arabic and Turkish are there too, hidden until chosen).
  await texts.getByRole("textbox", { name: "Title", exact: true }).fill(title);
  await texts.getByRole("textbox", { name: "Short line", exact: true }).fill("A soft, photo-led flower shop.");
  await texts.getByRole("textbox", { name: "Description", exact: true }).fill("Big pictures lead every screen; delivery days and the gift checkout stay calm and clear.");
  await texts.getByRole("button", { name: "Save and continue" }).click();
  await expect(texts.getByText("Saved.")).toBeVisible();
  const screens = dz.locator("#step-screens");
  await expect(screens.getByText(/Taken from Studio automatically/)).toBeVisible();
  await expect(screens.getByText("Cover", { exact: true })).toBeVisible();
  await screens.getByRole("button", { name: "Save and continue" }).click();
  await expect(screens.getByText("Saved.")).toBeVisible();
  const kinds = dz.locator("#step-kinds");
  await kinds.getByLabel("Tags").fill("flowers, gifts");
  await kinds.getByRole("button", { name: "Save and continue" }).click();
  await expect(kinds.getByText("Saved.")).toBeVisible();
  await dz.locator("#step-plans").getByRole("button", { name: "Save and continue" }).click();
  await expect(dz.locator("#step-plans").getByText("Saved.")).toBeVisible();
  await dz.locator("#step-after").getByText("The app goes back to its previous design").click();
  await dz.locator("#step-after").getByRole("button", { name: "Save and continue" }).click();
  await expect(dz.locator("#step-after").getByText("Saved.")).toBeVisible();
  await dz.reload();
  const send = dz.locator("#step-send");
  await expect(send.getByRole("button", { name: "Send for review" })).toBeDisabled();
  await send.getByRole("checkbox", { name: /every photo, font and icon/ }).check();
  await send.getByLabel("A note to our team (optional)").fill("My first template.");
  await send.getByRole("button", { name: "Send for review" }).click();
  await expect(dz).toHaveURL(/\/designer\/templates\?sent=1$/);
  await expect(dz.getByText("Sent for review. We'll email you when it's published, or with notes.")).toBeVisible();
  const row = dz.locator("tr").filter({ hasText: title });
  await expect(row.getByText("In review")).toBeVisible();
});

test("the team asks for a change, the designer sends it again, and the team approves and publishes it", async ({ browser }) => {
  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.marketAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.getByRole("link", { name: /Review queue/ }).click();
  await expect(admin).toHaveURL(/\/admin\/market$/);
  await admin.getByRole("link", { name: new RegExp(title) }).click();
  await expect(admin.getByRole("heading", { name: title, level: 2 })).toBeVisible();
  await expect(admin.getByText("My first template.")).toBeVisible();
  await expect(admin.getByText("App goes back to its design")).toBeVisible();
  // Changes need notes.
  await admin.getByRole("button", { name: "Request changes" }).click();
  await expect(admin.getByText("Write the notes to the designer: what needs a change.")).toBeVisible();
  await admin.getByLabel("Notes to the designer").fill("In dark mode, the prices on the cards are hard to read.");
  await admin.getByRole("button", { name: "Request changes" }).click();
  await expect(admin.getByText("Changes requested. The designer was emailed with your notes.")).toBeVisible();
  await expect.poll(async () => (await mailsTo(designer.email)).map((m) => m.subject)).toContain(`${title}: a few changes before it's published`);
  expect((await mailsTo(designer.email)).at(-1)!.text).toContain("hard to read");

  // The designer reads the notes and sends it again.
  await dz.goto("/designer/templates");
  const row = dz.locator("tr").filter({ hasText: title }).first();
  await expect(row.getByText("Changes requested")).toBeVisible();
  await expect(dz.getByText("In dark mode, the prices on the cards are hard to read.")).toBeVisible();
  await dz.getByRole("link", { name: "Send again" }).click();
  await expect(dz).toHaveURL(/#step-send$/);
  const send = dz.locator("#step-send");
  await send.getByRole("checkbox", { name: /every photo, font and icon/ }).check();
  await send.getByRole("button", { name: "Send for review" }).click();
  await expect(dz).toHaveURL(/\/designer\/templates\?sent=1$/);

  await admin.goto("/admin/market");
  await expect(admin.getByText("Sent again").first()).toBeVisible();
  await admin.getByRole("checkbox", { name: "Every screen opens in light and dark" }).check();
  await admin.getByRole("checkbox", { name: "Text is easy to read" }).check();
  await expect(admin.getByText("2/8")).toBeVisible();
  await admin.getByRole("button", { name: "Approve and publish" }).click();
  await expect(admin.getByText("Approved and published. The designer was emailed.")).toBeVisible();
  await expect(admin.getByText("Nothing waiting")).toBeVisible();
  await expect.poll(async () => (await mailsTo(designer.email)).map((m) => m.subject)).toContain(`${title} is on Studio Market`);
  await admin.context().close();

  await dz.goto("/designer/templates");
  await expect(dz.locator("tr").filter({ hasText: title }).first().getByText("Published")).toBeVisible();
});

test("an owner applies it to one of their apps, moves it to the other and goes back to the previous design", async ({ browser, request }) => {
  const designed = await homeTexts(dz, request, "Nur Flowers");
  expect(designed.length).toBeGreaterThan(0);

  own = await page(browser);
  await own.goto("/sign-up");
  await signUp(own, buyer, "+90 532 000 0232");
  await expect(own).toHaveURL(/\/start$/);
  await newProject(own, "Store", "Tulip Flowers");
  await newProject(own, "Store", "Tulip Gifts");
  const flowersBefore = await homeTexts(own, request, "Tulip Flowers");
  const giftsBefore = await homeTexts(own, request, "Tulip Gifts");
  expect(flowersBefore).not.toEqual(designed);

  // The market: in the dashboard's dark bar and its own menu.
  await own.goto("/dashboard/studio-market");
  await expect(own.getByRole("link", { name: "Studio Market" }).first()).toHaveAttribute("aria-current", "page");
  await expect(own.getByRole("heading", { name: "Whole app designs, ready to apply" })).toBeVisible();
  await own.getByLabel("Search templates").fill(suffix);
  await own.getByLabel("Search templates").press("Enter");
  await expect(own.getByRole("heading", { name: "1 template" })).toBeVisible();
  await own.getByRole("link", { name: title }).first().click();
  await expect(own).toHaveURL(/\/dashboard\/studio-market\/t\//);
  await expect(own.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  await expect(own.getByText("Never ends · every update")).toBeVisible();
  // The demo, every page in a large phone.
  await own.getByRole("button", { name: "Try the demo" }).first().click();
  await expect(own.getByRole("dialog")).toBeVisible();
  await own.getByRole("button", { name: "Close" }).click();
  await expect(own.getByRole("dialog")).toHaveCount(0);
  // On my app first: the same with the app's name.
  await own.getByLabel("The app it goes on").selectOption({ label: "Tulip Flowers" });
  await own.getByRole("button", { name: "Preview it on my app first" }).click();
  await expect(own.getByRole("dialog", { name: `${title} on Tulip Flowers` })).toBeVisible();
  await own.keyboard.press("Escape");

  await own.getByRole("button", { name: "Apply to my app" }).click();
  await expect(own.getByText("Applied to your app's draft. Publish it from Studio when you're ready.")).toBeVisible();
  // The template's home, as the app serves it (what shows only with the shop's own data, like a running flash sale, waits for it).
  const applied = await homeTexts(own, request, "Tulip Flowers");
  expect(applied).not.toEqual(flowersBefore);
  expect(applied.filter((text) => !designed.includes(text))).toEqual([]);
  expect(applied.length).toBeGreaterThan(designed.length / 2);

  // My templates: on Tulip Flowers; switch it to Tulip Gifts.
  await own.goto("/dashboard/studio-market/mine");
  const row = own.locator("tr").filter({ hasText: title });
  await expect(row.getByText("Active")).toBeVisible();
  await expect(row.getByText("Tulip Flowers", { exact: true })).toBeVisible();
  await row.getByRole("link", { name: "Switch app" }).click();
  await expect(own.getByRole("heading", { name: "Switch app", level: 2 })).toBeVisible();
  await own.locator("#switch select").selectOption({ label: "Tulip Gifts" });
  await own.getByRole("button", { name: "Move it" }).click();
  await expect(own.getByText("Moved. The first app went back to the design it had before.")).toBeVisible();
  expect(await homeTexts(own, request, "Tulip Flowers")).toEqual(flowersBefore);
  expect(await homeTexts(own, request, "Tulip Gifts")).toEqual(applied);
  // Not again for 30 days.
  await own.goto("/dashboard/studio-market/mine#switch");
  await expect(own.getByRole("button", { name: "Move it" })).toBeDisabled();
  await expect(own.getByText(/You can move it again on/)).toBeVisible();

  // Back to the previous design (asked first).
  own.once("dialog", (d) => void d.accept());
  await own.locator("tr").filter({ hasText: title }).getByRole("button", { name: "Back to the previous design" }).click();
  await expect(own.getByText("Your app went back to the design it had before.")).toBeVisible();
  expect(await homeTexts(own, request, "Tulip Gifts")).toEqual(giftsBefore);
  await own.goto("/dashboard/studio-market/mine");
  await expect(own.locator("tr").filter({ hasText: title }).getByText("Not applied")).toBeVisible();
  await expect(own.getByRole("button", { name: "Apply to an app" })).toBeVisible();
});

test("the designer can't get their own template, and the market's pages read in Arabic", async () => {
  await dz.goto("/dashboard/studio-market");
  await dz.getByRole("link", { name: title }).first().click();
  await expect(dz.getByText("This is your template")).toBeVisible();
  await expect(dz.getByRole("button", { name: "Apply to my app" })).toHaveCount(0);
  // Arabic, right to left, with the market's Arabic name.
  await own.goto("/dashboard/studio-market");
  await own.getByRole("button", { name: "العربية" }).first().click();
  await expect(own.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(own.getByRole("heading", { name: "تصميمات كاملة لتطبيقك، جاهزة تتطبّق" })).toBeVisible();
  await expect(own.getByRole("link", { name: /ماركت Studio/ }).first()).toBeVisible();
  await own.getByRole("button", { name: "English" }).first().click();
  expect(problems).toEqual([]);
});
