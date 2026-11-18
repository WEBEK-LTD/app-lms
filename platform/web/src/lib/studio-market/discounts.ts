import { localToUtc } from "../bookings/time";
import type { MarketDiscount, MarketDiscountKind, MarketPlanPeriod, MarketPlanPrice, MarketTemplate, TemplateOrderDiscount } from "../data/types";
import { MARKET_PERIODS, offeredPlans, PERIOD_MONTHS, perMonthCents, PLAN_PRICE_LIMITS, readUsd, type PriceTag } from "./plans";

/**
 * 106.12 Discounts on Studio Market, as the owner decided: price drops and
 * flash sales the market applies by itself, and coupon codes the designer
 * gives out, each an amount or a percentage off some or all of a template's
 * plans (lifetime too), from a start to an end. Nothing stacks: the buyer
 * gets the better of the automatic price (the best drop or flash sale on
 * the plan) or their code; a tie keeps the automatic price, so the code
 * isn't used up. A discounted price never goes below the plans' lowest
 * price ($1): the free flow is a free licence that never ends, and Kashier
 * takes no payment of nothing, so a discount never makes a paid plan free.
 * The order keeps the price paid (its gross, which the 75/25 split is of)
 * and what the plan cost before.
 *
 * Times are instants (UTC): a discount counts from its start (inclusive)
 * until its end (exclusive). A coupon's usage limit counts paid orders; an
 * order being paid holds its use while its payment page may still be paid
 * (COUPON_HOLD_MS), so two buyers can't both take the last one.
 */

export const DISCOUNT_KINDS: readonly MarketDiscountKind[] = ["drop", "flash", "coupon"];

/** Technical bounds: a code's length, a flash sale's longest run, a coupon's most uses. */
export const DISCOUNT_LIMITS = { codeMin: 3, codeMax: 24, flashDays: 14, uses: 100_000 } as const;

/** An order being paid holds its coupon's use this long: its payment page takes the payment for an hour, and the confirmation may come later. */
export const COUPON_HOLD_MS = 2 * 60 * 60 * 1000;

const DAY = 24 * 60 * 60 * 1000;

/** English texts the dashboard translates (marketDiscounts.known). */
export const DISCOUNT_MESSAGES = {
  kind: "Choose a price drop, a flash sale or a coupon code.",
  offType: "Choose an amount or a percentage off.",
  percent: "Enter a percentage from 1 to 100.",
  amount: "Enter an amount from $0.01 to $10,000, like 5 or 4.50.",
  plans: "Choose at least one plan, or all plans.",
  start: "Enter the start as a date and time, or leave it empty to start now.",
  end: "Enter an end after the start, later than now.",
  flashEnd: "A flash sale needs an end.",
  flashLength: "A flash sale runs up to 14 days.",
  code: "Use 3 to 24 letters (A to Z), numbers or dashes for the code.",
  codeTaken: "This template has this code already. Choose another one.",
  limit: "Enter how many times it can be used, from 1 to 100,000, or leave it empty for no limit.",
  notPaid: "Discounts are for templates with paid plans.",
  saved: "Saved. It works on its own from its start.",
  ended: "Ended. Buyers pay the plan's own price again.",
  deleted: "Deleted.",
  gone: "This discount was changed meanwhile. Reload the page.",
  // The buyer's code at checkout
  unknown: "We don't know this code. Check it and try again.",
  expired: "This code has expired.",
  notYet: "This code isn't valid yet.",
  usedUp: "This code is used up.",
  held: "This code's last use is in a payment someone is making now. Try again in a while.",
  wrongPlan: "This code isn't for the plan you chose.",
  priceChanged: "The price changed. Check it, then pay again.",
} as const;

export type CodeProblem = "unknown" | "expired" | "not_yet" | "used_up" | "held";

export const CODE_PROBLEM_MESSAGES: Record<CodeProblem, string> = {
  unknown: DISCOUNT_MESSAGES.unknown,
  expired: DISCOUNT_MESSAGES.expired,
  not_yet: DISCOUNT_MESSAGES.notYet,
  used_up: DISCOUNT_MESSAGES.usedUp,
  held: DISCOUNT_MESSAGES.held,
};

/**
 * A code as the buyer typed it, the way it is kept: upper case, without
 * spaces, Arabic and Persian digits as 0–9, Turkish İ and ı as I, full-width
 * letters as they are in ASCII.
 */
export function normalizeCode(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\s+/g, "")
    .replace(/[İı]/g, "I")
    .toUpperCase();
}

const CODE = /^[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?$/;

/** Whether a normalized code is one a designer may give out. */
export function validCode(code: string): boolean {
  return code.length >= DISCOUNT_LIMITS.codeMin && code.length <= DISCOUNT_LIMITS.codeMax && CODE.test(code);
}

/** Whether it counts at `now`: from its start (inclusive) until its end (exclusive). */
export function discountLive(d: Pick<MarketDiscount, "startsAt" | "endsAt">, now: Date): boolean {
  const t = now.getTime();
  return (!d.startsAt || d.startsAt.getTime() <= t) && (!d.endsAt || t < d.endsAt.getTime());
}

export type DiscountState = "scheduled" | "live" | "ended" | "used_up";

/** Where it is for the designer's list: still to start, running, ended, or (a coupon) used up. */
export function discountState(d: Pick<MarketDiscount, "startsAt" | "endsAt" | "usageLimit">, now: Date, uses = 0): DiscountState {
  if (d.endsAt && d.endsAt.getTime() <= now.getTime()) return "ended";
  if (d.usageLimit !== null && uses >= d.usageLimit) return "used_up";
  if (d.startsAt && d.startsAt.getTime() > now.getTime()) return "scheduled";
  return "live";
}

/** Whether it is for the plan: its plans, or every plan. */
export function discountFor(d: Pick<MarketDiscount, "plans">, period: MarketPlanPeriod): boolean {
  return d.plans === null || d.plans.includes(period);
}

/** What it takes off a price, in cents: a percentage rounded to the cent, or its amount. */
export function offCents(listCents: number, d: Pick<MarketDiscount, "offType" | "offValue">): number {
  return d.offType === "percent" ? Math.round((listCents * d.offValue) / 100) : d.offValue;
}

/** A price after a discount, never below the plans' lowest price ($1): a discount never makes a paid plan free. */
export function discountedCents(listCents: number, d: Pick<MarketDiscount, "offType" | "offValue">): number {
  return Math.max(Math.min(listCents, PLAN_PRICE_LIMITS.minCents), listCents - offCents(listCents, d));
}

/** Whether the discount reaches the lowest price on this price: what it takes off is cut short. */
export function reachesFloor(listCents: number, d: Pick<MarketDiscount, "offType" | "offValue">): boolean {
  return listCents - offCents(listCents, d) < PLAN_PRICE_LIMITS.minCents;
}

/** A plan's price with one discount on it. */
export interface PlanDeal {
  discount: MarketDiscount;
  /** The price after it. */
  cents: number;
}

/** A tie between two automatic prices: the one that lasts longer (no end lasts longest), then the older. */
function lastsLonger(a: MarketDiscount, b: MarketDiscount): boolean {
  const end = (d: MarketDiscount) => d.endsAt?.getTime() ?? Number.POSITIVE_INFINITY;
  return end(a) !== end(b) ? end(a) > end(b) : a.createdAt.getTime() !== b.createdAt.getTime() ? a.createdAt.getTime() < b.createdAt.getTime() : a.id < b.id;
}

/** The plan's automatic price now: the lowest a running drop or flash sale on it gives, or null when none lowers it. */
export function bestAutomatic(plan: MarketPlanPrice, discounts: readonly MarketDiscount[], now: Date): PlanDeal | null {
  let best: PlanDeal | null = null;
  for (const d of discounts) {
    if (d.kind === "coupon" || !discountLive(d, now) || !discountFor(d, plan.period)) continue;
    const cents = discountedCents(plan.cents, d);
    if (cents >= plan.cents) continue;
    if (!best || cents < best.cents || (cents === best.cents && lastsLonger(d, best.discount))) best = { discount: d, cents };
  }
  return best;
}

/** Why a code can't be used now (the plan aside), or null: `uses` is its paid orders. */
export function couponProblem(coupon: MarketDiscount | null, uses: number, now: Date): Exclude<CodeProblem, "held"> | null {
  if (!coupon || coupon.kind !== "coupon") return "unknown";
  if (coupon.endsAt && coupon.endsAt.getTime() <= now.getTime()) return "expired";
  if (coupon.startsAt && coupon.startsAt.getTime() > now.getTime()) return "not_yet";
  if (coupon.usageLimit !== null && uses >= coupon.usageLimit) return "used_up";
  return null;
}

/** A plan's price at checkout: what it costs, the automatic price, the code's, and which one the buyer gets. */
export interface PlanQuote {
  period: MarketPlanPeriod;
  listCents: number;
  auto: PlanDeal | null;
  /** The code's price on this plan; null without a code, or when the code isn't for this plan. */
  code: PlanDeal | null;
  /** A code was given that isn't for this plan. */
  wrongPlan: boolean;
  /** What the buyer pays, and why. */
  cents: number;
  wins: "auto" | "code" | "none";
  /** What the order keeps; null when nothing came off. */
  discount: TemplateOrderDiscount | null;
}

/** Nothing stacks: the better of the automatic price or the code's; a tie keeps the automatic price (the code isn't used). */
export function quotePlan(plan: MarketPlanPrice, automatic: readonly MarketDiscount[], coupon: MarketDiscount | null, now: Date): PlanQuote {
  const auto = bestAutomatic(plan, automatic, now);
  const fits = coupon !== null && coupon.kind === "coupon" && discountFor(coupon, plan.period);
  let code: PlanDeal | null = null;
  if (fits && coupon) {
    const cents = discountedCents(plan.cents, coupon);
    if (cents < plan.cents) code = { discount: coupon, cents };
  }
  const autoCents = auto?.cents ?? plan.cents;
  const wins = code && code.cents < autoCents ? "code" : auto ? "auto" : "none";
  const chosen = wins === "code" ? code : wins === "auto" ? auto : null;
  return {
    period: plan.period,
    listCents: plan.cents,
    auto,
    code,
    wrongPlan: coupon !== null && !fits,
    cents: chosen?.cents ?? plan.cents,
    wins,
    discount: chosen ? { id: chosen.discount.id, kind: chosen.discount.kind, code: chosen.discount.code, listCents: plan.cents, offCents: plan.cents - chosen.cents } : null,
  };
}

/** What a card shows with the automatic discounts: the price tag, the one it replaces (struck through), and a running flash sale's end. */
export interface MarketPrice {
  tag: PriceTag;
  /** The tag's cents before the discounts (per month, or once), when they lower it; else null. */
  wasCents: number | null;
  /** The soonest end of a flash sale that gives one of the plans its price now; null when none does. */
  flashEndsAt: Date | null;
}

/**
 * "From $X/mo" with the discounts: the lowest per month of the plans for a
 * time at their automatic prices, struck through against the lowest before
 * them; "$X once" for lifetime only; "Free".
 */
export function marketPrice(template: Pick<MarketTemplate, "free" | "plans">, discounts: readonly MarketDiscount[], now: Date): MarketPrice {
  const plans = offeredPlans(template);
  if (template.free || !plans.length) return { tag: { kind: "free" }, wasCents: null, flashEndsAt: null };
  const deals = plans.map((plan) => ({ plan, deal: bestAutomatic(plan, discounts, now) }));
  const flashes = deals.flatMap(({ deal }) => (deal?.discount.kind === "flash" && deal.discount.endsAt ? [deal.discount.endsAt.getTime()] : []));
  const flashEndsAt = flashes.length ? new Date(Math.min(...flashes)) : null;
  const periodic = deals.filter(({ plan }) => PERIOD_MONTHS[plan.period] !== null);
  if (periodic.length) {
    const before = Math.min(...periodic.map(({ plan }) => perMonthCents(plan)!));
    const after = Math.min(...periodic.map(({ plan, deal }) => perMonthCents({ period: plan.period, cents: deal?.cents ?? plan.cents })!));
    return { tag: { kind: "from", cents: after }, wasCents: after < before ? before : null, flashEndsAt };
  }
  const life = deals.find(({ plan }) => plan.period === "life")!;
  return { tag: { kind: "once", cents: life.deal?.cents ?? life.plan.cents }, wasCents: life.deal ? life.plan.cents : null, flashEndsAt };
}

// ——— The designer's form ———

export interface DiscountForm {
  kind: string;
  offType: string;
  /** "20" or "20%". */
  percent: string;
  /** "5", "$4.50". */
  amount: string;
  /** Every plan the template offers (also those added later), or only `plans`. */
  allPlans: boolean;
  plans: readonly string[];
  /** The form's `datetime-local` values ("2026-11-20T09:00"), in `zone`. */
  startsAt: string;
  endsAt: string;
  code: string;
  limit: string;
  zone: string;
}

export type DiscountValue = Pick<MarketDiscount, "kind" | "code" | "offType" | "offValue" | "plans" | "startsAt" | "endsAt" | "usageLimit">;

/** A `datetime-local` value in a time zone as its instant; null when it isn't one. */
export function localDateTime(value: string, zone: string): Date | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value.trim());
  if (!match) return null;
  const at = localToUtc(match[1]!, match[2]!, zone);
  return Number.isNaN(at.getTime()) ? null : at;
}

/** The form checked: a discount to save, or errors by field. A flash sale without a start starts now. */
export function readDiscount(input: DiscountForm, template: Pick<MarketTemplate, "free" | "plans">, now: Date): { ok: true; value: DiscountValue } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const offered = offeredPlans(template).map((p) => p.period);
  if (!offered.length) return { ok: false, errors: { form: DISCOUNT_MESSAGES.notPaid } };
  const kind = DISCOUNT_KINDS.find((k) => k === input.kind);
  if (!kind) errors.kind = DISCOUNT_MESSAGES.kind;

  let offType: MarketDiscount["offType"] | null = null;
  let offValue = 0;
  if (input.offType === "percent") {
    const text = input.percent.trim().replace(/%$/, "").trim();
    const value = /^\d{1,3}$/.test(text) ? Number(text) : NaN;
    if (!Number.isInteger(value) || value < 1 || value > 100) errors.percent = DISCOUNT_MESSAGES.percent;
    else {
      offType = "percent";
      offValue = value;
    }
  } else if (input.offType === "amount") {
    const cents = readUsd(input.amount);
    if (cents === null || cents < 1 || cents > PLAN_PRICE_LIMITS.maxCents) errors.amount = DISCOUNT_MESSAGES.amount;
    else {
      offType = "amount";
      offValue = cents;
    }
  } else errors.offType = DISCOUNT_MESSAGES.offType;

  const chosen = MARKET_PERIODS.filter((p) => offered.includes(p) && input.plans.includes(p));
  const plans = input.allPlans ? null : chosen;
  if (plans && !plans.length) errors.plans = DISCOUNT_MESSAGES.plans;

  const start = input.startsAt.trim() ? localDateTime(input.startsAt, input.zone) : null;
  const end = input.endsAt.trim() ? localDateTime(input.endsAt, input.zone) : null;
  if (input.startsAt.trim() && !start) errors.startsAt = DISCOUNT_MESSAGES.start;
  if (input.endsAt.trim() && !end) errors.endsAt = DISCOUNT_MESSAGES.end;
  // A flash sale has both: no start is now.
  const startsAt = start ?? (kind === "flash" ? now : null);
  if (kind === "flash" && !input.endsAt.trim()) errors.endsAt = DISCOUNT_MESSAGES.flashEnd;
  if (end && (end.getTime() <= now.getTime() || (startsAt && end.getTime() <= startsAt.getTime()))) errors.endsAt = DISCOUNT_MESSAGES.end;
  else if (kind === "flash" && end && startsAt && end.getTime() - Math.max(startsAt.getTime(), now.getTime()) > DISCOUNT_LIMITS.flashDays * DAY) errors.endsAt = DISCOUNT_MESSAGES.flashLength;

  let code: string | null = null;
  let usageLimit: number | null = null;
  if (kind === "coupon") {
    code = normalizeCode(input.code);
    if (!validCode(code)) errors.code = DISCOUNT_MESSAGES.code;
    const limit = input.limit.trim();
    if (limit) {
      const value = /^\d{1,6}$/.test(limit.replace(/,/g, "")) ? Number(limit.replace(/,/g, "")) : NaN;
      if (!Number.isInteger(value) || value < 1 || value > DISCOUNT_LIMITS.uses) errors.limit = DISCOUNT_MESSAGES.limit;
      else usageLimit = value;
    }
  }
  if (Object.keys(errors).length || !kind || !offType) return { ok: false, errors };
  return { ok: true, value: { kind, code, offType, offValue, plans, startsAt, endsAt: end, usageLimit } };
}

/** "20% off" or "$4 off" parts: the percentage, or the amount in cents. */
export function offLabel(d: Pick<MarketDiscount, "offType" | "offValue">): { percent: number } | { cents: number } {
  return d.offType === "percent" ? { percent: d.offValue } : { cents: d.offValue };
}
