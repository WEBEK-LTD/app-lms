import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { addonBillings, addonsOf, addonText, BUILT_IN_ADDONS, cleanAddon, PUBLISHING_ADDON_ID } from "@/lib/addons/catalog";
import { addonFeatures, addonTotals, withAddons } from "@/lib/addons/effects";
import { remindEndingAddons } from "@/lib/addons/notify";
import { addonEndFor, applyPaidAddon, grantAddon, newAppAddon, startAddonPayment } from "@/lib/addons/payment";
import { addonRefusal, addonRenewable, addonRunning, belowTop, limitValue, topPlanOf } from "@/lib/addons/rules";
import type { AddonDef, AppAddon } from "@/lib/addons/types";
import { checkCoupon } from "@/lib/billing/coupons";
import { cardPeriods } from "@/lib/billing/card-plans";
import { periodPrices, periodsAmong, startPeriod } from "@/lib/billing/period-prices";
import { isLifetimeEnd, LIFETIME_END, monthsLabel, perMonth, periodEnd, periodOfMonths, savingPercent, savingReference, shownPeriods } from "@/lib/billing/periods";
import { creditDays, lifetimeLocked, planChangeFor, scheduleDowngrade } from "@/lib/billing/plan-change";
import { completePlanPayment } from "@/lib/billing/plan-payment";
import { paymentWhat, planReceiptRows } from "@/lib/billing/receipt";
import { planUsage } from "@/lib/billing/usage";
import { sha256Hex } from "@/lib/crypto/tokens";
import type { Coupon, License, PlanPayment } from "@/lib/data/types";
import { planWithAddons } from "@/lib/entitlements";
import { planLayoutErrors } from "@/lib/pages/plan";
import type { PaymentAccount } from "@/lib/payments/provider";
import {
  comparePlans,
  comparisonRows,
  isAddedPlan,
  lowestPlanWith,
  mainPeriodOf,
  pagesLimitOf,
  PLAN_INFO,
  planOffered,
  planPayableFor,
  planPeriods,
  planPrice,
  planPriceOf,
  planRank,
  plansForSale,
  planSettingOf,
  plansInOrder,
  plansShown,
  plansWith,
  REGULAR_PLANS,
  type PlanInfo,
  type PlanSetting,
} from "@/lib/plans";
import { fakeKashier } from "./fake-providers";
import { days, KEY, NOW, setupClient } from "./helpers";

/** A full edit of a plan: its defaults with these changes. */
function edit(plan: keyof typeof PLAN_INFO, patch: Partial<PlanSetting>): PlanSetting {
  return { ...planSettingOf(PLAN_INFO[plan]), ...patch };
}

// Prices the tests type in, the way the team would in Admin › Plans: none of them is Yallapp's.
const GROWTH_PERIODS = edit("growth", {
  priceCents: 150000,
  usdCents: null,
  onRequest: false,
  billingMonths: 12,
  periods: {
    "1": { on: true, egpCents: 15000, usdCents: null },
    "6": { on: true, egpCents: 80000, usdCents: null },
    "24": { on: true, egpCents: 270000, usdCents: null },
    "36": { on: false, egpCents: 360000, usdCents: null },
    lifetime: { on: true, egpCents: null, usdCents: null },
  },
});

describe("133 billing periods", () => {
  it("prices each period the team switched on and priced, the main one included, shortest first", () => {
    const plans = plansWith({ growth: GROWTH_PERIODS });
    const growth = plans.growth;
    expect(mainPeriodOf(growth)).toBe("12");
    // 36 months is off, lifetime has no price yet: neither is offered.
    expect(planPeriods(growth).map((p) => [p.key, p.price.egpCents])).toEqual([
      ["1", 15000],
      ["6", 80000],
      ["12", 150000],
      ["24", 270000],
    ]);
    expect(planPriceOf(growth, "36")).toBeNull();
    expect(planPriceOf(growth, "lifetime")).toBeNull();
    expect(planPriceOf(growth)).toEqual({ egpCents: 150000, usdCents: null });
    expect(planPrice(growth, { display: "EGP", egpPerUsd: null }, "6")).toEqual({ price: "EGP 800".replace(" ", " "), period: "6 months" });
    // A period the plan doesn't have shows its main price.
    expect(planPrice(growth, { display: "EGP", egpPerUsd: null }, "36").period).toBe("year");
  });

  it("keeps the prices saved before periods exactly as they were", () => {
    // An edit from before Phase 133: a yearly price, nothing else.
    const legacy: PlanSetting = { ...edit("pro", {}), priceCents: 480000, usdCents: 9600, onRequest: false, billingMonths: 12 };
    delete legacy.periods;
    const pro = plansWith({ pro: legacy }).pro;
    expect(planPeriods(pro)).toEqual([{ key: "12", price: { egpCents: 480000, usdCents: 9600 } }]);
    expect(planPrice(pro, { display: "USD", egpPerUsd: 50 })).toEqual({ price: "$96", period: "year" });
    // Saved again unchanged, it's the same plan.
    expect(plansWith({ pro: planSettingOf(pro) }).pro).toMatchObject({ priceCents: 480000, usdCents: 9600, billingMonths: 12, onRequest: false });
    // "On request" has no periods at all, whatever is saved.
    expect(planPeriods(plansWith({ growth: { ...GROWTH_PERIODS, onRequest: true } }).growth)).toEqual([]);
  });

  it("works out the price per month and the saving against the shortest period, never typed in", () => {
    const egp = (cents: number) => ({ cents, currency: "EGP" as const });
    expect(perMonth(egp(80000), "6")).toEqual(egp(13333));
    expect(perMonth(egp(150000), "12")).toEqual(egp(12500));
    expect(perMonth(egp(150000), "lifetime")).toBeNull();
    const monthly = { price: egp(15000), key: "1" as const };
    // 6 × 150 = 900 → 800 saves 11.1%, rounded down.
    expect(savingPercent(egp(80000), "6", monthly)).toBe(11);
    expect(savingPercent(egp(150000), "12", monthly)).toBe(16);
    // No saving when it costs as much or more, for lifetime, or across currencies.
    expect(savingPercent(egp(90000), "6", monthly)).toBeNull();
    expect(savingPercent(egp(100000), "6", monthly)).toBeNull();
    expect(savingPercent(egp(150000), "lifetime", monthly)).toBeNull();
    expect(savingPercent({ cents: 300, currency: "USD" }, "6", monthly)).toBeNull();
    // Against 6 months when there's no monthly price.
    expect(savingReference([{ key: "lifetime" }, { key: "12" }, { key: "6" }])).toEqual({ key: "6" });
    expect(savingReference([{ key: "12" }])).toBeNull();
    const shown = shownPeriods([
      { key: "1", shown: egp(15000) },
      { key: "12", shown: egp(150000) },
      { key: "lifetime", shown: egp(900000) },
    ]);
    expect(shown.map((p) => [p.key, p.perMonth, p.saving])).toEqual([
      ["1", null, null],
      ["12", "EGP 125", 16],
      ["lifetime", null, null],
    ]);
  });

  it("shows the periods in the client's currency, and only those the gateway can charge", () => {
    const growth = plansWith({ growth: GROWTH_PERIODS }).growth;
    const abroad = { display: "USD" as const, egpPerUsd: 50 };
    expect(periodPrices(growth, abroad).map((p) => [p.key, p.price, p.perMonth, p.saving])).toEqual([
      ["1", "$3", null, null],
      ["6", "$16", "$2.67", 11],
      ["12", "$30", "$2.50", 16],
      ["24", "$54", "$2.25", 25],
    ]);
    expect(cardPeriods(growth, abroad, "kashier").map((p) => [p.key, p.charge])).toEqual([
      ["1", "You'll be charged EGP 150 (about $3); your bank may convert it."],
      ["6", "You'll be charged EGP 800 (about $16); your bank may convert it."],
      ["12", "You'll be charged EGP 1,500 (about $30); your bank may convert it."],
      ["24", "You'll be charged EGP 2,700 (about $54); your bank may convert it."],
    ]);
    // The page starts on the period asked for, else the main one most plans have.
    expect(periodsAmong([growth], abroad)).toEqual(["1", "6", "12", "24"]);
    expect(startPeriod([growth], abroad, "6")).toBe("6");
    expect(startPeriod([growth], abroad, "36")).toBe("12");
  });

  it("ends a period after its months (the last day of a shorter month), or never for life", () => {
    expect(periodEnd(null, 6, new Date("2026-08-31T10:00:00Z")).toISOString()).toBe("2027-02-28T23:59:59.999Z");
    expect(periodEnd(new Date("2027-01-10T23:59:59.999Z"), 24, NOW).toISOString()).toBe("2029-01-10T23:59:59.999Z");
    expect(periodEnd(null, 36, NOW).toISOString()).toBe("2029-10-12T23:59:59.999Z");
    expect(periodEnd(new Date("2027-01-10T00:00:00Z"), 0, NOW)).toEqual(LIFETIME_END);
    // Nothing is added to a life.
    expect(periodEnd(LIFETIME_END, 12, NOW)).toEqual(LIFETIME_END);
    expect(isLifetimeEnd(LIFETIME_END)).toBe(true);
    expect(isLifetimeEnd(days(400))).toBe(false);
    expect([0, 1, 6, 12, 24, 36].map(periodOfMonths)).toEqual(["lifetime", "1", "6", "12", "24", "36"]);
    expect(monthsLabel(6)).toBe("6 months");
    expect(monthsLabel(0)).toBe("Lifetime");
  });
});

describe("133 lifetime", () => {
  const plans = plansWith({ growth: GROWTH_PERIODS, pro: edit("pro", { priceCents: 400000, usdCents: null, onRequest: false, billingMonths: 12 }) });
  const license = (patch: Partial<License> = {}): License => ({
    id: "l1",
    clientId: "c1",
    appId: "a1",
    keyHash: "",
    keyEncrypted: "",
    keyLast4: "",
    plan: "growth",
    expiresAt: days(100),
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  });

  it("is for life from today, an upgrade with nothing to credit, a downgrade from the end of the period", () => {
    expect(planChangeFor(null, plans.growth, 0, plans, NOW)).toMatchObject({ kind: "activate", plan: "growth", activeUntil: LIFETIME_END });
    expect(planChangeFor(license(), plans.pro, 0, plans, NOW)).toMatchObject({ kind: "upgrade", plan: "pro", activeUntil: LIFETIME_END, creditDays: 0 });
    expect(planChangeFor(license({ plan: "pro" }), plans.growth, 0, plans, NOW)).toMatchObject({ kind: "downgrade", plan: "pro", nextPlan: "growth", activeUntil: LIFETIME_END });
    // 6 months of Growth renew Growth: added after the current end.
    expect(planChangeFor(license(), plans.growth, 6, plans, NOW).activeUntil.toISOString()).toBe(periodEnd(days(100), 6, NOW).toISOString());
  });

  it("credits an upgrade's days at the paid period's price", () => {
    // 100 days of Growth (EGP 1,500 a year) on 6 months of Pro priced like its year: the days carry their value.
    const yearly = creditDays(plans.growth, plans.pro, 100 * 86_400_000, NOW);
    expect(yearly).toBe(37);
    // Pro has no 6-month price: its yearly one is used, the same days.
    expect(creditDays(plans.growth, plans.pro, 100 * 86_400_000, NOW, 6)).toBe(yearly);
  });

  it("is changed by the team only", async () => {
    expect(lifetimeLocked(license({ expiresAt: LIFETIME_END }))).toBe(true);
    expect(lifetimeLocked(license())).toBe(false);
    const setup = await setupClient({ plan: "pro", activeUntil: LIFETIME_END });
    const result = await scheduleDowngrade(setup.store, setup.license!, "growth", NOW);
    expect(result).toEqual({ ok: false, error: "Your plan is for life. Message us on WhatsApp to change it." });
  });
});

describe("133 plans for both families", () => {
  it("adds regular plans like Studio's, hidden until offered, in the team's order", () => {
    expect(REGULAR_PLANS).toHaveLength(12);
    expect(isAddedPlan("growth")).toBe(false);
    expect(isAddedPlan("regular_5")).toBe(true);
    expect(isAddedPlan("studio_4")).toBe(true);
    expect(plansShown("regular", {})).toEqual(["starter", "growth", "pro", "business"]);
    const saved = { regular_5: edit("regular_5", { name: "Lite", offered: false, order: 0 }) };
    expect(plansShown("regular", saved)).toEqual(["starter", "growth", "pro", "business", "regular_5"]);
    const plans = plansWith(saved);
    // Hidden: not for sale.
    expect(planOffered(plans.regular_5)).toBe(false);
    expect(plansForSale(plans, "regular").map((p) => p.id)).toEqual(["starter", "growth", "pro", "business"]);
    // Offered and put first: the pricing page's order, and an upgrade from it is any other plan.
    const offered = plansWith({ ...saved, regular_5: { ...saved.regular_5, offered: true, order: -1 } });
    expect(plansForSale(offered, "regular").map((p) => p.id)).toEqual(["regular_5", "starter", "growth", "pro", "business"]);
    expect(comparePlans("regular_5", "starter", offered)).toBe(1);
    expect(comparePlans("starter", "regular_5", offered)).toBe(-1);
    // Without the team's order, the default.
    expect(comparePlans("starter", "growth")).toBe(1);
    expect(planRank("growth", offered) < planRank("pro", offered)).toBe(true);
    expect(plansInOrder(["business", "regular_5", "growth"], offered)).toEqual(["regular_5", "growth", "business"]);
    expect(lowestPlanWith(offered, (p) => p.features.includes("ios"))?.id).toBe("growth");
  });

  it("archives a plan: hidden from new sales, kept and renewable by the apps on it", () => {
    const plans = plansWith({ growth: { ...GROWTH_PERIODS, archived: true } });
    expect(plans.growth.archived).toBe(true);
    expect(planOffered(plans.growth)).toBe(false);
    expect(plansForSale(plans, "regular").map((p) => p.id)).toEqual(["starter", "pro", "business"]);
    expect(planPayableFor(plans.growth, "growth")).toBe(true);
    expect(planPayableFor(plans.growth, "starter")).toBe(false);
    expect(planPayableFor(plans.pro, "starter")).toBe(true);
    // Brought back: offered again.
    expect(planOffered(plansWith({ growth: GROWTH_PERIODS }).growth)).toBe(true);
    // The four can be hidden too.
    expect(planOffered(plansWith({ starter: edit("starter", { offered: false }) }).starter)).toBe(false);
  });

  it("highlights the team's plan with its own badge, Growth until the team changes it", () => {
    expect(PLAN_INFO.growth.featured).toBe(true);
    const plans = plansWith({ growth: edit("growth", { featured: false }), pro: edit("pro", { featured: true, badge: "Best value" }) });
    expect(plans.growth.featured).toBe(false);
    expect(plans.pro).toMatchObject({ featured: true, badge: "Best value" });
  });

  it("shows the team's own limits and a page limit on the comparison", () => {
    const plans = plansWith({
      growth: edit("growth", { extraLimits: { builds_per_month: 10 }, limits: { ...PLAN_INFO.growth.limits, pages: 20 } }),
      pro: edit("pro", { extraLimits: { builds_per_month: null } }),
    });
    const rows = comparisonRows(plans, plansForSale(plans, "regular"), [{ id: "builds_per_month", name: "Builds per month" }]);
    expect(rows.find((r) => r.label === "Builds per month")?.values).toEqual({ starter: false, growth: "10", pro: "Unlimited", business: false });
    expect(rows.find((r) => r.label === "Pages in the app")?.values).toEqual({ starter: "6", growth: "20", pro: "Unlimited", business: "Unlimited" });
    expect(pagesLimitOf(PLAN_INFO.starter)).toBe(6);
    expect(pagesLimitOf(PLAN_INFO.pro)).toBeNull();
  });
});

const PAGES_10 = cleanAddon({
  id: "pages-10",
  kind: "quantity",
  icon: "layers",
  en: { name: "+10 pages", description: "Ten more pages in your app." },
  limit: "pages",
  amount: 10,
  prices: { "6": { on: true, egpCents: 30000, usdCents: null }, "12": { on: true, egpCents: 50000, usdCents: null }, once: { on: true, egpCents: null, usdCents: null } },
  rule: { family: "both", belowTop: false, plans: null },
  repeatable: true,
  active: true,
  order: 1,
})!;

function owned(addon: AddonDef, patch: Partial<AppAddon> = {}): AppAddon {
  return { ...newAppAddon({ client: { id: "c1" }, appId: "a1", addon, billing: "12", paymentId: null, grantedBy: null, now: NOW }), ...patch };
}

describe("133 add-ons", () => {
  it("come with the publishing service, off and unpriced until the owner prices it", () => {
    const publishing = addonsOf(null).find((a) => a.id === PUBLISHING_ADDON_ID)!;
    expect(publishing).toMatchObject({ kind: "service", feature: "auto_publish", active: false, rule: { belowTop: true } });
    expect(addonBillings(publishing)).toEqual([]);
    expect(Object.values(publishing.prices).every((p) => p?.egpCents === null)).toBe(true);
    expect(addonText(publishing, "ar").name).toBe(BUILT_IN_ADDONS[0]!.ar!.name);
    // The team's edit replaces it.
    expect(addonsOf({ addons: [{ ...publishing, active: true }] }).find((a) => a.id === PUBLISHING_ADDON_ID)?.active).toBe(true);
  });

  it("are paid the ways the team priced, one-time first", () => {
    expect(addonBillings(PAGES_10).map((b) => b.billing)).toEqual(["6", "12"]);
    expect(cleanAddon({ ...PAGES_10, kind: "quantity", limit: undefined })).toBeNull();
    expect(cleanAddon({ ...PAGES_10, icon: "not_an_icon" })?.icon).toBe("widgets");
  });

  it("add to the plan's limits while they run, and switch features on", () => {
    const storage = cleanAddon({ ...PAGES_10, id: "storage-5", limit: "storageGb", amount: 5 })!;
    const builds = cleanAddon({ ...PAGES_10, id: "builds-5", limit: "x:builds_per_month", amount: 5 })!;
    const chat = cleanAddon({ ...PAGES_10, id: "chat", kind: "feature", feature: "chat" })!;
    const growth = plansWith({ growth: edit("growth", { limits: { ...PLAN_INFO.growth.limits, pages: 20 }, extraLimits: { builds_per_month: 10 } }) }).growth;
    const addons = [owned(PAGES_10), owned(PAGES_10), owned(storage), owned(builds), owned(chat), owned(storage, { activeUntil: days(-1) }), owned(storage, { status: "cancelled" })];
    expect(Object.fromEntries(addonTotals(addons, NOW))).toEqual({ pages: 20, storageGb: 5, "x:builds_per_month": 5 });
    expect(addonFeatures(addons, NOW)).toEqual(["chat"]);
    const plan = withAddons(growth, addons, "regular", NOW);
    expect(plan.limits).toMatchObject({ pages: 40, storageGb: 25, appUsers: 10000 });
    expect(plan.extraLimits).toEqual({ builds_per_month: 15 });
    expect(plan.features).toContain("chat");
    // The plan itself is untouched; without add-ons it's the same object.
    expect(growth.limits.storageGb).toBe(20);
    expect(withAddons(growth, [], "regular", NOW)).toBe(growth);
    // Unlimited stays unlimited; the simple editor's 6 pages grow; a Studio project's Pages per project.
    expect(withAddons(PLAN_INFO.pro, [owned(storage)], "regular", NOW).limits.storageGb).toBe(105);
    expect(withAddons(PLAN_INFO.pro, [owned(PAGES_10)], "regular", NOW).limits.pages).toBeUndefined();
    expect(withAddons(PLAN_INFO.starter, [owned(PAGES_10)], "regular", NOW).limits.pages).toBe(16);
    expect(withAddons({ ...PLAN_INFO.studio_1, limits: { ...PLAN_INFO.studio_1.limits, studioPages: 5 } }, [owned(PAGES_10)], "studio", NOW).limits.studioPages).toBe(15);
  });

  it("raise the limits the platform holds the app to (pages at publishing)", () => {
    const content = (pages: number) => ({ appearance: {}, languages: { default: "en", available: ["en"] }, tabs: [], pages: Array.from({ length: pages }, (_, i) => ({ slug: `p${i}`, title: `P${i}`, blocks: [] })) }) as never;
    const growth = plansWith({ growth: edit("growth", { limits: { ...PLAN_INFO.growth.limits, pages: 10 } }) }).growth;
    expect(planLayoutErrors(content(12), growth)).toEqual(["Your Growth plan includes up to 10 pages. Remove the others, or upgrade your plan."]);
    expect(planLayoutErrors(content(12), withAddons(growth, [owned(PAGES_10)], "regular", NOW))).toEqual([]);
    expect(planUsage({ plan: withAddons(growth, [owned(PAGES_10)], "regular", NOW), hosted: false, appUsers: 0, languages: 1, storage: { usedBytes: 0, limitBytes: null }, pages: { used: 12, studio: false } }).at(-1)).toEqual({ key: "pages", used: 12, limit: 20 });
    // A feature the switches turned off stays off, even with an add-on.
    const chat = cleanAddon({ ...PAGES_10, id: "chat", kind: "feature", feature: "chat" })!;
    expect(planWithAddons(growth, [owned(chat)], { off: ["feature:chat"], offByPlan: {} }, NOW).features).not.toContain("chat");
    expect(planWithAddons(growth, [owned(chat)], null, NOW).features).toContain("chat");
  });

  it("are offered only to the apps their rules allow: below the top plan, the family, once unless repeatable", () => {
    const plans = plansWith({});
    const publishing = { ...addonsOf(null)[0]!, active: true, prices: { "12": { on: true, egpCents: 100000, usdCents: null } } };
    // The top plan is the first with "We publish for you" (Pro), or the team's choice.
    expect(topPlanOf(plans, "regular", null)).toBe("pro");
    expect(topPlanOf(plans, "regular", { addons: [], top: { regular: "business" } })).toBe("business");
    expect(belowTop(plans, "growth", null)).toBe(true);
    expect(belowTop(plans, "pro", null)).toBe(false);
    expect(belowTop(plans, "business", null)).toBe(false);
    const input = (plan: PlanInfo | null, ownedAddons: AppAddon[] = [], family: "regular" | "studio" = "regular") => ({ plans, plan, family, owned: ownedAddons, setting: null, now: NOW });
    expect(addonRefusal(publishing, input(plans.growth))).toBeNull();
    expect(addonRefusal(publishing, input(plans.pro))).toBe("top_plan");
    // Not below the top plan, it would still be on the plan already.
    expect(addonRefusal({ ...publishing, rule: { ...publishing.rule, belowTop: false } }, input(plans.pro))).toBe("included");
    expect(addonRefusal(publishing, input(null))).toBe("no_plan");
    expect(addonRefusal({ ...publishing, active: false }, input(plans.growth))).toBe("not_offered");
    expect(addonRefusal({ ...publishing, prices: {} }, input(plans.growth))).toBe("not_offered");
    expect(addonRefusal({ ...publishing, rule: { ...publishing.rule, family: "studio" } }, input(plans.growth))).toBe("family");
    expect(addonRefusal({ ...publishing, rule: { ...publishing.rule, plans: ["starter"] } }, input(plans.growth))).toBe("plan");
    expect(addonRefusal(publishing, input(plans.growth, [owned(publishing)]))).toBe("owned");
    expect(addonRefusal(publishing, input(plans.growth, [owned(publishing, { activeUntil: days(-1) })]))).toBeNull();
    // Repeatable: another one on the simple editor's 6 pages.
    expect(addonRefusal(PAGES_10, input(plans.starter, [owned(PAGES_10)]))).toBeNull();
    // Unlimited pages: nothing to add.
    expect(addonRefusal(PAGES_10, input(plans.pro))).toBe("included");
    expect(limitValue(plans.starter, "pages", "regular")).toBe(6);
    expect(limitValue(plans.growth, "x:builds", "regular")).toBe(0);
  });

  it("run for their period, never end once or for life, and renew from their end", () => {
    expect(addonEndFor("once", null, NOW)).toBeNull();
    expect(addonEndFor("lifetime", null, NOW)).toEqual(LIFETIME_END);
    expect(addonEndFor("6", null, NOW)!.toISOString()).toBe("2027-04-12T23:59:59.999Z");
    expect(addonEndFor("12", days(30), NOW)!.toISOString()).toBe(periodEnd(days(30), 12, NOW).toISOString());
    expect(addonRunning(owned(PAGES_10, { activeUntil: null, billing: "once" }), NOW)).toBe(true);
    expect(addonRenewable(owned(PAGES_10))).toBe(true);
    expect(addonRenewable(owned(PAGES_10, { billing: "once", activeUntil: null }))).toBe(false);
    expect(addonRenewable(owned(PAGES_10, { billing: "lifetime", activeUntil: LIFETIME_END }))).toBe(false);
  });

  it("take a coupon made for them, on the periods it allows", () => {
    const coupon: Coupon = {
      id: "c",
      code: "PAGES",
      note: "",
      discount: { kind: "percent", percent: 50 },
      plans: [],
      periods: [6, 12],
      addons: ["pages-10"],
      validFrom: null,
      validUntil: null,
      maxRedemptions: null,
      maxPerClient: null,
      firstPaymentOnly: true,
      active: true,
      createdAt: NOW,
      updatedAt: NOW,
      createdBy: "team",
    };
    const base = { coupon, plan: PLAN_INFO.growth, charged: { cents: 50000, currency: "EGP" as const }, client: { id: "c1", activatedAt: NOW }, license: { id: "l1" }, redemptions: [], now: NOW };
    const target = { kind: "addon" as const, id: "pages-10", name: "+10 pages", boughtBefore: false };
    expect(checkCoupon({ ...base, months: 12, target })).toMatchObject({ ok: true, amountCents: 25000 });
    expect(checkCoupon({ ...base, months: 24, target })).toEqual({ ok: false, error: "This coupon doesn't apply to this billing period." });
    expect(checkCoupon({ ...base, months: 12, target: { ...target, id: "storage-5" } })).toEqual({ ok: false, error: "This coupon isn't for the add-on +10 pages." });
    expect(checkCoupon({ ...base, months: 12, target: { ...target, boughtBefore: true } })).toEqual({ ok: false, error: "This coupon is for a first payment only." });
    // Not a plan coupon: it names no plan.
    expect(checkCoupon({ ...base, months: 12 })).toEqual({ ok: false, error: "This coupon doesn't apply to the Growth plan." });
    // A plan coupon on 6 months.
    expect(checkCoupon({ ...base, coupon: { ...coupon, plans: null, addons: null, firstPaymentOnly: false }, months: 6 })).toMatchObject({ ok: true });
    expect(checkCoupon({ ...base, coupon: { ...coupon, plans: null, addons: null, firstPaymentOnly: false, periods: [1, 12] }, months: 6 })).toEqual({ ok: false, error: "This coupon doesn't apply to this billing period." });
  });
});

describe("133 add-on payments, renewals and reminders", () => {
  const KASHIER: PaymentAccount = { provider: "kashier", keys: { merchantId: "MID-1234-567", apiKey: "api", secretKey: "secret", sandbox: true } };

  async function withApp() {
    const setup = await setupClient({ activeUntil: days(90) });
    const app = { ...newApp(setup.client.id, null, NOW, "lms"), backend: "hosted" as const, appName: "Lale Academy" };
    await setup.store.createApp(app);
    const license = (await setup.store.getLicenseForApp(setup.client.id, app.id))!;
    return { ...setup, app, license };
  }

  it("is paid on Kashier in pounds, starts once confirmed, and renews from its end", async () => {
    const { store, client, user, app, license } = await withApp();
    const kashier = fakeKashier();
    let token = "";
    const start = (renews: AppAddon | null) =>
      startAddonPayment({
        store,
        account: KASHIER,
        fetcher: kashier.fetcher,
        now: NOW,
        client,
        app,
        license,
        user,
        addon: PAGES_10,
        billing: "6",
        renews,
        offer: { charged: { cents: 30000, currency: "EGP" }, shown: { cents: 600, currency: "USD" } },
        billingDetails: { city: "London", address: "1 Baker Street, Marylebone" },
        ip: "203.0.113.5",
        callbackUrls: (t) => {
          token = t;
          return { returnUrl: `https://yallapp.test/api/pay/plan/${t}`, webhookUrl: null };
        },
      });
    expect(await start(null)).toContain("https://payments.kashier.test/session/sess1abcdef");
    expect(kashier.calls[0]!.body).toMatchObject({ amount: "300.00", currency: "EGP" });
    const payment = (await store.getPlanPaymentByToken(sha256Hex(token)))!;
    expect(payment).toMatchObject({ purpose: "addon", months: 6, amountCents: 30000, shownCents: 600, addon: { addonId: "pages-10", billing: "6", renews: null, name: "+10 pages" } });
    expect(paymentWhat(payment, "Growth")).toBe("Add-on +10 pages · 6 months");
    expect(Object.fromEntries(planReceiptRows({ payment, planName: "Growth", appName: "Lale", billedTo: { name: "M", email: "m@x.test" }, paidOn: "" }))["Add-on"]).toBe("+10 pages, 6 months");

    kashier.pay("sess1abcdef");
    const outcome = await completePlanPayment({ store, account: KASHIER, fetcher: kashier.fetcher, now: NOW, payment, encryptionKey: KEY });
    expect(outcome.kind).toBe("addon_paid");
    const [addon] = await store.listAppAddons({ appId: app.id });
    expect(addon).toMatchObject({ addonId: "pages-10", limit: "pages", amount: 10, billing: "6", status: "active", paymentId: payment.id });
    expect(addon!.activeUntil!.toISOString()).toBe("2027-04-12T23:59:59.999Z");
    // The plan is untouched.
    expect((await store.getLicenseForApp(client.id, app.id))!.expiresAt.getTime()).toBe(license.expiresAt.getTime());

    // Renewing it adds 6 months after its end.
    await start(addon!);
    const renewal = (await store.getPlanPaymentByToken(sha256Hex(token)))!;
    kashier.pay("sess2abcdef");
    expect((await completePlanPayment({ store, account: KASHIER, fetcher: kashier.fetcher, now: NOW, payment: renewal, encryptionKey: KEY })).kind).toBe("addon_paid");
    const renewed = await store.listAppAddons({ appId: app.id });
    expect(renewed).toHaveLength(1);
    expect(renewed[0]!.activeUntil!.toISOString()).toBe("2027-10-12T23:59:59.999Z");
  });

  it("a service opens a task; the team can give one with no charge", async () => {
    const { store, client, app } = await withApp();
    const publishing = addonsOf(null)[0]!;
    const given = await grantAddon(store, { client, app, addon: publishing, billing: "lifetime", admin: "team@yallapp.test", now: NOW });
    expect(given).toMatchObject({ kind: "service", taskStatus: "new", grantedBy: "team@yallapp.test", paymentId: null, activeUntil: LIFETIME_END, feature: "auto_publish" });
    expect(await store.listAppAddons({ taskStatus: ["new", "in_progress"] })).toHaveLength(1);
    await store.updateAppAddon(given.id, { taskStatus: "done", updatedAt: NOW });
    expect(await store.listAppAddons({ taskStatus: ["new", "in_progress"] })).toHaveLength(0);
    // A payment for an add-on the team removed since keeps its name for the team.
    const orphan = { id: "p1", clientId: client.id, appId: app.id, plan: "growth", months: 0, amountCents: 100, currency: "EGP", status: "paid", tokenHash: "x", paymentId: "y", createdAt: NOW, paidAt: NOW, purpose: "addon", addon: { addonId: "gone", billing: "once", renews: null, name: "Old service" } } as PlanPayment;
    expect(await applyPaidAddon(store, orphan, NOW)).toMatchObject({ addonId: "gone", name: "Old service", kind: "service", activeUntil: null });
  });

  it("reminds the owner 7 days before an add-on ends, once per end date", async () => {
    const { store, app } = await withApp();
    const ending = owned(PAGES_10, { appId: app.id, clientId: app.clientId, activeUntil: days(5) });
    const later = owned(PAGES_10, { id: "later", appId: app.id, clientId: app.clientId, activeUntil: days(40) });
    const life = owned(PAGES_10, { id: "life", appId: app.id, clientId: app.clientId, billing: "lifetime", activeUntil: LIFETIME_END });
    for (const a of [ending, later, life]) await store.createAppAddon(a);
    const sent: { key: string; values: Record<string, unknown> }[] = [];
    const deps = { store, baseUrl: "https://yallapp.test", now: NOW, mail: async (key: string, _to: string, values: Record<string, unknown>) => void sent.push({ key, values }) };
    const notices = await remindEndingAddons(deps as never);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ kind: "addon_ends_7", linkLabel: "Renew" });
    expect(sent).toEqual([{ key: "addon_ends_soon", values: expect.objectContaining({ addon: "+10 pages", app_name: "Lale Academy" }) }]);
    expect(await remindEndingAddons(deps as never)).toHaveLength(0);
  });
});
