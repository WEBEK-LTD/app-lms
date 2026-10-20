import { formatDate } from "@/i18n/format";
import { isDay } from "../analytics/days";
import { checkInMember as checkIn, dayVisits, findMembers, gymDay, memberStatus, type MemberCheckInAnswer, type MemberRow } from "../bookings/door";
import { freezeMembership, freezeOf, unfreezeMembership, type FreezeResult } from "../bookings/freeze";
import { memberKey } from "../bookings/member-codes";
import type { Membership } from "../data/types";
import { recordFreeze } from "../team/activity";
import { bodyObject, intParam, invalid, iso, notFound, OwnerError, pageJson, paging, type OwnerContext, type OwnerResult } from "./http";
import { appScope } from "./sales";

/** 63 A gym's members at the door, with the dashboard's rules (lib/bookings/door.ts). */

export async function listMembers(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "memberCheckIn");
  const page = paging(ctx.req.query);
  const q = (ctx.req.query.get("q") ?? "").trim();
  if (q.length > 100) throw invalid({ q: "The request isn't valid." });
  const { items, total } = await findMembers(ctx.deps.store, app, { query: q, now: ctx.deps.now, offset: page.offset, limit: page.perPage });
  return {
    status: 200,
    body: {
      ...pageJson(page, total),
      time_zone: gymDay(app, ctx.deps.now).zone,
      items: items.map(memberJson),
    },
  };
}

/** `Member` in docs/api/owner.yaml. */
function memberJson(row: MemberRow) {
  return {
    membership_id: row.membership.id,
    name: row.user?.name ?? "",
    phone: row.user?.phone ?? null,
    plan_name: row.membership.planName,
    status: row.status,
    starts_at: row.membership.startsAt.toISOString(),
    ends_at: iso(row.membership.endsAt),
    credits_left: row.membership.creditsLeft,
    checked_in_at: iso(row.checkedInAt),
    // 64 A freeze now or to come.
    frozen: row.freeze ? { from: row.freeze.from.toISOString(), until: iso(row.freeze.until) } : null,
  };
}

/** What the door says, in the person's language (the dashboard's words). */
export function memberCheckInMessage(t: OwnerContext["t"], lang: OwnerContext["lang"], answer: MemberCheckInAnswer, zone: string): string {
  const m = answer.member;
  const time = (at: Date) => formatDate(lang, at, { hour: "2-digit", minute: "2-digit", timeZone: zone });
  switch (answer.outcome) {
    case "admitted":
      return t("door.admitted");
    case "already_in":
      return m?.checkedInAt ? t("door.alreadyInAt", { time: time(m.checkedInAt) }) : t("door.alreadyIn");
    case "expired":
      return m?.endsAt ? t("door.expiredOn", { date: formatDate(lang, m.endsAt, { day: "numeric", month: "short", year: "numeric", timeZone: zone }) }) : t("door.expired");
    case "cancelled":
      return t("door.cancelled");
    case "not_started":
      return t("door.notStarted");
    case "frozen":
      return m?.frozenUntil ? t("door.frozenUntil", { date: formatDate(lang, m.frozenUntil, { day: "numeric", month: "short", year: "numeric", timeZone: zone }) }) : t("door.frozen");
    case "no_credits":
      return t("door.noCredits");
    case "forged":
      return t("door.forged");
    case "not_found":
      return t("door.notFound");
    default:
      return t("door.notACode");
  }
}

export async function checkInMember(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "memberCheckIn");
  const body = bodyObject(ctx.req.body);
  const scanned = typeof body.code === "string" ? body.code.trim() : "";
  const membershipId = body.membership_id === undefined || body.membership_id === null ? undefined : Number(body.membership_id);
  if (membershipId !== undefined && !Number.isSafeInteger(membershipId)) throw invalid({ membership_id: "The request isn't valid." });
  if (membershipId === undefined && (!scanned || scanned.length > 300)) throw invalid({ code: "Scan a member's code or type it." });
  const { store, now, signingSecret } = ctx.deps;
  const answer = await checkIn({ store, app, key: memberKey(signingSecret, app.id), ...(membershipId !== undefined ? { membershipId } : { scanned }), by: ctx.user.name, now });
  const m = answer.member;
  return {
    status: 200,
    body: {
      outcome: answer.outcome,
      admitted: answer.outcome === "admitted",
      message: memberCheckInMessage(ctx.t, ctx.lang, answer, gymDay(app, now).zone),
      member: m
        ? { membership_id: m.membershipId, name: m.name, plan_name: m.planName, ends_at: iso(m.endsAt), credits_left: m.creditsLeft, checked_in_at: iso(m.checkedInAt), frozen_until: iso(m.frozenUntil) }
        : null,
    },
  };
}

export async function listCheckIns(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "memberCheckIn");
  const date = ctx.req.query.get("date");
  if (date !== null && !isDay(date)) throw invalid({ date: "The request isn't valid." });
  const { zone, day: today } = gymDay(app, ctx.deps.now);
  const day = date ?? today;
  const visits = await dayVisits(ctx.deps.store, app, day);
  return {
    status: 200,
    body: {
      date: day,
      time_zone: zone,
      count: visits.length,
      items: visits.map((v) => ({ id: v.checkIn.id, membership_id: v.checkIn.membershipId, name: v.name, plan_name: v.planName, checked_in_at: v.checkIn.at.toISOString(), by: v.checkIn.byName })),
    },
  };
}

// 64 Freezing a membership (lib/bookings/freeze.ts), the Bookings area as the door.

async function ownMembership(ctx: OwnerContext, params: Record<string, string>) {
  const { app } = appScope(ctx, params.app_id, "memberCheckIn");
  const membership = await ctx.deps.store.getMembership(app.id, intParam(params.membership_id));
  if (!membership) throw notFound();
  return { app, membership };
}

async function frozenAnswer(ctx: OwnerContext, app: Parameters<typeof gymDay>[0], before: Membership, result: FreezeResult, frozen: boolean): Promise<OwnerResult> {
  const { store, now } = ctx.deps;
  if (!result.ok) {
    if (result.status === 409) throw new OwnerError(409, "invalid_status", Object.values(result.errors)[0] ?? "The request isn't valid.");
    throw invalid(result.errors);
  }
  const user = await store.getHostedUser(app.id, before.userId);
  await recordFreeze(store, { clientId: ctx.client.id, appId: app.id, actor: ctx.user, membershipId: before.id, name: user?.name ?? "", frozen }, now);
  const m = result.membership;
  const today = (await store.listMemberCheckIns(app.id, gymDay(app, now).day)).find((c) => c.userId === m.userId);
  return { status: 200, body: memberJson({ membership: m, user, status: memberStatus(m, now), freeze: freezeOf(m, now), checkedInAt: today?.at ?? null }) };
}

export async function freezeMember(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, membership } = await ownMembership(ctx, params);
  const body = bodyObject(ctx.req.body);
  const result = await freezeMembership(ctx.deps.store, app, membership, { from: body.from, until: body.until }, ctx.deps.now);
  return frozenAnswer(ctx, app, membership, result, true);
}

export async function unfreezeMember(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, membership } = await ownMembership(ctx, params);
  const result = await unfreezeMembership(ctx.deps.store, app, membership, ctx.deps.now);
  return frozenAnswer(ctx, app, membership, result, false);
}
