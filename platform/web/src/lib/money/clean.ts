import { currencyDigits, currencyCodeOf } from "./currencies";

/**
 * 229 Prices that read cleanly in every app (the owner, 24 November 2026):
 *
 * - a whole amount without its zeros after the point ("SAR 4,899", not
 *   "SAR 4,899.00"); an amount with a real fraction keeps its currency's
 *   digits ("€12.50", "KWD 1.250"), never rounded;
 * - a product whose variations cost differently from its cheapest one
 *   ("From SAR 4,899", "من SAR 4,899", "SAR 4,899 ve üzeri"), not the
 *   whole range.
 *
 * Each text keeps its own style (its sign, its separators, the shop's or
 * the connected platform's way of writing it): only its zeros go, and only
 * when what is left is the amount itself. Applied once to every answer the
 * hosted API gives the app (`cleanPrices`): lists, product cards and pages,
 * search, the wishlist, the cart and its totals, orders; the app writes the
 * totals it adds up itself the same way (mobile/lib/core/format/money.dart).
 */

/** A price from its cheapest: "From SAR 4,899" (en), "من SAR 4,899" (ar), "SAR 4,899 ve üzeri" (tr). */
export function fromPrice(price: string, lang: string | null | undefined): string {
  if (lang === "ar") return `من ${price}`;
  // "…'den başlayan" would need the suffix to agree with how the amount is read ("'dan" after 4.899): "ve üzeri" never does.
  if (lang === "tr") return `${price} ve üzeri`;
  return `From ${price}`;
}

const DECIMAL = /^-?\d{1,13}(?:\.\d{1,3})?$/;

/**
 * A price's text without the zeros after its point when its amount is
 * whole, in the text's own style ("₺1.450,00" → "₺1.450", "+E£20.00" →
 * "+E£20", "1,450.00 ج.م" → "1,450 ج.م"); as it is otherwise. Only when what
 * is left is the amount itself, digit for digit: a text that already has no
 * fraction ("EGP 4,250,000") or isn't this amount is never cut.
 */
export function wholeText(text: string, amount: number, currency: string): string {
  const digits = currencyDigits(currency);
  if (!Number.isInteger(amount) || digits === 0) return text;
  const cut = text.replace(new RegExp(`[.,\u066b]0{${digits}}(?=\\D*$)`, "u"), "");
  return cut !== text && cut.replace(/\D/g, "") === String(Math.abs(amount)) ? cut : text;
}

/** A range's text ("₺450.00 – ₺600.00") as its cheapest end from it ("From ₺450"); null when it isn't two prices joined by a dash. */
function rangeText(text: string, low: number, currency: string, lang: string | null | undefined): string | null {
  const parts = text.split(/\s[–-]\s/);
  if (parts.length !== 2) return null;
  const first = parts[0]!.trim();
  // Only when its first end is this amount, with or without its digits after the point.
  const shown = first.replace(/\D/g, "");
  if (shown !== String(Math.trunc(Math.abs(low))) && shown !== Math.abs(low).toFixed(currencyDigits(currency)).replace(".", "")) return null;
  return fromPrice(wholeText(first, low, currency), lang);
}

/** The text key that goes with an amount key: amount→formatted, regular_amount→regular_formatted, subtotal_amount→subtotal, was→was_formatted. */
function textKey(object: Record<string, unknown>, key: string): string | null {
  const candidates = key === "amount" ? ["formatted"] : key.endsWith("_amount") ? [`${key.slice(0, -7)}_formatted`, key.slice(0, -7)] : [`${key}_formatted`];
  return candidates.find((k) => typeof object[k] === "string" && !DECIMAL.test(object[k] as string)) ?? null;
}

/**
 * 229 Every money object in an answer, cleaned in place (and returned): an
 * object with an ISO `currency` whose amounts each come with their text (a
 * price's `amount` and `formatted`, its `regular_amount`, a sale's `was`
 * and `now`, a cart's `subtotal_amount` and `subtotal`, a fee's
 * `fee_formatted`, its `display` in the customer's currency). A whole
 * amount's text loses its zeros after the point (`wholeText`); a range
 * (`range: true`) reads from its cheapest end in the app's language
 * (`fromPrice`), its `display` too. Amounts never change.
 */
export function cleanPrices<T>(body: T, lang: string | null | undefined): T {
  const visit = (value: unknown, depth: number, range: boolean, outer: string | null) => {
    if (depth > 14 || !value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1, false, outer);
      return;
    }
    const object = value as Record<string, unknown>;
    // An object without its own currency (an order's line, a quote's line) is in the one of what it is part of.
    // One that names a currency the wrong way ("egp", "pounds") isn't touched.
    const currency = object.currency === undefined ? outer : currencyCodeOf(object.currency) === object.currency ? (object.currency as string) : null;
    // A range's `display` (its price in the customer's currency) is a range too.
    for (const [key, child] of Object.entries(object)) visit(child, depth + 1, key === "display" && object.range === true, currency);
    if (!currency) return;
    for (const [key, raw] of Object.entries(object)) {
      if (typeof raw !== "string" || !DECIMAL.test(raw) || key === "max_amount") continue;
      const text = textKey(object, key);
      if (!text) continue;
      const amount = Number(raw);
      const ranged = key === "amount" && (object.range === true || range) ? rangeText(object[text] as string, amount, currency, lang) : null;
      object[text] = ranged ?? wholeText(object[text] as string, amount, currency);
    }
  };
  visit(body, 0, false, null);
  return body;
}
