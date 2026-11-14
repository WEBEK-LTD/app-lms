import { utcToLocal } from "../bookings/time";
import type { App } from "../data/types";

/**
 * 131 The shop's time zone, for its flash sales' times and its delivery
 * days: the delivery settings', else the owner's (47), else Istanbul's.
 */
export function shopZone(app: Pick<App, "catalogSettings" | "timeZone">): string {
  return app.catalogSettings?.delivery?.timezone || app.timeZone || "Europe/Istanbul";
}

/** How many minutes the zone is ahead of UTC at `at`. */
export function zoneOffsetMinutes(zone: string, at: Date): number {
  const local = utcToLocal(at, zone);
  const asUtc = Date.parse(`${local.date}T${local.time}:00Z`);
  const exact = Math.floor(at.getTime() / 60_000) * 60_000;
  return Math.round((asUtc - exact) / 60_000);
}

/** An instant as the form's `datetime-local` value in the zone ("2026-11-20T09:00"). */
export function localInput(at: Date, zone: string): string {
  const local = utcToLocal(at, zone);
  return `${local.date}T${local.time}`;
}
