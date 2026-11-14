import { parsePrice } from "./money";

/**
 * A product's price, sale price and stock as the owner types them, for the
 * dashboard's product form and 58 the Owner API's quick edit: the same rules
 * and messages.
 */
export function readProductNumbers(v: { price: string; salePrice: string; stock: string; weight?: string }): {
  errors: Record<string, string>;
  priceCents: number | null;
  salePriceCents: number | null;
  stock: number | null;
  /** 131 Its weight in grams (typed in kg); null for none. */
  weightGrams: number | null;
} {
  const errors: Record<string, string> = {};
  const price = parsePrice(v.price);
  if (price === null || price === 0) errors.price = "Enter a price, like 450 or 450.50.";
  const salePrice = v.salePrice ? parsePrice(v.salePrice) : null;
  if (v.salePrice && (salePrice === null || (price !== null && salePrice >= price))) errors.salePrice = "The sale price must be lower than the price.";
  let stock: number | null = null;
  if (v.stock) {
    stock = Number(v.stock);
    if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) errors.stock = "Enter a whole number, or leave it empty.";
  }
  // 131 Its weight in kg, for shipping by weight.
  let weightGrams: number | null = null;
  const weightText = (v.weight ?? "").trim().replace(",", ".");
  if (weightText) {
    const kg = Number(weightText);
    if (!Number.isFinite(kg) || kg <= 0 || kg > 1000) errors.weight = "Enter the weight in kg, like 1.5, or leave it empty.";
    else weightGrams = Math.round(kg * 1000);
  }
  return { errors, priceCents: price, salePriceCents: salePrice, stock, weightGrams };
}
