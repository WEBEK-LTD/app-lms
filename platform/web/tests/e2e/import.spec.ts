import { createServer, type Server } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";
import { solidPng } from "./png";

/**
 * 81.4 Import for apps without a connector: a shop without a website brings
 * its products from a CSV file (checked first: the columns found, the first
 * rows, what's wrong), then from a product feed's link; the same products
 * again update instead of being added twice. The feed and the pictures are on
 * a fake site every read goes to (SITE_SCAN_TEST_URL).
 */
test.describe.configure({ mode: "serial" });
// Its own address, so its sign-up and sign-ins never use up the shared limits of the other specs.
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.182" };
test.use({ extraHTTPHeaders });

const suffix = Date.now().toString(36);
const client = { name: "Lale Tea House", email: `lale-${suffix}@tea.test`, password: "lale-strong-password-1" };
let own: Page;
let site: Server;

const CSV = [
  "Ürün Adı;Fiyat;Kategori;Stok Kodu;Görsel;Açıklama",
  "Black tea;45,50;Tea;T-1;https://lale.example/black.png;Strong and fresh.",
  "Glass mug;120;Cups;C-1;https://lale.example/mug.png;",
  "Gift box;;Gifts;G-1;;",
].join("\n");

const FEED = `<?xml version="1.0"?><rss xmlns:g="http://base.google.com/ns/1.0"><channel><title>Lale</title>
<item><g:id>T-1</g:id><g:title>Black tea</g:title><g:price>49.00 TRY</g:price></item>
<item><g:id>H-1</g:id><g:title>Herbal tea</g:title><g:price>55.00 TRY</g:price><g:product_type>Tea</g:product_type></item>
</channel></rss>`;

test.beforeAll(async ({ browser }) => {
  const picture = solidPng(400, 400, [176, 58, 46]);
  site = createServer((req, res) => {
    if (req.url === "/black.png" || req.url === "/mug.png") {
      res.writeHead(200, { "content-type": "image/png" });
      res.end(picture);
    } else if (req.url === "/products.xml") {
      res.writeHead(200, { "content-type": "application/rss+xml" });
      res.end(FEED);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((resolve) => site.listen(E2E.siteScanPort, resolve));

  own = await (await browser.newContext({ extraHTTPHeaders })).newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+90 544 000 01 82");
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/pending$/);

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
  await admin.context().close();

  // A shop without a website.
  await own.goto("/dashboard/app-type");
  await own.getByText("Store", { exact: true }).click();
  await own.getByRole("button", { name: "Continue" }).click();
  await own.getByText("I don't have a website").click();
  await own.getByRole("button", { name: "Save & continue" }).click();
  await expect(own.getByRole("heading", { name: "Branding" })).toBeVisible();
});

test.afterAll(async () => {
  await own.context().close();
  await new Promise<void>((resolve) => site.close(() => resolve()));
});

test("a CSV is checked first: the columns found, the first rows and what's wrong", async () => {
  await own.goto("/dashboard/catalog");
  await own.getByRole("link", { name: "Import from a file" }).click();
  await expect(own).toHaveURL(/\/dashboard\/catalog\/import$/);
  await expect(own.getByRole("heading", { level: 1, name: "Import products" })).toBeVisible();

  await own.getByLabel("A CSV file").setInputFiles({ name: "products.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) });
  await own.getByRole("button", { name: "Check the file" }).click();
  await expect(own.getByRole("heading", { name: "Rows that can be imported: 2 of 3." })).toBeVisible();
  const columns = own.getByRole("table", { name: "Columns found" });
  for (const [field, column] of [["Name", "Ürün Adı"], ["Price", "Fiyat"], ["Category", "Kategori"], ["SKU", "Stok Kodu"], ["Picture", "Görsel"]]) {
    await expect(columns.getByRole("row", { name: `${field} ${column}` })).toBeVisible();
  }
  await expect(own.getByRole("table", { name: "The first rows" })).toContainText("Black tea");
  await expect(own.getByRole("listitem").filter({ hasText: "Row 4" })).toContainText("Enter a price, like 450 or 450.50.");
});

test("importing adds the products with their categories and pictures", async () => {
  await own.getByRole("button", { name: "Import 2" }).click();
  await expect(own.getByRole("status")).toContainText("Imported: 2 added, 0 updated.");
  await expect(own.getByText("Rows left out because of errors: 1.")).toBeVisible();
  await own.getByRole("link", { name: "See your products" }).click();
  await expect(own).toHaveURL(/\/dashboard\/catalog$/);
  await expect(own.getByText("Black tea", { exact: true })).toBeVisible();
  await expect(own.getByText("Glass mug", { exact: true })).toBeVisible();
  await expect(own.getByText("Gift box", { exact: true })).toHaveCount(0);
});

test("a feed's link updates what's there and adds the rest", async () => {
  await own.goto("/dashboard/catalog/import");
  await own.getByLabel("Or a link to a feed or a sheet").fill("https://lale.example/products.xml");
  await own.getByRole("button", { name: "Check the file" }).click();
  await expect(own.getByRole("heading", { name: "Rows that can be imported: 2 of 2." })).toBeVisible();
  await own.getByRole("button", { name: "Import 2" }).click();
  await expect(own.getByRole("status")).toContainText("Imported: 1 added, 1 updated.");

  // A link that isn't there says so.
  await own.getByRole("button", { name: "Choose another file" }).click();
  await expect(own.getByRole("button", { name: "Check the file" })).toBeDisabled();
  await expect(own.getByText("Choose a file, or enter a link.")).toHaveCount(0);
  await own.getByLabel("Or a link to a feed or a sheet").fill("https://lale.example/missing.xml");
  await own.getByRole("button", { name: "Check the file" }).click();
  await expect(own.getByRole("alert").filter({ hasText: "HTTP" })).toContainText("The link answered with an error (HTTP 404).");
});
