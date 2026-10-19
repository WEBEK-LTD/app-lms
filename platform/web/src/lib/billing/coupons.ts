import { formatCents, parsePrice } from "../catalog/money";
import type { DataStore } from "../data/store";
import type { CatalogCurrency, Client, Coupon, CouponDiscount, CouponRedemption, License } from "../data/types";
import { PLANS, type Plan, type PlanInfo } from "../plans";
import type { RateLimitRule } from "../rate-limit";
import type { Money } from "./prices";

/**
 * Coupons lower a plan's card payment (roadmap 11.6). The server works out
 * the price from the plan and the coupon each time; the browser only sends
 * the code. A coupon that takes the whole price activates or extends the
 * plan without a card payment.
 *
 * 52 A coupon lowers what is charged (pounds with Kashier): a percentage
 * of it, or a fixed amount in its currency. The price shown in dollars
 * outside Egypt is lowered in the same proportion (lib/billing/prices.ts).
 */

/** iyzico doesn't take card payments under 1.00 in any currency (37 the same minimum is kept for Kashier and Fawaterk); a smaller discounted price is raised to this. */
export const MIN_CARD_CENTS = 100;

/** A pending redemption holds its use this long (the provider's page expires within it). */
export const PENDING_HOLD_MS = 60 * 60 * 1000;

/** Coupon codes a client may try, so codes can't be guessed. */
export const COUPON_CHECK_LIMIT: RateLimitRule = { name: "coupon-check:client", limit: 20, windowSeconds: 60 * 60 };

export function normalizeCouponCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}

export const COUPON_CODE = /^[A-Z0-9][A-Z0-9_-]{2,39}$/;

export interface CouponPrice {
  fullCents: number;
  discountCents: number;
  /** What the client pays; 0 when the coupon takes the whole price. */
  amountCents: number;
}

/** 52 The charged price with the coupon; null when the coupon has no amount in the charge's currency. */
export function couponPrice(discount: CouponDiscount, charged: Money): CouponPrice | null {
  const full = charged.cents;
  let off: number;
  if (discount.kind === "percent") {
    off = Math.round((full * discount.percent) / 100);
  } else {
    const amount = discount.amounts[charged.currency];
    if (amount === undefined) return null;
    off = amount;
  }
  off = Math.min(Math.max(off, 0), full);
  let amount = full - off;
  // Never below what the providers take: a price that isn't free is at least the minimum.
  if (amount > 0 && amount < MIN_CARD_CENTS) amount = Math.min(MIN_CARD_CENTS, full);
  return { fullCents: full, discountCents: full - amount, amountCents: amount };
}

/** Uses that count against the limits: redeemed ones, and pending ones still on the provider's page. */
export function countedRedemptions(redemptions: CouponRedemption[], now: Date): CouponRedemption[] {
  return redemptions.filter((r) => r.status === "redeemed" || (r.status === "pending" && now.getTime() - r.createdAt.getTime() < PENDING_HOLD_MS));
}

export type CouponCheck = ({ ok: true; coupon: Coupon } & CouponPrice) | { ok: false; error: string };

const PERIOD_NAME = { 1: "monthly", 12: "yearly" } as const;

/**
 * Whether a client can use a coupon on a plan now, and the price. All the
 * rules are checked here, on the server: active, dates, plans, periods,
 * first payment only and the limits (`redemptions` are the coupon's own).
 * "First payment only" is per app: with `license` given (the paid app's own,
 * null while that app isn't activated yet), a second app's first payment
 * counts too; without it, the account's first activation decides. Uses per
 * client stay per client (account), whichever app they paid for.
 */
export function checkCoupon(input: {
  coupon: Coupon | null;
  plan: PlanInfo;
  /** 52 What the plan costs with Yallapp's gateway, before the coupon. */
  charged: Money;
  client: Pick<Client, "id" | "activatedAt">;
  license?: Pick<License, "id"> | null;
  redemptions: CouponRedemption[];
  now: Date;
}): CouponCheck {
  const { coupon, plan, client, now } = input;
  if (!coupon || !coupon.active) return { ok: false, error: "This coupon code isn't valid." };
  if (coupon.validFrom && coupon.validFrom.getTime() > now.getTime()) return { ok: false, error: "This coupon isn't valid yet." };
  if (coupon.validUntil && coupon.validUntil.getTime() < now.getTime()) return { ok: false, error: "This coupon has expired." };
  if (coupon.plans && !coupon.plans.includes(plan.id)) return { ok: false, error: `This coupon doesn't apply to the ${plan.name} plan.` };
  if (coupon.periods && !coupon.periods.includes(plan.billingMonths)) {
    return { ok: false, error: `This coupon doesn't apply to ${PERIOD_NAME[plan.billingMonths]} billing.` };
  }
  const paidBefore = input.license !== undefined ? input.license !== null : client.activatedAt !== null;
  if (coupon.firstPaymentOnly && paidBefore) return { ok: false, error: "This coupon is for a first payment only." };
  const counted = countedRedemptions(input.redemptions, now);
  if (coupon.maxRedemptions !== null && counted.length >= coupon.maxRedemptions) return { ok: false, error: "This coupon has been used up." };
  if (coupon.maxPerClient !== null && counted.filter((r) => r.clientId === client.id).length >= coupon.maxPerClient) {
    return { ok: false, error: "You've already used this coupon." };
  }
  const price = couponPrice(coupon.discount, input.charged);
  if (!price || price.discountCents === 0) return { ok: false, error: `This coupon doesn't apply to payments in ${input.charged.currency}.` };
  return { ok: true, coupon, ...price };
}

/** Looks the code up (in any case) and checks it for this client, the app's license (see checkCoupon) and plan. */
export async function findCoupon(
  store: Pick<DataStore, "getCouponByCode" | "listCouponRedemptions">,
  input: { code: string; plan: PlanInfo; charged: Money; client: Pick<Client, "id" | "activatedAt">; license?: Pick<License, "id"> | null; now: Date },
): Promise<CouponCheck> {
  const code = normalizeCouponCode(input.code);
  const coupon = COUPON_CODE.test(code) ? await store.getCouponByCode(code) : null;
  const redemptions = coupon ? await store.listCouponRedemptions({ couponId: coupon.id }) : [];
  return checkCoupon({ coupon, plan: input.plan, charged: input.charged, client: input.client, license: input.license, redemptions, now: input.now });
}

/** The admin's coupon form: text values, checkbox groups as comma-separated values. */
export interface CouponFormValues {
  code: string;
  note: string;
  kind: "percent" | "fixed";
  percent: string;
  /** 52 Off a charge in pounds (Kashier, Fawaterk), and off one in dollars (iyzico). */
  amountEGP: string;
  amountUSD: string;
  plans: string;
  periods: string;
  validFrom: string;
  validUntil: string;
  maxRedemptions: string;
  maxPerClient: string;
  firstPaymentOnly: boolean;
  active: boolean;
}

export const NEW_COUPON: CouponFormValues = {
  code: "",
  note: "",
  kind: "percent",
  percent: "",
  amountEGP: "",
  amountUSD: "",
  plans: "starter,pro",
  periods: "1,12",
  validFrom: "",
  validUntil: "",
  maxRedemptions: "",
  maxPerClient: "1",
  firstPaymentOnly: false,
  active: true,
};

/** A coupon as the admin's form shows it (amounts as decimals, days as YYYY-MM-DD). */
export function couponFormValues(coupon: Coupon): CouponFormValues {
  const amount = (currency: CatalogCurrency) =>
    coupon.discount.kind === "fixed" && coupon.discount.amounts[currency] !== undefined ? (coupon.discount.amounts[currency]! / 100).toFixed(2) : "";
  return {
    code: coupon.code,
    note: coupon.note,
    kind: coupon.discount.kind,
    percent: coupon.discount.kind === "percent" ? String(coupon.discount.percent) : "",
    amountEGP: amount("EGP"),
    amountUSD: amount("USD"),
    plans: (coupon.plans ?? ALL_PLANS).join(","),
    periods: (coupon.periods ?? ALL_PERIODS).join(","),
    validFrom: coupon.validFrom?.toISOString().slice(0, 10) ?? "",
    validUntil: coupon.validUntil?.toISOString().slice(0, 10) ?? "",
    maxRedemptions: coupon.maxRedemptions === null ? "" : String(coupon.maxRedemptions),
    maxPerClient: coupon.maxPerClient === null ? "" : String(coupon.maxPerClient),
    firstPaymentOnly: coupon.firstPaymentOnly,
    active: coupon.active,
  };
}

/** For the admin's list: off, expired, not started yet, or on. */
export function couponStatus(coupon: Coupon, now: Date): { label: string; tone: "success" | "neutral" | "warn" } {
  if (!coupon.active) return { label: "Off", tone: "neutral" };
  if (coupon.validUntil && coupon.validUntil.getTime() < now.getTime()) return { label: "Expired", tone: "neutral" };
  if (coupon.validFrom && coupon.validFrom.getTime() > now.getTime()) return { label: "Scheduled", tone: "warn" };
  return { label: "On", tone: "success" };
}

/** "20% off" or "E£500.00 / $20.00 off". */
export function describeDiscount(discount: CouponDiscount): string {
  if (discount.kind === "percent") return `${discount.percent}% off`;
  const parts = (Object.entries(discount.amounts) as [CatalogCurrency, number][]).map(([currency, cents]) => formatCents(cents, currency));
  return `${parts.join(" / ")} off`;
}

export interface CouponInput {
  code: string;
  note: string;
  discount: CouponDiscount;
  plans: Plan[] | null;
  periods: (1 | 12)[] | null;
  validFrom: Date | null;
  validUntil: Date | null;
  maxRedemptions: number | null;
  maxPerClient: number | null;
  firstPaymentOnly: boolean;
  active: boolean;
}

const ALL_PLANS: Plan[] = [...PLANS];
const ALL_PERIODS: (1 | 12)[] = [1, 12];
/** 52 What Yallapp charges in: pounds (Kashier, Fawaterk) or dollars (iyzico). */
const CURRENCIES: CatalogCurrency[] = ["EGP", "USD"];

/** The admin's coupon form, checked; or an error per field. Every plan or period ticked is stored as "all". */
export function readCouponForm(input: {
  values: Record<string, string>;
  plans: string[];
  periods: string[];
}): { ok: true; coupon: CouponInput } | { ok: false; errors: Record<string, string> } {
  const v = input.values;
  const errors: Record<string, string> = {};
  const code = normalizeCouponCode(v.code ?? "");
  if (!COUPON_CODE.test(code)) errors.code = "Use 3 to 40 letters, digits, - or _.";
  const note = (v.note ?? "").trim();
  if (note.length > 200) errors.note = "Use at most 200 characters.";

  let discount: CouponDiscount | null = null;
  if (v.kind === "percent") {
    const percent = Number(v.percent);
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) errors.percent = "Enter a whole percentage from 1 to 100.";
    else discount = { kind: "percent", percent };
  } else if (v.kind === "fixed") {
    const amounts: Partial<Record<CatalogCurrency, number>> = {};
    for (const currency of CURRENCIES) {
      const text = (v[`amount${currency}`] ?? "").trim();
      if (!text) continue;
      const cents = parsePrice(text);
      if (cents === null || cents === 0) errors[`amount${currency}`] = "Enter an amount, like 250 or 99.90.";
      else amounts[currency] = cents;
    }
    if (!Object.keys(amounts).length && !CURRENCIES.some((c) => errors[`amount${c}`])) errors.amountEGP = "Enter the amount off in at least one currency.";
    discount = { kind: "fixed", amounts };
  } else {
    errors.kind = "Choose a percentage or a fixed amount.";
  }

  const plans = ALL_PLANS.filter((p) => input.plans.includes(p));
  if (!plans.length) errors.plans = "Choose at least one plan.";
  const periods = ALL_PERIODS.filter((p) => input.periods.includes(String(p)));
  if (!periods.length) errors.periods = "Choose at least one billing period.";

  const date = (name: string, end: boolean): Date | null => {
    const text = (v[name] ?? "").trim();
    if (!text) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
      errors[name] = "Choose a date.";
      return null;
    }
    return new Date(`${text}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
  };
  const validFrom = date("validFrom", false);
  const validUntil = date("validUntil", true);
  if (validFrom && validUntil && validUntil.getTime() < validFrom.getTime()) errors.validUntil = "Choose a day on or after the first day.";

  const limit = (name: string): number | null => {
    const text = (v[name] ?? "").trim();
    if (!text) return null;
    const n = Number(text);
    if (!Number.isInteger(n) || n < 1 || n > 1_000_000) {
      errors[name] = "Enter a whole number, or leave it empty for no limit.";
      return null;
    }
    return n;
  };
  const maxRedemptions = limit("maxRedemptions");
  const maxPerClient = limit("maxPerClient");

  if (Object.keys(errors).length || !discount) return { ok: false, errors };
  return {
    ok: true,
    coupon: {
      code,
      note,
      discount,
      plans: plans.length === ALL_PLANS.length ? null : plans,
      periods: periods.length === ALL_PERIODS.length ? null : periods,
      validFrom,
      validUntil,
      maxRedemptions,
      maxPerClient,
      firstPaymentOnly: v.firstPaymentOnly === "on",
      active: v.active === "on",
    },
  };
}
