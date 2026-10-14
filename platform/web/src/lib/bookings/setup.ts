import {
  DEFAULT_BOOKING_RULES,
  DEFAULT_BOOKING_SETUP,
  type App,
  type AppVertical,
  type BookingSetup,
  type ClassTemplate,
  type IntakeField,
  type MembershipPlan,
} from "../data/types";

/** A booking setup with every part added since it was first saved filled in. */
export type FullBookingSetup = BookingSetup & { intakeFields: IntakeField[]; classTemplates: ClassTemplate[]; membershipPlans: MembershipPlan[]; membershipRequired: boolean };

/** The app's booking setup, with rules added since it was saved filled in (21 no questions and 27 no classes or plans when none were saved). */
export function bookingSetup(app: Pick<App, "bookingSetup">): FullBookingSetup {
  const saved = app.bookingSetup ?? DEFAULT_BOOKING_SETUP;
  return {
    ...DEFAULT_BOOKING_SETUP,
    ...saved,
    rules: { ...DEFAULT_BOOKING_RULES, ...saved.rules },
    intakeFields: saved.intakeFields ?? [],
    classTemplates: saved.classTemplates ?? [],
    membershipPlans: saved.membershipPlans ?? [],
    membershipRequired: saved.membershipRequired ?? false,
  };
}

/**
 * 21 The dashboard's words for bookings, by vertical: a clinic's doctors,
 * patients and visits; 27 a gym's coaches, classes and members; everyone
 * else's team, customers and appointments.
 */
export function bookingWords(vertical: AppVertical | null | undefined) {
  if (vertical === "fitness") {
    return {
      page: "Classes & coaches",
      team: "Coaches",
      member: "coach",
      appointments: "Personal sessions",
      appointment: "session",
      customer: "member",
      intake: "Booking questions",
    };
  }
  return vertical === "clinic"
    ? {
        page: "Doctors & services",
        team: "Doctors",
        member: "doctor",
        appointments: "Visits",
        appointment: "visit",
        customer: "patient",
        intake: "Intake form",
      }
    : {
        page: "Services & team",
        team: "Team",
        member: "team member",
        appointments: "Appointments",
        appointment: "appointment",
        customer: "customer",
        intake: "Booking questions",
      };
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
