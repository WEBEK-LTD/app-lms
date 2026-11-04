import type { MarketCourierTerms, VendorDelivery } from "../data/types";
import { currencyDecimals, fromMinor, toMinor } from "./currency";

/**
 * 115.5 The delivery forms: a vendor's own terms (the vendor panel, or the
 * owner for it in Studio) and the app's couriers' terms (Studio › Delivery).
 * Amounts are typed in the app's currency and kept in minor units.
 */

export type Parsed<T> = { ok: true; value: T } | { ok: false; field: string; error: string };

function amount(text: string | undefined, decimals: number, field: string, required: boolean): Parsed<number | null> {
  const value = (text ?? "").trim();
  if (!value) return required ? { ok: false, field, error: "Enter an amount." } : { ok: true, value: null };
  const minor = toMinor(value, decimals);
  if (minor === null || minor < 0) return { ok: false, field, error: "Enter an amount like 25 or 25.50." };
  return { ok: true, value: minor };
}

function count(text: string | undefined, field: string, max = 999): Parsed<number | null> {
  const value = (text ?? "").trim();
  if (!value) return { ok: true, value: null };
  if (!/^\d{1,4}$/.test(value) || Number(value) < 1 || Number(value) > max) return { ok: false, field, error: `Enter a whole number from 1 to ${max}.` };
  return { ok: true, value: Number(value) };
}

function percent(text: string | undefined, field: string): Parsed<number> {
  const value = (text ?? "").trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(value) || Number(value) > 100) return { ok: false, field, error: "Enter a percentage from 0 to 100." };
  return { ok: true, value: Number(value) };
}

const on = (v: string | undefined) => v === "on" || v === "true" || v === "1";

/** A vendor's delivery terms from its form. */
export function parseVendorDeliveryForm(form: Record<string, string>, currency: string): Parsed<VendorDelivery> {
  const decimals = currencyDecimals(currency);
  const by = form.by === "vendor" ? "vendor" : form.by === "app" ? "app" : null;
  if (!by) return { ok: false, field: "by", error: "Choose who delivers." };
  const feeKind = form.fee_kind === "per_km" ? "per_km" : "fixed";
  let fee = 0;
  let perKm = 0;
  if (by === "vendor") {
    const f = amount(form.fee, decimals, "fee", true);
    if (!f.ok) return f;
    fee = f.value!;
    if (feeKind === "per_km") {
      const k = amount(form.per_km, decimals, "per_km", true);
      if (!k.ok) return k;
      perKm = k.value!;
    }
  }
  const freeOver = amount(form.free_over, decimals, "free_over", false);
  if (!freeOver.ok) return freeOver;
  const minItems = count(form.min_items, "min_items");
  if (!minItems.ok) return minItems;
  const maxItems = count(form.max_items, "max_items");
  if (!maxItems.ok) return maxItems;
  if (minItems.value !== null && maxItems.value !== null && minItems.value > maxItems.value) return { ok: false, field: "max_items", error: "The most items can't be fewer than the fewest." };
  return {
    ok: true,
    value: { by, feeKind, fee, perKm, freeOver: by === "vendor" ? freeOver.value : null, minItems: minItems.value, maxItems: maxItems.value, pickup: on(form.pickup), scheduling: on(form.scheduling) },
  };
}

/** The app's couriers' terms from Studio › Delivery. */
export function parseCourierTermsForm(form: Record<string, string>, currency: string): Parsed<MarketCourierTerms> {
  const decimals = currencyDecimals(currency);
  const customerFee = form.customer_fee === "percent" ? "percent" : "delivery_prices";
  let pct = 0;
  let minFee = 0;
  let maxFee: number | null = null;
  if (customerFee === "percent") {
    const p = percent(form.percent, "percent");
    if (!p.ok) return p;
    pct = p.value;
    const min = amount(form.min_fee, decimals, "min_fee", false);
    if (!min.ok) return min;
    minFee = min.value ?? 0;
    const max = amount(form.max_fee, decimals, "max_fee", false);
    if (!max.ok) return max;
    maxFee = max.value;
    if (maxFee !== null && maxFee < minFee) return { ok: false, field: "max_fee", error: "The highest fee can't be under the lowest." };
  }
  const freeOver = amount(form.free_over, decimals, "free_over", false);
  if (!freeOver.ok) return freeOver;
  const kinds = ["none", "fixed", "percent", "per_km"] as const;
  const vendorCharge = (kinds as readonly string[]).includes(form.vendor_charge ?? "") ? (form.vendor_charge as MarketCourierTerms["vendorCharge"]) : "none";
  let vendorChargeValue = 0;
  if (vendorCharge === "percent") {
    const p = percent(form.vendor_charge_value, "vendor_charge_value");
    if (!p.ok) return p;
    vendorChargeValue = p.value;
  } else if (vendorCharge !== "none") {
    const a = amount(form.vendor_charge_value, decimals, "vendor_charge_value", true);
    if (!a.ok) return a;
    vendorChargeValue = a.value!;
  }
  return { ok: true, value: { customerFee, percent: pct, minFee, maxFee, freeOver: freeOver.value, vendorCharge, vendorChargeValue } };
}

/** A vendor's terms as its form shows them again. */
export function vendorDeliveryFormValues(terms: VendorDelivery, currency: string): Record<string, string> {
  const d = currencyDecimals(currency);
  return {
    by: terms.by,
    fee_kind: terms.feeKind,
    fee: fromMinor(terms.fee, d),
    per_km: fromMinor(terms.perKm, d),
    free_over: terms.freeOver === null ? "" : fromMinor(terms.freeOver, d),
    min_items: terms.minItems === null ? "" : String(terms.minItems),
    max_items: terms.maxItems === null ? "" : String(terms.maxItems),
    pickup: terms.pickup ? "on" : "",
    scheduling: terms.scheduling ? "on" : "",
  };
}
