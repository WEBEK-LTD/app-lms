import type { DataStore } from "./data/store";
import type { App, SwitchesSetting } from "./data/types";
import { platformDefinitions } from "./hosted/connectors/registry";
import { PLAN_FEATURE_IDS, PLAN_FEATURES, PLANS, type Plan, type PlanFeature, type PlanInfo } from "./plans";
import { platformSetting } from "./settings/platform";

/**
 * Switches (roadmap 11.5): app types, websites (the Website step's choices
 * and every platform connector) and features the team turns off, for
 * everyone or per plan. A switched-off app type or website disappears from
 * the dashboard and its server actions refuse it; apps already using it keep
 * working and see a notice.
 */

export type SwitchKind = "app_type" | "website" | "feature";

export interface SwitchItem {
  /** `kind:id`, as stored in the setting. */
  key: string;
  kind: SwitchKind;
  id: string;
  label: string;
}

export const APP_TYPE_SWITCHES: { id: string; label: string }[] = [
  { id: "lms", label: "Academy" },
  { id: "store", label: "Store" },
  { id: "booking", label: "Bookings" },
  { id: "real_estate", label: "Real estate" },
];

/** The Website step's choices besides the platform connectors. */
const WEBSITE_SWITCHES: { id: string; label: string }[] = [
  { id: "wordpress", label: "WordPress site" },
  { id: "custom_api", label: "Their own API" },
  { id: "setup_requested", label: "WordPress set up by our team" },
  { id: "shopify", label: "Shopify" },
  { id: "catalog", label: "No website: products in the dashboard" },
  { id: "bookings", label: "No website: bookings in the dashboard" },
  { id: "courses", label: "No website: courses in the dashboard" },
  { id: "listings", label: "No website: listings in the dashboard" },
];

export type FeatureSwitch = PlanFeature | "marketplace" | "plan_card_payments";

export const FEATURE_SWITCHES: { id: FeatureSwitch; label: string }[] = [
  // 13.1 Every plan feature can be switched off for everyone; per plan, the plan editor sets them.
  ...PLAN_FEATURES.map((f) => ({ id: f.id, label: f.label })),
  { id: "marketplace", label: "Selling through Yallapp's iyzico account" },
  { id: "plan_card_payments", label: "Paying plans by card" },
];

/** Features that are also license features, set per plan in the plan editor itself. */
export const LICENSE_FEATURE_SWITCHES: FeatureSwitch[] = [...PLAN_FEATURE_IDS];

export const switchKey = (kind: SwitchKind, id: string) => `${kind}:${id}`;

const item = (kind: SwitchKind, id: string, label: string): SwitchItem => ({ key: switchKey(kind, id), kind, id, label });

/** Every switch, grouped as the Switches page shows them. */
export function switchGroups(): { kind: SwitchKind; title: string; items: SwitchItem[] }[] {
  return [
    { kind: "app_type", title: "App types", items: APP_TYPE_SWITCHES.map((t) => item("app_type", t.id, t.label)) },
    {
      kind: "website",
      title: "Websites and platforms",
      items: [
        ...WEBSITE_SWITCHES.map((w) => item("website", w.id, w.label)),
        ...platformDefinitions().map((p) => item("website", p.id, p.name)),
      ],
    },
    { kind: "feature", title: "Features", items: FEATURE_SWITCHES.map((f) => item("feature", f.id, f.label)) },
  ];
}

export function allSwitchKeys(): string[] {
  return switchGroups().flatMap((g) => g.items.map((i) => i.key));
}

/** On for everyone, and for this plan (no plan: only the global switch counts). */
export function isOn(setting: SwitchesSetting | null | undefined, key: string, plan?: Plan | null): boolean {
  if (!setting) return true;
  if (setting.off.includes(key)) return false;
  return !(plan && setting.offByPlan[plan]?.includes(key));
}

export function appTypeOn(setting: SwitchesSetting | null | undefined, appType: string, plan?: Plan | null): boolean {
  return isOn(setting, switchKey("app_type", appType), plan);
}

export function websiteOn(setting: SwitchesSetting | null | undefined, website: string, plan?: Plan | null): boolean {
  return isOn(setting, switchKey("website", website), plan);
}

export function featureOn(setting: SwitchesSetting | null | undefined, feature: FeatureSwitch, plan?: Plan | null): boolean {
  return isOn(setting, switchKey("feature", feature), plan);
}

/** The Website step's "no website" choice for an app type. */
export function noWebsiteFor(appType: string): string {
  return appType === "lms" ? "courses" : appType === "booking" ? "bookings" : appType === "real_estate" ? "listings" : "catalog";
}

/** The website switch an app uses now: its connector, or its backend. */
export function websiteOf(app: Pick<App, "backend" | "connector">): string {
  const connector = app.connector;
  if (connector) return connector.kind === "platform" ? connector.platform : connector.kind;
  return app.backend;
}

/** A plan's license features without the ones switched off. */
export function licenseFeatures<T extends PlanFeature>(features: readonly T[], setting: SwitchesSetting | null | undefined, plan: Plan): T[] {
  return features.filter((f) => featureOn(setting, f, plan));
}

/** The plans as the license API reports them: license features without the switched-off ones. */
export function plansWithSwitches(plans: Record<Plan, PlanInfo>, setting: SwitchesSetting | null | undefined): Record<Plan, PlanInfo> {
  const result = { ...plans };
  for (const plan of PLANS) result[plan] = { ...plans[plan], features: licenseFeatures(plans[plan].features, setting, plan) };
  return result;
}

/** The setting as saved, keeping only known keys and plans. */
export function cleanSwitches(off: string[], offByPlan: Partial<Record<Plan, string[]>>): SwitchesSetting {
  const known = new Set(allSwitchKeys());
  const keep = (keys: string[]) => [...new Set(keys)].filter((k) => known.has(k)).sort();
  const plans: Partial<Record<Plan, string[]>> = {};
  for (const plan of PLANS) {
    const keys = keep(offByPlan[plan] ?? []);
    if (keys.length) plans[plan] = keys;
  }
  return { off: keep(off), offByPlan: plans };
}

export async function getSwitches(store: DataStore, options: { fresh?: boolean } = {}): Promise<SwitchesSetting | null> {
  return (await platformSetting(store, "switches", options))?.value ?? null;
}
