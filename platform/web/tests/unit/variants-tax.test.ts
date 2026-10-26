import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { taxCents, taxLabel } from "@/lib/catalog/tax";
import { allCombinations, parseVariants } from "@/lib/catalog/variants";
import { MemoryStore } from "@/lib/data/memory";
import type { App, CatalogSettings, CatalogVariants } from "@/lib/data/types";
import { newOrderMail, startPayment } from "@/lib/catalog/payment";
import { placeDemoOrder } from "@/lib/demo/checkout";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { orderReceipt } from "@/lib/receipts/build";
import { NOW } from "./helpers";

/** 91.5 Variations and taxes in shops without a website. */

const TEE: CatalogVariants = {
  attributes: [
    { name: "Colour", values: ["Red", "Blue"] },
    { name: "Size", values: ["S", "L"] },
  ],
  items: [
    { id: 1, values: ["Red", "S"], priceCents: null, salePriceCents: null, stock: 2, sku: "TEE-RS", active: true },
    { id: 2, values: ["Red", "L"], priceCents: 32000, salePriceCents: 30000, stock: null, sku: "TEE-RL", active: true },
    { id: 3, values: ["Blue", "S"], priceCents: null, salePriceCents: null, stock: 0, sku: null, active: true },
    { id: 4, values: ["Blue", "L"], priceCents: null, salePriceCents: null, stock: null, sku: null, active: false },
  ],
};

async function shop(settings: Partial<CatalogSettings> = {}, variants: CatalogVariants | null = TEE) {
  const store = new MemoryStore();
  const app: App = {
    ...newApp("c1", null, NOW, "store"),
    backend: "hosted",
    demo: true,
    connector: { kind: "catalog" },
    catalogSettings: { currency: "TRY", shippingCents: 5000, freeShippingOverCents: null, payment: null, ...settings },
  };
  await store.createApp(app);
  const product = await store.createCatalogProduct(
    { appId: app.id, name: "Tee", description: "", priceCents: 25000, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null, variants },
    NOW,
  );
  const connector = new CatalogConnector({ store, app, assetUrl: (id) => id, platformUrl: "https://yallapp.test" });
  const call = (method: string, path: string, body?: unknown) =>
    connector.handle({ method, path: path.split("/").filter(Boolean), query: new URLSearchParams(path.includes("checkout") ? "platform=android" : ""), body, user: null, now: NOW });
  return { store, app, product, call };
}

describe("91.5 variations", () => {
  it("are read from the editor: attributes, combinations of their values, prices in cents", () => {
    expect(parseVariants("")).toEqual({ ok: true, variants: null });
    expect(parseVariants(JSON.stringify({ attributes: [{ name: "", values: [] }], items: [] }))).toEqual({ ok: true, variants: null });
    const parsed = parseVariants(
      JSON.stringify({
        attributes: [{ name: " Size ", values: ["S", " M ", "S"] }],
        items: [
          { id: 7, values: ["S"], priceCents: 1000, salePriceCents: null, stock: 3, sku: " S-1 ", active: true },
          { values: ["M"], priceCents: null, salePriceCents: null, stock: null, sku: "", active: false },
          { values: ["XL"], priceCents: 1, salePriceCents: null, stock: null },
          { values: ["S"], priceCents: 2000 },
        ],
      }),
    );
    expect(parsed).toEqual({
      ok: true,
      variants: {
        attributes: [{ name: "Size", values: ["S", "M"] }],
        items: [
          { id: 7, values: ["S"], priceCents: 1000, salePriceCents: null, stock: 3, sku: "S-1", active: true },
          { id: 8, values: ["M"], priceCents: null, salePriceCents: null, stock: null, sku: null, active: false },
        ],
      },
    });
    expect(parseVariants(JSON.stringify({ attributes: [{ name: "Size", values: [] }], items: [] }))).toMatchObject({ ok: false });
    expect(parseVariants(JSON.stringify({ attributes: [{ name: "Size", values: ["S"] }, { name: "size", values: ["M"] }], items: [] }))).toEqual({ ok: false, message: "Give each variation a different name." });
    expect(parseVariants(JSON.stringify({ attributes: [{ name: "Size", values: ["S"] }], items: [{ values: ["S"], priceCents: "4x" }] }))).toMatchObject({ ok: false });
    expect(parseVariants(JSON.stringify({ attributes: [{ name: "Size", values: ["S"] }], items: [{ values: ["S"], priceCents: null, salePriceCents: 100 }] }))).toEqual({ ok: false, message: "Enter a combination's price before its sale price." });
    expect(parseVariants(JSON.stringify({ attributes: [{ name: "Size", values: ["S"] }], items: [] }))).toEqual({ ok: false, message: "Add at least one combination the customer can buy." });
    expect(allCombinations(TEE.attributes)).toEqual([["Red", "S"], ["Red", "L"], ["Blue", "S"], ["Blue", "L"]]);
  });

  it("are sold in the app like WooCommerce's: a price range, attributes, and each combination's price and stock", async () => {
    const { store, app, product, call } = await shop();
    const list = await call("GET", "/store/products");
    expect((list!.body as { items: unknown[] }).items[0]).toMatchObject({
      type: "variable",
      price: { amount: "250.00", formatted: "₺250.00 – ₺300.00", on_sale: true, range: true },
      stock_status: "in_stock",
      purchasable: true,
    });
    const detail = (await call("GET", `/store/products/${product.id}`))!.body as { attributes: unknown[]; variations: unknown[] };
    expect(detail.attributes).toEqual([
      { slug: "a1", name: "Colour", variation: true, options: [{ value: "Red", label: "Red" }, { value: "Blue", label: "Blue" }] },
      { slug: "a2", name: "Size", variation: true, options: [{ value: "S", label: "S" }, { value: "L", label: "L" }] },
    ]);
    // The one turned off isn't offered; an empty one is out of stock.
    expect(detail.variations).toEqual([
      expect.objectContaining({ id: 1, attributes: { a1: "Red", a2: "S" }, price: expect.objectContaining({ formatted: "₺250.00", on_sale: false }), stock_status: "in_stock", max_quantity: 2, purchasable: true }),
      expect.objectContaining({ id: 2, attributes: { a1: "Red", a2: "L" }, price: expect.objectContaining({ formatted: "₺300.00", regular_formatted: "₺320.00", on_sale: true }), max_quantity: null }),
      expect.objectContaining({ id: 3, stock_status: "out_of_stock", purchasable: false }),
    ]);

    // The cart needs a combination, and prices it and caps it by its stock.
    const quote = await call("POST", "/store/cart", {
      lines: [
        { product_id: product.id, quantity: 1 },
        { product_id: product.id, variation_id: 1, quantity: 5 },
        { product_id: product.id, variation_id: 2, quantity: 1 },
        { product_id: product.id, variation_id: 4, quantity: 1 },
      ],
    });
    expect((quote!.body as { lines: unknown[] }).lines).toEqual([
      expect.objectContaining({ available: false, problem: "Choose the options first." }),
      expect.objectContaining({ variation_id: 1, name: "Tee - Red, S", quantity: 2, unit_price: "₺250.00", problem: "Only 2 left in stock.", max_quantity: 2 }),
      expect.objectContaining({ variation_id: 2, name: "Tee - Red, L", unit_price: "₺300.00", available: true }),
      expect.objectContaining({ available: false, problem: "This product is no longer available." }),
    ]);

    // Paid: the combination's stock goes down, and the order keeps which one it was.
    expect((await call("POST", "/store/checkout-link", { lines: [{ product_id: product.id, variation_id: 1, quantity: 2 }] }))!.status).toBe(200);
    const order = (await store.listCatalogOrders({ appId: app.id, limit: 5, offset: 0 })).items[0]!;
    expect(order.lines).toEqual([expect.objectContaining({ name: "Tee - Red, S", variantId: 1, variant: "Red, S", unitCents: 25000, quantity: 2 })]);
    await placeDemoOrder(store, app, order, NOW);
    expect((await store.getCatalogProduct(app.id, product.id))!.variants!.items[0]!.stock).toBe(0);
    expect(((await call("GET", `/store/products/${product.id}`))!.body as { variations: { id: number; stock_status: string }[] }).variations[0]).toMatchObject({ id: 1, stock_status: "out_of_stock" });
  });

  it("aren't asked of a product without them", async () => {
    const { product, call } = await shop({}, null);
    const quote = await call("POST", "/store/cart", { lines: [{ product_id: product.id, variation_id: 1, quantity: 1 }, { product_id: product.id, quantity: 1 }] });
    expect((quote!.body as { lines: { available: boolean }[] }).lines.map((l) => l.available)).toEqual([false, true]);
  });
});

describe("91.5 tax", () => {
  it("is worked out inside the prices or on top of them", () => {
    const kdv = { label: "KDV", rateBps: 2000, included: true };
    expect(taxLabel(kdv)).toBe("KDV 20%");
    expect(taxLabel({ ...kdv, rateBps: 750 })).toBe("KDV 7.5%");
    expect(taxCents(kdv, 12000)).toBe(2000);
    expect(taxCents({ ...kdv, included: false }, 12000)).toBe(2400);
    expect(taxCents(kdv, 0)).toBe(0);
  });

  it("included: the total stays, and the cart, order and receipt say how much is tax", async () => {
    const { store, app, product, call } = await shop({ tax: { label: "KDV", rateBps: 2000, included: true } });
    const quote = (await call("POST", "/store/cart", { lines: [{ product_id: product.id, variation_id: 1, quantity: 2 }] }))!.body;
    // 2 × 250 + 50 shipping = 550, of which 91.67 is KDV.
    expect(quote).toMatchObject({ total: "₺550.00", tax: null, tax_included: "₺91.67", tax_label: "KDV 20%", total_final: true });
    await call("POST", "/store/checkout-link", { lines: [{ product_id: product.id, variation_id: 1, quantity: 2 }] });
    const order = (await store.listCatalogOrders({ appId: app.id, limit: 5, offset: 0 })).items[0]!;
    expect(order).toMatchObject({ totalCents: 55000, tax: { label: "KDV", rateBps: 2000, included: true, cents: 9167 } });
    const receipt = orderReceipt({ lang: "en", app, order: { ...order, paidAt: NOW }, zone: "Europe/Istanbul" });
    expect(receipt.totals.map((t) => [t.label, t.value.replace(/[\u2066-\u2069]/g, "")])).toEqual([
      ["Subtotal", "₺500.00"],
      ["Shipping", "₺50.00"],
      ["Total", "₺550.00"],
      ["Includes KDV 20%", "₺91.67"],
    ]);
  });

  it("added: on the products after discounts and the shipping, in the total and the payment", async () => {
    const { store, app, product, call } = await shop({ tax: { label: "VAT", rateBps: 1000, included: false } });
    const quote = (await call("POST", "/store/cart", { lines: [{ product_id: product.id, variation_id: 2, quantity: 1 }] }))!.body;
    // 300 + 50 shipping = 350, plus 35 VAT.
    expect(quote).toMatchObject({ tax: "₺35.00", tax_included: null, tax_label: "VAT 10%", total: "₺385.00" });
    await call("POST", "/store/checkout-link", { lines: [{ product_id: product.id, variation_id: 2, quantity: 1 }] });
    const order = (await store.listCatalogOrders({ appId: app.id, limit: 5, offset: 0 })).items[0]!;
    expect(order).toMatchObject({ totalCents: 38500, tax: { cents: 3500, included: false } });
    const receipt = orderReceipt({ lang: "en", app, order: { ...order, paidAt: NOW }, zone: "Europe/Istanbul" });
    expect(receipt.totals.map((t) => [t.label, t.value.replace(/[\u2066-\u2069]/g, "")])).toEqual([
      ["Subtotal", "₺300.00"],
      ["Shipping", "₺50.00"],
      ["VAT 10%", "₺35.00"],
      ["Total", "₺385.00"],
    ]);

    // The payment's lines add up to what is charged, the tax its own line; the shop's email says it.
    const sent: Record<string, unknown>[] = [];
    const fetcher = (async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(String(init.body)) as Record<string, unknown>);
      return Response.json({ status: "success", token: "t", paymentPageUrl: "https://sandbox-cpp.iyzipay.com?token=t" });
    }) as unknown as typeof fetch;
    const customer = { name: "Sara Yilmaz", phone: "+905321234567", email: "sara@example.com", city: "Istanbul", address: "Moda Cd. 12" };
    const keys = { apiKey: "sandbox-key", secretKey: "sandbox-secret", sandbox: true };
    await startPayment({ store, app, account: { account: { provider: "iyzico", keys }, marketplace: null }, fetcher, now: NOW, order, customer, ip: "203.0.113.9", callbackUrls: { returnUrl: "https://yallapp.test/r", webhookUrl: null } });
    expect(sent[0]).toMatchObject({
      price: "385.00",
      paidPrice: "385.00",
      basketItems: [{ name: "Tee - Red, L", price: "300.00" }, { id: "shipping", price: "50.00" }, { id: "tax", name: "VAT", price: "35.00" }],
    });
    expect(newOrderMail(order, "Tee Shop", "https://yallapp.test/dashboard/orders").text).toContain("VAT 10%: ₺35.00");
  });
});
