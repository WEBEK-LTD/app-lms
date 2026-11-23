import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 179 The education templates, by hand (docs/qa/2026-11-18-education): an
 * owner starts from Nakhla School (looks A and B), Rawaq Academy (A and B)
 * and the premium academy on /start, opens the app in Studio, publishes,
 * and the app (the preview's real web build) shows what was published, on a
 * 360-wide phone, in English and Arabic, by day and by night. The served
 * home has the school's news and the academy's teachers, never the
 * template's. Pictures go to docs/qa/2026-11-18-education when
 * `QA_SHOTS=1`.
 */
test.describe.configure({ mode: "serial" });
// Each test makes an app and opens it on four phones, each drawn in full.
test.setTimeout(300_000);

const suffix = Date.now().toString(36);
const SHOTS = join(__dirname, "..", "..", "..", "..", "docs", "qa", "2026-11-18-education");
const shoot = process.env.QA_SHOTS === "1";
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.179" };

interface Node {
  type: string;
  text?: string;
  name?: string;
  children?: Node[];
  slides?: { heading?: string }[];
}
const all = (node: Node): Node[] => [node, ...(node.children ?? []).flatMap(all)];

/** A new owner, activated, with a Studio app made from `demo` in `look` and its plan. */
async function owner(browser: Browser, demo: string, look: "a" | "b", n: number): Promise<{ own: Page; api: string }> {
  const client = { name: `Edu ${demo} ${look}`, email: `edu-${demo}-${look}-${suffix}@studio.test`, password: "education-strong-password-1" };
  const own = await (await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": `198.51.100.${180 + n}` }, viewport: { width: 1360, height: 900 } })).newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill(`+20 100 000 0${180 + n}`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.educationAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");

  // The demos' addresses (lib/demo/constants.ts DEMO_SLUGS).
  const slug = ({ instructors: "teachers", premium_academy: "premium-academy" } as Record<string, string>)[demo] ?? demo;
  await own.goto(`/start/${slug}/make${look === "b" ? "?look=b" : ""}`);
  await own.getByLabel("Your app's name").fill("Cedar");
  await own.getByRole("button", { name: "Create my app" }).click();
  await expect(own).toHaveURL(/\/studio\/editor\?from=demo$/);
  await own.goto("/dashboard/setup?step=website");
  const api = (await own.locator("code").filter({ hasText: "/api/app/" }).first().textContent())!.trim();

  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: client.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  const plan = admin.getByRole("region", { name: "Plan and license" }).first();
  await plan.getByLabel("Plan").selectOption("studio_1");
  await plan.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();
  return { own, api };
}

/** Studio's editor, published as it is. */
async function publish(own: Page, name: string): Promise<void> {
  await own.goto("/studio/editor");
  await expect(own.getByRole("main", { name: "The page in the phone" })).toBeVisible();
  if (shoot) await own.screenshot({ path: join(SHOTS, `${name}-studio.png`) });
  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(own.getByText("Published. The app shows it the next time it opens.")).toBeVisible();
}

/** The published preview's link (the app's web build) and its token. */
async function preview(own: Page): Promise<{ src: string; token: string }> {
  await own.goto("/studio/project/preview?pages=published");
  const src = (await own.locator("iframe[data-testid=app-preview]").getAttribute("src"))!;
  return { src, token: new URL(src, E2E.baseURL).searchParams.get("token")! };
}

/** The app on a 360-wide phone, in `lang` and `theme`, its home's picture. */
async function phone(browser: Browser, src: string, lang: string, theme: "light" | "dark", name: string): Promise<void> {
  const page = await (await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 1 })).newPage();
  const url = new URL(src, E2E.baseURL);
  url.searchParams.set("lang", lang);
  url.searchParams.set("theme", theme);
  await page.goto(url.toString());
  // The Flutter app draws on its canvas: wait for it, then for its first frame's pictures.
  await page.waitForSelector("flt-glass-pane, flutter-view", { timeout: 60_000 });
  await page.waitForTimeout(10_000);
  if (shoot) await page.screenshot({ path: join(SHOTS, `${name}-app-${lang}-${theme}-sign-in.png`) });
  // "Not now" at the sign-in's top corner (its start's opposite: the right in English, the left in Arabic).
  await page.mouse.click(lang === "ar" ? 52 : 308, 32);
  await page.waitForTimeout(6_000);
  if (shoot) await page.screenshot({ path: join(SHOTS, `${name}-app-${lang}-${theme}-home.png`) });
  await page.mouse.move(180, 400);
  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 400);
  await page.waitForTimeout(2_000);
  if (shoot) await page.screenshot({ path: join(SHOTS, `${name}-app-${lang}-${theme}-home-end.png`) });
  await page.context().close();
}

async function servedHome(own: Page, api: string, token: string, lang: string): Promise<Node> {
  const res = await own.request.get(`${api}/pages/home?platform=android`, { headers: { "accept-language": lang, "x-yallapp-preview": token } });
  expect(res.status()).toBe(200);
  return ((await res.json()) as { studio: { body: Node } }).studio.body;
}

test.beforeAll(() => {
  if (shoot) mkdirSync(SHOTS, { recursive: true });
});

test("Nakhla School, look A: its news ticker runs the school's own news", async ({ browser }) => {
  const { own, api } = await owner(browser, "school", "a", 1);
  // The school's own news, as the owner writes it in the dashboard.
  await own.goto("/dashboard/school/news");
  if (shoot) await own.screenshot({ path: join(SHOTS, "school-a-dashboard-news.png") });
  await publish(own, "school-a");
  const { src, token } = await preview(own);
  for (const lang of ["en", "ar", "tr"]) {
    const home = await servedHome(own, api, token, lang);
    const ticker = all(home).find((n) => n.type === "marquee");
    // The school's news (the sample news the project starts with), never the template's words or the demo's.
    if (ticker) expect(ticker.text, lang).not.toMatch(/This week's news|Grade 5|الصف الخامس|5\. sınıflar/);
    else expect(all(home).some((n) => n.type === "badge_text" && /^(News|أخبار|Haberler)$/.test(n.text ?? "")), lang).toBe(false);
  }
  for (const [lang, theme] of [["en", "light"], ["ar", "light"], ["en", "dark"], ["ar", "dark"]] as const) await phone(browser, src, lang, theme, "school-a");
  await own.context().close();
});

test("Nakhla School, look B", async ({ browser }) => {
  const { own } = await owner(browser, "school", "b", 2);
  await publish(own, "school-b");
  const { src } = await preview(own);
  for (const [lang, theme] of [["en", "light"], ["ar", "dark"]] as const) await phone(browser, src, lang, theme, "school-b");
  await own.context().close();
});

for (const [look, n] of [["a", 3], ["b", 4]] as const) {
  test(`Rawaq Academy, look ${look.toUpperCase()}: the faculty is the academy's teachers`, async ({ browser }) => {
    const { own, api } = await owner(browser, "instructors", look, n);
    await own.goto("/dashboard/teachers");
    if (shoot) await own.screenshot({ path: join(SHOTS, `instructors-${look}-dashboard-teachers.png`) });
    await publish(own, `instructors-${look}`);
    const { src, token } = await preview(own);
    for (const lang of ["en", "ar"]) {
      const json = JSON.stringify(await servedHome(own, api, token, lang), (k, v) => (k === "items" ? undefined : v));
      // The template's own Arabic names, which none of the academy's (sample) teachers has.
      expect(json, lang).not.toMatch(/هانا كلارك|دنيز كايا/);
    }
    for (const [lang, theme] of [["en", "light"], ["ar", "light"], ["en", "dark"]] as const) await phone(browser, src, lang, theme, `instructors-${look}`);
    await own.context().close();
  });
}

test("the premium academy, look A", async ({ browser }) => {
  const { own } = await owner(browser, "premium_academy", "a", 5);
  await publish(own, "premium-academy-a");
  const { src } = await preview(own);
  for (const [lang, theme] of [["en", "light"], ["ar", "dark"]] as const) await phone(browser, src, lang, theme, "premium-academy-a");
  await own.context().close();
});
