import type { DashKey } from "@/i18n/dashboard";
import type { App } from "../data/types";
import type { FlowDeps } from "../delivery/flow";
import { serviceAccountOf } from "../hosted/notify";
import { recordTeamActivity, type TeamAction } from "../team/activity";
import { OwnerError, type OwnerContext } from "./http";

/**
 * 125 What the Studio apps' paths (food orders, shipments, rides, the
 * marketplace, the school) share: stages with their labels, a person's
 * initials, the first part of an address, how long something waited, the
 * conflicts, and the team's activity.
 */

/** The movers' dependencies, as lib/owner/sales.ts gives them to the catalog's: the app's push account, the API's sender. */
export function flowDeps(ctx: OwnerContext, app: App): FlowDeps {
  return { store: ctx.deps.store, app, now: ctx.deps.now, account: serviceAccountOf(app, ctx.deps.encryptionKey), send: ctx.deps.sendPush };
}

/** A state change that lost a race: another phone or the dashboard moved it first. */
export const changed = (english: string) => new OwnerError(409, "changed", english);
/** A step the item can't take where it is now. */
export const invalidStatus = (english: string) => new OwnerError(409, "invalid_status", english);

/** "KA" for "Karim Adel"; one letter for one name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0]!, parts.at(-1)!] : parts;
  return letters.map((p) => [...p][0] ?? "").join("").toUpperCase();
}

/** The first part of an address ("12 Tahrir St" of "12 Tahrir St, Dokki, Giza"). */
export function placeName(address: string): string {
  return address.split(",")[0]?.trim() || address;
}

/** Whole minutes since `from`, never below 0. */
export function minutesSince(from: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - from.getTime()) / 60_000));
}

/** A stage of a timeline, its status in the person's language. */
export function stageJson(ctx: OwnerContext, stage: { status: string; at: string; by?: string | null }, key: (status: string) => DashKey) {
  return { status: stage.status, label: ctx.t(key(stage.status)), at: new Date(stage.at).toISOString(), by: stage.by ?? null };
}

/** The team's activity (Dashboard › Team), as the dashboard's actions record the staff's. */
export function recordStudio(ctx: OwnerContext, app: App, action: TeamAction, target: { type: string; id: number }, summary: string): Promise<void> {
  return recordTeamActivity(ctx.deps.store, { clientId: ctx.client.id, appId: app.id, actor: ctx.user, action, target, summary }, ctx.deps.now);
}

/** A trimmed note of up to `max` characters, or null. */
export function noteOf(value: unknown, max = 300): string | null {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) || null : null;
}

/** An integer ID from a JSON body, or null. */
export function idFrom(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && /^\d{1,15}$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
