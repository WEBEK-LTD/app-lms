import { DEFAULT_ZONE, isTimeZone } from "../analytics/zone";
import { CATALOG_CURRENCIES } from "../catalog/money";
import type { App, CatalogCurrency, TravelFlightSource, TravelHotelSource, TravelSettings } from "../data/types";
import { TRAVEL_FLIGHT_SOURCES, TRAVEL_HOTEL_SOURCES } from "../data/types";
import type { LayoutTab } from "../pages/types";
import { hasFeature, type PlanInfo } from "../plans";
import { hotelSourceInfo, flightSourceInfo } from "./sources";

/**
 * 126 Travel apps (Studio projects of the type `travel`): hotels, flights or
 * both. Yallapp turns each part on or off for the project (Admin › client ›
 * Travel: at least one stays on); the app builds its tabs and home from
 * what is on. The company sets everything else, every amount its own.
 */

export type TravelMode = "both" | "hotels" | "flights";

export const DEFAULT_TRAVEL_SETTINGS: TravelSettings = {
  hotels: true,
  hotelSource: "dashboard",
  flights: true,
  flightSource: "fixed",
  currency: "USD",
  payNow: true,
  payAtHotel: true,
  memberOffPercent: 0,
  bundleOffPercent: 0,
  transfer: null,
  bagCents: 0,
  mealCents: 0,
  displayFont: "Fraunces",
  help: { phone: null, email: null, whatsapp: null },
  timeZone: DEFAULT_ZONE,
};

/** How many of each a project may have. */
export const TRAVEL_LIMITS = { hotels: 200, roomsPerHotel: 40, ratesPerRoom: 6, photos: 30, flights: 2000, alertsPerPerson: 20, priceDays: 730 } as const;

/** How long rooms and seats are held while the person pays. */
export const HOLD_MINUTES = 30;

const zoneOf = (zone: unknown): string | null => (isTimeZone(zone) ? zone : null);

const clampPercent = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.min(50, Math.max(0, Math.round(value))) : 0);

/**
 * The saved settings with every field there; sources that aren't connected yet fall back to the dashboard's.
 * 126.10 The time zone: the company's choice, else the app's (Dashboard › Analytics), else Europe/Istanbul.
 */
export function travelSettingsOf(saved: Partial<TravelSettings> | null | undefined, app?: Pick<App, "timeZone"> | null): TravelSettings {
  const s = { ...DEFAULT_TRAVEL_SETTINGS, ...(saved ?? {}) };
  const hotelSource: TravelHotelSource = (TRAVEL_HOTEL_SOURCES as readonly string[]).includes(s.hotelSource) && hotelSourceInfo(s.hotelSource).connected ? s.hotelSource : "dashboard";
  const flightSource: TravelFlightSource = (TRAVEL_FLIGHT_SOURCES as readonly string[]).includes(s.flightSource) && flightSourceInfo(s.flightSource).connected ? s.flightSource : "fixed";
  const currency: CatalogCurrency = CATALOG_CURRENCIES.includes(s.currency) ? s.currency : "USD";
  // At least one part stays on.
  const hotels = s.hotels !== false || s.flights === false;
  return {
    ...s,
    hotels,
    flights: s.flights !== false,
    hotelSource,
    flightSource,
    currency,
    memberOffPercent: clampPercent(s.memberOffPercent),
    bundleOffPercent: clampPercent(s.bundleOffPercent),
    bagCents: Math.max(0, Math.round(s.bagCents || 0)),
    mealCents: Math.max(0, Math.round(s.mealCents || 0)),
    help: { ...DEFAULT_TRAVEL_SETTINGS.help, ...(s.help ?? {}) },
    timeZone: zoneOf(saved?.timeZone) ?? zoneOf(app?.timeZone) ?? DEFAULT_ZONE,
  };
}

export function travelMode(settings: Pick<TravelSettings, "hotels" | "flights">): TravelMode {
  if (settings.hotels && settings.flights) return "both";
  return settings.hotels ? "hotels" : "flights";
}

/** Whether the app is a travel project whose plan has travel (Yallapp's own demo apps always do). */
export function travelOn(app: Pick<App, "connector" | "demo">, plan: PlanInfo | null | undefined): boolean {
  return app.connector?.kind === "travel" && (plan === undefined || hasFeature(plan, "travel") || app.demo === true);
}

export const isTravelApp = (app: Pick<App, "connector"> | null | undefined): app is App => app?.connector?.kind === "travel";

const tab = (id: string, label: string, icon: string, screen: string): LayoutTab => ({ id, label, icon, target: { type: "screen", screen } as LayoutTab["target"] });

/**
 * The tabs between the first (Explore, or Search for flights only, the
 * home) and Account, as the approved structure has them for each mode.
 */
export function travelTabs(mode: TravelMode): LayoutTab[] {
  switch (mode) {
    case "both":
      return [tab("stays", "Stays", "bed", "stays"), tab("flights", "Flights", "flight", "flights"), tab("trips", "Trips", "luggage", "trips")];
    case "hotels":
      return [tab("saved", "Saved", "favorite", "saved"), tab("bookings", "Bookings", "luggage", "trips"), tab("messages", "Messages", "chat", "messages")];
    case "flights":
      return [tab("alerts", "Alerts", "notifications", "price_alerts"), tab("trips", "Trips", "luggage", "trips"), tab("help", "Help", "support_agent", "messages")];
  }
}

/** Every tab's labels in order, Home's first, as Admin's live preview shows them. */
export function travelTabLabels(mode: TravelMode): string[] {
  return [mode === "flights" ? "Search" : "Explore", ...travelTabs(mode).map((t) => t.label), "Account"];
}

/** The screens of a part that is off: the app never shows them. */
export function screensOff(mode: TravelMode): string[] {
  if (mode === "hotels") return ["flights", "price_alerts", "flight_results", "flight_fares", "price_calendar", "seat_map", "flight_extras", "boarding_pass", "trip_bundle"];
  if (mode === "flights") return ["stays", "saved", "travel_hotel", "hotel_results", "hotel_map", "hotel_rooms", "hotel_checkout", "review_stay", "trip_bundle"];
  return [];
}
