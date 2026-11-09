import type { Cuisine, DeliverySettings, MapTilesSetting, MarketAppSettings, VendorKind } from "../data/types";
import { mapConfigJson } from "../delivery/service";
import { DEFAULT_FOOD_TIMEZONE } from "../food/service";
import { currencyDecimals, fromMinor } from "./currency";
import type { MarketPaymentSettings } from "./payments";

/**
 * 115 A marketplace app's settings (Studio › Settings, 115.12): the country
 * and currency the owner chose, taxes, the ways to pay, pick-up, orders for
 * later, the club, the wallet. Kept with the Delivery settings; absent
 * fields take these defaults, so 105.1's food apps grow into marketplaces
 * with nothing to set first.
 */

export const DEFAULT_MARKET_SETTINGS: MarketAppSettings = {
  country: "EG",
  currency: null,
  tax: { ratePercent: 0, included: true, onDelivery: false, label: "VAT" },
  payment: { gateway: null, cash: true, cashMax: null, applePay: false, googlePay: false },
  pickup: true,
  scheduling: { enabled: true, daysAhead: 3 },
  club: true,
  wallet: true,
  weightTolerancePercent: 10,
  vendorApp: "same",
  // 115 Every product needs its photo unless the owner turns it off.
  requirePhotos: true,
};

/** 115.18 Places' own coupons: on unless the owner turned them off, with no largest percentage unless set. */
export function vendorCouponsOf(settings: Pick<MarketAppSettings, "vendorCoupons">): { enabled: boolean; maxPercent: number | null } {
  return { enabled: settings.vendorCoupons?.enabled !== false, maxPercent: settings.vendorCoupons?.maxPercent ?? null };
}

export function marketSettingsOf(settings: Pick<DeliverySettings, "marketApp">): MarketAppSettings {
  const s = settings.marketApp;
  if (!s) return DEFAULT_MARKET_SETTINGS;
  return {
    ...DEFAULT_MARKET_SETTINGS,
    ...s,
    tax: { ...DEFAULT_MARKET_SETTINGS.tax, ...s.tax },
    payment: { ...DEFAULT_MARKET_SETTINGS.payment, ...s.payment },
    scheduling: { ...DEFAULT_MARKET_SETTINGS.scheduling, ...s.scheduling },
  };
}

/** The marketplace's currency: the owner's choice, else the Delivery settings'. */
export function marketCurrency(settings: Pick<DeliverySettings, "currency" | "marketApp">): string {
  return settings.marketApp?.currency ?? settings.currency;
}

export function marketTimezone(settings: Pick<DeliverySettings, "timezone">): string {
  return settings.timezone ?? DEFAULT_FOOD_TIMEZONE;
}

/** The payments layer's view of the settings (lib/market/payments.ts). */
export function paymentSettingsOf(settings: MarketAppSettings, delivery: Pick<DeliverySettings, "cash">): MarketPaymentSettings {
  return { ...settings.payment, cash: settings.payment.cash && delivery.cash };
}

/** `Config.marketplace` (MarketConfig in the contract). */
export function marketConfigJson(
  delivery: DeliverySettings,
  input: { kinds: VendorKind[]; departments: { id: string; name: string; kind: VendorKind; imageUrl: string | null }[]; canTakeCards: boolean; map: MapTilesSetting | null },
) {
  const s = marketSettingsOf(delivery);
  const currency = marketCurrency(delivery);
  const decimals = currencyDecimals(currency);
  const online = !!s.payment.gateway && input.canTakeCards;
  const cuisines: Cuisine[] = delivery.cuisines ?? [];
  return {
    country: s.country,
    currency,
    currency_decimals: decimals,
    timezone: marketTimezone(delivery),
    kinds: input.kinds.length ? input.kinds : (["restaurant"] as VendorKind[]),
    categories: [
      ...cuisines.map((c) => ({ id: c.id, name: c.name, kind: "restaurant" as VendorKind, image_url: null })),
      ...input.departments.map((d) => ({ id: d.id, name: d.name, kind: d.kind, image_url: d.imageUrl })),
    ],
    payment: {
      cash: s.payment.cash && delivery.cash,
      card: online,
      apple_pay: online && s.payment.applePay,
      google_pay: online && s.payment.googlePay,
      wallet: s.wallet,
      cash_max: s.payment.cashMax === null ? null : fromMinor(s.payment.cashMax, decimals),
    },
    tax: { label: s.tax.label, included: s.tax.included },
    pickup: s.pickup,
    scheduling: { enabled: s.scheduling.enabled, days_ahead: s.scheduling.daysAhead },
    club: s.club,
    wallet: s.wallet,
    weight_tolerance_percent: s.weightTolerancePercent,
    courier_app: delivery.courierApp,
    vendor_app: s.vendorApp,
    map: mapConfigJson(input.map),
  };
}
