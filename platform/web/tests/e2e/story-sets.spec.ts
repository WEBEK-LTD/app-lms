import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 194 The owner (18 November), on Kech Flora in Studio: the shop page's
 * "Every occasion" rings showed the shop's categories on the phone, the
 * template's Love, Birthday… in the inspector, and other stories again in
 * Studio › Stories; and the shop page's stories are not Home's. A flower
 * shop from the Rose hour template with the owner's own categories: the
 * phone, the inspector and Stories show the same rings, Stories lists Home's
 * and the shop page's stories apart, and changing the shop page's changes
 * that page only, on the phone and in the app.
 *
 * STORY_SETS_SHOTS=<folder> also saves what the owner sees (2× pictures).
 */
test.describe.configure({ mode: "serial", timeout: 240_000 });

const suffix = Date.now().toString(36);
const client = { name: "Kech Story Sets", email: `story-sets-${suffix}@stories.test`, password: "kech-story-sets-strong-password-1" };
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.194" };
const SHOTS = process.env.STORY_SETS_SHOTS ?? "";
const CATEGORIES = ["Add to gifts", "Bouquets", "Gift baskets", "Basket arrangements"];
let own: Page;
let api = "";
let previewToken = "";

interface Node {
  id: string;
  type: string;
  slides?: { heading: string | null }[];
  children?: Node[];
}
const nodesOf = (node: Node): Node[] => [node, ...(node.children ?? []).flatMap(nodesOf)];
const asApp = (lang = "en") => ({ headers: { "x-yallapp-preview": previewToken, "accept-language": lang } });

async function shot(name: string) {
  if (SHOTS) await own.screenshot({ path: `${SHOTS}/${name}.png` });
}

test.beforeAll(async ({ browser }) => {
  own = await (await browser.newContext({ extraHTTPHeaders, viewport: { width: 1440, height: 900 }, deviceScaleFactor: SHOTS ? 2 : 1 })).newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0194");
  await own.getByLabel("Your website (optional)").fill(`https://story-sets-${suffix}.stories.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.storySetsAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();

  await own.goto("/studio/new");
  await own.getByRole("radio", { name: /^Store( |$)/ }).first().check();
  await own.getByLabel("Project name").fill("Kech Story Sets");
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: /Rose hour/ }).first().click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/, { timeout: 30_000 });

  // The owner's own categories, each with a product (as Kech Flora has them).
  for (const name of CATEGORIES) {
    await own.goto("/studio/project/catalog/categories");
    await own.getByLabel("New category").fill(name);
    await own.getByRole("button", { name: "Add", exact: true }).click();
    await expect(own.locator(`[data-category="${name}"]`)).toBeVisible();
    await own.goto("/studio/project/catalog/new");
    await own.getByLabel("Name", { exact: true }).fill(`${name} one`);
    await own.getByLabel(/^Price \(/).fill("450");
    await own.getByRole("checkbox", { name, exact: true }).check();
    await own.getByRole("button", { name: "Add product" }).click();
    await expect(own).not.toHaveURL(/\/catalog\/new/);
  }

  await own.goto("/studio/project/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).first().textContent())!.trim();
  await own.goto("/studio/project/preview?pages=draft");
  const src = (await own.locator("iframe[data-testid=app-preview]").getAttribute("src"))!;
  previewToken = new URL(src, E2E.baseURL).searchParams.get("token")!;
});

test.afterAll(async () => {
  await own.context().close();
});

async function rings(request: APIRequestContext, slug: string, lang = "en"): Promise<(string | null)[][]> {
  const res = await request.get(`${api}/pages/${slug}?platform=android`, asApp(lang));
  expect(res.status()).toBe(200);
  return nodesOf(((await res.json()) as { studio: { body: Node } }).studio.body)
    .filter((n) => n.type === "stories")
    .map((n) => (n.slides ?? []).map((s) => s.heading));
}

test("the shop page's rings: the shop's categories on the phone and in the inspector, one note", async () => {
  await own.goto("/studio/editor?page=shop");
  const phone = own.getByRole("main", { name: "The page in the phone" });
  const inspector = own.getByRole("complementary", { name: "Design" });
  await own.locator("[data-studio-layer]").filter({ hasText: "Every occasion" }).first().click();
  for (const name of CATEGORIES) await expect(phone.getByText(name, { exact: true }).first()).toBeVisible();
  // The inspector lists the same rings, never the template's Love, Birthday…
  const titles = inspector.locator('[data-studio-premium="stories"]').getByLabel("Title under the ring");
  await expect(titles).toHaveCount(CATEGORIES.length);
  expect(await titles.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))).toEqual(CATEGORIES);
  // One note: these are the shop's categories.
  await expect(inspector.locator("[data-studio-stories-categories]")).toBeVisible();
  await expect(inspector.locator("[data-studio-stories-until-saved]")).toHaveCount(0);
  await expect(inspector.locator("[data-category-list-note]")).toHaveCount(0);
  await shot("1-studio-shop-page-en");
});

test("Stories lists Home's and the shop page's stories apart, the shop page's as its rings show them", async () => {
  await own.goto("/studio/project/stories");
  const sets = own.locator("[data-story-set]");
  await expect(sets).toHaveCount(2);
  await expect(own.locator('[data-story-set="home"] h2')).toContainText("Home");
  await expect(own.locator('[data-story-set="shop"]').locator("[data-story]")).toHaveCount(CATEGORIES.length);
  expect(await own.locator('[data-story-set="shop"] [data-story]').evaluateAll((els) => els.map((e) => e.getAttribute("data-story")))).toEqual(CATEGORIES);
  await expect(own.locator('[data-story-set="home"] [data-story]')).toHaveCount(5);
  await shot("2-stories-page-en");
});

test("changing the shop page's first story changes that page only: on the phone, in Studio and in the app", async ({ request }) => {
  const homeBefore = await rings(request, "home");
  await own.goto("/studio/project/stories");
  const shop = own.locator('[data-story-set="shop"]');
  await shop.getByRole("button", { name: `Edit ${CATEGORIES[0]}` }).click();
  const form = own.locator("[data-story-form]");
  await form.getByLabel("Ring name · English (main)").fill("Valentine");
  await form.getByLabel("Ring name · Arabic").fill("عيد الحب");
  await form.getByRole("button", { name: "Save story" }).click();
  await expect(form).toHaveCount(0);
  await expect(shop.locator("[data-story]").first()).toHaveAttribute("data-story", /./);

  // The app: the shop page's rings changed, Home's not.
  expect((await rings(request, "shop"))[0]).toEqual(["Valentine", ...CATEGORIES.slice(1)]);
  expect((await rings(request, "shop", "ar"))[0]![0]).toBe("عيد الحب");
  expect(await rings(request, "home")).toEqual(homeBefore);

  // Studio: the shop page shows it, and its inspector says where it comes from.
  await own.goto("/studio/editor?page=shop");
  const phone = own.getByRole("main", { name: "The page in the phone" });
  await expect(phone.getByText("Valentine", { exact: true }).first()).toBeVisible();
  await own.locator("[data-studio-layer]").filter({ hasText: "Every occasion" }).first().click();
  const inspector = own.getByRole("complementary", { name: "Design" });
  await expect(inspector.getByText("These rings come from Dashboard › Stories.")).toBeVisible();
  await shot("3-studio-shop-page-after-edit-en");
  // Home in Studio: as it was.
  await own.goto("/studio/editor?page=home");
  await expect(phone.getByText("Valentine", { exact: true })).toHaveCount(0);
});

test("in Arabic too: Stories names each page's set, Studio shows the same", async () => {
  await own.goto("/studio/project/stories");
  await own.locator("[data-dashboard-languages]").getByRole("button", { name: "العربية" }).click();
  await expect(own.locator('[data-story-set="shop"] h2')).toContainText("في صفحة");
  await shot("4-stories-page-ar");
  await own.goto("/studio/editor?page=shop");
  await own.locator("[data-studio-layer]").first().waitFor();
  await own.locator("[data-studio-layer]").filter({ hasText: /لكل مناسبة|Every occasion/ }).first().click();
  await shot("5-studio-shop-page-ar");
  await own.locator("[data-dashboard-languages]").getByRole("button", { name: "English" }).click().catch(() => undefined);
});
