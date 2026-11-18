import type { IconName } from "@/components/icon-names";
import type { DashKey, DashT } from "@/i18n/dashboard";
import type { MarketDiscount, MarketPlanPeriod, MarketPlanPrice, MarketTemplate } from "../data/types";
import { bestAutomatic } from "./discounts";
import { formatUsd, ltr, offeredPlans, perMonthCents, type PriceTag } from "./plans";

/**
 * 106.13 What a template's page says about its price, the same in the
 * dashboard (/studio/market/t/<slug>) and on the website
 * (/templates/<slug>): each plan's price now (106.12: the best running price
 * drop or flash sale, the plan's own struck through), the plan with the
 * lowest price per month, the price tag's words and what to know before
 * buying. The rules are lib/studio-market/plans.ts's and discounts.ts's.
 */

export interface PlanPriceNow extends MarketPlanPrice {
  /** The plan's own price, before the automatic discounts. */
  list: number;
  /** When the flash sale giving it this price ends (ISO), or null. */
  flashEndsAt: string | null;
}

/** Each offered plan at its price now. */
export function planPrices(template: Pick<MarketTemplate, "free" | "plans">, discounts: readonly MarketDiscount[], now: Date): PlanPriceNow[] {
  return offeredPlans(template).map((p) => {
    const deal = bestAutomatic(p, discounts, now);
    return { ...p, list: p.cents, cents: deal?.cents ?? p.cents, flashEndsAt: deal?.discount.kind === "flash" ? (deal.discount.endsAt?.toISOString() ?? null) : null };
  });
}

/** The plan for a time with the lowest price per month, when there are two or more of them ("Best value"). */
export function bestValuePlan(plans: readonly MarketPlanPrice[]): MarketPlanPeriod | null {
  const monthly = plans.flatMap((p) => {
    const cents = perMonthCents(p);
    return cents === null ? [] : [{ period: p.period, cents }];
  });
  return monthly.length > 1 ? monthly.reduce((a, b) => (b.cents < a.cents ? b : a)).period : null;
}

/** 106.2 The plans as the template page's picker shows them (components/studio-market/template-view.tsx `PlanChoice`): the billed price, per month or the lifetime line, the best value, the price struck through. */
export function planChoices(plans: readonly PlanPriceNow[], t: DashT, lang: string): { period: MarketPlanPeriod; name: string; price: string; sub: string; best: boolean; was: string | null }[] {
  const best = bestValuePlan(plans);
  return plans.map((p) => {
    const month = perMonthCents(p);
    return {
      period: p.period,
      name: t(`studioMarket.plan_${p.period}`),
      price: ltr(formatUsd(p.cents), lang),
      sub: month === null ? t("studioMarket.lifeHint") : t("studioMarket.perMonth", { price: ltr(formatUsd(month), lang) }),
      best: p.period === best,
      was: p.cents < p.list ? ltr(formatUsd(p.list), lang) : null,
    };
  });
}

/** The soonest end of a flash sale on one of the plans, or null. */
export function soonestFlashEnd(plans: readonly PlanPriceNow[]): string | null {
  return plans.flatMap((p) => (p.flashEndsAt ? [p.flashEndsAt] : [])).sort()[0] ?? null;
}

/** The price tag in words: "Free", "$8/mo" (`tag`) or "From $8/mo" (`short`), "$149 once"; the price before the discounts, or null. */
export function priceWords(price: PriceTag, wasCents: number | null, t: DashT, lang: string): { tag: string; short: string; was: string | null } {
  const usd = (cents: number) => ltr(formatUsd(cents), lang);
  if (price.kind === "free") return { tag: t("studioMarket.free"), short: t("studioMarket.free"), was: null };
  const was = wasCents ? (price.kind === "from" ? t("studioMarket.perMonth", { price: usd(wasCents) }) : usd(wasCents)) : null;
  if (price.kind === "from") return { tag: t("studioMarket.perMonth", { price: usd(price.cents) }), short: t("studioMarket.fromPrice", { price: usd(price.cents) }), was };
  const once = t("studioMarket.oncePrice", { price: usd(price.cents) });
  return { tag: once, short: once, was };
}

/** 106.2 What to know before taking it: a paid template's end (the designer's choice), no automatic renewal, moving, no refunds; a free one's. */
export function knowLines(template: Pick<MarketTemplate, "afterEnd">, paid: boolean): [IconName, DashKey][] {
  return paid
    ? [
        [template.afterEnd === "restore" ? "undo" : "history", template.afterEnd === "restore" ? "studioMarket.knowEndRestore" : "studioMarket.knowEndKeep"],
        ["event", "studioMarket.knowRenew"],
        ["compare", "studioMarket.knowMove"],
        ["block", "studioMarket.knowRefund"],
      ]
    : [
        ["new_releases", "studioMarket.knowFree"],
        ["history", "studioMarket.knowKeep"],
        ["compare", "studioMarket.knowMove"],
        ["verified", "studioMarket.knowReview"],
      ];
}
