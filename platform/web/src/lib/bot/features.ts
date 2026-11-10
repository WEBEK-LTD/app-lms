import { ENGINES, type KindInfo } from "../app/kinds";
import type { App, CatalogSettings, LoyaltySettings } from "../data/types";
import { DEFAULT_CATALOG_SETTINGS } from "../data/types";
import { hasFeature, lowestPlanWith, type Plan, type PlanFamily, type PlanFeature, type PlanInfo } from "../plans";
import { FEATURES, type BotFeature } from "./intents";

/**
 * What the bot's features are in the app, and what the plan says about them.
 * The plan always decides: nothing a plan doesn't include is turned on, and
 * a new app with no plan yet only gets what needs no plan.
 */

/** The plan feature each one needs; none for store ratings. */
export const PLAN_FEATURE_OF: Record<BotFeature, PlanFeature | null> = {
  chat: "chat",
  loyalty: "loyalty",
  ratings: null,
  notifications: "push",
  payments: "card_payments",
  ios: "ios",
};

/** The features a kind of app can have: loyalty points in shops and restaurants, card payments where the app sells. */
export function featuresFor(kind: Pick<KindInfo, "engine">): BotFeature[] {
  return FEATURES.filter((f) => {
    if (f === "loyalty") return ENGINES[kind.engine].ownContent.kind === "catalog" && kind.engine === "store";
    if (f === "payments") return ENGINES[kind.engine].words.cardPayments !== null;
    return true;
  });
}

export type FeatureStatus =
  /** Needs no plan, or the app's plan has it. */
  | { status: "in_plan" }
  /** The app's plan doesn't have it: `plan` is the lowest one that does. */
  | { status: "upgrade"; plan: Plan | null }
  /** No plan yet: it comes with `plan` and up. */
  | { status: "no_plan"; plan: Plan | null };

export function featureStatus(feature: BotFeature, plan: PlanInfo | null, plans: Record<Plan, PlanInfo>, family: PlanFamily): FeatureStatus {
  const needs = PLAN_FEATURE_OF[feature];
  if (!needs || (plan && hasFeature(plan, needs))) return { status: "in_plan" };
  const lowest = lowestPlanWith(plans, (p) => hasFeature(p, needs), plan?.id ?? null, family)?.id ?? null;
  return plan ? { status: "upgrade", plan: lowest } : { status: "no_plan", plan: lowest };
}

/** The dashboard's starting loyalty points (Shop › Loyalty points): a point for every 10.00, worth 0.10, used from 100. */
export const BOT_LOYALTY: LoyaltySettings = { spendPerPointCents: 1000, pointValueCents: 10, minPoints: 100 };

/**
 * The app's settings for the features chosen, on its plan: chat and store
 * ratings on (they are on by default) or off when not chosen; loyalty points
 * on only when the plan has them and the app's shop is kept in Yallapp.
 * Push notifications, card payments and the iPhone app come with the plan.
 */
export function featureSettings(
  app: Pick<App, "appType" | "backend" | "connector" | "catalogSettings">,
  chosen: readonly BotFeature[],
  plan: PlanInfo | null,
): Pick<App, "chatSettings" | "reviewPrompt"> & { catalogSettings?: CatalogSettings } {
  const out: Pick<App, "chatSettings" | "reviewPrompt"> & { catalogSettings?: CatalogSettings } = {
    chatSettings: { enabled: chosen.includes("chat"), courseGroups: false },
    reviewPrompt: chosen.includes("ratings"),
  };
  const shop = app.backend === "hosted" && app.connector?.kind === "catalog" && app.appType === "store";
  if (chosen.includes("loyalty") && shop && plan && hasFeature(plan, "loyalty")) {
    out.catalogSettings = { ...(app.catalogSettings ?? DEFAULT_CATALOG_SETTINGS), loyalty: BOT_LOYALTY };
  }
  return out;
}
