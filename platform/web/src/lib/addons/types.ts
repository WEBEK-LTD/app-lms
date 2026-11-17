import type { PeriodKey } from "../billing/periods";
import type { Plan, PlanFamily, PlanFeature } from "../plans";

/**
 * 133 Add-ons: what a client can buy for an app on top of its plan, from
 * Dashboard › Add-ons, defined by the team in Admin › Add-ons.
 *
 * - A **service** is done by the Yallapp team: buying it opens a task in
 *   Admin › Add-ons › Tasks (new, in progress, done) and tells the team.
 * - A **quantity** adds to one of the plan's limits (+10 pages, +5 GB of
 *   storage, +3 team members) while it runs.
 * - A **feature** switches a plan feature on while it runs.
 *
 * A service can switch a feature on too. (The publishing service switched
 * on "We publish for you"; 138 every plan includes it now.)
 */

export type AddonKind = "service" | "quantity" | "feature";
export const ADDON_KINDS: readonly AddonKind[] = ["service", "quantity", "feature"];

/** How an add-on is paid: once (a one-time payment that never ends), or for one of the plans' periods (lifetime included). */
export type AddonBilling = "once" | PeriodKey;
export const ADDON_BILLINGS: readonly AddonBilling[] = ["once", "1", "6", "12", "24", "36", "lifetime"];

/**
 * The limits a quantity add-on can add to: the plan's own (`pages` is a
 * Studio project's Pages per project on a Studio plan) or one the team
 * added in Admin › Plans › Limits (`x:<id>`).
 */
export type AddonLimit = "pages" | "storageGb" | "appUsers" | "languages" | "sources" | "teamMembers" | `x:${string}`;
export const BUILT_IN_ADDON_LIMITS: readonly Exclude<AddonLimit, `x:${string}`>[] = ["pages", "storageGb", "appUsers", "languages", "sources", "teamMembers"];

/** One way to pay an add-on, switched on and priced by the team (pounds charged, dollars shown outside Egypt). */
export interface AddonPrice {
  on: boolean;
  /** Null: not priced yet, so not offered. */
  egpCents: number | null;
  /** Null: the pounds at the exchange rate. */
  usdCents: number | null;
}

export interface AddonText {
  name: string;
  description: string;
}

/** Who may buy it. */
export interface AddonRule {
  /** Regular apps, Studio projects or both. */
  family: PlanFamily | "both";
  /** Only apps on a plan below their family's top plan (Admin › Add-ons › Top plans). */
  belowTop: boolean;
  /** Only apps on these plans; null: any plan. */
  plans: Plan[] | null;
}

export interface AddonDef {
  /** Lower-case letters, digits and -, like "publishing" or "pages-10". */
  id: string;
  kind: AddonKind;
  /** A Material Symbols Rounded name from components/icon-names.ts. */
  icon: string;
  /** The English texts, and the Arabic and Turkish ones the team wrote (empty: the English). */
  en: AddonText;
  ar?: Partial<AddonText>;
  tr?: Partial<AddonText>;
  /** Quantity: the limit, and how much one adds. */
  limit?: AddonLimit;
  amount?: number;
  /** Feature (or a service that also switches one on). */
  feature?: PlanFeature;
  prices: Partial<Record<AddonBilling, AddonPrice>>;
  rule: AddonRule;
  /** Can be bought again while one runs (each runs and renews on its own). */
  repeatable: boolean;
  /** Offered to clients. Off: hidden; what clients bought keeps running. */
  active: boolean;
  /** Its place in the list. */
  order: number;
}

/** The setting "addons": the team's add-ons and the top plan of each family. */
export interface AddonsSetting {
  addons: AddonDef[];
  /** The plan "below the top plan" counts from, per family; missing: the highest offered plan (138). */
  top?: Partial<Record<PlanFamily, Plan>>;
}

export type AppAddonStatus = "active" | "cancelled";
/** A service's task for the team. */
export type AddonTaskStatus = "new" | "in_progress" | "done";
export const ADDON_TASK_STATUSES: readonly AddonTaskStatus[] = ["new", "in_progress", "done"];

/**
 * An add-on an app has: bought by card (or covered by a coupon), or given by
 * the team by hand. What it does is kept as it was bought, so a later edit
 * of the add-on never changes it.
 */
export interface AppAddon {
  id: string;
  clientId: string;
  appId: string;
  addonId: string;
  kind: AddonKind;
  /** The add-on's English name when it was bought. */
  name: string;
  limit: AddonLimit | null;
  amount: number | null;
  feature: PlanFeature | null;
  billing: AddonBilling;
  /** When it ends; null: never (a one-time payment). A lifetime one ends at LIFETIME_END. */
  activeUntil: Date | null;
  status: AppAddonStatus;
  /** The payment that bought or last renewed it; null when the team gave it. */
  paymentId: string | null;
  /** The admin who gave it by hand, with no charge. */
  grantedBy: string | null;
  /** A service's task: its status and the team's note; null for the others. */
  taskStatus: AddonTaskStatus | null;
  taskNote: string | null;
  /** The end date the owner was last reminded of. */
  remindedFor: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AppAddonPatch = Partial<Pick<AppAddon, "activeUntil" | "status" | "paymentId" | "taskStatus" | "taskNote" | "remindedFor" | "updatedAt">>;

/** What an add-on payment buys, kept on the payment (`plan_payments.addon`) until it is paid. */
export interface PaidAddon {
  addonId: string;
  billing: AddonBilling;
  /** Renewing this one of the app's add-ons; null: a new one. */
  renews: string | null;
  /** The add-on's English name, for the receipt. */
  name: string;
  /** What it does, as it was when the payment started: what the client paid for, whatever the team edits later. */
  kind?: AddonKind;
  limit?: AddonLimit | null;
  amount?: number | null;
  feature?: PlanFeature | null;
}
