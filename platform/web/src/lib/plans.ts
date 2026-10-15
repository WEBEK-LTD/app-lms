import type { IconName } from "@/components/icon-names";

/**
 * Yallapp's plans (roadmap 9.2 and 13.1): four tiers, each with features and
 * limits. Every app has its own plan (Phase 12). The team edits names, prices,
 * features and limits on the admin's Plans page; plans without an edit keep
 * the defaults below.
 *
 * Each feature and limit is either enforced somewhere (the `enforced` text
 * says where) or marked `displayOnly`: shown on the pricing page and in the
 * dashboard, handled by the team by hand.
 */

export const PLANS = ["starter", "growth", "pro", "business"] as const;
export type Plan = (typeof PLANS)[number];

/** 32 The plan most clients pick, marked "Most popular" on the pricing and home pages. */
export const FEATURED_PLAN: Plan = "growth";

/** Lower to higher: an upgrade moves up, a downgrade down. */
export const PLAN_RANK: Record<Plan, number> = { starter: 0, growth: 1, pro: 2, business: 3 };

/**
 * Features a plan has or hasn't. They are also the license features the
 * license API reports to the plugin (docs/api/platform.yaml).
 */
export const PLAN_FEATURE_IDS = ["ios", "push", "offline_downloads", "page_editor", "card_payments", "auto_rebuild", "auto_publish"] as const;
export type PlanFeature = (typeof PLAN_FEATURE_IDS)[number];

export type SupportLevel = "email" | "whatsapp" | "priority" | "dedicated";
export const SUPPORT_LEVELS: SupportLevel[] = ["email", "whatsapp", "priority", "dedicated"];
export const SUPPORT_LABEL: Record<SupportLevel, string> = {
  email: "Email support",
  whatsapp: "WhatsApp support",
  priority: "Priority support",
  dedicated: "Fastest support, with your account manager",
};

export interface PlanLimits {
  /** App users on the hosted API (null: unlimited). Enforced: the hosted API refuses new users with `app_user_limit`. */
  appUsers: number | null;
  /** App languages, English included (null: all). Enforced: the page editor, publishing and the served layout. */
  languages: number | null;
  /** Connected content sources the pages can list (null: all). Enforced: the page editor and the served layout. */
  sources: number | null;
  // Display-only: shown on the pricing page and the dashboard, handled by the team.
  /** Display-only: team members (several sign-ins per account aren't built yet). */
  teamMembers: number | null;
  /** Display-only: how fast and where the team answers. */
  support: SupportLevel;
  /** Display-only: a named person at Yallapp for the client. */
  accountManager: boolean;
  /** Display-only: custom features built on request. */
  customFeatures: boolean;
}

export interface PlanInfo {
  id: Plan;
  name: string;
  tagline: string;
  /** What the plan includes. */
  features: PlanFeature[];
  limits: PlanLimits;
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

/**
 * What the team edits in the admin for a plan. `version` 2 is a full edit
 * (Phase 13); an edit without it was saved for the old Starter and Pro plans
 * and only its price is kept (migration 0017 moved the old Starter's edit to
 * Growth, the tier its clients moved to).
 */
export type PlanSetting = Pick<PlanInfo, "name" | "tagline" | "features" | "highlights" | "price" | "priceCents" | "currency" | "billingMonths"> & {
  limits?: PlanLimits;
  version?: 2;
};

const BASE_LIMITS: PlanLimits = { appUsers: null, languages: null, sources: null, teamMembers: 1, support: "email", accountManager: false, customFeatures: false };

export const PLAN_INFO: Record<Plan, PlanInfo> = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "An Android app, published by you with our guides",
    features: ["push"],
    limits: { ...BASE_LIMITS, appUsers: 1000, languages: 1, sources: 1 },
    highlights: [
      "Android app (APK & AAB)",
      "1 connected platform",
      "Up to 1,000 app users",
      "1 app language",
      "Push notifications",
      "Ready-made page templates",
      "Step-by-step publishing guides",
      "Email support",
    ],
    price: "On request",
    period: null,
    priceCents: null,
    currency: "TRY",
    billingMonths: 12,
  },
  growth: {
    id: "growth",
    name: "Growth",
    tagline: "Android and iOS apps that grow with you",
    features: ["ios", "push", "offline_downloads", "page_editor", "card_payments", "auto_rebuild"],
    limits: { ...BASE_LIMITS, appUsers: 10000, languages: 3, sources: null, support: "whatsapp" },
    highlights: [
      "Android & iOS apps",
      "Up to 10,000 app users",
      "3 app languages",
      "Full page editor",
      "Card payments in the app",
      "Offline mode",
      "Automatic rebuilds when you change settings",
      "WhatsApp support",
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
    tagline: "We publish your apps for you",
    features: ["ios", "push", "offline_downloads", "page_editor", "card_payments", "auto_rebuild", "auto_publish"],
    limits: { ...BASE_LIMITS, appUsers: null, languages: null, sources: null, teamMembers: 3, support: "priority" },
    highlights: [
      "Everything in Growth",
      "Unlimited app users",
      "All app languages",
      "We publish to Google Play & App Store",
      "Automatic store updates",
      "Priority support",
    ],
    price: "On request",
    period: null,
    priceCents: null,
    currency: "TRY",
    billingMonths: 12,
  },
  business: {
    id: "business",
    name: "Business",
    tagline: "A partner for your app",
    features: ["ios", "push", "offline_downloads", "page_editor", "card_payments", "auto_rebuild", "auto_publish"],
    limits: { ...BASE_LIMITS, appUsers: null, languages: null, sources: null, teamMembers: 10, support: "dedicated", accountManager: true, customFeatures: true },
    highlights: ["Everything in Pro", "A dedicated account manager", "Custom features on request", "Several team members", "Fastest support"],
    price: "On request",
    period: null,
    priceCents: null,
    currency: "TRY",
    billingMonths: 12,
  },
};

export interface PlanFeatureDef {
  id: PlanFeature;
  label: string;
  /** What the client gets, for the dashboard and the pricing table. */
  description: string;
  /** Where the platform holds to it. */
  enforced: string;
}

export const PLAN_FEATURES: PlanFeatureDef[] = [
  { id: "ios", label: "iOS app", description: "Your app on the App Store as well as Google Play.", enforced: "Builds skip iOS and the pipeline gets no App Store key." },
  { id: "push", label: "Push notifications", description: "Send notifications to your app users' phones.", enforced: "Config features.push, the plugin's license, the Notifications page." },
  {
    id: "offline_downloads",
    label: "Offline mode",
    description: "The app shows what people last saw, even without a connection.",
    enforced: "Config features.offline; the app keeps nothing on the phone without it.",
  },
  {
    id: "page_editor",
    label: "Full page editor",
    description: "Build your own pages and tabs from blocks. Without it, your app uses the ready-made pages.",
    enforced: "The served layout (hosted API and the plugin's layout endpoint) and the page editor.",
  },
  {
    id: "card_payments",
    label: "Card payments in the app",
    description: "Sell products and courses by card in the app, through our payment page.",
    enforced: "The hosted API's checkout for dashboard products and courses.",
  },
  {
    id: "auto_rebuild",
    label: "Automatic rebuilds",
    description: "A new build starts by itself when you change your app's settings.",
    enforced: "Saving a setup step queues a build.",
  },
  {
    id: "auto_publish",
    label: "We publish for you",
    description: "We upload your apps and every update to Google Play and the App Store.",
    enforced: "Builds' auto_publish and the Publishing step's store keys.",
  },
];

export type PlanLimitId = "appUsers" | "languages" | "sources";

export const PLAN_LIMITS: { id: PlanLimitId; label: string; unlimited: string; enforced: string }[] = [
  { id: "appUsers", label: "App users", unlimited: "Unlimited", enforced: "The hosted API refuses new users past the limit (WordPress sites keep their own users: no limit)." },
  { id: "languages", label: "App languages", unlimited: "All languages", enforced: "The page editor, publishing and the served layout." },
  { id: "sources", label: "Connected platforms", unlimited: "All", enforced: "The page editor and the served layout leave out lists from other sources." },
];

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLANS as readonly string[]).includes(value);
}

export function hasFeature(plan: Pick<PlanInfo, "features"> | null | undefined, feature: PlanFeature): boolean {
  return Boolean(plan?.features.includes(feature));
}

/** -1, 0 or 1: whether `to` is a downgrade, the same plan or an upgrade from `from`. */
export function comparePlans(from: Plan, to: Plan): -1 | 0 | 1 {
  const d = PLAN_RANK[to] - PLAN_RANK[from];
  return d < 0 ? -1 : d > 0 ? 1 : 0;
}

/** The lowest plan above `current` (any plan without one) that passes `test`, for "Upgrade" hints. */
export function lowestPlanWith(plans: Record<Plan, PlanInfo>, test: (plan: PlanInfo) => boolean, current?: Plan | null): PlanInfo | null {
  for (const id of PLANS) {
    if (current && PLAN_RANK[id] <= PLAN_RANK[current]) continue;
    if (test(plans[id])) return plans[id];
  }
  return null;
}

function cleanLimits(value: unknown, fallback: PlanLimits): PlanLimits {
  const v = (value && typeof value === "object" ? value : {}) as Partial<Record<keyof PlanLimits, unknown>>;
  const count = (x: unknown, d: number | null) => (x === null ? null : typeof x === "number" && Number.isInteger(x) && x >= 0 ? x : d);
  return {
    appUsers: count(v.appUsers, fallback.appUsers),
    languages: count(v.languages, fallback.languages),
    sources: count(v.sources, fallback.sources),
    teamMembers: count(v.teamMembers, fallback.teamMembers),
    support: SUPPORT_LEVELS.includes(v.support as SupportLevel) ? (v.support as SupportLevel) : fallback.support,
    accountManager: typeof v.accountManager === "boolean" ? v.accountManager : fallback.accountManager,
    customFeatures: typeof v.customFeatures === "boolean" ? v.customFeatures : fallback.customFeatures,
  };
}

/** The plans with the team's edits from the admin. */
export function plansWith(settings: Partial<Record<Plan, PlanSetting>> | null | undefined): Record<Plan, PlanInfo> {
  const merge = (plan: Plan): PlanInfo => {
    const base = PLAN_INFO[plan];
    const edit = settings?.[plan];
    if (!edit) return base;
    const price = {
      price: typeof edit.price === "string" && edit.price ? edit.price : base.price,
      priceCents: typeof edit.priceCents === "number" ? edit.priceCents : null,
      currency: edit.currency ?? base.currency,
      billingMonths: edit.billingMonths === 1 ? (1 as const) : (12 as const),
    };
    const period = price.priceCents !== null ? (price.billingMonths === 1 ? "month" : "year") : null;
    // An edit from before the four tiers: only its price still means something.
    if (edit.version !== 2) return { ...base, ...price, period };
    return {
      ...base,
      ...price,
      period,
      name: edit.name || base.name,
      tagline: edit.tagline ?? base.tagline,
      highlights: Array.isArray(edit.highlights) && edit.highlights.length ? edit.highlights : base.highlights,
      features: (edit.features ?? []).filter((f): f is PlanFeature => (PLAN_FEATURE_IDS as readonly string[]).includes(f)),
      limits: cleanLimits(edit.limits, base.limits),
      id: plan,
    };
  };
  return { starter: merge("starter"), growth: merge("growth"), pro: merge("pro"), business: merge("business") };
}

/** A full edit of a plan, as the admin saves it. */
export function planSettingOf(plan: PlanInfo): PlanSetting {
  return {
    version: 2,
    name: plan.name,
    tagline: plan.tagline,
    features: [...plan.features],
    limits: { ...plan.limits },
    highlights: [...plan.highlights],
    price: plan.price,
    priceCents: plan.priceCents,
    currency: plan.currency,
    billingMonths: plan.billingMonths,
  };
}

/** Each plan's name as the team set it. */
export function planNamesOf(plans: Record<Plan, PlanInfo>): Record<Plan, string> {
  return { starter: plans.starter.name, growth: plans.growth.name, pro: plans.pro.name, business: plans.business.name };
}

export function planName(plan: Plan | null | undefined, plans: Record<Plan, PlanInfo> = PLAN_INFO): string {
  return plan && isPlan(plan) ? plans[plan].name : "Not set";
}

/** "₺4,800.00" with "year", or the plan's text ("On request") without a period. */
export function planPrice(plan: PlanInfo): { price: string; period: string | null } {
  if (plan.priceCents === null) return { price: plan.price, period: null };
  const price = new Intl.NumberFormat("en-US", { style: "currency", currency: plan.currency, currencyDisplay: "narrowSymbol" }).format(plan.priceCents / 100);
  return { price, period: plan.billingMonths === 1 ? "month" : "year" };
}

/** 32 A plan's key limits, in a few words each: app users, languages and the platforms its apps run on. */
export function planLimitLines(plan: PlanInfo): { icon: IconName; text: string }[] {
  const users = plan.limits.appUsers;
  const languages = plan.limits.languages;
  return [
    { icon: "group", text: users === null ? "Unlimited users" : `Up to ${formatLimit(users)} users` },
    { icon: "language", text: languages === null ? "All languages" : `${languages} ${languages === 1 ? "language" : "languages"}` },
    { icon: "smartphone", text: hasFeature(plan, "ios") ? "Android and iOS" : "Android" },
  ];
}

/** "1,000", or the limit's word for unlimited. */
export function formatLimit(value: number | null, unlimited = "Unlimited"): string {
  return value === null ? unlimited : new Intl.NumberFormat("en-US").format(value);
}

export type ComparisonValue = boolean | string;

export interface ComparisonRow {
  label: string;
  values: Record<Plan, ComparisonValue>;
}

/** The pricing page's comparison table, from the plans as the team set them. */
export function comparisonRows(plans: Record<Plan, PlanInfo>): ComparisonRow[] {
  const each = (fn: (p: PlanInfo) => ComparisonValue): Record<Plan, ComparisonValue> =>
    ({ starter: fn(plans.starter), growth: fn(plans.growth), pro: fn(plans.pro), business: fn(plans.business) });
  const has = (f: PlanFeature) => each((p) => hasFeature(p, f));
  return [
    { label: "Android app", values: each(() => true) },
    { label: "iOS app", values: has("ios") },
    { label: "Connected platforms", values: each((p) => formatLimit(p.limits.sources, "All")) },
    { label: "App users", values: each((p) => formatLimit(p.limits.appUsers)) },
    { label: "App languages", values: each((p) => formatLimit(p.limits.languages, "All")) },
    { label: "Push notifications", values: has("push") },
    { label: "Pages", values: each((p) => (hasFeature(p, "page_editor") ? "Full page editor" : "Ready-made templates")) },
    { label: "Card payments in the app", values: has("card_payments") },
    { label: "Offline mode", values: has("offline_downloads") },
    { label: "Automatic rebuilds", values: has("auto_rebuild") },
    { label: "Publishing", values: each((p) => (hasFeature(p, "auto_publish") ? "We publish for you" : "You publish with our guides")) },
    { label: "Automatic store updates", values: has("auto_publish") },
    { label: "Team members", values: each((p) => formatLimit(p.limits.teamMembers)) },
    { label: "Dedicated account manager", values: each((p) => p.limits.accountManager) },
    { label: "Custom features on request", values: each((p) => p.limits.customFeatures) },
    { label: "Support", values: each((p) => SUPPORT_LABEL[p.limits.support].replace(", with your account manager", "")) },
  ];
}
