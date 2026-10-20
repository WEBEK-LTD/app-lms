import { formatDate } from "@/i18n/format";
import { isDay } from "../analytics/days";
import { checkInMember as checkIn, dayVisits, findMembers, gymDay, type MemberCheckInAnswer } from "../bookings/door";
import { memberKey } from "../bookings/member-codes";
import { bodyObject, invalid, iso, pageJson, paging, type OwnerContext, type OwnerResult } from "./http";
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
      items: items.map((row) => ({
        membership_id: row.membership.id,
        name: row.user?.name ?? "",
        phone: row.user?.phone ?? null,
        plan_name: row.membership.planName,
        status: row.status,
        starts_at: row.membership.startsAt.toISOString(),
        ends_at: iso(row.membership.endsAt),
        credits_left: row.membership.creditsLeft,
        checked_in_at: iso(row.checkedInAt),
      })),
    },
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
      member: m ? { membership_id: m.membershipId, name: m.name, plan_name: m.planName, ends_at: iso(m.endsAt), credits_left: m.creditsLeft, checked_in_at: iso(m.checkedInAt) } : null,
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
