import type { DataStore } from "../data/store";
import type { App, Client } from "../data/types";

/**
 * 47 The time zone Analytics counts an app's days in: the owner's choice
 * (Dashboard › Analytics › Time zone), else the zone of the account's
 * country (from its WhatsApp number's country code), else Europe/Istanbul.
 */

export const DEFAULT_ZONE = "Europe/Istanbul";

/** Calling codes of the countries Yallapp's clients are in, longest first, with their main time zone. */
const ZONES_BY_CALLING_CODE: [string, string][] = [
  ["+966", "Asia/Riyadh"],
  ["+971", "Asia/Dubai"],
  ["+974", "Asia/Qatar"],
  ["+965", "Asia/Kuwait"],
  ["+973", "Asia/Bahrain"],
  ["+968", "Asia/Muscat"],
  ["+962", "Asia/Amman"],
  ["+961", "Asia/Beirut"],
  ["+964", "Asia/Baghdad"],
  ["+963", "Asia/Damascus"],
  ["+970", "Asia/Hebron"],
  ["+967", "Asia/Aden"],
  ["+212", "Africa/Casablanca"],
  ["+213", "Africa/Algiers"],
  ["+216", "Africa/Tunis"],
  ["+218", "Africa/Tripoli"],
  ["+249", "Africa/Khartoum"],
  ["+20", "Africa/Cairo"],
  ["+90", "Europe/Istanbul"],
  ["+44", "Europe/London"],
  ["+49", "Europe/Berlin"],
  ["+33", "Europe/Paris"],
  ["+31", "Europe/Amsterdam"],
];

let known: Set<string> | null = null;

/** Whether `zone` is an IANA time zone this server knows. */
export function isTimeZone(zone: unknown): zone is string {
  if (typeof zone !== "string" || zone.length === 0 || zone.length > 64) return false;
  known ??= new Set(Intl.supportedValuesOf("timeZone"));
  if (known.has(zone) || zone === "UTC") return true;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Every time zone, for the picker. */
export function timeZones(): string[] {
  return ["UTC", ...Intl.supportedValuesOf("timeZone")];
}

/** The zone of the account's country, from its WhatsApp number; null when unknown. */
export function zoneOfPhone(phone: string | null | undefined): string | null {
  const digits = `+${(phone ?? "").replace(/\D+/g, "")}`;
  return ZONES_BY_CALLING_CODE.find(([code]) => digits.startsWith(code))?.[1] ?? null;
}

/** The zone an app's analytics days are counted in. */
export function zoneOf(app: Pick<App, "timeZone">, client: Pick<Client, "whatsapp"> | null): string {
  if (app.timeZone && isTimeZone(app.timeZone)) return app.timeZone;
  return zoneOfPhone(client?.whatsapp) ?? DEFAULT_ZONE;
}

/** The same, reading the account. */
export async function appZone(store: Pick<DataStore, "getClientById">, app: Pick<App, "timeZone" | "clientId">): Promise<string> {
  if (app.timeZone && isTimeZone(app.timeZone)) return app.timeZone;
  return zoneOf(app, await store.getClientById(app.clientId));
}

/** "Europe/Istanbul (GMT+3)" for the page. */
export function zoneLabel(zone: string, now: Date): string {
  const offset = new Intl.DateTimeFormat("en-GB", { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(now).find((p) => p.type === "timeZoneName")?.value;
  return offset && offset !== zone ? `${zone.replace(/_/g, " ")} (${offset})` : zone.replace(/_/g, " ");
}
