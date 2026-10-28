import type { IconName } from "@/components/icon-names";
import { formatMoney, shownPrice, type DisplayCurrency, type Money, type YallappPrice } from "./billing/prices";
import { ALL_STORES_TEXT, APP_STORES, STORE_FACTS, storesFor, type AppStore } from "./stores";
import { RAW_RETENTION_DAYS } from "./analytics/types";

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

/** The regular apps' plans, on the pricing page and in the dashboard. */
export const REGULAR_PLANS = ["starter", "growth", "pro", "business"] as const;
/**
 * 103R Yallapp Studio's plans: a family of their own, named, priced and
 * offered by the team in Admin › Plans › Yallapp Studio. A Studio project is
 * paid on a Studio plan only, a regular app on a regular plan only.
 */
export const STUDIO_PLANS = ["studio_1", "studio_2", "studio_3"] as const;
/** Every plan a license can be on. */
export const PLANS = [...REGULAR_PLANS, ...STUDIO_PLANS] as const;
export type Plan = (typeof PLANS)[number];
export type RegularPlan = (typeof REGULAR_PLANS)[number];
export type StudioPlan = (typeof STUDIO_PLANS)[number];

/** 103R Regular apps or Yallapp Studio projects: the family of plans an app is paid on. */
export type PlanFamily = "regular" | "studio";

export function planFamily(plan: Plan): PlanFamily {
  return (STUDIO_PLANS as readonly string[]).includes(plan) ? "studio" : "regular";
}

/** 103R The plans of one family, lower to higher. */
export function plansOfFamily(family: PlanFamily): readonly Plan[] {
  return family === "studio" ? STUDIO_PLANS : REGULAR_PLANS;
}

/** 32 The plan most clients pick, marked "Most popular" on the pricing and home pages. */
export const FEATURED_PLAN: Plan = "growth";

/** Lower to higher within a family: an upgrade moves up, a downgrade down. */
export const PLAN_RANK: Record<Plan, number> = { starter: 0, growth: 1, pro: 2, business: 3, studio_1: 0, studio_2: 1, studio_3: 2 };

/**
 * Features a plan has or hasn't. They are also the license features the
 * license API reports to the plugin (docs/api/platform.yaml).
 */
/**
 * 77 `chat`: the app's chat with the business (and course groups). 91.4 `loyalty`: loyalty points in shops without a website.
 * 100.2 `store_billing`: courses and memberships bought in the app through Google Play and the App Store.
 * 103 `studio`: Yallapp Studio, off on every plan until the team turns it on (Admin › Plans).
 */
export const PLAN_FEATURE_IDS = ["ios", "push", "offline_downloads", "page_editor", "card_payments", "auto_rebuild", "auto_publish", "chat", "loyalty", "store_billing", "studio", "studio_motion", "studio_templates"] as const;
export type PlanFeature = (typeof PLAN_FEATURE_IDS)[number];

/** 103R Features only Studio plans have, so the regular plans' editor leaves them out. */
export const STUDIO_ONLY_FEATURES: readonly PlanFeature[] = ["studio", "studio_motion", "studio_templates"];

/**
 * 103R What every Studio plan includes, besides what the team ticks in
 * Admin › Plans › Yallapp Studio (`STUDIO_PLAN_CHOICES`).
 */
export const STUDIO_BASE_FEATURES: readonly PlanFeature[] = ["studio", "push", "page_editor", "offline_downloads", "card_payments", "auto_rebuild", "chat", "loyalty", "store_billing"];

/** 103R The features the team ticks for each Studio plan, as the admin's design lists them. */
export const STUDIO_PLAN_CHOICES: readonly PlanFeature[] = ["ios", "auto_publish", "studio_motion", "studio_templates"];

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
  /** 51 Gigabytes (decimals allowed, like 0.5) for the Media library's videos, pictures and PDFs, before storage packs (null: unlimited). Enforced: uploads past it are refused. */
  storageGb: number | null;
  /**
   * 72 Months the app's analytics daily totals are kept (null: until the app
   * is deleted). Enforced: the daily job deletes older ones, and the
   * Analytics page starts no earlier. Single events are kept 90 days on every
   * plan (lib/analytics/types.ts `RAW_RETENTION_DAYS`).
   */
  analyticsMonths: number | null;
  // Display-only: shown on the pricing page and the dashboard, handled by the team.
  /** Display-only: team members (several sign-ins per account aren't built yet). */
  teamMembers: number | null;
  /** Display-only: how fast and where the team answers. */
  support: SupportLevel;
  /** Display-only: a named person at Yallapp for the client. */
  accountManager: boolean;
  /** Display-only: custom features built on request. */
  customFeatures: boolean;
  /** 103R Studio pages in a project (null: as many as the layout takes). Enforced: the Studio editor and publishing. */
  studioPages?: number | null;
}

/** 62 A plan's texts in Arabic or Turkish, as the team wrote them in Admin › Plans; empty ones fall back. */
export interface PlanText {
  name?: string;
  tagline?: string;
  highlights?: string[];
  price?: string;
}

/** 62 The languages besides English that plan texts can be written in. */
export const PLAN_TEXT_LANGS = ["ar", "tr"] as const;
export type PlanTextLang = (typeof PLAN_TEXT_LANGS)[number];
export type PlanTranslations = Partial<Record<PlanTextLang, PlanText>>;

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
  /** 52 The price in Egyptian pounds (piastres): what is charged. Null until the team sets one. */
  priceCents: number | null;
  /** 52 The dollar price shown outside Egypt, set by hand; null: the pounds at the team's exchange rate. */
  usdCents: number | null;
  /** 52 The team shows the price text ("On request") instead of the price, and clients can't pay by card. */
  onRequest: boolean;
  /** How long a payment keeps the plan active. */
  billingMonths: 1 | 12;
  /** 62 The team's Arabic and Turkish texts (lib/marketing-lang.ts `planFor` shows them, else the built-in ones, else English). */
  translations?: PlanTranslations;
  /** 103R A Studio plan the team offers; one it doesn't is neither shown nor paid. Regular plans are always offered. */
  offered?: boolean;
}

/**
 * What the team edits in the admin for a plan. `version` 2 is a full edit
 * (Phase 13); an edit without it was saved for the old Starter and Pro plans
 * and only its price is kept (migration 0017 moved the old Starter's edit to
 * Growth, the tier its clients moved to).
 *
 * 52 Prices are in Egyptian pounds. An edit from before Phase 52 has a
 * `currency`: a price in pounds is kept, a dollar price becomes the shown
 * dollar price, and any other price is dropped (the plan shows its price
 * text until the team sets a price in pounds).
 */
export type PlanSetting = Pick<PlanInfo, "name" | "tagline" | "features" | "highlights" | "price" | "priceCents" | "billingMonths" | "translations" | "offered"> & {
  usdCents?: number | null;
  onRequest?: boolean;
  /** Before Phase 52: the price's currency. */
  currency?: string;
  limits?: PlanLimits;
  version?: 2;
  /** 91.4 The features the admin listed when this edit was saved; a later one is the plan's default until the team saves it again. */
  knownFeatures?: string[];
};

const BASE_LIMITS: PlanLimits = { appUsers: null, languages: null, sources: null, storageGb: 2, analyticsMonths: 3, teamMembers: 1, support: "email", accountManager: false, customFeatures: false };

export const PLAN_INFO: Record<Plan, PlanInfo> = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "An Android app, published by you with our guides",
    features: ["push"],
    limits: { ...BASE_LIMITS, appUsers: 1000, languages: 1, sources: 1, storageGb: 2, analyticsMonths: 3 },
    highlights: [
      "Android app (APK & AAB)",
      "For Google Play, Galaxy Store, AppGallery and GetApps",
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
    usdCents: null,
    onRequest: true,
    billingMonths: 12,
  },
  growth: {
    id: "growth",
    name: "Growth",
    tagline: "Android and iOS apps that grow with you",
    features: ["ios", "push", "offline_downloads", "page_editor", "card_payments", "auto_rebuild", "loyalty", "store_billing"],
    limits: { ...BASE_LIMITS, appUsers: 10000, languages: 3, sources: null, storageGb: 20, analyticsMonths: 12, support: "whatsapp" },
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
    usdCents: null,
    onRequest: true,
    billingMonths: 12,
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "We publish your apps for you",
    features: ["ios", "push", "offline_downloads", "page_editor", "card_payments", "auto_rebuild", "auto_publish", "chat", "loyalty", "store_billing"],
    limits: { ...BASE_LIMITS, appUsers: null, languages: null, sources: null, storageGb: 100, analyticsMonths: 24, teamMembers: 3, support: "priority" },
    highlights: [
      "Everything in Growth",
      "Unlimited app users",
      "All app languages",
      "We publish to all five app stores",
      "Automatic store updates",
      "Chat with your customers in the app",
      "Priority support",
    ],
    price: "On request",
    period: null,
    priceCents: null,
    usdCents: null,
    onRequest: true,
    billingMonths: 12,
  },
  business: {
    id: "business",
    name: "Business",
    tagline: "A partner for your app",
    features: ["ios", "push", "offline_downloads", "page_editor", "card_payments", "auto_rebuild", "auto_publish", "chat", "loyalty", "store_billing"],
    limits: { ...BASE_LIMITS, appUsers: null, languages: null, sources: null, storageGb: 500, analyticsMonths: 36, teamMembers: 10, support: "dedicated", accountManager: true, customFeatures: true },
    highlights: ["Everything in Pro", "A dedicated account manager", "Custom features on request", "Several team members", "Fastest support"],
    price: "On request",
    period: null,
    priceCents: null,
    usdCents: null,
    onRequest: true,
    billingMonths: 12,
  },
  // 103R Not offered, without a name or a price, until the team sets them.
  studio_1: studioPlan("studio_1", "Studio plan 1"),
  studio_2: studioPlan("studio_2", "Studio plan 2"),
  studio_3: studioPlan("studio_3", "Studio plan 3"),
};

function studioPlan(id: StudioPlan, name: string): PlanInfo {
  return {
    id,
    name,
    tagline: "",
    features: [...STUDIO_BASE_FEATURES],
    limits: { ...BASE_LIMITS, appUsers: null, languages: null, sources: null, storageGb: 20, analyticsMonths: 12, studioPages: null },
    highlights: [],
    price: "On request",
    period: null,
    priceCents: null,
    usdCents: null,
    onRequest: true,
    billingMonths: 1,
    offered: false,
  };
}

export interface PlanFeatureDef {
  id: PlanFeature;
  label: string;
  /** What the client gets, for the dashboard and the pricing table. */
  description: string;
  /** Where the platform holds to it. */
  enforced: string;
}

export const PLAN_FEATURES: PlanFeatureDef[] = [
  { id: "ios", label: "iOS app", description: "Your app on the App Store as well as the Android stores.", enforced: "Builds skip iOS and the pipeline gets no App Store key." },
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
    description: `We upload your apps and every update to ${ALL_STORES_TEXT}.`,
    enforced: "Builds' auto_publish and the Publishing step's store keys.",
  },
  {
    id: "chat",
    label: "Chat in the app",
    description: "Your app users write to you in the app, and academies get a group for each course.",
    enforced: "Config chat (hosted API and the plugin's license), the Chat endpoints and the dashboard's Chat page.",
  },
  {
    id: "loyalty",
    label: "Loyalty points",
    description: "Customers earn points on their orders and use them on the next ones.",
    enforced: "Config store.loyalty, the cart's points and GET /me/points (shops without a website), and the Products page's Loyalty points.",
  },
  {
    id: "store_billing",
    label: "In-app purchases",
    description: "Sell courses and memberships in the app through Google Play and the App Store.",
    enforced: "Config store_billing, the /billing endpoints, the license's store_billing and the In-app purchases page.",
  },
  {
    id: "studio",
    label: "Yallapp Studio",
    description: "Design every screen element by element: rows, columns, layers, texts, pictures, buttons and lists from your data.",
    enforced: "Every Studio plan has it: the served layout keeps a page's Studio design only with it.",
  },
  {
    id: "studio_motion",
    label: "Motion in the editor",
    description: "Elements that come in, move while tapped and move again and again.",
    enforced: "The served layout leaves out the elements' motion without it.",
  },
  {
    id: "studio_templates",
    label: "Save pages as own templates",
    description: "Keep any page as your own template and start new pages from it.",
    enforced: "The Studio editor's \"Save the page as my own template\" refuses without it.",
  },
];

/**
 * 31 The features as an app's owner reads them: card payments in the words of
 * what the app sells (lib/app/kinds.ts, `words.cardPayments`), and left out
 * where the app sells nothing (null).
 */
export function planFeaturesFor(cardPayments: string | null): PlanFeatureDef[] {
  return PLAN_FEATURES.flatMap((f) => (f.id !== "card_payments" ? [f] : cardPayments ? [{ ...f, description: cardPayments }] : []));
}

export type PlanLimitId = "appUsers" | "languages" | "sources" | "storageGb" | "analyticsMonths";

export const PLAN_LIMITS: { id: PlanLimitId; label: string; unlimited: string; enforced: string }[] = [
  { id: "appUsers", label: "App users", unlimited: "Unlimited", enforced: "The hosted API refuses new users past the limit (WordPress sites keep their own users: no limit)." },
  { id: "languages", label: "App languages", unlimited: "All languages", enforced: "The page editor, publishing and the served layout." },
  { id: "sources", label: "Connected platforms", unlimited: "All", enforced: "The page editor and the served layout leave out lists from other sources." },
  { id: "storageGb", label: "Storage (GB)", unlimited: "Unlimited", enforced: "Media uploads past it are refused; storage packs add to it." },
  {
    id: "analyticsMonths",
    label: "Analytics history (months)",
    unlimited: "Until the app is deleted",
    enforced: "The daily job deletes daily totals older than this, and the Analytics page starts no earlier. Single events are kept 90 days on every plan.",
  },
];

/** 72 The most months of analytics history a plan can keep (ten years). */
export const MAX_ANALYTICS_MONTHS = 120;

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLANS as readonly string[]).includes(value);
}

/** 103R Whether an app of this section can be on the plan: Studio projects on Studio plans, regular apps on regular ones. */
export function planFitsSection(plan: Plan, section: "regular" | "studio" | undefined): boolean {
  return planFamily(plan) === (section ?? "regular");
}

/** 103R Whether clients can see and pay the plan: every regular plan, the Studio plans the team offers. */
export function planOffered(plan: Pick<PlanInfo, "id" | "offered">): boolean {
  return planFamily(plan.id) === "regular" || plan.offered === true;
}

export function hasFeature(plan: Pick<PlanInfo, "features"> | null | undefined, feature: PlanFeature): boolean {
  return Boolean(plan?.features.includes(feature));
}

/** -1, 0 or 1: whether `to` is a downgrade, the same plan or an upgrade from `from` (plans of one family). */
export function comparePlans(from: Plan, to: Plan): -1 | 0 | 1 {
  const d = PLAN_RANK[to] - PLAN_RANK[from];
  return d < 0 ? -1 : d > 0 ? 1 : 0;
}

/** The lowest plan above `current` (any plan without one) that passes `test`, for "Upgrade" hints. */
export function lowestPlanWith(plans: Record<Plan, PlanInfo>, test: (plan: PlanInfo) => boolean, current?: Plan | null, family?: PlanFamily): PlanInfo | null {
  // 103R Within the family asked for, else the current plan's; the regular plans without one.
  for (const id of plansOfFamily(family ?? (current ? planFamily(current) : "regular"))) {
    if (!planOffered(plans[id])) continue;
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
    // 51 Edits saved before storage was a limit keep the plan's default.
    storageGb: v.storageGb === undefined ? fallback.storageGb : v.storageGb === null ? null : typeof v.storageGb === "number" && Number.isFinite(v.storageGb) && v.storageGb > 0 ? v.storageGb : fallback.storageGb,
    // 72 Edits saved before analytics history was a limit keep the plan's default.
    analyticsMonths:
      v.analyticsMonths === null
        ? null
        : typeof v.analyticsMonths === "number" && Number.isInteger(v.analyticsMonths) && v.analyticsMonths >= 1 && v.analyticsMonths <= MAX_ANALYTICS_MONTHS
          ? v.analyticsMonths
          : fallback.analyticsMonths,
    teamMembers: count(v.teamMembers, fallback.teamMembers),
    support: SUPPORT_LEVELS.includes(v.support as SupportLevel) ? (v.support as SupportLevel) : fallback.support,
    accountManager: typeof v.accountManager === "boolean" ? v.accountManager : fallback.accountManager,
    customFeatures: typeof v.customFeatures === "boolean" ? v.customFeatures : fallback.customFeatures,
    ...(fallback.studioPages !== undefined ? { studioPages: count(v.studioPages, fallback.studioPages) } : {}),
  };
}

/** 62 The team's Arabic and Turkish plan texts as saved, without empty ones. */
export function cleanPlanTranslations(value: unknown): PlanTranslations | undefined {
  if (!value || typeof value !== "object") return undefined;
  const out: PlanTranslations = {};
  const text = (x: unknown, max: number) => (typeof x === "string" && x.trim() ? x.trim().slice(0, max) : undefined);
  for (const lang of PLAN_TEXT_LANGS) {
    const raw = (value as Record<string, unknown>)[lang];
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const highlights = Array.isArray(r.highlights) ? r.highlights.map((h) => text(h, 80)).filter((h): h is string => Boolean(h)).slice(0, 10) : [];
    const entry: PlanText = {
      ...(text(r.name, 30) ? { name: text(r.name, 30) } : {}),
      ...(text(r.tagline, 80) ? { tagline: text(r.tagline, 80) } : {}),
      ...(highlights.length ? { highlights } : {}),
      ...(text(r.price, 30) ? { price: text(r.price, 30) } : {}),
    };
    if (Object.keys(entry).length) out[lang] = entry;
  }
  return Object.keys(out).length ? out : undefined;
}

/** The plans with the team's edits from the admin. */
/**
 * 91.4 A saved plan's features. A feature added after the edit was saved (not
 * in its `knownFeatures`; edits before 91.4 knew the eight before loyalty)
 * keeps the plan's default until the team saves the plan again.
 */
const FEATURES_BEFORE_LOYALTY: readonly string[] = ["ios", "push", "offline_downloads", "page_editor", "card_payments", "auto_rebuild", "auto_publish", "chat"];
function featuresOf(edit: PlanSetting, base: PlanInfo): PlanFeature[] {
  const known = Array.isArray(edit.knownFeatures) ? edit.knownFeatures : FEATURES_BEFORE_LOYALTY;
  const saved = (edit.features ?? []).filter((f): f is PlanFeature => (PLAN_FEATURE_IDS as readonly string[]).includes(f));
  const later = base.features.filter((f) => !known.includes(f) && !saved.includes(f));
  return [...saved, ...later];
}

export function plansWith(settings: Partial<Record<Plan, PlanSetting>> | null | undefined): Record<Plan, PlanInfo> {
  const merge = (plan: Plan): PlanInfo => {
    const base = PLAN_INFO[plan];
    const edit = settings?.[plan];
    if (!edit) return base;
    const cents = (x: unknown) => (typeof x === "number" && Number.isInteger(x) && x > 0 ? x : null);
    // 52 An edit from before Phase 52 named its currency: only pounds are charged now.
    const legacy = typeof edit.currency === "string" && edit.currency !== "EGP" ? edit.currency : null;
    const priceCents = legacy ? null : cents(edit.priceCents);
    const price = {
      price: typeof edit.price === "string" && edit.price ? edit.price : base.price,
      priceCents,
      usdCents: cents(edit.usdCents) ?? (legacy === "USD" ? cents(edit.priceCents) : null),
      onRequest: edit.onRequest === true || priceCents === null,
      billingMonths: edit.billingMonths === 1 ? (1 as const) : (12 as const),
    };
    const period = !price.onRequest ? (price.billingMonths === 1 ? "month" : "year") : null;
    // An edit from before the four tiers: only its price still means something.
    if (edit.version !== 2) return { ...base, ...price, period };
    return {
      ...base,
      ...price,
      period,
      name: edit.name || base.name,
      tagline: edit.tagline ?? base.tagline,
      highlights: Array.isArray(edit.highlights) && edit.highlights.length ? edit.highlights : base.highlights,
      features: featuresOf(edit, base),
      limits: cleanLimits(edit.limits, base.limits),
      id: plan,
      ...(cleanPlanTranslations(edit.translations) ? { translations: cleanPlanTranslations(edit.translations) } : {}),
      // 103R A Studio plan is offered only when the team says so.
      ...(planFamily(plan) === "studio" ? { offered: edit.offered === true } : {}),
    };
  };
  return Object.fromEntries(PLANS.map((plan) => [plan, merge(plan)])) as Record<Plan, PlanInfo>;
}

/** A full edit of a plan, as the admin saves it. */
export function planSettingOf(plan: PlanInfo): PlanSetting {
  return {
    version: 2,
    name: plan.name,
    tagline: plan.tagline,
    features: [...plan.features],
    knownFeatures: [...PLAN_FEATURE_IDS],
    limits: { ...plan.limits },
    highlights: [...plan.highlights],
    price: plan.price,
    priceCents: plan.priceCents,
    usdCents: plan.usdCents,
    onRequest: plan.onRequest,
    billingMonths: plan.billingMonths,
    ...(plan.translations ? { translations: plan.translations } : {}),
    ...(plan.offered !== undefined ? { offered: plan.offered } : {}),
  };
}

/** Each plan's name as the team set it. */
export function planNamesOf(plans: Record<Plan, PlanInfo>): Record<Plan, string> {
  return Object.fromEntries(PLANS.map((plan) => [plan, plans[plan].name])) as Record<Plan, string>;
}

export function planName(plan: Plan | null | undefined, plans: Record<Plan, PlanInfo> = PLAN_INFO): string {
  return plan && isPlan(plan) ? plans[plan].name : "Not set";
}

/** 52 The plan's price as the team set it (pounds, and dollars by hand or at the rate); null when it's "On request". */
export function planPriceOf(plan: Pick<PlanInfo, "priceCents" | "usdCents" | "onRequest">): YallappPrice | null {
  return plan.onRequest || plan.priceCents === null || plan.priceCents <= 0 ? null : { egpCents: plan.priceCents, usdCents: plan.usdCents };
}

/** 52 How a page shows Yallapp's prices: the visitor's currency and the team's exchange rate (lib/billing/display.ts). */
export interface PriceView {
  display: DisplayCurrency;
  egpPerUsd: number | null;
}

/** Pounds, as the team set them: the admin's view. */
export const POUNDS_VIEW: PriceView = { display: "EGP", egpPerUsd: null };

/** 52 The plan's price in the view's currency; null when it's "On request". */
export function planShownPrice(plan: PlanInfo, view: PriceView): Money | null {
  const price = planPriceOf(plan);
  return price ? shownPrice(price, view.display, view.egpPerUsd) : null;
}

/** "EGP 4,800" or "$96" with "year", or the plan's text ("On request") without a period. */
export function planPrice(plan: PlanInfo, view: PriceView = POUNDS_VIEW): { price: string; period: string | null } {
  const shown = planShownPrice(plan, view);
  if (!shown) return { price: plan.price, period: null };
  return { price: formatMoney(shown), period: plan.billingMonths === 1 ? "month" : "year" };
}

/** 32 A plan's key limits, in a few words each: app users, languages and the platforms its apps run on. */
export function planLimitLines(plan: PlanInfo): { icon: IconName; text: string }[] {
  const users = plan.limits.appUsers;
  const languages = plan.limits.languages;
  return [
    { icon: "group", text: users === null ? "Unlimited users" : `Up to ${formatLimit(users)} users` },
    { icon: "language", text: languages === null ? "All languages" : `${languages} ${languages === 1 ? "language" : "languages"}` },
    { icon: "smartphone", text: hasFeature(plan, "ios") ? "Android and iOS" : "Android" },
    // 51 Storage for the owner's videos and pictures.
    { icon: "photo_library", text: `${formatStorage(plan.limits.storageGb)} for videos and files` },
  ];
}

/**
 * 41 The stores an app on the plan can be on, and who publishes there: the
 * Android stores on every plan, the App Store with the iOS app; with "We
 * publish for you" Yallapp uploads every build to each of them.
 */
export function planStores(plan: Pick<PlanInfo, "features">): { stores: AppStore[]; publisher: "you" | "us" } {
  return { stores: storesFor(hasFeature(plan, "ios")), publisher: hasFeature(plan, "auto_publish") ? "us" : "you" };
}

/** 41 "5 app stores · We publish for you": the caption under a plan card's store marks. */
export function planStoresLine(plan: Pick<PlanInfo, "features">): string {
  const { stores, publisher } = planStores(plan);
  return `${stores.length} app stores · ${publisher === "us" ? "We publish for you" : "You publish with our guides"}`;
}

/** 72 How long analytics daily totals are kept: "3 months", "1 year", "18 months", or "Until the app is deleted". */
export function formatAnalyticsKeep(months: number | null): string {
  if (months === null) return "Until the app is deleted";
  if (months % 12 === 0) return months === 12 ? "1 year" : `${months / 12} years`;
  return months === 1 ? "1 month" : `${months} months`;
}

/** 51 "20 GB", "1 TB", or "Unlimited storage". */
export function formatStorage(gb: number | null): string {
  if (gb === null) return "Unlimited storage";
  return gb >= 1000 && gb % 1000 === 0 ? `${gb / 1000} TB` : `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(gb)} GB`;
}

/** "1,000", or the limit's word for unlimited. */
export function formatLimit(value: number | null, unlimited = "Unlimited"): string {
  return value === null ? unlimited : new Intl.NumberFormat("en-US").format(value);
}

export type ComparisonValue = boolean | string;

export interface ComparisonRow {
  label: string;
  /** The regular plans only: the pricing page shows them. */
  values: Record<RegularPlan, ComparisonValue>;
  /** 41 A store's row, shown with its mark. */
  store?: AppStore;
}

/** The pricing page's comparison table, from the plans as the team set them. */
export function comparisonRows(plans: Record<Plan, PlanInfo>): ComparisonRow[] {
  const each = (fn: (p: PlanInfo) => ComparisonValue): Record<RegularPlan, ComparisonValue> =>
    ({ starter: fn(plans.starter), growth: fn(plans.growth), pro: fn(plans.pro), business: fn(plans.business) });
  const has = (f: PlanFeature) => each((p) => hasFeature(p, f));
  return [
    { label: "Android app", values: each(() => true) },
    { label: "iOS app", values: has("ios") },
    // 41 One row per store, with its mark on the pricing page.
    ...APP_STORES.map((id): ComparisonRow => ({ label: STORE_FACTS[id].name, store: id, values: each((p) => planStores(p).stores.includes(id)) })),
    { label: "Connected platforms", values: each((p) => formatLimit(p.limits.sources, "All")) },
    { label: "App users", values: each((p) => formatLimit(p.limits.appUsers)) },
    { label: "App languages", values: each((p) => formatLimit(p.limits.languages, "All")) },
    { label: "Storage for videos and files", values: each((p) => (p.limits.storageGb === null ? "Unlimited" : formatStorage(p.limits.storageGb))) },
    // 72 How long analytics are kept.
    { label: "Analytics: daily totals kept", values: each((p) => formatAnalyticsKeep(p.limits.analyticsMonths)) },
    { label: "Analytics: single events kept (each app open, screen or search)", values: each(() => `${RAW_RETENTION_DAYS} days`) },
    { label: "Push notifications", values: has("push") },
    { label: "Pages", values: each((p) => (hasFeature(p, "page_editor") ? "Full page editor" : "Ready-made templates")) },
    { label: "Card payments in the app", values: has("card_payments") },
    { label: "Offline mode", values: has("offline_downloads") },
    { label: "Automatic rebuilds", values: has("auto_rebuild") },
    { label: "Chat in the app", values: has("chat") },
    { label: "Loyalty points", values: has("loyalty") },
    { label: "Publishing", values: each((p) => (hasFeature(p, "auto_publish") ? "We publish for you" : "You publish with our guides")) },
    { label: "Automatic store updates", values: has("auto_publish") },
    { label: "Team members", values: each((p) => formatLimit(p.limits.teamMembers)) },
    { label: "Dedicated account manager", values: each((p) => p.limits.accountManager) },
    { label: "Custom features on request", values: each((p) => p.limits.customFeatures) },
    { label: "Support", values: each((p) => SUPPORT_LABEL[p.limits.support].replace(", with your account manager", "")) },
  ];
}
