import type { Announcement, AnnouncementAudience, AnnouncementKind, AnnouncementSeverity, App, License } from "./data/types";
import { APP_TYPES, ENGINES } from "./app/kinds";
import { safeHref } from "./content/markdown";
import type { DataStore } from "./data/store";
import { clientAccountState, type AccountState } from "./license/status";
import { PLANS, type Plan } from "./plans";

/**
 * Announcements the team shows clients in their dashboard (and can email):
 * who sees one, when, and the admin's form (roadmap 11.8).
 */

/**
 * What decides whether a client is in an announcement's audience: the
 * account's state, and its apps and their licenses. An account with several
 * apps is in a plan or app type audience when any of its apps is.
 */
export interface AudienceSubject {
  state: AccountState;
  license: Pick<License, "plan"> | null;
  app: Pick<App, "appType"> | null;
  /** Every license of the account; `license` is used when left out. */
  licenses?: Pick<License, "plan">[];
  /** Every app of the account; `app` is used when left out. */
  apps?: Pick<App, "appType">[];
}

export function inAudience(audience: AnnouncementAudience, subject: AudienceSubject): boolean {
  const licenses = subject.licenses ?? (subject.license ? [subject.license] : []);
  const apps = subject.apps ?? (subject.app ? [subject.app] : []);
  switch (audience.kind) {
    case "all":
      return true;
    case "plan":
      return licenses.some((l) => audience.plans.includes(l.plan));
    case "app_type":
      return apps.some((a) => audience.appTypes.includes(a.appType));
    case "state":
      return audience.states.includes(subject.state);
  }
}

/** Shown now: started, and not ended. */
export function isLive(announcement: Pick<Announcement, "startsAt" | "endsAt">, now: Date): boolean {
  return announcement.startsAt.getTime() <= now.getTime() && (announcement.endsAt === null || announcement.endsAt.getTime() > now.getTime());
}

/**
 * A client's live announcements, newest first, and the ones still on their
 * banner: 57 shown as a banner too, and not dismissed. Also every one that
 * started for this audience, live or ended (`history`, newest first): the
 * full list behind the dashboard's bell.
 */
export function announcementsFor(
  all: Announcement[],
  subject: AudienceSubject,
  dismissed: string[],
  now: Date,
): { live: Announcement[]; banner: Announcement[]; history: Announcement[] } {
  const history = all
    .filter((a) => a.startsAt.getTime() <= now.getTime() && inAudience(a.audience, subject))
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  const live = history.filter((a) => isLive(a, now));
  return { live, banner: live.filter((a) => a.showAsBanner && !dismissed.includes(a.id)), history };
}

/** 57 The kinds of announcement, as the admin's form and the bell's chips name them. */
export const ANNOUNCEMENT_KINDS: { id: AnnouncementKind; label: string }[] = [
  { id: "update", label: "Update" },
  { id: "announcement", label: "Announcement" },
  { id: "maintenance", label: "Maintenance" },
  { id: "offer", label: "Offer" },
];

export const ANNOUNCEMENT_KIND_LABEL: Record<AnnouncementKind, string> = { update: "Update", announcement: "Announcement", maintenance: "Maintenance", offer: "Offer" };

/** 57 The languages an announcement can be written in; English is always there. */
export type AnnouncementLanguage = "en" | "ar" | "tr";

/**
 * 57 An announcement's title and message in a language ("ar", "tr-TR", …):
 * the Arabic or Turkish ones when the team wrote them, else the English ones.
 * The dashboard passes "en" until it follows the user's language (Phase 56).
 */
export function announcementText(
  announcement: Pick<Announcement, "title" | "body" | "titleAr" | "bodyAr" | "titleTr" | "bodyTr">,
  lang: string,
): { title: string; body: string; lang: AnnouncementLanguage } {
  const code = lang.toLowerCase().split(/[-_]/)[0];
  const pair =
    code === "ar" ? { title: announcement.titleAr, body: announcement.bodyAr } : code === "tr" ? { title: announcement.titleTr, body: announcement.bodyTr } : null;
  // The form keeps a title with its message; both are needed, so a page never mixes two languages.
  if (pair && pair.title?.trim() && pair.body?.trim()) return { title: pair.title, body: pair.body, lang: code as AnnouncementLanguage };
  return { title: announcement.title, body: announcement.body, lang: "en" };
}

const PLAN_IDS: Plan[] = [...PLANS];
const STATES: AccountState[] = ["pending", "active", "expired", "suspended"];

export const AUDIENCE_KINDS: { id: AnnouncementAudience["kind"]; label: string }[] = [
  { id: "all", label: "All clients" },
  { id: "plan", label: "Clients on chosen plans" },
  { id: "app_type", label: "Clients with chosen app types" },
  { id: "state", label: "Clients in chosen states" },
];

export const STATE_LABELS: Record<AccountState, string> = { pending: "Pending activation", active: "Active", expired: "Expired", suspended: "Suspended" };

/** "All clients", "Plans: Pro", … */
export function describeAudience(audience: AnnouncementAudience, planNames: Record<Plan, string>): string {
  switch (audience.kind) {
    case "all":
      return "All clients";
    case "plan":
      return `Plans: ${audience.plans.map((p) => planNames[p]).join(", ")}`;
    case "app_type":
      return `App types: ${audience.appTypes.map((t) => ENGINES[t]?.name ?? t).join(", ")}`;
    case "state":
      return `States: ${audience.states.map((s) => STATE_LABELS[s]).join(", ")}`;
  }
}

export interface AnnouncementInput {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  severity: AnnouncementSeverity;
  kind: AnnouncementKind;
  showAsBanner: boolean;
  titleAr: string | null;
  bodyAr: string | null;
  titleTr: string | null;
  bodyTr: string | null;
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
  /** 57 The kind, "banner" (also a banner) or "bell" (bell only), and the Arabic and Turkish texts. */
  kind: string;
  placement: string;
  titleAr: string;
  bodyAr: string;
  titleTr: string;
  bodyTr: string;
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
    kind: a?.kind ?? "announcement",
    placement: a && !a.showAsBanner ? "bell" : "banner",
    titleAr: a?.titleAr ?? "",
    bodyAr: a?.bodyAr ?? "",
    titleTr: a?.titleTr ?? "",
    bodyTr: a?.bodyTr ?? "",
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
    // 20 Every engine (Real estate was missing).
    appTypes: APP_TYPES.map((id) => ({ id, label: ENGINES[id].name })),
    states: STATES.map((id) => ({ id, label: STATE_LABELS[id] })),
    // 57 The kinds of announcement.
    kinds: ANNOUNCEMENT_KINDS,
  };
}

/** The admin's announcement form, checked; or an error per field. */
export function readAnnouncementForm(
  input: { values: Record<string, string>; plans: string[]; appTypes: string[]; states: string[] },
  now: Date,
): { ok: true; announcement: AnnouncementInput } | { ok: false; errors: Record<string, string> } {
  const v = input.values;
  const errors: Record<string, string> = {};
  const title = readTitle(v.title, "title", errors, true);
  const body = readBody(v.body, "body", errors, true);
  // 57 Arabic and Turkish are optional, but come as a title with its message.
  const translated = (lang: "Ar" | "Tr") => {
    const t = readTitle(v[`title${lang}`], `title${lang}`, errors, false);
    const b = readBody(v[`body${lang}`], `body${lang}`, errors, false);
    if (t && !b && !errors[`body${lang}`]) errors[`body${lang}`] = "Enter the message too, or remove the title.";
    if (b && !t && !errors[`title${lang}`]) errors[`title${lang}`] = "Enter the title too, or remove the message.";
    return { title: t || null, body: b || null };
  };
  const ar = translated("Ar");
  const tr = translated("Tr");
  const kind: AnnouncementKind = ANNOUNCEMENT_KINDS.find((k) => k.id === v.kind)?.id ?? "announcement";
  const showAsBanner = v.placement !== "bell";

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
  return {
    ok: true,
    announcement: { title, body, audience, severity, kind, showAsBanner, titleAr: ar.title, bodyAr: ar.body, titleTr: tr.title, bodyTr: tr.body, linkUrl, linkLabel, startsAt, endsAt },
  };
}

/** A title on one line, at most 120 characters; required in English. */
function readTitle(value: string | undefined, field: string, errors: Record<string, string>, required: boolean): string {
  const title = (value ?? "").replace(/\s+/g, " ").trim();
  if (!title && required) errors[field] = "Enter a title.";
  else if (title.length > 120) errors[field] = "Use at most 120 characters.";
  return title;
}

/** A Markdown message without HTML, at most 5,000 characters; required in English. */
function readBody(value: string | undefined, field: string, errors: Record<string, string>, required: boolean): string {
  const body = (value ?? "").replace(/\r\n?/g, "\n").trim();
  if (!body && required) errors[field] = "Enter the message.";
  else if (body.length > 5_000) errors[field] = "Use at most 5,000 characters.";
  else if (/<\/?[a-z][^>]*>/i.test(body.replace(/`[^`\n]*`/g, ""))) errors[field] = "HTML isn't allowed. Use Markdown for bold text and links.";
  return body;
}

/** The clients (their account email and name) an announcement is for, now. */
export async function audienceRecipients(
  store: Pick<DataStore, "listClients">,
  audience: AnnouncementAudience,
  now: Date,
): Promise<{ clientId: string; email: string; name: string }[]> {
  const recipients: { clientId: string; email: string; name: string }[] = [];
  for (const row of await store.listClients({ filter: "all", now })) {
    const licenses = row.apps.flatMap((entry) => (entry.license ? [entry.license] : []));
    const apps = row.apps.flatMap((entry) => (entry.app ? [entry.app] : []));
    if (inAudience(audience, { state: clientAccountState(row.client, licenses, now), license: null, app: null, licenses, apps })) {
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
