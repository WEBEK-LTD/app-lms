import { mainPeriodOf, planPeriods, type PlanInfo, type PriceView } from "../plans";
import { periodUnit, shownPeriods, type PeriodKey, type ShownPeriod } from "./periods";
import { shownPrice } from "./prices";

/**
 * 133 A plan's periods as a page shows them, in the visitor's currency:
 * the price, what it comes to per month and the saving against the
 * shortest period, all worked out from the team's prices.
 */
export interface PeriodPrice extends ShownPeriod {
  /** "month", "6 months", "year", "2 years", "3 years" or "lifetime". */
  unit: string;
}

export function periodPrices(plan: PlanInfo, view: PriceView): PeriodPrice[] {
  const periods = planPeriods(plan).map((p) => ({ key: p.key, shown: shownPrice(p.price, view.display, view.egpPerUsd) }));
  return shownPeriods(periods).map((p) => ({ ...p, unit: periodUnit(p.key) }));
}

/** The periods that at least one of the plans has, in their order. */
export function periodsAmong(plans: PlanInfo[], view: PriceView): PeriodKey[] {
  const keys = new Set(plans.flatMap((p) => periodPrices(p, view).map((x) => x.key)));
  return (["1", "6", "12", "24", "36", "lifetime"] as const).filter((k) => keys.has(k));
}

/** The period a page of plans starts on: the one asked for when a plan has it, else the main period most plans have. */
export function startPeriod(plans: PlanInfo[], view: PriceView, asked: PeriodKey | null | undefined): PeriodKey | null {
  const among = periodsAmong(plans, view);
  if (asked && among.includes(asked)) return asked;
  const counts = new Map<PeriodKey, number>();
  for (const p of plans) {
    if (!periodPrices(p, view).length) continue;
    const main = mainPeriodOf(p);
    counts.set(main, (counts.get(main) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || among.indexOf(a[0]) - among.indexOf(b[0]))[0]?.[0] ?? among[0] ?? null;
}
