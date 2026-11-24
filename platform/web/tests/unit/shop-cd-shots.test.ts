import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BEAUTY_CATEGORIES, BEAUTY_CURRENCY, BEAUTY_PRODUCTS, beautyMainOf } from "@/lib/demo/beauty";
import { CROCHET_KIT } from "@/lib/demo/kits/crochet";
import { kitMainOf } from "@/lib/demo/shop-kit";
import { BEAUTY_PRODUCT_NAMES, CROCHET_PRODUCT_NAMES, type ProductNames } from "@/lib/demo/product-names";

/**
 * 224 The demo shops the app's pictures of Velours's and Ghurza's templates
 * C and D draw (mobile/test/screenshots/shop_cd_screenshots_test.dart): each
 * shop's products (name, photo, price, sale price, its main category) and
 * its categories with their sub-categories, as lib/demo makes them. With
 * YALLAPP_WRITE_SHOPS the files are written
 * (mobile/test/support/shops/<demo>.json); else they must match.
 */

interface Named {
  name: string;
  names: { ar: string; tr: string };
}

function shopOf(o: { currency: string; dir: string; categories: readonly (Named & { subs: readonly Named[] })[]; products: readonly { sku: string; name: string; sub: string; priceCents: number; salePriceCents: number | null; photos: readonly string[] }[]; mainOf: (sub: string) => Named; names: ProductNames }) {
  const categories: { id: number; name: string; ar: string; tr: string; parent_id: number | null; photo: string | null }[] = [];
  let id = 30;
  for (const main of o.categories) {
    const mainId = id++;
    const first = o.products.find((p) => o.mainOf(p.sub).name === main.name);
    categories.push({ id: mainId, name: main.name, ar: main.names.ar, tr: main.names.tr, parent_id: null, photo: first ? `/${o.dir}/${first.photos[0]}.jpg` : null });
    for (const sub of main.subs) {
      const own = o.products.find((p) => p.sub === sub.name);
      categories.push({ id: id++, name: sub.name, ar: sub.names.ar, tr: sub.names.tr, parent_id: mainId, photo: own ? `/${o.dir}/${own.photos[0]}.jpg` : null });
    }
  }
  return {
    currency: o.currency,
    categories,
    products: o.products.map((p, i) => ({ id: 100 + i, sku: p.sku, name: p.name, ar: o.names[p.sku]?.ar ?? p.name, tr: o.names[p.sku]?.tr ?? p.name, sub: p.sub, main: o.mainOf(p.sub).name, price: p.salePriceCents ?? p.priceCents, was: p.salePriceCents ? p.priceCents : null, photos: p.photos.map((f) => `/${o.dir}/${f}.jpg`) })),
  };
}

const SHOPS = {
  beauty: shopOf({ currency: BEAUTY_CURRENCY, dir: "beauty-photos", categories: BEAUTY_CATEGORIES, products: BEAUTY_PRODUCTS, mainOf: beautyMainOf, names: BEAUTY_PRODUCT_NAMES }),
  crochet: shopOf({ currency: CROCHET_KIT.currency, dir: CROCHET_KIT.photos.dir, categories: CROCHET_KIT.categories, products: CROCHET_KIT.products, mainOf: (sub) => kitMainOf(CROCHET_KIT, sub), names: CROCHET_PRODUCT_NAMES }),
};

describe("224 the demo shops of the templates C and D's pictures", () => {
  it.each(Object.keys(SHOPS) as (keyof typeof SHOPS)[])("%s: its products and categories (mobile/test/support/shops)", (demo) => {
    const data = `${JSON.stringify(SHOPS[demo], null, 1)}\n`;
    const folder = join(process.cwd(), "..", "..", "mobile", "test", "support", "shops");
    const file = join(folder, `${demo}.json`);
    if (process.env.YALLAPP_WRITE_SHOPS) {
      mkdirSync(folder, { recursive: true });
      writeFileSync(file, data);
    }
    expect(readFileSync(file, "utf8")).toBe(data);
    expect(SHOPS[demo].products.length).toBeGreaterThan(10);
    expect(SHOPS[demo].products.every((p) => p.photos.length > 0)).toBe(true);
  });
});
