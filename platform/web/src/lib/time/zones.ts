/**
 * 137 Every time zone, in one place, for every page where a client picks
 * one (the dashboard and Studio): Delivery & offers, Services, Selling,
 * food and rides, the school, travel, events, Analytics, our team's hours
 * and the mailing's schedule.
 *
 * - The list is every IANA zone the runtime knows (Intl.supportedValuesOf),
 *   with UTC added when it's missing.
 * - The zones Yallapp's clients are in come first (Istanbul, Cairo, the
 *   Gulf, Amman, Baghdad, Beirut, Casablanca, London), then the rest by
 *   their UTC offset now, then by name.
 * - Each one reads "UTC+03:00 · Istanbul · Türkiye Standard Time": the
 *   offset now, the city from the zone's name and, where Intl has one, the
 *   zone's name in the dashboard's language.
 * - `isIanaZone` accepts any IANA zone (aliases such as Asia/Kolkata too),
 *   so a form never refuses a zone the browser's list has and the server's
 *   doesn't, and refuses junk.
 *
 * Safe in client components: no catalog, no server code.
 */

/** The zones Yallapp's clients are in, first in every picker, in this order. */
export const SERVED_ZONES = [
  "Europe/Istanbul",
  "Africa/Cairo",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Kuwait",
  "Asia/Qatar",
  "Asia/Bahrain",
  "Asia/Muscat",
  "Asia/Amman",
  "Asia/Baghdad",
  "Asia/Beirut",
  "Africa/Casablanca",
  "Europe/London",
] as const;

const SERVED: ReadonlySet<string> = new Set(SERVED_ZONES);

/** A zone's name: "Europe/Istanbul", "America/Argentina/Buenos_Aires", "Etc/GMT+3", "UTC". */
const SHAPE = /^(?:UTC|GMT|[A-Z][A-Za-z_-]*(?:\/[A-Za-z0-9][A-Za-z0-9_+-]*){1,2})$/;

let known: Set<string> | null = null;

function runtimeZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [...SERVED_ZONES];
  }
}

/** Whether `zone` is an IANA time zone: one of the list, or another name of one (an alias the runtime knows). */
export function isIanaZone(zone: unknown): zone is string {
  if (typeof zone !== "string" || zone.length === 0 || zone.length > 64) return false;
  known ??= new Set(runtimeZones());
  if (known.has(zone) || zone === "UTC") return true;
  if (!SHAPE.test(zone)) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

const offsetFormats = new Map<string, Intl.DateTimeFormat>();

/** The zone's offset from UTC at `now`, in minutes (Istanbul: 180). */
export function zoneOffsetMinutes(zone: string, now: Date = new Date()): number {
  let f = offsetFormats.get(zone);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" });
    } catch {
      return 0;
    }
    offsetFormats.set(zone, f);
  }
  const name = f.formatToParts(now).find((p) => p.type === "timeZoneName")?.value ?? "";
  const m = /([+-])(\d{1,2})(?::?(\d{2}))?/.exec(name);
  if (!m) return 0;
  const minutes = Number(m[2]) * 60 + Number(m[3] ?? 0);
  return m[1] === "-" ? -minutes : minutes;
}

/** "UTC+03:00", "UTC-05:30", "UTC+00:00". */
export function utcOffsetText(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/** The city in a zone's name: "Buenos Aires" for America/Argentina/Buenos_Aires, "UTC" for UTC. */
export function zoneCity(zone: string): string {
  return (zone.split("/").pop() ?? zone).replace(/_/g, " ");
}

/**
 * Every zone, the served ones first (in SERVED_ZONES' order), then the
 * others by their offset at `now`, then by name. UTC is in it.
 */
export function allTimeZones(now: Date = new Date()): string[] {
  const all = [...new Set([...runtimeZones(), "UTC"])];
  const served: string[] = [...SERVED_ZONES];
  const rest = all
    .filter((z) => !SERVED.has(z))
    .map((z) => ({ z, offset: zoneOffsetMinutes(z, now) }))
    .sort((a, b) => a.offset - b.offset || (a.z < b.z ? -1 : a.z > b.z ? 1 : 0))
    .map(({ z }) => z);
  return [...served, ...rest];
}

export type ZoneOption = {
  /** The IANA name, what the form sends. */
  value: string;
  /** "UTC+03:00 · Istanbul · Türkiye Standard Time". */
  label: string;
  offset: number;
  city: string;
  /** The zone's name in the language, when Intl has one ("توقيت تركيا"). */
  region: string | null;
  served: boolean;
};

const regionFormats = new Map<string, Intl.DateTimeFormat | null>();

/** The zone's name in `locale` ("Türkiye Standart Saati"), or null when Intl only has "GMT+3". */
function regionOf(zone: string, locale: string, now: Date): string | null {
  const key = `${locale}|${zone}`;
  let f = regionFormats.get(key);
  if (f === undefined) {
    try {
      f = new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: "longGeneric" });
    } catch {
      f = null;
    }
    regionFormats.set(key, f);
  }
  const name = f?.formatToParts(now).find((p) => p.type === "timeZoneName")?.value?.trim();
  // Intl's fallback is the offset ("GMT+03:00", "غرينتش+3"): the label has it already.
  if (!name || /\d/.test(name) || name === zone) return null;
  return name;
}

/** One zone as the picker shows it, in `locale` (an Intl locale, e.g. "ar-EG-u-nu-latn"). */
export function zoneOption(zone: string, locale = "en-US", now: Date = new Date()): ZoneOption {
  const offset = zoneOffsetMinutes(zone, now);
  const city = zoneCity(zone);
  const region = zone === "UTC" ? null : regionOf(zone, locale, now);
  const label = [utcOffsetText(offset), city, region && region !== city ? region : null].filter(Boolean).join(" · ");
  return { value: zone, label, offset, city, region, served: SERVED.has(zone) };
}

/**
 * Every zone as the picker shows it. `current` (the saved value) is always
 * in the list, first among the others when the list doesn't have it, so a
 * form never sends a different zone than the one saved.
 */
export function zoneOptions(locale = "en-US", current?: string | null, now: Date = new Date()): ZoneOption[] {
  const zones = allTimeZones(now);
  const options = zones.map((z) => zoneOption(z, locale, now));
  if (current && !zones.includes(current)) options.splice(SERVED_ZONES.length, 0, { ...zoneOption(current, locale, now), served: false });
  return options;
}

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_/·]/g, " ")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en")
    .trim();
}

/** Whether the option matches what's typed: the city, the zone's name, the region or the offset ("+3", "03:00", "utc+3"). */
export function matchesZone(option: ZoneOption, query: string): boolean {
  const q = fold(query);
  if (!q) return true;
  const offset = /^(?:utc|gmt)?\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/.exec(q.replace(/\u2212/g, "-"));
  if (offset) {
    const minutes = (Number(offset[2]) * 60 + Number(offset[3] ?? 0)) * (offset[1] === "-" ? -1 : 1);
    return option.offset === minutes;
  }
  return fold(`${option.value} ${option.city} ${option.region ?? ""} ${option.label}`).includes(q);
}
