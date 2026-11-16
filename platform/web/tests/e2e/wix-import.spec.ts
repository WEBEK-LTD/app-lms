import { createServer, type Server } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * A Wix product export on the product import page (Products › Import), here
 * in a Studio store with its own products: the page reads it as Wix's file
 * (its products, variations and pictures, and what the shop can't keep),
 * the products come in with their variations, customer options, categories
 * and pictures, and the same file again updates them. The pictures are on
 * a fake Wix media host every read goes to (SITE_SCAN_TEST_URL); its WebP
 * and AVIF pictures come as Wix's JPEG of them.
 */
test.describe.configure({ mode: "serial" });
// Its own address, so its sign-up and sign-ins never use up the shared limits of the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.184" };
test.use({ extraHTTPHeaders });

const FIXTURE = "tests/unit/fixtures/wix/catalog_products.csv";
const suffix = Date.now().toString(36);
const client = { name: "Petal Studio", email: `petal-${suffix}@flowers.test`, password: "petal-strong-password-1" };
let own: Page;
let site: Server;
let api = "";
const asked: string[] = [];

const COLOURS: Record<string, [number, number, number]> = { vase: [70, 110, 160], tulip: [230, 120, 160], rose: [180, 30, 50], choc: [110, 70, 40] };

test.beforeAll(async ({ browser }) => {
  site = createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? "/").split("?")[0]!);
    asked.push(path);
    const m = /^\/media\/0a1b2c_([a-z]+)\d+~mv2\.(png|jpe?g|webp|avif)(\/v1\/fit\/[^/]+\/picture\.jpg)?$/.exec(path);
    if (!m) {
      res.writeHead(404);
      res.end();
    } else if ((m[2] === "webp" || m[2] === "avif") && !m[3]) {
      // A picture the shop can't keep as it is.
      res.writeHead(200, { "content-type": `image/${m[2]}` });
      res.end(Buffer.from("RIFF\0\0\0\0WEBPVP8 not a real picture"));
    } else {
      res.writeHead(200, { "content-type": "image/png" });
      res.end(solidPng(400, 400, COLOURS[m[1]!] ?? [128, 128, 128]));
    }
  });
  await new Promise<void>((resolve) => site.listen(E2E.siteScanPort, resolve));

  own = await (await browser.newContext({ extraHTTPHeaders })).newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 01 84");
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  const admin = await (await browser.newContext({ extraHTTPHeaders })).newPage();
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.importAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");

  // A Studio store, its products kept in Yallapp, from a blank page.
  await own.goto("/studio/new");
  await own.getByRole("radio", { name: /^Store( |$)/ }).check();
  await own.getByLabel("Project name").fill(client.name);
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: "Blank page" }).click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);

  // The team activates the project on a Studio plan, so its app's API answers.
  await admin.goto(`/admin/clients?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: client.name, exact: true }).click();
  await admin.waitForURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  const plan = admin.getByRole("region", { name: client.name }).getByRole("region", { name: "Plan and license" });
  await plan.getByLabel("Plan").selectOption("studio_1");
  await plan.getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.context().close();
});

test.afterAll(async () => {
  await own.context().close();
  await new Promise<void>((resolve) => site.close(() => resolve()));
});

test("the import page reads a Wix export as Wix's file: its products, variations and pictures, and what isn't kept", async () => {
  await own.goto("/studio/project/catalog");
  // 132.152 Import is in the page's "⋯" menu.
  await own.getByRole("button", { name: "More options" }).click();
  await own.getByRole("link", { name: "Import", exact: true }).click();
  await expect(own).toHaveURL(/\/studio\/project\/catalog\/import$/);
  await expect(own.getByRole("heading", { level: 1, name: "Import products" })).toBeVisible();
  // The page's own help says a Wix export works.
  await expect(own.getByText("A Wix product export works too")).toBeVisible();

  await own.getByLabel("A CSV file").setInputFiles(FIXTURE);
  await own.getByRole("button", { name: "Check the file" }).click();
  // Products, not the file's 15 lines.
  await expect(own.getByRole("heading", { name: "Products that can be imported: 4 of 4." })).toBeVisible();
  const wix = own.locator("[data-wix-file]");
  await expect(wix.getByRole("status")).toContainText("Wix file: 4 products, 4 variants, 7 pictures.");
  const dropped = wix.locator("[data-wix-dropped]");
  // The names kept apart from the line's direction (U+2068…U+2069).
  await expect(dropped).toContainText("Text the customer types: \u2068“Card text”\u2069 (1)");
  await expect(dropped).toContainText("Brand (1)");
  await expect(dropped).toContainText("The colours of colour choices, kept by their names (1)");
  // No column matching for Wix's own file.
  await expect(own.getByRole("table", { name: "Columns found" })).toHaveCount(0);
  const sample = own.getByRole("table", { name: "The first rows" });
  await expect(sample.getByRole("row").filter({ hasText: "Rose Bouquet" }).getByRole("cell")).toHaveText(["7", "Rose Bouquet", "300.00", "Roses, Same day delivery", "4", "3"]);
  await expect(sample.getByRole("row").filter({ hasText: "Ceramic Vase" }).getByRole("cell")).toHaveText(["2", "Ceramic Vase", "200.00", "Gifts, Home decor", "0", "2"]);
});

test("the products come in with their variations, options, categories and pictures", async () => {
  await own.getByRole("button", { name: "Import 4" }).click();
  await expect(own.getByRole("status")).toContainText("Imported: 4 added, 0 updated.");
  await expect(own.getByText(/Pictures that couldn't be added/)).toHaveCount(0);
  // The WebP and the AVIF were asked of Wix's media host as JPEGs.
  expect(asked).toContain("/media/0a1b2c_rose0002~mv2.avif/v1/fit/w_1600,h_1600,q_90/picture.jpg");
  expect(asked).toContain("/media/0a1b2c_vase0002~mv2.webp/v1/fit/w_1600,h_1600,q_90/picture.jpg");
  expect(asked.filter((p) => p.endsWith(".png/v1/fit/w_1600,h_1600,q_90/picture.jpg"))).toEqual([]);

  await own.getByRole("link", { name: "See your products" }).click();
  await expect(own).toHaveURL(/\/studio\/project\/catalog$/);
  for (const name of ["Ceramic Vase", "Tulip Bunch", "Rose Bouquet", "Chocolate Box"]) await expect(own.locator(`[data-product="${name}"]`)).toHaveCount(1);

  // 132.152 Its inspector leads to its page.
  await own.locator('[data-product="Rose Bouquet"]').getByRole("button", { name: /^Rose Bouquet/ }).first().click();
  await own.getByRole("link", { name: "Edit product" }).click();
  await expect(own.getByRole("heading", { level: 1, name: "Rose Bouquet" })).toBeVisible();
  await expect(own.getByLabel("Variation 1 name")).toHaveValue("Size");
  await expect(own.getByLabel("Variation 1 values, separated by commas")).toHaveValue("Small, Medium, Large");
  await expect(own.getByLabel("Variation 2 name")).toHaveValue("Colour");
  await expect(own.getByLabel("Variation 2 values, separated by commas")).toHaveValue("Red, White");
  await expect(own.locator("[data-variant]")).toHaveCount(4);
  await expect(own.getByLabel("Price of Medium, Red", { exact: true })).toHaveValue("500.00");
  await expect(own.getByLabel("Sale price of Medium, Red", { exact: true })).toHaveValue("450.00");
  await expect(own.getByLabel("Stock of Large, White")).toHaveValue("3");
  await expect(own.getByLabel("SKU of Small, White")).toHaveValue("ROSE-S-W");
  await expect(own.getByLabel("Group 1 name")).toHaveValue("Box colour");
  await expect(own.getByLabel("Group 2 name")).toHaveValue("Wrapping");
  // Its three pictures, in Wix's order.
  const photos = own.getByRole("group", { name: "Photos" });
  await expect(photos.getByRole("button", { name: /^Remove photo \d$/ })).toHaveCount(3);

  const share = (await own.getByRole("link", { name: /\/shop\// }).first().textContent())!;
  const [, appId] = /\/shop\/([0-9a-f-]{36})\/\d+$/.exec(share.trim())!;
  api = `${E2E.baseURL}/api/app/${appId}`;
});

test("the app's store API has them: the hidden one left out, the variations, the options and the pictures", async ({ request }) => {
  const products = (await (await request.get(`${api}/store/products`)).json()) as { total: number; items: { id: number; name: string; type: string; stock_status: string }[] };
  // Tulip Bunch is hidden on Wix.
  expect(products.items.map((p) => p.name).sort()).toEqual(["Ceramic Vase", "Chocolate Box", "Rose Bouquet"]);
  const rose = products.items.find((p) => p.name === "Rose Bouquet")!;
  expect(rose.type).toBe("variable");

  const detail = (await (await request.get(`${api}/store/products/${rose.id}`)).json()) as {
    images: { url: string }[];
    attributes: { name: string; options: { value: string }[] }[];
    variations: { attributes: Record<string, string>; price: { amount: string; regular_amount: string | null }; stock_status: string; max_quantity: number | null }[];
    option_groups: { name: string; min: number; max: number; options: { name: string }[] }[];
    categories: { name: string }[];
  };
  expect(detail.images).toHaveLength(3);
  for (const image of detail.images) expect((await request.get(image.url)).headers()["content-type"]).toMatch(/^image\/(png|jpeg)/);
  expect(detail.attributes.map((a) => [a.name, a.options.map((o) => o.value)])).toEqual([
    ["Size", ["Small", "Medium", "Large"]],
    ["Colour", ["Red", "White"]],
  ]);
  expect(detail.variations.map((v) => [v.attributes.a1, v.attributes.a2, v.price.amount, v.price.regular_amount, v.stock_status])).toEqual([
    ["Small", "Red", "300.00", null, "in_stock"],
    ["Medium", "Red", "450.00", "500.00", "in_stock"],
    ["Large", "White", "600.00", null, "in_stock"],
    ["Small", "White", "300.00", null, "out_of_stock"],
  ]);
  expect(detail.variations[2]!.max_quantity).toBe(3);
  expect(detail.option_groups.map((g) => [g.name, g.min, g.max, g.options.map((o) => o.name)])).toEqual([
    ["Box colour", 1, 1, ["White", "Black"]],
    ["Wrapping", 0, 1, ["Paper", "Silk"]],
  ]);
  expect(detail.categories.map((c) => c.name).sort()).toEqual(["Roses", "Same day delivery"]);

  const choc = products.items.find((p) => p.name === "Chocolate Box")!;
  const box = (await (await request.get(`${api}/store/products/${choc.id}`)).json()) as { max_quantity: number | null; sku: string | null; images: unknown[] };
  expect(box).toMatchObject({ max_quantity: 12, sku: "CHOC-1" });
  expect(box.images).toHaveLength(1);
});

test("the same file again updates the products instead of adding them twice", async () => {
  await own.goto("/studio/project/catalog/import");
  await own.getByLabel("A CSV file").setInputFiles(FIXTURE);
  await own.getByRole("button", { name: "Check the file" }).click();
  await expect(own.getByRole("heading", { name: "Products that can be imported: 4 of 4." })).toBeVisible();
  const before = asked.length;
  await own.getByRole("button", { name: "Import 4" }).click();
  await expect(own.getByRole("status")).toContainText("Imported: 0 added, 4 updated.");
  // Their pictures are there already: none read again.
  expect(asked.length).toBe(before);
  await own.goto("/studio/project/catalog");
  await expect(own.locator("[data-product]")).toHaveCount(4);
});
