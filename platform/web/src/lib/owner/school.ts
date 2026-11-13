import type { DashKey } from "@/i18n/dashboard";
import { minutesOf, utcToLocal } from "../bookings/time";
import type { App, SchoolExcuse, SchoolExcuseStatus, SchoolFileRef, SchoolLeave, SchoolPerson, SchoolReport, SchoolReportStatus } from "../data/types";
import { busBoard, stopMinute, stopsAhead } from "../school/bus";
import { checkinBoard, checkinSettingsOf, isCheckinRole } from "../school/checkin";
import { answerLeave } from "../school/flow";
import { answerExcuse, slipCounts, slipOpen, slipStudents } from "../school/parent";
import { fileJson, isoWeekday, schoolDirectory, schoolToday, type SchoolDirectory } from "../school/service";
import { schoolCurrency, schoolSettingsOf } from "../school/settings";
import { daysBetween } from "../school/staff";
import { markReportRead, reportAbout, reviewReport } from "../school/teacher-reports";
import { timeOf } from "../bookings/time";
import { bodyObject, intParam, invalid, notFound, pageJson, paging, type OwnerContext, type OwnerResult } from "./http";
import { appScope, money } from "./sales";
import { changed, flowDeps, recordStudio } from "./studio";

/**
 * 125 A school in Yallapp Business: the day from the gate's board, and what
 * waits for the administration (owners and managers: the app's settings),
 * answered with the dashboard's own functions: parents' excuses
 * (`answerExcuse`), teachers' reports (`reviewReport`, read on opening) and
 * leave requests (`answerLeave`). Families, teachers and staff are told in
 * the school's app as from the dashboard.
 */

const EXCUSE_KEYS: Record<SchoolExcuseStatus, DashKey> = { pending: "parents.pending", accepted: "parents.accepted", declined: "parents.declinedStatus", cancelled: "parents.cancelled" };
const REPORT_KEYS: Record<SchoolReportStatus, DashKey> = { draft: "reports.statusDraft", sent: "reports.statusSent", returned: "reports.statusReturned", approved: "reports.statusApproved" };
const LEAVE_KINDS: Record<SchoolLeave["kind"], DashKey> = { sick: "school.leaveSick", annual: "school.leaveAnnual", other: "school.leaveOther" };
const LEAVE_KEYS: Record<SchoolLeave["status"], DashKey> = { pending: "school.leavePending", approved: "school.leaveApproved", refused: "school.leaveRefused", cancelled: "school.leaveCancelled" };
/** A bus this many minutes past a stop's time is late. */
const BUS_LATE_MINUTES = 5;

/** Who answers, as the dashboard's actions write it: the school's name. */
const schoolName = (app: App) => app.appName?.trim() || "The school";

function attachmentJson(ctx: OwnerContext, file: SchoolFileRef | null) {
  if (!file) return null;
  const f = fileJson(file, ctx.deps.baseUrl);
  return { name: f.name, size: null, url: f.url };
}

// The day

export async function getSchoolToday(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "school");
  const { store, now } = ctx.deps;
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  const date = schoolToday(settings, now);
  const c = checkinSettingsOf(settings);
  const [board, excuses, reports, leave, buses, pickups, slips, fees] = await Promise.all([
    checkinBoard(store, app, date, now),
    store.listSchoolExcuses(app.id, { statuses: ["pending"] }),
    store.listSchoolReports(app.id, { statuses: ["sent"] }),
    store.listSchoolLeave(app.id, { statuses: ["pending"] }),
    busBoard(store, app, settings, now),
    store.listSchoolPickupNotes(app.id, { date }),
    store.listSchoolSlips(app.id),
    store.listSchoolFees(app.id, { status: "due" }),
  ]);
  const students = board.filter((r) => r.role === "student");
  const came = (state: string) => state === "in" || state === "left";
  const inOf = (role: string) => {
    const rows = board.filter((r) => r.role === role);
    return { in: rows.filter((r) => came(r.state)).length, total: rows.filter((r) => r.state !== "off" && r.state !== "leave").length };
  };
  // A bus is late when the next stop it hasn't reached was due a while ago.
  const nowMinute = minutesOf(utcToLocal(now, settings.timezone).time) ?? 0;
  const late: { route: string; minutes: number }[] = [];
  for (const run of buses) {
    if (run.run.date !== date) continue;
    const next = stopsAhead(run.stops, run.run.passedStopIds)[0];
    const due = next ? stopMinute(next, run.run.trip) : null;
    if (due !== null && nowMinute - due >= BUS_LATE_MINUTES) late.push({ route: run.route.name, minutes: nowMinute - due });
  }
  const open = slips.filter((s) => slipOpen(s, date)).sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.id - b.id);
  const slipJson = [];
  for (const slip of open.slice(0, 10)) {
    const [audience, answers] = await Promise.all([slipStudents(store, app.id, slip), store.listSchoolSlipAnswers(app.id, { slipId: slip.id })]);
    slipJson.push({ id: slip.id, title: slip.title, ...slipCounts(audience, answers) });
  }
  const schoolDay = c.days.includes(isoWeekday(date));
  return {
    status: 200,
    body: {
      date,
      closes_at: c.on && schoolDay ? timeOf(c.students.endMinute) : null,
      students: {
        total: students.filter((r) => r.state !== "off").length,
        in: students.filter((r) => came(r.state)).length,
        late: students.filter((r) => came(r.state) && r.row?.late === true).length,
        not_yet: students.filter((r) => r.state === "not_yet").length,
        absent: students.filter((r) => r.state === "absent").length,
        excused: students.filter((r) => r.state === "excused").length,
      },
      teachers: inOf("teacher"),
      staff: inOf("staff"),
      needs: { excuses: excuses.length, reports: reports.length, leave: leave.length },
      buses: { running: buses.filter((b) => b.run.date === date).length, late },
      pickups_today: pickups.length,
      slips: slipJson,
      fees: { due: money(fees.reduce((sum, f) => sum + f.amountCents, 0), schoolCurrency(settings)), count: fees.length },
    },
  };
}

// Excuses

function excuseJson(ctx: OwnerContext, e: SchoolExcuse, dir: SchoolDirectory) {
  const student = dir.people.get(e.studentId) ?? null;
  const parent = e.parentId !== null ? (dir.people.get(e.parentId) ?? null) : null;
  const klass = student?.classId ? (dir.classes.get(student.classId)?.name ?? null) : null;
  const first = e.reason.split(/\r?\n/)[0]!.trim();
  return {
    id: e.id,
    student: { id: e.studentId, name: student?.name ?? "", class_label: klass },
    from: e.startsOn,
    to: e.endsOn,
    reason_label: first.length > 80 ? `${first.slice(0, 79).trimEnd()}…` : first,
    text: e.reason,
    attachment: attachmentJson(ctx, e.file),
    // Family links keep no relation.
    sent_by: { name: parent?.name ?? null, relation: null },
    sent_at: e.createdAt.toISOString(),
    status: e.status,
    status_label: ctx.t(EXCUSE_KEYS[e.status]),
    answer: e.answer,
  };
}

export async function listExcuses(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "school");
  const page = paging(ctx.req.query);
  const status = ctx.req.query.get("status") || "pending";
  if (!["pending", "accepted", "declined", "all"].includes(status)) throw invalid({ status: "The request isn't valid." });
  const { store } = ctx.deps;
  const [all, dir] = await Promise.all([store.listSchoolExcuses(app.id, status === "all" ? {} : { statuses: [status as SchoolExcuseStatus] }), schoolDirectory(store, app.id)]);
  // Waiting ones first (the soonest day first), as the dashboard's page; then the newest.
  const waiting = all.filter((e) => e.status === "pending").sort((a, b) => a.startsOn.localeCompare(b.startsOn) || a.id - b.id);
  const rest = all.filter((e) => e.status !== "pending").sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id);
  const ordered = [...waiting, ...rest];
  return { status: 200, body: { ...pageJson(page, ordered.length), items: ordered.slice(page.offset, page.offset + page.perPage).map((e) => excuseJson(ctx, e, dir)) } };
}

async function ownExcuse(ctx: OwnerContext, params: Record<string, string>) {
  const { app } = appScope(ctx, params.app_id, "school");
  const excuse = await ctx.deps.store.getSchoolExcuse(app.id, intParam(params.excuse_id));
  if (!excuse) throw notFound();
  return { app, excuse };
}

export async function getExcuse(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, excuse } = await ownExcuse(ctx, params);
  return { status: 200, body: excuseJson(ctx, excuse, await schoolDirectory(ctx.deps.store, app.id)) };
}

/** The dashboard's answer (app/actions/school-parent.ts `answerExcuseAction`). */
export async function answerOneExcuse(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, excuse } = await ownExcuse(ctx, params);
  const body = bodyObject(ctx.req.body);
  const status = body.answer === "accepted" ? "accepted" : body.answer === "declined" ? "declined" : null;
  if (!status) throw invalid({ answer: "Choose to accept or decline it." });
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length > 1000) throw invalid({ note: "Keep it under 1000 characters." });
  if (status === "declined" && !note) throw invalid({ note: "Write why it is declined." });
  const { store } = ctx.deps;
  const done = await answerExcuse(flowDeps(ctx, app), excuse, status, note || null, schoolName(app));
  if (!done) throw changed("This excuse was answered or withdrawn already.");
  const student = await store.getSchoolPerson(app.id, excuse.studentId);
  await recordStudio(ctx, app, "school.excuse", { type: "school_excuse", id: excuse.id }, `${status === "accepted" ? "Accepted" : "Declined"} the absence excuse of "${student?.name ?? "a student"}" from ${excuse.startsOn} to ${excuse.endsOn}`);
  return { status: 200, body: excuseJson(ctx, (await store.getSchoolExcuse(app.id, excuse.id))!, await schoolDirectory(store, app.id)) };
}

// Teachers' reports

function reportJson(ctx: OwnerContext, r: SchoolReport, dir: SchoolDirectory) {
  return {
    id: r.id,
    title: r.templateName,
    teacher: { id: r.teacherId, name: r.teacherName },
    about_label: reportAbout(r, dir),
    kind: r.kind,
    status: r.status as Exclude<SchoolReportStatus, "draft">,
    status_label: ctx.t(REPORT_KEYS[r.status]),
    unread: r.status === "sent" && r.readAt === null,
    sent_at: r.sentAt?.toISOString() ?? null,
  };
}

function reportDetail(ctx: OwnerContext, r: SchoolReport, dir: SchoolDirectory) {
  return {
    ...reportJson(ctx, r, dir),
    fields: r.fields.map((f) => {
      const value = r.answers[f.id];
      return { label: f.label, value: value === undefined || value === "" ? "" : f.type === "rating" ? `${value}/5` : String(value) };
    }),
    comments: r.comments.map((c) => ({ by: c.by, name: c.name, text: c.text, at: new Date(c.at).toISOString() })),
    period: r.periodFrom && r.periodTo ? { from: r.periodFrom, to: r.periodTo } : null,
    reviewable: r.status === "sent",
  };
}

export async function listTeacherReports(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "school");
  const page = paging(ctx.req.query);
  const status = ctx.req.query.get("status") || "sent";
  if (!["sent", "returned", "approved", "all"].includes(status)) throw invalid({ status: "The request isn't valid." });
  const { store } = ctx.deps;
  const statuses: SchoolReportStatus[] = status === "all" ? ["sent", "returned", "approved"] : [status as SchoolReportStatus];
  const [all, dir] = await Promise.all([store.listSchoolReports(app.id, { statuses }), schoolDirectory(store, app.id)]);
  const ordered = [...all].sort((a, b) => (b.sentAt?.getTime() ?? 0) - (a.sentAt?.getTime() ?? 0) || b.id - a.id);
  return { status: 200, body: { ...pageJson(page, ordered.length), items: ordered.slice(page.offset, page.offset + page.perPage).map((r) => reportJson(ctx, r, dir)) } };
}

async function ownReport(ctx: OwnerContext, params: Record<string, string>) {
  const { app } = appScope(ctx, params.app_id, "school");
  const report = await ctx.deps.store.getSchoolReport(app.id, intParam(params.school_report_id));
  // Drafts stay the teachers' own.
  if (!report || report.status === "draft") throw notFound();
  return { app, report };
}

/** Opening it marks it read (the teacher sees it was), as the dashboard's report page does. */
export async function getTeacherReport(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, report } = await ownReport(ctx, params);
  const { store, now } = ctx.deps;
  if (report.status === "sent" && report.readAt === null) await markReportRead(store, app, report, now);
  const read = (await store.getSchoolReport(app.id, report.id)) ?? report;
  return { status: 200, body: reportDetail(ctx, read, await schoolDirectory(store, app.id)) };
}

/** The dashboard's review (app/actions/school-reports.ts): a comment, a send-back with what to change, or the approval. */
export async function reviewTeacherReport(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app, report } = await ownReport(ctx, params);
  const body = bodyObject(ctx.req.body);
  const action = body.action === "comment" || body.action === "return" || body.action === "approve" ? body.action : null;
  if (!action) throw invalid({ action: "The request isn't valid." });
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length > 1000) throw invalid({ text: "Keep it under 1000 characters." });
  if ((action === "comment" || action === "return") && !text) throw invalid({ text: action === "return" ? "Write what the teacher should change." : "Write your comment." });
  const { store } = ctx.deps;
  const done = await reviewReport(flowDeps(ctx, app), report, action, text, schoolName(app));
  if (!done) throw changed("This report changed in the meantime. Open it again.");
  await recordStudio(ctx, app, "school.report", { type: "school_report", id: report.id }, `${action === "approve" ? "Approved" : action === "return" ? "Sent back" : "Commented on"} the report "${report.templateName}" of ${report.teacherName}`);
  return { status: 200, body: reportDetail(ctx, (await store.getSchoolReport(app.id, report.id)) ?? done, await schoolDirectory(store, app.id)) };
}

// Leave

function leaveJson(ctx: OwnerContext, l: SchoolLeave, person: SchoolPerson | null) {
  return {
    id: l.id,
    person: { id: l.personId, name: person?.name ?? "", role: person?.role ?? "staff" },
    kind: l.kind,
    kind_label: ctx.t(LEAVE_KINDS[l.kind]),
    from: l.startsOn,
    to: l.endsOn,
    days: daysBetween(l.startsOn, l.endsOn),
    note: l.note,
    attachment: attachmentJson(ctx, l.file),
    status: l.status,
    status_label: ctx.t(LEAVE_KEYS[l.status]),
    answer: l.answer,
    sent_at: l.createdAt.toISOString(),
  };
}

export async function listLeave(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "school");
  const page = paging(ctx.req.query);
  const status = ctx.req.query.get("status") || "pending";
  if (status !== "pending" && status !== "all") throw invalid({ status: "The request isn't valid." });
  const { store } = ctx.deps;
  const [all, people] = await Promise.all([store.listSchoolLeave(app.id, status === "all" ? {} : { statuses: ["pending"] }), store.listSchoolPeople(app.id)]);
  const byId = new Map(people.filter((p) => isCheckinRole(p.role)).map((p) => [p.id, p]));
  const waiting = all.filter((l) => l.status === "pending").sort((a, b) => a.startsOn.localeCompare(b.startsOn) || a.id - b.id);
  const rest = all.filter((l) => l.status !== "pending").sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id);
  const ordered = [...waiting, ...rest];
  return { status: 200, body: { ...pageJson(page, ordered.length), items: ordered.slice(page.offset, page.offset + page.perPage).map((l) => leaveJson(ctx, l, byId.get(l.personId) ?? null)) } };
}

/** The dashboard's answer (app/actions/school.ts `answerLeaveAction`). */
export async function answerOneLeave(ctx: OwnerContext, params: Record<string, string>): Promise<OwnerResult> {
  const { app } = appScope(ctx, params.app_id, "school");
  const { store } = ctx.deps;
  const leave = await store.getSchoolLeave(app.id, intParam(params.leave_id));
  if (!leave) throw notFound();
  const body = bodyObject(ctx.req.body);
  const status = body.answer === "approved" ? "approved" : body.answer === "refused" ? "refused" : null;
  if (!status) throw invalid({ answer: "Choose to approve or refuse it." });
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length > 1000) throw invalid({ note: "Keep it under 1000 characters." });
  if (status === "refused" && !note) throw invalid({ note: "Write why it is refused." });
  const done = await answerLeave(flowDeps(ctx, app), leave, status, note || null, schoolName(app));
  if (!done) throw changed("This request was answered or withdrawn already.");
  const person = await store.getSchoolPerson(app.id, leave.personId);
  await recordStudio(ctx, app, "school.leave", { type: "school_leave", id: leave.id }, `${status === "approved" ? "Approved" : "Refused"} the leave of "${person?.name ?? "someone"}" from ${leave.startsOn} to ${leave.endsOn}`);
  return { status: 200, body: leaveJson(ctx, (await store.getSchoolLeave(app.id, leave.id))!, person) };
}
