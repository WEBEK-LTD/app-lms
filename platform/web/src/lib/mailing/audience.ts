/**
 * 114 Who a campaign goes to: the accounts (and, when the admin asks, their
 * team members) that match its audience, each with their language and the
 * values of the merge tags. Addresses never to be mailed (unsubscribed,
 * bounced, complained) are left out, also when they belong to another
 * account: an unsubscribe is the address's, everywhere.
 */

import type { ClientRow, DataStore } from "../data/store";
import { accountState } from "../license/status";
import { planName, type Plan, type PlanInfo } from "../plans";
import { firstNameOf, type MergeValues } from "./merge";
import type { MailAudience, MailLang } from "./types";

export interface AudiencePerson {
  email: string;
  name: string;
  userId: string;
  clientId: string;
  lang: MailLang;
  /** A team member, not the account's owner. */
  team: boolean;
  values: MergeValues;
}

export function mailLangOf(language: string | null | undefined): MailLang {
  return language === "ar" || language === "tr" ? language : "en";
}

const DAY = 86_400_000;

/** Whether the account matches every filter of the audience. */
export function accountMatches(row: ClientRow, audience: MailAudience, now: Date): boolean {
  const apps = row.apps.filter((a) => a.app);
  if (audience.states?.length && !audience.states.includes(accountState(row.client, row.license, now))) return false;
  if (audience.plans?.length) {
    const plans = row.apps.map((a) => a.license?.plan).filter(Boolean) as string[];
    if (!plans.some((p) => audience.plans!.includes(p))) return false;
  }
  if (audience.sections?.length && !apps.some((a) => audience.sections!.includes(a.app!.section ?? "regular"))) return false;
  if (audience.appTypes?.length && !apps.some((a) => audience.appTypes!.includes(a.app!.appType))) return false;
  if (audience.langs?.length && !audience.langs.includes(mailLangOf(row.user.language))) return false;
  if (audience.countries?.length && !audience.countries.includes((row.client.country ?? "").toUpperCase())) return false;
  const signedUp = row.client.createdAt.getTime();
  if (audience.signedUpFrom && signedUp < Date.parse(`${audience.signedUpFrom}T00:00:00Z`)) return false;
  if (audience.signedUpTo && signedUp >= Date.parse(`${audience.signedUpTo}T00:00:00Z`) + DAY) return false;
  if (audience.published) {
    const built = apps.some((a) => a.latestBuild?.status === "ready");
    if ((audience.published === "yes") !== built) return false;
  }
  const lastActive = row.user.lastSignInAt?.getTime() ?? null;
  if (audience.activeWithinDays && (lastActive === null || lastActive < now.getTime() - audience.activeWithinDays * DAY)) return false;
  if (audience.inactiveForDays && lastActive !== null && lastActive >= now.getTime() - audience.inactiveForDays * DAY) return false;
  return true;
}

function formatDay(date: Date, lang: MailLang): string {
  const locale = lang === "ar" ? "ar-EG" : lang === "tr" ? "tr-TR" : "en-GB";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Cairo" }).format(date);
}

/** The merge tags' values for an account (a team member gets the account's business and plan, with their own name). */
export function accountValues(row: ClientRow, person: { name: string; email: string }, lang: MailLang, signInUrl: string, plans?: Record<Plan, PlanInfo>): MergeValues {
  const app = row.apps.find((a) => a.app)?.app ?? null;
  const license = row.license;
  return {
    first_name: firstNameOf(person.name),
    name: person.name.includes("@") ? "" : person.name,
    email: person.email,
    business_name: app?.storeTitle || app?.appName || "",
    app_name: app?.appName || app?.storeTitle || "",
    plan: license ? planName(license.plan, plans) : "",
    expiry_date: license ? formatDay(license.expiresAt, lang) : "",
    sign_in_link: signInUrl,
  };
}

export interface ResolveOptions {
  now: Date;
  /** Yallapp's address, for the sign-in link. */
  baseUrl: string;
  plans?: Record<Plan, PlanInfo>;
  /** Leave out addresses that are never to be mailed (true when sending; the count shows both). */
  dropSuppressed?: boolean;
}

export interface ResolvedAudience {
  people: AudiencePerson[];
  /** Matching addresses left out because they unsubscribed, bounced or complained. */
  suppressed: number;
}

export async function resolveAudience(store: DataStore, audience: MailAudience, options: ResolveOptions): Promise<ResolvedAudience> {
  const signIn = `${options.baseUrl.replace(/\/+$/, "")}/sign-in`;
  const rows = await store.listClients({ filter: "all", now: options.now });
  const only = audience.emails?.length ? new Set(audience.emails.map((e) => e.trim().toLowerCase())) : null;
  const byEmail = new Map<string, AudiencePerson>();
  for (const row of rows) {
    if (!accountMatches(row, audience, options.now)) continue;
    const add = (person: { id: string; email: string; name: string; language?: string | null }, team: boolean) => {
      const email = person.email.trim().toLowerCase();
      if (!email.includes("@") || byEmail.has(email) || (only && !only.has(email))) return;
      const lang = mailLangOf(person.language);
      byEmail.set(email, { email, name: person.name, userId: person.id, clientId: row.client.id, lang, team, values: accountValues(row, person, lang, signIn, options.plans) });
    };
    add(row.user, false);
    if (audience.includeTeam) {
      for (const member of await store.listTeamMembers(row.client.id)) add(member.user, true);
    }
  }
  const people = [...byEmail.values()];
  const suppressed = new Set(await store.listMailSuppressed(people.map((p) => p.email)));
  return {
    people: options.dropSuppressed === false ? people : people.filter((p) => !suppressed.has(p.email)),
    suppressed: people.filter((p) => suppressed.has(p.email)).length,
  };
}

/** Cleans an audience read from the admin's request. */
export function cleanAudience(input: unknown): MailAudience {
  const a = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const list = (value: unknown, allowed?: readonly string[], max = 50) =>
    Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === "string" && v.length <= 64 && (!allowed || allowed.includes(v))))].slice(0, max) : [];
  const day = (value: unknown) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : null);
  const days = (value: unknown) => (typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 3650 ? value : null);
  const out: MailAudience = {
    states: list(a.states, ["active", "pending", "expired", "suspended"]) as MailAudience["states"],
    plans: list(a.plans),
    sections: list(a.sections, ["regular", "studio"]) as MailAudience["sections"],
    appTypes: list(a.appTypes),
    langs: list(a.langs, ["en", "ar", "tr"]) as MailAudience["langs"],
    countries: list(a.countries, undefined, 250).map((c) => c.toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)),
    signedUpFrom: day(a.signedUpFrom),
    signedUpTo: day(a.signedUpTo),
    published: a.published === "yes" || a.published === "no" ? a.published : null,
    activeWithinDays: days(a.activeWithinDays),
    inactiveForDays: days(a.inactiveForDays),
    includeTeam: a.includeTeam === true,
  };
  const emails = Array.isArray(a.emails) ? a.emails.filter((e): e is string => typeof e === "string").map((e) => e.trim().toLowerCase()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 191) : [];
  if (emails.length) out.emails = [...new Set(emails)].slice(0, 500);
  return out;
}

/** "Everyone" when no filter is set. */
export function audienceIsEveryone(audience: MailAudience): boolean {
  const { includeTeam: _team, ...rest } = audience;
  void _team;
  return Object.values(rest).every((v) => v === null || v === undefined || (Array.isArray(v) && v.length === 0));
}
