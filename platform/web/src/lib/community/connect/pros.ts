import { newId } from "../../crypto/tokens";
import { fail, noContent, ok, pageOf, type CommunityContext, type CommunityResult, type MemberContext } from "../api/http";
import { notify } from "../api/trust-hooks";
import type { MemberSummaryView } from "../api/views";
import { blockedBetween, invalidIf, limitConnect, namedMember, pageOfRows, summaries, text, textList } from "./common";
import { openConversation, sendInto } from "./messages";
import type { HireRequest, HireStatus, Pro, ProAvailability, ProReview, ProService } from "./types";

/**
 * 234.1 Pros: a member's pro profile (services, rates as text, a
 * portfolio from their showcase, availability). A client sends a hire
 * request, which opens a message thread with the pro; the pro accepts or
 * declines, either marks it done, and then the client reviews it (once,
 * changeable). No money moves on the platform.
 */

const AVAILABILITY: readonly ProAvailability[] = ["available", "busy", "unavailable"];

/** Showcase items (area B) as a portfolio: none until B's showcase answers. */
export type PortfolioLookup = (ctx: CommunityContext, memberId: string, ids: string[]) => Promise<unknown[]>;
let portfolioOf: PortfolioLookup = async () => [];
/** Area B gives the pros' portfolio its showcase items (ShowcaseSummary), the member's own, in the order given. */
export function setPortfolioLookup(lookup: PortfolioLookup): void {
  portfolioOf = lookup;
}

async function proView(ctx: CommunityContext, pro: Pro, people?: Map<string, MemberSummaryView>) {
  const member = (people ?? (await summaries(ctx, [pro.memberId]))).get(pro.memberId)!;
  return {
    member,
    headline: pro.headline,
    about: pro.about,
    services: pro.services,
    skills: pro.skills,
    availability: pro.availability,
    portfolio: await portfolioOf(ctx, pro.memberId, pro.showcaseIds),
    rating: pro.reviewCount ? Math.round((pro.ratingSum / pro.reviewCount) * 10) / 10 : null,
    review_count: pro.reviewCount,
    done_count: pro.doneCount,
    created_at: pro.createdAt.toISOString(),
  };
}

function reviewView(r: ProReview, people: Map<string, MemberSummaryView>) {
  return { id: r.requestId, author: people.get(r.authorId)!, rating: r.rating, text: r.text, created_at: r.createdAt.toISOString() };
}

async function hireView(ctx: CommunityContext, h: HireRequest) {
  const [people, review] = await Promise.all([summaries(ctx, [h.clientId, h.proId]), ctx.store.connect.getReview(h.id)]);
  const reviewPeople = review ? await summaries(ctx, [review.authorId]) : people;
  return {
    id: h.id,
    client: people.get(h.clientId)!,
    pro: people.get(h.proId)!,
    service: h.service,
    message: h.message,
    status: h.status,
    conversation_id: h.conversationId,
    review: review && review.status === "published" ? reviewView(review, reviewPeople) : null,
    created_at: h.createdAt.toISOString(),
    updated_at: h.updatedAt.toISOString(),
  };
}

async function openPro(ctx: CommunityContext): Promise<Pro> {
  const member = await namedMember(ctx);
  const pro = await ctx.store.connect.getPro(member.id);
  if (!pro || !pro.open) fail(404, "not_found");
  if (ctx.member && ctx.member.id !== member.id && (await blockedBetween(ctx, ctx.member.id, member.id))) fail(404, "not_found");
  return pro;
}

// ------------------------------------------------------------ profiles

export async function listPros(ctx: CommunityContext): Promise<CommunityResult> {
  const { offset, limit } = pageOf(ctx.query);
  const available = ctx.query.get("available");
  const rows = await ctx.store.connect.listPros({
    q: ctx.query.get("q") ?? undefined,
    skill: ctx.query.get("skill") ?? undefined,
    available: available === null ? undefined : available === "true" || available === "1",
    offset,
    limit,
  });
  const hidden = ctx.member ? await ctx.store.base.blockedEitherWay(ctx.member.id) : new Set<string>();
  const visible = rows.slice(0, limit).filter((p) => !hidden.has(p.memberId));
  const people = await summaries(ctx, visible.map((p) => p.memberId));
  const items = [];
  for (const p of visible) items.push(await proView(ctx, p, people));
  return ok({ items, next_cursor: rows.length > limit ? String(offset + limit) : null });
}

export async function getPro(ctx: CommunityContext): Promise<CommunityResult> {
  return ok(await proView(ctx, await openPro(ctx)));
}

export async function myPro(ctx: MemberContext): Promise<CommunityResult> {
  const pro = await ctx.store.connect.getPro(ctx.member.id);
  if (!pro || !pro.open) fail(404, "not_found");
  return ok(await proView(ctx, pro));
}

export async function savePro(ctx: MemberContext): Promise<CommunityResult> {
  const body = ctx.json();
  const fields: Record<string, string> = {};
  const headline = text(body, "headline", { min: 3, max: 120, required: true }, fields);
  const about = text(body, "about", { max: 4000 }, fields);
  const skills = textList(body, "skills", 20, 40, fields);
  const availability = body.availability as ProAvailability;
  if (!AVAILABILITY.includes(availability)) fields.availability = "field.invalid";
  const services: ProService[] = [];
  if (!Array.isArray(body.services) || body.services.length === 0 || body.services.length > 10) fields.services = "field.invalid";
  else
    for (const s of body.services as unknown[]) {
      const one = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      const f: Record<string, string> = {};
      const service = { title: text(one, "title", { max: 120, required: true }, f), description: text(one, "description", { max: 1000 }, f), rate: text(one, "rate", { max: 80 }, f) };
      if (Object.keys(f).length) fields.services = "field.invalid";
      services.push(service);
    }
  const showcaseIds = textList(body, "showcase_ids", 12, 64, fields);
  invalidIf(fields);
  const store = ctx.store.connect;
  const old = await store.getPro(ctx.member.id);
  const pro: Pro = {
    memberId: ctx.member.id,
    headline,
    about,
    services,
    skills,
    availability,
    showcaseIds,
    open: true,
    ratingSum: old?.ratingSum ?? 0,
    reviewCount: old?.reviewCount ?? 0,
    doneCount: old?.doneCount ?? 0,
    createdAt: old?.createdAt ?? ctx.now,
    updatedAt: ctx.now,
  };
  await store.savePro(pro);
  return ok(await proView(ctx, pro));
}

export async function closePro(ctx: MemberContext): Promise<CommunityResult> {
  const pro = await ctx.store.connect.getPro(ctx.member.id);
  if (pro?.open) await ctx.store.connect.savePro({ ...pro, open: false, updatedAt: ctx.now });
  return noContent();
}

export async function listReviews(ctx: CommunityContext): Promise<CommunityResult> {
  const pro = await openPro(ctx);
  const { offset, limit } = pageOf(ctx.query);
  const rows = await ctx.store.connect.listReviews(pro.memberId, offset, limit);
  const people = await summaries(ctx, rows.map((r) => r.authorId));
  return ok(pageOfRows(rows, offset, limit, (r) => reviewView(r, people)));
}

// ------------------------------------------------------------ hire requests

export async function hire(ctx: MemberContext): Promise<CommunityResult> {
  const pro = await openPro(ctx);
  if (pro.memberId === ctx.member.id) fail(400, "not_allowed");
  const body = ctx.json();
  const fields: Record<string, string> = {};
  const message = text(body, "message", { min: 10, max: 4000, required: true }, fields);
  const service = text(body, "service", { max: 120 }, fields);
  invalidIf(fields);
  await limitConnect(ctx, "hire");
  const id = newId();
  // A thread of its own for each request.
  const { conversation } = await openConversation(ctx, { memberIds: [pro.memberId], title: null, kind: "hire", hireRequestId: id });
  const request: HireRequest = { id, clientId: ctx.member.id, proId: pro.memberId, service: service || null, message, status: "pending", conversationId: conversation.id, createdAt: ctx.now, updatedAt: ctx.now };
  await ctx.store.connect.createHire(request);
  await sendInto(ctx, conversation, service ? `${service}\n\n${message}` : message);
  await notify(ctx, { memberId: pro.memberId, kind: "hire_request", actorId: ctx.member.id, targetType: "hire_request", targetId: id, link: `/messages/${conversation.id}` });
  return ok(await hireView(ctx, request), 201);
}

export async function listHires(ctx: MemberContext): Promise<CommunityResult> {
  const box = ctx.query.get("box") === "sent" ? "sent" : "received";
  const { offset, limit } = pageOf(ctx.query);
  const rows = await ctx.store.connect.listHires({ ...(box === "sent" ? { clientId: ctx.member.id } : { proId: ctx.member.id }), offset, limit });
  const items = [];
  for (const h of rows.slice(0, limit)) items.push(await hireView(ctx, h));
  return ok({ items, next_cursor: rows.length > limit ? String(offset + limit) : null });
}

async function myHire(ctx: MemberContext): Promise<HireRequest> {
  const h = await ctx.store.connect.getHire(ctx.params.request_id ?? "");
  if (!h || (h.clientId !== ctx.member.id && h.proId !== ctx.member.id)) fail(404, "not_found");
  return h;
}

/** Who may move a request to a status, from which. */
function allowed(h: HireRequest, by: string, to: HireStatus): boolean {
  const pro = by === h.proId;
  if (to === "accepted" || to === "declined") return pro && h.status === "pending";
  if (to === "done") return h.status === "accepted";
  if (to === "cancelled") return by === h.clientId && (h.status === "pending" || h.status === "accepted");
  return false;
}

export async function moveHire(ctx: MemberContext): Promise<CommunityResult> {
  const h = await myHire(ctx);
  const status = ctx.json().status as HireStatus;
  if (!["accepted", "declined", "done", "cancelled"].includes(status)) fail(400, "invalid_request", { status: "field.invalid" });
  if (!allowed(h, ctx.member.id, status)) fail(400, "not_allowed");
  await ctx.store.connect.updateHire(h.id, { status, updatedAt: ctx.now });
  if (status === "done") await ctx.store.connect.recountPro(h.proId);
  const other = ctx.member.id === h.proId ? h.clientId : h.proId;
  await notify(ctx, { memberId: other, kind: "hire_update", actorId: ctx.member.id, targetType: "hire_request", targetId: h.id, data: { title: status }, link: `/messages/${h.conversationId}` });
  return ok(await hireView(ctx, (await ctx.store.connect.getHire(h.id))!));
}

export async function review(ctx: MemberContext): Promise<CommunityResult> {
  const h = await myHire(ctx);
  if (h.clientId !== ctx.member.id || h.status !== "done") fail(400, "not_allowed");
  const body = ctx.json();
  const fields: Record<string, string> = {};
  const rating = body.rating;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) fields.rating = "field.invalid";
  const words = text(body, "text", { max: 2000 }, fields);
  invalidIf(fields);
  const store = ctx.store.connect;
  const old = await store.getReview(h.id);
  const made: ProReview = { requestId: h.id, proId: h.proId, authorId: ctx.member.id, rating: rating as number, text: words, status: old?.status ?? "published", createdAt: old?.createdAt ?? ctx.now, updatedAt: ctx.now };
  await store.saveReview(made);
  await store.recountPro(h.proId);
  if (!old) await notify(ctx, { memberId: h.proId, kind: "pro_review", actorId: ctx.member.id, targetType: "pro_review", targetId: h.id, link: "/pros/me" });
  return ok(reviewView(made, await summaries(ctx, [made.authorId])));
}
