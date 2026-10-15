import type { Activation, AppType, AppVertical } from "../data/types";
import { kindById, kindOf } from "./kinds";

/**
 * 30 What the WordPress site runs, as the plugin reports it, and whether the
 * app's type can show it: a Store app on a site with only Tutor LMS shows
 * empty lists, so the dashboard says so and names the type that fits.
 */

/** The plugins' names by the id the Yallapp plugin sends; anything else is shown as sent. */
const PLUGIN_NAMES: Record<string, string> = {
  tutor: "Tutor LMS",
  learndash: "LearnDash",
  learnpress: "LearnPress",
  lifterlms: "LifterLMS",
  masterstudy: "MasterStudy",
  sensei: "Sensei LMS",
  masteriyo: "Masteriyo",
  woocommerce: "WooCommerce",
  amelia: "Amelia",
  bookly: "Bookly",
  latepoint: "LatePoint",
  bookingpress: "BookingPress",
};

export function pluginName(id: string): string {
  return PLUGIN_NAMES[id] ?? id;
}

export type SiteFacts = Pick<Activation, "lms" | "store" | "bookings">;

export interface SiteMatch {
  /** The plugins the app can read, by name ("Tutor LMS", "WooCommerce"). Empty when the plugin didn't report them. */
  runs: string[];
  /** Whether the plugin reports its shop and booking plugins (Phase 30 and later). */
  reported: boolean;
  /** What's wrong and what to do, or null when the type fits. */
  warning: string | null;
  /** The type that fits what the site runs ("Your website runs WooCommerce: a Store app shows its products."). */
  suggestion: string | null;
  /** That type's kind id (lib/app/kinds.ts). */
  suggest: string | null;
}

/** What each plugin family needs and what the type that reads it shows. */
const FAMILIES = {
  lms: {
    kind: "academy",
    shows: "its courses and lessons",
    missing:
      "Your website has no course plugin the app can read. Install Tutor LMS, LearnDash, LearnPress, LifterLMS, MasterStudy, Sensei LMS or Masteriyo, or change the app type.",
  },
  store: {
    kind: "store",
    shows: "its products",
    missing: "Your website has no shop plugin the app can read. Install WooCommerce, or change the app type.",
  },
  bookings: {
    kind: "bookings",
    shows: "its services and free times",
    missing: "Your website has no booking plugin the app can read. Install Amelia, BookingPress or LatePoint, or change the app type.",
  },
} as const;

type Family = keyof typeof FAMILIES;

/** The plugin family each engine reads on WordPress; engines without one (news) fit any site. */
const ENGINE_FAMILY: Partial<Record<AppType, Family>> = { lms: "lms", store: "store", booking: "bookings" };

const article = (word: string) => (/^[AEIOU]/.test(word) ? "an" : "a");

/** 30 What the site runs and whether the app's type fits it. */
export function siteMatch(app: { appType: AppType; vertical?: AppVertical | null }, site: SiteFacts): SiteMatch {
  // Plugins before Phase 30 send neither: their site may run anything beside its LMS, so say nothing.
  if (site.store === null && site.bookings === null) {
    return { runs: [], reported: false, warning: null, suggestion: null, suggest: null };
  }
  const has: Record<Family, string> = { lms: site.lms ?? "", store: site.store ?? "", bookings: site.bookings ?? "" };
  const runs = (["lms", "store", "bookings"] as const).filter((f) => has[f]).map((f) => pluginName(has[f]));
  const family = ENGINE_FAMILY[kindOf(app).engine];
  if (!family || has[family]) return { runs, reported: true, warning: null, suggestion: null, suggest: null };
  const other = (["lms", "store", "bookings"] as const).find((f) => f !== family && has[f]);
  const kind = other ? kindById(FAMILIES[other].kind) : null;
  return {
    runs,
    reported: true,
    warning: FAMILIES[family].missing,
    suggestion: other && kind ? `Your website runs ${pluginName(has[other])}: ${article(kind.name)} ${kind.name} app shows ${FAMILIES[other].shows}.` : null,
    suggest: kind?.id ?? null,
  };
}

/** 30 The one line under the plugin connection. */
export function siteRunsLine(match: SiteMatch): string {
  return match.runs.length ? `Your website runs: ${match.runs.join(", ")}` : "Your website has no course, shop or booking plugin.";
}
