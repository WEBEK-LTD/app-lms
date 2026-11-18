import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { E2E } from "../../playwright.config";

/**
 * 115.40 A similar item, asked live, over the hosted API of Studio's Zad
 * demo: the demo number (a Zad customer, and Zad Market's owner) orders
 * white cheese by weight and rice, letting a similar item replace what's
 * out; Zad Market accepts the order, proposes short-grain rice for the
 * rice, the customer sees the proposal with its five minutes and accepts
 * it, and the picking brings the proposed item. A second answer is
 * refused, and so is a proposal for a line the customer said to leave out.
 */
test.describe.configure({ mode: "serial" });

const DEMO = { countryCode: "+1", number: "2025550123", code: "246810" };
const DEVICE = { id: "e2e-substitutes-install", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const headers = { "x-forwarded-for": "198.51.100.240" };
let admin: Page;
let zad = "";
let auth: Record<string, string> = {};

type Product = { id: number; name: string; unit: string; step: number; in_stock: boolean };
type Line = { id: number; product_id: number; if_missing: string; outcome: string | null; substitute: { product_id: number } | null; proposal: { product_id: number; answer: string | null; answered_by: string | null; expires_at: string; proposed_at: string } | null };
type Order = { id: number; status: string; if_missing: string | null; lines: Line[] };

test.beforeAll(async ({ browser }) => {
  admin = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": "203.0.113.240" } });
  admin.on("dialog", (dialog) => void dialog.accept());
  await admin.goto("/sign-in");
  await admin.getByLabel("Email").fill(E2E.marketSubstitutesAdminEmail);
  await admin.getByLabel("Password", { exact: true }).fill(E2E.adminPassword);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.waitForURL((url) => url.pathname.startsWith("/admin"));
});

test.afterAll(async () => {
  await admin.close();
});

const api = (path: string) => `/api/app/${zad}${path}`;

async function products(request: APIRequestContext, vendor: number): Promise<Product[]> {
  const all: Product[] = [];
  for (let page = 1; page < 20; page++) {
    const res = await request.get(api(`/market/vendors/${vendor}/products`), { params: { page, per_page: 50 }, headers });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { items: Product[]; total_pages?: number; next_cursor?: string | null };
    all.push(...body.items);
    if (!body.items.length || (body.total_pages !== undefined && page >= body.total_pages)) break;
  }
  return all;
}

test("Studio's Zad demo is there, and the demo number signs in", async ({ request }) => {
  await admin.goto("/admin/demos?family=studio");
  await admin.getByRole("button", { name: /Create Studio's demo apps|Refresh all of Studio's demo apps/ }).click();
  await expect(admin.getByRole("status")).toContainText("Yallapp Studio's demos are created and up to date.", { timeout: 60_000 });
  zad = await admin.locator(`form:not(:has(input[name="variant"])):has(button:has-text("Start a build of Zad")) input[name="appId"]`).inputValue();
  expect(zad).not.toBe("");
  const asked = await request.post(api("/auth/otp/request"), { data: { country_code: DEMO.countryCode, phone: DEMO.number }, headers });
  expect(asked.status()).toBe(200);
  const { request_id } = (await asked.json()) as { request_id: string };
  const verified = await request.post(api("/auth/otp/verify"), { data: { request_id, code: DEMO.code, device: DEVICE }, headers });
  expect(verified.status()).toBe(200);
  auth = { ...headers, authorization: `Bearer ${((await verified.json()) as { access_token: string }).access_token}` };
});

test("a weighed item ordered, a similar one proposed, accepted in time, and picked", async ({ request }) => {
  const vendors = (await (await request.get(api("/market/vendors"), { params: { kind: "grocery" }, headers })).json()) as { items: { id: number; name: string }[] };
  const market = vendors.items.find((v) => v.name === "Zad Market");
  expect(market, JSON.stringify(vendors.items.map((v) => v.name))).toBeTruthy();
  const all = await products(request, market!.id);
  const cheese = all.find((p) => p.name === "White cheese" && p.in_stock)!;
  const units = all.filter((p) => p.unit === "item" && p.in_stock);
  expect(cheese).toBeTruthy();
  expect(units.length).toBeGreaterThan(2);
  const [rice, similar, other] = units;

  // 750 g of white cheese and two of an item; a similar item if something is out, but leave the other out.
  const cart = {
    vendor_id: market!.id,
    fulfilment: "pickup",
    if_missing: "similar",
    lines: [
      { product_id: cheese.id, quantity: cheese.step * 3 },
      { product_id: rice!.id, quantity: 2 },
      { product_id: other!.id, quantity: 1, if_missing: "remove" },
    ],
  };
  const quote = await request.post(api("/market/quote"), { data: cart, headers: auth });
  expect(quote.status(), await quote.text()).toBe(200);
  const placed = await request.post(api("/market/orders"), {
    params: { platform: "android" },
    data: { ...cart, quote_id: ((await quote.json()) as { quote_id: string }).quote_id, payment: "cash" },
    headers: auth,
  });
  expect(placed.status(), await placed.text()).toBe(201);
  const order = ((await placed.json()) as { order: Order }).order;
  expect(order.if_missing).toBe("similar");
  expect(order.lines.map((l) => l.if_missing)).toEqual(["similar", "similar", "remove"]);

  // Zad Market (the demo number owns it) takes the order and proposes another item for the rice.
  const accepted = await request.post(api(`/vendor/orders/${order.id}/accept`), { data: { prep_minutes: 20 }, headers: auth });
  expect(accepted.status(), await accepted.text()).toBe(200);
  const riceLine = order.lines[1]!;
  const proposed = await request.post(api(`/vendor/orders/${order.id}/lines/${riceLine.id}/proposal`), { data: { product_id: similar!.id }, headers: auth });
  expect(proposed.status(), await proposed.text()).toBe(200);
  // Not for the line the customer said to leave out.
  const notAsked = await request.post(api(`/vendor/orders/${order.id}/lines/${order.lines[2]!.id}/proposal`), { data: { product_id: similar!.id }, headers: auth });
  expect(notAsked.status()).toBe(409);
  expect(((await notAsked.json()) as { code: string }).code).toBe("not_asked");

  // The customer sees it, with five minutes to answer, and accepts.
  const seen = (await (await request.get(api(`/me/market-orders/${order.id}`), { headers: auth })).json()) as Order;
  const proposal = seen.lines[1]!.proposal!;
  expect(proposal).toMatchObject({ product_id: similar!.id, answer: null, answered_by: null });
  expect(new Date(proposal.expires_at).getTime() - new Date(proposal.proposed_at).getTime()).toBe(5 * 60_000);
  const answered = await request.post(api(`/me/market-orders/${order.id}/lines/${riceLine.id}/proposal`), { data: { answer: "accept" }, headers: auth });
  expect(answered.status(), await answered.text()).toBe(200);
  expect(((await answered.json()) as Order).lines[1]!.proposal).toMatchObject({ answer: "accepted", answered_by: "customer" });
  const again = await request.post(api(`/me/market-orders/${order.id}/lines/${riceLine.id}/proposal`), { data: { answer: "decline" }, headers: auth });
  expect(again.status()).toBe(409);
  expect(((await again.json()) as { code: string }).code).toBe("proposal_closed");

  // Picking: the cheese weighed, the rice swapped for the accepted item, the other one out.
  const picked = await request.patch(api(`/vendor/orders/${order.id}/lines`), {
    data: {
      lines: [
        { line_id: order.lines[0]!.id, outcome: "picked", quantity: cheese.step * 3 + 0.03 },
        { line_id: riceLine.id, outcome: "substituted" },
        { line_id: order.lines[2]!.id, outcome: "missing" },
      ],
    },
    headers: auth,
  });
  expect(picked.status(), await picked.text()).toBe(200);
  const after = (await picked.json()) as Order;
  expect(after.lines.map((l) => l.outcome)).toEqual(["picked", "substituted", "missing"]);
  expect(after.lines[1]!.substitute).toMatchObject({ product_id: similar!.id });
});
