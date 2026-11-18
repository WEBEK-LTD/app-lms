import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 157 The owner (18 November), on Leqaa and Kech Flora: the app showed the
 * categories the Rose hour template came with ("the ones you put"), not the
 * ones added in the dashboard. A flower shop from the template, its products
 * kept in Yallapp: the owner adds categories and products in Products, and
 * publishes; hosted `GET /pages` serves the home's and the Bouquets tab's
 * occasion rings, the collections' bento and the ticker as those categories,
 * in every language, each opening its category; `GET /store/categories`
 * lists the owner's only; Studio's canvas draws them as the app does, and
 * the owner can pick the category each tile opens.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Kech Categories", email: `app-categories-${suffix}@studio.test`, password: "kech-categories-strong-password-1" };
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.157" };
let own: Page;
let api = "";
/** The preview's token: the app's API answers a project with no plan yet only to its preview. */
let previewToken = "";
const problems: string[] = [];

interface Story {
  heading: string | null;
  action: { type: string; screen?: string; category_id?: string } | null;
}
interface Node {
  id: string;
  type: string;
  name?: string;
  text?: string;
  slides?: Story[];
  entries?: { title?: string; action?: Story["action"] }[];
  children?: Node[];
}

const nodesOf = (node: Node): Node[] => [node, ...(node.children ?? []).flatMap(nodesOf)];
const asApp = (lang = "en") => ({ headers: { "x-yallapp-preview": previewToken, "accept-language": lang } });
const TEMPLATE = ["Love", "Birthday", "Sympathy", "New baby", "Congratulations", "حب", "عيد ميلاد", "مواساة", "مولود جديد", "تهنئة", "Aşk", "Doğum günü", "Signature bouquets", "Roses", "In season", "Plants", "Gift sets"];

test.beforeAll(async ({ browser }) => {
  own = await (await browser.newContext({ extraHTTPHeaders, viewport: { width: 1440, height: 900 } })).newPage();
  own.on("pageerror", (e) => problems.push(`pageerror on ${own.url()}: ${e.message}`));
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0157");
  await own.getByLabel("Your website (optional)").fill(`https://app-categories-${suffix}.studio.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.categoriesAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();

  // A flower shop from the Rose hour template, its products kept in Yallapp (it starts with the template's samples).
  await own.goto("/studio/new");
  await own.getByRole("radio", { name: /^Store( |$)/ }).first().check();
  await own.getByLabel("Project name").fill("Kech Categories");
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: /Rose hour/ }).first().click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/, { timeout: 30_000 });
  await own.goto("/studio/project/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).first().textContent())!.trim();
  await own.goto("/studio/project/preview?pages=published");
  const src = (await own.locator("iframe[data-testid=app-preview]").getAttribute("src"))!;
  previewToken = new URL(src, E2E.baseURL).searchParams.get("token")!;
});

test.afterAll(async () => {
  await own.context().close();
});

async function addCategory(name: string) {
  await own.goto("/studio/project/catalog/categories");
  await own.getByLabel("New category").fill(name);
  await own.getByRole("button", { name: "Add", exact: true }).click();
  await expect(own.locator(`[data-category="${name}"]`)).toBeVisible();
}

async function addProduct(name: string, price: string, categories: string[]) {
  await own.goto("/studio/project/catalog/new");
  await own.getByLabel("Name", { exact: true }).fill(name);
  await own.getByLabel(/^Price \(/).fill(price);
  for (const c of categories) await own.getByRole("checkbox", { name: c, exact: true }).check();
  await own.getByRole("button", { name: "Add product" }).click();
  await expect(own).not.toHaveURL(/\/catalog\/new/);
}

test("157 the categories added in the dashboard are what the template's rings, collections and ticker show in the app, in every language, each opening its category", async ({ request }) => {
  // Before: the template's occasions, opening the whole shop or its samples' category.
  await own.goto("/studio/editor");
  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(own.getByText(/^Published\./)).toBeVisible();
  const before = await request.get(`${api}/pages/home?platform=android`, asApp());
  expect(before.status()).toBe(200);
  const rings = (body: Node) => nodesOf(body).filter((n) => n.type === "stories").map((n) => (n.slides ?? []).map((s) => s.heading));
  expect(rings(((await before.json()) as { studio: { body: Node } }).studio.body)[0]).toEqual(["Love", "Birthday", "Sympathy", "New baby", "Congratulations"]);
  const version = ((await (await request.get(`${api}/pages?platform=android`, asApp())).json()) as { version: string }).version;

  // The owner's categories and products, in Products.
  await addCategory("Luxury boxes");
  await addCategory("Wedding");
  await addProduct("Red & White Roses in a 24 Luxury Box", "599", ["Luxury boxes"]);
  await addProduct("Trio Luxury Box", "2199", ["Luxury boxes", "Wedding"]);

  // The shop's list: the owner's only, the template's samples' left out.
  const listed = await request.get(`${api}/store/categories?platform=android`, asApp());
  const categories = ((await listed.json()) as { items: { id: number; name: string }[] }).items;
  expect(categories.map((c) => c.name)).toEqual(["Luxury boxes", "Wedding"]);
  const opens = (name: string) => ({ type: "screen", screen: "search", category_id: String(categories.find((c) => c.name === name)!.id) });

  // An app that stays open is told the pages changed.
  expect(((await (await request.get(`${api}/pages?platform=android`, asApp())).json()) as { version: string }).version).not.toBe(version);

  for (const lang of ["en", "ar", "tr"]) {
    for (const slug of ["home", "shop"]) {
      const served = await request.get(`${api}/pages/${slug}?platform=android`, asApp(lang));
      expect(served.status(), `${slug} ${lang}`).toBe(200);
      const nodes = nodesOf(((await served.json()) as { studio: { body: Node } }).studio.body);
      const stories = nodes.filter((n) => n.type === "stories");
      expect(stories.length, `${slug} ${lang}`).toBe(1);
      expect(stories[0]!.slides!.map((s) => [s.heading, s.action]), `${slug} ${lang}`).toEqual([
        ["Luxury boxes", opens("Luxury boxes")],
        ["Wedding", opens("Wedding")],
      ]);
      if (slug === "home") {
        expect(nodes.find((n) => n.type === "bento")!.entries!.map((e) => [e.title, e.action]), lang).toEqual([
          ["Luxury boxes", opens("Luxury boxes")],
          ["Wedding", opens("Wedding")],
        ]);
        expect(nodes.find((n) => n.type === "marquee")!.text, lang).toBe("Luxury boxes\nWedding");
      }
      const shown = nodes.flatMap((n) => [n.text, ...(n.slides ?? []).map((s) => s.heading), ...(n.entries ?? []).map((e) => e.title)]);
      for (const word of TEMPLATE) expect(shown, `${slug} ${lang}: ${word}`).not.toContain(word);
    }
  }

  // Studio's canvas draws the rings as the app does, and says why over them.
  await own.goto("/studio/editor");
  const ringsOnCanvas = own.locator("[data-studio-stories]").first();
  await expect(ringsOnCanvas).toContainText("Luxury boxes");
  await expect(ringsOnCanvas).toContainText("Wedding");
  await expect(ringsOnCanvas).not.toContainText("Birthday");
  await ringsOnCanvas.click();
  await expect(own.locator("[data-category-list-note=own]")).toContainText("shows your shop's categories");
  expect(problems).toEqual([]);
});

test("157 the owner picks the category a collection tile opens, in Studio; tiles named like no category open the shop", async ({ request }) => {
  const served = async () => nodesOf(((await (await request.get(`${api}/pages/home?platform=android`, asApp())).json()) as { studio: { body: Node } }).studio.body);
  const categories = ((await (await request.get(`${api}/store/categories?platform=android`, asApp())).json()) as { items: { id: number; name: string }[] }).items;
  const wedding = String(categories.find((c) => c.name === "Wedding")!.id);
  const bento = (await served()).find((n) => n.type === "bento")!;

  await own.goto("/studio/editor");
  await own.locator(`[data-studio-node="${bento.id}"]`).click();
  const inspector = own.getByRole("complementary", { name: "Design" });
  const tap = inspector.locator(`select#entry-${bento.id}-0`);
  await expect(tap).toHaveValue("screen:search");
  await expect(tap.locator('option[value="category"]')).toHaveText("Opens: A category of the shop");
  await tap.selectOption("category");
  const which = inspector.getByLabel("A category of the shop", { exact: true });
  await expect(which.locator("option")).toHaveText(["Luxury boxes", "Wedding"]);
  await which.selectOption({ label: "Wedding" });
  await expect(own.getByRole("status").filter({ hasText: "Saved just now" })).toBeVisible({ timeout: 10_000 });
  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(own.getByText(/^Published\./)).toBeVisible();

  // The tile the owner set opens Wedding; the bento is theirs now: the template's other tiles, named like none of the shop's categories, open the shop.
  const tiles = (await served()).find((n) => n.id === bento.id)!.entries!;
  expect(tiles[0]!.action).toEqual({ type: "screen", screen: "search", category_id: wedding });
  for (const tile of tiles.slice(1)) expect(tile.action, tile.title).toEqual({ type: "screen", screen: "search" });
  // Kept in the editor after a reload.
  await own.reload();
  await own.locator(`[data-studio-node="${bento.id}"]`).click();
  await expect(inspector.locator(`select#entry-${bento.id}-0`)).toHaveValue("category");
  await expect(inspector.getByLabel("A category of the shop", { exact: true })).toHaveValue(wedding);
  expect(problems).toEqual([]);
});
