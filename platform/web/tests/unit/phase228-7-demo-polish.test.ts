import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { MOBILES_DEMO, TOYS_DEMO } from "@/lib/demo/constants";
import { setupDemoApps } from "@/lib/demo/setup";
import { FACT_WORDS } from "@/lib/demo/fact-words";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted } from "@/lib/hosted/service";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { KEY, NOW } from "./helpers";
import * as NAMES from "@/lib/demo/product-names";
import { productWords } from "@/lib/catalog/product-langs";
import { CHOICE_WORDS } from "@/lib/demo/choice-words";
import { BEAUTY_PRODUCTS, beautyVariants } from "@/lib/demo/beauty";
import { CLOTHES_PRODUCTS, clothesVariants } from "@/lib/demo/clothes";
import { COMPUTERS_PRODUCTS, computersVariants } from "@/lib/demo/computers";
import { ELECTRONICS_PRODUCTS, electronicsCover, electronicsVariants } from "@/lib/demo/electronics";
import { KIDS_PRODUCTS, kidsVariants } from "@/lib/demo/kids";
import { CROCHET_KIT } from "@/lib/demo/kits/crochet";
import { DECOR_KIT } from "@/lib/demo/kits/decor";
import { FURNITURE_KIT } from "@/lib/demo/kits/furniture";
import { MOBILES_PRODUCTS, mobilesVariants } from "@/lib/demo/mobiles";
import { PRODUCT_DESCRIPTIONS } from "@/lib/demo/product-descriptions";
import { kitVariants } from "@/lib/demo/shop-kit";
import type { CatalogOptionGroup, CatalogVariants } from "@/lib/data/types";
import { listHeadings, withListHeadings, withoutEmptied } from "@/lib/hosted/pages/lists";
import type { StudioNode } from "@/lib/pages/types";
import { APP_WORDS } from "@/lib/studio/app-words";
import { signatureDesign } from "@/lib/studio/demo-designs";
import { PRODUCT_PAGE_SLUG } from "@/lib/studio/product-page";
import type { SectionContext } from "@/lib/studio/sections";
import { allNodes, mapTree } from "@/lib/studio/tree";

/**
 * 228.7 The demo shops as customers see them: every demo product's
 * description in Arabic (MSA) and Turkish beside its name, and a template's
 * treasure chest or deals card left out with its heading while the shop has
 * no code or sale to show (lib/hosted/pages/lists.ts).
 */

const ctx = (): SectionContext => {
  let n = 0;
  return { w: (word) => (APP_WORDS.en as Record<string, string>)[word] ?? word, newId: () => `id${++n}` } as SectionContext;
};

/** The page as served when the servers leave out every element of these types. */
function servedWithout(root: StudioNode, gone: (n: StudioNode) => boolean): StudioNode {
  const headings = listHeadings(root);
  const kept = mapTree(root, (n) => (gone(n) ? null : n))!;
  return withoutEmptied(root, withListHeadings(kept, headings));
}
const ofType = (...types: string[]) => (n: StudioNode) => types.includes(n.type);

describe("228.7 a coupon or flash sale the shop hasn't goes with its heading", () => {
  it("toys C's treasure chest: gone, frame and all, without a code; kept and its heading marked with one", () => {
    const page = signatureDesign("toys", "c")!.pages!(ctx()).find((p) => p.slug === PRODUCT_PAGE_SLUG)!.studio;
    const chest = APP_WORDS.en.tyMapChest;
    const named = (root: StudioNode) => allNodes({ body: root }).filter((n) => n.name === chest);
    expect(named(page.body).length).toBeGreaterThan(0);
    expect(named(servedWithout(page.body, ofType("coupon")))).toEqual([]);
    // Everything else on the page stays.
    expect(allNodes({ body: servedWithout(page.body, ofType("coupon")) }).filter((n) => n.type.startsWith("product_")).length).toBe(allNodes(page).filter((n) => n.type.startsWith("product_")).length);
    const kept = withListHeadings(page.body, listHeadings(page.body));
    const coupon = allNodes({ body: kept }).find((n) => n.type === "coupon")!;
    expect(allNodes({ body: kept }).some((n) => n.heads === coupon.id)).toBe(true);
  });

  it("mobiles D's deals card: kept while products are on sale, gone (no empty pink box) with nothing on sale", () => {
    const page = signatureDesign("mobiles", "d")!.pages!(ctx()).find((p) => p.slug === PRODUCT_PAGE_SLUG)!.studio;
    const deals = APP_WORDS.en.mbHubDeals;
    const card = (root: StudioNode) => allNodes({ body: root }).filter((n) => n.name === deals && n.type === "column");
    expect(card(page.body).length).toBe(1);
    expect(card(servedWithout(page.body, ofType("flash_sale"))).length).toBe(1);
    expect(card(servedWithout(page.body, (n) => n.type === "flash_sale" || (n.type === "items" && n.query?.on_sale === true)))).toEqual([]);
  });

  it("a row or column the page leaves empty on purpose stays", () => {
    const root: StudioNode = { id: "r", type: "column", children: [{ id: "gap", type: "column", height: 20, children: [] }, { id: "box", type: "row", children: [{ id: "c", type: "coupon" }] }] };
    const served = servedWithout(root, ofType("coupon"));
    expect(served.children!.map((n) => n.id)).toEqual(["gap"]);
  });
});

describe("228.7 the demo products' descriptions in Arabic and Turkish", () => {
  const all = Object.entries(NAMES).filter(([k]) => k.endsWith("_PRODUCT_NAMES")) as [string, NAMES.ProductNames][];

  it("every named demo product of the 10 shop types has both, and its translations carry them", () => {
    expect(all.length).toBe(10);
    for (const [, names] of all) {
      for (const sku of Object.keys(names)) {
        const d = PRODUCT_DESCRIPTIONS[sku];
        expect(d?.ar?.trim(), `${sku} ar`).toBeTruthy();
        expect(d?.tr?.trim(), `${sku} tr`).toBeTruthy();
        const t = NAMES.namedTranslations(names, sku)!;
        expect(t.ar).toEqual({ name: names[sku]!.ar, description: d!.ar });
        expect(t.tr).toEqual({ name: names[sku]!.tr, description: d!.tr });
      }
    }
    expect(Object.keys(PRODUCT_DESCRIPTIONS).length).toBe(all.reduce((n, [, names]) => n + Object.keys(names).length, 0));
  });

  it("reads as Arabic and Turkish: Arabic letters in the one, Turkish words (not the English) in the other", () => {
    for (const [sku, d] of Object.entries(PRODUCT_DESCRIPTIONS)) {
      expect(d.ar, sku).toMatch(/[؀-ۿ]/);
      expect(d.ar, sku).not.toMatch(/\b(the|and|with|for)\b/i);
      expect(d.tr, sku).not.toMatch(/\b(the|and|with|your)\b/i);
    }
  });
});

/** Every demo product with choices: its SKU, its shop type's names, its variations and option groups. */
const money = (c: number) => c;
const CHOOSING: { sku: string; names: NAMES.ProductNames; variants: CatalogVariants | null; optionGroups?: CatalogOptionGroup[] | null; type: string }[] = [
  ...MOBILES_PRODUCTS.map((p, i) => ({ sku: p.sku, names: NAMES.MOBILES_PRODUCT_NAMES, variants: mobilesVariants(p, i), type: "mobiles" })),
  ...KIDS_PRODUCTS.map((p, i) => ({ sku: p.sku, names: NAMES.KIDS_PRODUCT_NAMES, variants: kidsVariants(p, i), type: "kids" })),
  ...CLOTHES_PRODUCTS.map((p, i) => ({ sku: p.sku, names: NAMES.CLOTHES_PRODUCT_NAMES, variants: clothesVariants(p, i), type: "clothes" })),
  ...BEAUTY_PRODUCTS.map((p, i) => ({ sku: p.sku, names: NAMES.BEAUTY_PRODUCT_NAMES, variants: beautyVariants(p, i), type: "beauty" })),
  ...ELECTRONICS_PRODUCTS.map((p, i) => ({ sku: p.sku, names: NAMES.ELECTRONICS_PRODUCT_NAMES, variants: electronicsVariants(p, i, money), optionGroups: p.cover ? electronicsCover(money) : null, type: "electronics" })),
  ...COMPUTERS_PRODUCTS.map((p) => ({ sku: p.sku, names: NAMES.COMPUTERS_PRODUCT_NAMES, variants: computersVariants(p), type: "computers" })),
  ...([["crochet", CROCHET_KIT, NAMES.CROCHET_PRODUCT_NAMES], ["decor", DECOR_KIT, NAMES.DECOR_PRODUCT_NAMES], ["furniture", FURNITURE_KIT, NAMES.FURNITURE_PRODUCT_NAMES]] as const).flatMap(([type, kit, names]) => kit.products.map((p, i) => ({ sku: p.sku, names, variants: kitVariants(p, i), type }))),
];

/** A word read the same in every language: a size or code (XS, 1N, 256 GB, 55″, 3 mm, 80 × 80 cm, 36). */
const universal = (w: string) => !/[a-z]{2,}/.test(w.replace(/\b(mm|cm)\b/g, ""));

describe("228.7 the demo products' choices in Arabic and Turkish", () => {
  it("every choice name and value of every demo product of the 10 types, but sizes and codes, has its words in both", () => {
    const missing = new Set<string>();
    for (const p of CHOOSING) {
      const words = productWords(p);
      const t = NAMES.namedTranslations(p.names, p.sku, p)!;
      for (const w of words.filter((x) => !universal(x))) {
        if (!t.ar.words?.[w] || !t.tr.words?.[w]) missing.add(`${p.type}: ${w}`);
      }
      // Only its own words, none of another product's.
      for (const k of Object.keys(t.ar.words ?? {})) expect(words, p.sku).toContain(k);
    }
    expect([...missing]).toEqual([]);
  });

  it("reads as Arabic and Turkish, never the English again", () => {
    for (const [en, t] of Object.entries(CHOICE_WORDS)) {
      expect(t.ar, en).toMatch(/[\u0600-\u06FF]/);
      expect(t.tr.trim(), en).toBeTruthy();
    }
  });
});

describe("228.7 a demo phone, device or computer opens on a choice in stock", () => {
  it("its first choice is in stock, and where it has several one stays sold out, so Notify me still shows", () => {
    for (const p of CHOOSING.filter((x) => ["mobiles", "electronics", "computers"].includes(x.type) && x.variants)) {
      const v = p.variants!;
      const first = v.items.find((x) => x.id === (v.defaultId ?? v.items[0]!.id))!;
      expect(first.stock === null || first.stock > 0, `${p.sku} opens on ${first.values.join(" ")}`).toBe(true);
    }
    for (const type of ["mobiles", "electronics", "computers"]) {
      expect(CHOOSING.some((p) => p.type === type && p.variants?.items.some((x) => x.stock === 0)), type).toBe(true);
    }
  });
});

describe("228.7 the demo products' facts, lines and specs in Arabic and Turkish, on the hosted API", () => {
  async function product(demo: string, sku: string, lang: string) {
    clearPlatformSettingsCache();
    const store = new MemoryStore();
    const assetUrl = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
    const made = await setupDemoApps({ store, encryptionKey: KEY, putBlob: async () => undefined, assetUrl, platformUrl: "https://yallapp.test", contact: { whatsapp: "+90 544 673 19 42", email: "info@yallapp.test" }, actorEmail: "admin@yallapp.test", now: NOW }, [demo] as never);
    const app = (await store.getAppById(made.apps[0]!.appId))!;
    const id = (await store.listCatalogProducts(app.id)).find((p) => p.sku === sku)!.id;
    const context = { store, app, active: true, now: NOW, ip: "203.0.113.31", secret: "test-hosted-secret", sender: new LogSender(), push: false, assetUrl, platformUrl: "https://yallapp.test", connector: new CatalogConnector({ store, app, assetUrl, platformUrl: "https://yallapp.test" }) };
    const result = await handleHosted(context, { method: "GET", path: ["store", "products", String(id)], query: new URLSearchParams({ platform: "android" }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) });
    return result.body as { attributes: { name: string; variation: boolean; options: { value: string; label: string }[] }[]; info?: { text: string }[]; specs: { label: string; value: string }[]; description_html: string };
  }

  it("a toy's facts and lines in Arabic and Turkish, in English as before", async () => {
    const ar = await product(TOYS_DEMO, "TY-301", "ar");
    const facts = ar.attributes.filter((a) => !a.variation);
    expect(facts.map((f) => f.name)).toContain(FACT_WORDS.Age!.ar);
    expect(facts.find((f) => f.name === FACT_WORDS.Age!.ar)!.options[0]!.label).toBe(FACT_WORDS["From birth"]!.ar);
    for (const i of ar.info ?? []) expect(i.text).toMatch(/[\u0600-\u06FF]/);
    expect(ar.description_html).toMatch(/[\u0600-\u06FF]/);
    const tr = await product(TOYS_DEMO, "TY-301", "tr");
    expect(tr.attributes.filter((a) => !a.variation).map((f) => f.name)).toContain(FACT_WORDS.Age!.tr);
    const en = await product(TOYS_DEMO, "TY-301", "en");
    expect(en.attributes.filter((a) => !a.variation).map((f) => f.name)).toContain("Age");
  }, 60000);

  it("a phone's spec values and choices in Arabic; units and numbers kept", async () => {
    const ar = await product(MOBILES_DEMO, "MB-101", "ar");
    const english = ar.specs.filter((s) => FACT_WORDS[s.value] && FACT_WORDS[s.value]!.ar !== s.value);
    expect(english.map((s) => s.value)).toEqual([]);
    expect(ar.attributes.find((a) => a.variation)!.name).toBe(CHOICE_WORDS.Storage!.ar);
    // The choices' values stay what the cart sends.
    expect(ar.attributes.find((a) => a.name === CHOICE_WORDS.Colour!.ar)!.options.map((o) => o.value)).toContain("Titanium");
  }, 60000);

  it("every fact word keeps the English's numbers (as digits, or as the words Arabic writes for one and two)", () => {
    for (const [en, t] of Object.entries(FACT_WORDS)) {
      const nums = (en.match(/\d+/g) ?? []).filter((n) => !["1", "2"].includes(n));
      for (const n of nums) expect(t.ar, `${en} ar`).toContain(n);
    }
  });
});
