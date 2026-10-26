import type { DataStore } from "../data/store";
import { orderNumber } from "../catalog/settings";
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
  "question.answer",
  "review.reply",
  "review.hide",
  "review.show",
  "question.hide",
  "question.show",
  "answer.hide",
  "answer.show",
  "membership.freeze",
  "membership.unfreeze",
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

// The moments recorded, worded the same from the dashboard and the Owner API

const ORDER_STEP_WORDS: Record<string, string> = {
  received: "Received",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  // 80.4 Marked shipped, or its tracking changed.
  shipped: "Shipped",
  // 91.3 The answer to a return the customer asked for.
  return_approved: "Return approved",
  return_declined: "Return declined",
};

/** An order moved to `to` (its status, or a restaurant's kitchen step). */
export function recordOrderStatus(store: DataStore, input: { clientId: string; appId: string; actor: TeamActor; orderId: number; to: string }, now: Date): Promise<void> {
  return recordTeamActivity(
    store,
    { clientId: input.clientId, appId: input.appId, actor: input.actor, action: "order.status", target: { type: "order", id: input.orderId }, summary: `Order ${orderNumber({ id: input.orderId })}: ${ORDER_STEP_WORDS[input.to] ?? input.to}` },
    now,
  );
}

/** A refund of an order or a donation, with its amount as written ("₺120.00"). */
export function recordRefund(store: DataStore, input: { clientId: string; appId: string; actor: TeamActor; kind: "order" | "donation"; id: number; amount: string }, now: Date): Promise<void> {
  const what = input.kind === "order" ? `order ${orderNumber({ id: input.id })}` : `donation ${input.id}`;
  return recordTeamActivity(
    store,
    { clientId: input.clientId, appId: input.appId, actor: input.actor, action: input.kind === "order" ? "order.refund" : "donation.refund", target: { type: input.kind, id: input.id }, summary: `Refund of ${input.amount} for ${what}` },
    now,
  );
}

export function recordAppointmentStatus(store: DataStore, input: { clientId: string; appId: string; actor: TeamActor; appointmentId: number; to: string }, now: Date): Promise<void> {
  const words: Record<string, string> = { approved: "Confirmed", rejected: "Declined", cancelled: "Cancelled", completed: "Done", no_show: "No-show" };
  return recordTeamActivity(
    store,
    { clientId: input.clientId, appId: input.appId, actor: input.actor, action: "appointment.status", target: { type: "appointment", id: input.appointmentId }, summary: `Appointment ${input.appointmentId}: ${words[input.to] ?? input.to}` },
    now,
  );
}

export function recordNotificationSent(store: DataStore, input: { clientId: string; appId: string; actor: TeamActor; title: string }, now: Date): Promise<void> {
  return recordTeamActivity(store, { clientId: input.clientId, appId: input.appId, actor: input.actor, action: "notification.sent", target: { type: "notification" }, summary: `Sent "${input.title}" to the app's users` }, now);
}

/** 63 A course question answered, or a review replied to, hidden or shown again; 64 a question or an answer hidden or shown again. */
export function recordCommunity(
  store: DataStore,
  input: {
    clientId: string;
    appId: string;
    actor: TeamActor;
    what: "answer" | "reply" | "hide" | "show" | "hideQuestion" | "showQuestion" | "hideAnswer" | "showAnswer";
    id: number;
    course: string;
  },
  now: Date,
): Promise<void> {
  const course = input.course.slice(0, 200);
  const line = {
    answer: { action: "question.answer", type: "question", summary: `Answered a question in "${course}"` },
    reply: { action: "review.reply", type: "review", summary: `Replied to a review of "${course}"` },
    hide: { action: "review.hide", type: "review", summary: `Hid a review of "${course}"` },
    show: { action: "review.show", type: "review", summary: `Showed a review of "${course}" again` },
    hideQuestion: { action: "question.hide", type: "question", summary: `Hid a question in "${course}"` },
    showQuestion: { action: "question.show", type: "question", summary: `Showed a question in "${course}" again` },
    hideAnswer: { action: "answer.hide", type: "answer", summary: `Hid an answer in "${course}"` },
    showAnswer: { action: "answer.show", type: "answer", summary: `Showed an answer in "${course}" again` },
  }[input.what] as { action: TeamAction; type: string; summary: string };
  return recordTeamActivity(store, { clientId: input.clientId, appId: input.appId, actor: input.actor, action: line.action, target: { type: line.type, id: input.id }, summary: line.summary }, now);
}

/** 64 A gym's membership frozen (from a day, until a day or not) or unfrozen, with the member's name. */
export function recordFreeze(store: DataStore, input: { clientId: string; appId: string; actor: TeamActor; membershipId: number; name: string; frozen: boolean }, now: Date): Promise<void> {
  const name = input.name.slice(0, 120);
  return recordTeamActivity(
    store,
    {
      clientId: input.clientId,
      appId: input.appId,
      actor: input.actor,
      action: input.frozen ? "membership.freeze" : "membership.unfreeze",
      target: { type: "membership", id: input.membershipId },
      summary: input.frozen ? `Froze the membership of "${name}"` : `Unfroze the membership of "${name}"`,
    },
    now,
  );
}
