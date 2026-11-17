import { createHmac } from "node:crypto";
import fs from "node:fs";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 132.160–132.169 Screenshots of group A's pages in Studio's console:
 * Delivery & offers and Card messages, Languages, Media, Screen protection,
 * Integrations, App sign-in, Notifications and Chat, in a Studio shop from
 * the Shop template with flash sales, two more languages, files in Media,
 * customers signed in by phone who wrote in the chat, notifications sent and
 * one scheduled; in Arabic (light and dark at 1440×900, light at 390 wide),
 * then what opens on demand (a row's inspector, a fold). Not part of the
 * test suite; run it with
 * `SCREENS_OUT=<dir> npx playwright test --config playwright.screens.config.ts studio-console-a`.
 */
test.describe.configure({ mode: "serial" });

const OUT = process.env.SCREENS_OUT ?? path.resolve(__dirname, "../../test-results/screens");
const PREFIX = process.env.SCREENS_PREFIX ?? "after";
const suffix = Date.now().toString(36);
const owner = { name: "Nour Adel", email: `nour-console-a-${suffix}@studio.test`, password: "nour-console-a-strong-password-1" };
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.171" };
const CUSTOMERS = [
  { name: "Sara Yilmaz", phone: "532 123 45 67", text: "Hello! Can the roses arrive on Friday before 6?" },
  { name: "Omar Hassan", phone: "532 222 33 44", text: "Do you deliver to Kadıköy on Sundays?" },
  { name: "Layla Mansour", phone: "532 555 77 88", text: "Thank you, the bouquet was beautiful." },
];

test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: Number(process.env.SCREENS_SCALE ?? 2), extraHTTPHeaders });

const codes = new Map<string, string>();
let server: Server;

test.beforeAll(async () => {
  // The hosted API sends its sign-in codes here (OTP_SENDER=webhook).
  server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => {
      const expected = `sha256=${createHmac("sha256", E2E.otpWebhookSecret).update(body).digest("base64url")}`;
      if (request.headers["x-yallapp-signature"] !== expected) return void response.writeHead(401).end();
      const { phone, code } = JSON.parse(body) as { phone: string; code: string };
      codes.set(phone, code);
      response.writeHead(204).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(E2E.otpWebhookPort, resolve));
});

test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}

/** The page's top (the viewport) for the report, and all of it beside it to review. */
async function shoot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  fs.mkdirSync(path.join(OUT, "full"), { recursive: true });
  await page.screenshot({ path: path.join(OUT, `${PREFIX}-${name}.jpg`), type: "jpeg", quality: 90 });
  await page.screenshot({ path: path.join(OUT, "full", `${PREFIX}-${name}.jpg`), type: "jpeg", quality: 70, fullPage: true });
}

const sideMenu = (page: Page) => page.locator("nav:has([data-studio-search])").first();

async function language(page: Page, lang: "en" | "ar") {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/studio/project");
  await sideMenu(page).getByRole("button", { name: lang === "ar" ? "العربية" : "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
}

/** Arabic light and dark at the desktop width, then light on a phone. */
async function pageShots(page: Page, href: string, name: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(href);
  await shoot(page, `${name}-ar-light-desktop`);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await shoot(page, `${name}-ar-dark-desktop`);
  await page.emulateMedia({ colorScheme: "light" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await shoot(page, `${name}-ar-light-phone`);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  fs.appendFileSync(path.join(OUT, `${PREFIX}-widths.txt`), `${name} phone scrollWidth ${width}\n`);
  await page.setViewportSize({ width: 1440, height: 900 });
}

/** A customer signs up in the app by phone, then writes to the shop. */
async function customer(request: APIRequestContext, api: string, who: (typeof CUSTOMERS)[number], i: number) {
  const headers = { "x-forwarded-for": `198.51.100.${190 + i}` };
  const device = { id: `console-a-${suffix}-${i}`, platform: "android", name: "Pixel 8", app_version: "1.0.0" };
  const phone = `+90${who.phone.replace(/\s/g, "")}`;
  const requested = await request.post(`${api}/auth/otp/request`, { data: { country_code: "+90", phone: who.phone }, headers });
  expect(requested.status(), await requested.text()).toBe(200);
  const { request_id } = (await requested.json()) as { request_id: string };
  await expect.poll(() => codes.get(phone)).toBeTruthy();
  const verified = await request.post(`${api}/auth/otp/verify`, { data: { request_id, code: codes.get(phone), device }, headers });
  const { signup_token } = (await verified.json()) as { signup_token: string };
  const registered = await request.post(`${api}/auth/register`, { data: { signup_token, name: who.name, device }, headers });
  expect(registered.status(), await registered.text()).toBe(201);
  const auth = { ...headers, authorization: `Bearer ${((await registered.json()) as { access_token: string }).access_token}` };
  const list = (await (await request.get(`${api}/chat/conversations`, { headers: auth })).json()) as { items: { id: string; kind: string }[] };
  const direct = list.items.find((c) => c.kind === "direct");
  if (!direct) return;
  const sent = await request.post(`${api}/chat/conversations/${direct.id}/messages`, { headers: auth, data: { client_id: `console-a-${suffix}-${i}`, text: who.text } });
  expect(sent.status(), await sent.text()).toBe(201);
}

/** A flash sale from Delivery & offers: its form opens from the header's Add a flash sale. */
async function flashSale(page: Page, name: string, value: string, startsIn: number, endsIn: number, units: string) {
  await page.goto("/studio/project/selling?tab=flash");
  const local = (at: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(at).replace(" ", "T");
  await page.getByRole("button", { name: "Add a flash sale" }).click();
  const form = page.getByRole("dialog", { name: "Add a flash sale" }).locator("[data-flash-form]");
  await form.getByLabel("Name", { exact: true }).fill(name);
  await form.locator("input[name=product]").nth(0).check();
  await form.locator("input[name=product]").nth(1).check();
  await form.getByLabel("Value").fill(value);
  await form.getByLabel("Starts").fill(local(new Date(Date.now() + startsIn)));
  await form.getByLabel("Ends").fill(local(new Date(Date.now() + endsIn)));
  await form.getByLabel("Units on sale").fill(units);
  await form.getByRole("button", { name: "Save flash sale" }).click();
  await expect(page.locator("[data-flash-sale]").filter({ hasText: name })).toHaveCount(1);
}

test("Group A's pages in Studio's console", async ({ page, browser, request }) => {
  test.setTimeout(1_200_000);
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill(owner.name);
  await page.getByLabel("Email").fill(owner.email);
  await page.getByLabel("WhatsApp number").fill("+20 100 000 1350");
  await page.getByLabel("Password", { exact: true }).fill(owner.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-up");
  await signIn(page, E2E.studioSetupAdminEmail, E2E.adminPassword);
  await page.goto("/admin/clients");
  await page.getByRole("searchbox", { name: "Search clients" }).fill(owner.email);
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: `Activate ${owner.name}` }).click();
  const panel = page.getByRole("complementary");
  await panel.getByLabel("Active until").fill(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
  await panel.getByRole("button", { name: "Activate & send license" }).click();
  await expect(page.getByRole("status")).toContainText("Activated");
  await signIn(page, owner.email, owner.password);

  // A Studio shop from the Shop template: its sample products, with their pictures.
  await page.goto("/studio/new");
  await page.getByRole("radio", { name: "Store", exact: true }).check();
  await page.getByRole("radio", { name: "No website: everything from here" }).click();
  await page.getByLabel("Project name").fill("Nour Flowers");
  await page.getByRole("radio", { name: "Shop", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/\/studio\/project$/, { timeout: 30_000 });

  // The team activates the project on a Studio plan.
  const admin = await browser.newPage({ extraHTTPHeaders });
  await signIn(admin, E2E.studioSetupAdminEmail, E2E.adminPassword);
  await admin.goto(`/admin/clients?q=${encodeURIComponent(owner.email)}`);
  await admin.getByRole("link", { name: owner.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  const plan = admin.getByRole("region", { name: "Nour Flowers" }).getByRole("region", { name: "Plan and license" });
  await plan.getByLabel("Plan").selectOption("studio_1");
  await plan.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();

  await page.goto("/studio/project/setup?step=website");
  const api = (await page.locator("code").filter({ hasText: "/api/app/" }).first().textContent())!.trim();

  // Chat's empty state, before the first message.
  await language(page, "ar");
  await page.goto("/studio/project/chat");
  await shoot(page, "chat-empty-ar-light-desktop");
  await language(page, "en");

  // Customers sign in from the app and write to the shop.
  for (const [i, who] of CUSTOMERS.entries()) await customer(request, api, who, i);

  // Two flash sales: one on now, one next week.
  await flashSale(page, "Weekend roses", "20", -3_600_000, 2 * 86_400_000, "40");
  await flashSale(page, "Mother's Day tulips", "15", 7 * 86_400_000, 9 * 86_400_000, "");

  // A second and a third language.
  await page.goto("/studio/project/languages");
  for (const code of ["fr", "de"]) {
    const add = page.getByLabel("Add a language");
    if (!(await add.isEnabled())) break;
    await add.selectOption(code);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.locator(`li[data-language="${code}"]`)).toHaveCount(1);
  }

  // Files in Media: three pictures, a menu as a PDF, a short video.
  await page.goto("/studio/project/media");
  const photo = (name: string) => fs.readFileSync(path.resolve(__dirname, `../../public/flower-photos/${name}`));
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
  await expect(page.getByLabel("Choose files")).toBeEnabled();
  await page.getByLabel("Choose files").setInputFiles([
    { name: "Red roses.jpg", mimeType: "image/jpeg", buffer: photo("red-rose.jpg") },
    { name: "Ranunculus.jpg", mimeType: "image/jpeg", buffer: photo("ranunculus.jpg") },
    { name: "Ceramic vase.jpg", mimeType: "image/jpeg", buffer: photo("ceramic-vase.jpg") },
    { name: "Price list.pdf", mimeType: "application/pdf", buffer: pdf },
    { name: "Bouquet making.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(1_800_000, 7) },
  ]);
  for (const name of ["Red roses.jpg", "Price list.pdf", "Bouquet making.mp4"]) {
    await expect(page.getByRole("list", { name: "Uploads" }).locator(`[data-upload="${name}"]`)).toContainText("Uploaded", { timeout: 60_000 });
  }

  // The whole app protected.
  await page.goto("/studio/project/protection");
  const protection = page.getByRole("region", { name: "Screenshots and screen recording" });
  await protection.getByRole("radio", { name: /^The whole app/ }).check();
  await protection.getByRole("button", { name: "Save" }).click();
  await expect(protection.getByText("The app follows it the next time it opens.")).toBeVisible();

  // Two notifications sent, one waiting for Saturday.
  await page.goto("/studio/project/notifications");
  for (const [title, body] of [
    ["Fresh tulips today", "Pink and white tulips, in the shop and the app until 8 pm."],
    ["Free delivery this weekend", "Every order over 500 is delivered free on Saturday and Sunday."],
  ]) {
    await page.goto("/studio/project/notifications");
    await page.getByRole("button", { name: "New notification" }).click();
    await page.getByLabel("Title", { exact: true }).fill(title!);
    await page.getByLabel("Message").fill(body!);
    await page.getByRole("button", { name: "Send to everyone" }).click();
    await expect(page.getByRole("region", { name: "Sent" })).toContainText(title!);
  }
  await page.goto("/studio/project/notifications");
  await page.getByRole("button", { name: "New notification" }).click();
  await page.getByLabel("Title", { exact: true }).fill("Mother's Day is Sunday");
  await page.getByLabel("Message").fill("Order before Saturday noon for a Sunday morning delivery.");
  await page.getByRole("radio", { name: "Later" }).check();
  await page.getByLabel("Date", { exact: true }).fill(new Date(Date.now() + 4 * 86_400_000).toISOString().slice(0, 10));
  await page.getByLabel("Time", { exact: true }).fill("10:00");
  await page.getByRole("button", { name: "Schedule" }).click();
  await expect(page.getByRole("region", { name: "Scheduled" })).toContainText("Mother's Day is Sunday");
  await page.keyboard.press("Escape");

  await language(page, "ar");
  await pageShots(page, "/studio/project/selling", "selling");
  await pageShots(page, "/studio/project/selling?tab=flash", "selling-flash");
  await pageShots(page, "/studio/project/selling/messages", "messages");
  await pageShots(page, "/studio/project/languages", "languages");
  await pageShots(page, "/studio/project/media", "media");
  await pageShots(page, "/studio/project/protection", "protection");
  await pageShots(page, "/studio/project/integrations", "integrations");
  await pageShots(page, "/studio/project/app-sign-in", "app-sign-in");
  await pageShots(page, "/studio/project/notifications", "notifications");
  await pageShots(page, "/studio/project/chat", "chat");

  // What opens on demand: a row's inspector on each page with a table, a fold on the settings pages.
  const open = async (href: string, name: string, act: () => Promise<void>) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(href);
    await act();
    await shoot(page, `${name}-ar-light-desktop`);
  };
  const firstRow = (scope: string) => async () => {
    await page.locator(`${scope} .kit-tr-open`).first().click();
    await expect(page.locator("[data-kit-inspector=docked]")).toBeVisible();
  };
  await open("/studio/project/selling?tab=flash", "selling-flash-inspector", firstRow("[data-flash-sale]"));
  await open("/studio/project/selling/messages", "messages-inspector", firstRow("[data-occasion]"));
  await open("/studio/project/media", "media-inspector", async () => {
    await page.locator('[data-media="Red roses.jpg"] .kit-tr-open').click();
    await expect(page.locator("[data-kit-inspector=docked]")).toBeVisible();
  });
  await open("/studio/project/notifications", "notifications-inspector", firstRow("[data-notification]"));
  await open("/studio/project/chat", "chat-inspector", firstRow("[data-conversation]"));
  await open("/studio/project/integrations", "integrations-fold", async () => {
    await page.locator("[data-integration] summary").first().click();
  });
  await open("/studio/project/app-sign-in", "app-sign-in-rules", async () => {
    const rules = page.locator('details[data-fold="rules"] > summary');
    await rules.click();
    await rules.scrollIntoViewIfNeeded();
  });
  await open("/studio/project/protection", "protection-fold", async () => {
    const fold = page.locator("details summary").last();
    await fold.click();
    await fold.scrollIntoViewIfNeeded();
  });
  await open("/studio/project/languages", "languages-menu", async () => {
    await page.getByRole("button", { name: "تصدير أو استيراد" }).click();
  });
  await open("/studio/project/selling?tab=flash", "selling-add-flash", async () => {
    await page.getByRole("button", { name: "ضيف عرض فلاش" }).click();
  });
  // A phone: a row's details as a drawer.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio/project/chat");
  await page.locator("[data-conversation] .kit-tr-open").first().click();
  await expect(page.locator("dialog[data-kit-inspector=drawer][open]")).toBeVisible();
  await shoot(page, "chat-inspector-ar-light-phone");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio/project/media");
  await page.locator('[data-media="Red roses.jpg"] .kit-tr-open').click();
  await expect(page.locator("dialog[data-kit-inspector=drawer][open]")).toBeVisible();
  await shoot(page, "media-inspector-ar-light-phone");
});
