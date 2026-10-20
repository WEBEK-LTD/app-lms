import type { Client, License, LicenseState } from "../data/types";

export type AccountState = "pending" | "active" | "expired" | "suspended";

/** What the admin list shows for a client, from the license that decides it (see clientAccountState). */
export function accountState(client: Pick<Client, "status">, license: Pick<License, "expiresAt"> | null, now: Date): AccountState {
  if (client.status === "pending") return "pending";
  if (client.status === "suspended") return "suspended";
  if (!license || license.expiresAt.getTime() <= now.getTime()) return "expired";
  return "active";
}

/**
 * The state of one app, from its account and its own license: what the
 * dashboard shows for the current app and the admin for each app. An app
 * without a license waits for activation (by the team, or its plan paid by
 * card). Suspension is for the whole account.
 */
export function appState(client: Pick<Client, "status">, license: Pick<License, "expiresAt"> | null, now: Date): AccountState {
  if (!license && client.status !== "suspended") return "pending";
  return accountState(client, license, now);
}

/**
 * 68 Whether an app runs for its users: its account is active and its own
 * plan hasn't ended (the end date is compared with `now`, nothing is stored).
 * Everything that stops when a plan ends asks this one question: the hosted
 * API, notifications to the app's users (now, later, from the dashboard and
 * the Owner API) and the pipeline taking a queued build.
 */
export function appIsActive(license: Pick<License, "expiresAt"> | null, client: Pick<Client, "status"> | null, now: Date): boolean {
  return client !== null && license !== null && appState(client, license, now) === "active";
}

/** The license that lasts longest: the one that decides the account's state. */
export function longestLicense<T extends Pick<License, "expiresAt">>(licenses: readonly T[]): T | null {
  let best: T | null = null;
  for (const license of licenses) if (!best || license.expiresAt.getTime() > best.expiresAt.getTime()) best = license;
  return best;
}

/**
 * The state of a whole account (admin list, filters, announcements): active
 * when at least one of its apps has an active license, expired when all of
 * them ended, pending until the first activation, suspended as a whole.
 */
export function clientAccountState(client: Pick<Client, "status">, licenses: readonly Pick<License, "expiresAt">[], now: Date): AccountState {
  return accountState(client, longestLicense(licenses), now);
}

/** What the license API reports, before site checks. */
export function licenseState(client: Pick<Client, "status">, license: Pick<License, "expiresAt">, now: Date): LicenseState {
  if (client.status === "suspended") return "suspended";
  if (client.status === "pending") return "invalid";
  if (license.expiresAt.getTime() <= now.getTime()) return "expired";
  return "active";
}

/** Whole days from now until `date` (negative when it's in the past). */
export function daysUntil(date: Date, now: Date = new Date()): number {
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}

export const ACCOUNT_STATE_LABEL: Record<AccountState, string> = {
  pending: "Pending activation",
  active: "Active",
  expired: "Expired",
  suspended: "Suspended",
};
