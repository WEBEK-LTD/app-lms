import type { CardPlan } from "@/components/plan-payment-form";
import type { PaymentProviderId, SwitchesSetting } from "../data/types";
import { planPrice, type Plan, type PlanInfo } from "../plans";
import { featureOn } from "../switches";
import { cardPlans } from "./plan-payment";

/** The plans clients can pay by card, ready for the payment form; without the ones the team switched card payments off for (11.5), 37 or priced in a currency the provider doesn't take. */
export function cardPlanOptions(plans: Record<Plan, PlanInfo>, switches: SwitchesSetting | null = null, provider?: PaymentProviderId): CardPlan[] {
  return cardPlans(plans, provider)
    .filter((p) => featureOn(switches, "plan_card_payments", p.id))
    .map((p) => ({ id: p.id, name: p.name, tagline: p.tagline, ...planPrice(p) }));
}
