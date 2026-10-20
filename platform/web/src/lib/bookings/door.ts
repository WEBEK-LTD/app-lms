import { dayOf } from "../analytics/days";
import type { DataStore } from "../data/store";
import type { App, HostedUser, MemberCheckIn, Membership } from "../data/types";
import { memberCode, readMemberCode } from "./member-codes";
import { membershipStatus } from "./memberships";
import { bookingSetup } from "./setup";

/**
 * 63 A gym's members at the door (Dashboard › Members › Check-in, the Owner
 * API and Yallapp Business's scanner): a member code scanned or typed, or a
 * membership chosen by name. Once a member a day in the gym's time zone: the
 * store makes that atomic, so two phones scanning at once let them in once.
 */

export type MemberCheckInOutcome = "admitted" | "already_in" | "expired" | "cancelled" | "not_started" | "no_credits" | "not_found" | "forged" | "not_a_code";

export interface MemberAtDoor {
  membershipId: number;
  name: string;
  planName: string;
  endsAt: Date | null;
  creditsLeft: number | null;
  /** Today's check-in: now when admitted, the earlier one when already in. */
  checkedInAt: Date | null;
}

export interface MemberCheckInAnswer {
  outcome: MemberCheckInOutcome;
  member?: MemberAtDoor;
}

/** Memberships a typed code is looked for in (a gym's whole list, newest first). */
const SEARCH_LIMIT = 5000;

/** The gym's day (YYYY-MM-DD) in its time zone. */
export function gymDay(app: App, now: Date): { day: string; zone: string } {
  const zone = bookingSetup(app).rules.timezone;
  return { day: dayOf(now, zone), zone };
}

async function nameOf(store: DataStore, appId: string, userId: number): Promise<string> {
  return (await store.getHostedUser(appId, userId))?.name ?? "";
}

function atDoor(m: Membership, name: string, checkedInAt: Date | null): MemberAtDoor {
  return { membershipId: m.id, name, planName: m.planName, endsAt: m.endsAt, creditsLeft: m.creditsLeft, checkedInAt };
}

/** Why the membership doesn't get in now, or null when it does. */
export function refusal(m: Membership, now: Date): "expired" | "cancelled" | "not_started" | "no_credits" | null {
  const status = membershipStatus(m, now);
  if (status === "cancelled") return "cancelled";
  if (status === "expired") return "expired";
  if (m.startsAt.getTime() > now.getTime()) return "not_started";
  if (m.creditsLeft !== null && m.creditsLeft <= 0) return "no_credits";
  return null;
}

async function findMembership(store: DataStore, app: App, key: string, input: { scanned?: string; membershipId?: number }): Promise<Membership | MemberCheckInOutcome> {
  if (input.membershipId !== undefined) return (await store.getMembership(app.id, input.membershipId)) ?? "not_found";
  const read = readMemberCode(key, app.id, input.scanned ?? "");
  if ("error" in read) return read.error;
  if ("membershipId" in read) return (await store.getMembership(app.id, read.membershipId)) ?? "not_found";
  const all = await store.listMemberships({ appId: app.id, limit: SEARCH_LIMIT });
  return all.find((m) => memberCode(key, app.id, m.id) === read.code) ?? "not_found";
}

export async function checkInMember(input: {
  store: DataStore;
  app: App;
  /** memberKey(signingSecret, app.id) */
  key: string;
  scanned?: string;
  membershipId?: number;
  /** Who lets them in. */
  by: string;
  now: Date;
}): Promise<MemberCheckInAnswer> {
  const { store, app, now } = input;
  const found = await findMembership(store, app, input.key, input);
  if (typeof found === "string") return { outcome: found };
  const name = await nameOf(store, app.id, found.userId);
  const { day } = gymDay(app, now);
  const why = refusal(found, now);
  if (why) {
    const today = (await store.listMemberCheckIns(app.id, day)).find((c) => c.userId === found.userId);
    return { outcome: why, member: atDoor(found, name, today?.at ?? null) };
  }
  const result = await store.checkInMember({ appId: app.id, membershipId: found.id, userId: found.userId, day, at: now, byName: input.by.slice(0, 120) });
  return { outcome: result.ok ? "admitted" : "already_in", member: atDoor(found, name, result.checkIn.at) };
}

export interface MemberRow {
  membership: Membership;
  user: HostedUser | null;
  status: "active" | "expired" | "cancelled";
  /** Today's check-in of the member, if any. */
  checkedInAt: Date | null;
}

/**
 * Members to check in by name: with `query`, the memberships of the app
 * users whose name, phone or email matches; else every membership. Active
 * ones first, then the rest, newest first.
 */
export async function findMembers(store: DataStore, app: App, input: { query?: string; now: Date; offset: number; limit: number }): Promise<{ items: MemberRow[]; total: number }> {
  const query = input.query?.trim() ?? "";
  let memberships: Membership[];
  if (query) {
    const users = (await store.listHostedUsers({ appId: app.id, query, offset: 0, limit: 50 })).items;
    memberships = (await Promise.all(users.map((u) => store.listMemberships({ appId: app.id, userId: u.id, limit: 20 })))).flat();
  } else {
    memberships = await store.listMemberships({ appId: app.id, limit: 500 });
  }
  const now = input.now;
  const sorted = [...memberships].sort(
    (a, b) => Number(refusal(a, now) !== null) - Number(refusal(b, now) !== null) || b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id,
  );
  const page = sorted.slice(input.offset, input.offset + input.limit);
  const today = await store.listMemberCheckIns(app.id, gymDay(app, now).day);
  const items = await Promise.all(
    page.map(async (m) => ({
      membership: m,
      user: await store.getHostedUser(app.id, m.userId),
      status: membershipStatus(m, now),
      checkedInAt: today.find((c) => c.userId === m.userId)?.at ?? null,
    })),
  );
  return { items, total: sorted.length };
}

export interface VisitRow {
  checkIn: MemberCheckIn;
  name: string;
  planName: string;
}

/** A day's check-ins with the member's name and plan, the latest first. */
export async function dayVisits(store: DataStore, app: App, day: string): Promise<VisitRow[]> {
  const rows = await store.listMemberCheckIns(app.id, day);
  return Promise.all(
    rows.map(async (c) => ({
      checkIn: c,
      name: await nameOf(store, app.id, c.userId),
      planName: (await store.getMembership(app.id, c.membershipId))?.planName ?? "",
    })),
  );
}
