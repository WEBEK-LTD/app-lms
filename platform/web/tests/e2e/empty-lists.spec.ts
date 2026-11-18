import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 164 A bound list of products is never an empty section (roadmap 164): a
 * flower shop starts from Leqaa's Rose hour template, whose "Picked for you"
 * and price list were bound to featured products. Its sample products
 * removed, as a real shop does, the served pages leave those lists out with
 * their titles; once the shop adds
 * products (none featured, none of the template's), every list of products
 * on every page is served with them, its title kept and marked (`heads`).
 */
test.describe.configure({ mode: "serial" });

const suffix = Date.now().toString(36);
const client = { name: "Kech Lists", email: `empty-lists-${suffix}@studio.test`, password: "kech-lists-strong-password-1" };
/** Its own address, so this spec's sign-up and sign-in don't count against the other specs' per-IP limits. */
const extraHTTPHeaders = { "x-forwarded-for": "198.51.100.164" };
let own: Page;
let api = "";
let headers: Record<string, string> = {};

interface Node {
  id: string;
  type: string;
  name?: string;
  recent?: boolean;
  heads?: string;
  items?: { id: string; title: string }[];
  children?: Node[];
  card?: Node | null;
}

const all = (node: Node): Node[] => [node, ...(node.children ?? []).flatMap(all), ...(node.card ? all(node.card) : [])];

test.beforeAll(async ({ browser }) => {
  own = await (await browser.newContext({ extraHTTPHeaders, viewport: { width: 1360, height: 900 } })).newPage();
  await own.goto("/sign-up");
  await own.getByLabel("Full name").fill(client.name);
  await own.getByLabel("Email").fill(client.email);
  await own.getByLabel("WhatsApp number").fill("+20 100 000 0164");
  await own.getByLabel("Your website (optional)").fill(`https://empty-lists-${suffix}.studio.test`);
  await own.getByLabel("Password", { exact: true }).fill(client.password);
  await own.getByRole("checkbox").check();
  await own.getByRole("button", { name: "Create account" }).click();
  await expect(own).toHaveURL(/\/start$/);

  const admin = await browser.newPage({ extraHTTPHeaders });
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.emptyListsAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
  await admin.goto(`/admin?q=${encodeURIComponent(client.email)}`);
  await admin.getByRole("link", { name: `Activate ${client.name}` }).click();
  await admin.getByRole("complementary").getByRole("button", { name: "Activate & send license" }).click();
  await expect(admin.getByRole("status")).toContainText("Activated");
  await admin.close();

  // A flower shop from the Rose hour template.
  await own.goto("/studio/new");
  await own.getByRole("radio", { name: /^Store( |$)/ }).first().check();
  await own.getByLabel("Project name").fill("Kech Lists");
  await own.getByRole("button", { name: "Next" }).click();
  await own.getByRole("radio", { name: /Rose hour/ }).first().click();
  await own.getByRole("button", { name: "Next" }).click();
  await expect(own).toHaveURL(/\/studio\/project$/);
  await own.goto("/studio/project/setup?step=website");
  api = (await own.locator("code").filter({ hasText: "/api/app/" }).first().textContent())!.trim();
  // The draft token as the preview page's server sends it, without starting the preview's own app.
  const html = await (await own.request.get("/studio/project/preview?pages=draft")).text();
  const src = /<iframe[^>]*\ssrc="([^"]+)"[^>]*data-testid="app-preview"/.exec(html)![1]!.replaceAll("&amp;", "&");
  headers = { "x-yallapp-preview": new URL(src, E2E.baseURL).searchParams.get("token")! };
});

test.afterAll(async () => {
  await own.context().close();
});

/** A page's Studio body as the app gets it. */
async function served(request: APIRequestContext, slug: string): Promise<Node> {
  const res = await request.get(`${api}/pages/${slug}?platform=android`, { headers });
  expect(res.status(), slug).toBe(200);
  const body = (await res.json()) as { studio?: { body: Node } };
  expect(body.studio, slug).toBeDefined();
  return body.studio!.body;
}

test("the template's sample products removed, as a real shop does: the lists go with their titles, what was seen lately stays for the phone", async ({ request }) => {
  // The project starts with the demo's sample flowers (110.2); a real shop removes them for its own.
  await own.goto("/studio/project/catalog");
  const samples = own.locator("[data-samples]").getByRole("button", { name: "Remove all samples" });
  if (await samples.count()) {
    await samples.click();
    await expect(own.getByRole("status").filter({ hasText: /Removed \d+ sample/ })).toBeVisible();
  }
  const left = (await (await request.get(`${api}/store/products?platform=android`, { headers })).json()) as { items: unknown[] };
  expect(left.items).toEqual([]);
  const wishlist = all(await served(request, "wishlist"));
  expect(wishlist.filter((n) => n.type === "items").map((n) => n.recent ?? false)).toEqual([true]);
  expect(wishlist.some((n) => n.name === "Picked for you")).toBe(false);
  const home = all(await served(request, "home"));
  expect(home.filter((n) => n.type === "items" && !n.recent)).toEqual([]);
  expect(home.some((n) => n.type === "row" && n.name === "Loved most")).toBe(false);
});

test("with products, none featured: every list of products is served with them, its title kept", async ({ request }) => {
  const names = ["Red Roses", "White Lilies", "Sunflowers"];
  for (const name of names) {
    await own.goto("/studio/project/catalog/new");
    await own.getByLabel("Name", { exact: true }).fill(name);
    await own.getByLabel(/^Price \(/).first().fill("300");
    await own.getByRole("button", { name: "Add product" }).click();
    await expect(own.getByRole("status").filter({ hasText: "Saved" })).toContainText(`Saved “${name}”.`);
  }
  const products = (await (await request.get(`${api}/store/products?platform=android`, { headers })).json()) as { items: { id: number; name: string }[] };
  const ids = products.items.filter((p) => names.includes(p.name)).map((p) => String(p.id));
  expect(ids).toHaveLength(3);

  for (const slug of ["wishlist", "home"]) {
    const body = await served(request, slug);
    const lists = all(body).filter((n) => n.type === "items" && !n.recent);
    expect(lists.length, slug).toBeGreaterThan(0);
    for (const list of lists) {
      expect(list.items?.length, `${slug} ${list.name}`).toBeGreaterThan(0);
      expect(list.items!.every((i) => ids.includes(i.id)), `${slug} ${list.name}`).toBe(true);
    }
  }
  const wishlist = all(await served(request, "wishlist"));
  const picked = wishlist.find((n) => n.type === "items" && n.name === "Picked for you")!;
  expect(picked.items!.map((i) => i.title).sort()).toEqual([...names].sort());
  expect(wishlist.find((n) => n.heads === picked.id)).toMatchObject({ type: "row", name: "Picked for you" });
});
