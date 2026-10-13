import { centsToDecimal, formatCents } from "../../catalog/money";
import { catalogSettings, ORDER_STATUS_LABELS, orderNumber, PAY_LINK_MINUTES, shippingFor } from "../../catalog/settings";
import { randomToken, sha256Hex } from "../../crypto/tokens";
import type { DataStore } from "../../data/store";
import type { App, CatalogCategory, CatalogOrder, CatalogOrderLine, CatalogProduct, CatalogSettings } from "../../data/types";
import { cartLines, error, intParam, type CartLineInput } from "./common";
import type { Connector, ConnectorRequest, ConnectorResult } from "./types";

/**
 * The shop of an app without a website: products, categories and orders the
 * client manages in the dashboard, paid on our payment page (iyzico). Only
 * simple products; no variations or reviews.
 */

export interface CatalogDeps {
  store: DataStore;
  app: App;
  /** Public URL of an uploaded image. */
  assetUrl: (assetId: string) => string;
  /** The platform's address, for product and payment page links. */
  platformUrl: string;
}

type OrderBy = "newest" | "popular" | "rating" | "price_asc" | "price_desc" | "title";
const ORDERS: OrderBy[] = ["newest", "popular", "rating", "price_asc", "price_desc", "title"];

/** Statuses the app lists: orders that were paid. */
const LISTED_STATUSES: CatalogOrder["status"][] = ["processing", "completed", "cancelled", "refunded"];

export const priceOf = (p: Pick<CatalogProduct, "priceCents" | "salePriceCents">) =>
  p.salePriceCents !== null && p.salePriceCents < p.priceCents ? p.salePriceCents : p.priceCents;

export function productUrl(platformUrl: string, appId: string, productId: number): string {
  return `${platformUrl.replace(/\/+$/, "")}/shop/${appId}/${productId}`;
}

export function payUrl(platformUrl: string, token: string): string {
  return `${platformUrl.replace(/\/+$/, "")}/pay/${token}`;
}

/** Paragraphs of plain text as HTML. */
export function descriptionHtml(text: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escape(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export class CatalogConnector implements Connector {
  private readonly settings: CatalogSettings;

  constructor(private readonly deps: CatalogDeps) {
    this.settings = catalogSettings(deps.app);
  }

  private money(cents: number): string {
    return formatCents(cents, this.settings.currency);
  }

  async config() {
    return {
      store: {
        currency: this.settings.currency,
        guest_checkout: true,
        checkout_opens_in: "in_app",
        reviews: false,
        delivery_date: { enabled: false, required: false, min_days: 0, max_days: 0, closed_weekdays: [] },
        gift_message: { enabled: false, max_length: 200 },
      },
      features: { orders: true },
    };
  }

  async handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    const route = `${request.method} /${request.path.join("/")}`;
    switch (route) {
      case "GET /store/home":
        return { status: 200, body: { sections: await this.home() } };
      case "GET /store/categories":
        return { status: 200, body: { items: await this.categories() } };
      case "GET /store/products":
        return this.products(request.query);
      case "POST /store/cart":
        return this.quote(request);
      case "POST /store/checkout-link":
        return this.checkoutLink(request);
      case "GET /me/orders":
        return this.orders(request);
    }
    if (request.method === "GET" && request.path[0] === "store" && request.path[1] === "products" && request.path[2]) {
      const id = Number(request.path[2]);
      if (!Number.isSafeInteger(id) || id < 1) return error(404, "not_found", "Product not found.");
      if (request.path.length === 3) return this.product(id);
      if (request.path.length === 4 && request.path[3] === "reviews") {
        return error(403, "feature_disabled", "Reviews aren't available in this shop.");
      }
    }
    return null;
  }

  // Mapping

  private price(p: CatalogProduct) {
    const onSale = p.salePriceCents !== null && p.salePriceCents < p.priceCents;
    const now = priceOf(p);
    return {
      amount: centsToDecimal(now),
      regular_amount: onSale ? centsToDecimal(p.priceCents) : null,
      regular_formatted: onSale ? this.money(p.priceCents) : null,
      currency: this.settings.currency,
      formatted: this.money(now),
      on_sale: onSale,
      range: false,
    };
  }

  private summary(p: CatalogProduct) {
    const inStock = p.stock === null || p.stock > 0;
    return {
      id: p.id,
      name: p.name,
      type: "simple",
      image_url: p.imageAssetIds[0] ? this.deps.assetUrl(p.imageAssetIds[0]) : null,
      price: this.price(p),
      rating: null,
      rating_count: 0,
      stock_status: inStock ? "in_stock" : "out_of_stock",
      purchasable: inStock,
      digital: p.digital,
    };
  }

  private category(c: CatalogCategory, count: number) {
    return { id: c.id, name: c.name, count, parent_id: null, image_url: null };
  }

  // Catalog

  private async active(): Promise<CatalogProduct[]> {
    return (await this.deps.store.listCatalogProducts(this.deps.app.id)).filter((p) => p.active);
  }

  private async categories() {
    const [categories, products] = await Promise.all([this.deps.store.listCatalogCategories(this.deps.app.id), this.active()]);
    return categories
      .map((c) => this.category(c, products.filter((p) => p.categoryIds.includes(c.id)).length))
      .filter((c) => c.count > 0);
  }

  private sorted(products: CatalogProduct[], orderby: OrderBy): CatalogProduct[] {
    const list = [...products];
    switch (orderby) {
      case "popular":
      case "rating":
        return list.sort((a, b) => b.salesCount - a.salesCount || b.id - a.id);
      case "price_asc":
        return list.sort((a, b) => priceOf(a) - priceOf(b) || b.id - a.id);
      case "price_desc":
        return list.sort((a, b) => priceOf(b) - priceOf(a) || b.id - a.id);
      case "title":
        return list.sort((a, b) => a.name.localeCompare(b.name, "tr"));
      default:
        return list; // Newest first already.
    }
  }

  private async products(query: URLSearchParams): Promise<ConnectorResult> {
    const page = intParam(query, "page", 1, 10_000);
    const perPage = intParam(query, "per_page", 20, 50);
    const all = await this.active();
    const ids = (query.get("ids") ?? "")
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isSafeInteger(v) && v > 0)
      .slice(0, 50);
    if (ids.length > 0) {
      const byId = new Map(all.map((p) => [p.id, p]));
      const items = ids.map((id) => byId.get(id)).filter((p): p is CatalogProduct => Boolean(p)).map((p) => this.summary(p));
      return { status: 200, body: { page: 1, per_page: items.length || perPage, total: items.length, total_pages: 1, items } };
    }
    const category = query.get("category") ? Number(query.get("category")) : null;
    if (category !== null && (!Number.isSafeInteger(category) || category < 1)) return error(400, "invalid_request", "Unknown category.");
    const search = (query.get("search") ?? "").trim().toLocaleLowerCase("tr").slice(0, 100);
    const flag = (name: string) => query.get(name) === "true" || query.get(name) === "1";
    const orderParam = query.get("orderby") as OrderBy | null;
    const filtered = this.sorted(
      all.filter(
        (p) =>
          (category === null || p.categoryIds.includes(category)) &&
          (!flag("featured") || p.featured) &&
          (!flag("on_sale") || priceOf(p) < p.priceCents) &&
          (search === "" || `${p.name} ${p.description}`.toLocaleLowerCase("tr").includes(search)),
      ),
      orderParam && ORDERS.includes(orderParam) ? orderParam : "newest",
    );
    const start = (page - 1) * perPage;
    return {
      status: 200,
      body: {
        page,
        per_page: perPage,
        total: filtered.length,
        total_pages: Math.max(1, Math.ceil(filtered.length / perPage)),
        items: filtered.slice(start, start + perPage).map((p) => this.summary(p)),
      },
    };
  }

  private async home() {
    const [categories, products] = await Promise.all([this.categories(), this.active()]);
    const section = (type: string, list: CatalogProduct[]) =>
      list.length > 0 ? [{ type, title: null, products: list.slice(0, 10).map((p) => this.summary(p)) }] : [];
    return [
      ...(categories.length > 0 ? [{ type: "categories", title: null, categories: categories.slice(0, 12) }] : []),
      ...section("featured_products", products.filter((p) => p.featured)),
      ...section("sale_products", products.filter((p) => priceOf(p) < p.priceCents)),
      ...section("new_products", products),
      ...section("best_sellers", this.sorted(products.filter((p) => p.salesCount > 0), "popular")),
    ];
  }

  private async product(id: number): Promise<ConnectorResult> {
    const { store, app } = this.deps;
    const product = await store.getCatalogProduct(app.id, id);
    if (!product || !product.active) return error(404, "not_found", "Product not found.");
    const [categories, all] = await Promise.all([store.listCatalogCategories(app.id), this.active()]);
    const related = all
      .filter((p) => p.id !== id && p.categoryIds.some((c) => product.categoryIds.includes(c)))
      .slice(0, 8);
    return {
      status: 200,
      body: {
        ...this.summary(product),
        description_html: descriptionHtml(product.description),
        short_description_html: null,
        images: product.imageAssetIds.map((assetId) => ({ url: this.deps.assetUrl(assetId), alt: product.name })),
        sku: product.sku,
        max_quantity: product.stock !== null && product.stock > 0 ? product.stock : null,
        attributes: [],
        variations: [],
        categories: categories.filter((c) => product.categoryIds.includes(c.id)).map((c) => this.category(c, 0)),
        related: related.map((p) => this.summary(p)),
        external_url: null,
        permalink: productUrl(this.deps.platformUrl, app.id, product.id),
      },
    };
  }

  // Cart and checkout

  private async priced(lines: CartLineInput[]) {
    const byId = new Map((await this.active()).map((p) => [p.id, p]));
    let subtotal = 0;
    let count = 0;
    const out = lines.map((line) => {
      const product = byId.get(line.product_id);
      if (!product || line.variation_id !== null) {
        return {
          line: {
            product_id: line.product_id,
            variation_id: line.variation_id,
            quantity: line.quantity,
            name: "Unavailable product",
            image_url: null,
            unit_price: this.money(0),
            line_total: this.money(0),
            available: false,
            problem: "This product is no longer available.",
            max_quantity: null,
            digital: false,
          },
          product: null,
        };
      }
      const max = product.stock !== null ? product.stock : null;
      const available = max === null || max > 0;
      const quantity = max !== null && max > 0 ? Math.min(line.quantity, max) : line.quantity;
      const unit = priceOf(product);
      if (available) {
        subtotal += unit * quantity;
        count += quantity;
      }
      return {
        line: {
          product_id: product.id,
          variation_id: null,
          quantity,
          name: product.name,
          image_url: product.imageAssetIds[0] ? this.deps.assetUrl(product.imageAssetIds[0]) : null,
          unit_price: this.money(unit),
          line_total: this.money(unit * quantity),
          available,
          problem: !available ? "Out of stock." : quantity < line.quantity ? `Only ${quantity} left in stock.` : null,
          max_quantity: max !== null && max > 0 ? max : null,
          digital: product.digital,
        },
        product,
      };
    });
    return {
      out,
      cart: {
        lines: out.map((o) => o.line),
        item_count: count,
        subtotal: this.money(subtotal),
        subtotal_amount: centsToDecimal(subtotal),
        currency: this.settings.currency,
      },
      subtotal,
    };
  }

  private async quote(request: ConnectorRequest): Promise<ConnectorResult> {
    const lines = cartLines(request.body);
    if (!lines) return error(400, "invalid_request", "The cart is empty or invalid.");
    return { status: 200, body: (await this.priced(lines)).cart };
  }

  private async checkoutLink(request: ConnectorRequest): Promise<ConnectorResult> {
    const platform = request.query.get("platform");
    if (platform !== "android" && platform !== "ios") return error(400, "invalid_request", "Unknown platform.");
    const lines = cartLines(request.body);
    if (!lines) return error(400, "invalid_request", "The cart is empty or invalid.");
    if (!this.settings.payment) {
      return error(503, "shop_unavailable", "This shop can't take orders yet. Please try again later.");
    }
    const priced = await this.priced(lines);
    if (priced.out.some((o) => !o.line.available || o.line.problem)) {
      return error(409, "cart_changed", "Something in your cart changed. Please check it and try again.");
    }
    if (platform === "ios" && priced.out.some((o) => o.line.digital)) {
      return error(403, "purchase_not_allowed", "Digital products can't be bought in the iPhone app.");
    }
    const orderLines: CatalogOrderLine[] = priced.out.map(({ line, product }) => ({
      productId: product!.id,
      name: product!.name,
      quantity: line.quantity,
      unitCents: priceOf(product!),
      imageAssetId: product!.imageAssetIds[0] ?? null,
      digital: product!.digital,
    }));
    const shipping = shippingFor(this.settings, priced.subtotal, orderLines.some((l) => !l.digital));
    const token = randomToken(24);
    await this.deps.store.createCatalogOrder({
      appId: this.deps.app.id,
      tokenHash: sha256Hex(token),
      userId: request.user?.id ?? null,
      status: "pending",
      lines: orderLines,
      subtotalCents: priced.subtotal,
      shippingCents: shipping,
      totalCents: priced.subtotal + shipping,
      currency: this.settings.currency,
      customer: null,
      paymentId: null,
      createdAt: request.now,
      paidAt: null,
      updatedAt: request.now,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    });
    return {
      status: 200,
      body: {
        url: payUrl(this.deps.platformUrl, token),
        expires_at: new Date(request.now.getTime() + PAY_LINK_MINUTES * 60_000).toISOString(),
        open_in: "in_app",
      },
    };
  }

  // Orders

  private orderJson(order: CatalogOrder) {
    return {
      id: order.id,
      number: orderNumber(order),
      status: order.status,
      status_label: ORDER_STATUS_LABELS[order.status],
      total: formatCents(order.totalCents, order.currency),
      created_at: (order.paidAt ?? order.createdAt).toISOString(),
      items: order.lines.map((l) => ({
        name: l.name,
        course_id: null,
        product_id: l.productId,
        quantity: l.quantity,
        image_url: l.imageAssetId ? this.deps.assetUrl(l.imageAssetId) : null,
      })),
    };
  }

  private async orders(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return error(401, "invalid_token", "Your session has ended. Please sign in again.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const { items, total } = await this.deps.store.listCatalogOrders({
      appId: this.deps.app.id,
      userId: request.user.id,
      statuses: LISTED_STATUSES,
      offset: (page - 1) * perPage,
      limit: perPage,
    });
    return {
      status: 200,
      body: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.max(1, Math.ceil(total / perPage)),
        items: items.map((o) => this.orderJson(o)),
      },
    };
  }
}
