import { isDate, localToUtc, utcToLocal } from "../bookings/time";
import type { CourseAssignment, CourseAttachment, CourseCohort, CourseLiveSession, CourseSetup, CourseTopic } from "../data/types";
import { withCourse } from "./edit";
import { moveTopicItem } from "./learning";

/**
 * 112.5 The course builder of courses managed in Yallapp: sections renamed
 * and moved, their items (lessons, quizzes, assignments, live classes) in
 * the owner's order, assignments and live classes added, saved and deleted.
 * Shared by the dashboard's Courses pages; the forms' checks are here so
 * they can be tested.
 */

type Values = Record<string, string>;
type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };
export type ItemSave<T> = { ok: true; setup: CourseSetup; item: T; added: boolean } | { ok: false; message?: string; errors?: Record<string, string> };

export const ASSIGNMENT_LIMITS = { title: 120, instructions: 10_000, points: 1000, dueDays: 365 } as const;
export const LIVE_LIMITS = { title: 120, notes: 2000, minutes: 600 } as const;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** An https address of up to 500 characters (or a Media library link). */
function isHttps(url: string, isMediaLink: (url: string) => boolean = () => false): boolean {
  if (isMediaLink(url)) return true;
  try {
    return new URL(url).protocol === "https:" && url.length <= 500;
  } catch {
    return false;
  }
}

/** "Name | address" lines, as a lesson's files. */
export function parseFiles(text: string, isMediaLink: (url: string) => boolean): CourseAttachment[] | null {
  const files: CourseAttachment[] = [];
  for (const line of text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    const [rawName, rawUrl] = line.includes("|") ? line.split("|").map((part) => part.trim()) : ["", line];
    const url = rawUrl ?? "";
    if (!isHttps(url, isMediaLink) || files.length >= 10) return null;
    files.push({ name: (rawName || decodeURIComponent(url.split("/").pop() ?? "") || "File").slice(0, 120), url });
  }
  return files;
}

/** A local day (and time) in the app's time zone as an instant; null when empty, undefined when it isn't a date. */
export function localInstant(date: string, time: string, zone: string): string | null | undefined {
  if (!date) return null;
  if (!isDate(date) || (time && !TIME.test(time))) return undefined;
  return localToUtc(date, time || "00:00", zone).toISOString();
}

/** The local day and time of an instant, for the forms. */
export function localParts(at: string | null | undefined, zone: string): { date: string; time: string } {
  if (!at) return { date: "", time: "" };
  return utcToLocal(new Date(at), zone);
}

// Sections

export function renameTopic(setup: CourseSetup, courseId: number, topicId: number, title: string): { ok: true; setup: CourseSetup } | { ok: false; errors: Record<string, string> } {
  const clean = title.trim();
  if (clean.length < 2 || clean.length > 120) return { ok: false, errors: { title: "Enter a title of up to 120 characters." } };
  return { ok: true, setup: withCourse(setup, courseId, (c) => ({ ...c, topics: c.topics.map((t) => (t.id === topicId ? { ...t, title: clean } : t)) })) };
}

/** Moves a section one place up or down; null when it can't move. */
export function moveTopic(setup: CourseSetup, courseId: number, topicId: number, step: -1 | 1): CourseSetup | null {
  const course = setup.courses.find((c) => c.id === courseId);
  const at = course?.topics.findIndex((t) => t.id === topicId) ?? -1;
  if (!course || at < 0 || at + step < 0 || at + step >= course.topics.length) return null;
  const topics = [...course.topics];
  [topics[at], topics[at + step]] = [topics[at + step]!, topics[at]!];
  return withCourse(setup, courseId, (c) => ({ ...c, topics }));
}

/** Moves a lesson, quiz, assignment or live class one place up or down in its section; null when it can't move. */
export function moveItem(setup: CourseSetup, courseId: number, topicId: number, itemId: number, step: -1 | 1): CourseSetup | null {
  const topic = setup.courses.find((c) => c.id === courseId)?.topics.find((t) => t.id === topicId);
  const moved = topic ? moveTopicItem(topic, itemId, step) : null;
  if (!moved) return null;
  return withCourse(setup, courseId, (c) => ({ ...c, topics: c.topics.map((t) => (t.id === topicId ? moved : t)) }));
}

function inTopic<T extends { id: number }>(
  setup: CourseSetup,
  courseId: number,
  topicId: number,
  key: "assignments" | "live",
  id: number | null,
  make: (id: number) => T,
): ItemSave<T> {
  const topic = setup.courses.find((c) => c.id === courseId)?.topics.find((t) => t.id === topicId);
  if (!topic) return { ok: false, message: "This section no longer exists." };
  const list = (topic[key] ?? []) as unknown as T[];
  if (id !== null && !list.some((x) => x.id === id)) return { ok: false, message: key === "live" ? "This live class no longer exists." : "This assignment no longer exists." };
  const item = make(id ?? setup.nextId);
  const next = withCourse(setup, courseId, (c) => ({
    ...c,
    topics: c.topics.map((t): CourseTopic => (t.id === topicId ? { ...t, [key]: id === null ? [...list, item] : list.map((x) => (x.id === id ? item : x)) } : t)),
  }));
  return { ok: true, setup: id === null ? { ...next, nextId: setup.nextId + 1 } : next, item, added: id === null };
}

/** Deletes a lesson, quiz, assignment or live class wherever it is in the course. */
export function deleteItem(setup: CourseSetup, courseId: number, itemId: number): CourseSetup {
  return withCourse(setup, courseId, (c) => ({
    ...c,
    topics: c.topics.map((t) => ({
      ...t,
      lessons: t.lessons.filter((l) => l.id !== itemId),
      ...(t.quizzes ? { quizzes: t.quizzes.filter((q) => q.id !== itemId) } : {}),
      ...(t.assignments ? { assignments: t.assignments.filter((a) => a.id !== itemId) } : {}),
      ...(t.live ? { live: t.live.filter((l) => l.id !== itemId) } : {}),
      ...(t.order ? { order: t.order.filter((id) => id !== itemId) } : {}),
    })),
  }));
}

// Assignments

export function parseAssignment(v: Values, zone: string, isMediaLink: (url: string) => boolean = () => false): Parsed<Omit<CourseAssignment, "id">> {
  const errors: Record<string, string> = {};
  const title = (v.title ?? "").trim();
  if (title.length < 2 || title.length > ASSIGNMENT_LIMITS.title) errors.title = "Enter a title of up to 120 characters.";
  const instructions = (v.instructions ?? "").trim();
  if (instructions.length < 2) errors.instructions = "Write what the students should do.";
  else if (instructions.length > ASSIGNMENT_LIMITS.instructions) errors.instructions = "Use at most 10,000 characters.";
  const max = (v.maxPoints ?? "").trim() === "" ? 100 : Number(v.maxPoints);
  if (!Number.isInteger(max) || max < 1 || max > ASSIGNMENT_LIMITS.points) errors.maxPoints = "Enter the highest score, from 1 to 1000.";
  const pass = (v.passPoints ?? "").trim() === "" ? null : Number(v.passPoints);
  if (pass !== null && (!Number.isInteger(pass) || pass < 0 || pass > max)) errors.passPoints = "Enter a pass score from 0 to the highest score, or leave it empty.";
  const dueDays = (v.dueDays ?? "").trim() === "" ? null : Number(v.dueDays);
  if (dueDays !== null && (!Number.isInteger(dueDays) || dueDays < 1 || dueDays > ASSIGNMENT_LIMITS.dueDays)) errors.dueDays = "Enter 1 to 365 days, or leave it empty.";
  const dueAt = localInstant((v.dueOn ?? "").trim(), "23:59", zone);
  if (dueAt === undefined) errors.dueOn = "Choose a date, or leave it empty.";
  const files = parseFiles(v.attachments ?? "", isMediaLink);
  if (!files) errors.attachments = "Write one file per line, as Name | address: a file from Media or an https address, up to 10 files.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { title, instructions, dueDays, ...(dueAt ? { dueAt } : {}), maxPoints: max, passPoints: pass, ...(files!.length ? { attachments: files! } : {}) },
  };
}

export function saveAssignment(setup: CourseSetup, courseId: number, topicId: number, v: Values, zone: string, isMediaLink?: (url: string) => boolean): ItemSave<CourseAssignment> {
  const parsed = parseAssignment(v, zone, isMediaLink);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  return inTopic(setup, courseId, topicId, "assignments", v.id ? Number(v.id) : null, (id) => ({ id, ...parsed.value }));
}

export function assignmentValues(a: CourseAssignment, zone: string): Values {
  return {
    id: String(a.id),
    title: a.title,
    instructions: a.instructions,
    maxPoints: String(a.maxPoints),
    passPoints: a.passPoints === null ? "" : String(a.passPoints),
    dueDays: a.dueDays ? String(a.dueDays) : "",
    dueOn: localParts(a.dueAt, zone).date,
    attachments: (a.attachments ?? []).map((f) => `${f.name} | ${f.url}`).join("\n"),
  };
}

// Live classes

export function parseLive(v: Values, zone: string, isMediaLink: (url: string) => boolean = () => false): Parsed<Omit<CourseLiveSession, "id">> {
  const errors: Record<string, string> = {};
  const title = (v.title ?? "").trim();
  if (title.length < 2 || title.length > LIVE_LIMITS.title) errors.title = "Enter a title of up to 120 characters.";
  const date = (v.date ?? "").trim();
  const time = (v.time ?? "").trim();
  const startsAt = date && time ? localInstant(date, time, zone) : undefined;
  if (!startsAt) errors.date = "Choose the day and the time it starts.";
  const minutes = Number((v.duration ?? "").trim() || "60");
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > LIVE_LIMITS.minutes) errors.duration = "Enter 5 to 600 minutes.";
  const meetingUrl = (v.meetingUrl ?? "").trim();
  if (!isHttps(meetingUrl)) errors.meetingUrl = "Enter the meeting's https link (Zoom, Google Meet, Microsoft Teams or another).";
  const notes = (v.notes ?? "").trim();
  if (notes.length > LIVE_LIMITS.notes) errors.notes = "Use at most 2000 characters.";
  const recordingUrl = (v.recordingUrl ?? "").trim();
  if (recordingUrl && !isHttps(recordingUrl, isMediaLink)) errors.recordingUrl = "Enter the recording's https address, choose one from Media, or leave it empty.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { title, startsAt: startsAt!, durationMinutes: minutes, meetingUrl, notes, ...(recordingUrl ? { recordingUrl } : {}) } };
}

export function saveLive(setup: CourseSetup, courseId: number, topicId: number, v: Values, zone: string, isMediaLink?: (url: string) => boolean): ItemSave<CourseLiveSession> {
  const parsed = parseLive(v, zone, isMediaLink);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  return inTopic(setup, courseId, topicId, "live", v.id ? Number(v.id) : null, (id) => ({ id, ...parsed.value }));
}

export function liveValues(l: CourseLiveSession, zone: string): Values {
  const { date, time } = localParts(l.startsAt, zone);
  return { id: String(l.id), title: l.title, date, time, duration: String(l.durationMinutes), meetingUrl: l.meetingUrl, notes: l.notes, recordingUrl: l.recordingUrl ?? "" };
}

// Cohorts

/** 112.5 Adds a cohort to a course (or with `v.id` saves one): a name and its first day in the app's time zone. */
export function saveCohort(setup: CourseSetup, courseId: number, v: Values, zone: string): ItemSave<CourseCohort> {
  const course = setup.courses.find((c) => c.id === courseId);
  if (!course) return { ok: false, message: "This course no longer exists." };
  const errors: Record<string, string> = {};
  const name = (v.name ?? "").trim();
  if (name.length < 1 || name.length > 60) errors.name = "Enter a name of up to 60 characters.";
  const startsAt = localInstant((v.startsOn ?? "").trim(), "", zone);
  if (!startsAt) errors.startsOn = "Choose the day it starts.";
  if (Object.keys(errors).length) return { ok: false, errors };
  const id = v.id ? Number(v.id) : null;
  const list = course.cohorts ?? [];
  if (id !== null && !list.some((c) => c.id === id)) return { ok: false, message: "This cohort no longer exists." };
  const cohort: CourseCohort = { id: id ?? setup.nextId, name, startsAt: startsAt! };
  const next = withCourse(setup, courseId, (c) => ({ ...c, cohorts: id === null ? [...list, cohort] : list.map((x) => (x.id === id ? cohort : x)) }));
  return { ok: true, setup: id === null ? { ...next, nextId: setup.nextId + 1 } : next, item: cohort, added: id === null };
}

/** Its students stay in the course, without a cohort. */
export function deleteCohort(setup: CourseSetup, courseId: number, cohortId: number): CourseSetup {
  return withCourse(setup, courseId, (c) => ({ ...c, cohorts: (c.cohorts ?? []).filter((x) => x.id !== cohortId) }));
}
