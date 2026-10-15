import { describe, expect, it } from "vitest";
import { pluginName, siteMatch, siteRunsLine, type SiteFacts } from "@/lib/app/site-match";
import type { AppType, AppVertical } from "@/lib/data/types";

const app = (appType: AppType, vertical: AppVertical | null = null) => ({ appType, vertical });
const facts = (lms: string | null, store: string | null, bookings: string | null): SiteFacts => ({ lms, store, bookings });

describe("30 what the WordPress site runs and whether the app's type fits it", () => {
  it("names the plugins, and shows unknown ids as sent", () => {
    expect(pluginName("tutor")).toBe("Tutor LMS");
    expect(pluginName("sensei")).toBe("Sensei LMS");
    expect(pluginName("bookingpress")).toBe("BookingPress");
    expect(pluginName("newlms")).toBe("newlms");
    const match = siteMatch(app("lms"), facts("tutor", "woocommerce", ""));
    expect(match.runs).toEqual(["Tutor LMS", "WooCommerce"]);
    expect(siteRunsLine(match)).toBe("Your website runs: Tutor LMS, WooCommerce");
    expect(siteRunsLine(siteMatch(app("news"), facts(null, "", "")))).toBe("Your website has no course, shop or booking plugin.");
  });

  it("an Academy app on a site with an LMS fits", () => {
    expect(siteMatch(app("lms"), facts("tutor", "", ""))).toMatchObject({ reported: true, runs: ["Tutor LMS"], warning: null, suggest: null });
  });

  it("a Store app on a Tutor LMS site without WooCommerce gets a warning and the Academy type", () => {
    const match = siteMatch(app("store"), facts("tutor", "", ""));
    expect(match.warning).toBe("Your website has no shop plugin the app can read. Install WooCommerce, or change the app type.");
    expect(match.suggestion).toBe("Your website runs Tutor LMS: an Academy app shows its courses and lessons.");
    expect(match.suggest).toBe("academy");
    // A restaurant is a store too.
    expect(siteMatch(app("store", "restaurant"), facts("learndash", "", "")).suggestion).toBe(
      "Your website runs LearnDash: an Academy app shows its courses and lessons.",
    );
    // Tutor LMS with WooCommerce: the store reads the shop.
    expect(siteMatch(app("store"), facts("tutor", "woocommerce", "")).warning).toBeNull();
  });

  it("an Academy app on a site without an LMS names the course plugins and the type that fits", () => {
    const shop = siteMatch(app("lms"), facts(null, "woocommerce", ""));
    expect(shop.warning).toBe(
      "Your website has no course plugin the app can read. Install Tutor LMS, LearnDash, LearnPress, LifterLMS, MasterStudy, Sensei LMS or Masteriyo, or change the app type.",
    );
    expect(shop.suggestion).toBe("Your website runs WooCommerce: a Store app shows its products.");
    expect(shop.suggest).toBe("store");
    const bookings = siteMatch(app("lms"), facts(null, "", "amelia"));
    expect(bookings.suggestion).toBe("Your website runs Amelia: a Bookings app shows its services and free times.");
    expect(bookings.suggest).toBe("bookings");
    expect(siteMatch(app("lms"), facts(null, "", ""))).toMatchObject({ suggestion: null, suggest: null });
  });

  it("booking apps (bookings, clinic, gym) need a booking plugin", () => {
    for (const vertical of [null, "clinic", "fitness"] as const) {
      const match = siteMatch(app("booking", vertical), facts(null, "woocommerce", ""));
      expect(match.warning).toBe("Your website has no booking plugin the app can read. Install Amelia, BookingPress or LatePoint, or change the app type.");
      expect(match.suggest).toBe("store");
      expect(siteMatch(app("booking", vertical), facts(null, "", "latepoint")).warning).toBeNull();
    }
  });

  it("a news app fits every WordPress site", () => {
    expect(siteMatch(app("news"), facts(null, "", ""))).toMatchObject({ reported: true, warning: null });
    expect(siteMatch(app("news"), facts("tutor", "woocommerce", "amelia")).warning).toBeNull();
  });

  it("says nothing when the plugin doesn't report its shop and booking plugins (before 30)", () => {
    expect(siteMatch(app("store"), facts("tutor", null, null))).toEqual({ runs: [], reported: false, warning: null, suggestion: null, suggest: null });
    expect(siteMatch(app("lms"), facts(null, null, null)).warning).toBeNull();
  });
});
