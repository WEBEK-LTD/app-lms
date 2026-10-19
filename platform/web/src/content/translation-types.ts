import type { AppScreen, DashboardScreen } from "@/lib/marketing";
import type { DemoId } from "@/lib/demo/constants";
import type { Plan } from "@/lib/plans";

/**
 * 55 The shapes of the Arabic and Turkish versions of yallapp.com.tr's long
 * texts (src/content/ar, src/content/tr). Each mirrors its English source
 * item by item: the same ids, the same number of entries in each list, the
 * same links and placeholders (tests/unit/site-i18n.test.ts). Icons, screens,
 * addresses and brand names come from the English source.
 */

export interface SolutionTranslation {
  /** The kind's name, as a card's title: "Academy". */
  name: string;
  /** "Academy apps": a section's title. */
  appsTitle: string;
  /** "academy apps", inside a sentence. */
  apps: string;
  /** "academy app", inside a sentence. */
  app: string;
  /** "academy demo". */
  demo: string;
  /** "academy demo app". */
  demoApp: string;
  summary: string;
  audience: string;
  sources: string[];
  highlights: { title: string; text: string }[];
  inTheApp: string[];
  forYou: string[];
  /** The labels of its guides, in the English order. */
  docs: string[];
}

export interface MarketingTranslation {
  screenAlt: Record<AppScreen | DashboardScreen, string>;
  /** The kinds' names by their English name ("Academy", "News & blog"), as on the Integrations page's chips. */
  kindNames: Record<string, string>;
  /** By kind id (lib/app/kinds.ts). */
  solutions: Record<string, SolutionTranslation>;
  /** By group id; items by their English name (brand names stay; `name` translates a generic one). */
  integrations: Record<string, { title: string; text: string; items: Record<string, { name?: string; text: string }> }>;
  /** By group id; features in the English order. */
  features: Record<string, { title: string; text: string; features: { title: string; text: string; details: string[] }[] }>;
  comparison: { topic: string; typical: string; yallapp: string }[];
  steps: { title: string; short: string; text: string; details: string[] }[];
  requirements: string[];
  faq: { title: string; items: { q: string; a: string }[] }[];
  demos: Record<DemoId, { summary: string; tryThis: string[] }>;
  /** The default plans' words (an edit in the admin shows as the team wrote it). */
  plans: Record<Plan, { tagline: string; highlights: string[] }>;
}

/** A documentation article: its title, description and Markdown body. */
export interface DocTranslation {
  title: string;
  description: string;
  body: string;
}

export interface LegalTranslation {
  title: string;
  updated: string;
  body: string;
}

/** The texts the team edits in the admin (lib/content/site.ts), by page key, then field. */
export type SiteContentTranslation = Record<string, Record<string, string>>;
