import { newId } from "../../crypto/tokens";
import { fail, noContent, ok, pageOf, type CommunityContext, type CommunityResult, type MemberContext } from "../api/http";
import { notify } from "../api/trust-hooks";
import type { MemberSummaryView } from "../api/views";
import { trustDepsOf } from "../trust/context";
import { communityRoleOf } from "../trust/roles";
import { moderateNew } from "../trust/service";
import { YALLAPP_TENANT } from "../types";
import { blockedBetween, invalidIf, limitConnect, links, pageOfRows, summaries, text, textList } from "./common";
import type { Job, JobApplication, JobApplicationStatus, JobType } from "./types";

/**
 * 234.2 Jobs: a member posts one (title, type, remote or a place, skills,
 * a budget as text: no money moves on the platform); members apply once
 * with a message and links; the poster sees the applicants and shortlists
 * or declines them. A new member's first jobs, and any the spam filter
 * catches, wait for the moderators (area C's queue).
 */

const TYPES: readonly JobType[] = ["full_time", "part_time", "contract", "freelance", "internship"];

/** Whether the viewer moderates the community (Yallapp's admins and moderators, or a client app's from its dashboard). */
async function moderates(ctx: CommunityContext): Promise<boolean> {
  if (!ctx.member) return false;
  if (ctx.deps.tenant !== YALLAPP_TENANT) return ctx.req.tenantAdmin === true;
  return (await communityRoleOf(ctx, ctx.member)) !== null;
}

function jobView(j: Job, people: Map<string, MemberSummaryView>, viewerId: string | null, applied: boolean) {
  return {
    id: j.id,
    poster: people.get(j.posterId)!,
    title: j.title,
    description: j.description,
    type: j.type,
    remote: j.remote,
    location: j.location,
    skills: j.skills,
    budget: j.budget,
    status: j.status,
    application_count: viewerId === j.posterId ? j.applicationCount : 0,
    applied,
    created_at: j.createdAt.toISOString(),
  };
}

async function jobViews(ctx: CommunityContext, rows: Job[]) {
  const people = await summaries(ctx, rows.map((j) => j.posterId));
  const viewer = ctx.member?.id ?? null;
  const out = [];
  for (const j of rows) out.push(jobView(j, people, viewer, viewer ? (await ctx.store.connect.getApplicationOf(j.id, viewer)) !== null : false));
  return out;
}

function applicationView(a: JobApplication, job: Job, people: Map<string, MemberSummaryView>) {
  return { id: a.id, job_id: a.jobId, job_title: job.title, applicant: people.get(a.applicantId)!, message: a.message, links: a.links, status: a.status, created_at: a.createdAt.toISOString() };
}

/** The job in the path as the viewer may see it: open to everyone; pending or closed to its poster and the moderators. */
async function visibleJob(ctx: CommunityContext): Promise<Job> {
  const job = await ctx.store.connect.getJob(ctx.params.job_id ?? "");
  if (!job || job.status === "removed") fail(404, "not_found");
  const own = ctx.member?.id === job.posterId;
  if (job.status === "pending" && !own && !(await moderates(ctx))) fail(404, "not_found");
  if (ctx.member && !own && (await blockedBetween(ctx, ctx.member.id, job.posterId))) fail(404, "not_found");
  return job;
}

function readJob(body: Record<string, unknown>, partial: boolean) {
  const fields: Record<string, string> = {};
  const has = (k: string) => !partial || body[k] !== undefined;
  const out: Partial<Pick<Job, "title" | "description" | "type" | "remote" | "location" | "skills" | "budget">> = {};
  if (has("title")) out.title = text(body, "title", { min: 5, max: 120, required: true }, fields);
  if (has("description")) out.description = text(body, "description", { min: 20, max: 10000, required: true }, fields);
  if (has("type")) {
    if (!TYPES.includes(body.type as JobType)) fields.type = "field.invalid";
    else out.type = body.type as JobType;
  }
  if (body.remote !== undefined) {
    if (typeof body.remote !== "boolean") fields.remote = "field.invalid";
    else out.remote = body.remote;
  } else if (!partial) out.remote = true;
  if (has("location")) out.location = text(body, "location", { max: 120 }, fields);
  if (has("skills")) out.skills = textList(body, "skills", 15, 40, fields);
  if (has("budget")) out.budget = text(body, "budget", { max: 80 }, fields);
  return { fields, out };
}

export async function listJobs(ctx: CommunityContext): Promise<CommunityResult> {
  const { offset, limit } = pageOf(ctx.query);
  const mine = ctx.query.get("mine") === "true" || ctx.query.get("mine") === "1";
  if (mine && !ctx.member) fail(401, "invalid_token");
  const type = ctx.query.get("type");
  if (type !== null && !TYPES.includes(type as JobType)) fail(400, "invalid_request", { type: "field.invalid" });
  const remote = ctx.query.get("remote");
  const rows = await ctx.store.connect.listJobs({
    q: ctx.query.get("q") ?? undefined,
    type: (type as JobType | null) ?? undefined,
    remote: remote === null ? undefined : remote === "true" || remote === "1",
    skill: ctx.query.get("skill") ?? undefined,
    posterId: mine ? ctx.member!.id : undefined,
    offset,
    limit,
  });
  const hidden = ctx.member && !mine ? await ctx.store.base.blockedEitherWay(ctx.member.id) : new Set<string>();
  const items = await jobViews(ctx, rows.slice(0, limit).filter((j) => !hidden.has(j.posterId)));
  return ok({ items, next_cursor: rows.length > limit ? String(offset + limit) : null });
}

export async function postJob(ctx: MemberContext): Promise<CommunityResult> {
  const { fields, out } = readJob(ctx.json(), false);
  invalidIf(fields);
  await limitConnect(ctx, "job");
  const job: Job = {
    id: newId(),
    posterId: ctx.member.id,
    title: out.title!,
    description: out.description!,
    type: out.type!,
    remote: out.remote ?? true,
    location: out.location ?? "",
    skills: out.skills ?? [],
    budget: out.budget ?? "",
    status: "open",
    applicationCount: 0,
    createdAt: ctx.now,
    updatedAt: ctx.now,
  };
  await ctx.store.connect.createJob(job);
  const moderated = await moderateNew(trustDepsOf(ctx), { memberId: ctx.member.id, targetType: "job", targetId: job.id, text: `${job.title}\n${job.description}` });
  if (moderated.status === "pending") await ctx.store.connect.updateJob(job.id, { status: "pending" });
  return ok((await jobViews(ctx, [(await ctx.store.connect.getJob(job.id))!]))[0], 201);
}

export async function getJob(ctx: CommunityContext): Promise<CommunityResult> {
  return ok((await jobViews(ctx, [await visibleJob(ctx)]))[0]);
}

export async function updateJob(ctx: MemberContext): Promise<CommunityResult> {
  const job = await visibleJob(ctx);
  if (job.posterId !== ctx.member.id) fail(403, "not_allowed");
  const body = ctx.json();
  const { fields, out } = readJob(body, true);
  const status = body.status;
  if (status !== undefined && status !== "open" && status !== "closed") fields.status = "field.invalid";
  invalidIf(fields);
  // A job waiting for review stays so; open and closed are the poster's to switch.
  const next = status && job.status !== "pending" ? { status: status as Job["status"] } : {};
  await ctx.store.connect.updateJob(job.id, { ...out, ...next, updatedAt: ctx.now });
  return ok((await jobViews(ctx, [(await ctx.store.connect.getJob(job.id))!]))[0]);
}

export async function deleteJob(ctx: MemberContext): Promise<CommunityResult> {
  const job = await visibleJob(ctx);
  if (job.posterId !== ctx.member.id && !(await moderates(ctx))) fail(403, "not_allowed");
  await ctx.store.connect.deleteJob(job.id);
  return noContent();
}

export async function apply(ctx: MemberContext): Promise<CommunityResult> {
  const job = await visibleJob(ctx);
  if (job.posterId === ctx.member.id || job.status !== "open") fail(400, "not_allowed");
  const body = ctx.json();
  const fields: Record<string, string> = {};
  const message = text(body, "message", { min: 10, max: 4000, required: true }, fields);
  const linkList = links(body, "links", 5, fields);
  invalidIf(fields);
  await limitConnect(ctx, "application");
  const application: JobApplication = { id: newId(), jobId: job.id, applicantId: ctx.member.id, message, links: linkList, status: "sent", createdAt: ctx.now, updatedAt: ctx.now };
  if (!(await ctx.store.connect.createApplication(application))) fail(409, "already_applied");
  await ctx.store.connect.recountJob(job.id);
  await notify(ctx, { memberId: job.posterId, kind: "job_application", actorId: ctx.member.id, targetType: "job", targetId: job.id, data: { title: job.title }, link: `/jobs/${job.id}/applicants` });
  return ok(applicationView(application, job, await summaries(ctx, [ctx.member.id])), 201);
}

export async function listApplicants(ctx: MemberContext): Promise<CommunityResult> {
  const job = await visibleJob(ctx);
  if (job.posterId !== ctx.member.id) fail(403, "not_allowed");
  const { offset, limit } = pageOf(ctx.query);
  const rows = await ctx.store.connect.listApplications({ jobId: job.id, offset, limit });
  const people = await summaries(ctx, rows.map((a) => a.applicantId));
  return ok(pageOfRows(rows, offset, limit, (a) => applicationView(a, job, people)));
}

export async function moveApplication(ctx: MemberContext): Promise<CommunityResult> {
  const job = await visibleJob(ctx);
  const application = await ctx.store.connect.getApplication(ctx.params.application_id ?? "");
  if (!application || application.jobId !== job.id) fail(404, "not_found");
  const status = ctx.json().status as JobApplicationStatus;
  const poster = job.posterId === ctx.member.id;
  const applicant = application.applicantId === ctx.member.id;
  if (!poster && !applicant) fail(404, "not_found");
  const ok_ = (poster && (status === "shortlisted" || status === "declined") && application.status !== "withdrawn") || (applicant && status === "withdrawn");
  if (!["shortlisted", "declined", "withdrawn"].includes(status)) fail(400, "invalid_request", { status: "field.invalid" });
  if (!ok_) fail(400, "not_allowed");
  await ctx.store.connect.updateApplication(application.id, { status, updatedAt: ctx.now });
  await ctx.store.connect.recountJob(job.id);
  return ok(applicationView({ ...application, status }, job, await summaries(ctx, [application.applicantId])));
}

export async function myApplications(ctx: MemberContext): Promise<CommunityResult> {
  const { offset, limit } = pageOf(ctx.query);
  const rows = await ctx.store.connect.listApplications({ applicantId: ctx.member.id, offset, limit });
  const people = await summaries(ctx, [ctx.member.id]);
  const items = [];
  for (const a of rows.slice(0, limit)) {
    const job = await ctx.store.connect.getJob(a.jobId);
    if (job) items.push(applicationView(a, job, people));
  }
  return ok({ items, next_cursor: rows.length > limit ? String(offset + limit) : null });
}
