import type { CardPlan } from "@/components/plan-payment-form";
import type { PaymentProviderId, SwitchesSetting } from "../data/types";
import { planPrice, planPriceOf, POUNDS_VIEW, type Plan, type PlanInfo, type PriceView } from "../plans";
import { featureOn } from "../switches";
import { cardPlans } from "./plan-payment";
import { offerFor } from "./prices";

/**
 * The plans clients can pay by card, ready for the payment form; without the ones the team switched card payments off for (11.5), 37 or that
 * the gateway can't charge. 52 Each shows its price in the client's currency and, when the charge is in another one, the line saying so.
 */
export function cardPlanOptions(
  plans: Record<Plan, PlanInfo>,
  switches: SwitchesSetting | null = null,
  provider?: PaymentProviderId,
  view: PriceView = POUNDS_VIEW,
): CardPlan[] {
  return cardPlans(plans, provider, view.egpPerUsd)
    .filter((p) => featureOn(switches, "plan_card_payments", p.id))
    .map((p) => {
      const offer = provider ? offerFor(planPriceOf(p)!, view.display, provider, view.egpPerUsd) : null;
      return { id: p.id, name: p.name, tagline: p.tagline, ...planPrice(p, view), charge: offer?.line ?? null };
    });
}
