import type { DataStore } from "../data/store";
import type { User } from "../data/types";

/**
 * 60 Who did what on a client's team: order steps, refunds, appointment
 * steps, notifications sent to the app's users, and the team's own changes.
 * Written for everyone (the owner too), from the dashboard and the Owner API
 * alike; the owner reads it on the Team page. One English line each, like the
 * admin's audit log. Never fails what it records.
 */

export const TEAM_ACTIONS = [
  "order.status",
  "order.refund",
  "donation.refund",
  "appointment.status",
  "notification.sent",
  "team.invite",
  "team.resend",
  "team.cancel",
  "team.join",
  "team.update",
  "team.remove",
] as const;
export type TeamAction = (typeof TEAM_ACTIONS)[number];

/** Who did it: the signed-in person (Yallapp's team managing a dashboard records as themselves). */
export type TeamActor = Pick<User, "id" | "name" | "email">;

export interface TeamActivityInput {
  clientId: string;
  appId: string | null;
  actor: TeamActor;
  action: TeamAction;
  target: { type: string; id?: string | number | null };
  summary: string;
}

export async function recordTeamActivity(store: DataStore, input: TeamActivityInput, now: Date): Promise<void> {
  try {
    await store.addTeamActivity({
      clientId: input.clientId,
      appId: input.appId,
      actorId: input.actor.id,
      actorName: input.actor.name.slice(0, 120),
      actorEmail: input.actor.email.slice(0, 191),
      action: input.action,
      targetType: input.target.type.slice(0, 32),
      targetId: input.target.id === null || input.target.id === undefined ? null : String(input.target.id).slice(0, 64),
      summary: input.summary.slice(0, 500),
      at: now,
    });
  } catch (error) {
    console.error("[team] the activity couldn't be saved", input.action, error instanceof Error ? error.message : String(error));
  }
}
