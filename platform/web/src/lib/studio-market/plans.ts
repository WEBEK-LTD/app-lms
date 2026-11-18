import type { MarketPlanPeriod, MarketPlanPrice, MarketTemplate } from "../data/types";

/**
 * 106.2 A template's plans: the designer offers any of 1, 3, 6, 12 or 24
 * months, or lifetime, each with its own price in US dollars, or makes the
 * template free. The market shows the lowest price per month among the
 * plans for a time ("From $X/mo"), "$X once" when there is only lifetime,
 * or "Free". A sale is split 75% to the designer and 25% to Yallapp (taxes,
 * the gateway's and the transfers' fees included in Yallapp's share).
 * A price change reaches only the next purchases and renewals: what was
 * bought keeps its period.
 */

export const MARKET_PERIODS: readonly MarketPlanPeriod[] = ["1m", "3m", "6m", "1y", "2y", "life"];

/** Months of each plan; lifetime has none (it never ends). */
export const PERIOD_MONTHS: Record<MarketPlanPeriod, number | null> = { "1m": 1, "3m": 3, "6m": 6, "1y": 12, "2y": 24, life: null };

/** Technical bounds for a plan's price, in US cents: $1 to $10,000. Not business rules: designers set their prices. */
export const PLAN_PRICE_LIMITS = { minCents: 100, maxCents: 1_000_000 } as const;

/** The designer's share of a sale, in percent; Yallapp keeps the rest. */
export const DESIGNER_SHARE_PERCENT = 75;

/** English texts the dashboard translates (studioMarket.known). */
export const PLAN_MESSAGES = {
  none: "Offer at least one plan, or make the template free.",
  price: "Enter a price from $1 to $10,000, like 24 or 24.50.",
} as const;

/**
 * The sale split: the designer's 75% and Yallapp's 25%, adding up to the
 * price, in whole cents with no floating point: 75% of the cents, a half
 * cent or more going to the designer ($1.02: $0.77 and $0.25). 106.11 The
 * designer's ledger keeps these amounts as the order has them.
 */
export function splitSale(grossCents: number): { designerCents: number; yallappCents: number } {
  if (!Number.isSafeInteger(grossCents) || grossCents < 0) throw new RangeError("A sale is a whole, positive number of cents");
  const scaled = grossCents * DESIGNER_SHARE_PERCENT;
  const rest = scaled % 100;
  const designerCents = (scaled - rest) / 100 + (rest >= 50 ? 1 : 0);
  return { designerCents, yallappCents: grossCents - designerCents };
}

/** "24", "24.5", "$24.50", "1,200": US cents, or null when it isn't a price. */
export function readUsd(text: string): number | null {
  const value = text.trim().replace(/^\$/, "").replace(/,/g, "").trim();
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(value)) return null;
  return Math.round(Number(value) * 100);
}

/** The price as typed back into the form: "24" or "24.50". */
export function usdInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/** The plans as sent: `free` alone, or the ticked periods each with a valid price. Errors by field (`plans`, `price_<period>`). */
export function readPlans(input: { free: boolean; offered: readonly string[]; prices: Partial<Record<string, string>> }): { ok: true; free: boolean; plans: MarketPlanPrice[] } | { ok: false; errors: Record<string, string> } {
  if (input.free) return { ok: true, free: true, plans: [] };
  const errors: Record<string, string> = {};
  const plans: MarketPlanPrice[] = [];
  for (const period of MARKET_PERIODS) {
    if (!input.offered.includes(period)) continue;
    const cents = readUsd(input.prices[period] ?? "");
    if (cents === null || cents < PLAN_PRICE_LIMITS.minCents || cents > PLAN_PRICE_LIMITS.maxCents) errors[`price_${period}`] = PLAN_MESSAGES.price;
    else plans.push({ period, cents });
  }
  if (!plans.length && !Object.keys(errors).length) errors.plans = PLAN_MESSAGES.none;
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, free: false, plans };
}

/** A template's plans checked again where they are used (a template saved before stage 2, or edited by hand): the valid ones, in order. */
export function offeredPlans(template: Pick<MarketTemplate, "free" | "plans">): MarketPlanPrice[] {
  if (template.free) return [];
  return MARKET_PERIODS.flatMap((period) => {
    const plan = template.plans.find((p) => p.period === period);
    return plan && Number.isInteger(plan.cents) && plan.cents >= PLAN_PRICE_LIMITS.minCents && plan.cents <= PLAN_PRICE_LIMITS.maxCents ? [plan] : [];
  });
}

/** The price for one month of a plan for a time, in cents (rounded); null for lifetime. */
export function perMonthCents(plan: MarketPlanPrice): number | null {
  const months = PERIOD_MONTHS[plan.period];
  return months ? Math.round(plan.cents / months) : null;
}

/** What a card shows: free, the lowest price per month ("From $X/mo"), or the lifetime price once ("$X once"). */
export type PriceTag = { kind: "free" } | { kind: "from"; cents: number } | { kind: "once"; cents: number };

export function priceTag(template: Pick<MarketTemplate, "free" | "plans">): PriceTag {
  const plans = offeredPlans(template);
  if (template.free || !plans.length) return { kind: "free" };
  const monthly = plans.flatMap((p) => {
    const cents = perMonthCents(p);
    return cents === null ? [] : [cents];
  });
  if (monthly.length) return { kind: "from", cents: Math.min(...monthly) };
  return { kind: "once", cents: plans.find((p) => p.period === "life")!.cents };
}

/** The end of a period that starts then; null for lifetime. Month ends keep to the month (31 Jan + 1 month: 28 or 29 Feb). */
export function periodEnd(start: Date, period: MarketPlanPeriod): Date | null {
  const months = PERIOD_MONTHS[period];
  if (!months) return null;
  const end = new Date(start);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + months);
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, last));
  return end;
}

/** A price kept left to right inside right-to-left words ("ادفع $24", not "24$"): isolated for Arabic, as it is otherwise. */
export function ltr(text: string, lang: string): string {
  return lang === "ar" ? `\u2066${text}\u2069` : text;
}

const usd = new Map<boolean, Intl.NumberFormat>();

/** "$24" or "$24.50". */
export function formatUsd(cents: number): string {
  const whole = cents % 100 === 0;
  let formatter = usd.get(whole);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol", minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 });
    usd.set(whole, formatter);
  }
  return formatter.format(cents / 100);
}
