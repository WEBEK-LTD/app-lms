export const PLANS = ["starter", "pro"] as const;
export type Plan = (typeof PLANS)[number];

export type PlanFeature = "push" | "offline_downloads" | "auto_publish";

export interface PlanInfo {
  id: Plan;
  name: string;
  tagline: string;
  /** Features reported to the plugin in the license status. */
  features: PlanFeature[];
  /** Bullet points on the pricing page. */
  highlights: string[];
  /** Shown on the pricing page when there's no fixed price, e.g. "On request". */
  price: string;
  period: string | null;
  /** The price clients pay by card; null while prices are agreed on WhatsApp. */
  priceCents: number | null;
  currency: "TRY" | "USD" | "EUR";
  /** How long a payment keeps the plan active. */
  billingMonths: 1 | 12;
}

/** What the team edits in the admin for a plan. */
export type PlanSetting = Pick<PlanInfo, "name" | "tagline" | "features" | "highlights" | "price" | "priceCents" | "currency" | "billingMonths">;

export const PLAN_INFO: Record<Plan, PlanInfo> = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "You publish the apps yourself",
    features: ["push", "offline_downloads"],
    highlights: [
      "Android APK & AAB, iOS build",
      "Signing keys & store assets",
      "Step-by-step publishing guides",
      "WordPress plugin & updates",
    ],
    price: "On request",
    period: null,
    priceCents: null,
    currency: "TRY",
    billingMonths: 12,
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "We publish the apps for you",
    features: ["push", "offline_downloads", "auto_publish"],
    highlights: [
      "Everything in Starter",
      "Automatic publishing to Google Play & App Store",
      "Automatic rebuilds for every new app version",
      "Priority support",
    ],
    price: "On request",
    period: null,
    priceCents: null,
    currency: "TRY",
    billingMonths: 12,
  },
};

export const PLAN_FEATURES: { id: PlanFeature; label: string }[] = [
  { id: "push", label: "Push notifications" },
  { id: "offline_downloads", label: "Offline downloads" },
  { id: "auto_publish", label: "Automatic publishing" },
];

/** The plans with the team's edits from the admin. */
export function plansWith(settings: Partial<Record<Plan, PlanSetting>> | null | undefined): Record<Plan, PlanInfo> {
  const merge = (plan: Plan): PlanInfo => {
    const edit = settings?.[plan];
    if (!edit) return PLAN_INFO[plan];
    return { ...PLAN_INFO[plan], ...edit, id: plan, period: edit.priceCents !== null ? (edit.billingMonths === 1 ? "month" : "year") : null };
  };
  return { starter: merge("starter"), pro: merge("pro") };
}

export function isPlan(value: unknown): value is Plan {
  return value === "starter" || value === "pro";
}

export function planName(plan: Plan | null | undefined, plans: Record<Plan, PlanInfo> = PLAN_INFO): string {
  return plan ? plans[plan].name : "Not set";
}

/** "₺4,800.00" with "year", or the plan's text ("On request") without a period. */
export function planPrice(plan: PlanInfo): { price: string; period: string | null } {
  if (plan.priceCents === null) return { price: plan.price, period: null };
  const price = new Intl.NumberFormat("en-US", { style: "currency", currency: plan.currency, currencyDisplay: "narrowSymbol" }).format(plan.priceCents / 100);
  return { price, period: plan.billingMonths === 1 ? "month" : "year" };
}
