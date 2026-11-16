import type { CardPeriod, CardPlan } from "@/components/plan-payment-form";
import type { PaymentProviderId, SwitchesSetting } from "../data/types";
import { planFitsSection, planPayableFor, planPeriods, planPrice, POUNDS_VIEW, type Plan, type PlanFamily, type PlanInfo, type PriceView } from "../plans";
import { featureOn } from "../switches";
import { cardPlans } from "./plan-payment";
import { offerFor, shownPrice } from "./prices";
import { periodUnit, shownPeriods, type PeriodKey } from "./periods";
export { periodPrices, periodsAmong, startPeriod } from "./period-prices";

/**
 * The plans clients can pay by card, ready for the payment form; without the ones the team switched card payments off for (11.5), 37 or that
 * the gateway can't charge. 52 Each shows its price in the client's currency and, when the charge is in another one, the line saying so.
 * 103R Only the family's plans the clients may see: a regular app's (and an account before its first app) or a Studio project's.
 * 133 Each with the periods it offers (the price, per month and the saving worked out), and an archived plan only for the app on it.
 */
export function cardPlanOptions(
  plans: Record<Plan, PlanInfo>,
  switches: SwitchesSetting | null = null,
  provider?: PaymentProviderId,
  view: PriceView = POUNDS_VIEW,
  family: PlanFamily = "regular",
  current: Plan | null = null,
): CardPlan[] {
  return cardPlans(plans, provider, view.egpPerUsd)
    .filter((p) => planFitsSection(p.id, family) && planPayableFor(p, current) && featureOn(switches, "plan_card_payments", p.id))
    .map((p) => ({ id: p.id, name: p.name, tagline: p.tagline, ...planPrice(p, view), charge: provider ? offerFor({ egpCents: p.priceCents!, usdCents: p.usdCents }, view.display, provider, view.egpPerUsd)?.line ?? null : null, periods: cardPeriods(p, view, provider) }));
}

/** 133 A plan's periods for the payment form and the plan cards: each one the gateway can charge, in the client's currency. */
export function cardPeriods(plan: PlanInfo, view: PriceView, provider?: PaymentProviderId): CardPeriod[] {
  const periods = planPeriods(plan).flatMap(({ key, price }) => {
    const offer = provider ? offerFor(price, view.display, provider, view.egpPerUsd) : null;
    if (provider && !offer) return [];
    return [{ key, shown: offer?.shown ?? shownPrice(price, view.display, view.egpPerUsd), charge: offer?.line ?? null }];
  });
  const shown = shownPeriods(periods);
  return periods.map((p, i) => ({ key: p.key, price: shown[i]!.price, unit: periodUnit(p.key), perMonth: shown[i]!.perMonth, saving: shown[i]!.saving, charge: p.charge }));
}

/** 133 The period a card starts on: the one asked for when the plan has it, else the plan's main one (or its first). */
export function startingPeriod(card: Pick<CardPlan, "periods" | "period">, wanted: PeriodKey | null | undefined): PeriodKey | null {
  if (wanted && card.periods?.some((p) => p.key === wanted)) return wanted;
  return card.periods?.find((p) => p.unit === card.period)?.key ?? card.periods?.[0]?.key ?? null;
}
