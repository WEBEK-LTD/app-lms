import { fulfilmentOf } from "../catalog/fulfilment";
import type { App } from "../data/types";

/**
 * 58 What an app has in the dashboard, by its type and where its content
 * comes from: the same tests the dashboard's pages and actions make (its
 * menu is `contentNavOf`), in one place for the Owner API (Yallapp Business).
 */
export interface AppAreas {
  /** Paid orders and their refunds (Orders, the Kitchen): shops, paid courses, memberships, tickets. */
  orders: boolean;
  /** A restaurant's orders move through the kitchen's steps. */
  kitchen: boolean;
  appointments: boolean;
  events: boolean;
  checkIn: boolean;
  donations: boolean;
  products: boolean;
  courses: boolean;
  articles: boolean;
  listings: boolean;
  inquiries: boolean;
  /** 63 Students' questions in courses managed in the dashboard. */
  questions: boolean;
  /** 63 Reviews of courses managed in the dashboard. */
  reviews: boolean;
  /** 63 A gym's members checked in at the door. */
  memberCheckIn: boolean;
  /** People who sign in to the app on Yallapp's hosted API, and notifications to them. */
  appUsers: boolean;
  notifications: boolean;
  media: boolean;
  analytics: boolean;
  preview: boolean;
  builds: boolean;
}

/** 47 Apps whose orders the dashboard lists and refunds (app/actions/refunds.ts, Dashboard › Orders). */
export const ORDER_KINDS: ReadonlySet<string> = new Set(["catalog", "courses", "bookings", "events", "deliveries", "restaurants", "rides"]);

export function appAreas(app: Pick<App, "connector" | "backend" | "vertical" | "catalogSettings">): AppAreas {
  const kind = app.connector?.kind ?? "";
  const hosted = app.backend === "hosted";
  return {
    orders: ORDER_KINDS.has(kind),
    kitchen: kind === "catalog" && fulfilmentOf(app) !== null,
    appointments: kind === "bookings",
    events: kind === "events",
    checkIn: kind === "events",
    donations: kind === "campaigns",
    products: kind === "catalog",
    courses: kind === "courses",
    articles: kind === "articles",
    listings: kind === "listings",
    inquiries: kind === "listings",
    questions: kind === "courses",
    reviews: kind === "courses",
    memberCheckIn: kind === "bookings" && app.vertical === "fitness",
    appUsers: hosted,
    notifications: hosted,
    media: true,
    analytics: true,
    preview: true,
    builds: true,
  };
}
