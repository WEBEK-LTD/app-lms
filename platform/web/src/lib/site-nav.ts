import type { IconName } from "@/components/icon-names";

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
