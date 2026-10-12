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
  /** Shown on the pricing page. Prices are agreed on WhatsApp, so this is text. */
  price: string;
  period: string | null;
}

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
  },
};

export function isPlan(value: unknown): value is Plan {
  return value === "starter" || value === "pro";
}

export function planName(plan: Plan | null | undefined): string {
  return plan ? PLAN_INFO[plan].name : "Not set";
}
