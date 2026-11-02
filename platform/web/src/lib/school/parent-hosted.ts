import { addDays, isDate } from "../bookings/time";
import { formatCents } from "../catalog/money";
import type { SchoolFileRef, SchoolPerson, SchoolSettings, SchoolSlip } from "../data/types";
import { error, intParam } from "../hosted/connectors/common";
import type { ConnectorRequest, ConnectorResult } from "../hosted/connectors/types";
import { hitRateLimit, type RateLimitRule } from "../rate-limit";
import { behaviourJson, behaviourTotals } from "./behaviour";
import { studentBus } from "./bus-hosted";
import { calendarOf, dayOff, eventJson, examJson, studentView } from "./calendar";
import { checkinDayJson, checkinSettingsOf, personToday } from "./checkin";
import type { SchoolContext } from "./hosted";
import {
  childrenOf,
  excuseJson,
  pickupJson,
  pickupNoteJson,
  pickupPhoto,
  readExcuseInput,
  readPickupNote,
  readPickupPeople,
  readSlipAnswer,
  sendExcuse,
  slipFor,
  slipJson,
  slipOpen,
} from "./parent";
import { homeworkJson, isoWeekday, lessonJson, schoolDirectory, schoolToday, studentJson, type SchoolDirectory } from "./service";
import { schoolCurrency } from "./settings";

/**
 * 113.4 The hosted API's Parent endpoints: the parent's area in the app,
 * for the school's parents only (`not_parent` to anyone else), each of
 * their children's day at a glance, the permission slips to sign, the
 * excuses for an absence and who picks the child up. A child who isn't
 * theirs answers `not_found`.
 */

const ok = (body: unknown, status = 200): ConnectorResult => ({ status, body });
const noContent: ConnectorResult = { status: 204 };
const record = (value: unknown): Record<string, unknown> => (typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const idOf = (value: string | undefined): number | null => (value && /^\d{1,15}$/.test(value) ? Number(value) : null);

const WRITE_LIMIT: RateLimitRule = { name: "school_parent", limit: 60, windowSeconds: 3600 };
/** The slips a parent sees: open ones, and those closed in the last days. */
const SLIPS_DAYS_BACK = 60;

async function limited(ctx: SchoolContext, request: ConnectorRequest): Promise<ConnectorResult | null> {
  const result = await hitRateLimit(ctx.store, WRITE_LIMIT, `${ctx.app.id}:${request.user!.id}`, request.now);
  if (result.allowed) return null;
  return { status: 429, body: { code: "rate_limited", message: "You've done this many times in a short while. Please try again later.", retry_after_seconds: result.retryAfter } };
}

/** A ready photo or PDF of the school's Media library, from the app's uploads (never chat files). */
async function uploadedFile(ctx: SchoolContext, id: unknown): Promise<SchoolFileRef | null> {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const file = await ctx.store.getMediaFile(ctx.app.id, id);
  if (!file || file.status !== "ready" || file.source === "chat" || (file.kind !== "image" && file.kind !== "pdf")) return null;
  return { fileId: file.id, name: file.name, kind: file.kind };
}

/** The response for a Parent endpoint; `parent` is the signed-in parent's record. */
export async function handleParentRoute(ctx: SchoolContext, request: ConnectorRequest, parent: SchoolPerson, settings: SchoolSettings, messages: boolean): Promise<ConnectorResult> {
  const path = request.path;
  const route = `${request.method} /${path.join("/")}`;
  const children = await childrenOf(ctx.store, ctx.app.id, parent);
  if (route === "GET /parent/me") return parentMe(ctx, request, parent, children, settings, messages);
  if (route === "GET /parent/slips") return slips(ctx, request, children, settings);
  if (request.method === "POST" && path[1] === "slips" && path[3] === "answers" && path.length === 4) return answerSlip(ctx, request, parent, children, idOf(path[2]), settings);
  if (request.method === "DELETE" && path[1] === "excuses" && path.length === 3) return withdrawExcuse(ctx, request, children, idOf(path[2]));
  if (path[1] === "children") {
    const child = children.find((c) => c.id === idOf(path[2]));
    if (!child) return error(404, "not_found", "Student not found.");
    const tail = path.slice(3).join("/");
    if (request.method === "GET" && tail === "day") return day(ctx, request, child, settings);
    if (request.method === "GET" && tail === "excuses") return excuses(ctx, child);
    if (request.method === "POST" && tail === "excuses") return newExcuse(ctx, request, parent, child, settings);
    if (tail === "pickup" && request.method === "GET") return pickup(ctx, child, settings);
    if (tail === "pickup" && request.method === "PUT") return savePickup(ctx, request, parent, child, settings);
    if (tail === "pickup/note" && request.method === "PUT") return savePickupNote(ctx, request, parent, child, settings);
    if (tail === "pickup/note" && request.method === "DELETE") return deletePickupNote(ctx, request, child, settings);
  }
  return error(404, "not_found", "Page not found.");
}

// The parent and their children

/** The slips still open for each child, unanswered. */
async function waitingSlips(ctx: SchoolContext, children: readonly SchoolPerson[], dir: Pick<SchoolDirectory, "classes">, today: string): Promise<Map<number, SchoolSlip[]>> {
  const open = await ctx.store.listSchoolSlips(ctx.app.id, { from: today });
  const answers = open.length ? await ctx.store.listSchoolSlipAnswers(ctx.app.id, { slipIds: open.map((s) => s.id), studentIds: children.map((c) => c.id) }) : [];
  const answered = new Set(answers.map((a) => `${a.slipId}:${a.studentId}`));
  return new Map(children.map((c) => [c.id, open.filter((s) => slipFor(s, c, dir.classes) && !answered.has(`${s.id}:${c.id}`))]));
}

async function parentMe(ctx: SchoolContext, request: ConnectorRequest, parent: SchoolPerson, children: SchoolPerson[], settings: SchoolSettings, messages: boolean): Promise<ConnectorResult> {
  const dir = await schoolDirectory(ctx.store, ctx.app.id);
  const waiting = await waitingSlips(ctx, children, dir, schoolToday(settings, request.now));
  return ok({
    name: parent.name,
    children: children.map((c) => ({ ...studentJson(c, dir, ctx.assetUrl), slips_waiting: waiting.get(c.id)?.length ?? 0 })),
    messages,
    slips_waiting: [...new Set([...waiting.values()].flat().map((s) => s.id))].length,
  });
}

/** `GET /parent/children/{id}/day`: the child's day at a glance. */
async function day(ctx: SchoolContext, request: ConnectorRequest, child: SchoolPerson, settings: SchoolSettings): Promise<ConnectorResult> {
  const { store, app } = ctx;
  const today = schoolToday(settings, request.now);
  const dir = await schoolDirectory(store, app.id);
  const klass = child.classId !== null ? (dir.classes.get(child.classId) ?? null) : null;
  const classId = klass?.id ?? null;
  const [periods, homework, submissions, assessments, scores, notes, loans, reports, fees, excuseList, pickupRow, pickupNotes, off, calendar, waiting, bus] = await Promise.all([
    classId !== null ? store.listSchoolPeriods(app.id, { classId }) : Promise.resolve([]),
    classId !== null ? store.listSchoolHomework(app.id, { classId }) : Promise.resolve([]),
    store.listSchoolSubmissions(app.id, { studentId: child.id }),
    classId !== null ? store.listSchoolAssessments(app.id, { classId }) : Promise.resolve([]),
    store.listSchoolScores(app.id, { studentId: child.id }),
    store.listSchoolBehaviour(app.id, { studentId: child.id }),
    store.listSchoolBookLoans(app.id, { personId: child.id, open: true, limit: 50 }),
    store.listSchoolReports(app.id, { studentId: child.id, statuses: ["approved"] }),
    store.listSchoolFees(app.id, { studentId: child.id }),
    store.listSchoolExcuses(app.id, { studentId: child.id }),
    store.getSchoolPickup(app.id, child.id),
    store.listSchoolPickupNotes(app.id, { studentId: child.id, date: today }),
    dayOff(store, app.id, today, klass),
    calendarOf(store, app.id, studentView(child, dir.classes), { from: today, to: addDays(today, 14) }),
    waitingSlips(ctx, [child], dir, today),
    studentBus(ctx, child, settings),
  ]);
  const c = checkinSettingsOf(settings);
  const gate = c.on ? await personToday(store, app.id, settings, child, "student", request.now) : null;
  const weekday = isoWeekday(today);
  const mine = new Map(submissions.map((s) => [s.homeworkId, s]));
  const handedIn = (id: number) => (mine.get(id)?.submittedAt ?? null) !== null || (mine.get(id)?.mark ?? null) !== null;
  const due = homework.filter((h) => !handedIn(h.id) && h.dueOn >= today).sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.id - b.id);
  const byAssessment = new Map(assessments.map((a) => [a.id, a]));
  const grades = scores
    .map((s) => ({ score: s, assessment: byAssessment.get(s.assessmentId) }))
    .filter((x) => x.assessment !== undefined)
    .sort((a, b) => b.assessment!.date.localeCompare(a.assessment!.date) || b.assessment!.id - a.assessment!.id)
    .slice(0, 3);
  const books = loans.length ? new Map((await store.listSchoolBooks(app.id, { ids: [...new Set(loans.map((l) => l.bookId))] })).map((b) => [b.id, b])) : new Map();
  const shared = reports.filter((r) => r.sharedAt !== null).sort((a, b) => b.sharedAt!.getTime() - a.sharedAt!.getTime());
  const dueFees = fees.filter((f) => f.status === "due");
  const currency = schoolCurrency(settings);
  const totals = behaviourTotals(notes);
  const excuse = excuseList.find((e) => e.status === "pending" || (e.status === "accepted" && e.endsOn >= today)) ?? null;
  const busItems = (bus.body as { items?: unknown[] } | undefined)?.items ?? [];
  return ok({
    date: today,
    student: studentJson(child, dir, ctx.assetUrl),
    day_off: off ? { id: off.id, title: off.title } : null,
    checkin: gate ? checkinDayJson(gate.row, gate.date, gate.state, settings.timezone) : null,
    lessons: periods
      .filter((p) => p.weekday === weekday)
      .sort((a, b) => a.startMinute - b.startMinute)
      .map((p) => lessonJson(p, dir)),
    homework: { due_count: due.length, items: due.slice(0, 3).map((h) => homeworkJson(h, mine.get(h.id) ?? null, dir, ctx.platformUrl)) },
    grades: grades.map(({ score, assessment }) => ({
      assessment_id: assessment!.id,
      subject: dir.subjects.get(assessment!.subjectId)?.name ?? "",
      title: assessment!.title,
      kind: assessment!.kind,
      date: assessment!.date,
      score: score.score,
      max_score: assessment!.maxScore,
    })),
    behaviour: { points: totals.points, positive_count: totals.positive, negative_count: totals.negative, latest: notes[0] ? behaviourJson(notes[0], dir) : null },
    bus: busItems,
    loans: loans
      .filter((l) => l.returnedAt === null)
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
      .map((l) => ({ id: l.id, title: books.get(l.bookId)?.title ?? "", due_on: l.dueOn, overdue: l.dueOn < today })),
    reports: { count: shared.length, latest_at: shared[0]?.sharedAt?.toISOString() ?? null },
    fees: { currency, due_count: dueFees.length, due_formatted: formatCents(dueFees.reduce((sum, f) => sum + f.amountCents, 0), currency) },
    slips_waiting: waiting.get(child.id)?.length ?? 0,
    excuse: excuse ? excuseJson(excuse, ctx.platformUrl) : null,
    pickup: { people: pickupRow?.people.length ?? 0, today: pickupNotes[0] ? pickupNoteJson(pickupNotes[0]) : null },
    events: calendar.events.slice(0, 3).map((e) => eventJson(e, dir)),
    exams: calendar.exams.slice(0, 3).map((e) => examJson(e, dir)),
  });
}

// Permission slips

async function slips(ctx: SchoolContext, request: ConnectorRequest, children: SchoolPerson[], settings: SchoolSettings): Promise<ConnectorResult> {
  const wanted = request.query.get("student_id");
  const kids = wanted !== null ? children.filter((c) => String(c.id) === wanted) : children;
  if (wanted !== null && kids.length === 0) return error(404, "not_found", "Student not found.");
  const today = schoolToday(settings, request.now);
  const [dir, list] = await Promise.all([schoolDirectory(ctx.store, ctx.app.id), ctx.store.listSchoolSlips(ctx.app.id, { from: addDays(today, -SLIPS_DAYS_BACK) })]);
  const mine = list.map((s) => ({ slip: s, kids: kids.filter((c) => slipFor(s, c, dir.classes)) })).filter((x) => x.kids.length > 0);
  const answers = mine.length ? await ctx.store.listSchoolSlipAnswers(ctx.app.id, { slipIds: mine.map((x) => x.slip.id), studentIds: kids.map((c) => c.id) }) : [];
  // Open ones first, the soonest due first; then those closed, the latest first.
  const open = mine.filter((x) => slipOpen(x.slip, today)).sort((a, b) => a.slip.dueOn.localeCompare(b.slip.dueOn) || a.slip.id - b.slip.id);
  const closed = mine.filter((x) => !slipOpen(x.slip, today));
  const page = intParam(request.query, "page", 1, 10_000);
  const perPage = intParam(request.query, "per_page", 20, 100);
  const all = [...open, ...closed];
  return ok({
    page,
    per_page: perPage,
    total: all.length,
    total_pages: Math.max(1, Math.ceil(all.length / perPage)),
    items: all.slice((page - 1) * perPage, page * perPage).map((x) => slipJson(x.slip, x.kids, answers, dir, today)),
  });
}

async function answerSlip(ctx: SchoolContext, request: ConnectorRequest, parent: SchoolPerson, children: SchoolPerson[], slipId: number | null, settings: SchoolSettings): Promise<ConnectorResult> {
  const slip = slipId !== null ? await ctx.store.getSchoolSlip(ctx.app.id, slipId) : null;
  const dir = await schoolDirectory(ctx.store, ctx.app.id);
  const kids = slip ? children.filter((c) => slipFor(slip, c, dir.classes)) : [];
  if (!slip || kids.length === 0) return error(404, "not_found", "Permission slip not found.");
  const input = readSlipAnswer(record(request.body));
  if (!input.ok) return error(400, "invalid_request", input.message);
  const child = kids.find((c) => c.id === input.value.studentId);
  if (!child) return error(404, "not_found", "Student not found.");
  const today = schoolToday(settings, request.now);
  if (!slipOpen(slip, today)) return error(409, "slip_closed", "This slip was due on its date. Ask the school if you still need to answer.");
  const wait = await limited(ctx, request);
  if (wait) return wait;
  await ctx.store.saveSchoolSlipAnswer({ appId: ctx.app.id, slipId: slip.id, studentId: child.id, answer: input.value.answer, signedName: input.value.signedName, parentId: parent.id, answeredAt: request.now });
  const answers = await ctx.store.listSchoolSlipAnswers(ctx.app.id, { slipId: slip.id, studentIds: kids.map((c) => c.id) });
  return ok(slipJson(slip, kids, answers, dir, today));
}

// Absence excuses

async function excuses(ctx: SchoolContext, child: SchoolPerson): Promise<ConnectorResult> {
  const list = (await ctx.store.listSchoolExcuses(ctx.app.id, { studentId: child.id })).slice(0, 50);
  return ok({ items: list.map((e) => excuseJson(e, ctx.platformUrl)) });
}

async function newExcuse(ctx: SchoolContext, request: ConnectorRequest, parent: SchoolPerson, child: SchoolPerson, settings: SchoolSettings): Promise<ConnectorResult> {
  const body = record(request.body);
  const input = readExcuseInput(body, schoolToday(settings, request.now));
  if (!input.ok) return error(400, "invalid_request", input.message);
  let file: SchoolFileRef | null = null;
  if (body.upload_id !== undefined && body.upload_id !== null) {
    file = await uploadedFile(ctx, body.upload_id);
    if (!file) return error(400, "invalid_request", "This file isn't ready. Send it again.");
  }
  const overlapping = await ctx.store.listSchoolExcuses(ctx.app.id, { studentId: child.id, statuses: ["pending", "accepted"], from: input.value.startsOn, to: input.value.endsOn });
  if (overlapping.length > 0) return error(409, "excuse_overlaps", "Some of these days are excused already, or waiting for the school.");
  const wait = await limited(ctx, request);
  if (wait) return wait;
  const excuse = await sendExcuse({ store: ctx.store, app: ctx.app, now: request.now }, { appId: ctx.app.id, studentId: child.id, parentId: parent.id, ...input.value, file }, child);
  return ok(excuseJson(excuse, ctx.platformUrl), 201);
}

async function withdrawExcuse(ctx: SchoolContext, request: ConnectorRequest, children: SchoolPerson[], id: number | null): Promise<ConnectorResult> {
  const excuse = id !== null ? await ctx.store.getSchoolExcuse(ctx.app.id, id) : null;
  if (!excuse || !children.some((c) => c.id === excuse.studentId)) return error(404, "not_found", "Excuse not found.");
  if (excuse.status === "cancelled") return noContent;
  const changed = await ctx.store.updateSchoolExcuse(ctx.app.id, excuse.id, { status: "cancelled", updatedAt: request.now }, ["pending"]);
  if (!changed) return error(409, "already_answered", "The school has answered this excuse already.");
  return noContent;
}

// Pick-up

async function pickup(ctx: SchoolContext, child: SchoolPerson, settings: SchoolSettings): Promise<ConnectorResult> {
  const today = schoolToday(settings, ctx.now);
  const [dir, row, notes] = await Promise.all([schoolDirectory(ctx.store, ctx.app.id), ctx.store.getSchoolPickup(ctx.app.id, child.id), ctx.store.listSchoolPickupNotes(ctx.app.id, { studentId: child.id, from: today })]);
  return ok(pickupJson(child, dir, ctx.assetUrl, row, notes, today, ctx.platformUrl));
}

async function savePickup(ctx: SchoolContext, request: ConnectorRequest, parent: SchoolPerson, child: SchoolPerson, settings: SchoolSettings): Promise<ConnectorResult> {
  const input = readPickupPeople(record(request.body));
  if (!input.ok) return error(400, "invalid_request", input.message);
  const people = [];
  for (const person of input.value) {
    let photo: SchoolFileRef | null = null;
    if (person.photoId) {
      photo = await pickupPhoto(ctx.store, ctx.app.id, person.photoId);
      if (!photo) return error(400, "invalid_request", "A photo isn't ready. Send it again.");
    }
    people.push({ name: person.name, relation: person.relation, phone: person.phone, photo });
  }
  const wait = await limited(ctx, request);
  if (wait) return wait;
  await ctx.store.saveSchoolPickup({ appId: ctx.app.id, studentId: child.id, people, updatedBy: parent.name, updatedAt: request.now });
  return pickup(ctx, child, settings);
}

async function savePickupNote(ctx: SchoolContext, request: ConnectorRequest, parent: SchoolPerson, child: SchoolPerson, settings: SchoolSettings): Promise<ConnectorResult> {
  const input = readPickupNote(record(request.body), schoolToday(settings, request.now));
  if (!input.ok) return error(400, "invalid_request", input.message);
  const wait = await limited(ctx, request);
  if (wait) return wait;
  await ctx.store.saveSchoolPickupNote({ appId: ctx.app.id, studentId: child.id, ...input.value, writtenBy: parent.name, createdAt: request.now });
  return pickup(ctx, child, settings);
}

async function deletePickupNote(ctx: SchoolContext, request: ConnectorRequest, child: SchoolPerson, settings: SchoolSettings): Promise<ConnectorResult> {
  const date = request.query.get("date") ?? schoolToday(settings, request.now);
  if (!isDate(date)) return error(400, "invalid_request", "date is a day like 2026-11-02.");
  await ctx.store.deleteSchoolPickupNote(ctx.app.id, child.id, date);
  return pickup(ctx, child, settings);
}
