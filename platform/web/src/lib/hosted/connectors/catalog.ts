import { checkFulfilment, FULFILMENT_LABELS, fulfilmentConfigJson, fulfilmentOf, orderTimesJson } from "../../catalog/fulfilment";
import { LOYALTY_HISTORY, loyaltyConfigJson, loyaltyOf, orderPointsJson, pointsAccountJson, usablePoints } from "../../catalog/loyalty";
import { taxCents, taxLabel, taxOf } from "../../catalog/tax";
import { attributesJson, sellableVariants, variantLabel, variantMax, variantPrices, variantsOf, variationAttributes } from "../../catalog/variants";
import { canReturn, parseReturnInput, requestReturn, returnDays, returnJson } from "../../catalog/returns";
import { couponDiscount, normalizeCouponCode } from "../../catalog/coupons";
import { centsToDecimal, formatCents } from "../../catalog/money";
import { checkOptions, optionGroupsJson, optionGroupsOf, type ChosenOption } from "../../catalog/options";
import { awaitingManualPayment } from "../../catalog/manual";
import { catalogSettings, ORDER_STATUS_LABELS, orderNumber, PAY_LINK_MINUTES, paymentsSetUp, shippingFor } from "../../catalog/settings";
import { shipmentJson } from "../../catalog/shipping";
import { randomToken, sha256Hex } from "../../crypto/tokens";
import type { DataStore } from "../../data/store";
import type { App, CatalogCategory, CatalogOrder, CatalogOrderLine, CatalogProduct, CatalogSettings, CatalogTax, FulfilmentSettings, LoyaltySettings } from "../../data/types";
import { cartLines, error, intParam, type CartLineInput } from "./common";
import type { Connector, ConnectorRequest, ConnectorResult } from "./types";
import { signingSecret } from "../../env";
import { orderReceiptUrl } from "../../receipts/links";

/**
 * The shop of an app without a website: products, categories and orders the
 * client manages in the dashboard, paid on our payment page (iyzico, Kashier, Fawaterk, Stripe or PayPal). Only
 * simple products; no variations or reviews. 26 Products may have option
 * groups (priced here, never by the app), and a restaurant's orders are for
 * pickup or delivery, at a time its kitchen takes them, and followed in the app.
 */

export interface CatalogDeps {
  store: DataStore;
  app: App;
  /** Public URL of an uploaded image. */
  assetUrl: (assetId: string) => string;
  /** The platform's address, for product and payment page links. */
  platformUrl: string;
  /** 13.1 Card payments in the app are in the app's plan (default true). Without them products show without a cart. */
  cardPayments?: boolean;
  /** 91.3 A customer asked to return an order (tells the owner's phones). */
  onReturnRequested?: (order: CatalogOrder) => Promise<void>;
  /** 91.4 Loyalty points are in the app's plan (default false). */
  loyalty?: boolean;
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

/**
 * 96.3 The customer's own orders (`GET /me/orders`, `GET /me/orders/{id}`)
 * in apps that sell from Yallapp without being a shop: tickets, paid courses
 * and memberships, each with its receipt, served as a shop serves them; null
 * for any other route.
 */
export function myOrdersRoute(deps: CatalogDeps, request: ConnectorRequest): Promise<ConnectorResult | null> | null {
  const [first, second] = request.path;
  if (request.method !== "GET" || first !== "me" || second !== "orders" || request.path.length > 3) return null;
  return new CatalogConnector(deps).handle(request);
}

export class CatalogConnector implements Connector {
  private readonly settings: CatalogSettings;
  /** 26 A restaurant's pickup and delivery; null for other shops. */
  private readonly fulfilment: FulfilmentSettings | null;
  /** 91.4 Loyalty points, when the shop has them and its plan does. */
  private readonly loyalty: LoyaltySettings | null;

  constructor(private readonly deps: CatalogDeps) {
    this.settings = catalogSettings(deps.app);
    this.fulfilment = fulfilmentOf(deps.app);
    this.loyalty = loyaltyOf(this.settings, deps.loyalty === true);
  }

  private money(cents: number): string {
    return formatCents(cents, this.settings.currency);
  }

  /**
   * 19 Whether customers can buy in the app: card payments in the plan and
   * set up for the shop (a demo shop's payment page charges nothing), the
   * same rule as courses. Otherwise products show without a cart, like
   * products the app doesn't sell.
   */
  private get canSell(): boolean {
    return paymentsSetUp(this.deps.app) && this.deps.cardPayments !== false;
  }

  async config() {
    return {
      store: {
        currency: this.settings.currency,
        // 26 A restaurant's customers sign in to order, so they can follow it.
        guest_checkout: this.fulfilment === null,
        checkout_opens_in: "in_app",
        reviews: false,
        delivery_date: { enabled: false, required: false, min_days: 0, max_days: 0, closed_weekdays: [] },
        gift_message: { enabled: false, max_length: 200 },
        ...(this.fulfilment ? { fulfilment: fulfilmentConfigJson(this.fulfilment, this.settings.currency) } : {}),
        // 91.3 Returns asked for in the app (never a restaurant's).
        returns: !this.fulfilment && returnDays(this.settings) !== null ? { enabled: true, days: returnDays(this.settings)! } : null,
        // 91.4 Loyalty points.
        loyalty: loyaltyConfigJson(this.loyalty, this.settings.currency),
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
      case "GET /me/points":
        return this.points(request);
      case "GET /store/order-times":
        return this.fulfilment ? { status: 200, body: orderTimesJson(this.fulfilment, request.now) } : error(404, "not_found", "Not found.");
    }
    if (request.method === "GET" && request.path.length === 3 && request.path[0] === "me" && request.path[1] === "orders") {
      return this.order(request, Number(request.path[2]));
    }
    if (request.method === "POST" && request.path.length === 4 && request.path[0] === "me" && request.path[1] === "orders" && request.path[3] === "return") {
      return this.requestReturn(request, Number(request.path[2]));
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
    // 91.5 A product with variations: from its cheapest to its dearest one on sale now.
    const variants = variantsOf(p);
    if (variants) {
      const items = sellableVariants(p);
      const prices = (items.length ? items : variants.items).map((v) => variantPrices(p, v));
      const low = Math.min(...prices.map((x) => x.now));
      const high = Math.max(...prices.map((x) => x.now));
      const onSale = prices.some((x) => x.now < x.regular);
      const single = low === high && prices.length > 0 ? prices.find((x) => x.now === low)! : null;
      return {
        amount: centsToDecimal(low),
        regular_amount: single && onSale ? centsToDecimal(single.regular) : null,
        regular_formatted: single && onSale ? this.money(single.regular) : null,
        currency: this.settings.currency,
        formatted: low === high ? this.money(low) : `${this.money(low)} – ${this.money(high)}`,
        on_sale: onSale,
        range: low !== high,
      };
    }
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
    // 91.5 A product with variations is in stock while one of them is.
    const variable = variantsOf(p) !== null;
    const inStock = variable ? sellableVariants(p).length > 0 : p.stock === null || p.stock > 0;
    return {
      id: p.id,
      name: p.name,
      type: variable ? "variable" : "simple",
      image_url: p.imageAssetIds[0] ? this.deps.assetUrl(p.imageAssetIds[0]) : null,
      price: this.price(p),
      rating: null,
      rating_count: 0,
      stock_status: inStock ? "in_stock" : "out_of_stock",
      purchasable: inStock && this.canSell,
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
    const variants = variantsOf(product);
    return {
      status: 200,
      body: {
        ...this.summary(product),
        description_html: descriptionHtml(product.description),
        short_description_html: null,
        images: product.imageAssetIds.map((assetId) => ({ url: this.deps.assetUrl(assetId), alt: product.name })),
        sku: product.sku,
        max_quantity: product.stock !== null && product.stock > 0 ? product.stock : null,
        // 91.5 Its variations, as WooCommerce's.
        attributes: variants ? attributesJson(variants) : [],
        variations: variants
          ? variants.items
              .filter((v) => v.active)
              .map((v) => {
                const max = variantMax(product, v);
                const prices = variantPrices(product, v);
                const onSale = prices.now < prices.regular;
                return {
                  id: v.id,
                  attributes: variationAttributes(variants, v),
                  price: {
                    amount: centsToDecimal(prices.now),
                    regular_amount: onSale ? centsToDecimal(prices.regular) : null,
                    regular_formatted: onSale ? this.money(prices.regular) : null,
                    currency: this.settings.currency,
                    formatted: this.money(prices.now),
                    on_sale: onSale,
                    range: false,
                  },
                  image_url: null,
                  stock_status: max === null || max > 0 ? "in_stock" : "out_of_stock",
                  max_quantity: max !== null && max > 0 ? max : null,
                  purchasable: (max === null || max > 0) && this.canSell,
                };
              })
          : [],
        categories: categories.filter((c) => product.categoryIds.includes(c.id)).map((c) => this.category(c, 0)),
        related: related.map((p) => this.summary(p)),
        external_url: null,
        permalink: productUrl(this.deps.platformUrl, app.id, product.id),
        option_groups: optionGroupsJson(optionGroupsOf(product), this.settings.currency),
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
      // 91.5 A product with variations is bought as one of them; one without, never.
      const variants = product ? variantsOf(product) : null;
      const variant = variants && line.variation_id !== null ? variants.items.find((v) => v.id === line.variation_id && v.active) : undefined;
      if (!product || (variants === null && line.variation_id !== null) || (variants !== null && !variant)) {
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
            problem: product && variants && line.variation_id === null ? "Choose the options first." : "This product is no longer available.",
            max_quantity: null,
            digital: false,
          },
          product: null,
          variant: undefined,
          unit: 0,
          chosen: [] as ChosenOption[],
        };
      }
      const max = variant ? variantMax(product, variant) : product.stock !== null ? product.stock : null;
      // 26 The options are checked and priced here; prices from the app are never used.
      const options = checkOptions(optionGroupsOf(product), line.options ?? []);
      const available = (max === null || max > 0) && options.ok;
      const quantity = max !== null && max > 0 ? Math.min(line.quantity, max) : line.quantity;
      const unit = (variant ? variantPrices(product, variant).now : priceOf(product)) + (options.ok ? options.deltaCents : 0);
      const chosen = options.ok ? options.chosen : [];
      if (available) {
        subtotal += unit * quantity;
        count += quantity;
      }
      return {
        line: {
          product_id: product.id,
          variation_id: variant ? variant.id : null,
          quantity,
          name: variant ? `${product.name} - ${variantLabel(variant)}` : product.name,
          image_url: product.imageAssetIds[0] ? this.deps.assetUrl(product.imageAssetIds[0]) : null,
          unit_price: this.money(unit),
          line_total: this.money(unit * quantity),
          available,
          problem: !options.ok
            ? options.problem
            : !available
              ? "Out of stock."
              : quantity < line.quantity
                ? `Only ${quantity} left in stock.`
                : null,
          max_quantity: max !== null && max > 0 ? max : null,
          digital: product.digital,
          ...(chosen.length > 0 ? { options: chosen.map((o) => ({ id: o.id, name: o.name, group: o.group })) } : {}),
        },
        product,
        variant,
        unit,
        chosen,
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

  /** 91.1 The cart's coupon: what it takes off, or why it doesn't apply; nothing without one. */
  private async coupon(body: unknown, subtotalCents: number, now: Date) {
    const raw = (body as { coupon?: unknown } | null)?.coupon;
    if (typeof raw !== "string" || raw.trim() === "") return { json: null, discountCents: 0, code: null };
    const code = normalizeCouponCode(raw);
    const coupon = code ? await this.deps.store.getCatalogCouponByCode(this.deps.app.id, code) : null;
    const check = couponDiscount(coupon, subtotalCents, this.settings.currency, now);
    const shown = code ?? raw.trim().toUpperCase().slice(0, 50);
    return check.ok
      ? { json: { code: shown, status: "applied", message: null }, discountCents: check.discountCents, code: coupon!.code }
      : { json: { code: shown, status: "invalid", message: check.message }, discountCents: 0, code: null };
  }

  /** 91.5 The shop's tax on what the customer pays before it (products after discounts, and shipping); null for none. */
  private tax(baseCents: number): (CatalogTax & { cents: number }) | null {
    const t = taxOf(this.settings);
    return t ? { ...t, cents: taxCents(t, baseCents) } : null;
  }

  /**
   * 91.4 The signed-in customer's points for a cart whose products cost
   * `productsCents` after the coupon. Each of its `lines` keeps at least a
   * cent, as the payment providers charge every line.
   */
  private async cartPoints(request: ConnectorRequest, productsCents: number, lines: number) {
    if (!this.loyalty || !request.user) return { json: null, used: 0, discountCents: 0 };
    const balance = await this.deps.store.getLoyaltyBalance(this.deps.app.id, request.user.id);
    const usable = usablePoints(this.loyalty, balance, productsCents - lines);
    const applied = (request.body as { use_points?: unknown } | null)?.use_points === true && usable.points > 0;
    return {
      json: {
        balance,
        usable: usable.points,
        usable_value: usable.points > 0 ? this.money(usable.valueCents) : null,
        applied,
        discount: applied ? this.money(usable.valueCents) : null,
      },
      used: applied ? usable.points : 0,
      discountCents: applied ? usable.valueCents : 0,
    };
  }

  private async quote(request: ConnectorRequest): Promise<ConnectorResult> {
    const lines = cartLines(request.body);
    if (!lines) return error(400, "invalid_request", "The cart is empty or invalid.");
    const priced = await this.priced(lines);
    const coupon = await this.coupon(request.body, priced.subtotal, request.now);
    // 91.1 The real total: a restaurant's delivery fee depends on how the order is collected, chosen at checkout.
    const shipping = this.fulfilment ? null : shippingFor(this.settings, priced.subtotal, priced.out.some((o) => o.line.available && !o.line.digital));
    // 91.4 The customer's points, on what the products cost after the coupon.
    const points = await this.cartPoints(request, priced.subtotal - coupon.discountCents, priced.out.length);
    const before = priced.subtotal - coupon.discountCents - points.discountCents + (shipping ?? 0);
    // 91.5 The shop's tax: inside the total, or added to it.
    const tax = this.tax(before);
    const total = before + (tax && !tax.included ? tax.cents : 0);
    return {
      status: 200,
      body: {
        ...priced.cart,
        coupon: coupon.json,
        discount: coupon.discountCents > 0 ? this.money(coupon.discountCents) : null,
        points: points.json,
        shipping: shipping === null ? null : this.money(shipping),
        tax: tax && !tax.included ? this.money(tax.cents) : null,
        tax_included: tax?.included ? this.money(tax.cents) : null,
        tax_label: tax ? taxLabel(tax) : null,
        total: this.money(total),
        total_amount: centsToDecimal(total),
        total_final: shipping !== null,
      },
    };
  }

  private async checkoutLink(request: ConnectorRequest): Promise<ConnectorResult> {
    const platform = request.query.get("platform");
    if (platform !== "android" && platform !== "ios") return error(400, "invalid_request", "Unknown platform.");
    const lines = cartLines(request.body);
    if (!lines) return error(400, "invalid_request", "The cart is empty or invalid.");
    if (this.deps.cardPayments === false) return error(403, "feature_disabled", "Ordering isn't available in this app.");
    if (this.fulfilment && !request.user) return error(401, "unauthorized", "Please sign in to order.");
    // 16 A demo shop takes orders without a payment account: its payment page charges nothing. 96.2 Bank transfer or the shop's own method will do too.
    if (!paymentsSetUp(this.deps.app)) {
      return error(503, "shop_unavailable", "This shop can't take orders yet. Please try again later.");
    }
    const priced = await this.priced(lines);
    if (priced.out.some((o) => !o.line.available || o.line.problem)) {
      return error(409, "cart_changed", "Something in your cart changed. Please check it and try again.");
    }
    if (platform === "ios" && priced.out.some((o) => o.line.digital)) {
      return error(403, "purchase_not_allowed", "Digital products can't be bought in the iPhone app.");
    }
    const orderLines: CatalogOrderLine[] = priced.out.map(({ line, product, variant, unit, chosen }) => ({
      productId: product!.id,
      // 91.5 The variation bought, in its name too ("Tee - Red, L").
      name: variant ? `${product!.name} - ${variantLabel(variant)}` : product!.name,
      ...(variant ? { variantId: variant.id, variant: variantLabel(variant) } : {}),
      quantity: line.quantity,
      unitCents: unit,
      imageAssetId: product!.imageAssetIds[0] ?? null,
      digital: product!.digital,
      ...(chosen.length > 0 ? { options: chosen.map((o) => ({ group: o.group, name: o.name, priceDeltaCents: o.priceDeltaCents })) } : {}),
    }));
    // 26 A restaurant's order: pickup or delivery at a time its kitchen takes it; the delivery fee is its shipping.
    let fulfilment: CatalogOrder["fulfilment"] = null;
    let shipping: number;
    if (this.fulfilment) {
      const checked = checkFulfilment(this.fulfilment, request.body, priced.subtotal, this.settings.currency, request.now);
      if (!checked.ok) return error(checked.status, checked.code, checked.message);
      fulfilment = checked.fulfilment;
      shipping = checked.feeCents;
    } else {
      shipping = shippingFor(this.settings, priced.subtotal, orderLines.some((l) => !l.digital));
    }
    // 91.1 A coupon that no longer applies is left out, never an error.
    const coupon = await this.coupon(request.body, priced.subtotal, request.now);
    // 91.4 The points the customer has now, up to what the products cost after the coupon.
    const points = await this.cartPoints(request, priced.subtotal - coupon.discountCents, priced.out.length);
    // 91.5 The tax as the cart showed it.
    const before = priced.subtotal - coupon.discountCents - points.discountCents + shipping;
    const tax = this.tax(before);
    const token = randomToken(24);
    await this.deps.store.createCatalogOrder({
      // 96.4 The customer's language, for their receipt.
      lang: request.lang ?? null,
      appId: this.deps.app.id,
      tokenHash: sha256Hex(token),
      userId: request.user?.id ?? null,
      status: "pending",
      lines: orderLines,
      subtotalCents: priced.subtotal,
      shippingCents: shipping,
      totalCents: before + (tax && !tax.included ? tax.cents : 0),
      couponCode: coupon.code,
      discountCents: coupon.discountCents,
      points: points.used > 0 ? { used: points.used, discountCents: points.discountCents, earned: 0 } : null,
      tax: tax && tax.cents > 0 ? { label: tax.label, rateBps: tax.rateBps, included: tax.included, cents: tax.cents } : null,
      currency: this.settings.currency,
      customer: null,
      paymentId: null,
      createdAt: request.now,
      paidAt: null,
      updatedAt: request.now,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
      fulfilment,
      fulfilmentStatus: fulfilment ? "received" : null,
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

  /** 71 The order's receipt (null when the server has no SIGNING_SECRET to sign it with). */
  private receiptUrl(order: CatalogOrder): string | null {
    try {
      return orderReceiptUrl(this.deps.platformUrl, this.deps.app.id, order.id, signingSecret());
    } catch {
      return null;
    }
  }

  private orderJson(order: CatalogOrder, now: Date) {
    return {
      id: order.id,
      number: orderNumber(order),
      status: order.status,
      // 80.4 A shipped order in progress reads "Shipped".
      status_label: order.shipment && order.status === "processing" ? "Shipped" : ORDER_STATUS_LABELS[order.status],
      total: formatCents(order.totalCents, order.currency),
      // 80.4 How it was shipped (any carrier); null until it is.
      shipment: shipmentJson(order.shipment),
      // 91.3 The return the customer asked for, and whether they may ask now.
      return_request: returnJson(order.returnRequest),
      can_return: canReturn(order, this.settings, now),
      // 91.4 The points used on it and earned by it.
      points: orderPointsJson(order.points, order.currency),
      // 47 What the shop refunded of it; all of it: the status is "refunded".
      refunded_total: order.refundedCents ? formatCents(order.refundedCents, order.currency) : null,
      // 71 The receipt as a PDF, from a signed link.
      receipt_url: order.paidAt ? this.receiptUrl(order) : null,
      // 96.2 Waiting for a bank transfer or the shop's own method: how to pay it.
      pay_outside: awaitingManualPayment(order)
        ? { method: order.manualPayment!.method, name: order.manualPayment!.name, instructions: order.manualPayment!.instructions, due_at: order.manualPayment!.dueAt }
        : null,
      created_at: (order.paidAt ?? order.createdAt).toISOString(),
      items: order.lines.map((l) => ({
        name: l.name,
        course_id: null,
        product_id: l.productId,
        quantity: l.quantity,
        image_url: l.imageAssetId ? this.deps.assetUrl(l.imageAssetId) : null,
        ...(l.options?.length ? { options: l.options.map((o) => o.name) } : {}),
        // 110 What the line comes to.
        total: formatCents(l.unitCents * l.quantity, order.currency),
      })),
      // 26 A restaurant's order: how it's collected and where it is.
      ...(order.fulfilment
        ? {
            status_label: order.fulfilmentStatus && order.status !== "refunded" && order.status !== "pending" ? FULFILMENT_LABELS[order.fulfilmentStatus] : ORDER_STATUS_LABELS[order.status],
            fulfilment: {
              type: order.fulfilment.type,
              scheduled_for: order.fulfilment.scheduledFor,
              delivery_address: order.fulfilment.address,
              delivery_fee: order.shippingCents > 0 ? formatCents(order.shippingCents, order.currency) : null,
            },
            // 96.2 Followed once paid: an order waiting for a bank transfer or the shop's own method isn't in the kitchen yet.
            fulfilment_status: order.status === "pending" ? null : (order.fulfilmentStatus ?? null),
          }
        : {}),
    };
  }

  /** 26 One of the customer's own paid orders, for following it. */
  private async order(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return error(401, "invalid_token", "Your session has ended. Please sign in again.");
    const order = Number.isSafeInteger(id) && id > 0 ? await this.deps.store.getCatalogOrder(this.deps.app.id, id) : null;
    // 96.2 And one waiting for a bank transfer or the shop's own method.
    if (!order || order.userId !== request.user.id || !(LISTED_STATUSES.includes(order.status) || awaitingManualPayment(order))) return error(404, "not_found", "Order not found.");
    return { status: 200, body: this.orderJson(order, request.now) };
  }

  /** 91.4 GET /me/points: the customer's balance and its latest changes. */
  private async points(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return error(401, "invalid_token", "Your session has ended. Please sign in again.");
    if (!this.loyalty) return error(403, "feature_disabled", "This shop has no loyalty points.");
    const [balance, entries] = await Promise.all([
      this.deps.store.getLoyaltyBalance(this.deps.app.id, request.user.id),
      this.deps.store.listLoyaltyEntries(this.deps.app.id, request.user.id, LOYALTY_HISTORY),
    ]);
    const numbers = new Map<number, string>();
    for (const id of new Set(entries.flatMap((e) => (e.orderId !== null ? [e.orderId] : [])))) {
      const order = await this.deps.store.getCatalogOrder(this.deps.app.id, id);
      if (order) numbers.set(id, orderNumber(order));
    }
    return { status: 200, body: pointsAccountJson(this.loyalty, balance, entries, numbers, this.settings.currency) };
  }

  /** 91.3 The customer asks to return one of their orders. */
  private async requestReturn(request: ConnectorRequest, id: number): Promise<ConnectorResult> {
    if (!request.user) return error(401, "invalid_token", "Your session has ended. Please sign in again.");
    const order = Number.isSafeInteger(id) && id > 0 ? await this.deps.store.getCatalogOrder(this.deps.app.id, id) : null;
    if (!order || order.userId !== request.user.id || !LISTED_STATUSES.includes(order.status)) return error(404, "not_found", "Order not found.");
    if (order.returnRequest) return error(409, "conflict", "You already asked to return this order.");
    if (returnDays(this.settings) === null) return error(403, "feature_disabled", "This shop doesn't take returns in the app. Contact the shop.");
    const input = parseReturnInput(request.body);
    if (!input.ok) return error(400, "invalid_request", input.message);
    const saved = await requestReturn(this.deps.store, this.deps.app, order, this.settings, input, request.now);
    if (!saved) return error(403, "forbidden", "This order can't be returned from the app. Contact the shop.");
    await this.deps.onReturnRequested?.(saved);
    return { status: 200, body: this.orderJson(saved, request.now) };
  }

  private async orders(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return error(401, "invalid_token", "Your session has ended. Please sign in again.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const { items, total } = await this.deps.store.listCatalogOrders({
      appId: this.deps.app.id,
      userId: request.user.id,
      statuses: LISTED_STATUSES,
      // 96.2 With those waiting for a bank transfer or the shop's own method.
      awaitingManual: true,
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
        items: items.map((o) => this.orderJson(o, request.now)),
      },
    };
  }
}
