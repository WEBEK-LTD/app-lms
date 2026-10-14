import type { Announcement, AnnouncementAudience, AnnouncementSeverity, App, AppType, License } from "./data/types";
import { safeHref } from "./content/markdown";
import type { DataStore } from "./data/store";
import { accountState, type AccountState } from "./license/status";
import type { Plan } from "./plans";

/**
 * Announcements the team shows clients in their dashboard (and can email):
 * who sees one, when, and the admin's form (roadmap 11.8).
 */

/** What decides whether a client is in an announcement's audience. */
export interface AudienceSubject {
  state: AccountState;
  license: Pick<License, "plan"> | null;
  app: Pick<App, "appType"> | null;
}

export function inAudience(audience: AnnouncementAudience, subject: AudienceSubject): boolean {
  switch (audience.kind) {
    case "all":
      return true;
    case "plan":
      return subject.license !== null && audience.plans.includes(subject.license.plan);
    case "app_type":
      return subject.app !== null && audience.appTypes.includes(subject.app.appType);
    case "state":
      return audience.states.includes(subject.state);
  }
}

/** Shown now: started, and not ended. */
export function isLive(announcement: Pick<Announcement, "startsAt" | "endsAt">, now: Date): boolean {
  return announcement.startsAt.getTime() <= now.getTime() && (announcement.endsAt === null || announcement.endsAt.getTime() > now.getTime());
}

/** A client's live announcements, newest first, and the ones still on their banner (not dismissed). */
export function announcementsFor(
  all: Announcement[],
  subject: AudienceSubject,
  dismissed: string[],
  now: Date,
): { live: Announcement[]; banner: Announcement[] } {
  const live = all.filter((a) => isLive(a, now) && inAudience(a.audience, subject)).sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  return { live, banner: live.filter((a) => !dismissed.includes(a.id)) };
}

const PLAN_IDS: Plan[] = ["starter", "pro"];
const APP_TYPES: AppType[] = ["lms", "store", "booking"];
const STATES: AccountState[] = ["pending", "active", "expired", "suspended"];

export const AUDIENCE_KINDS: { id: AnnouncementAudience["kind"]; label: string }[] = [
  { id: "all", label: "All clients" },
  { id: "plan", label: "Clients on chosen plans" },
  { id: "app_type", label: "Clients with chosen app types" },
  { id: "state", label: "Clients in chosen states" },
];

export const APP_TYPE_LABELS: Record<AppType, string> = { lms: "Academy", store: "Store", booking: "Bookings", real_estate: "Real estate" };
export const STATE_LABELS: Record<AccountState, string> = { pending: "Pending activation", active: "Active", expired: "Expired", suspended: "Suspended" };

/** "All clients", "Plans: Pro", … */
export function describeAudience(audience: AnnouncementAudience, planNames: Record<Plan, string>): string {
  switch (audience.kind) {
    case "all":
      return "All clients";
    case "plan":
      return `Plans: ${audience.plans.map((p) => planNames[p]).join(", ")}`;
    case "app_type":
      return `App types: ${audience.appTypes.map((t) => APP_TYPE_LABELS[t]).join(", ")}`;
    case "state":
      return `States: ${audience.states.map((s) => STATE_LABELS[s]).join(", ")}`;
  }
}

export interface AnnouncementInput {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  severity: AnnouncementSeverity;
  linkUrl: string | null;
  linkLabel: string | null;
  startsAt: Date;
  endsAt: Date | null;
}

/** "2026-10-13T09:30" from a datetime-local field, read as UTC (the admin shows times in UTC). */
function readDateTime(text: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return null;
  const date = new Date(`${text}:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The value of a datetime-local field for a date, in UTC. */
export function dateTimeValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 16) : "";
}

/** The admin's announcement form: text values, checkbox groups as comma-separated values. */
export interface AnnouncementFormValues {
  title: string;
  body: string;
  audience: string;
  plans: string;
  appTypes: string;
  states: string;
  severity: string;
  linkUrl: string;
  linkLabel: string;
  startsAt: string;
  endsAt: string;
}

/** An announcement as the form shows it; a new one goes to every client, from now. */
export function announcementFormValues(a: Announcement | null): AnnouncementFormValues {
  const audience = a?.audience ?? { kind: "all" };
  return {
    title: a?.title ?? "",
    body: a?.body ?? "",
    audience: audience.kind,
    plans: audience.kind === "plan" ? audience.plans.join(",") : "",
    appTypes: audience.kind === "app_type" ? audience.appTypes.join(",") : "",
    states: audience.kind === "state" ? audience.states.join(",") : "",
    severity: a?.severity ?? "info",
    linkUrl: a?.linkUrl ?? "",
    linkLabel: a?.linkLabel ?? "",
    startsAt: dateTimeValue(a?.startsAt ?? null),
    endsAt: dateTimeValue(a?.endsAt ?? null),
  };
}

/** The choices of the form's audience section. */
export function audienceOptions(planNames: Record<Plan, string>) {
  return {
    audienceKinds: AUDIENCE_KINDS,
    plans: PLAN_IDS.map((id) => ({ id, label: planNames[id] })),
    appTypes: APP_TYPES.map((id) => ({ id, label: APP_TYPE_LABELS[id] })),
    states: STATES.map((id) => ({ id, label: STATE_LABELS[id] })),
  };
}

/** The admin's announcement form, checked; or an error per field. */
export function readAnnouncementForm(
  input: { values: Record<string, string>; plans: string[]; appTypes: string[]; states: string[] },
  now: Date,
): { ok: true; announcement: AnnouncementInput } | { ok: false; errors: Record<string, string> } {
  const v = input.values;
  const errors: Record<string, string> = {};
  const title = (v.title ?? "").replace(/\s+/g, " ").trim();
  if (!title) errors.title = "Enter a title.";
  else if (title.length > 120) errors.title = "Use at most 120 characters.";
  const body = (v.body ?? "").replace(/\r\n?/g, "\n").trim();
  if (!body) errors.body = "Enter the message.";
  else if (body.length > 5_000) errors.body = "Use at most 5,000 characters.";
  else if (/<\/?[a-z][^>]*>/i.test(body.replace(/`[^`\n]*`/g, ""))) errors.body = "HTML isn't allowed. Use Markdown for bold text and links.";

  let audience: AnnouncementAudience | null = null;
  switch (v.audience) {
    case "all":
      audience = { kind: "all" };
      break;
    case "plan": {
      const plans = PLAN_IDS.filter((p) => input.plans.includes(p));
      if (!plans.length) errors.audience = "Choose at least one plan.";
      audience = { kind: "plan", plans };
      break;
    }
    case "app_type": {
      const appTypes = APP_TYPES.filter((t) => input.appTypes.includes(t));
      if (!appTypes.length) errors.audience = "Choose at least one app type.";
      audience = { kind: "app_type", appTypes };
      break;
    }
    case "state": {
      const states = STATES.filter((s) => input.states.includes(s));
      if (!states.length) errors.audience = "Choose at least one state.";
      audience = { kind: "state", states };
      break;
    }
    default:
      errors.audience = "Choose who sees it.";
  }

  const severity: AnnouncementSeverity = v.severity === "warning" ? "warning" : "info";
  const linkUrl = (v.linkUrl ?? "").trim() || null;
  const linkLabel = (v.linkLabel ?? "").replace(/\s+/g, " ").trim() || null;
  if (linkUrl && (linkUrl.length > 500 || !safeHref(linkUrl) || linkUrl.startsWith("#"))) {
    errors.linkUrl = "Use an https:// address, or a path on yallapp.com.tr like /pricing.";
  }
  if (linkLabel && linkLabel.length > 60) errors.linkLabel = "Use at most 60 characters.";
  if (linkLabel && !linkUrl) errors.linkUrl = "Enter the link's address, or remove its text.";

  const startsAt = (v.startsAt ?? "").trim() ? readDateTime(v.startsAt!.trim()) : now;
  if (!startsAt) errors.startsAt = "Choose a date and time.";
  const endsAt = (v.endsAt ?? "").trim() ? readDateTime(v.endsAt!.trim()) : null;
  if ((v.endsAt ?? "").trim() && !endsAt) errors.endsAt = "Choose a date and time.";
  else if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) errors.endsAt = "Choose a time after the start.";

  if (Object.keys(errors).length || !audience || !startsAt) return { ok: false, errors };
  return { ok: true, announcement: { title, body, audience, severity, linkUrl, linkLabel, startsAt, endsAt } };
}

/** The clients (their account email and name) an announcement is for, now. */
export async function audienceRecipients(
  store: Pick<DataStore, "listClients" | "getAppByClientId">,
  audience: AnnouncementAudience,
  now: Date,
): Promise<{ clientId: string; email: string; name: string }[]> {
  const recipients: { clientId: string; email: string; name: string }[] = [];
  for (const row of await store.listClients({ filter: "all", now })) {
    const app = audience.kind === "app_type" ? await store.getAppByClientId(row.client.id) : null;
    if (inAudience(audience, { state: accountState(row.client, row.license, now), license: row.license, app })) {
      recipients.push({ clientId: row.client.id, email: row.user.email, name: row.user.name });
    }
  }
  return recipients;
}

/** Clients emailed at once; the next batch starts when one is sent. */
export const EMAIL_BATCH_SIZE = 20;

/** Sends to every recipient in batches; returns how many emails went out. */
export async function sendInBatches<T>(recipients: T[], send: (recipient: T) => Promise<void>, batchSize = EMAIL_BATCH_SIZE): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const results = await Promise.allSettled(recipients.slice(i, i + batchSize).map(send));
    for (const r of results) {
      if (r.status === "fulfilled") sent += 1;
      else failed += 1;
    }
  }
  return { sent, failed };
}
