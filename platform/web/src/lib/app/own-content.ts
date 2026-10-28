import type { AppPatch } from "../data/store";
import { DEFAULT_BOOKING_SETUP, DEFAULT_CATALOG_SETTINGS, DEFAULT_COURSE_SETUP, type App } from "../data/types";
import type { OwnContentKind } from "./kinds";

/** 20 The connector and starting settings of content managed in the dashboard. */
export function ownContentSetup(kind: OwnContentKind, app: App): AppPatch {
  switch (kind) {
    case "courses":
      return { connector: { kind }, courseSetup: app.courseSetup ?? DEFAULT_COURSE_SETUP, catalogSettings: app.catalogSettings ?? DEFAULT_CATALOG_SETTINGS };
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
      return { connector: { kind }, catalogSettings: app.catalogSettings ?? DEFAULT_CATALOG_SETTINGS };
    case "listings":
    case "articles":
      return { connector: { kind } };
  }
}
