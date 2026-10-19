import "server-only";
import { LOCALIZED } from "@/content/localized";
import type { MarketingTranslation } from "@/content/translation-types";
import type { Lang } from "@/i18n/config";
import { DEMO_GUIDES, type DemoGuide } from "./demo/content";
import type { DemoId } from "./demo/constants";
import {
  COMPARISON,
  FAQ,
  FEATURE_GROUPS,
  INTEGRATION_GROUPS,
  numberWord,
  REQUIREMENTS,
  SCREEN_ALT,
  SOLUTIONS,
  STEPS,
  type AppScreen,
  type DashboardScreen,
  type FaqGroup,
  type FeatureGroup,
  type Integration,
  type IntegrationGroup,
  type Solution,
  type Step,
} from "./marketing";
import { PLAN_INFO, type PlanInfo } from "./plans";

/**
 * 55 The marketing pages' lists (lib/marketing.ts) in a language: the
 * English items with their texts from src/content/{ar,tr}/marketing.ts.
 * Icons, screens, addresses and brand names stay the English source's.
 */

function translation(lang: Lang): MarketingTranslation | null {
  return lang === "en" ? null : LOCALIZED[lang].marketing;
}

export interface LocalizedSolution extends Solution {
  /** "Academy apps". */
  appsTitle: string;
  /** "academy apps", "academy app", "academy demo", "academy demo app": inside sentences. */
  apps: string;
  app: string;
  demo: string;
  demoApp: string;
}

export function solutionsFor(lang: Lang): LocalizedSolution[] {
  const t = translation(lang);
  return SOLUTIONS.map((s) => {
    const lower = s.name.toLowerCase();
    const english = { ...s, appsTitle: `${s.name} apps`, apps: `${lower} apps`, app: `${lower} app`, demo: `${lower} demo`, demoApp: `${lower} demo app` };
    const x = t?.solutions[s.kind];
    if (!x) return english;
    return {
      ...english,
      name: x.name,
      appsTitle: x.appsTitle,
      apps: x.apps,
      app: x.app,
      demo: x.demo,
      demoApp: x.demoApp,
      summary: x.summary,
      audience: x.audience,
      sources: x.sources,
      highlights: s.highlights.map((h, i) => ({ ...h, ...x.highlights[i] })),
      inTheApp: x.inTheApp,
      forYou: x.forYou,
      docs: s.docs.map((d, i) => ({ ...d, label: x.docs[i] ?? d.label })),
    };
  });
}

export function solutionFor(lang: Lang, id: string): LocalizedSolution | undefined {
  return solutionsFor(lang).find((s) => s.id === id);
}

/** A kind's name ("Academy", "News & blog") in a language. */
export function kindNameFor(lang: Lang, english: string): string {
  return translation(lang)?.kindNames[english] ?? english;
}

export interface LocalizedIntegration extends Integration {
  /** The name to show; `name` stays the brand's (or English) name for its mark. */
  label: string;
}

export function integrationGroupsFor(lang: Lang): (Omit<IntegrationGroup, "items"> & { items: LocalizedIntegration[] })[] {
  const t = translation(lang);
  return INTEGRATION_GROUPS.map((g) => {
    const x = t?.integrations[g.id];
    return {
      ...g,
      title: x?.title ?? g.title,
      text: x?.text ?? g.text,
      items: g.items.map((item) => {
        const y = x?.items[item.name];
        return { ...item, label: y?.name ?? item.name, text: y?.text ?? item.text, types: item.types.map((type) => kindNameFor(lang, type)) };
      }),
    };
  });
}

export function featureGroupsFor(lang: Lang): FeatureGroup[] {
  const t = translation(lang);
  return FEATURE_GROUPS.map((g) => {
    const x = t?.features[g.id];
    if (!x) return g;
    return { ...g, title: x.title, text: x.text, features: g.features.map((f, i) => ({ ...f, ...x.features[i] })) };
  });
}

export function comparisonFor(lang: Lang): typeof COMPARISON {
  const t = translation(lang);
  return COMPARISON.map((row, i) => ({ ...row, ...t?.comparison[i] }));
}

export function stepsFor(lang: Lang): Step[] {
  const t = translation(lang);
  return STEPS.map((step, i) => ({ ...step, ...t?.steps[i] }));
}

export function requirementsFor(lang: Lang): string[] {
  return translation(lang)?.requirements ?? REQUIREMENTS;
}

export function faqFor(lang: Lang): FaqGroup[] {
  return translation(lang)?.faq ?? FAQ;
}

export function screenAltFor(lang: Lang): Record<AppScreen | DashboardScreen, string> {
  return translation(lang)?.screenAlt ?? SCREEN_ALT;
}

export function demoGuideFor(lang: Lang, id: DemoId): DemoGuide {
  const x = translation(lang)?.demos[id];
  return x ? { ...DEMO_GUIDES[id], ...x } : DEMO_GUIDES[id];
}

/** A count in a sentence: "ten" in English, "on" in Turkish, digits in Arabic. */
export function numberWordFor(lang: Lang, n: number): string {
  if (lang === "en") return numberWord(n);
  if (lang === "tr") return ["sıfır", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz", "on", "on bir", "on iki", "on üç", "on dört", "on beş"][n] ?? String(n);
  return String(n);
}

/**
 * A plan's words in a language: the default tagline and highlights are
 * translated; texts the team changed in the admin show as the team wrote them.
 */
export function planFor(lang: Lang, plan: PlanInfo): PlanInfo {
  const x = translation(lang)?.plans[plan.id];
  if (!x) return plan;
  const base = PLAN_INFO[plan.id];
  const sameHighlights = plan.highlights.length === base.highlights.length && plan.highlights.every((h, i) => h === base.highlights[i]);
  return { ...plan, tagline: plan.tagline === base.tagline ? x.tagline : plan.tagline, highlights: sameHighlights ? x.highlights : plan.highlights };
}
