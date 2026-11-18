import type { AppPatch } from "../data/store";
import { DEFAULT_BOOKING_SETUP, DEFAULT_CATALOG_SETTINGS, DEFAULT_COURSE_SETUP, type App, type CatalogSettings } from "../data/types";
import type { OwnContentKind } from "./kinds";

/**
 * 20 The connector and starting settings of content managed in the dashboard;
 * 175 `starting`: a new shop's catalog settings from its owner's country
 * (lib/app/country-defaults.ts), used only when the app has none saved.
 */
export function ownContentSetup(kind: OwnContentKind, app: App, starting?: CatalogSettings): AppPatch {
  const catalog = app.catalogSettings ?? starting ?? DEFAULT_CATALOG_SETTINGS;
  switch (kind) {
    case "courses":
      return { connector: { kind }, courseSetup: app.courseSetup ?? DEFAULT_COURSE_SETUP, catalogSettings: catalog };
    case "bookings":
      return { connector: { kind }, bookingSetup: app.bookingSetup ?? DEFAULT_BOOKING_SETUP };
    case "catalog":
    // 28 Paid tickets use the shop's card payment settings, like paid courses.
    case "events":
    // 29 A charity's donations are paid into its own account (iyzico, Kashier, Fawaterk, Stripe or PayPal), kept with the shop's payment settings.
    case "campaigns":
    // 104 A delivery company's card payments are orders on the shop's payment settings too.
    case "deliveries":
    // 105.1 So are a food company's card payments.
    case "restaurants":
    // 105.2 And a ride company's.
    case "rides":
    // 105.4 And a school's fees.
    case "school":
    // 126 And a travel company's bookings paid now.
    case "travel":
      return { connector: { kind }, catalogSettings: catalog };
    case "listings":
    case "articles":
      return { connector: { kind } };
  }
}
