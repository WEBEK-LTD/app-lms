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
