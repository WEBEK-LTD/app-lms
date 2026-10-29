import { isTimeZone } from "../bookings/time";
import { CATALOG_CURRENCIES } from "../catalog/money";
import type { App, CatalogCurrency, SchoolSettings } from "../data/types";
import { hasFeature, type PlanInfo } from "../plans";

/**
 * 105.4 A school's settings: its time zone (for today's lessons and the
 * attendance day), its currency (for fees), the current term, whether
 * parents are told when their child is absent or late, and whether fees
 * can be paid by card. Every amount is the school's: Yallapp sets none.
 */

export const DEFAULT_SCHOOL_TIMEZONE = "Africa/Cairo";

export function schoolSettingsOf(saved: SchoolSettings | null, app?: Pick<App, "timeZone" | "catalogSettings">): SchoolSettings {
  const zone = app?.timeZone && isTimeZone(app.timeZone) ? app.timeZone : DEFAULT_SCHOOL_TIMEZONE;
  const currency = app?.catalogSettings?.currency ?? "EGP";
  return { timezone: zone, currency, term: null, absenceAlerts: true, feesByCard: false, ...(saved ?? {}) };
}

export function schoolCurrency(settings: SchoolSettings): CatalogCurrency {
  return (CATALOG_CURRENCIES as string[]).includes(settings.currency) ? (settings.currency as CatalogCurrency) : "EGP";
}

/** Whether the app is a school whose plan has schools (Yallapp's own demo apps always do). */
export function schoolOn(app: Pick<App, "connector" | "demo">, plan: PlanInfo | null | undefined): boolean {
  return app.connector?.kind === "school" && (plan === undefined || hasFeature(plan, "school") || app.demo === true);
}
