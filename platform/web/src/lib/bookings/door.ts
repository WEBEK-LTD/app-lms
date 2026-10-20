import { dayOf } from "../analytics/days";
import type { DataStore } from "../data/store";
import type { App, HostedUser, MemberCheckIn, Membership } from "../data/types";
import { safeEqual } from "../crypto/tokens";
import { memberCode, memberCodeHash, readMemberCode } from "./member-codes";
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

/**
 * Memberships made before their code's hash was kept, looked through once
 * for a typed code that has no hash yet (those that can get in only; each is
 * then kept). Codes shown in the app or used at the door are found by hash.
 */
const UNHASHED_LIMIT = 20_000;

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

/** Keeps the hash of a membership's code, so a typed code finds it with one lookup. */
export async function rememberMemberCode(store: DataStore, key: string, appId: string, m: Pick<Membership, "id" | "codeHash">): Promise<void> {
  const hash = memberCodeHash(key, appId, memberCode(key, appId, m.id));
  if (m.codeHash !== hash) await store.setMembershipCodeHash(appId, m.id, hash);
}

async function findMembership(store: DataStore, app: App, key: string, input: { scanned?: string; membershipId?: number }, now: Date): Promise<Membership | MemberCheckInOutcome> {
  if (input.membershipId !== undefined) return (await store.getMembership(app.id, input.membershipId)) ?? "not_found";
  const read = readMemberCode(key, app.id, input.scanned ?? "");
  if ("error" in read) return read.error;
  if ("membershipId" in read) {
    const m = await store.getMembership(app.id, read.membershipId);
    if (m) await rememberMemberCode(store, key, app.id, m);
    return m ?? "not_found";
  }
  // A typed code: one indexed lookup by its hash, checked in constant time.
  const byHash = await store.findMembershipByCodeHash(app.id, memberCodeHash(key, app.id, read.code));
  if (byHash) return safeEqual(memberCode(key, app.id, byHash.id), read.code) ? byHash : "not_found";
  for (const m of await store.listMembershipsWithoutCodeHash(app.id, now, UNHASHED_LIMIT)) {
    if (safeEqual(memberCode(key, app.id, m.id), read.code)) {
      await rememberMemberCode(store, key, app.id, m);
      return m;
    }
  }
  return "not_found";
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
  const found = await findMembership(store, app, input.key, input, now);
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
  const now = input.now;
  // The app users a search finds (their first 200); filtered, ordered and paged by the database.
  const userIds = query ? (await store.listHostedUsers({ appId: app.id, query, offset: 0, limit: 200 })).items.map((u) => u.id) : undefined;
  const { items: page, total } = await store.listMembershipsPage({ appId: app.id, ...(userIds ? { userIds } : {}), now, offset: input.offset, limit: input.limit });
  const today = await store.listMemberCheckIns(app.id, gymDay(app, now).day);
  const items = await Promise.all(
    page.map(async (m) => ({
      membership: m,
      user: await store.getHostedUser(app.id, m.userId),
      status: membershipStatus(m, now),
      checkedInAt: today.find((c) => c.userId === m.userId)?.at ?? null,
    })),
  );
  return { items, total };
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
