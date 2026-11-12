import { couponPrice } from "@/lib/billing/coupons";
import { formatMoney, loweredOffer, offerFor, type Money } from "@/lib/billing/prices";
import type { OccasionRecord, PaymentProviderId } from "@/lib/data/types";
import { formatDate, formatNumber, type Lang } from "@/i18n";
import { newOccasion, occasionCoversPlan, occasionDaysLeft, occasionState, occasionWindow, type OccasionState } from "@/lib/occasions";
import { planPriceOf, type PlanInfo, type PriceView } from "@/lib/plans";
import { providerTakes } from "@/lib/payments/provider";

/**
 * 124 What Black Friday's page shows, worked out from the saved occasion
 * and the plans, without reading anything: the state, the days, and each
 * plan's price with the offer, computed the way the payment form computes
 * it (app/actions/billing.ts): the plan's price with Yallapp's gateway
 * (`offerFor`), the coupon's percentage off the charged amount
 * (`couponPrice`), and the shown price lowered in the same proportion
 * (`loweredOffer`). So the page never shows a price the checkout won't charge.
 */

/**
 * The occasion the page shows when the team hasn't saved one yet (Admin ›
 * Occasions): Black Friday 2026 with lib/occasions' own defaults (all of
 * November in Istanbul, 50%, BLACKFRIDAY50, every plan). Only a fallback:
 * once the team saves an occasion, its days, percentage, code and plans
 * are the page's. It stays 2026, so a later year shows "over" until the
 * team runs the occasion again.
 */
export const FALLBACK_BLACK_FRIDAY: OccasionRecord = newOccasion("black_friday", 2026, "black-friday-2026-default", "site", new Date("2026-10-01T00:00:00Z"));

export interface OccasionView {
  occasion: OccasionRecord;
  state: OccasionState;
  /** The first moment and the last of the offer, Istanbul's whole days. */
  start: Date;
  end: Date;
  daysLeft: number;
  /**
   * The code is shown while the offer is on or about to start: the email and the terms name it anyway,
   * and before the first day the page says from when it works (the payment form refuses it until then).
   */
  codeShown: boolean;
  /** Live or not started yet: the countdown and the prices with the offer. */
  on: boolean;
}

export function occasionView(occasion: OccasionRecord, now: Date): OccasionView {
  const state = occasionState(occasion, now);
  const { start, end } = occasionWindow(occasion);
  return { occasion, state, start, end, daysLeft: occasionDaysLeft(occasion, now), codeShown: state === "live" || state === "upcoming", on: state === "live" || state === "upcoming" };
}

/** A plan's price with the occasion: what is shown and what is charged, before and after. */
export interface OccasionPlanPrice {
  plan: PlanInfo;
  period: "month" | "year";
  /** The normal price, in the visitor's currency. */
  full: Money;
  /** With the code; null when the plan isn't in the offer. */
  offer: Money | null;
  /** What the card is charged with the code (the gateway's currency). */
  charged: Money;
  chargedWithCode: number | null;
}

/**
 * The plan's price with the occasion, as the payment form charges it; null
 * when the plan isn't paid by card (on request, or a gateway that can't
 * charge its currency), like `cardPlans`.
 */
export function occasionPlanPrice(plan: PlanInfo, occasion: Pick<OccasionRecord, "percent" | "plans">, view: PriceView, provider: PaymentProviderId): OccasionPlanPrice | null {
  const price = planPriceOf(plan);
  if (!price) return null;
  const offer = offerFor(price, view.display, provider, view.egpPerUsd);
  if (!offer || !providerTakes(provider, offer.charged.currency)) return null;
  const period = plan.billingMonths === 1 ? "month" : "year";
  if (!occasionCoversPlan(occasion, plan.id)) return { plan, period, full: offer.shown, offer: null, charged: offer.charged, chargedWithCode: null };
  const withCode = couponPrice({ kind: "percent", percent: occasion.percent }, offer.charged);
  if (!withCode || withCode.discountCents === 0) return { plan, period, full: offer.shown, offer: null, charged: offer.charged, chargedWithCode: null };
  return { plan, period, full: offer.shown, offer: loweredOffer(offer, withCode.amountCents).shown, charged: offer.charged, chargedWithCode: withCode.amountCents };
}

/** "EGP 1,500" saved: the difference between the two shown prices. */
export function savedText(price: OccasionPlanPrice): string | null {
  return price.offer ? formatMoney({ cents: price.full.cents - price.offer.cents, currency: price.full.currency }) : null;
}

/** "50%", Turkish "%50". */
export function percentText(lang: Lang, percent: number): string {
  const n = formatNumber(lang, percent);
  return lang === "tr" ? `%${n}` : `${n}%`;
}

const DAY_FORMAT: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" };

/** A saved day (`2026-11-01`) as the page writes it: "1 November 2026", "1 نوفمبر 2026", "1 Kasım 2026". */
export function dayText(lang: Lang, day: string): string {
  return formatDate(lang, new Date(`${day}T12:00:00Z`), DAY_FORMAT);
}

/** The occasion's days: "1–30 November 2026" (one month), else "30 November – 5 December 2026". */
export function daysText(lang: Lang, occasion: Pick<OccasionRecord, "startsOn" | "endsOn">): string {
  if (occasion.startsOn === occasion.endsOn) return dayText(lang, occasion.startsOn);
  const format = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : lang === "ar" ? "ar-EG-u-nu-latn" : "tr-TR", DAY_FORMAT);
  return format.formatRange(new Date(`${occasion.startsOn}T12:00:00Z`), new Date(`${occasion.endsOn}T12:00:00Z`)).replace(/\s*–\s*/, " – ").replace(/(\d) – (\d)/, "$1–$2");
}

/** The placeholders every text of the page can use. */
export function occasionValues(lang: Lang, occasion: OccasionRecord): Record<string, string> {
  return {
    percent: formatNumber(lang, occasion.percent),
    code: occasion.couponCode,
    from: dayText(lang, occasion.startsOn),
    to: dayText(lang, occasion.endsOn),
    days: daysText(lang, occasion),
    year: occasion.startsOn.slice(0, 4),
  };
}
