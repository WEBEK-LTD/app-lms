import { describe, expect, it } from "vitest";
import { servedPrice } from "@/lib/catalog/variants";

/**
 * 175 The products list showed "MAD 390.00 ~~MAD 450.00~~", the product's
 * own sale price no size used, while the app serves "MAD 450.00 – MAD
 * 620.00" (report #9): both read servedPrice now.
 */
describe("175 the price the app serves, on the products list too", () => {
  const sizes = (items: { price: number | null; sale: number | null; stock: number | null; active?: boolean }[]) => ({
    attributes: [{ name: "Size", values: items.map((_, i) => `S${i}`) }],
    items: items.map((v, i) => ({ id: i + 1, values: [`S${i}`], priceCents: v.price, salePriceCents: v.sale, stock: v.stock, sku: null, active: v.active ?? true })),
  });

  it("Atlas Roses: Small 450, Large 690 on sale at 620; the product's own 390 isn't served", () => {
    expect(servedPrice({ priceCents: 450_00, salePriceCents: 390_00, stock: null, variants: sizes([{ price: 450_00, sale: null, stock: 3 }, { price: 690_00, sale: 620_00, stock: 1 }]) })).toEqual({ low: 450_00, high: 620_00, regular: null, onSale: true });
  });

  it("sizes at one price on sale: that price and its regular one", () => {
    expect(servedPrice({ priceCents: 500_00, salePriceCents: null, stock: null, variants: sizes([{ price: 500_00, sale: 400_00, stock: null }, { price: 500_00, sale: 400_00, stock: null }]) })).toEqual({ low: 400_00, high: 400_00, regular: 500_00, onSale: true });
  });

  it("a sold-out size isn't in the range while another can be sold", () => {
    expect(servedPrice({ priceCents: 450_00, salePriceCents: null, stock: null, variants: sizes([{ price: 450_00, sale: null, stock: 2 }, { price: 690_00, sale: null, stock: 0 }]) })).toMatchObject({ low: 450_00, high: 450_00 });
  });

  it("a product without sizes: its price, or its sale price over it", () => {
    expect(servedPrice({ priceCents: 450_00, salePriceCents: 390_00, stock: null, variants: null })).toEqual({ low: 390_00, high: 390_00, regular: 450_00, onSale: true });
    expect(servedPrice({ priceCents: 450_00, salePriceCents: null, stock: null, variants: null })).toEqual({ low: 450_00, high: 450_00, regular: null, onSale: false });
  });
});
