import { ICON_NAMES } from "@/components/icon-names";
import { isPeriodKey, monthsOfPeriod, paymentMonthsOf, sortPeriods, type PeriodKey, type PeriodMonths } from "../billing/periods";
import type { YallappPrice } from "../billing/prices";
import { isPlan, PLAN_FEATURE_IDS, type Plan, type PlanFeature } from "../plans";
import { ADDON_BILLINGS, ADDON_KINDS, BUILT_IN_ADDON_LIMITS, type AddonBilling, type AddonDef, type AddonLimit, type AddonPrice, type AddonRule, type AddonsSetting, type AddonText } from "./types";

/**
 * 133 The add-ons the team defined (Admin › Add-ons), as saved in the
 * setting "addons", and the ones that come with Yallapp (`BUILT_IN_ADDONS`)
 * until the team edits them. Nothing here sets a price: an add-on without
 * one is never offered.
 */

/** 133 "We publish your app to the stores for you": off and unpriced until the owner prices and switches it on. */
export const PUBLISHING_ADDON_ID = "publishing";

export const BUILT_IN_ADDONS: readonly AddonDef[] = [
  {
    id: PUBLISHING_ADDON_ID,
    kind: "service",
    icon: "publish",
    en: {
      name: "We publish your app to the stores for you",
      description: "Our team publishes your app and every update to the app stores for you. For apps whose plan doesn't include publishing.",
    },
    ar: {
      name: "إحنا ننشر تطبيقك على المتاجر بدالك",
      description: "فريقنا بيرفع تطبيقك وكل تحديث ليه على متاجر التطبيقات بدالك. للتطبيقات اللي باقتها مافيهاش النشر.",
    },
    tr: {
      name: "Uygulamanızı mağazalarda sizin için yayınlıyoruz",
      description: "Ekibimiz uygulamanızı ve her güncellemesini sizin için uygulama mağazalarında yayınlar. Paketinde yayınlama olmayan uygulamalar için.",
    },
    // While it runs, the Publishing step offers "Publish it for me".
    feature: "auto_publish",
    // Monthly, yearly or for life, as the owner asked; no price until the owner sets one.
    prices: { "1": { on: true, egpCents: null, usdCents: null }, "12": { on: true, egpCents: null, usdCents: null }, lifetime: { on: true, egpCents: null, usdCents: null } },
    rule: { family: "both", belowTop: true, plans: null },
    repeatable: false,
    active: false,
    order: 0,
  },
];

export function isBuiltInAddon(id: string): boolean {
  return BUILT_IN_ADDONS.some((a) => a.id === id);
}

export const ADDON_ID = /^[a-z0-9][a-z0-9-]{1,39}$/;

const cents = (x: unknown) => (typeof x === "number" && Number.isSafeInteger(x) && x > 0 ? x : null);
const text = (x: unknown, max: number) => (typeof x === "string" ? x.trim().slice(0, max) : "");

function cleanText(value: unknown): Partial<AddonText> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  const name = text(v.name, 60);
  const description = text(v.description, 300);
  const out = { ...(name ? { name } : {}), ...(description ? { description } : {}) };
  return Object.keys(out).length ? out : undefined;
}

function cleanPrices(value: unknown): Partial<Record<AddonBilling, AddonPrice>> {
  const out: Partial<Record<AddonBilling, AddonPrice>> = {};
  if (!value || typeof value !== "object") return out;
  for (const billing of ADDON_BILLINGS) {
    const raw = (value as Record<string, unknown>)[billing];
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    out[billing] = { on: r.on === true, egpCents: cents(r.egpCents), usdCents: cents(r.usdCents) };
  }
  return out;
}

function cleanRule(value: unknown): AddonRule {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const plans = Array.isArray(v.plans) ? v.plans.filter((p): p is Plan => isPlan(p)) : null;
  return {
    family: v.family === "regular" || v.family === "studio" ? v.family : "both",
    belowTop: v.belowTop === true,
    plans: plans && plans.length ? plans : null,
  };
}

export function isAddonLimit(value: unknown): value is AddonLimit {
  return typeof value === "string" && ((BUILT_IN_ADDON_LIMITS as readonly string[]).includes(value) || /^x:[a-z0-9_]{1,40}$/.test(value));
}

/** One add-on as saved, checked; null when it isn't one. */
export function cleanAddon(value: unknown): AddonDef | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const id = typeof v.id === "string" ? v.id : "";
  const kind = ADDON_KINDS.find((k) => k === v.kind);
  const en = cleanText(v.en);
  if (!ADDON_ID.test(id) || !kind || !en?.name) return null;
  const icon = typeof v.icon === "string" && (ICON_NAMES as readonly string[]).includes(v.icon) ? v.icon : "widgets";
  const feature = typeof v.feature === "string" && (PLAN_FEATURE_IDS as readonly string[]).includes(v.feature) ? (v.feature as PlanFeature) : undefined;
  const limit = isAddonLimit(v.limit) ? v.limit : undefined;
  const amount = typeof v.amount === "number" && Number.isFinite(v.amount) && v.amount > 0 && v.amount <= 1_000_000 ? v.amount : undefined;
  const ar = cleanText(v.ar);
  const tr = cleanText(v.tr);
  if (kind === "quantity" && (!limit || !amount)) return null;
  if (kind === "feature" && !feature) return null;
  return {
    id,
    kind,
    icon,
    en: { name: en.name, description: en.description ?? "" },
    ...(ar ? { ar } : {}),
    ...(tr ? { tr } : {}),
    ...(kind === "quantity" ? { limit, amount } : {}),
    ...(kind !== "quantity" && feature ? { feature } : {}),
    prices: cleanPrices(v.prices),
    rule: cleanRule(v.rule),
    repeatable: v.repeatable === true,
    active: v.active === true,
    order: typeof v.order === "number" && Number.isFinite(v.order) ? v.order : 0,
  };
}

/**
 * The add-ons, in the team's order: the saved ones, and the built-in ones
 * the team hasn't saved yet (as they come). An id saved twice keeps the
 * first.
 */
export function addonsOf(setting: AddonsSetting | null | undefined): AddonDef[] {
  const saved = (Array.isArray(setting?.addons) ? setting.addons : []).map(cleanAddon).filter((a): a is AddonDef => a !== null);
  const seen = new Set<string>();
  const list = [...saved, ...BUILT_IN_ADDONS.filter((b) => !saved.some((s) => s.id === b.id))].filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
  return list.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function addonById(setting: AddonsSetting | null | undefined, id: string): AddonDef | null {
  return addonsOf(setting).find((a) => a.id === id) ?? null;
}

/** The top plan per family the team chose (only plans of that family). */
export function topPlansOf(setting: AddonsSetting | null | undefined): AddonsSetting["top"] {
  const top = setting?.top ?? {};
  return {
    ...(isPlan(top.regular) ? { regular: top.regular } : {}),
    ...(isPlan(top.studio) ? { studio: top.studio } : {}),
  };
}

/** An add-on's price for a way to pay, while it is switched on and priced in pounds. */
export function addonPriceOf(addon: Pick<AddonDef, "prices">, billing: AddonBilling): YallappPrice | null {
  const p = addon.prices[billing];
  return p?.on && p.egpCents ? { egpCents: p.egpCents, usdCents: p.usdCents } : null;
}

/** The ways to pay an add-on clients can choose now: one-time first, then the periods shortest first, lifetime last. */
export function addonBillings(addon: Pick<AddonDef, "prices">): { billing: AddonBilling; price: YallappPrice }[] {
  const once = addonPriceOf(addon, "once");
  const periods = sortPeriods(
    ADDON_BILLINGS.filter((b): b is PeriodKey => isPeriodKey(b)).flatMap((key) => {
      const price = addonPriceOf(addon, key);
      return price ? [{ key, price }] : [];
    }),
  ).map((p) => ({ billing: p.key as AddonBilling, price: p.price }));
  return [...(once ? [{ billing: "once" as const, price: once }] : []), ...periods];
}

/** A payment's months for a way to pay (0: once or for life). */
export function addonMonthsOf(billing: AddonBilling): PeriodMonths {
  return billing === "once" ? 0 : paymentMonthsOf(billing);
}

/** Whether an add-on bought this way ends: the periods do, once and lifetime don't. */
export function addonEnds(billing: AddonBilling): boolean {
  return billing !== "once" && monthsOfPeriod(billing) !== null;
}

/** The add-on's name and description in a language (the team's own, else the English). */
export function addonText(addon: Pick<AddonDef, "en" | "ar" | "tr">, lang: string): AddonText {
  const own = lang === "ar" ? addon.ar : lang === "tr" ? addon.tr : undefined;
  return { name: own?.name || addon.en.name, description: own?.description || addon.en.description };
}

/** "Once", "1 month" … "3 years", "Lifetime": how an add-on is paid, in English. */
export function billingLabel(billing: AddonBilling): string {
  if (billing === "once") return "One-time";
  return { "1": "1 month", "6": "6 months", "12": "1 year", "24": "2 years", "36": "3 years", lifetime: "Lifetime" }[billing];
}

export function isAddonBilling(value: unknown): value is AddonBilling {
  return typeof value === "string" && (ADDON_BILLINGS as readonly string[]).includes(value);
}
