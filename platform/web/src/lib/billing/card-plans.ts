import type { CardPlan } from "@/components/plan-payment-form";
import { planPrice, type Plan, type PlanInfo } from "../plans";
import { cardPlans } from "./plan-payment";

/** The plans clients can pay by card, ready for the payment form. */
export function cardPlanOptions(plans: Record<Plan, PlanInfo>): CardPlan[] {
  return cardPlans(plans).map((p) => ({ id: p.id, name: p.name, tagline: p.tagline, ...planPrice(p) }));
}
