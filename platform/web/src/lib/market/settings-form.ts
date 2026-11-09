import type { MarketAppSettings, PaymentProviderId } from "../data/types";
import { currencyDecimals, fromMinor, toMinor } from "./currency";
import type { Parsed } from "./delivery-forms";
import { marketSettingsOf } from "./settings";

/**
 * 115.12 Studio › Marketplace settings: the form the app owner fills for
 * the marketplace as a whole (country and currency, taxes, the ways to
 * pay, pick-up, orders for later, the club, the wallet, the weight
 * tolerance, the vendors' app, every product's photo). Amounts are typed in
 * the app's currency and kept in minor units, like the other market forms.
 */

export const MARKET_GATEWAYS: readonly PaymentProviderId[] = ["stripe", "kashier", "iyzico", "fawaterk", "paypal"];
export const MAX_DAYS_AHEAD = 14;
export const MAX_WEIGHT_TOLERANCE = 50;

const on = (v: string | undefined) => v === "on" || v === "true" || v === "1";

function whole(text: string | undefined, field: string, min: number, max: number): Parsed<number> {
  const value = (text ?? "").trim();
  if (!/^\d{1,3}$/.test(value) || Number(value) < min || Number(value) > max) return { ok: false, field, error: `Enter a whole number from ${min} to ${max}.` };
  return { ok: true, value: Number(value) };
}

/** The marketplace's settings from the Studio form; fields the form doesn't hold keep their current values. */
export function parseMarketSettingsForm(form: Record<string, string>, current: MarketAppSettings, fallbackCurrency: string): Parsed<MarketAppSettings> {
  const country = (form.country ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return { ok: false, field: "country", error: "Enter the country's two-letter code, like EG, TR or SA." };
  const currencyText = (form.currency ?? "").trim().toUpperCase();
  if (currencyText && !/^[A-Z]{3}$/.test(currencyText)) return { ok: false, field: "currency", error: "Enter the currency's three-letter code, like EGP, TRY or SAR, or leave it empty." };
  const currency = currencyText || null;
  const decimals = currencyDecimals(currency ?? fallbackCurrency);

  const rateText = (form.tax_rate ?? "").trim() || "0";
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(rateText) || Number(rateText) > 50) return { ok: false, field: "tax_rate", error: "Enter a tax rate from 0 to 50." };
  const taxLabel = (form.tax_label ?? "").trim().slice(0, 24) || "VAT";

  const gatewayText = (form.gateway ?? "").trim();
  const gateway = (MARKET_GATEWAYS as readonly string[]).includes(gatewayText) ? (gatewayText as PaymentProviderId) : null;
  if (gatewayText && !gateway) return { ok: false, field: "gateway", error: "Choose one of the gateways in the list." };
  const cash = on(form.cash);
  const cashMaxText = (form.cash_max ?? "").trim();
  let cashMax: number | null = null;
  if (cashMaxText) {
    const minor = toMinor(cashMaxText, decimals);
    if (minor === null || minor <= 0) return { ok: false, field: "cash_max", error: "Enter an amount like 2000, or leave it empty for no limit." };
    cashMax = minor;
  }
  const applePay = !!gateway && on(form.apple_pay);
  const googlePay = !!gateway && on(form.google_pay);
  if (!cash && !gateway && !on(form.wallet)) return { ok: false, field: "cash", error: "Keep at least one way to pay: cash, or a payment gateway." };

  const scheduling = on(form.scheduling);
  let daysAhead = current.scheduling.daysAhead;
  if (scheduling) {
    const days = whole(form.days_ahead, "days_ahead", 1, MAX_DAYS_AHEAD);
    if (!days.ok) return days;
    daysAhead = days.value;
  }
  const tolerance = whole((form.weight_tolerance ?? "").trim() || "0", "weight_tolerance", 0, MAX_WEIGHT_TOLERANCE);
  if (!tolerance.ok) return tolerance;

  return {
    ok: true,
    value: {
      ...current,
      country,
      currency,
      tax: { ratePercent: Number(rateText), included: on(form.tax_included), onDelivery: on(form.tax_on_delivery), label: taxLabel },
      payment: { gateway, cash, cashMax, applePay, googlePay },
      pickup: on(form.pickup),
      scheduling: { enabled: scheduling, daysAhead },
      club: on(form.club),
      wallet: on(form.wallet),
      weightTolerancePercent: tolerance.value,
      vendorApp: form.vendor_app === "bundle" ? "bundle" : "same",
      requirePhotos: on(form.require_photos),
    },
  };
}

/** The settings as the form shows them again. */
export function marketSettingsFormValues(settings: Parameters<typeof marketSettingsOf>[0], fallbackCurrency: string): Record<string, string> {
  const s = marketSettingsOf(settings);
  const decimals = currencyDecimals(s.currency ?? fallbackCurrency);
  const flag = (v: boolean | undefined) => (v ? "on" : "");
  return {
    country: s.country,
    currency: s.currency ?? "",
    tax_rate: String(s.tax.ratePercent),
    tax_label: s.tax.label,
    tax_included: flag(s.tax.included),
    tax_on_delivery: flag(s.tax.onDelivery),
    gateway: s.payment.gateway ?? "",
    cash: flag(s.payment.cash),
    cash_max: s.payment.cashMax === null ? "" : fromMinor(s.payment.cashMax, decimals),
    apple_pay: flag(s.payment.applePay),
    google_pay: flag(s.payment.googlePay),
    pickup: flag(s.pickup),
    scheduling: flag(s.scheduling.enabled),
    days_ahead: String(s.scheduling.daysAhead),
    club: flag(s.club),
    wallet: flag(s.wallet),
    weight_tolerance: String(s.weightTolerancePercent),
    vendor_app: s.vendorApp,
    require_photos: flag(s.requirePhotos !== false),
  };
}
