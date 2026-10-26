import { docBySlug } from "@/content/docs";
import { LOCALIZED } from "@/content/localized";
import type { Lang } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { matchHelp } from "./help-match";

/**
 * 93.2 Help on every page: the documentation article for each part of the
 * dashboard, by the start of its address (the longest one that fits wins).
 */
export const DASHBOARD_HELP: Record<string, string> = {
  "/dashboard": "getting-started",
  "/dashboard/app-type": "app-types",
  "/dashboard/setup": "setup-steps",
  "/dashboard/pages": "pages-and-look",
  "/dashboard/media": "media",
  "/dashboard/chat": "chat",
  "/dashboard/languages": "languages",
  "/dashboard/protection": "protection",
  "/dashboard/preview": "preview-your-app",
  "/dashboard/analytics": "analytics",
  "/dashboard/integrations": "integrations",
  "/dashboard/app-sign-in": "app-users",
  "/dashboard/notifications": "push-notifications",
  "/dashboard/campaigns": "push-notifications",
  "/dashboard/builds": "builds",
  "/dashboard/publishing": "developer-accounts",
  "/dashboard/publishing/links": "app-links",
  "/dashboard/publishing/more-stores": "galaxy-store",
  "/dashboard/stability": "stability",
  "/dashboard/license": "plans-and-billing",
  "/dashboard/team": "team",
  "/dashboard/announcements": "account-and-support",
  "/dashboard/phones": "yallapp-business",
  "/dashboard/account": "account-security",
  "/dashboard/catalog": "store-orders",
  "/dashboard/orders": "store-orders",
  "/dashboard/courses": "courses",
  "/dashboard/services": "bookings",
  "/dashboard/appointments": "bookings",
  "/dashboard/listings": "real-estate",
  "/dashboard/inquiries": "real-estate",
  "/dashboard/articles": "news",
  "/dashboard/events": "events",
  "/dashboard/check-in": "events",
  "/dashboard/donations": "donations",
  "/dashboard/members": "fitness",
  "/dashboard/memberships": "fitness",
  "/dashboard/timetable": "fitness",
};

/** The article's slug for a dashboard address, or null. */
export function helpSlug(pathname: string): string | null {
  return matchHelp(DASHBOARD_HELP, pathname);
}

export interface HelpLinks {
  /** Address prefix to slug. */
  prefixes: Record<string, string>;
  /** Slug to the article's address and title, in the dashboard's language. */
  articles: Record<string, { href: string; title: string }>;
}

/** What the dashboard's help link needs, in this language (the built-in titles). */
export function helpLinks(lang: Lang): HelpLinks {
  const articles: HelpLinks["articles"] = {};
  for (const slug of new Set(Object.values(DASHBOARD_HELP))) {
    const doc = docBySlug(slug);
    if (!doc) continue;
    const title = lang === "en" ? doc.title : (LOCALIZED[lang].docs[slug]?.title ?? doc.title);
    articles[slug] = { href: localePath(lang, `/docs/${slug}`), title };
  }
  return { prefixes: DASHBOARD_HELP, articles };
}
