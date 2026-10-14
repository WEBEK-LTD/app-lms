import type { HostedUser } from "../../data/types";
import { cartLines, error, intParam, type CartLineInput } from "./common";
import { registerPlatform, type PlatformConnector, type PlatformDefinition } from "./platforms";
import { ConnectorError, type ConnectorRequest, type ConnectorResult } from "./types";

/**
 * Ticimax for Store apps, through the shop's own SOAP 1.1 web services
 * (`https://<shop>/Servis/<Service>.svc`, WCF basicHttpBinding). The key is
 * the shop's "WS Yetki Kodu", sent in the body of every call as `UyeKodu`.
 *
 * - Catalog: categories (SelectKategori), product cards with their variants
 *   (SelectUrun, offset paging). Ticimax has no text search, so a search
 *   scans the first SEARCH_LIMIT active products in memory. Catalog answers
 *   are cached for five minutes (Ticimax publishes no rate limits, and every
 *   call hits the merchant's live shop).
 * - IDs are Ticimax's own integers: product = UrunKarti.ID, variation =
 *   Varyasyon.ID, category = Kategori.ID, order = WebSiparis.ID.
 * - Prices are per variant; the app shows them with VAT (KdvDahil/KdvOrani).
 * - Checkout: Ticimax has no documented way to fill a browser's cart. A
 *   customer who is a member of the shop (same phone number) gets the lines
 *   in their member cart and the shop's cart page, where they sign in and pay;
 *   otherwise a cart with one product opens that product's page, and larger
 *   carts are refused with a message.
 * - Orders: those of the shop member with exactly the customer's phone number.
 */

type Fetch = typeof fetch;

const CACHE_MS = 5 * 60_000;
const CACHE_MAX = 500;
/** Products a search scans (Ticimax can't search by name). */
const SEARCH_LIMIT = 500;
const SCAN_PAGE = 100;
const LINK_MINUTES = 30;
const MEMBER_CHECK_LIMIT = 10;
// Unverified: the storefront cart page; Ticimax doesn't document its address.
const CART_PATH = "/sepetim";

// XML: a small builder and parser for the SOAP messages this connector uses.

const NS = {
  soap: "http://schemas.xmlsoap.org/soap/envelope/",
  tem: "http://tempuri.org/",
  d: "http://schemas.datacontract.org/2004/07/",
  arr: "http://schemas.microsoft.com/2003/10/Serialization/Arrays",
};

/** A value in a request: text, a nested data contract, or a list of integers. Null and undefined are left out. */
export type XmlValue = string | number | boolean | null | undefined | XmlFields | { ints: number[] };
/**
 * Fields in the order they're sent. WCF reads data contract members in
 * schema order (alphabetical, ordinal) and drops misplaced ones, so nested
 * fields must be listed alphabetically; operation parameters keep the
 * operation's own order.
 */
export type XmlFields = (readonly [string, XmlValue])[];

const escapeXml = (s: string) =>
  s
    // Characters XML 1.0 can't carry.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function xmlFields(fields: XmlFields, prefix: "tem" | "d"): string {
  return fields
    .map(([name, value]) => {
      if (value === null || value === undefined) return "";
      const tag = `${prefix}:${name}`;
      if (Array.isArray(value)) return `<${tag}>${xmlFields(value, "d")}</${tag}>`;
      if (typeof value === "object") return `<${tag}>${value.ints.map((n) => `<arr:int>${Math.trunc(n)}</arr:int>`).join("")}</${tag}>`;
      return `<${tag}>${escapeXml(String(value))}</${tag}>`;
    })
    .join("");
}

export function soapEnvelope(operation: string, params: XmlFields): string {
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:soap="${NS.soap}" xmlns:tem="${NS.tem}" xmlns:d="${NS.d}" xmlns:arr="${NS.arr}">` +
    `<soap:Body><tem:${operation}>${xmlFields(params, "tem")}</tem:${operation}></soap:Body></soap:Envelope>`
  );
}

/** An element with its namespace prefix dropped. */
export interface XmlElement {
  name: string;
  attrs: Record<string, string>;
  children: XmlElement[];
  text: string;
  /** `xsi:nil="true"`. */
  nil: boolean;
}

const ENTITIES: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

function decodeXml(s: string): string {
  return s.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, entity: string) => {
    if (entity.startsWith("#")) {
      const code = entity[1] === "x" || entity[1] === "X" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[entity] ?? whole;
  });
}

const localName = (qualified: string) => qualified.slice(qualified.indexOf(":") + 1);

/**
 * Parses an XML document into elements (namespace prefixes dropped, entities
 * decoded, CDATA kept, comments and declarations skipped). Enough for SOAP
 * answers; throws ConnectorError on mismatched tags.
 */
export function parseXml(xml: string): XmlElement {
  const root: XmlElement = { name: "#document", attrs: {}, children: [], text: "", nil: false };
  const stack: XmlElement[] = [root];
  const token =
    /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<\/\s*([^\s>]+)\s*>|<([^\s/>!?]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = token.exec(xml))) {
    const top = stack[stack.length - 1]!;
    if (m[1] !== undefined) {
      top.text += m[1];
    } else if (m[2] !== undefined) {
      if (stack.length < 2 || localName(m[2]) !== top.name) throw new ConnectorError("Ticimax sent an answer that can't be read.");
      stack.pop();
    } else if (m[3] !== undefined) {
      const attrs: Record<string, string> = {};
      for (const a of (m[4] ?? "").matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[localName(a[1]!)] = decodeXml(a[2] ?? a[3] ?? "");
      const element: XmlElement = { name: localName(m[3]), attrs, children: [], text: "", nil: attrs.nil === "true" };
      top.children.push(element);
      if (!m[5]) stack.push(element);
    } else if (m[6] !== undefined) {
      top.text += decodeXml(m[6]);
    }
  }
  if (stack.length !== 1) throw new ConnectorError("Ticimax sent an answer that can't be read.");
  return root;
}

const kid = (el: XmlElement | null | undefined, name: string) => el?.children.find((c) => c.name === name) ?? null;
/** The entries of an array field (any element name). */
const entries = (el: XmlElement | null | undefined, name: string) => {
  const list = kid(el, name);
  return list && !list.nil ? list.children : [];
};

function str(el: XmlElement | null | undefined, name: string): string | null {
  const c = kid(el, name);
  return !c || c.nil ? null : c.text.trim();
}

function num(el: XmlElement | null | undefined, name: string): number | null {
  const s = str(el, name);
  if (s === null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function bool(el: XmlElement | null | undefined, name: string): boolean | null {
  const s = str(el, name)?.toLowerCase();
  return s === "true" || s === "1" ? true : s === "false" || s === "0" ? false : null;
}

const strings = (el: XmlElement | null | undefined, name: string) =>
  entries(el, name)
    .filter((c) => !c.nil)
    .map((c) => c.text.trim())
    .filter(Boolean);

const ints = (els: XmlElement[]) =>
  els.map((c) => Number(c.text.trim())).filter((n) => Number.isSafeInteger(n) && n > 0);

// Client

export type TicimaxService = "UrunServis" | "SiparisServis" | "UyeServis";

export class TicimaxClient {
  constructor(
    private readonly host: string,
    private readonly key: string,
    private readonly fetcher: Fetch = fetch,
  ) {}

  /** Calls an operation (the key goes first, as `UyeKodu`); returns its `<Operation>Result`, or null when it's empty. */
  async call(service: TicimaxService, operation: string, params: XmlFields): Promise<XmlElement | null> {
    let response: Response;
    try {
      response = await this.fetcher(`https://${this.host}/Servis/${service}.svc`, {
        method: "POST",
        headers: {
          "content-type": "text/xml; charset=utf-8",
          soapaction: `"http://tempuri.org/I${service}/${operation}"`,
        },
        body: soapEnvelope(operation, [["UyeKodu", this.key], ...params]),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ConnectorError("Ticimax didn't answer.");
    }
    const text = await response.text().catch(() => "");
    let body: XmlElement | null = null;
    try {
      body = kid(kid(parseXml(text), "Envelope"), "Body");
    } catch {
      body = null;
    }
    // A wrong key comes back as a fault ("Hatalı Kullanıcı Kodu") or as an empty result.
    const fault = kid(body, "Fault");
    if (fault) throw new ConnectorError(`Ticimax answered with an error: ${str(fault, "faultstring") || "unknown error"}.`);
    if (!response.ok) throw new ConnectorError(`Ticimax answered HTTP ${response.status}.`);
    const answer = kid(body, `${operation}Response`);
    if (!answer) throw new ConnectorError("Ticimax sent no answer.");
    const result = kid(answer, `${operation}Result`);
    return result && !result.nil ? result : null;
  }
}

// Text, money and addresses

/** Lower case without accents, Turkish-aware ("Çiçek" and "cicek" match). */
function fold(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i");
}

function slugify(name: string): string {
  return fold(name).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "option";
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const decimal = (n: number) => n.toFixed(2);

/** An ISO currency code from Ticimax's ("TL" is the lira). */
export function currencyCode(raw: string | null): string {
  const code = (raw ?? "").trim().toUpperCase();
  // Unverified: ParaBirimiKodu values ("TL" or "TRY").
  if (code === "" || code === "TL" || code === "YTL" || code === "₺") return "TRY";
  return /^[A-Z]{3}$/.test(code) ? code : "TRY";
}

const formatters = new Map<string, Intl.NumberFormat>();

/** "₺1,234.50". */
export function formatMoney(amount: number, currency: string): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" });
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
    formatters.set(currency, formatter);
  }
  return formatter.format(amount);
}

/** "www.your-shop.com" from what a client typed ("https://www.your-shop.com/admin"), or null. */
export function normalizeShopAddress(value: string): string | null {
  let text = value.trim();
  if (!text) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `https://${text}`;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  // A public name with a dot and a letter TLD: no IP addresses or local names.
  if (!/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(host)) return null;
  if (/(^|\.)(localhost|local|internal|localdomain)$/.test(host)) return null;
  return host;
}

/** An absolute https address for an image or page path Ticimax gives (absolute or relative). */
function absoluteUrl(host: string, value: string | null): string | null {
  const v = value?.trim();
  if (!v) return null;
  try {
    // Unverified: whether Resimler and UrunSayfaAdresi are absolute or relative to the shop.
    const url = new URL(v.startsWith("//") ? `https:${v}` : v, `https://${host}/`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

/** Digits with the country code: Turkish numbers as members type them ("0532…", "532…") become "90532…". */
export function phoneKey(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = `90${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("5")) digits = `90${digits}`;
  return digits;
}

/** The forms a shop may have stored a phone number in. */
function phoneCandidates(e164: string): string[] {
  const digits = e164.replace(/\D/g, "");
  // Unverified: how Ticimax stores and matches members' phone numbers.
  if (digits.startsWith("90") && digits.length === 12) {
    const national = digits.slice(2);
    return [`0${national}`, national, `+${digits}`, digits];
  }
  return [`+${digits}`, digits];
}

/** Ticimax's times carry no offset and are Istanbul time (UTC+3 all year). */
function istanbulTime(value: string | null): string | null {
  const v = value?.trim();
  if (!v) return null;
  const trimmed = v.replace(" ", "T").replace(/(\.\d{3})\d+/, "$1");
  const date = new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(trimmed) ? trimmed : `${trimmed}+03:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// The catalog, as read from Ticimax

interface Variant {
  id: number;
  active: boolean;
  /** With VAT. */
  price: number;
  /** The discounted price with VAT, when lower. */
  salePrice: number | null;
  currency: string;
  stock: number;
  sku: string | null;
  images: string[];
  options: { name: string; value: string }[];
}

interface Product {
  id: number;
  name: string;
  listed: boolean;
  showcase: boolean;
  descriptionHtml: string;
  intro: string | null;
  categoryIds: number[];
  mainCategoryId: number | null;
  images: string[];
  pageUrl: string | null;
  maxPerOrder: number | null;
  variants: Variant[];
}

interface Category {
  id: number;
  name: string;
  parentId: number | null;
  sort: number;
}

function parseVariant(el: XmlElement, host: string): Variant | null {
  const id = num(el, "ID");
  if (!id || !Number.isSafeInteger(id)) return null;
  // Unverified: whether IndirimliFiyati follows KdvDahil like SatisFiyati, and whether 0 means "no discount".
  const vatIncluded = bool(el, "KdvDahil") ?? true;
  const vat = num(el, "KdvOrani") ?? 0;
  const gross = (n: number) => round2(vatIncluded ? n : n * (1 + vat / 100));
  const price = gross(num(el, "SatisFiyati") ?? 0);
  const discounted = num(el, "IndirimliFiyati") ?? 0;
  const salePrice = discounted > 0 && gross(discounted) < price ? gross(discounted) : null;
  return {
    id,
    active: bool(el, "Aktif") !== false,
    price,
    salePrice,
    currency: currencyCode(str(el, "ParaBirimiKodu") || str(el, "ParaBirimi")),
    stock: num(el, "StokAdedi") ?? 0,
    sku: str(el, "StokKodu") || null,
    images: strings(el, "Resimler")
      .map((u) => absoluteUrl(host, u))
      .filter((u): u is string => u !== null),
    options: entries(el, "Ozellikler")
      .map((o) => ({ name: str(o, "Tanim") ?? "", value: str(o, "Deger") ?? "" }))
      .filter((o) => o.name !== "" && o.value !== ""),
  };
}

function parseProduct(el: XmlElement, host: string): Product | null {
  const id = num(el, "ID");
  if (!id || !Number.isSafeInteger(id) || bool(el, "Aktif") === false) return null;
  const max = num(el, "UyeAlimMax");
  const main = num(el, "AnaKategoriID");
  return {
    id,
    name: str(el, "UrunAdi") ?? "",
    listed: bool(el, "ListedeGoster") !== false,
    showcase: bool(el, "Vitrin") === true,
    descriptionHtml: str(el, "Aciklama") ?? "",
    intro: str(el, "OnYazi") || null,
    categoryIds: ints(entries(el, "Kategoriler")),
    mainCategoryId: main && main > 0 ? main : null,
    images: strings(el, "Resimler")
      .map((u) => absoluteUrl(host, u))
      .filter((u): u is string => u !== null),
    pageUrl: str(el, "UrunSayfaAdresi") || null,
    maxPerOrder: max && max > 0 ? Math.floor(max) : null,
    variants: entries(el, "Varyasyonlar")
      .map((v) => parseVariant(v, host))
      .filter((v): v is Variant => v !== null),
  };
}

const activeVariants = (p: Product) => p.variants.filter((v) => v.active);
const isVariable = (p: Product) => {
  const vs = activeVariants(p);
  return vs.length > 1 || vs.some((v) => v.options.length > 0);
};
const nowPrice = (v: Variant) => v.salePrice ?? v.price;
const inStock = (v: Variant) => v.stock > 0;
const canBuy = (v: Variant) => v.active && inStock(v) && v.price > 0;

function maxQuantity(p: Product, v: Variant): number | null {
  if (!inStock(v)) return null;
  const stock = Math.max(1, Math.floor(v.stock));
  return p.maxPerOrder !== null ? Math.min(stock, p.maxPerOrder) : stock;
}

/** A variant's options; a variable product's variant without any gets one named after it. */
function optionsOf(p: Product, v: Variant): { name: string; value: string }[] {
  if (v.options.length > 0 || !isVariable(p)) return v.options;
  return [{ name: "Option", value: v.sku ?? `#${v.id}` }];
}

// Orders

type OrderStatus = "pending" | "processing" | "on_hold" | "completed" | "cancelled" | "refunded" | "failed";

/** Ticimax's order statuses (Durum, 0–17) as the contract's, with English labels. */
const ORDER_STATUSES: Record<number, [OrderStatus, string]> = {
  0: ["pending", "Pre-order"],
  1: ["pending", "Awaiting approval"],
  2: ["processing", "Approved"],
  3: ["pending", "Awaiting payment"],
  4: ["processing", "Packing"],
  5: ["processing", "Being sourced"],
  6: ["processing", "Shipped"],
  7: ["completed", "Delivered"],
  8: ["cancelled", "Cancelled"],
  9: ["refunded", "Returned"],
  10: ["cancelled", "Cancelled"],
  11: ["on_hold", "Return requested"],
  12: ["on_hold", "Return received"],
  13: ["refunded", "Refunded"],
  14: ["on_hold", "Cancellation requested"],
  15: ["on_hold", "Cancellation requested"],
  16: ["on_hold", "Partial return requested"],
  17: ["completed", "Partially returned"],
};

export function orderStatus(code: number | null): { status: OrderStatus; label: string } {
  const known = code !== null ? ORDER_STATUSES[code] : undefined;
  return known ? { status: known[0], label: known[1] } : { status: "processing", label: "Processing" };
}

// Requests

type OrderBy = "newest" | "popular" | "rating" | "price_asc" | "price_desc" | "title";
const ORDERS: OrderBy[] = ["newest", "popular", "rating", "price_asc", "price_desc", "title"];

interface ListOptions {
  search: string;
  category: number | null;
  featured: boolean;
  onSale: boolean;
  orderby: OrderBy;
  page: number;
  perPage: number;
}

/** Sorts a page in memory: Ticimax documents only sorting by ID. */
function sortProducts(products: Product[], orderby: OrderBy): Product[] {
  const minPrice = (p: Product) => {
    const vs = activeVariants(p);
    return vs.length ? Math.min(...vs.map(nowPrice)) : Number.POSITIVE_INFINITY;
  };
  switch (orderby) {
    case "price_asc":
      return [...products].sort((a, b) => minPrice(a) - minPrice(b));
    case "price_desc":
      return [...products].sort((a, b) => minPrice(b) - minPrice(a));
    case "title":
      return [...products].sort((a, b) => a.name.localeCompare(b.name, "tr"));
    default:
      return products;
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const cache = new Map<string, { at: number; value: unknown }>();

export interface TicimaxSettings {
  /** "www.your-shop.com". */
  host: string;
  /** The WS Yetki Kodu. */
  key: string;
}

export class TicimaxConnector implements PlatformConnector {
  private readonly client: TicimaxClient;

  constructor(
    private readonly settings: TicimaxSettings,
    fetcher: Fetch = fetch,
  ) {
    this.client = new TicimaxClient(settings.host, settings.key, fetcher);
  }

  private async cached<T>(name: string, load: () => Promise<T>, fresh = false): Promise<T> {
    const key = `${this.settings.host}:${name}`;
    const hit = cache.get(key);
    if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.value as T;
    const value = await load();
    this.remember(name, value);
    return value;
  }

  private remember(name: string, value: unknown): void {
    const key = `${this.settings.host}:${name}`;
    cache.delete(key);
    cache.set(key, { at: Date.now(), value });
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
  }

  private money(amount: number, currency: string): string {
    return formatMoney(amount, currency);
  }

  /** Checks the address and key; returns the shop's address (Ticimax doesn't give the shop's name). */
  async check(): Promise<string> {
    // A wrong key may answer with no categories instead of a fault: a shop always has some.
    const categories = await this.loadCategories();
    if (categories.length === 0) throw new ConnectorError("Ticimax sent no categories for this key.");
    return this.settings.host.replace(/^www\./, "");
  }

  async config() {
    return {
      store: {
        // Unverified: Ticimax shops sell in lira; prices carry each variant's own currency.
        currency: "TRY",
        guest_checkout: true,
        checkout_opens_in: "browser",
        reviews: false,
        delivery_date: { enabled: false, required: false, min_days: 0, max_days: 0, closed_weekdays: [] },
        gift_message: { enabled: false, max_length: 200 },
      },
      features: { orders: true },
    };
  }

  async handle(request: ConnectorRequest): Promise<ConnectorResult | null> {
    const route = `${request.method} /${request.path.join("/")}`;
    try {
      switch (route) {
        case "GET /store/home":
          return { status: 200, body: { sections: await this.home() } };
        case "GET /store/categories":
          return { status: 200, body: { items: await this.categories() } };
        case "GET /store/products":
          return await this.products(request.query);
        case "POST /store/cart":
          return await this.quote(request);
        case "POST /store/checkout-link":
          return await this.checkoutLink(request);
        case "GET /me/orders":
          return await this.orders(request);
      }
      if (request.method === "GET" && request.path[0] === "store" && request.path[1] === "products" && request.path[2]) {
        const id = Number(request.path[2]);
        if (!Number.isSafeInteger(id) || id < 1) return error(404, "not_found", "Product not found.");
        if (request.path.length === 3) return await this.product(id);
        if (request.path.length === 4 && request.path[3] === "reviews") {
          return error(403, "feature_disabled", "Reviews aren't available in this shop.");
        }
      }
    } catch (e) {
      if (e instanceof ConnectorError) {
        return error(503, "shop_unavailable", "The shop can't be reached right now. Please try again in a moment.");
      }
      throw e;
    }
    return null;
  }

  // Ticimax calls

  private async loadCategories(): Promise<Category[]> {
    // Unverified: SelectKategori without parentID and sayfalama returns every category (kategoriID 0 = all).
    const result = await this.client.call("UrunServis", "SelectKategori", [
      ["kategoriID", 0],
      ["dil", ""],
    ]);
    return (result?.children ?? [])
      .filter((c) => bool(c, "Aktif") !== false)
      .map((c) => ({
        id: num(c, "ID") ?? 0,
        name: str(c, "Tanim") ?? "",
        parentId: num(c, "PID") || null,
        sort: num(c, "Sira") ?? 0,
      }))
      .filter((c) => Number.isSafeInteger(c.id) && c.id > 0 && c.name !== "");
  }

  private categoryTree(): Promise<Category[]> {
    return this.cached("categories", () => this.loadCategories());
  }

  /** A category and every category under it. */
  private async withSubcategories(id: number): Promise<Set<number>> {
    const all = await this.categoryTree();
    const out = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of all) {
        if (c.parentId !== null && out.has(c.parentId) && !out.has(c.id)) {
          out.add(c.id);
          grew = true;
        }
      }
    }
    return out;
  }

  /** SelectUrun: active product cards with their variants. */
  private async selectProducts(
    filter: { category?: number | null; featured?: boolean; onSale?: boolean; productId?: number; productIds?: number[] },
    start: number,
    count: number,
    fresh = false,
  ): Promise<Product[]> {
    const params: XmlFields = [
      [
        "f",
        [
          ["Aktif", 1],
          ["Firsat", -1],
          ["Indirimli", filter.onSale ? 1 : -1],
          // Unverified: KasaOnuFirsatlari's meaning; -1 so it doesn't filter.
          ["KasaOnuFirsatlari", -1],
          // ID filters use 0 for "no filter" (Ticimax's documentation); the yes/no filters use -1.
          // Unverified: whether KategoriID includes subcategories.
          ["KategoriID", filter.category ?? 0],
          ["MarkaID", 0],
          ["TedarikciID", 0],
          ["UrunKartiID", filter.productId ?? 0],
          ["UrunKartiIDList", filter.productIds ? { ints: filter.productIds } : null],
          ["Vitrin", filter.featured ? 1 : -1],
        ],
      ],
      [
        "s",
        [
          ["BaslangicIndex", start],
          ["KayitSayisi", count],
          ["SiralamaDegeri", "ID"],
          ["SiralamaYonu", "DESC"],
        ],
      ],
    ];
    const key = `products:${JSON.stringify([filter, start, count])}`;
    return this.cached(
      key,
      async () => {
        const result = await this.client.call("UrunServis", "SelectUrun", params);
        return (result?.children ?? []).map((c) => parseProduct(c, this.settings.host)).filter((p): p is Product => p !== null);
      },
      fresh,
    );
  }

  /** Products by ID, in no particular order; missing ones are left out. */
  private async productsByIds(ids: number[], fresh = false): Promise<Map<number, Product>> {
    const found = new Map<number, Product>();
    let missing = [...new Set(ids)];
    if (!fresh) {
      for (const id of missing) {
        const hit = cache.get(`${this.settings.host}:product:${id}`);
        if (hit && Date.now() - hit.at < CACHE_MS && hit.value) found.set(id, hit.value as Product);
      }
      missing = missing.filter((id) => !found.has(id));
    }
    if (missing.length === 0) return found;
    const keep = (p: Product) => {
      found.set(p.id, p);
      this.remember(`product:${p.id}`, p);
    };
    // Unverified: UrunKartiIDList (newer WSDL only). If the shop ignores it, the products asked for are fetched one by one.
    if (missing.length > 1) {
      const list = await this.selectProducts({ productIds: missing }, 0, missing.length, true);
      for (const p of list) if (missing.includes(p.id)) keep(p);
      missing = missing.filter((id) => !found.has(id));
    }
    await mapLimit(missing, 5, async (id) => {
      const list = await this.selectProducts({ productId: id }, 0, 1, true);
      const p = list.find((x) => x.id === id);
      if (p) keep(p);
    });
    return found;
  }

  private async product(id: number): Promise<ConnectorResult> {
    const p = (await this.productsByIds([id])).get(id);
    if (!p) return error(404, "not_found", "Product not found.");
    const [tree, related] = await Promise.all([this.categoryTree(), this.related(p)]);
    return { status: 200, body: this.detail(p, tree, related) };
  }

  private async related(p: Product): Promise<Product[]> {
    const category = p.mainCategoryId ?? p.categoryIds[0] ?? null;
    if (category === null) return [];
    try {
      const list = await this.selectProducts({ category }, 0, 9);
      return list.filter((x) => x.id !== p.id && x.listed).slice(0, 8);
    } catch (e) {
      if (e instanceof ConnectorError) return [];
      throw e;
    }
  }

  // Mapping

  private price(variants: Variant[]) {
    const vs = variants.some((v) => v.price > 0) ? variants.filter((v) => v.price > 0) : variants;
    if (vs.length === 0) {
      return { amount: "0.00", regular_amount: null, regular_formatted: null, currency: "TRY", formatted: this.money(0, "TRY"), on_sale: false, range: false };
    }
    const min = vs.reduce((a, b) => (nowPrice(b) < nowPrice(a) ? b : a));
    const max = vs.reduce((a, b) => (nowPrice(b) > nowPrice(a) ? b : a));
    const isRange = nowPrice(min) !== nowPrice(max);
    const onSale = min.salePrice !== null;
    return {
      amount: decimal(nowPrice(min)),
      regular_amount: onSale ? decimal(min.price) : null,
      regular_formatted: onSale && !isRange ? this.money(min.price, min.currency) : null,
      currency: min.currency,
      formatted: isRange
        ? `${this.money(nowPrice(min), min.currency)} – ${this.money(nowPrice(max), max.currency)}`
        : this.money(nowPrice(min), min.currency),
      on_sale: onSale,
      range: isRange,
    };
  }

  private summary(p: Product) {
    const vs = activeVariants(p);
    return {
      id: p.id,
      name: p.name,
      type: isVariable(p) ? "variable" : "simple",
      image_url: p.images[0] ?? vs.flatMap((v) => v.images)[0] ?? null,
      price: this.price(vs),
      rating: null,
      rating_count: 0,
      stock_status: vs.some(inStock) ? "in_stock" : "out_of_stock",
      purchasable: vs.some(canBuy),
      // Unverified: Ticimax marks no product as digital in the fields read here.
      digital: false,
    };
  }

  /** Category count: Ticimax has no cheap per-category count, so 0 (the Store app doesn't show it). */
  private category(c: Category, known: Set<number>) {
    return { id: c.id, name: c.name, count: 0, parent_id: c.parentId !== null && known.has(c.parentId) ? c.parentId : null, image_url: null };
  }

  private productUrl(p: Product): string | null {
    return absoluteUrl(this.settings.host, p.pageUrl);
  }

  private detail(p: Product, tree: Category[], related: Product[]) {
    const vs = activeVariants(p);
    const variable = isVariable(p);
    const single = !variable && vs.length === 1 ? vs[0]! : null;
    const slugs = new Map<string, string>();
    const attributes: { slug: string; name: string; variation: boolean; options: { value: string; label: string }[] }[] = [];
    if (variable) {
      for (const v of vs) {
        for (const o of optionsOf(p, v)) {
          let attribute = attributes.find((a) => a.name === o.name);
          if (!attribute) {
            let slug = slugify(o.name);
            while (attributes.some((a) => a.slug === slug)) slug = `${slug}_`;
            slugs.set(o.name, slug);
            attribute = { slug, name: o.name, variation: true, options: [] };
            attributes.push(attribute);
          }
          if (!attribute.options.some((x) => x.value === o.value)) attribute.options.push({ value: o.value, label: o.value });
        }
      }
    }
    const known = new Set(tree.map((c) => c.id));
    const categoryIds = [...new Set([...(p.mainCategoryId ? [p.mainCategoryId] : []), ...p.categoryIds])];
    return {
      ...this.summary(p),
      description_html: p.descriptionHtml,
      short_description_html: p.intro,
      images: [...new Set([...p.images, ...vs.flatMap((v) => v.images)])].map((url) => ({ url, alt: null })),
      sku: single?.sku ?? null,
      max_quantity: single ? maxQuantity(p, single) : null,
      attributes,
      variations: variable
        ? vs.map((v) => ({
            id: v.id,
            attributes: Object.fromEntries(optionsOf(p, v).map((o) => [slugs.get(o.name) ?? slugify(o.name), o.value])),
            price: this.price([v]),
            image_url: v.images[0] ?? null,
            stock_status: inStock(v) ? "in_stock" : "out_of_stock",
            max_quantity: maxQuantity(p, v),
            purchasable: canBuy(v),
          }))
        : [],
      categories: categoryIds
        .map((id) => tree.find((c) => c.id === id))
        .filter((c): c is Category => c !== undefined)
        .map((c) => this.category(c, known)),
      related: related.map((r) => this.summary(r)),
      external_url: null,
      permalink: this.productUrl(p) ?? `https://${this.settings.host}/`,
    };
  }

  // Catalog

  private async categories() {
    const tree = await this.categoryTree();
    const known = new Set(tree.map((c) => c.id));
    return [...tree].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "tr")).map((c) => this.category(c, known));
  }

  /** The first SEARCH_LIMIT active products, for searching in memory. */
  private searchIndex(): Promise<Product[]> {
    return this.cached("index", async () => {
      const out: Product[] = [];
      for (let start = 0; start < SEARCH_LIMIT; start += SCAN_PAGE) {
        const chunk = await this.selectProducts({}, start, SCAN_PAGE);
        out.push(...chunk);
        if (chunk.length < SCAN_PAGE) break;
      }
      return out;
    });
  }

  private async list(o: ListOptions): Promise<{ items: Product[]; hasNext: boolean }> {
    const start = (o.page - 1) * o.perPage;
    if (o.search) {
      // Ticimax can't search by name: filter the first products in memory.
      const words = fold(o.search).split(/\s+/).filter(Boolean);
      const inCategory = o.category !== null ? await this.withSubcategories(o.category) : null;
      const matches = (await this.searchIndex()).filter((p) => {
        if (!p.listed) return false;
        if (inCategory && !(p.mainCategoryId !== null && inCategory.has(p.mainCategoryId)) && !p.categoryIds.some((id) => inCategory.has(id))) {
          return false;
        }
        if (o.featured && !p.showcase) return false;
        if (o.onSale && !activeVariants(p).some((v) => v.salePrice !== null)) return false;
        const text = fold([p.name, ...p.variants.map((v) => v.sku ?? "")].join(" "));
        return words.every((w) => text.includes(w));
      });
      const sorted = sortProducts(matches, o.orderby);
      return { items: sorted.slice(start, start + o.perPage), hasNext: sorted.length > start + o.perPage };
    }
    // One more than a page tells whether there's a next one.
    const list = await this.selectProducts({ category: o.category, featured: o.featured, onSale: o.onSale }, start, o.perPage + 1);
    const page = list.slice(0, o.perPage).filter((p) => p.listed);
    return { items: sortProducts(page, o.orderby), hasNext: list.length > o.perPage };
  }

  private async products(query: URLSearchParams): Promise<ConnectorResult> {
    const page = intParam(query, "page", 1, 10_000);
    const perPage = intParam(query, "per_page", 20, 50);
    const ids = (query.get("ids") ?? "")
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isSafeInteger(v) && v > 0)
      .slice(0, 50);
    if (ids.length > 0) {
      const found = await this.productsByIds(ids);
      const items = ids.map((id) => found.get(id)).filter((p): p is Product => p !== undefined).map((p) => this.summary(p));
      return { status: 200, body: { page: 1, per_page: items.length || perPage, total: items.length, total_pages: 1, items } };
    }
    const orderParam = query.get("orderby") as OrderBy | null;
    const category = query.get("category") ? Number(query.get("category")) : null;
    if (category !== null && (!Number.isSafeInteger(category) || category < 1)) {
      return error(400, "invalid_request", "Unknown category.");
    }
    const result = await this.list({
      search: (query.get("search") ?? "").trim().slice(0, 100),
      category,
      featured: query.get("featured") === "true" || query.get("featured") === "1",
      onSale: query.get("on_sale") === "true" || query.get("on_sale") === "1",
      orderby: orderParam && ORDERS.includes(orderParam) ? orderParam : "newest",
      page,
      perPage,
    });
    const seen = (page - 1) * perPage + result.items.length;
    return {
      status: 200,
      body: {
        page,
        per_page: perPage,
        total: seen + (result.hasNext ? 1 : 0),
        total_pages: result.hasNext ? page + 1 : page,
        items: result.items.map((p) => this.summary(p)),
      },
    };
  }

  private async home() {
    const base: ListOptions = { search: "", category: null, featured: false, onSale: false, orderby: "newest", page: 1, perPage: 10 };
    const [categories, featured, sale, newest] = await Promise.all([
      this.categories(),
      this.list({ ...base, featured: true }),
      this.list({ ...base, onSale: true }),
      this.list(base),
    ]);
    const roots = categories.filter((c) => c.parent_id === null);
    const products = (type: string, items: Product[]) =>
      items.length > 0 ? [{ type, title: null, products: items.map((p) => this.summary(p)) }] : [];
    return [
      ...(roots.length > 0 ? [{ type: "categories", title: null, categories: roots.slice(0, 12) }] : []),
      ...products("featured_products", featured.items),
      ...products("sale_products", sale.items),
      ...products("new_products", newest.items),
    ];
  }

  // Cart and checkout

  /** Prices the lines with current data from the shop. */
  private async priced(lines: CartLineInput[]) {
    const products = await this.productsByIds(lines.map((l) => l.product_id), true);
    let currency: string | null = null;
    let subtotal = 0;
    let count = 0;
    const resolved: { productId: number; variantId: number; quantity: number }[] = [];
    const out = lines.map((line) => {
      const p = products.get(line.product_id);
      const vs = p ? activeVariants(p) : [];
      const variant =
        line.variation_id !== null
          ? vs.find((v) => v.id === line.variation_id)
          : p && !isVariable(p) && vs.length === 1
            ? vs[0]
            : undefined;
      const unavailable = (name: string, problem: string) => ({
        product_id: line.product_id,
        variation_id: line.variation_id,
        quantity: line.quantity,
        name,
        image_url: p?.images[0] ?? null,
        unit_price: this.money(0, currency ?? "TRY"),
        line_total: this.money(0, currency ?? "TRY"),
        available: false,
        problem,
        max_quantity: null,
        digital: false,
      });
      if (!p) return unavailable("Unavailable product", "This product is no longer available.");
      if (!variant) {
        return unavailable(p.name, line.variation_id === null && isVariable(p) ? "Please choose an option." : "This option is no longer available.");
      }
      currency ??= variant.currency;
      const max = maxQuantity(p, variant);
      const quantity = max !== null ? Math.min(line.quantity, max) : line.quantity;
      const available = canBuy(variant);
      const unit = nowPrice(variant);
      const total = round2(unit * quantity);
      if (available) {
        subtotal += total;
        count += quantity;
        resolved.push({ productId: p.id, variantId: variant.id, quantity });
      }
      const options = optionsOf(p, variant).map((o) => o.value);
      return {
        product_id: line.product_id,
        variation_id: line.variation_id,
        quantity,
        name: isVariable(p) && options.length > 0 ? `${p.name} - ${options.join(" / ")}` : p.name,
        image_url: variant.images[0] ?? p.images[0] ?? null,
        unit_price: this.money(unit, variant.currency),
        line_total: this.money(total, variant.currency),
        available,
        problem: !available
          ? variant.price > 0
            ? "Out of stock."
            : "This product can't be bought right now."
          : quantity < line.quantity
            ? p.maxPerOrder !== null && quantity === p.maxPerOrder && variant.stock > quantity
              ? `You can buy up to ${quantity} at once.`
              : `Only ${quantity} left in stock.`
            : null,
        max_quantity: max,
        digital: false,
      };
    });
    const cur = currency ?? "TRY";
    subtotal = round2(subtotal);
    return {
      products,
      resolved,
      cart: { lines: out, item_count: count, subtotal: this.money(subtotal, cur), subtotal_amount: decimal(subtotal), currency: cur },
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
    const priced = await this.priced(lines);
    if (priced.cart.lines.some((l) => !l.available || l.problem)) {
      return error(409, "cart_changed", "Something in your cart changed. Please check it and try again.");
    }
    if (platform === "ios" && priced.cart.lines.some((l) => l.digital)) {
      return error(403, "purchase_not_allowed", "Digital products can't be bought in the iPhone app.");
    }
    const link = (url: string): ConnectorResult => ({
      status: 200,
      body: { url, expires_at: new Date(request.now.getTime() + LINK_MINUTES * 60_000).toISOString(), open_in: "browser" },
    });

    // A member of the shop: their member cart gets the lines, and they finish on the shop after signing in there.
    if (request.user) {
      let member: number | null = null;
      try {
        member = (await this.members(request.user))[0] ?? null;
      } catch (e) {
        if (!(e instanceof ConnectorError)) throw e;
      }
      if (member !== null && (await this.fillMemberCart(member, priced.resolved))) {
        return link(`https://${this.settings.host}${CART_PATH}`);
      }
    }

    const productIds = [...new Set(priced.resolved.map((r) => r.productId))];
    const only = productIds.length === 1 ? priced.products.get(productIds[0]!) : undefined;
    const page = only ? this.productUrl(only) : null;
    if (page) return link(page);
    return error(
      409,
      "one_product_at_a_time",
      productIds.length > 1
        ? "This shop takes one product at a time from the app. Please keep one product in your cart, check out on the shop, then come back for the next."
        : "This product can't be opened on the shop's website right now. Please try again later.",
    );
  }

  /**
   * Puts the lines in the member's cart on the shop; false when the shop
   * didn't take them.
   */
  private async fillMemberCart(member: number, lines: { variantId: number; quantity: number }[]): Promise<boolean> {
    // Unverified: CreateSepet, UpdateSepet and GetSepet aren't in Ticimax's documentation (newer WSDL only).
    // Whether a cart filled this way shows up after the member signs in on the shop needs a live shop.
    if (lines.length === 0) return false;
    try {
      const first = lines[0]!;
      const created = await this.client.call("SiparisServis", "CreateSepet", [
        [
          "request",
          [
            ["Adet", first.quantity],
            ["KampanyaID", 0],
            ["UrunID", first.variantId],
            ["UyeID", member],
          ],
        ],
      ]);
      const cartId = num(created, "SepetID") ?? 0;
      const guid = str(created, "GuidSepetID") || null;
      for (const line of lines) {
        // AdetGuncelle sets the line's quantity, so a line CreateSepet already added isn't doubled.
        const updated = await this.client.call("SiparisServis", "UpdateSepet", [
          [
            "request",
            [
              ["Adet", line.quantity],
              ["AdetGuncelle", true],
              ["GuidSepetID", guid],
              ["KampanyaID", 0],
              ["SepetID", cartId],
              ["SepettenCikar", false],
              ["UrunID", line.variantId],
              ["UyeID", member],
            ],
          ],
        ]);
        if (bool(updated, "IsError") === true) return false;
      }
      // Check the shop really holds the lines.
      const cart = await this.client.call("SiparisServis", "GetSepet", [
        [
          "request",
          [
            ["KampanyaID", 0],
            ["SepetID", cartId],
            ["UyeID", member],
          ],
        ],
      ]);
      const inCart = new Set(entries(cart, "Urunler").map((u) => num(u, "UrunID")));
      return lines.every((l) => inCart.has(l.variantId));
    } catch (e) {
      if (e instanceof ConnectorError) return false;
      throw e;
    }
  }

  // Members and orders

  /**
   * The shop members with exactly the customer's phone number. Each ID the
   * phone lookup gives is checked against the member's saved numbers, so a
   * loose match never shows someone else's orders.
   */
  private members(user: HostedUser): Promise<number[]> {
    // 18 An account without a phone (email sign-in) matches no member.
    if (!user.phone) return Promise.resolve([]);
    const phone = user.phone;
    const wanted = phoneKey(phone);
    return this.cached(`members:${wanted}`, async () => {
      const found = await Promise.all(
        phoneCandidates(phone).map((tel) => this.client.call("UyeServis", "SelectUyeIdByMailOrTel", [["tel", tel]])),
      );
      const ids = [...new Set(found.flatMap((r) => ints(r?.children ?? [])))].slice(0, MEMBER_CHECK_LIMIT);
      const checked = await mapLimit(ids, 5, async (id) => {
        const result = await this.client.call("UyeServis", "SelectUyeler", [
          [
            "filtre",
            [
              ["Aktif", -1],
              ["AlisverisYapti", -1],
              ["Cinsiyet", -1],
              ["IlID", -1],
              ["IlceID", -1],
              ["MailIzin", -1],
              ["SmsIzin", -1],
              ["UyeID", id],
            ],
          ],
          [
            "sayfalama",
            [
              ["KayitSayisi", 1],
              ["SayfaNo", 1],
              ["SiralamaDegeri", "ID"],
              ["SiralamaYonu", "ASC"],
            ],
          ],
        ]);
        const member = (result?.children ?? []).find((m) => num(m, "ID") === id);
        if (!member || bool(member, "Aktif") === false) return null;
        const phones = [str(member, "CepTelefonu"), str(member, "Telefon")].filter((p): p is string => Boolean(p));
        return phones.some((p) => phoneKey(p) === wanted) ? id : null;
      });
      return checked.filter((id): id is number => id !== null).sort((a, b) => a - b);
    });
  }

  private async selectOrders(member: number, start: number, count: number): Promise<XmlElement[]> {
    const result = await this.client.call("SiparisServis", "SelectSiparis", [
      [
        "f",
        [
          // Ticimax's documentation: -1 in an integer filter means no filtering.
          ["EntegrasyonAktarildi", -1],
          // Unverified: the documentation's example sends these integration parameters; turned off here.
          [
            "EntegrasyonParams",
            [
              ["AlanDeger", ""],
              ["Deger", ""],
              ["EntegrasyonKodu", ""],
              ["EntegrasyonParamsAktif", false],
              ["TabloAlan", ""],
              ["Tanim", ""],
            ],
          ],
          ["KargoFirmaID", -1],
          ["OdemeDurumu", -1],
          ["OdemeTipi", -1],
          ["SiparisDurumu", -1],
          ["SiparisID", -1],
          ["TedarikciID", -1],
          // Unverified: UrunGetir includes the order lines (newer WSDL only); SelectSiparisUrun is the fallback.
          ["UrunGetir", true],
          ["UyeID", member],
        ],
      ],
      [
        "s",
        [
          ["BaslangicIndex", start],
          ["KayitSayisi", count],
          ["SiralamaDegeri", "id"],
          ["SiralamaYonu", "Desc"],
        ],
      ],
    ]);
    return (result?.children ?? []).filter((o) => (num(o, "ID") ?? 0) > 0);
  }

  private async orderLines(order: XmlElement): Promise<XmlElement[]> {
    const lines = entries(order, "Urunler");
    if (lines.length > 0) return lines;
    try {
      const result = await this.client.call("SiparisServis", "SelectSiparisUrun", [
        ["siparisId", num(order, "ID") ?? 0],
        ["iptalEdilmisUrunler", false],
      ]);
      return result?.children ?? [];
    } catch (e) {
      if (e instanceof ConnectorError) return [];
      throw e;
    }
  }

  private async orders(request: ConnectorRequest): Promise<ConnectorResult> {
    if (!request.user) return error(401, "invalid_token", "Your session has ended. Please sign in again.");
    const page = intParam(request.query, "page", 1, 10_000);
    const perPage = intParam(request.query, "per_page", 20, 50);
    const members = await this.members(request.user);
    if (members.length === 0) return { status: 200, body: { page, per_page: perPage, total: 0, total_pages: 1, items: [] } };
    const start = (page - 1) * perPage;
    let list: XmlElement[];
    if (members.length === 1) {
      list = await this.selectOrders(members[0]!, start, perPage + 1);
    } else {
      // Several members with this phone: merge their newest orders.
      const upTo = Math.min(start + perPage + 1, 500);
      const all = (await Promise.all(members.map((m) => this.selectOrders(m, 0, upTo)))).flat();
      const time = (o: XmlElement) => Date.parse(istanbulTime(str(o, "SiparisTarihi")) ?? "") || 0;
      list = all.sort((a, b) => time(b) - time(a) || (num(b, "ID") ?? 0) - (num(a, "ID") ?? 0)).slice(start, start + perPage + 1);
    }
    const hasNext = list.length > perPage;
    const items = await mapLimit(list.slice(0, perPage), 5, async (order) => {
      const code = num(order, "Durum") ?? (Number.parseInt(str(order, "SiparisDurumu") ?? "", 10) || null);
      const { status, label } = orderStatus(code);
      const id = num(order, "ID")!;
      const lines = await this.orderLines(order);
      return {
        id,
        number: str(order, "SiparisNo") || str(order, "SiparisKodu") || String(id),
        status,
        status_label: label,
        total: this.money(num(order, "SiparisToplamTutari") ?? 0, currencyCode(str(order, "ParaBirimi"))),
        created_at: istanbulTime(str(order, "SiparisTarihi")) ?? request.now.toISOString(),
        items: lines.map((line) => {
          const productId = num(line, "UrunKartiID");
          return {
            name: str(line, "UrunAdi") || "Product",
            course_id: null,
            product_id: productId && Number.isSafeInteger(productId) && productId > 0 ? productId : null,
            quantity: Math.max(1, Math.round(num(line, "Adet") ?? 1)),
            image_url: absoluteUrl(this.settings.host, str(line, "ResimYolu")),
          };
        }),
      };
    });
    const seen = start + items.length;
    return {
      status: 200,
      body: { page, per_page: perPage, total: seen + (hasNext ? 1 : 0), total_pages: hasNext ? page + 1 : page, items },
    };
  }
}

/** Clears the catalog and member cache (tests). */
export function clearTicimaxCache(): void {
  cache.clear();
}

export const TICIMAX_PLATFORM: PlatformDefinition = {
  id: "ticimax",
  name: "Ticimax",
  appType: "store",
  summary: "Products, prices and stock from your Ticimax shop; customers finish their order on your shop's website.",
  fields: [
    {
      name: "shopAddress",
      label: "Shop address",
      hint: "Your shop's web address, as customers type it.",
      secret: false,
      placeholder: "www.your-shop.com",
    },
    {
      name: "wsKey",
      label: "Web service key (WS Yetki Kodu)",
      hint:
        "In your Ticimax admin panel, open Ayarlar > WS Yetki Kodu Yönetimi and click Yeni Ekle. Give it a name, click Yetki Kodu Oluştur, " +
        "turn on reading products, categories, members and orders, plus the cart permissions, save, and paste the code here.",
      secret: true,
    },
  ],
  normalize(values) {
    const host = normalizeShopAddress(values.shopAddress ?? "");
    const key = (values.wsKey ?? "").trim();
    const errors: Record<string, string> = {};
    if (!host) errors.shopAddress = "Enter your shop's web address, like www.your-shop.com.";
    if (!key) errors.wsKey = "Enter your web service key.";
    else if (/\s/.test(key)) errors.wsKey = "Paste the key exactly as Ticimax shows it, without spaces.";
    if (!host || Object.keys(errors).length > 0) return { errors };
    return { values: { ...values, shopAddress: host, wsKey: key } };
  },
  create(values, deps) {
    return new TicimaxConnector({ host: values.shopAddress ?? "", key: values.wsKey ?? "" }, deps.fetcher);
  },
};

registerPlatform(TICIMAX_PLATFORM);
