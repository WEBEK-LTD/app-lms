import { DEFAULT_BOOKING_RULES, DEFAULT_BOOKING_SETUP, type App, type BookingSetup } from "../data/types";

/** The app's booking setup, with rules added since it was saved filled in. */
export function bookingSetup(app: App): BookingSetup {
  const saved = app.bookingSetup ?? DEFAULT_BOOKING_SETUP;
  return { ...DEFAULT_BOOKING_SETUP, ...saved, rules: { ...DEFAULT_BOOKING_RULES, ...saved.rules } };
}

export const BOOKING_STATUS_LABELS = {
  approved: "Approved",
  pending: "Pending",
  cancelled: "Cancelled",
  rejected: "Rejected",
  no_show: "No-show",
  completed: "Completed",
} as const;

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
