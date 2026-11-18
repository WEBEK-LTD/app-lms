import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 152 Our bouquet's chips and button open the product the owner links: a
 * flower shop from the Rose hour template, with a product of its own, links
 * "Choose this bouquet" to it in Studio's inspector ("When the customer
 * taps": A product, from the shop's products) and publishes; hosted
 * `GET /pages/bouquet` serves the button's tap as that product, and the
 * sizes, not linked, as the shop.
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Leqaa Links", email: `bouquet-links-${suffix}@studio.test`, password: "leqaa-links-strong-password-1" };
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.152" };
let own: Page;
let api = "";
const problems: string[] = [];

interface Node {
  type: string;
  name?: string;
  text?: string;
  action?: unknown;
  children?: Node[];
}

const nodesOf = (node: Node): Node[] => [node, ...(node.children ?? []).flatMap(nodesOf)];

test.beforeAll(async ({ browser }) => {
  own = await (await browser.newContext({ extraHTTPHeaders, viewport: { width: 1440, height: 900 } })).newPage();
  own.on("pageerror", (e) => problems.push(`pageerror on ${own.url()}: ${e.message}`));
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0152");
  await own.getByLabel("Your website (optional)").fill(`https://bouquet-links-${suffix}.studio.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.bouquetAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();

  // A flower shop from the Rose hour template, its products kept in Yallapp.
  await own.goto("/studio/new");
  await own.getByRole("radio", { name: /^Store( |$)/ }).first().check();
  await own.getByLabel("Project name").fill("Leqaa Links");
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: /Rose hour/ }).first().click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
  await own.goto("/studio/project/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).first().textContent())!.trim();
});

test.afterAll(async () => {
  await own.context().close();
});

test("152 Choose this bouquet linked to one of the shop's products in Studio, published, opens it in the app; the sizes not linked, the shop", async ({ request }) => {
  // A product of the shop's own.
  await own.goto("/studio/project/catalog/new");
  await own.getByLabel("Name", { exact: true }).fill("Blush Peonies");
  await own.getByLabel(/^Price \(/).fill("900");
  await own.getByRole("button", { name: "Add product" }).click();
  await expect(own.getByRole("status").filter({ hasText: "Saved" })).toContainText("Saved “Blush Peonies”.");
  const listed = await request.get(`${api}/store/products?platform=android`);
  expect(listed.status()).toBe(200);
  const id = String(((await listed.json()) as { items: { id: number; name: string }[] }).items.find((p) => p.name === "Blush Peonies")!.id);

  // Our bouquet: "Choose this bouquet" opens the shop, as the template has it.
  await own.goto("/studio/editor?page=bouquet");
  const inspector = own.getByRole("complementary", { name: "Design" });
  await own.locator("[data-studio-layer]").filter({ hasText: "Choose this bouquet" }).getByRole("button", { name: /Choose this bouquet/ }).click();
  const tap = inspector.locator("select").filter({ has: own.locator('option[value="item"]') });
  await expect(tap).toHaveValue("screen:search");
  await expect(tap.locator('option[value="item"]')).toHaveText("Opens: A product");

  // A product, picked from the shop's own, and the hint under it.
  await tap.selectOption("item");
  await expect(inspector.getByText("Link to one of your products; without it, it opens the shop")).toBeVisible();
  const product = inspector.getByLabel("A product", { exact: true });
  await expect(product.locator("option", { hasText: "Blush Peonies" })).toHaveCount(1);
  await product.selectOption({ label: "Blush Peonies" });
  await expect(product).toHaveValue(id);
  await expect(own.getByRole("status").filter({ hasText: "Saved just now" })).toBeVisible({ timeout: 10_000 });

  // Published: the app gets the product for the button, the shop for the sizes.
  await own.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(own.getByText(/^Published\./)).toBeVisible();
  const served = await request.get(`${api}/pages/bouquet?platform=android`);
  expect(served.status()).toBe(200);
  const nodes = nodesOf(((await served.json()) as { studio: { body: Node } }).studio.body);
  expect(nodes.find((n) => n.type === "button" && n.text === "Choose this bouquet")?.action).toEqual({ type: "item", item: { source: "products", id } });
  for (const size of ["Classic", "Deluxe", "Grand"]) expect(nodes.find((n) => n.type === "column" && n.name === size)?.action, size).toEqual({ type: "screen", screen: "search" });

  // Kept in the editor after a reload.
  await own.reload();
  await own.locator("[data-studio-layer]").filter({ hasText: "Choose this bouquet" }).getByRole("button", { name: /Choose this bouquet/ }).click();
  await expect(inspector.getByLabel("A product", { exact: true })).toHaveValue(id);
  expect(problems).toEqual([]);
});
