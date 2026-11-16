import type { IconName } from "@/components/icon-names";
import { formatMoney, shownPrice, type DisplayCurrency, type Money, type YallappPrice } from "./billing/prices";
import { isPeriodKey, isPeriodMonths, paymentMonthsOf, periodOfMonths, periodUnit, PERIOD_KEYS, sortPeriods, type PeriodKey, type PeriodMonths, type PricedPeriod } from "./billing/periods";
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

/** The regular apps' four plans that always exist: Starter, Growth, Pro and Business. */
export const DEFAULT_REGULAR_PLANS = ["starter", "growth", "pro", "business"] as const;
export type DefaultRegularPlan = (typeof DEFAULT_REGULAR_PLANS)[number];
/**
 * The regular apps' plans, on the pricing page and in the dashboard: the
 * four, and 133 up to eight more the team adds in Admin › Plans (like
 * Studio's), each not offered and without a price until the team sets them.
 */
export const REGULAR_PLANS = [...DEFAULT_REGULAR_PLANS, "regular_5", "regular_6", "regular_7", "regular_8", "regular_9", "regular_10", "regular_11", "regular_12"] as const;
/** 133 The regular plans Admin › Plans always shows; the team adds the others one at a time. */
export const REGULAR_PLANS_SHOWN = DEFAULT_REGULAR_PLANS.length;
/**
 * 103R Yallapp Studio's plans: a family of their own, named, priced and
 * offered by the team in Admin › Plans › Yallapp Studio. A Studio project is
 * paid on a Studio plan only, a regular app on a regular plan only.
 */
export const STUDIO_PLANS = ["studio_1", "studio_2", "studio_3", "studio_4", "studio_5", "studio_6", "studio_7", "studio_8"] as const;
/** 103R The Studio plans Admin › Plans always shows; the team adds the others one at a time. */
export const STUDIO_PLANS_SHOWN = 3;
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

/** 103R Every plan the team can give: the regular ones, and Studio's first three with those the team added. */
export function plansInList(saved: Partial<Record<string, unknown>> | null | undefined): Plan[] {
  return [...plansShown("regular", saved), ...plansShown("studio", saved)];
}

/** How many of a family's plans always exist (the others are added by the team). */
export function plansAlwaysShown(family: PlanFamily): number {
  return family === "studio" ? STUDIO_PLANS_SHOWN : REGULAR_PLANS_SHOWN;
}

/** 133 Whether the team added the plan (beyond the ones that always exist): it can be removed while no client has ever been on it. */
export function isAddedPlan(plan: Plan): boolean {
  return plansOfFamily(planFamily(plan)).indexOf(plan) >= plansAlwaysShown(planFamily(plan));
}

/**
 * 103R The plans of a family the team can give: the ones that always exist
 * and those it added (saved in Admin › Plans), and the app's own; 133 the
 * regular ones the same way as Studio's.
 */
export function plansShown(family: PlanFamily, saved: Partial<Record<string, unknown>> | null | undefined, current?: Plan): Plan[] {
  const always = plansAlwaysShown(family);
  return plansOfFamily(family).filter((p, i) => i < always || Boolean(saved?.[p]) || p === current);
}

/** Each plan's place in its family by default, lower to higher (133 the team can reorder them: `PlanInfo.order`). */
export const PLAN_RANK: Record<Plan, number> = Object.fromEntries(PLANS.map((p) => [p, plansOfFamily(planFamily(p)).indexOf(p)])) as Record<Plan, number>;

/** 133 A plan's place in its family, lower to higher: the team's order, else the default one. */
export function planRank(plan: Plan, plans?: Partial<Record<Plan, Pick<PlanInfo, "order">>> | null): number {
  const order = plans?.[plan]?.order;
  // The team's order first; plans in the same place keep their default order.
  return (typeof order === "number" && Number.isFinite(order) ? order : PLAN_RANK[plan]) * 100 + PLAN_RANK[plan];
}

/** 133 A family's plans in the team's order, lower to higher. */
export function plansInOrder<P extends Plan>(ids: readonly P[], plans: Partial<Record<Plan, Pick<PlanInfo, "order">>> | null | undefined): P[] {
  return [...ids].sort((a, b) => planRank(a, plans) - planRank(b, plans));
}

/** 133 The plans clients can choose now, in order: offered (shown) and not archived. */
export function plansForSale(plans: Record<Plan, PlanInfo>, family: PlanFamily): PlanInfo[] {
  return plansInOrder(plansOfFamily(family), plans)
    .map((id) => plans[id])
    .filter(planOffered);
}

/**
 * Features a plan has or hasn't. They are also the license features the
 * license API reports to the plugin (docs/api/platform.yaml).
 */
/**
 * 77 `chat`: the app's chat with the business (and course groups). 91.4 `loyalty`: loyalty points in shops without a website.
 * 100.2 `store_billing`: courses and memberships bought in the app through Google Play and the App Store.
 * 103 `studio`: Yallapp Studio, off on every plan until the team turns it on (Admin › Plans).
 * 104 `delivery`: delivery and courier apps; `courier_app`: the company's second app for its couriers. Both off on
 * every plan until the team turns them on and prices them (Admin › Plans). 112.3 `courier_app` is the only app
 * delivery, food, ride and taxi companies' couriers and drivers have, so every Studio plan has it unless the team
 * unticks it.
 */
export const PLAN_FEATURE_IDS = ["ios", "push", "offline_downloads", "page_editor", "page_editor_basic", "card_payments", "auto_rebuild", "auto_publish", "chat", "loyalty", "store_billing", "studio", "studio_motion", "studio_templates", "delivery", "courier_app", "food", "rides", "instructors", "school", "taxi", "university", "market", "travel"] as const;
export type PlanFeature = (typeof PLAN_FEATURE_IDS)[number];

/** 103R Features only Studio plans have, so the regular plans' editor leaves them out (104 delivery companies are Studio projects). */
export const STUDIO_ONLY_FEATURES: readonly PlanFeature[] = ["studio", "studio_motion", "studio_templates", "delivery", "courier_app", "food", "market", "rides", "instructors", "school", "taxi", "university", "travel"];

/**
 * 103R What every Studio plan includes, besides what the team ticks in
 * Admin › Plans › Yallapp Studio (`STUDIO_PLAN_CHOICES`).
 */
export const STUDIO_BASE_FEATURES: readonly PlanFeature[] = ["studio", "push", "page_editor", "offline_downloads", "card_payments", "auto_rebuild", "chat", "loyalty", "store_billing"];

/**
 * 112.3 What a Studio plan has until the team saves it: the base, and the
 * couriers' and drivers' own app, so a delivery, food, ride or taxi company
 * is never left with couriers or drivers who have no app.
 */
export const STUDIO_DEFAULT_FEATURES: readonly PlanFeature[] = [...STUDIO_BASE_FEATURES, "courier_app"];

/** 112.3 The project kinds whose couriers or drivers work in the second app (`courier_app`). */
export const SECOND_APP_KINDS: readonly PlanFeature[] = ["delivery", "food", "market", "rides", "taxi"];

/** 103R The features the team ticks for each Studio plan, as the admin's design lists them. */
export const STUDIO_PLAN_CHOICES: readonly PlanFeature[] = ["ios", "auto_publish", "delivery", "courier_app", "food", "market", "rides", "instructors", "school", "taxi", "university", "travel", "studio_motion", "studio_templates"];

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
  /**
   * 133 Pages in a regular app (null or missing: as many as its editor takes;
   * the simple page editor's template pages, BASIC_MAX_PAGES). Enforced:
   * publishing and the served layout (lib/pages/plan.ts).
   */
  pages?: number | null;
}

/** 62 A plan's texts in Arabic or Turkish, as the team wrote them in Admin › Plans; empty ones fall back. */
export interface PlanText {
  name?: string;
  tagline?: string;
  highlights?: string[];
  price?: string;
  /** 133 The badge on the plan's card, when the team wrote its own. */
  badge?: string;
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
  /** How long a payment of the main price keeps the plan active; 133 any period (0: for life). */
  billingMonths: PeriodMonths;
  /** 62 The team's Arabic and Turkish texts (lib/marketing-lang.ts `planFor` shows them, else the built-in ones, else English). */
  translations?: PlanTranslations;
  /**
   * 103R A Studio plan the team offers; one it doesn't is neither shown nor
   * paid. 133 The same for regular plans: the four are offered until the
   * team hides one, an added one once the team offers it.
   */
  offered?: boolean;
  /**
   * 133 The billing periods the plan offers besides its main one (the price
   * above): each switched on and priced by the team, per currency. A period
   * without a price in pounds isn't offered.
   */
  periods?: PlanPeriods;
  /** 133 Its place among its family's plans, lower to higher: an upgrade moves up. Missing: the default order. */
  order?: number;
  /** 133 Archived: hidden from new sales. Clients on it keep it and may renew it; nothing else changes for them. */
  archived?: boolean;
  /** 133 The card the pricing page highlights, with its badge ("Most popular" unless the team wrote its own). */
  featured?: boolean;
  /** 133 The badge's English text; empty: "Most popular". */
  badge?: string;
  /** 133 The team's own limits (Admin › Plans › Limits), by their id: a number, null for no limit; missing: not on this plan. */
  extraLimits?: Record<string, number | null>;
}

/** 133 One of a plan's other billing periods, as the team set it. */
export interface PlanPeriodSetting {
  on: boolean;
  /** The price in pounds (piastres): what is charged. Null: not priced yet, so not offered. */
  egpCents: number | null;
  /** The dollar price shown outside Egypt, by hand; null: the pounds at the exchange rate. */
  usdCents: number | null;
}
export type PlanPeriods = Partial<Record<PeriodKey, PlanPeriodSetting>>;

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
export type PlanSetting = Pick<PlanInfo, "name" | "tagline" | "features" | "highlights" | "price" | "priceCents" | "billingMonths" | "translations" | "offered" | "periods" | "order" | "archived" | "featured" | "badge" | "extraLimits"> & {
  usdCents?: number | null;
  onRequest?: boolean;
  /** Before Phase 52: the price's currency. */
  currency?: string;
  limits?: PlanLimits;
  version?: 2;
  /** 91.4 The features the admin listed when this edit was saved; a later one is the plan's default until the team saves it again. */
  knownFeatures?: string[];
  /**
   * 112.3 Saved knowing that `courier_app` is the couriers' and drivers'
   * only app. An edit from before with a delivery, food, ride or taxi kind
   * has it until the team saves the plan again.
   */
  courierAppKnown?: true;
};

const BASE_LIMITS: PlanLimits = { appUsers: null, languages: null, sources: null, storageGb: 2, analyticsMonths: 3, teamMembers: 1, support: "email", accountManager: false, customFeatures: false };

export const PLAN_INFO: Record<Plan, PlanInfo> = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "An Android app, published by you with our guides",
    features: ["push", "page_editor_basic"],
    limits: { ...BASE_LIMITS, appUsers: 1000, languages: 1, sources: 1, storageGb: 2, analyticsMonths: 3 },
    highlights: [
      "Android app (APK & AAB)",
      "For Google Play, Galaxy Store, AppGallery and GetApps",
      "1 connected platform",
      "Up to 1,000 app users",
      "1 app language",
      "Push notifications",
      "Simple page editor",
      "Step-by-step publishing guides",
      "Email support",
    ],
    price: "On request",
    period: null,
    priceCents: null,
    usdCents: null,
    onRequest: true,
    billingMonths: 12,
    offered: true,
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
    offered: true,
    // 32 The plan most clients pick.
    featured: true,
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
    offered: true,
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
    offered: true,
  },
  // 133 Added by the team from Admin › Plans › Regular apps: not offered, without a name or a price, until the team sets them.
  regular_5: addedRegularPlan("regular_5", "Plan 5"),
  regular_6: addedRegularPlan("regular_6", "Plan 6"),
  regular_7: addedRegularPlan("regular_7", "Plan 7"),
  regular_8: addedRegularPlan("regular_8", "Plan 8"),
  regular_9: addedRegularPlan("regular_9", "Plan 9"),
  regular_10: addedRegularPlan("regular_10", "Plan 10"),
  regular_11: addedRegularPlan("regular_11", "Plan 11"),
  regular_12: addedRegularPlan("regular_12", "Plan 12"),
  // 103R Not offered, without a name or a price, until the team sets them.
  studio_1: studioPlan("studio_1", "Studio plan 1"),
  studio_2: studioPlan("studio_2", "Studio plan 2"),
  studio_3: studioPlan("studio_3", "Studio plan 3"),
  // Added by the team from Admin › Plans › Yallapp Studio.
  studio_4: studioPlan("studio_4", "Studio plan 4"),
  studio_5: studioPlan("studio_5", "Studio plan 5"),
  studio_6: studioPlan("studio_6", "Studio plan 6"),
  studio_7: studioPlan("studio_7", "Studio plan 7"),
  studio_8: studioPlan("studio_8", "Studio plan 8"),
};

/**
 * 133 A regular plan slot the team can add. Adding one copies the plan the
 * team starts it from (Admin › Plans › Add a plan); these are only what an
 * unsaved slot holds: Starter's features and limits, not offered, no price.
 */
function addedRegularPlan(id: RegularPlan, name: string): PlanInfo {
  return {
    id,
    name,
    tagline: "",
    features: ["push", "page_editor_basic"],
    limits: { ...BASE_LIMITS, appUsers: 1000, languages: 1, sources: 1, storageGb: 2, analyticsMonths: 3 },
    highlights: [],
    price: "On request",
    period: null,
    priceCents: null,
    usdCents: null,
    onRequest: true,
    billingMonths: 12,
    offered: false,
  };
}

function studioPlan(id: StudioPlan, name: string): PlanInfo {
  return {
    id,
    name,
    tagline: "",
    features: [...STUDIO_DEFAULT_FEATURES],
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
    id: "page_editor_basic",
    label: "Simple page editor",
    description:
      "Change the texts, pictures, links and slides of your pages, reorder, hide and show their sections, and add basic ones. The full page editor adds every block, styling and more pages.",
    enforced: "The page editor (basic blocks only, no styling, saved sections or new pages) and the served layout (no web page blocks, no block styling, at most the template's pages).",
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
  {
    id: "delivery",
    label: "Delivery & courier projects",
    description: "Customers send parcels and follow them; your couriers get their jobs in the app.",
    enforced: "The hosted API's /delivery, /me/shipments and /courier endpoints, and the Shipments, Couriers and Delivery settings pages.",
  },
  {
    id: "courier_app",
    label: "A second app for couriers",
    description: "A second app in your name, made only for your couriers and drivers. It is the only app delivery, food, ride and taxi projects' couriers and drivers work in: without it they have none. On every Studio plan unless unticked.",
    enforced: "Builds › the couriers' or drivers' app, and its builds.",
  },
  {
    id: "food",
    label: "Food delivery from many restaurants",
    description: "Customers order from your restaurants; each restaurant takes its orders and your couriers deliver them.",
    enforced: "The hosted API's /food, /me/food-orders and /restaurant endpoints, and the Restaurants and Food orders pages.",
  },
  // 115.13 Not `marketplace`: 9.5's removed feature had that ID, and saved plans or switches may still name it.
  {
    id: "market",
    label: "Marketplace: restaurants, supermarkets and stores",
    description: "A food delivery app grown into a marketplace: restaurants, supermarkets and shops in one app, each with its own staff, commission and statements; vendors join by your form; offers, coupons, the wallet and the club; your couriers or the vendor's own.",
    enforced: "The hosted API's /market, /vendor, /me/market-orders, /me/complaints, /me/wallet and /me/club endpoints of marketplace projects, and their Marketplace pages.",
  },
  {
    id: "rides",
    label: "Ride hailing",
    description: "Riders ask for a ride and follow the driver on the map; your drivers get the rides in the app (their own driver app with A second app for couriers).",
    enforced: "The hosted API's /rides, /me/rides and /driver endpoints, and the Rides, Drivers and Vehicle types pages.",
  },
  {
    id: "instructors",
    label: "Academies with many teachers",
    description: "Your teachers publish their own courses after your review, answer their students and see their share of the sales.",
    enforced: "The hosted API's /teachers and /teacher endpoints, and the Teachers and Teacher statements pages.",
  },
  {
    id: "school",
    label: "Schools",
    description: "Students and parents follow the timetable, homework, grades, attendance and fees; your teachers take attendance and give homework in the app.",
    enforced: "The hosted API's /school and /classroom endpoints, and the school's pages.",
  },
  // 126
  {
    id: "travel",
    label: "Travel: hotels and flights",
    description: "Hotels, rooms and fixed-seat flights set in the dashboard; people search, book a stay, a flight or both as one trip, pay into your own account or at the hotel, and follow their trip in the app.",
    enforced: "The hosted API's /travel and /me/travel endpoints, and the Hotels, Flights and Bookings pages.",
  },
  // 113.9
  {
    id: "university",
    label: "Universities",
    description: "A school runs as a university: faculties, programs, course registration each term approved by the advisor, lecturers' grades, the GPA and the transcript in the app.",
    enforced: "The hosted API's /school/students/{id}/university and /classroom/university endpoints, and the University pages.",
  },
  {
    id: "taxi",
    label: "Live taxi on the map",
    description: "Riders see the free taxis around them move on the map and follow their driver second by second, on your own Google Maps or OpenStreetMap and your own Firebase.",
    enforced: "The hosted API's /rides, /me/rides, /driver and /taxi endpoints of live taxi apps, and their Rides, Drivers, Vehicle types, Live map and Maps & live pages.",
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

export type PlanLimitId = "appUsers" | "languages" | "sources" | "storageGb" | "analyticsMonths" | "pages";

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
  // 133 Regular apps only: a Studio plan has its Pages per project.
  {
    id: "pages",
    label: "Pages in the app",
    unlimited: "As many as the editor takes",
    enforced: "Publishing refuses more pages, and the served layout keeps the first ones. Empty: no limit (the simple page editor keeps its template's 6 pages).",
  },
];

/**
 * 133 A limit the team added in Admin › Plans › Limits: shown to clients on
 * the pricing page and the Plan page, and handled by the team (nothing in
 * the platform counts it). Each plan has a number for it, or no limit, or
 * nothing (then it isn't shown for that plan). Quantity add-ons can add to
 * it too.
 */
export interface PlanLimitDef {
  /** Lower-case letters, digits and _, like "builds_per_month". */
  id: string;
  /** The English name, like "Builds per month". */
  name: string;
  /** The Arabic and Turkish names; empty: the English. */
  ar?: string;
  tr?: string;
}

/** 133 The setting "planExtras": the team's own limits, and its own wording of what "lifetime" covers (empty: the default note). */
export interface PlanExtrasSetting {
  limits: PlanLimitDef[];
  lifetimeNote?: Partial<Record<"en" | "ar" | "tr", string>>;
}

/** 133 The team's wording of the lifetime note in a language, or null for the default one. */
export function lifetimeNoteOf(setting: PlanExtrasSetting | null | undefined, lang: string): string | null {
  const own = setting?.lifetimeNote?.[lang as "en" | "ar" | "tr"];
  return typeof own === "string" && own.trim() ? own.trim().slice(0, 600) : null;
}

/** 133 The team's limits as saved: known shapes only, ids unique, at most 20. */
export function cleanLimitDefs(value: unknown): PlanLimitDef[] {
  const list = Array.isArray((value as { limits?: unknown } | null)?.limits) ? ((value as { limits: unknown[] }).limits) : [];
  const out: PlanLimitDef[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : "";
    const name = typeof r.name === "string" ? r.name.trim().slice(0, 40) : "";
    if (!/^[a-z0-9_]{1,40}$/.test(id) || !name || out.some((d) => d.id === id)) continue;
    const text = (x: unknown) => (typeof x === "string" && x.trim() ? x.trim().slice(0, 40) : undefined);
    out.push({ id, name, ...(text(r.ar) ? { ar: text(r.ar) } : {}), ...(text(r.tr) ? { tr: text(r.tr) } : {}) });
    if (out.length >= 20) break;
  }
  return out;
}

/** 133 A limit's id from its name: "Builds per month" → "builds_per_month". */
export function limitIdOf(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

/** 133 The team's limit's name in a language. */
export function limitDefName(def: PlanLimitDef, lang: string): string {
  return (lang === "ar" ? def.ar : lang === "tr" ? def.tr : undefined) ?? def.name;
}

/** 72 The most months of analytics history a plan can keep (ten years). */
export const MAX_ANALYTICS_MONTHS = 120;

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLANS as readonly string[]).includes(value);
}

/** 103R Whether an app of this section can be on the plan: Studio projects on Studio plans, regular apps on regular ones. */
export function planFitsSection(plan: Plan, section: "regular" | "studio" | undefined): boolean {
  return planFamily(plan) === (section ?? "regular");
}

/**
 * 103R Whether clients can see and pay the plan: the four regular plans
 * unless the team hid one, the Studio plans (and 133 the added regular ones)
 * the team offers; 133 never an archived plan (its clients keep it, and may
 * renew it: `planRenewable`).
 */
export function planOffered(plan: Pick<PlanInfo, "id" | "offered"> & Partial<Pick<PlanInfo, "archived">>): boolean {
  if (plan.archived) return false;
  if (planFamily(plan.id) === "regular" && !isAddedPlan(plan.id)) return plan.offered !== false;
  return plan.offered === true;
}

/** 133 Whether an app on `current` can pay for `plan`: an offered plan, or its own plan when that was archived. */
export function planPayableFor(plan: Pick<PlanInfo, "id" | "offered"> & Partial<Pick<PlanInfo, "archived">>, current: Plan | null | undefined): boolean {
  return planOffered(plan) || (plan.archived === true && plan.id === current);
}

export function hasFeature(plan: Pick<PlanInfo, "features"> | null | undefined, feature: PlanFeature): boolean {
  return Boolean(plan?.features.includes(feature));
}

/**
 * The page editor a plan has: the full one, the simple one (texts, pictures,
 * links and slides of the template's pages, basic blocks, no styling) or none
 * (the ready-made pages). The full editor includes the simple one.
 */
export type PageEditorLevel = "full" | "basic" | null;
export function pageEditorLevel(plan: Pick<PlanInfo, "features"> | null | undefined): PageEditorLevel {
  if (hasFeature(plan, "page_editor")) return "full";
  return hasFeature(plan, "page_editor_basic") ? "basic" : null;
}

/** The most pages an app on the simple page editor has: its template's (the designs have 4 to 6). */
export const SIMPLE_EDITOR_PAGES = 6;

/**
 * 133 The pages a regular app may have: the plan's limit (quantity add-ons
 * included), else the simple editor's template pages; null: no limit.
 */
export function pagesLimitOf(plan: Pick<PlanInfo, "features" | "limits"> | null | undefined): number | null {
  if (!plan) return null;
  if (typeof plan.limits.pages === "number") return plan.limits.pages;
  return pageEditorLevel(plan) === "basic" ? SIMPLE_EDITOR_PAGES : null;
}

/** -1, 0 or 1: whether `to` is a downgrade, the same plan or an upgrade from `from` (plans of one family); 133 in the team's order with `plans`. */
export function comparePlans(from: Plan, to: Plan, plans?: Partial<Record<Plan, Pick<PlanInfo, "order">>> | null): -1 | 0 | 1 {
  if (from === to) return 0;
  const d = planRank(to, plans) - planRank(from, plans);
  return d < 0 ? -1 : d > 0 ? 1 : 0;
}

/** The lowest plan above `current` (any plan without one) that passes `test`, for "Upgrade" hints. */
export function lowestPlanWith(plans: Record<Plan, PlanInfo>, test: (plan: PlanInfo) => boolean, current?: Plan | null, family?: PlanFamily): PlanInfo | null {
  // 103R Within the family asked for, else the current plan's; the regular plans without one.
  for (const id of plansInOrder(plansOfFamily(family ?? (current ? planFamily(current) : "regular")), plans)) {
    if (!planOffered(plans[id])) continue;
    if (current && planRank(id, plans) <= planRank(current, plans)) continue;
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
    // 133 Pages in a regular app: set by the team only (missing: as many as the editor takes).
    ...(v.pages === null || (typeof v.pages === "number" && Number.isInteger(v.pages) && v.pages >= 1) ? { pages: v.pages as number | null } : {}),
  };
}

/** 133 A plan's other periods as saved: known periods only, prices that are whole positive piastres or cents. */
export function cleanPlanPeriods(value: unknown): PlanPeriods | undefined {
  if (!value || typeof value !== "object") return undefined;
  const cents = (x: unknown) => (typeof x === "number" && Number.isSafeInteger(x) && x > 0 ? x : null);
  const out: PlanPeriods = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!isPeriodKey(key) || !raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    out[key] = { on: r.on === true, egpCents: cents(r.egpCents), usdCents: cents(r.usdCents) };
  }
  return Object.keys(out).length ? out : undefined;
}

/** 133 The team's own limits' values as saved: numbers from 0, or null for no limit. */
function cleanExtraLimits(value: unknown): Record<string, number | null> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const out: Record<string, number | null> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (!/^[a-z0-9_]{1,40}$/.test(key)) continue;
    if (v === null || (typeof v === "number" && Number.isFinite(v) && v >= 0)) out[key] = v as number | null;
  }
  return Object.keys(out).length ? out : undefined;
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
      ...(text(r.badge, 24) ? { badge: text(r.badge, 24) } : {}),
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
  // 112.3 A Studio plan saved before, with couriers or drivers, keeps their app (its default) until the team saves it again.
  const secondApp =
    edit.courierAppKnown !== true && base.features.includes("courier_app") && !saved.includes("courier_app") && !later.includes("courier_app") && saved.some((f) => SECOND_APP_KINDS.includes(f));
  return [...saved, ...later, ...(secondApp ? (["courier_app"] as const) : [])];
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
      // 133 Any of the periods; edits from before kept monthly or yearly.
      billingMonths: isPeriodMonths(edit.billingMonths) ? edit.billingMonths : (12 as const),
    };
    const period = !price.onRequest ? periodUnit(periodOfMonths(price.billingMonths) ?? "12") : null;
    // An edit from before the four tiers: only its price still means something.
    if (edit.version !== 2) return { ...base, ...price, period };
    const periods = cleanPlanPeriods(edit.periods);
    const extraLimits = cleanExtraLimits(edit.extraLimits);
    const translations = cleanPlanTranslations(edit.translations);
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
      ...(translations ? { translations } : {}),
      // 103R A Studio plan (133 and an added regular one) is offered only when the team says so; 133 the four regular ones until the team hides one.
      offered: typeof edit.offered === "boolean" ? edit.offered : base.offered,
      ...(periods ? { periods } : {}),
      ...(typeof edit.order === "number" && Number.isFinite(edit.order) ? { order: edit.order } : {}),
      ...(edit.archived === true ? { archived: true } : {}),
      featured: typeof edit.featured === "boolean" ? edit.featured : base.featured,
      ...(typeof edit.badge === "string" && edit.badge.trim() ? { badge: edit.badge.trim().slice(0, 24) } : {}),
      ...(extraLimits ? { extraLimits } : {}),
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
    courierAppKnown: true,
    limits: { ...plan.limits },
    highlights: [...plan.highlights],
    price: plan.price,
    priceCents: plan.priceCents,
    usdCents: plan.usdCents,
    onRequest: plan.onRequest,
    billingMonths: plan.billingMonths,
    ...(plan.translations ? { translations: plan.translations } : {}),
    ...(plan.offered !== undefined ? { offered: plan.offered } : {}),
    // 133
    ...(plan.periods ? { periods: plan.periods } : {}),
    ...(plan.order !== undefined ? { order: plan.order } : {}),
    ...(plan.archived ? { archived: true } : {}),
    ...(plan.featured !== undefined ? { featured: plan.featured } : {}),
    ...(plan.badge ? { badge: plan.badge } : {}),
    ...(plan.extraLimits ? { extraLimits: { ...plan.extraLimits } } : {}),
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
export function planPriceOf(plan: Pick<PlanInfo, "priceCents" | "usdCents" | "onRequest"> & Partial<Pick<PlanInfo, "billingMonths" | "periods">>, key?: PeriodKey): YallappPrice | null {
  if (plan.onRequest || plan.priceCents === null || plan.priceCents <= 0) return null;
  // 133 Another period than the main one: its own price, while it's switched on.
  if (key !== undefined && key !== mainPeriodOf(plan)) {
    const other = plan.periods?.[key];
    return other?.on && other.egpCents ? { egpCents: other.egpCents, usdCents: other.usdCents } : null;
  }
  return { egpCents: plan.priceCents, usdCents: plan.usdCents };
}

/** 133 The period of the plan's main price ("12" for a yearly price). */
export function mainPeriodOf(plan: Partial<Pick<PlanInfo, "billingMonths">>): PeriodKey {
  return periodOfMonths(plan.billingMonths ?? 12) ?? "12";
}

/**
 * 133 The periods clients can pay the plan for, shortest first and lifetime
 * last: its main price, and each other period the team switched on and
 * priced. None when the plan is "On request".
 */
export function planPeriods(plan: Pick<PlanInfo, "priceCents" | "usdCents" | "onRequest"> & Partial<Pick<PlanInfo, "billingMonths" | "periods">>): PricedPeriod[] {
  return sortPeriods(PERIOD_KEYS.flatMap((key) => {
    const price = planPriceOf(plan, key);
    return price ? [{ key, price }] : [];
  }));
}

/** 133 Whether the plan can be paid for this period. */
export function planHasPeriod(plan: Parameters<typeof planPeriods>[0], key: PeriodKey): boolean {
  return planPriceOf(plan, key) !== null;
}

/** 133 The period a page starts on: the one asked for when the plan has it, else the plan's main one. */
export function planPeriodOr(plan: Parameters<typeof planPeriods>[0], key: PeriodKey | null | undefined): PeriodKey {
  return key && planHasPeriod(plan, key) ? key : mainPeriodOf(plan);
}

/** 133 A payment's months for a period of the plan. */
export function planMonthsFor(key: PeriodKey): PeriodMonths {
  return paymentMonthsOf(key);
}

/** 52 How a page shows Yallapp's prices: the visitor's currency and the team's exchange rate (lib/billing/display.ts). */
export interface PriceView {
  display: DisplayCurrency;
  egpPerUsd: number | null;
}

/** Pounds, as the team set them: the admin's view. */
export const POUNDS_VIEW: PriceView = { display: "EGP", egpPerUsd: null };

/** 52 The plan's price in the view's currency; null when it's "On request"; 133 for a period (the main one without). */
export function planShownPrice(plan: PlanInfo, view: PriceView, key?: PeriodKey): Money | null {
  const price = planPriceOf(plan, key);
  return price ? shownPrice(price, view.display, view.egpPerUsd) : null;
}

/**
 * "EGP 4,800" or "$96" with "year", or the plan's text ("On request")
 * without a period. 133 For a period the plan has ("6 months", "lifetime"),
 * else its main one.
 */
export function planPrice(plan: PlanInfo, view: PriceView = POUNDS_VIEW, key?: PeriodKey): { price: string; period: string | null } {
  const period = planPeriodOr(plan, key);
  const shown = planShownPrice(plan, view, period);
  if (!shown) return { price: plan.price, period: null };
  return { price: formatMoney(shown), period: periodUnit(period) };
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
  /** The plans the pricing page shows (133 the regular ones for sale, in order). */
  values: Partial<Record<Plan, ComparisonValue>>;
  /** 41 A store's row, shown with its mark. */
  store?: AppStore;
}

/** The pricing page's comparison table, from the plans as the team set them; 133 for the plans shown (the regular ones for sale), with the team's own limits. */
export function comparisonRows(plans: Record<Plan, PlanInfo>, shown: readonly PlanInfo[] = plansForSale(plans, "regular"), limitDefs: readonly PlanLimitDef[] = []): ComparisonRow[] {
  const each = (fn: (p: PlanInfo) => ComparisonValue): Partial<Record<Plan, ComparisonValue>> => Object.fromEntries(shown.map((p) => [p.id, fn(p)]));
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
    { label: "Pages", values: each((p) => (hasFeature(p, "page_editor") ? "Full page editor" : hasFeature(p, "page_editor_basic") ? "Simple page editor" : "Ready-made templates")) },
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
    // 133 Pages, when the team limited them on a plan shown; the team's own limits that a plan shown has.
    ...(shown.some((p) => typeof p.limits.pages === "number") ? [{ label: "Pages in the app", values: each((p) => formatLimit(pagesLimitOf(p))) }] : []),
    ...extraLimitRows(shown, limitDefs, "en", (v) => formatLimit(v)),
  ];
}

/** 133 A row per team limit that one of the plans has, its value per plan ("—" where a plan doesn't have it). */
export function extraLimitRows(shown: readonly PlanInfo[], defs: readonly PlanLimitDef[], lang: string, format: (value: number | null) => string): ComparisonRow[] {
  return defs
    .filter((d) => shown.some((p) => p.extraLimits && d.id in p.extraLimits))
    .map((d) => ({
      label: limitDefName(d, lang),
      values: Object.fromEntries(shown.map((p) => [p.id, p.extraLimits && d.id in p.extraLimits ? format(p.extraLimits[d.id] ?? null) : false])),
    }));
}
