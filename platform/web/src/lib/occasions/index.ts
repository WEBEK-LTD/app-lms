import type { Coupon, OccasionPlans, OccasionRecord, OccasionTemplate } from "../data/types";
import { PLANS, REGULAR_PLANS, STUDIO_PLANS, type Plan } from "../plans";

/**
 * 124 Occasions (Admin › Occasions): an offer for a season, such as Black
 * Friday, with its own page on the website, its coupon and its email. The
 * team sets its days, its discount, its code and its plans, extends it, or
 * runs it again the next year; each occasion's page and words are a
 * template of the site's (site/occasions), one per kind of occasion.
 *
 * The offer is a coupon (lib/billing/coupons.ts): saving an occasion
 * creates or updates the coupon with its code, so the discount is worked
 * out by the server like any coupon's, once per account, on the payment it
 * is used for. The days are whole days in Istanbul's time.
 */

export type { OccasionPlans, OccasionRecord, OccasionTemplate };

/** The kinds of occasion with a page of their own, and the address and defaults of each. */
export const OCCASION_TEMPLATES: Record<OccasionTemplate, { slug: string; name: string; code: string; percent: number; month: number; firstDay: number; lastDay: number }> = {
  black_friday: { slug: "black-friday", name: "Black Friday", code: "BLACKFRIDAY50", percent: 50, month: 11, firstDay: 1, lastDay: 30 },
};

export const OCCASION_TEMPLATE_IDS = Object.keys(OCCASION_TEMPLATES) as OccasionTemplate[];

export function isOccasionTemplate(value: unknown): value is OccasionTemplate {
  return typeof value === "string" && (OCCASION_TEMPLATE_IDS as string[]).includes(value);
}

/** Istanbul keeps UTC+3 all year. */
const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const OCCASION_DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** A day (`2026-11-01`) is real when it reads back the same. */
export function isOccasionDay(day: string): boolean {
  if (!OCCASION_DAY.test(day)) return false;
  const d = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === day;
}

/** The moment the day starts in Istanbul. */
export function istanbulDayStart(day: string): Date {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() - ISTANBUL_OFFSET_MS);
}

/** The day it is in Istanbul at that moment. */
export function istanbulDay(at: Date): string {
  return new Date(at.getTime() + ISTANBUL_OFFSET_MS).toISOString().slice(0, 10);
}

/** When the occasion starts and ends: from the start of its first day to the end of its last, in Istanbul. */
export function occasionWindow(o: Pick<OccasionRecord, "startsOn" | "endsOn">): { start: Date; end: Date } {
  return { start: istanbulDayStart(o.startsOn), end: new Date(istanbulDayStart(o.endsOn).getTime() + DAY_MS - 1) };
}

export type OccasionState = "upcoming" | "live" | "ended" | "off";

/** Whether the offer is on now: turned off, not started, on, or over. */
export function occasionState(o: OccasionRecord, now: Date): OccasionState {
  if (!o.active) return "off";
  const { start, end } = occasionWindow(o);
  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "live";
}

/** The whole days left, today included (1 on the last day); 0 when it isn't on. */
export function occasionDaysLeft(o: OccasionRecord, now: Date): number {
  if (occasionState(o, now) !== "live") return 0;
  return Math.round((istanbulDayStart(o.endsOn).getTime() - istanbulDayStart(istanbulDay(now)).getTime()) / DAY_MS) + 1;
}

/** The plans an occasion's coupon is for; null for every plan. */
export function occasionPlanList(plans: OccasionPlans): Plan[] | null {
  if (plans === "regular") return [...REGULAR_PLANS];
  if (plans === "studio") return [...STUDIO_PLANS];
  return null;
}

/** Whether a plan is in the offer. */
export function occasionCoversPlan(o: Pick<OccasionRecord, "plans">, plan: Plan): boolean {
  const list = occasionPlanList(o.plans);
  return list === null ? (PLANS as readonly string[]).includes(plan) : list.includes(plan);
}

/** A day a year later; 29 February becomes 28 February. */
export function dayNextYear(day: string): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const next = `${y + 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return isOccasionDay(next) ? next : `${y + 1}-${String(m).padStart(2, "0")}-${String(d - 1).padStart(2, "0")}`;
}

/** "Run it again next year": the same occasion on the same days a year on, turned on. */
export function occasionNextYear(o: OccasionRecord): Pick<OccasionRecord, "startsOn" | "endsOn" | "active"> {
  return { startsOn: dayNextYear(o.startsOn), endsOn: dayNextYear(o.endsOn), active: true };
}

/** A new occasion of the kind, on its usual days of the year given. */
export function newOccasion(template: OccasionTemplate, year: number, id: string, by: string, now: Date): OccasionRecord {
  const t = OCCASION_TEMPLATES[template];
  const month = String(t.month).padStart(2, "0");
  return {
    id,
    template,
    name: `${t.name} ${year}`,
    startsOn: `${year}-${month}-${String(t.firstDay).padStart(2, "0")}`,
    endsOn: `${year}-${month}-${String(t.lastDay).padStart(2, "0")}`,
    percent: t.percent,
    couponCode: t.code,
    plans: "all",
    active: true,
    couponId: null,
    updatedAt: now.toISOString(),
    updatedBy: by,
  };
}

/** What an occasion's form must hold. Messages are the admin's (English). */
export function occasionErrors(o: Pick<OccasionRecord, "name" | "startsOn" | "endsOn" | "percent" | "couponCode" | "plans">): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!o.name.trim() || o.name.length > 80) errors.name = "Give the occasion a name of up to 80 characters.";
  if (!isOccasionDay(o.startsOn)) errors.startsOn = "Choose the first day.";
  if (!isOccasionDay(o.endsOn)) errors.endsOn = "Choose the last day.";
  else if (isOccasionDay(o.startsOn) && o.endsOn < o.startsOn) errors.endsOn = "The last day comes on or after the first.";
  else if (isOccasionDay(o.startsOn) && istanbulDayStart(o.endsOn).getTime() - istanbulDayStart(o.startsOn).getTime() > 92 * DAY_MS) errors.endsOn = "An occasion lasts up to three months.";
  if (!Number.isInteger(o.percent) || o.percent < 1 || o.percent > 90) errors.percent = "Enter a whole percentage from 1 to 90.";
  if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(o.couponCode)) errors.couponCode = "Use 3 to 40 capital letters, digits, - or _.";
  if (!["all", "regular", "studio"].includes(o.plans)) errors.plans = "Choose the plans.";
  return errors;
}

/**
 * The coupon of an occasion: its code, its percentage off every billing
 * period of its plans, from its first day to its last, once per account
 * and on any payment (a new app's or a renewal's), on while the occasion is.
 */
export function occasionCoupon(o: OccasionRecord): Pick<Coupon, "code" | "note" | "discount" | "plans" | "periods" | "validFrom" | "validUntil" | "maxRedemptions" | "maxPerClient" | "firstPaymentOnly" | "active"> {
  const { start, end } = occasionWindow(o);
  return {
    code: o.couponCode,
    note: `Occasion: ${o.name} (Admin › Occasions). Changes there replace this coupon's settings.`,
    discount: { kind: "percent", percent: o.percent },
    plans: occasionPlanList(o.plans),
    periods: null,
    validFrom: start,
    validUntil: end,
    maxRedemptions: null,
    maxPerClient: 1,
    firstPaymentOnly: false,
    active: o.active,
  };
}

/** The occasion whose page is at that address, the newest first when the team kept several years. */
export function occasionForSlug(items: readonly OccasionRecord[], slug: string): OccasionRecord | null {
  const template = OCCASION_TEMPLATE_IDS.find((t) => OCCASION_TEMPLATES[t].slug === slug);
  if (!template) return null;
  return [...items].filter((o) => o.template === template).sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0] ?? null;
}

/** The occasion of a kind the page shows: the one on now, else the next one, else the last one. */
export function currentOccasion(items: readonly OccasionRecord[], template: OccasionTemplate, now: Date): OccasionRecord | null {
  const mine = items.filter((o) => o.template === template && o.active);
  const live = mine.find((o) => occasionState(o, now) === "live");
  if (live) return live;
  const next = mine.filter((o) => occasionState(o, now) === "upcoming").sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0];
  if (next) return next;
  return [...items].filter((o) => o.template === template).sort((a, b) => b.endsOn.localeCompare(a.endsOn))[0] ?? null;
}
