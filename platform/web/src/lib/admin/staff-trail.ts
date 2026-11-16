import "server-only";
import { headers } from "next/headers";
import { after } from "next/server";
import type { User } from "../data/types";
import { appLabel } from "../app/label";
import type { TeamPermission } from "../team/permissions";
import { recordAudit } from "./audit";

/**
 * 132.110 Every action our team takes in a client's account is in the audit
 * log with the team member's name. Most actions log their own change
 * (recordStaffChange, with what changed); for the others, the request's
 * entry says where it was taken and what it may do, once the action is done.
 * The requests are told apart by their headers object (one per request).
 */

const logged = new WeakMap<object, true>();

/** What the action may do, as the audit log says it (the admin is in English). */
const AREA: Record<TeamPermission, string> = {
  dashboard: "the dashboard",
  settings: "the app's settings",
  billing: "plans and payments",
  team: "the team",
  apps: "the account's apps",
  orders: "orders",
  bookings: "bookings",
  events: "events",
  donations: "donations",
  catalog: "the catalog",
  media: "media",
  messages: "messages",
  chat: "the chat",
  app_users: "app users",
  analytics: "analytics",
  notifications: "notifications",
  salaries: "salaries",
};

async function requestKey(): Promise<object | null> {
  try {
    return await headers();
  } catch {
    // Outside a request (tests, jobs): nothing to tell apart.
    return null;
  }
}

/** recordStaffChange logged this request's change: no general entry for it. */
export async function markStaffChangeLogged(): Promise<void> {
  const key = await requestKey();
  if (key) logged.set(key, true);
}

interface StaffContext {
  staff: Pick<User, "id" | "email" | "name"> | null;
  user: Pick<User, "name">;
  client: { id: string };
  app: { id: string; appName?: string | null } | null;
}

/** Schedules the general entry of this action, written after it unless the action logged its own. */
export function recordStaffAction(context: StaffContext, permission: TeamPermission): void {
  const staff = context.staff;
  if (!staff) return;
  try {
    after(async () => {
      const key = await requestKey();
      if (key && logged.has(key)) return;
      const page = key && "get" in key ? ((key as Headers).get("x-yallapp-path") ?? "").split("?")[0]!.slice(0, 120) : "";
      await recordAudit({
        actor: staff,
        action: "client.staff_action",
        target: context.app ? { type: "app", id: context.app.id } : { type: "client", id: context.client.id },
        clientId: context.client.id,
        summary: `Worked in ${context.user.name}'s account: ${AREA[permission] ?? permission}${page ? ` on ${page}` : ""}${context.app ? ` (${appLabel(context.app)})` : ""}`,
      });
    });
  } catch {
    // Outside a request: nothing to schedule.
  }
}
