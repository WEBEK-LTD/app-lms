import type { Client, License, LicenseState } from "../data/types";

export type AccountState = "pending" | "active" | "expired" | "suspended";

/** What the admin list and the dashboard show for a client. */
export function accountState(client: Pick<Client, "status">, license: Pick<License, "expiresAt"> | null, now: Date): AccountState {
  if (client.status === "pending") return "pending";
  if (client.status === "suspended") return "suspended";
  if (!license || license.expiresAt.getTime() <= now.getTime()) return "expired";
  return "active";
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
