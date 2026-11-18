import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlanCards } from "@/components/plan-cards";
import { StudioDifferences, studioPlanChoices, StudioPlans } from "@/components/studio-marketing";
import { cardPlanOptions } from "@/lib/billing/card-plans";
import { periodPrices, periodsAmong, startPeriod } from "@/lib/billing/period-prices";
import { planChangeFor } from "@/lib/billing/plan-change";
import { planFor } from "@/lib/marketing-lang";
import { PLAN_INFO, planFitsSection, planPayableFor, planSettingOf, plansForSale, plansWith, POUNDS_VIEW, type PlanSetting } from "@/lib/plans";
import { messagesFor, type Lang } from "@/i18n";
import { KINDS } from "@/lib/app/kinds";
import { STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { ALL_SOLUTIONS } from "@/lib/marketing";
import { STUDIO_ONLY_KINDS } from "@/lib/studio/section";
import { CARD_HIGHLIGHTS, periodHint, RegularPlanCards, StudioPlanCards } from "@/site/pricing-cards";
import { kindChips, KINDS_SHOWN } from "@/site/pricing-kinds";
import { DEFAULT_WHATSAPP, whatsappLines } from "@/lib/contact-lines";

/**
 * 146 The pricing page shows the app and Studio side by side: Studio's plans
 * have the same billing periods as the regular ones (1, 6, 12, 24, 36 months
 * and for life), each with the price per month and the saving, and a
 * Studio project can be paid for any of them. Prices the tests type, the way
 * the team would in Admin › Plans: none of them is Yallapp's.
 */

const edit = (plan: keyof typeof PLAN_INFO, patch: Partial<PlanSetting>): PlanSetting => ({ ...planSettingOf(PLAN_INFO[plan]), ...patch });

// A Studio plan priced by the month (Studio's main period), with 1 year, 2 years and lifetime typed, 6 months switched off and 3 years left to its suggestion.
const STUDIO_PRO = edit("studio_2", {
  name: "Studio Pro",
  offered: true,
  priceCents: 60000,
  usdCents: null,
  onRequest: false,
  billingMonths: 1,
  periods: {
    "6": { on: false, egpCents: null, usdCents: null },
    "12": { on: true, egpCents: 600000, usdCents: null },
    "24": { on: true, egpCents: 1080000, usdCents: null },
    lifetime: { on: true, egpCents: 1800000, usdCents: null },
  },
});
// A regular plan priced by the year, its other periods left to their suggestions.
const PRO_YEARLY = edit("pro", { priceCents: 480000, usdCents: null, onRequest: false, billingMonths: 12 });

const plans = plansWith({ studio_2: STUDIO_PRO, pro: PRO_YEARLY });
const studio = plans.studio_2;
const contact = { lines: [], country: null } as unknown as Parameters<typeof StudioPlans>[0]["contact"];
// Prices are written with a no-break space ("EGP 600"); the tests read them with a plain one.
const sp = (text: string) => text.replace(/\u00a0/g, " ");
const studioHtml = (period: Parameters<typeof StudioPlans>[0]["period"], lang: Lang = "en") =>
  sp(renderToStaticMarkup(createElement(StudioPlans, { lang, plans: [planFor(lang, studio)], view: POUNDS_VIEW, contact, period, basics: false })));

describe("146 Studio's plans have the regular plans' billing periods", () => {
  it("prices a Studio plan for every period the team switched on: typed, or suggested from its own prices", () => {
    expect(periodPrices(studio, POUNDS_VIEW).map((p) => [p.key, sp(p.price), p.perMonth && sp(p.perMonth), p.saving])).toEqual([
      ["1", "EGP 600", null, null],
      ["12", "EGP 6,000", "EGP 500", 16],
      ["24", "EGP 10,800", "EGP 450", 25],
      // Not typed: 3 years of its yearly price × 0.75.
      ["36", "EGP 13,500", "EGP 375", 37],
      ["lifetime", "EGP 18,000", null, null],
    ]);
  });

  it("offers one choice of period for both products: every period either one has", () => {
    const regular = plansForSale(plans, "regular");
    const studios = plansForSale(plans, "studio");
    expect(studios.map((p) => p.id)).toEqual(["studio_2"]);
    expect(periodsAmong(studios, POUNDS_VIEW)).toEqual(["1", "12", "24", "36", "lifetime"]);
    expect(periodsAmong([...regular, ...studios], POUNDS_VIEW)).toEqual(["1", "6", "12", "24", "36", "lifetime"]);
    // The period asked for (?period=24), when either product has it.
    expect(startPeriod([...regular, ...studios], POUNDS_VIEW, "24")).toBe("24");
    expect(startPeriod([...regular, ...studios], POUNDS_VIEW, "lifetime")).toBe("lifetime");
  });

  it("shows a Studio card's price for the period chosen, with the price per month and the saving, as a regular card", () => {
    const year = studioHtml("12");
    expect(year).toMatch(/EGP 6,000<\/span><span[^>]*>\/ year/);
    expect(year).toMatch(/data-per-month=""[^]*EGP 500 a month[^]*Save 16%/);
    const three = studioHtml("36");
    expect(three).toContain("EGP 13,500");
    expect(three).toContain("/ 3 years");
    expect(three).toContain("Save 37%");
    // For life: once, nothing per month.
    const life = studioHtml("lifetime");
    expect(life).toContain("EGP 18,000");
    expect(life).toContain("/ once");
    expect(life).not.toContain("data-per-month");
    // 6 months is switched off: its own monthly price, and why.
    const six = studioHtml("6");
    expect(six).toContain("EGP 600");
    expect(six).toContain("/ month");
    expect(six).toContain("Not sold for this period");
    // What it doesn't include, folded under what it does.
    expect(year).toMatch(/data-included=""[^]*A second app for couriers/);
    const fold = year.slice(year.indexOf("data-not-included"));
    expect(fold).toContain("options not on this plan");
    expect(fold).toContain("Delivery &amp; couriers");
    expect(fold).toContain("Not included in Studio Pro");
    expect(fold).not.toContain("A second app for couriers");
    // Without a period chosen: its main price, as before.
    expect(studioHtml(null)).toMatch(/EGP 600<\/span><span[^>]*>\/ month/);
    // In Arabic and Turkish, the period's words.
    expect(studioHtml("lifetime", "ar")).toContain(messagesFor("ar").plans.unitLifetime);
    expect(studioHtml("24", "tr")).toContain(messagesFor("tr").plans.unit24);
    expect(studioHtml("24", "ar")).toContain("وفّر 25%");
  });

  it("the regular cards and Studio's follow the same period", () => {
    const regular = sp(renderToStaticMarkup(createElement(PlanCards, { plans: plansForSale(plans, "regular"), view: POUNDS_VIEW, period: "24" })));
    const pro = regular.slice(regular.indexOf('data-plan="pro"'), regular.indexOf("Start with Pro"));
    // EGP 4,800 a year, 2 years suggested at × 1.7, rounded to EGP 50.
    expect(pro).toContain("EGP 8,150");
    expect(pro).toContain("/ 2 years");
    expect(studioHtml("24")).toContain("EGP 10,800");
  });

  it("lets a Studio project pay a Studio plan for any of its periods, never a regular app", () => {
    const options = cardPlanOptions(plans, null, "kashier", POUNDS_VIEW, "studio");
    expect(options.map((p) => p.id)).toEqual(["studio_2"]);
    expect(options[0]!.periods!.map((p) => [p.key, sp(p.price)])).toEqual([
      ["1", "EGP 600"],
      ["12", "EGP 6,000"],
      ["24", "EGP 10,800"],
      ["36", "EGP 13,500"],
      ["lifetime", "EGP 18,000"],
    ]);
    expect(planFitsSection("studio_2", "studio")).toBe(true);
    expect(planFitsSection("studio_2", "regular")).toBe(false);
    expect(planPayableFor(studio, null)).toBe(true);
    expect(cardPlanOptions(plans, null, "kashier", POUNDS_VIEW, "regular").map((p) => p.id)).not.toContain("studio_2");
    // A first payment for 2 years runs 24 months; for life, it never ends.
    const now = new Date("2026-11-17T10:00:00Z");
    expect(planChangeFor(null, studio, 24, plans, now).activeUntil.toISOString()).toBe("2028-11-17T23:59:59.999Z");
    expect(planChangeFor(null, studio, 0, plans, now).activeUntil.getUTCFullYear()).toBe(2999);
  });
});

describe("146 the comparison of the two", () => {
  it("reads topic by topic on phones and as a table from tablets up, in each language", () => {
    for (const lang of ["en", "ar", "tr"] as const) {
      const html = renderToStaticMarkup(createElement(StudioDifferences, { lang }));
      const s = messagesFor(lang).studio;
      expect(html).toContain('class="m-0 flex list-none flex-col gap-3 p-0 sm:hidden"');
      expect(html).toContain('class="hidden overflow-x-auto rounded-2xl border border-line bg-white sm:block"');
      // Each topic twice: once in the list, once in the table.
      for (const topic of [s.rowPages, s.rowPlans, s.rowPublish]) expect(html.split(topic).length - 1, `${lang} ${topic}`).toBe(2);
    }
  });

  it("names what the team chooses plan by plan, with the Studio pages last", () => {
    const choices = studioPlanChoices("en").map((c) => c.label);
    expect(choices[0]).toBe("The iOS app");
    expect(choices.at(-1)).toBe("How many Studio pages a project has");
  });

  it("has every new pricing text in English, Arabic and Turkish", () => {
    const keys = Object.keys(messagesFor("en").pricing);
    for (const lang of ["ar", "tr"] as const) {
      expect(Object.keys(messagesFor(lang).pricing).sort()).toEqual([...keys].sort());
      for (const key of ["appName", "appWho", "studioWho", "periodHint", "aboutTitle", "compareAllText"] as const) {
        expect(messagesFor(lang).pricing[key], `${lang} ${key}`).not.toBe(messagesFor("en").pricing[key]);
      }
    }
    // The site's Arabic is Modern Standard Arabic, and nothing says "AI".
    expect(messagesFor("ar").pricing.studioWho).toBe("صمّم تطبيقك بحرية، وأدِر كل شيء من Yallapp.");
    for (const lang of ["en", "ar", "tr"] as const) expect(JSON.stringify(messagesFor(lang).pricing)).not.toMatch(/\bAI\b|ذكاء اصطناعي|yapay zeka/i);
  });
});

/**
 * 154 The pricing page in its Day and night look: compact cards (the first
 * highlights, the rest folded under "See everything (+N)" with nothing left
 * out), one picker for both products with each period's saving, Studio's
 * plans on the night band beside what every Studio plan has, only the plans
 * that are for sale, and every kind of app each product makes as chips.
 */
describe("154 the pricing page by day and by night", () => {
  const regular = plansForSale(plans, "regular");
  const studios = plansForSale(plans, "studio");
  const regularHtml = (period: Parameters<typeof RegularPlanCards>[0]["period"], lang: Lang = "en") =>
    sp(renderToStaticMarkup(createElement(RegularPlanCards, { plans: regular.map((p) => planFor(lang, p)), view: POUNDS_VIEW, lang, period })));
  const lines = { lines: whatsappLines({ whatsapp: DEFAULT_WHATSAPP }), country: "EG" } as unknown as Parameters<typeof StudioPlanCards>[0]["contact"];
  const studioCards = (list: typeof studios, period: Parameters<typeof StudioPlanCards>[0]["period"], lang: Lang = "en") =>
    sp(renderToStaticMarkup(createElement(StudioPlanCards, { plans: list.map((p) => planFor(lang, p)), view: POUNDS_VIEW, lang, period, contact: lines })));

  it("shows a regular card's first four highlights and folds the rest, its limits and its stores under See everything", () => {
    const html = regularHtml("24");
    const pro = html.slice(html.indexOf('data-plan="pro"'), html.indexOf("Start with Pro"));
    const shown = pro.slice(0, pro.indexOf("data-plan-more"));
    const folded = pro.slice(pro.indexOf("data-plan-more"));
    const highlights = PLAN_INFO.pro.highlights;
    for (const h of highlights.slice(0, CARD_HIGHLIGHTS)) expect(shown).toContain(h);
    for (const h of highlights.slice(CARD_HIGHLIGHTS)) {
      expect(shown).not.toContain(h);
      expect(folded).toContain(h);
    }
    // +N counts everything in the fold: the other highlights, the 4 limits and the stores.
    expect(folded).toContain(`See everything</span><span class="pr-cnt" dir="ltr">+${highlights.length - CARD_HIGHLIGHTS + 4 + 1}</span>`);
    expect(folded).toContain('aria-label="Pro limits"');
    expect(folded).toContain("data-plan-stores");
    // The period's price, per month and the saving, as before.
    expect(pro).toContain("EGP 8,150");
    expect(pro).toContain("/ 2 years");
    expect(pro).toMatch(/data-per-month=""[^]*a month[^]*Save \d+%/);
    // A plan on request says how its price is agreed.
    const growth = html.slice(html.indexOf('data-plan="growth"'), html.indexOf("Start with Growth"));
    expect(growth).toContain("On request");
    expect(growth).toContain("We agree the price with you on WhatsApp");
    // The team's highlighted plan has its badge.
    expect(growth).toContain("Most popular");
    expect(html).toContain('data-pricing-plans=""');
    expect(html).toContain('data-currency="EGP"');
  });

  it("puts Studio's cards on the night band with what each includes, folds what it doesn't, and widens what every Studio plan has", () => {
    const html = studioCards(studios, "12");
    expect(html).toContain('data-studio-plans=""');
    const pro = html.slice(html.indexOf('data-plan="studio_2"'), html.indexOf("Start with Studio Pro"));
    expect(pro).toMatch(/EGP 6,000<\/span><span class="pr-per">\/ year/);
    expect(pro).toMatch(/data-per-month=""[^]*EGP 500 a month[^]*Save 16%/);
    expect(pro).toMatch(/data-included=""[^]*A second app for couriers/);
    const fold = pro.slice(pro.indexOf("data-not-included"));
    expect(fold).toContain("options not on this plan");
    expect(fold).toContain("Delivery &amp; couriers");
    expect(fold).toContain("Not included in Studio Pro");
    // What every Studio plan has, after the plans, in the same row (it grows to fill it, pricing.css).
    const basics = html.slice(html.indexOf("data-studio-basics"));
    expect(basics).toContain("Every Studio plan has");
    for (const item of ["The Studio editor and its elements", "We publish for you on Google Play and the App Store"]) expect(basics).toContain(item);
    expect(html.indexOf("data-studio-basics")).toBeGreaterThan(html.indexOf('data-plan="studio_2"'));
    // 6 months is switched off for Studio Pro: its own price, and why.
    expect(studioCards(studios, "6")).toContain("Not sold for this period");
    // In Arabic, the night band's words are Arabic.
    const ar = studioCards(studios, "24", "ar");
    expect(ar).toContain("وفّر 25%");
    expect(ar).toContain(messagesFor("ar").plans.seeEverything);
  });

  it("never shows a plan that isn't for sale: no sample prices, no invented Studio plans", () => {
    const html = studioCards(studios, "12");
    expect(html.match(/data-plan="/g)).toHaveLength(studios.length);
    for (const made of ["Studio Start", "Studio Business", "EGP 2,400", "EGP 3,600", "EGP 9,600"]) expect(html).not.toContain(made);
    // None offered: on request, with what every Studio plan has.
    const none = studioCards([], "12");
    expect(none).not.toContain('data-plan="');
    expect(none).toContain("data-studio-on-request");
    expect(none).toContain("Every Studio plan has");
    // The regular cards: the plans for sale, in the team's order, and Studio's never among them.
    const cards = regularHtml("12");
    expect([...cards.matchAll(/data-plan="([a-z_0-9]+)"/g)].map((m) => m[1])).toEqual(regular.map((p) => p.id));
    expect(cards).not.toContain('data-plan="studio_');
  });

  it("says each period's saving in the picker, for both products: up to the most when the plans differ", () => {
    const both = [...regular, ...studios];
    expect(periodHint("en", both, POUNDS_VIEW, "lifetime")).toBe("Pay once");
    expect(periodHint("en", both, POUNDS_VIEW, "1")).toBeNull();
    // Studio Pro saves 16% on a year, Pro 20%: "up to"; one plan alone, its own saving.
    expect(periodHint("en", both, POUNDS_VIEW, "12")).toBe("Save up to 20%");
    expect(periodHint("en", [plans.pro], POUNDS_VIEW, "12")).toBe("Save 20%");
    expect(periodHint("en", studios, POUNDS_VIEW, "24")).toBe("Save 25%");
    expect(periodHint("ar", both, POUNDS_VIEW, "12")).toBe("وفّر حتى 20%");
    expect(periodHint("tr", both, POUNDS_VIEW, "12")).toBe("En fazla %20 tasarruf");
    // Prices rounded to EGP 50 move a saving by a point: about the same saving is the least of them, never more.
    const yearly = (plan: "starter" | "growth" | "pro", cents: number) => edit(plan, { priceCents: cents, usdCents: null, onRequest: false, billingMonths: 12 });
    const same = plansForSale(plansWith({ starter: yearly("starter", 270000), growth: yearly("growth", 360000) }), "regular");
    expect(periodHint("en", same, POUNDS_VIEW, "12")).toBe("Save 25%");
    const three = plansForSale(plansWith({ starter: yearly("starter", 270000), growth: yearly("growth", 360000), pro: yearly("pro", 600000) }), "regular");
    for (const key of ["6", "12", "24", "36"] as const) {
      const savings = three.flatMap((plan) => periodPrices(plan, POUNDS_VIEW).filter((p) => p.key === key).map((p) => p.saving ?? 0));
      const [least, most] = [Math.min(...savings), Math.max(...savings)];
      expect(periodHint("en", three, POUNDS_VIEW, key), key).toBe(least > 0 && most - least <= 2 ? `Save ${least}%` : `Save up to ${most}%`);
    }
  });

  it("names every kind of app each product makes, from the code: Studio all of them, the app all but Studio's own", () => {
    for (const lang of ["en", "ar", "tr"] as const) {
      const studio = kindChips(lang, "studio");
      const app = kindChips(lang, "regular");
      const covered = (chips: typeof studio) => new Set(chips.flatMap((c) => c.covers));
      // Studio: every kind it offers on /studio/new, every /solutions page and every Studio demo.
      for (const id of [...KINDS.map((k) => k.id), ...ALL_SOLUTIONS.map((s) => s.id), ...STUDIO_DEMO_TYPES]) expect(covered(studio).has(id), `${lang} studio ${id}`).toBe(true);
      // The app: every kind but Studio's own, and none of those.
      for (const kind of KINDS) expect(covered(app).has(kind.id), `${lang} app ${kind.id}`).toBe(!STUDIO_ONLY_KINDS.has(kind.id));
      for (const chips of [studio, app]) {
        expect(new Set(chips.map((c) => c.id)).size).toBe(chips.length);
        // Public pages never call the multi-vendor kind a marketplace (phase 72).
        for (const chip of chips) expect(chip.label, `${lang} ${chip.id}`).not.toMatch(/marketplace/i);
      }
      if (lang !== "en") {
        // Each in the page's language, not left in English.
        const english = new Map(kindChips("en", "studio").map((c) => [c.id, c.label]));
        for (const chip of studio) expect(chip.label, `${lang} ${chip.id}`).not.toBe(english.get(chip.id));
        if (lang === "ar") for (const chip of studio) expect(chip.label, chip.id).toMatch(/[؀-ۿ]/);
      }
    }
    // The common ones first, as many as show before "+N more".
    expect(kindChips("en", "studio").slice(0, KINDS_SHOWN).map((c) => c.id)).toEqual(["store", "restaurant", "food", "marketplace", "delivery", "rides", "academy", "school"]);
    expect(kindChips("en", "regular").slice(0, KINDS_SHOWN).map((c) => c.id)).toEqual(["store", "academy", "restaurant", "bookings", "clinic", "fitness", "real_estate", "events"]);
    expect(kindChips("en", "studio").find((c) => c.id === "university")).toMatchObject({ label: "University", href: "/solutions/university" });
    expect(kindChips("ar", "studio").find((c) => c.id === "flowers")).toMatchObject({ label: "متجر الزهور", href: "/ar/yallapp-studio/flowers" });
  });

  it("has the new words in English, Arabic and Turkish, and nothing says AI", () => {
    for (const lang of ["ar", "tr"] as const) {
      for (const key of ["studioTag", "kindsMore", "kindsFewer", "faqLifetime", "faqChange", "faqFees", "faqUsers"] as const) {
        expect(messagesFor(lang).pricing[key], `${lang} ${key}`).toBeTruthy();
        expect(messagesFor(lang).pricing[key], `${lang} ${key}`).not.toBe(messagesFor("en").pricing[key]);
      }
      for (const key of ["seeEverything", "onRequestNote", "saveUpTo"] as const) expect(messagesFor(lang).plans[key], `${lang} ${key}`).not.toBe(messagesFor("en").plans[key]);
    }
    expect(messagesFor("ar").pricing.faqChange).toBe("هل يمكنني تغيير الباقة لاحقًا؟");
    for (const lang of ["en", "ar", "tr"] as const) expect(JSON.stringify([messagesFor(lang).pricing, messagesFor(lang).plans])).not.toMatch(/\bAI\b|ذكاء اصطناعي|yapay zeka/i);
  });
});
