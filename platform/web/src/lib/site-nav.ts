import type { IconName } from "@/components/icon-names";
import type { Lang } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/en";
import { localePath } from "@/i18n/paths";

/**
 * 32 The public website's main menu: Product and Resources open a short list,
 * the others are links. Every page says which one it is (`SitePage`), so the
 * header can mark the page and the section it's in.
 */

export type SitePage =
  | "home"
  | "solutions"
  | "features"
  | "integrations"
  | "how"
  | "pricing"
  | "demo"
  | "docs"
  | "faq"
  | "developers"
  | "contact";

export interface SiteLink {
  id: SitePage;
  href: string;
  label: string;
  /** One line under the label in the menus. */
  description?: string;
  icon?: IconName;
}

export interface SiteGroup {
  id: "product" | "resources";
  label: string;
  items: SiteLink[];
}

export type SiteNavEntry = ({ kind: "link" } & SiteLink) | ({ kind: "group" } & SiteGroup);

export const PRODUCT_LINKS: SiteLink[] = [
  { id: "solutions", href: "/solutions", label: "Solutions", description: "An app for each kind of business", icon: "grid_view" },
  { id: "features", href: "/features", label: "Features", description: "Pages, languages, payments and more", icon: "tune" },
  { id: "integrations", href: "/integrations", label: "Integrations", description: "Where your app's content comes from", icon: "link" },
  { id: "how", href: "/how-it-works", label: "How it works", description: "From sign-up to the app stores", icon: "task_alt" },
];

export const RESOURCE_LINKS: SiteLink[] = [
  { id: "docs", href: "/docs", label: "Docs", description: "Step-by-step guides", icon: "menu_book" },
  { id: "faq", href: "/faq", label: "FAQ", description: "Questions, answered", icon: "help" },
  { id: "developers", href: "/developers", label: "API reference", description: "For developers", icon: "code" },
];

export const SITE_NAV: SiteNavEntry[] = [
  { kind: "link", id: "home", href: "/", label: "Home" },
  { kind: "group", id: "product", label: "Product", items: PRODUCT_LINKS },
  { kind: "link", id: "pricing", href: "/pricing", label: "Pricing" },
  { kind: "link", id: "demo", href: "/demo", label: "Demo" },
  { kind: "group", id: "resources", label: "Resources", items: RESOURCE_LINKS },
  { kind: "link", id: "contact", href: "/contact", label: "Contact" },
];

/** The menu entry to mark for a page: a link's own id, or the group the page is in. */
export function activeEntry(current: SitePage | undefined): string | null {
  if (!current) return null;
  for (const entry of SITE_NAV) {
    if (entry.kind === "link" && entry.id === current) return entry.id;
    if (entry.kind === "group" && entry.items.some((item) => item.id === current)) return entry.id;
  }
  return null;
}

/** 55 The menu in a language: its labels from the catalog (nav), its links to that language's pages. */
export function siteNavFor(lang: Lang, m: Messages["nav"]): SiteNavEntry[] {
  const label: Record<string, [string, string?]> = {
    home: [m.home],
    product: [m.product],
    pricing: [m.pricing],
    demo: [m.demo],
    resources: [m.resources],
    contact: [m.contact],
    solutions: [m.solutions, m.solutionsText],
    features: [m.features, m.featuresText],
    integrations: [m.integrations, m.integrationsText],
    how: [m.how, m.howText],
    docs: [m.docs, m.docsText],
    faq: [m.faq, m.faqText],
    developers: [m.developers, m.developersText],
  };
  const link = (item: SiteLink): SiteLink => ({ ...item, href: localePath(lang, item.href), label: label[item.id]![0], description: item.description && label[item.id]![1] });
  return SITE_NAV.map((entry) =>
    entry.kind === "group" ? { ...entry, label: label[entry.id]![0], items: entry.items.map(link) } : { kind: "link" as const, ...link(entry) },
  );
}
