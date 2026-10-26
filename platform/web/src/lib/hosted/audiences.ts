import { appAreas } from "../app/areas";
import type { DataStore } from "../data/store";
import type { App, HostedDevice } from "../data/types";

/**
 * 85.1 Who a campaign goes to: everyone, or the people the app knows
 * something about (who bought, a course's students, active members, people
 * who haven't opened the app for a while), narrowed by the language the app
 * shows on their phone, the phone's platform and the country it signs in
 * from. A person matches a narrowing when one of their phones does; a phone
 * that never said (an app from before 85.1) matches none. Hosted apps only:
 * WordPress apps' people are on the website (85.4).
 */

export const AUDIENCE_KINDS = ["everyone", "buyers", "students", "members", "inactive"] as const;
export type AudienceKind = (typeof AUDIENCE_KINDS)[number];

/** How long without opening the app makes someone "inactive". */
export const INACTIVE_DAYS = [7, 14, 30, 60, 90] as const;
export const AUDIENCE_PLATFORMS = ["android", "ios"] as const;
export type AudiencePlatform = (typeof AUDIENCE_PLATFORMS)[number];

export const AUDIENCE_LIMITS = { languages: 10, countries: 30 } as const;

export interface Audience {
  who: AudienceKind;
  /** "students": one course's, or every course's when null. */
  courseId: number | null;
  /** "inactive": no phone opened the app for this many days. */
  inactiveDays: number | null;
  /** The language the app shows on the phone; none means any. */
  languages: string[];
  platforms: AudiencePlatform[];
  /** ISO 3166 alpha-2; none means any. */
  countries: string[];
}

export const EVERYONE: Audience = { who: "everyone", courseId: null, inactiveDays: null, languages: [], platforms: [], countries: [] };

/** Everyone, not narrowed: sent as one notification to the whole app. */
export function isEveryone(audience: Audience): boolean {
  return audience.who === "everyone" && audience.languages.length === 0 && audience.platforms.length === 0 && audience.countries.length === 0;
}

/** The kinds this app has: buyers with orders, students with courses, members at a gym. */
export function audienceKinds(app: Pick<App, "connector" | "backend" | "vertical" | "catalogSettings">): AudienceKind[] {
  const areas = appAreas(app);
  return AUDIENCE_KINDS.filter((kind) => {
    if (kind === "buyers") return areas.orders;
    if (kind === "students") return areas.courses;
    if (kind === "members") return areas.memberCheckIn;
    return true;
  });
}

export type AudienceError = "who" | "course" | "inactive_days" | "languages" | "platforms" | "countries";

const LANGUAGE = /^[a-z]{2,3}$/;
const COUNTRY = /^[A-Z]{2}$/;

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
}

/** An audience as sent by the dashboard or saved, checked against what the app has. */
export function parseAudience(input: unknown, app: App): { ok: true; audience: Audience } | { ok: false; error: AudienceError } {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const who = raw.who ?? "everyone";
  if (typeof who !== "string" || !(audienceKinds(app) as string[]).includes(who)) return { ok: false, error: "who" };
  let courseId: number | null = null;
  if (who === "students" && raw.courseId !== undefined && raw.courseId !== null && raw.courseId !== "") {
    const id = Number(raw.courseId);
    if (!Number.isSafeInteger(id) || !app.courseSetup?.courses.some((c) => c.id === id)) return { ok: false, error: "course" };
    courseId = id;
  }
  let inactiveDays: number | null = null;
  if (who === "inactive") {
    const days = Number(raw.inactiveDays ?? 30);
    if (!(INACTIVE_DAYS as readonly number[]).includes(days)) return { ok: false, error: "inactive_days" };
    inactiveDays = days;
  }
  const languages = [...new Set(list(raw.languages).map((l) => (typeof l === "string" ? l.trim().toLowerCase() : "")))];
  if (languages.length > AUDIENCE_LIMITS.languages || languages.some((l) => !LANGUAGE.test(l))) return { ok: false, error: "languages" };
  const platforms = [...new Set(list(raw.platforms))];
  if (platforms.some((p) => !(AUDIENCE_PLATFORMS as readonly unknown[]).includes(p))) return { ok: false, error: "platforms" };
  const countries = [...new Set(list(raw.countries).map((c) => (typeof c === "string" ? c.trim().toUpperCase() : "")))];
  if (countries.length > AUDIENCE_LIMITS.countries || countries.some((c) => !COUNTRY.test(c))) return { ok: false, error: "countries" };
  return {
    ok: true,
    audience: {
      who: who as AudienceKind,
      courseId,
      inactiveDays,
      languages: languages.sort(),
      // Both platforms is every phone.
      platforms: platforms.length === AUDIENCE_PLATFORMS.length ? [] : (platforms as AudiencePlatform[]),
      countries: countries.sort(),
    },
  };
}

function phoneMatches(device: HostedDevice, audience: Audience): boolean {
  if (audience.languages.length && !(device.language && audience.languages.includes(device.language))) return false;
  if (audience.platforms.length && !audience.platforms.includes(device.platform)) return false;
  if (audience.countries.length && !(device.country && audience.countries.includes(device.country))) return false;
  return true;
}

/**
 * The people an audience is now: `null` for everyone who uses the app (one
 * notification to all, as before 85), else their user IDs.
 */
export async function resolveAudience(store: DataStore, app: App, audience: Audience, now: Date): Promise<number[] | null> {
  if (isEveryone(audience)) return null;
  const base =
    audience.who === "everyone" || audience.who === "inactive"
      ? (await store.listHostedUserIds(app.id)).map((u) => u.id)
      : await store.listAudienceUserIds({ appId: app.id, who: audience.who, courseId: audience.courseId, now });
  const narrowed = audience.languages.length > 0 || audience.platforms.length > 0 || audience.countries.length > 0;
  if (!narrowed && audience.who !== "inactive") return base;
  const phones = new Map<number, HostedDevice[]>();
  for (const device of await store.listAppHostedDevices(app.id)) phones.set(device.userId, [...(phones.get(device.userId) ?? []), device]);
  let ids = base;
  if (audience.who === "inactive") {
    const since = now.getTime() - (audience.inactiveDays ?? 30) * 86_400_000;
    const joined = new Map((await store.listHostedUserIds(app.id)).map((u) => [u.id, u.createdAt.getTime()]));
    ids = ids.filter((id) => {
      const seen = Math.max(joined.get(id) ?? 0, ...(phones.get(id) ?? []).map((d) => d.lastSeenAt.getTime()));
      return seen < since;
    });
  }
  if (narrowed) ids = ids.filter((id) => (phones.get(id) ?? []).some((d) => phoneMatches(d, audience)));
  return ids;
}

/** How many people an audience is now (the dashboard shows it as the owner chooses). */
export async function countAudience(store: DataStore, app: App, audience: Audience, now: Date): Promise<number> {
  const ids = await resolveAudience(store, app, audience, now);
  return ids === null ? store.countHostedUsers(app.id) : ids.length;
}

/** The languages and countries the app's phones have said, most used first: what the dashboard offers. */
export async function audienceChoices(store: DataStore, app: App): Promise<{ languages: string[]; countries: string[] }> {
  const languages = new Map<string, number>();
  const countries = new Map<string, number>();
  for (const device of await store.listAppHostedDevices(app.id)) {
    if (device.language) languages.set(device.language, (languages.get(device.language) ?? 0) + 1);
    if (device.country) countries.set(device.country, (countries.get(device.country) ?? 0) + 1);
  }
  const ranked = (counts: Map<string, number>) => [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([key]) => key);
  return { languages: ranked(languages), countries: ranked(countries) };
}
