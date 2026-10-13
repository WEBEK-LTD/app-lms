import { beforeEach, describe, expect, it } from "vitest";
import { platformDefinition } from "@/lib/hosted/connectors/platforms";
import {
  clearTicimaxCache,
  currencyCode,
  normalizeShopAddress,
  orderStatus,
  parseXml,
  phoneKey,
  TICIMAX_PLATFORM,
  TicimaxConnector,
  type XmlElement,
} from "@/lib/hosted/connectors/ticimax";
import type { ConnectorRequest } from "@/lib/hosted/connectors/types";
import type { HostedUser } from "@/lib/data/types";
import { expectContract } from "./contract";

// A Ticimax shop answering its SOAP web services the way WCF does: `s:` envelope,
// data contracts in `a:` (http://schemas.datacontract.org/2004/07/), string and int
// arrays in `b:`, empty values as `i:nil="true"`.

const HOST = "www.rose-shop.com";
const KEY = "U15saQ48dW453X1cA";

type Value = unknown;

function xml(name: string, value: Value): string {
  if (value === null || value === undefined) return `<a:${name} i:nil="true"/>`;
  if (Array.isArray(value)) return `<a:${name}>${value.map((v) => xml(itemName(name), v)).join("")}</a:${name}>`;
  if (typeof value === "object") {
    const arrays = `xmlns:b="http://schemas.microsoft.com/2003/10/Serialization/Arrays"`;
    if ("strings" in value) return `<a:${name} ${arrays}>${(value.strings as string[]).map((s) => `<b:string>${esc(s)}</b:string>`).join("")}</a:${name}>`;
    if ("ints" in value) return `<a:${name} ${arrays}>${(value.ints as number[]).map((n) => `<b:int>${n}</b:int>`).join("")}</a:${name}>`;
    return `<a:${name}>${Object.entries(value).map(([k, v]) => xml(k, v)).join("")}</a:${name}>`;
  }
  return `<a:${name}>${esc(String(value))}</a:${name}>`;
}
const ITEM_NAMES: Record<string, string> = { Varyasyonlar: "Varyasyon", Ozellikler: "VaryasyonOzellik", Urunler: "WebSiparisUrun" };
const itemName = (list: string) => ITEM_NAMES[list] ?? "Item";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function envelope(operation: string, inner: string | null): string {
  const result =
    inner === null
      ? `<${operation}Result i:nil="true" xmlns:i="http://www.w3.org/2001/XMLSchema-instance"/>`
      : `<${operation}Result xmlns:a="http://schemas.datacontract.org/2004/07/" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">${inner}</${operation}Result>`;
  return `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><${operation}Response xmlns="http://tempuri.org/">${result}</${operation}Response></s:Body></s:Envelope>`;
}

const FAULT = `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><s:Fault><faultcode xmlns:a="http://schemas.microsoft.com/net/2005/12/windowscommunicationfoundation/dispatcher">a:InternalServiceFault</faultcode><faultstring xml:lang="tr-TR">Hatalı Kullanıcı Kodu</faultstring></s:Fault></s:Body></s:Envelope>`;

const variant = (id: number, fields: Record<string, Value>) => ({
  AlisFiyati: 100,
  Aktif: true,
  Barkod: null,
  ID: id,
  IndirimliFiyati: 0,
  KdvDahil: true,
  KdvOrani: 20,
  Ozellikler: [],
  ParaBirimi: "TL",
  ParaBirimiKodu: "TL",
  Resimler: { strings: [] },
  SatisFiyati: 0,
  StokAdedi: 0,
  StokKodu: `SKU-${id}`,
  ...fields,
});

const option = (name: string, value: string) => ({ Deger: value, EkSecenekId: 1, Tanim: name, Tur: "Diger" });

const PRODUCTS = [
  {
    Aciklama: "<p>Fresh red roses.</p>",
    Aktif: true,
    AnaKategori: "Güller",
    AnaKategoriID: 11,
    ID: 101,
    Kategoriler: { ints: [11] },
    ListedeGoster: true,
    OnYazi: null,
    Resimler: { strings: ["/Uploads/UrunResimleri/buyuk/roses.jpg"] },
    UrunAdi: "Kırmızı Güller",
    UrunSayfaAdresi: "/kirmizi-guller",
    UyeAlimMax: 0,
    Varyasyonlar: [
      variant(1001, { Ozellikler: [option("Boyut", "Küçük")], SatisFiyati: 400, StokAdedi: 10 }),
      // Without VAT: 500 + 10% = 550, discounted 450 + 10% = 495.
      variant(1002, {
        IndirimliFiyati: 450,
        KdvDahil: false,
        KdvOrani: 10,
        Ozellikler: [option("Boyut", "Büyük")],
        Resimler: { strings: ["https://static.ticimax.cloud/1/uploads/urunresimleri/buyuk/roses-large.jpg"] },
        SatisFiyati: 500,
        StokAdedi: 3,
      }),
      variant(1005, { Aktif: false, Ozellikler: [option("Boyut", "Dev")], SatisFiyati: 900, StokAdedi: 1 }),
    ],
    Vitrin: true,
  },
  {
    Aciklama: "",
    Aktif: true,
    AnaKategori: "Vazolar",
    AnaKategoriID: 12,
    ID: 102,
    Kategoriler: { ints: [12] },
    ListedeGoster: true,
    OnYazi: "Hand-blown glass.",
    Resimler: { strings: ["https://static.ticimax.cloud/1/uploads/urunresimleri/buyuk/vase.jpg"] },
    UrunAdi: "Cam Vazo",
    UrunSayfaAdresi: "cam-vazo",
    UyeAlimMax: 0,
    Varyasyonlar: [variant(1003, { SatisFiyati: 250, StokAdedi: 0, StokKodu: "VAZO-1" })],
    Vitrin: false,
  },
  {
    Aciklama: "<p>White orchid.</p>",
    Aktif: true,
    AnaKategori: "Güller",
    AnaKategoriID: 11,
    ID: 103,
    Kategoriler: { ints: [11, 10] },
    ListedeGoster: true,
    OnYazi: null,
    Resimler: { strings: [] },
    UrunAdi: "Orkide",
    UrunSayfaAdresi: "/orkide",
    UyeAlimMax: 2,
    Varyasyonlar: [variant(1004, { IndirimliFiyati: 270, SatisFiyati: 300, StokAdedi: 5 })],
    Vitrin: false,
  },
];

const CATEGORIES = [
  { Aktif: true, AltKategoriSayisi: 1, ID: 10, PID: 0, Sira: 2, Tanim: "Çiçekler", Url: "/cicekler" },
  { Aktif: true, AltKategoriSayisi: 0, ID: 11, PID: 10, Sira: 1, Tanim: "Güller", Url: "/guller" },
  { Aktif: true, AltKategoriSayisi: 0, ID: 12, PID: 0, Sira: 1, Tanim: "Vazolar", Url: "/vazolar" },
  { Aktif: false, AltKategoriSayisi: 0, ID: 13, PID: 0, Sira: 3, Tanim: "Eski", Url: "/eski" },
];

// Member 501 has the customer's number; 502 only matches the phone lookup loosely.
const MEMBERS = [
  { Aktif: true, CepTelefonu: "0532 123 45 67", ID: 501, Isim: "Sara", Mail: "sara@example.com", Telefon: null },
  { Aktif: true, CepTelefonu: "05321234568", ID: 502, Isim: "Other", Mail: "other@example.com", Telefon: null },
];

const line = (name: string, productId: number, variantId: number, quantity: number, image: string | null) => ({
  Adet: quantity,
  ID: variantId * 10,
  ResimYolu: image,
  Tutar: 100,
  UrunAdi: name,
  UrunID: variantId,
  UrunKartiID: productId,
});

const ORDERS = [
  {
    Durum: 6,
    ID: 9003,
    ParaBirimi: "TL",
    SiparisDurumu: "Kargoya verildi",
    SiparisNo: "TCM-1003",
    SiparisTarihi: "2026-10-12T14:30:00.1234567",
    SiparisToplamTutari: 950.5,
    UyeID: 501,
    Urunler: [line("Kırmızı Güller - Büyük", 101, 1002, 1, "/Uploads/UrunResimleri/buyuk/roses.jpg")],
  },
  {
    Durum: 7,
    ID: 9002,
    ParaBirimi: "TL",
    SiparisDurumu: "Teslim edildi",
    SiparisNo: "TCM-1002",
    SiparisTarihi: "2026-10-05T09:00:00",
    SiparisToplamTutari: 540,
    UyeID: 501,
    Urunler: null,
  },
  {
    Durum: 8,
    ID: 9001,
    ParaBirimi: "TL",
    SiparisDurumu: "İptal edildi",
    SiparisNo: "TCM-1001",
    SiparisTarihi: "2026-10-01T09:00:00",
    SiparisToplamTutari: 400,
    UyeID: 501,
    Urunler: [line("Kırmızı Güller - Küçük", 101, 1001, 1, null)],
  },
  { Durum: 2, ID: 9100, ParaBirimi: "TL", SiparisNo: "TCM-OTHER", SiparisTarihi: "2026-10-12T10:00:00", SiparisToplamTutari: 1, UyeID: 502, Urunler: [] },
];
const ORDER_LINES: Record<number, ReturnType<typeof line>[]> = { 9002: [line("Orkide", 103, 1004, 2, null)] };

interface Call {
  service: string;
  operation: string;
  params: XmlElement;
}

const kid = (el: XmlElement | null | undefined, name: string) => el?.children.find((c) => c.name === name) ?? null;
const text = (el: XmlElement | null | undefined, name: string) => kid(el, name)?.text ?? null;
const int = (el: XmlElement | null | undefined, name: string) => Number(text(el, name) ?? "0");

/** Data contract members must come in ordinal order, as WCF reads them. */
function expectMemberOrder(el: XmlElement) {
  const names = el.children.map((c) => c.name);
  expect(names, `members of ${el.name}`).toEqual([...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  for (const c of el.children) if (c.children.length > 0 && c.name !== "UrunKartiIDList") expectMemberOrder(c);
}

function fakeShop(options: { mode?: "ok" | "fault" | "empty" | "down" | "offline"; ignoreIdList?: boolean; cartFails?: boolean } = {}) {
  const calls: Call[] = [];
  const carts = new Map<number, Map<number, number>>();
  const fetcher = (async (url: string, init: RequestInit) => {
    if (options.mode === "offline") throw new TypeError("fetch failed");
    const match = /^https:\/\/www\.rose-shop\.com\/Servis\/(UrunServis|SiparisServis|UyeServis)\.svc$/.exec(url);
    expect(match, url).not.toBeNull();
    const service = match![1]!;
    const headers = new Headers(init.headers);
    expect(headers.get("content-type")).toBe("text/xml; charset=utf-8");
    const body = String(init.body);
    expect(body).toContain('xmlns:tem="http://tempuri.org/"');
    expect(body).toContain('xmlns:d="http://schemas.datacontract.org/2004/07/"');
    const params = kid(kid(parseXml(body), "Envelope"), "Body")!.children[0]!;
    const op = params.name;
    expect(headers.get("soapaction")).toBe(`"http://tempuri.org/I${service}/${op}"`);
    expect(body).toContain(`<tem:${op}><tem:UyeKodu>`);
    for (const c of params.children) if (c.children.length > 0) expectMemberOrder(c);
    calls.push({ service, operation: op, params });
    if (options.mode === "down") return new Response("<html>Service Unavailable</html>", { status: 503 });
    if (text(params, "UyeKodu") !== KEY || options.mode === "fault") return new Response(FAULT, { status: 500, headers: { "content-type": "text/xml" } });
    if (options.mode === "empty") return new Response(envelope(op, null), { status: 200 });
    const ok = (inner: string | null) => new Response(envelope(op, inner), { status: 200, headers: { "content-type": "text/xml; charset=utf-8" } });

    switch (op) {
      case "SelectKategori":
        expect(text(params, "kategoriID")).toBe("0");
        return ok(CATEGORIES.map((c) => xml("Kategori", c)).join(""));
      case "SelectUrun": {
        const f = kid(params, "f");
        const s = kid(params, "s");
        expect(int(f, "Aktif")).toBe(1);
        expect(int(f, "Firsat")).toBe(-1);
        let list = PRODUCTS.filter(() => true);
        if (int(f, "Indirimli") === 1) list = list.filter((p) => p.Varyasyonlar.some((v) => Number(v.IndirimliFiyati) > 0));
        if (int(f, "Vitrin") === 1) list = list.filter((p) => p.Vitrin);
        if (int(f, "KategoriID") > 0) list = list.filter((p) => p.Kategoriler.ints.includes(int(f, "KategoriID")));
        if (int(f, "UrunKartiID") > 0) list = list.filter((p) => p.ID === int(f, "UrunKartiID"));
        const idList = kid(f, "UrunKartiIDList");
        if (idList && !options.ignoreIdList) {
          const ids = idList.children.map((c) => Number(c.text));
          list = list.filter((p) => ids.includes(p.ID));
        }
        expect(text(s, "SiralamaDegeri")).toBe("ID");
        list.sort((a, b) => (text(s, "SiralamaYonu") === "DESC" ? b.ID - a.ID : a.ID - b.ID));
        const start = int(s, "BaslangicIndex");
        return ok(list.slice(start, start + int(s, "KayitSayisi")).map((p) => xml("UrunKarti", p)).join(""));
      }
      case "SelectUyeIdByMailOrTel": {
        expect(kid(params, "uyeMail")).toBeNull();
        const tel = text(params, "tel");
        // Matches loosely, like a "contains" search on the stored number.
        const ids = tel === "05321234567" ? [501, 502] : [];
        return ok(ids.map((id) => `<b:int xmlns:b="http://schemas.microsoft.com/2003/10/Serialization/Arrays">${id}</b:int>`).join(""));
      }
      case "SelectUyeler": {
        const filter = kid(params, "filtre");
        expect(int(filter, "Aktif")).toBe(-1);
        return ok(MEMBERS.filter((m) => m.ID === int(filter, "UyeID")).map((m) => xml("Uye", m)).join(""));
      }
      case "SelectSiparis": {
        const f = kid(params, "f");
        for (const name of ["EntegrasyonAktarildi", "KargoFirmaID", "OdemeDurumu", "OdemeTipi", "SiparisDurumu", "SiparisID", "TedarikciID"]) {
          expect(int(f, name), name).toBe(-1);
        }
        const s = kid(params, "s");
        const list = ORDERS.filter((o) => o.UyeID === int(f, "UyeID")).sort((a, b) => b.ID - a.ID);
        const start = int(s, "BaslangicIndex");
        return ok(list.slice(start, start + int(s, "KayitSayisi")).map((o) => xml("WebSiparis", o)).join(""));
      }
      case "SelectSiparisUrun":
        return ok((ORDER_LINES[int(params, "siparisId")] ?? []).map((l) => xml("WebSiparisUrun", l)).join(""));
      case "CreateSepet": {
        const r = kid(params, "request");
        carts.set(int(r, "UyeID"), carts.get(int(r, "UyeID")) ?? new Map());
        return ok(xml("SepetID", 77) + xml("GuidSepetID", "g-77") + xml("Urunler", []));
      }
      case "UpdateSepet": {
        const r = kid(params, "request");
        expect(text(r, "AdetGuncelle")).toBe("true");
        if (!options.cartFails) carts.get(int(r, "UyeID"))?.set(int(r, "UrunID"), int(r, "Adet"));
        return ok(xml("ErrorCode", options.cartFails ? 1 : 0) + xml("ErrorMessage", options.cartFails ? "Yetkisiz" : null) + xml("IsError", Boolean(options.cartFails)));
      }
      case "GetSepet": {
        const r = kid(params, "request");
        const cart = carts.get(int(r, "UyeID")) ?? new Map<number, number>();
        return ok(xml("SepetID", 77) + `<a:Urunler>${[...cart].map(([id, qty]) => xml("ServisSepetUrun", { Adet: qty, UrunID: id })).join("")}</a:Urunler>`);
      }
    }
    throw new Error(`Unexpected operation: ${service}/${op}`);
  }) as unknown as typeof fetch;
  return { fetcher, calls, carts };
}

const NOW = new Date("2026-10-13T10:00:00Z");
const customer: HostedUser = {
  id: 7,
  appId: "app-1",
  phone: "+905321234567",
  name: "Sara",
  email: null,
  city: null,
  notificationsReadAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};
const stranger: HostedUser = { ...customer, id: 8, phone: "+905559998877" };

describe("Ticimax connector", () => {
  let shop: ReturnType<typeof fakeShop>;
  let connector: TicimaxConnector;

  beforeEach(() => {
    clearTicimaxCache();
    shop = fakeShop();
    connector = new TicimaxConnector({ host: HOST, key: KEY }, shop.fetcher);
  });

  async function call(
    method: string,
    route: string,
    options: { query?: Record<string, string>; body?: unknown; user?: HostedUser | null; params?: string[]; on?: TicimaxConnector } = {},
  ) {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const request: ConnectorRequest = {
      method,
      path: concrete.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      user: options.user ?? null,
      now: NOW,
    };
    const result = await (options.on ?? connector).handle(request);
    expect(result, `${method} ${concrete} is answered`).not.toBeNull();
    expectContract(method, route, result!);
    return result!;
  }
  const ops = () => shop.calls.map((c) => c.operation);
  const lastSelect = () => shop.calls.filter((c) => c.operation === "SelectUrun").at(-1)!.params;

  it("checks the key and adds the store settings to the config", async () => {
    expect(await connector.check()).toBe("rose-shop.com");
    expect(await connector.config()).toMatchObject({
      store: { currency: "TRY", guest_checkout: true, checkout_opens_in: "browser", reviews: false, delivery_date: { enabled: false } },
      features: { orders: true },
    });
    // A wrong key: a SOAP fault, or an empty answer.
    await expect(new TicimaxConnector({ host: HOST, key: "wrong" }, shop.fetcher).check()).rejects.toThrow(/Hatalı Kullanıcı Kodu/);
    await expect(new TicimaxConnector({ host: HOST, key: KEY }, fakeShop({ mode: "empty" }).fetcher).check()).rejects.toThrow();
  });

  it("lists active categories as a tree in the shop's order", async () => {
    const result = await call("GET", "/store/categories");
    expect(result.body).toEqual({
      items: [
        { id: 11, name: "Güller", count: 0, parent_id: 10, image_url: null },
        { id: 12, name: "Vazolar", count: 0, parent_id: null, image_url: null },
        { id: 10, name: "Çiçekler", count: 0, parent_id: null, image_url: null },
      ],
    });
    await call("GET", "/store/categories");
    expect(ops().filter((o) => o === "SelectKategori")).toHaveLength(1);
  });

  it("maps products, variant prices with VAT, stock and images", async () => {
    const result = await call("GET", "/store/products");
    const body = result.body as { items: Record<string, unknown>[]; total_pages: number; total: number };
    expect(body).toMatchObject({ page: 1, per_page: 20, total: 3, total_pages: 1 });
    expect(body.items.map((i) => i.id)).toEqual([103, 102, 101]);
    expect(body.items[2]).toMatchObject({
      id: 101,
      name: "Kırmızı Güller",
      type: "variable",
      image_url: "https://www.rose-shop.com/Uploads/UrunResimleri/buyuk/roses.jpg",
      price: { amount: "400.00", currency: "TRY", formatted: "₺400.00 – ₺495.00", range: true, on_sale: false },
      stock_status: "in_stock",
      purchasable: true,
      digital: false,
    });
    expect(body.items[1]).toMatchObject({ id: 102, type: "simple", stock_status: "out_of_stock", purchasable: false, price: { formatted: "₺250.00" } });
    expect(body.items[0]).toMatchObject({
      id: 103,
      image_url: null,
      price: { amount: "270.00", regular_amount: "300.00", regular_formatted: "₺300.00", formatted: "₺270.00", on_sale: true },
    });
    const f = kid(lastSelect(), "f");
    expect([int(f, "Indirimli"), int(f, "Vitrin"), int(f, "KasaOnuFirsatlari"), int(f, "KategoriID")]).toEqual([-1, -1, -1, 0]);
    expect([int(kid(lastSelect(), "s"), "BaslangicIndex"), int(kid(lastSelect(), "s"), "KayitSayisi")]).toEqual([0, 21]);
    expect(text(kid(lastSelect(), "s"), "SiralamaYonu")).toBe("DESC");
  });

  it("pages, filters and sorts", async () => {
    const first = await call("GET", "/store/products", { query: { per_page: "2" } });
    expect(first.body).toMatchObject({ page: 1, total_pages: 2, total: 3, items: [{ id: 103 }, { id: 102 }] });
    const second = await call("GET", "/store/products", { query: { per_page: "2", page: "2" } });
    expect(second.body).toMatchObject({ page: 2, total_pages: 2, total: 3, items: [{ id: 101 }] });
    expect(int(kid(lastSelect(), "s"), "BaslangicIndex")).toBe(2);

    const category = await call("GET", "/store/products", { query: { category: "11" } });
    expect((category.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([103, 101]);
    expect(int(kid(lastSelect(), "f"), "KategoriID")).toBe(11);

    const featured = await call("GET", "/store/products", { query: { featured: "true" } });
    expect((featured.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([101]);
    expect(int(kid(lastSelect(), "f"), "Vitrin")).toBe(1);

    const sale = await call("GET", "/store/products", { query: { on_sale: "1" } });
    expect((sale.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([103, 101]);
    expect(int(kid(lastSelect(), "f"), "Indirimli")).toBe(1);

    const cheap = await call("GET", "/store/products", { query: { orderby: "price_asc" } });
    expect((cheap.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([102, 103, 101]);
    const named = await call("GET", "/store/products", { query: { orderby: "title" } });
    expect((named.body as { items: { name: string }[] }).items.map((i) => i.name)).toEqual(["Cam Vazo", "Kırmızı Güller", "Orkide"]);

    expect((await call("GET", "/store/products", { query: { category: "abc" } })).status).toBe(400);
  });

  it("searches names in memory, Turkish letters included", async () => {
    const search = await call("GET", "/store/products", { query: { search: "kirmizi GULLER" } });
    expect((search.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([101]);
    // Products in a subcategory count for the parent category.
    const inParent = await call("GET", "/store/products", { query: { search: "orkide", category: "10" } });
    expect((inParent.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([103]);
    const bySku = await call("GET", "/store/products", { query: { search: "vazo-1" } });
    expect((bySku.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([102]);
    const none = await call("GET", "/store/products", { query: { search: "lale" } });
    expect(none.body).toMatchObject({ total: 0, total_pages: 1, items: [] });
    // The scanned catalog is cached.
    expect(ops().filter((o) => o === "SelectUrun")).toHaveLength(1);
  });

  it("returns products by ID in the order asked", async () => {
    const ids = await call("GET", "/store/products", { query: { ids: "103,101,999" } });
    expect((ids.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([103, 101]);
    const listCall = shop.calls.find((c) => kid(kid(c.params, "f"), "UrunKartiIDList"));
    expect(kid(kid(listCall!.params, "f"), "UrunKartiIDList")!.children.map((c) => c.text)).toEqual(["103", "101", "999"]);

    // A shop that ignores UrunKartiIDList: each product is fetched by its ID.
    clearTicimaxCache();
    const old = fakeShop({ ignoreIdList: true });
    const result = await call("GET", "/store/products", { query: { ids: "101,102" }, on: new TicimaxConnector({ host: HOST, key: KEY }, old.fetcher) });
    expect((result.body as { items: { id: number }[] }).items.map((i) => i.id)).toEqual([101, 102]);
    // The ignored list gave the newest products (103, 102): only 101 was missing.
    expect(old.calls.map((c) => int(kid(c.params, "f"), "UrunKartiID")).filter(Boolean)).toEqual([101]);
  });

  it("builds the home screen", async () => {
    const result = await call("GET", "/store/home");
    const sections = (result.body as { sections: { type: string; categories?: { id: number }[]; products?: { id: number }[] }[] }).sections;
    expect(sections.map((s) => s.type)).toEqual(["categories", "featured_products", "sale_products", "new_products"]);
    expect(sections[0]!.categories!.map((c) => c.id)).toEqual([12, 10]);
    expect(sections[1]!.products!.map((p) => p.id)).toEqual([101]);
  });

  it("shows a product with its options and variations", async () => {
    const result = await call("GET", "/store/products/{product_id}", { params: ["101"] });
    expect(result.body).toMatchObject({
      id: 101,
      description_html: "<p>Fresh red roses.</p>",
      images: [
        { url: "https://www.rose-shop.com/Uploads/UrunResimleri/buyuk/roses.jpg", alt: null },
        { url: "https://static.ticimax.cloud/1/uploads/urunresimleri/buyuk/roses-large.jpg", alt: null },
      ],
      sku: null,
      attributes: [{ slug: "boyut", name: "Boyut", variation: true, options: [{ value: "Küçük", label: "Küçük" }, { value: "Büyük", label: "Büyük" }] }],
      variations: [
        { id: 1001, attributes: { boyut: "Küçük" }, price: { formatted: "₺400.00", on_sale: false }, max_quantity: 10, stock_status: "in_stock", purchasable: true },
        {
          id: 1002,
          attributes: { boyut: "Büyük" },
          price: { amount: "495.00", on_sale: true, regular_formatted: "₺550.00" },
          image_url: "https://static.ticimax.cloud/1/uploads/urunresimleri/buyuk/roses-large.jpg",
          max_quantity: 3,
        },
      ],
      categories: [{ id: 11, name: "Güller", parent_id: 10 }],
      related: [{ id: 103 }],
      permalink: "https://www.rose-shop.com/kirmizi-guller",
    });
    expect((result.body as { variations: unknown[] }).variations).toHaveLength(2);

    const simple = await call("GET", "/store/products/{product_id}", { params: ["102"] });
    expect(simple.body).toMatchObject({
      type: "simple",
      attributes: [],
      variations: [],
      sku: "VAZO-1",
      max_quantity: null,
      short_description_html: "Hand-blown glass.",
      permalink: "https://www.rose-shop.com/cam-vazo",
    });
    const limited = await call("GET", "/store/products/{product_id}", { params: ["103"] });
    expect(limited.body).toMatchObject({ max_quantity: 2, categories: [{ id: 11 }, { id: 10 }] });

    expect((await call("GET", "/store/products/{product_id}", { params: ["999"] })).status).toBe(404);
    expect((await call("GET", "/store/products/{product_id}/reviews", { params: ["101"] })).body).toMatchObject({ code: "feature_disabled" });
  });

  it("prices the cart from current variant prices", async () => {
    const result = await call("POST", "/store/cart", {
      query: { platform: "android" },
      body: {
        lines: [
          { product_id: 101, variation_id: 1002, quantity: 5 },
          { product_id: 103, quantity: 3 },
          { product_id: 102, quantity: 1 },
          { product_id: 101, quantity: 1 },
          { product_id: 101, variation_id: 1005, quantity: 1 },
          { product_id: 999, quantity: 1 },
        ],
      },
    });
    expect(result.body).toMatchObject({
      item_count: 5,
      subtotal: "₺2,025.00",
      subtotal_amount: "2025.00",
      currency: "TRY",
      lines: [
        { name: "Kırmızı Güller - Büyük", quantity: 3, available: true, problem: "Only 3 left in stock.", unit_price: "₺495.00", line_total: "₺1,485.00", max_quantity: 3 },
        { name: "Orkide", quantity: 2, available: true, problem: "You can buy up to 2 at once.", unit_price: "₺270.00", line_total: "₺540.00" },
        { name: "Cam Vazo", available: false, problem: "Out of stock." },
        { name: "Kırmızı Güller", available: false, problem: "Please choose an option." },
        { available: false, problem: "This option is no longer available." },
        { name: "Unavailable product", available: false, problem: "This product is no longer available." },
      ],
    });
    expect((await call("POST", "/store/cart", { body: { lines: [] } })).status).toBe(400);
  });

  it("refuses a checkout when the cart changed", async () => {
    const changed = await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines: [{ product_id: 102, quantity: 1 }] } });
    expect(changed).toMatchObject({ status: 409, body: { code: "cart_changed" } });
    expect((await call("POST", "/store/checkout-link", { query: {}, body: { lines: [{ product_id: 103, quantity: 1 }] } })).status).toBe(400);
  });

  it("fills a member's cart on the shop and opens the shop's cart page", async () => {
    const link = await call("POST", "/store/checkout-link", {
      query: { platform: "ios" },
      body: { lines: [{ product_id: 101, variation_id: 1001, quantity: 2 }, { product_id: 103, quantity: 1 }] },
      user: customer,
    });
    expect(link).toMatchObject({
      status: 200,
      body: { url: "https://www.rose-shop.com/sepetim", open_in: "browser", expires_at: "2026-10-13T10:30:00.000Z" },
    });
    // Only member 501's numbers match exactly; 502 came from the loose lookup.
    expect([...shop.carts.keys()]).toEqual([501]);
    expect([...shop.carts.get(501)!]).toEqual([
      [1001, 2],
      [1004, 1],
    ]);
    const lookups = shop.calls.filter((c) => c.operation === "SelectUyeIdByMailOrTel").map((c) => text(c.params, "tel"));
    expect(lookups).toEqual(expect.arrayContaining(["05321234567", "5321234567", "+905321234567", "905321234567"]));
  });

  it("opens the product's page when the cart can't be filled", async () => {
    // Not a member: one product opens its page.
    const page = await call("POST", "/store/checkout-link", {
      query: { platform: "android" },
      body: { lines: [{ product_id: 101, variation_id: 1001, quantity: 2 }, { product_id: 101, variation_id: 1002, quantity: 1 }] },
      user: stranger,
    });
    expect(page.body).toMatchObject({ url: "https://www.rose-shop.com/kirmizi-guller", open_in: "browser" });
    expect(ops()).not.toContain("CreateSepet");

    const guest = await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines: [{ product_id: 103, quantity: 1 }] } });
    expect(guest.body).toMatchObject({ url: "https://www.rose-shop.com/orkide" });

    const several = await call("POST", "/store/checkout-link", {
      query: { platform: "android" },
      body: { lines: [{ product_id: 103, quantity: 1 }, { product_id: 101, variation_id: 1001, quantity: 1 }] },
    });
    expect(several).toMatchObject({ status: 409, body: { code: "one_product_at_a_time" } });
    expect((several.body as { message: string }).message).toMatch(/one product at a time/);

    // A member whose cart the shop refuses falls back the same way.
    clearTicimaxCache();
    const refusing = new TicimaxConnector({ host: HOST, key: KEY }, fakeShop({ cartFails: true }).fetcher);
    const one = await call("POST", "/store/checkout-link", { query: { platform: "android" }, body: { lines: [{ product_id: 103, quantity: 1 }] }, user: customer, on: refusing });
    expect(one.body).toMatchObject({ url: "https://www.rose-shop.com/orkide" });
    const two = await call("POST", "/store/checkout-link", {
      query: { platform: "android" },
      body: { lines: [{ product_id: 103, quantity: 1 }, { product_id: 101, variation_id: 1001, quantity: 1 }] },
      user: customer,
      on: refusing,
    });
    expect(two.status).toBe(409);
  });

  it("lists the signed-in customer's orders", async () => {
    const first = await call("GET", "/me/orders", { query: { per_page: "1" }, user: customer });
    expect(first.body).toEqual({
      page: 1,
      per_page: 1,
      total: 2,
      total_pages: 2,
      items: [
        {
          id: 9003,
          number: "TCM-1003",
          status: "processing",
          status_label: "Shipped",
          total: "₺950.50",
          created_at: "2026-10-12T11:30:00.123Z",
          items: [
            { name: "Kırmızı Güller - Büyük", course_id: null, product_id: 101, quantity: 1, image_url: "https://www.rose-shop.com/Uploads/UrunResimleri/buyuk/roses.jpg" },
          ],
        },
      ],
    });
    const select = shop.calls.filter((c) => c.operation === "SelectSiparis").at(-1)!.params;
    expect(int(kid(select, "f"), "UyeID")).toBe(501);

    const all = await call("GET", "/me/orders", { user: customer });
    expect(all.body).toMatchObject({
      total: 3,
      total_pages: 1,
      items: [
        { number: "TCM-1003" },
        { number: "TCM-1002", status: "completed", status_label: "Delivered", created_at: "2026-10-05T06:00:00.000Z", items: [{ name: "Orkide", product_id: 103, quantity: 2, image_url: null }] },
        { number: "TCM-1001", status: "cancelled", status_label: "Cancelled" },
      ],
    });
    expect(JSON.stringify(all.body)).not.toContain("TCM-OTHER");

    expect(await call("GET", "/me/orders", { user: stranger })).toMatchObject({ status: 200, body: { total: 0, items: [] } });
    expect((await call("GET", "/me/orders")).status).toBe(401);
  });

  it("says when the shop can't be reached", async () => {
    for (const mode of ["down", "offline", "fault"] as const) {
      clearTicimaxCache();
      const down = new TicimaxConnector({ host: HOST, key: KEY }, fakeShop({ mode }).fetcher);
      const result = await call("GET", "/store/products", { on: down });
      expect(result).toMatchObject({ status: 503, body: { code: "shop_unavailable" } });
      expect((await call("GET", "/store/categories", { on: down })).status).toBe(503);
      expect((await call("POST", "/store/cart", { body: { lines: [{ product_id: 101, quantity: 1 }] }, on: down })).status).toBe(503);
    }
  });

  it("leaves other endpoints to the hosted API", async () => {
    expect(await connector.handle({ method: "GET", path: ["me", "courses"], query: new URLSearchParams(), body: undefined, user: null, now: NOW })).toBeNull();
  });
});

describe("Ticimax platform", () => {
  it("is registered with its fields", () => {
    expect(platformDefinition("ticimax")).toBe(TICIMAX_PLATFORM);
    expect(TICIMAX_PLATFORM).toMatchObject({ id: "ticimax", name: "Ticimax", appType: "store" });
    expect(TICIMAX_PLATFORM.fields.map((f) => [f.name, f.secret])).toEqual([
      ["shopAddress", false],
      ["wsKey", true],
    ]);
    for (const f of TICIMAX_PLATFORM.fields) expect(f.hint).not.toBe("");
  });

  it("normalizes the shop address and key", () => {
    expect(TICIMAX_PLATFORM.normalize({ shopAddress: " https://WWW.Rose-Shop.com/admin/ ", wsKey: " abc123 " })).toEqual({
      values: { shopAddress: "www.rose-shop.com", wsKey: "abc123" },
    });
    expect(TICIMAX_PLATFORM.normalize({ shopAddress: "rose", wsKey: "abc" })).toMatchObject({ errors: { shopAddress: expect.any(String) } });
    expect(TICIMAX_PLATFORM.normalize({ shopAddress: "www.rose-shop.com", wsKey: "" })).toMatchObject({ errors: { wsKey: expect.any(String) } });
    expect(TICIMAX_PLATFORM.normalize({ shopAddress: "www.rose-shop.com", wsKey: "ab c" })).toMatchObject({ errors: { wsKey: expect.any(String) } });
  });

  it("creates a connector for the saved values", async () => {
    clearTicimaxCache();
    const shop = fakeShop();
    const connector = TICIMAX_PLATFORM.create(
      { shopAddress: HOST, wsKey: KEY },
      { appId: "app-1", store: null as never, fetcher: shop.fetcher, saveSecrets: async () => {} },
    );
    expect(await connector.check()).toBe("rose-shop.com");
  });
});

describe("Ticimax helpers", () => {
  it("normalize shop addresses", () => {
    expect(normalizeShopAddress("www.your-shop.com")).toBe("www.your-shop.com");
    expect(normalizeShopAddress("http://your-shop.com.tr/Servis/UrunServis.svc")).toBe("your-shop.com.tr");
    expect(normalizeShopAddress("çiçekçi.com")).toMatch(/^xn--[a-z0-9-]+\.com$/);
    for (const bad of ["", "shop", "localhost", "127.0.0.1", "https://10.0.0.1/", "shop.local", "ftp://shop.com", "shop.com:8443", "user:pw@shop.com"]) {
      expect(normalizeShopAddress(bad), bad).toBeNull();
    }
  });

  it("map every order status", () => {
    const statuses = new Set(["pending", "processing", "on_hold", "completed", "cancelled", "refunded", "failed"]);
    for (let code = 0; code <= 17; code++) {
      const { status, label } = orderStatus(code);
      expect(statuses.has(status)).toBe(true);
      expect(label).toMatch(/^[A-Z][a-z -]+$/);
    }
    expect(orderStatus(3)).toEqual({ status: "pending", label: "Awaiting payment" });
    expect(orderStatus(13)).toEqual({ status: "refunded", label: "Refunded" });
    expect(orderStatus(99)).toEqual({ status: "processing", label: "Processing" });
    expect(orderStatus(null)).toEqual({ status: "processing", label: "Processing" });
  });

  it("read SOAP answers with any prefixes, nil values, entities and CDATA", () => {
    const doc = parseXml(
      `<?xml version="1.0"?><!-- c --><s:Envelope xmlns:s="x"><s:Body><R xmlns="t"><a:Name xmlns:a="d">A &amp; B &#252;&#x131;</a:Name><a:Empty i:nil="true" xmlns:i="n"/><a:Html><![CDATA[<p>x</p>]]></a:Html></R></s:Body></s:Envelope>`,
    );
    const r = kid(kid(kid(doc, "Envelope"), "Body"), "R")!;
    expect(text(r, "Name")).toBe("A & B üı");
    expect(kid(r, "Empty")!.nil).toBe(true);
    expect(text(r, "Html")).toBe("<p>x</p>");
    expect(() => parseXml("<a><b></a>")).toThrow();
  });

  it("compare phone numbers as members type them", () => {
    expect(phoneKey("+90 532 123 45 67")).toBe("905321234567");
    expect(phoneKey("0532 123 45 67")).toBe("905321234567");
    expect(phoneKey("(532) 123 45 67")).toBe("905321234567");
    expect(phoneKey("0090 532 123 4567")).toBe("905321234567");
    expect(phoneKey("+44 20 7946 0958")).toBe("442079460958");
  });

  it("read currency codes", () => {
    expect(currencyCode("TL")).toBe("TRY");
    expect(currencyCode(null)).toBe("TRY");
    expect(currencyCode("usd")).toBe("USD");
    expect(currencyCode("Euro")).toBe("TRY");
  });
});
