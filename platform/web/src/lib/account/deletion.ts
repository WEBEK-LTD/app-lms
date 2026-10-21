import { newId } from "../crypto/tokens";
import { appLabel } from "../app/label";
import { verifyPassword } from "../auth/password";
import type { DataStore } from "../data/store";
import type { AccountDeletionRequest, App, Client, License, User } from "../data/types";
import { hitRateLimit, RATE_LIMITS } from "../rate-limit";
import type { Lang } from "@/i18n/config";

/**
 * 66 Deleting a Yallapp account. The account's owner asks from Dashboard ›
 * Your account (or the waiting page) with their password and their email
 * typed again; the request is saved, their phones are signed out of Yallapp
 * Business, our team is emailed and the owner gets a confirmation. 73 The
 * platform deletes the account `DELETION_WAIT_DAYS` after the request (the
 * daily job, lib/account/purge.ts), keeping the billing records, unless the
 * owner cancels first; our team can do it at once ("Delete now" in Admin ›
 * Account deletion). The owner is emailed when it's done
 * (docs/ARCHITECTURE.md, "Deleting a Yallapp account"). Messages are English
 * sentences, translated in the dashboard by the `account` catalog's `known`
 * texts.
 */

/** We delete an account within this many days of the request (the public page and the emails say so). */
export const DELETION_DAYS = 30;
/** 73 The days the owner has to change their mind: the daily job deletes the account after them. */
export const DELETION_WAIT_DAYS = 7;
export const REASON_MAX = 1000;

export type DeletionMailKey = "account_deletion_request" | "account_deletion_received" | "account_deletion_done";

export interface DeletionDeps {
  store: DataStore;
  now: Date;
  /** Sends one of the deletion emails (the team's in English). */
  mail: (key: DeletionMailKey, to: string, values: Record<string, string>, lang: Lang) => Promise<void>;
  /** Where our team hears of requests (Settings › contact email). */
  teamEmail: string;
  /** The site's address, for the admin link in the team's email. */
  baseUrl: string;
}

/** Who is asking: the dashboard's context (lib/auth/session.ts ClientContext). */
export interface DeletionAsker {
  /** The account's owner. */
  user: User;
  /** Our team member managing the dashboard, if it's them. */
  staff: Pick<User, "id" | "email"> | null;
  /** The team member signed in, if it isn't the owner. */
  member: Pick<User, "id" | "email"> | null;
  client: Client;
  apps: App[];
  licenses: License[];
}

export const MESSAGES = {
  member: "Only the owner of this business can delete its Yallapp account. Ask them to remove you from the team, which signs you out of it everywhere.",
  staff: "Only the account's owner can ask to delete it, signed in with their own password. Yallapp's team deletes accounts from Admin › Account deletion.",
  password: "Enter your password.",
  wrongPassword: "The password is incorrect.",
  confirm: "Type your account's email address to confirm.",
  reason: "Keep it under 1,000 characters.",
  tooMany: "Too many attempts. Please wait a few minutes and try again.",
  noRequest: "There is no request to delete this account.",
  cancelled: "Your request was cancelled. Your account stays as it is.",
} as const;

/** Why this person can't ask to delete the account; null when they can (the owner, signed in themselves). */
export function deletionRefusal(asker: Pick<DeletionAsker, "staff" | "member">): string | null {
  if (asker.staff) return MESSAGES.staff;
  if (asker.member) return MESSAGES.member;
  return null;
}

/** The apps whose plan is still running (a paid plan that hasn't ended), oldest app first. */
export function runningPlans(asker: Pick<DeletionAsker, "apps" | "licenses">, now: Date): { app: App; license: License }[] {
  return asker.apps.flatMap((app) => {
    const license = asker.licenses.find((l) => l.appId === app.id);
    return license && license.expiresAt.getTime() > now.getTime() ? [{ app, license }] : [];
  });
}

export type DeletionResult =
  | { ok: true; request: AccountDeletionRequest; created: boolean; phonesSignedOut: number }
  | { ok: false; errors?: Record<string, string>; message?: string };

const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The owner asks to delete their account. Refused for a team member and for
 * our team managing the dashboard; checks the typed email and the password
 * (counted with the sign-in attempts for the address). A second request while
 * one is open returns that one (no new emails).
 */
export async function requestAccountDeletion(
  deps: DeletionDeps,
  asker: DeletionAsker,
  input: { password: string; confirmEmail: string; reason: string; lang: Lang },
): Promise<DeletionResult> {
  const refusal = deletionRefusal(asker);
  if (refusal) return { ok: false, message: refusal };
  const { store, now } = deps;
  const open = await store.getOpenAccountDeletionRequest(asker.client.id);
  if (open) return { ok: true, request: open, created: false, phonesSignedOut: 0 };

  const reason = input.reason.trim();
  const errors: Record<string, string> = {};
  if (!sameEmail(input.confirmEmail, asker.user.email)) errors.confirmEmail = MESSAGES.confirm;
  if (!input.password) errors.password = MESSAGES.password;
  if (reason.length > REASON_MAX) errors.reason = MESSAGES.reason;
  if (Object.keys(errors).length) return { ok: false, errors };

  // The same counter as signing in with this address: the form can't be used to guess the password.
  const limited = await hitRateLimit(store, RATE_LIMITS.signInEmail, asker.user.email.toLowerCase(), now);
  if (!limited.allowed) return { ok: false, message: MESSAGES.tooMany };
  const fresh = (await store.getUserById(asker.user.id)) ?? asker.user;
  if (!(await verifyPassword(fresh.passwordHash, input.password))) return { ok: false, errors: { password: MESSAGES.wrongPassword } };

  const request: AccountDeletionRequest = {
    id: newId(),
    clientId: asker.client.id,
    userId: fresh.id,
    email: fresh.email,
    name: fresh.name,
    lang: input.lang,
    reason: reason || null,
    status: "pending",
    requestedAt: now,
    closedAt: null,
    closedBy: null,
    teamNote: null,
  };
  if (!(await store.createAccountDeletionRequest(request))) {
    // Another request was saved at the same moment: that one stands.
    const other = await store.getOpenAccountDeletionRequest(asker.client.id);
    if (other) return { ok: true, request: other, created: false, phonesSignedOut: 0 };
    throw new Error("The deletion request wasn't saved");
  }
  // Yallapp Business stops at once on every phone signed in with this account.
  const phonesSignedOut = await store.deleteOwnerDevices(fresh.id);
  await tellTeam(deps, asker, request, "asked us to delete their Yallapp account");
  await send(deps, "account_deletion_received", request.email, { name: request.name, days: String(DELETION_DAYS), dashboard_url: `${deps.baseUrl}/dashboard/account` }, input.lang);
  return { ok: true, request, created: true, phonesSignedOut };
}

/** The owner cancels their open request. */
export async function cancelAccountDeletion(deps: DeletionDeps, asker: DeletionAsker): Promise<{ ok: true } | { ok: false; message: string }> {
  const refusal = deletionRefusal(asker);
  if (refusal) return { ok: false, message: refusal };
  const open = await deps.store.getOpenAccountDeletionRequest(asker.client.id);
  if (!open || !(await deps.store.closeAccountDeletionRequest(open.id, { status: "cancelled", closedAt: deps.now, closedBy: asker.user.email, teamNote: null }))) {
    return { ok: false, message: MESSAGES.noRequest };
  }
  await tellTeam(deps, asker, open, "cancelled their request to delete their Yallapp account");
  return { ok: true };
}

/**
 * Our team closes a request in the admin: `done` once the account was
 * deleted (the person who asked is emailed in their language), or
 * `cancelled`. False when it isn't open any more.
 */
export async function closeAccountDeletion(
  deps: Pick<DeletionDeps, "store" | "now" | "mail">,
  input: { id: string; status: "done" | "cancelled"; by: string; note: string },
): Promise<{ ok: true; request: AccountDeletionRequest } | { ok: false; message: string }> {
  const request = await deps.store.getAccountDeletionRequest(input.id);
  const note = input.note.trim().slice(0, REASON_MAX) || null;
  if (!request || !(await deps.store.closeAccountDeletionRequest(request.id, { status: input.status, closedAt: deps.now, closedBy: input.by, teamNote: note }))) {
    return { ok: false, message: "This request isn't open any more." };
  }
  if (input.status === "done") await send(deps, "account_deletion_done", request.email, { name: request.name }, langOf(request.lang));
  return { ok: true, request: { ...request, status: input.status, closedAt: deps.now, closedBy: input.by, teamNote: note } };
}

function langOf(value: string): Lang {
  return value === "ar" || value === "tr" ? value : "en";
}

async function tellTeam(deps: DeletionDeps, asker: DeletionAsker, request: AccountDeletionRequest, event: string): Promise<void> {
  const plans = runningPlans(asker, deps.now);
  await send(
    deps,
    "account_deletion_request",
    deps.teamEmail,
    {
      client_name: request.name,
      event,
      email: request.email,
      whatsapp: asker.client.whatsapp,
      apps: asker.apps.length ? asker.apps.map((app) => appLabel(app)).join(", ") : "None yet",
      plans_line: plans.length ? `Plans still running: ${plans.map(({ app, license }) => `${appLabel(app)} (${license.plan}, until ${license.expiresAt.toISOString().slice(0, 10)})`).join(", ")}\n` : "",
      reason_line: request.reason ? `Reason: ${request.reason}\n` : "",
      admin_url: `${deps.baseUrl}/admin/account-deletion`,
    },
    "en",
  );
}

/** Emails are best effort: the request stands, and the admin lists it either way. */
async function send(deps: Pick<DeletionDeps, "mail">, key: DeletionMailKey, to: string, values: Record<string, string>, lang: Lang): Promise<void> {
  try {
    await deps.mail(key, to, values, lang);
  } catch (error) {
    console.error(`[account-deletion] the ${key} email wasn't sent:`, error instanceof Error ? error.message : error);
  }
}
