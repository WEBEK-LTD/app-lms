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
  /** 125 A food company's orders from its restaurants (not a marketplace's). */
  foodOrders: boolean;
  /** 125 A food company's restaurants, open or busy. */
  restaurants: boolean;
  /** 125 Shipments and couriers: a delivery company's, and the courier jobs of food companies and marketplaces. */
  shipments: boolean;
  /** 125 A ride or taxi company's rides and drivers. */
  rides: boolean;
  /** 125 A marketplace's orders, complaints and places. */
  market: boolean;
  /** 125 A school's day and what waits for its administration. */
  school: boolean;
  /** 125 Prime: the app's plan is a Studio plan. It needs the license, so `appAreas` leaves it false and the Owner API sets it (lib/owner/sales.ts `appScope`). */
  prime: boolean;
}

/**
 * 47 Apps whose orders the dashboard lists and refunds (app/actions/refunds.ts,
 * Dashboard › Orders): 104–105 delivery, food and ride apps too, for the card
 * payment links of their shipments, food orders and rides.
 */
export const ORDER_KINDS: ReadonlySet<string> = new Set(["catalog", "courses", "bookings", "events", "deliveries", "restaurants", "rides"]);

/**
 * 125 Apps whose own orders are catalog orders (the Owner API's Orders, Today's
 * sales, the `new_order` push). Delivery, food and ride apps sell through
 * their engines (`foodOrders`, `shipments`, `rides`); their payment links stay
 * on the dashboard's Paid orders.
 */
export const CATALOG_ORDER_KINDS: ReadonlySet<string> = new Set(["catalog", "courses", "bookings", "events"]);

export function appAreas(app: Pick<App, "connector" | "backend" | "vertical" | "catalogSettings">): AppAreas {
  const kind = app.connector?.kind ?? "";
  const hosted = app.backend === "hosted";
  return {
    orders: CATALOG_ORDER_KINDS.has(kind),
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
    foodOrders: kind === "restaurants" && app.vertical !== "marketplace",
    restaurants: kind === "restaurants" && app.vertical !== "marketplace",
    shipments: kind === "deliveries" || kind === "restaurants",
    rides: kind === "rides",
    market: kind === "restaurants" && app.vertical === "marketplace",
    school: kind === "school",
    prime: false,
  };
}
