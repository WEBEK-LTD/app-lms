import type { IconName } from "@/components/icon-names";
import type { Lang } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/en";
import { localePath } from "@/i18n/paths";
import { STORY_IDS, storyPath, type StoryId } from "@/site/story/types";

/**
 * 32 The public website's main menu: Product, Studio and Resources open a
 * short list, the others are links. Studio's list has Yallapp Studio, the
 * apps made in it (their story pages) and its demo. Every page says which one it is (`SitePage`), so the
 * header can mark the page and the section it's in.
 */

export type SitePage =
  | "home"
  | "solutions"
  | "features"
  | "integrations"
  | "how"
  | "studio"
  | "pricing"
  | "demo"
  | "docs"
  | "faq"
  | "developers"
  | "contact"
  | "studio-demo"
  | `story-${StoryId}`;

export interface SiteLink {
  id: SitePage;
  href: string;
  label: string;
  /** One line under the label in the menus. */
  description?: string;
  icon?: IconName;
  /** A short word beside the label on the top bar ("New"). */
  badge?: string;
  /** On the top bar only: the phone's menu lists it in its group. */
  desktopOnly?: boolean;
  /** On the top bar only from extra-large screens; the footer has it at every size. */
  wideOnly?: boolean;
  /** A small heading above this link in its list (Studio's "Apps made in Studio"). */
  heading?: string;
}

export interface SiteGroup {
  id: "product" | "studio" | "resources";
  label: string;
  items: SiteLink[];
  /** A short word beside the list's name on the top bar ("New"). */
  badge?: string;
}

export type SiteNavEntry = ({ kind: "link" } & SiteLink) | ({ kind: "group" } & SiteGroup);

export const PRODUCT_LINKS: SiteLink[] = [
  // 103R Yallapp Studio, apart from the regular apps.
  { id: "studio", href: "/yallapp-studio", label: "Yallapp Studio", description: "Design your app freely", icon: "dashboard_customize" },
  { id: "solutions", href: "/solutions", label: "Solutions", description: "An app for each kind of business", icon: "grid_view" },
  { id: "features", href: "/features", label: "Features", description: "Pages, languages, payments and more", icon: "tune" },
  { id: "integrations", href: "/integrations", label: "Integrations", description: "Where your app's content comes from", icon: "link" },
  { id: "how", href: "/how-it-works", label: "How it works", description: "From sign-up to the app stores", icon: "task_alt" },
];

const STORY_ICONS: Record<StoryId, IconName> = { school: "school", rides: "local_taxi", delivery: "local_shipping", "multi-vendor": "storefront", academy: "workspace_premium" };
const STORY_LABELS: Record<StoryId, [string, string]> = {
  school: ["School app", "Students, parents, teachers and staff"],
  rides: ["Ride-hailing app", "Riders, drivers and the live map"],
  delivery: ["Delivery & shipping app", "Parcels, couriers and live tracking"],
  "multi-vendor": ["Multi-vendor app", "Restaurants, supermarkets and delivery"],
  academy: ["Academy app", "Courses, live classes and certificates"],
};

/** The Studio story pages, for the Studio menu and the footer. */
export const STORY_LINKS: SiteLink[] = STORY_IDS.map((id) => ({ id: `story-${id}` as const, href: storyPath(id), label: STORY_LABELS[id][0], description: STORY_LABELS[id][1], icon: STORY_ICONS[id] }));

/** Studio's list: its page, the apps made in it, its demo. */
export const STUDIO_LINKS: SiteLink[] = [
  PRODUCT_LINKS[0]!,
  ...STORY_LINKS.map((link, i) => (i === 0 ? { ...link, heading: "Apps made in Studio" } : link)),
  { id: "studio-demo", href: "/demo/studio", label: "Studio demo", description: "Try Studio's apps on your phone", icon: "play_circle" },
];

export const RESOURCE_LINKS: SiteLink[] = [
  { id: "docs", href: "/docs", label: "Docs", description: "Step-by-step guides", icon: "menu_book" },
  { id: "faq", href: "/faq", label: "FAQ", description: "Questions, answered", icon: "help" },
  { id: "developers", href: "/developers", label: "API reference", description: "For developers", icon: "code" },
];

export const SITE_NAV: SiteNavEntry[] = [
  { kind: "link", id: "home", href: "/", label: "Home" },
  // Yallapp Studio has its own list on the bar (so not in Product's), with "New" while it is new; the footer has it under Product.
  { kind: "group", id: "product", label: "Product", items: PRODUCT_LINKS.filter((link) => link.id !== "studio") },
  { kind: "group", id: "studio", label: "Studio", items: STUDIO_LINKS, badge: "New" },
  { kind: "link", id: "pricing", href: "/pricing", label: "Pricing" },
  { kind: "link", id: "demo", href: "/demo", label: "Demo" },
  { kind: "group", id: "resources", label: "Resources", items: RESOURCE_LINKS },
  { kind: "link", id: "contact", href: "/contact", label: "Contact", wideOnly: true },
];

/** The menu entry to mark for a page: a link's own id, or the group the page is in. */
export function activeEntry(current: SitePage | undefined): string | null {
  if (!current) return null;
  // A page with its own link on the bar marks that link, before the group it's also in.
  if (SITE_NAV.some((entry) => entry.kind === "link" && entry.id === current)) return current;
  return SITE_NAV.find((entry) => entry.kind === "group" && entry.items.some((item) => item.id === current))?.id ?? null;
}

/** 55 The menu in a language: its labels from the catalog (nav), its links to that language's pages. */
export function siteNavFor(lang: Lang, m: Messages["nav"]): SiteNavEntry[] {
  const label: Record<string, [string, string?]> = {
    home: [m.home],
    product: [m.product],
    studio: [m.studio, m.studioText],
    "studio-demo": [m.studioDemo, m.studioDemoText],
    "story-school": [m.storySchool, m.storySchoolText],
    "story-rides": [m.storyRides, m.storyRidesText],
    "story-delivery": [m.storyDelivery, m.storyDeliveryText],
    "story-multi-vendor": [m.storyMultiVendor, m.storyMultiVendorText],
    "story-academy": [m.storyAcademy, m.storyAcademyText],
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
  const link = (item: SiteLink): SiteLink => ({
    ...item,
    href: localePath(lang, item.href),
    label: label[item.id]![0],
    description: item.description && label[item.id]![1],
    ...(item.heading ? { heading: m.studioApps } : {}),
  });
  return SITE_NAV.map((entry) =>
    entry.kind === "group"
      ? { ...entry, label: entry.id === "studio" ? m.studioShort : label[entry.id]![0], items: entry.items.map(link), ...(entry.badge ? { badge: m.newBadge } : {}) }
      : { kind: "link" as const, ...link(entry), ...(entry.badge ? { badge: m.newBadge } : {}) },
  );
}

/** The footer's Studio column in a language: the apps made in Studio. */
export function storyLinksFor(lang: Lang, m: Messages["nav"]): { id: string; href: string; label: string }[] {
  const label: Record<StoryId, string> = { school: m.storySchool, rides: m.storyRides, delivery: m.storyDelivery, "multi-vendor": m.storyMultiVendor, academy: m.storyAcademy };
  return STORY_IDS.map((id) => ({ id: `story-${id}`, href: localePath(lang, storyPath(id)), label: label[id] }));
}
