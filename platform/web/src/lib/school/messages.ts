import { addDays, localToUtc, minutesOf, timeOf, utcToLocal, weekdayOf } from "../bookings/time";
import { ownerSend } from "../chat/owner";
import { removeChatFile, type ChatDeps, type ChatFailure, type ChatResult } from "../chat/service";
import { sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, ChatConversation, ChatMember, ChatMessage, SchoolFamilyLink, SchoolMessageSettings, SchoolPeriod, SchoolPerson, SchoolSettings } from "../data/types";
import { schoolDirectory, type SchoolDirectory } from "./service";
import { schoolSettingsOf } from "./settings";

/**
 * 113.6 Messages between a school's teachers and its families, on Phase 77's
 * chat (conversations of kind `school`): the administration chooses whom
 * teachers write to (no one, parents, parents and students), who writes
 * first, the hours, whether a whole class can be written to and whether
 * files can be sent. A conversation is always a teacher and one parent or
 * student: a parent only with the teachers of their children, a student
 * only with their own; never two students or two parents. Who may talk is
 * checked here on every read and send. Outside the hours a message is
 * refused with when it can be sent (it never waits to arrive at night).
 * The administration and its teachers talk in each teacher's own
 * conversation with the school (`direct`), at any time.
 */

export const DEFAULT_SCHOOL_MESSAGES: SchoolMessageSettings = {
  with: "none",
  startedBy: "teacher",
  hours: { from: 8 * 60, to: 18 * 60, days: [1, 2, 3, 4, 5] },
  classBroadcast: false,
  attachments: false,
  adminReads: false,
};

/** The longest class message, as a chat message. */
const BROADCAST_MAX = 4000;

export function schoolMessagesOf(settings: Pick<SchoolSettings, "messages">): SchoolMessageSettings {
  return { ...DEFAULT_SCHOOL_MESSAGES, ...(settings.messages ?? {}) };
}

const isoWeekday = (sundayZero: number) => (sundayZero === 0 ? 7 : sundayZero);

/** Whether messages can be sent now, and if not when they can again (null: no day is open). */
export function messageWindow(m: Pick<SchoolMessageSettings, "hours">, timezone: string, now: Date): { open: boolean; opensAt: Date | null } {
  const hours = m.hours;
  if (!hours) return { open: true, opensAt: null };
  const local = utcToLocal(now, timezone);
  const minute = minutesOf(local.time) ?? 0;
  const today = isoWeekday(local.weekday);
  if (hours.days.includes(today) && minute >= hours.from && minute < hours.to) return { open: true, opensAt: null };
  for (let i = 0; i <= 7; i += 1) {
    const date = addDays(local.date, i);
    const weekday = isoWeekday(weekdayOf(date));
    if (!hours.days.includes(weekday) || (i === 0 && minute >= hours.from)) continue;
    return { open: false, opensAt: localToUtc(date, timeOf(hours.from), timezone) };
  }
  return { open: false, opensAt: null };
}

/** The hours as the API sends them (`SchoolMessageHours`). */
export function hoursJson(m: Pick<SchoolMessageSettings, "hours">) {
  return m.hours ? { from: timeOf(m.hours.from), to: timeOf(m.hours.to), days: [...m.hours.days].sort((a, b) => a - b) } : null;
}

// Who the school's people are to each other

/** The school's records the rules need, read once a request. */
export interface SchoolWorld {
  settings: SchoolSettings;
  messages: SchoolMessageSettings;
  dir: SchoolDirectory;
  periods: SchoolPeriod[];
  family: SchoolFamilyLink[];
}

export async function schoolWorld(store: DataStore, app: App): Promise<SchoolWorld> {
  const [saved, dir, periods, family] = await Promise.all([store.getSchoolSettings(app.id), schoolDirectory(store, app.id), store.listSchoolPeriods(app.id), store.listSchoolFamily(app.id, {})]);
  const settings = schoolSettingsOf(saved, app);
  return { settings, messages: schoolMessagesOf(settings), dir, periods, family };
}

/** The classes a teacher teaches (a lesson in the timetable) or is the own teacher of. */
export function classesOf(world: SchoolWorld, teacherId: number): number[] {
  const out = new Set(world.periods.filter((p) => p.teacherId === teacherId).map((p) => p.classId));
  for (const c of world.dir.classes.values()) if (c.homeroomTeacherId === teacherId) out.add(c.id);
  return [...out];
}

const activeStudentsIn = (world: SchoolWorld, classIds: readonly number[]) => [...world.dir.people.values()].filter((p) => p.role === "student" && p.active && p.classId !== null && classIds.includes(p.classId));

/** A parent's active children. */
function childrenOf(world: SchoolWorld, parentId: number): SchoolPerson[] {
  return world.family
    .filter((l) => l.parentId === parentId)
    .map((l) => world.dir.people.get(l.studentId))
    .filter((p): p is SchoolPerson => Boolean(p && p.active && p.role === "student"));
}

/** The students a teacher and a parent or student have in common (the parent's children the teacher teaches, or the student). */
export function sharedStudents(world: SchoolWorld, teacher: SchoolPerson, other: SchoolPerson): SchoolPerson[] {
  const classes = classesOf(world, teacher.id);
  const students = other.role === "parent" ? childrenOf(world, other.id) : other.role === "student" ? [other] : [];
  return students.filter((s) => s.classId !== null && classes.includes(s.classId));
}

/**
 * Whether the school lets this teacher and this parent or student talk now:
 * messages are on (students only with "parents and students"), both are
 * active, they aren't the same account, and the teacher teaches the
 * student (the parent's child).
 */
export function mayTalk(world: SchoolWorld, teacher: SchoolPerson | undefined, other: SchoolPerson | undefined): boolean {
  if (!teacher || !other || teacher.role !== "teacher" || !teacher.active || !other.active) return false;
  if (world.messages.with === "none") return false;
  if (other.role === "student" && world.messages.with !== "parents_students") return false;
  if (other.role !== "parent" && other.role !== "student") return false;
  if (teacher.userId !== null && teacher.userId === other.userId) return false;
  return sharedStudents(world, teacher, other).length > 0;
}

/** The school's active records of an app user (one per role). */
export function recordsOf(world: SchoolWorld, userId: number | null): SchoolPerson[] {
  if (userId === null) return [];
  return [...world.dir.people.values()].filter((p) => p.active && p.userId === userId);
}

/** The app user behind a chat member (hosted sign-in), or null. */
export function userIdOf(member: Pick<ChatMember, "source" | "externalId">): number | null {
  if (member.source !== "hosted") return null;
  const id = Number(member.externalId);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** The member's side of a school conversation: the teacher, the family (the parent or student), or none. */
export function sideOf(world: SchoolWorld, conversation: ChatConversation, member: ChatMember): "teacher" | "family" | null {
  if (conversation.kind !== "school") return null;
  const userId = userIdOf(member);
  if (userId === null) return null;
  const teacher = world.dir.people.get(conversation.schoolTeacherId ?? 0);
  const other = world.dir.people.get(conversation.schoolPersonId ?? 0);
  if (teacher?.active && teacher.userId === userId) return "teacher";
  if (other?.active && other.userId === userId) return "family";
  return null;
}

/** The chat member of a school person who signed in to the app, made the first time; null before they ever signed in. */
export async function memberOfPerson(store: DataStore, app: App, person: SchoolPerson, now: Date): Promise<ChatMember | null> {
  if (person.userId === null) return null;
  const found = await store.findChatMember(app.id, "hosted", String(person.userId));
  if (found) return found;
  const user = await store.getHostedUser(app.id, person.userId);
  return store.upsertChatMember({ appId: app.id, source: "hosted", externalId: String(person.userId), name: (user?.name || person.name).slice(0, 120), imageUrl: null }, now);
}

// What the app sees

export type SchoolNote = "closed" | "not_allowed" | "teacher_first" | "outside_hours" | null;

/** Why the member can't write in the conversation now, or null. */
export function noteFor(world: SchoolWorld, conversation: ChatConversation, side: "teacher" | "family", now: Date): SchoolNote {
  if (conversation.closedAt) return "closed";
  const teacher = world.dir.people.get(conversation.schoolTeacherId ?? 0);
  const other = world.dir.people.get(conversation.schoolPersonId ?? 0);
  if (!mayTalk(world, teacher, other)) return "not_allowed";
  if (side === "family" && world.messages.startedBy === "teacher" && !conversation.teacherWroteAt) return "teacher_first";
  if (!messageWindow(world.messages, world.settings.timezone, now).open) return "outside_hours";
  return null;
}

/** `ChatConversation.school`: who the other side is, what the school allows and why one can't write now. */
export function schoolInfo(world: SchoolWorld, conversation: ChatConversation, side: "teacher" | "family", now: Date, assetUrl: (id: string) => string) {
  const teacher = world.dir.people.get(conversation.schoolTeacherId ?? 0);
  const other = world.dir.people.get(conversation.schoolPersonId ?? 0);
  const them = side === "teacher" ? other : teacher;
  const students = teacher && other ? sharedStudents(world, teacher, other) : [];
  const window = messageWindow(world.messages, world.settings.timezone, now);
  return {
    title: them?.name ?? "—",
    image_url: them?.photoAssetId ? assetUrl(them.photoAssetId) : null,
    school: {
      role: side === "teacher" ? (other?.role === "student" ? "student" : "parent") : "teacher",
      person_id: them?.id ?? 0,
      students: side === "teacher" && other?.role === "student" ? [] : students.map((s) => s.name),
      classes: [...new Set(students.map((s) => world.dir.classes.get(s.classId ?? 0)?.name).filter((n): n is string => Boolean(n)))],
      note: noteFor(world, conversation, side, now),
      closed: Boolean(conversation.closedAt),
      attachments: world.messages.attachments,
      hours: hoursJson(world.messages),
      opens_at: window.opensAt?.toISOString() ?? null,
      admin_reads: world.messages.adminReads,
    },
  };
}

/** The refusal for a message the member can't send now, or null. */
export function sendRefusal(world: SchoolWorld, conversation: ChatConversation, side: "teacher" | "family", withFile: boolean, now: Date): ChatFailure | null {
  const fail = (status: ChatFailure["status"], code: string, message: string): ChatFailure => ({ ok: false, status, code, message });
  switch (noteFor(world, conversation, side, now)) {
    case "closed":
      return fail(403, "conversation_closed", "The school closed this conversation.");
    case "not_allowed":
      return fail(403, "messages_not_allowed", "The school doesn't allow messages between you now.");
    case "teacher_first":
      return fail(403, "teacher_first", "At this school the teacher writes first. You can answer once they have.");
    case "outside_hours":
      return fail(409, "outside_hours", hoursMessage(world, now));
  }
  if (withFile && !world.messages.attachments) return fail(403, "attachments_not_allowed", "The school allows text messages only.");
  return null;
}

/** "Messages can be sent from 08:00 to 18:00. You can write again on 2026-10-18 at 08:00 (school time)." */
export function hoursMessage(world: SchoolWorld, now: Date): string {
  const hours = world.messages.hours;
  if (!hours) return "";
  const { opensAt } = messageWindow(world.messages, world.settings.timezone, now);
  const range = `Messages can be sent from ${timeOf(hours.from)} to ${timeOf(hours.to)} on school days.`;
  if (!opensAt) return range;
  const local = utcToLocal(opensAt, world.settings.timezone);
  return `${range} You can write again on ${local.date} at ${local.time} (school time).`;
}

/**
 * The chat's hook for school conversations (`ChatDeps.school`), for one
 * request: the school's records are read once, when first needed.
 */
export interface SchoolChatHook {
  side(conversation: ChatConversation, member: ChatMember): Promise<"teacher" | "family" | null>;
  /** Puts the member in each school conversation they are a side of (for their place and unread count). */
  join(member: ChatMember): Promise<void>;
  view(conversation: ChatConversation, member: ChatMember): Promise<ReturnType<typeof schoolInfo> | null>;
  refusal(conversation: ChatConversation, member: ChatMember, withFile: boolean): Promise<ChatFailure | null>;
  /** After a message: the teacher wrote; the other side is in the conversation, for the push. */
  sent(conversation: ChatConversation, member: ChatMember, message: ChatMessage): Promise<void>;
}

export function schoolChatHook(store: DataStore, app: App, now: Date, assetUrl: (id: string) => string): SchoolChatHook {
  let loaded: Promise<SchoolWorld> | null = null;
  const world = () => (loaded ??= schoolWorld(store, app));
  return {
    async side(conversation, member) {
      return conversation.kind === "school" ? sideOf(await world(), conversation, member) : null;
    },
    async join(member) {
      const w = await world();
      const ids = recordsOf(w, userIdOf(member)).map((p) => p.id);
      if (ids.length === 0) return;
      for (const conversation of await store.listSchoolConversations(app.id, { personIds: ids, limit: 500 })) {
        if (sideOf(w, conversation, member)) await store.addChatParticipant(conversation.id, member.id, now);
      }
    },
    async view(conversation, member) {
      const w = await world();
      const side = sideOf(w, conversation, member);
      return side ? schoolInfo(w, conversation, side, now, assetUrl) : null;
    },
    async refusal(conversation, member, withFile) {
      const w = await world();
      const side = sideOf(w, conversation, member);
      if (!side) return { ok: false, status: 404, code: "not_found", message: "This conversation doesn't exist." };
      return sendRefusal(w, conversation, side, withFile, now);
    },
    async sent(conversation, member, message) {
      const w = await world();
      const side = sideOf(w, conversation, member);
      if (side === "teacher" && !conversation.teacherWroteAt) await store.updateChatConversation(conversation.id, { teacherWroteAt: message.createdAt });
      const other = w.dir.people.get((side === "teacher" ? conversation.schoolPersonId : conversation.schoolTeacherId) ?? 0);
      const otherMember = other ? await memberOfPerson(store, app, other, now) : null;
      if (otherMember) await store.addChatParticipant(conversation.id, otherMember.id, now);
    },
  };
}

// The app's School endpoints: whom one can write to, starting, a class at once

export interface SchoolContact {
  person_id: number;
  role: "teacher" | "parent" | "student";
  name: string;
  photo_url: string | null;
  /** A parent's children, or the user's children a teacher teaches. */
  students: string[];
  classes: string[];
  /** The subjects a teacher teaches them (a class's own teacher: "class_teacher" is true). */
  subjects: string[];
  class_teacher: boolean;
  conversation_id: string | null;
  can_write: boolean;
}

/** Whom the user can write to, by their school records: a teacher's classes' families, a parent's children's teachers, a student's teachers. */
export async function schoolContacts(store: DataStore, app: App, world: SchoolWorld, userId: number, assetUrl: (id: string) => string): Promise<SchoolContact[]> {
  if (world.messages.with === "none") return [];
  const records = recordsOf(world, userId);
  const conversations = await store.listSchoolConversations(app.id, { personIds: records.map((r) => r.id), limit: 1000 });
  const conversationOf = (teacherId: number, personId: number) => conversations.find((c) => c.schoolTeacherId === teacherId && c.schoolPersonId === personId) ?? null;
  const className = (id: number | null) => (id === null ? null : (world.dir.classes.get(id)?.name ?? null));
  const photo = (p: SchoolPerson) => (p.photoAssetId ? assetUrl(p.photoAssetId) : null);
  const out = new Map<string, SchoolContact>();
  for (const me of records) {
    if (me.role === "teacher") {
      const classes = classesOf(world, me.id);
      for (const student of activeStudentsIn(world, classes)) {
        const reach: SchoolPerson[] = world.messages.with === "parents_students" ? [student] : [];
        for (const link of world.family.filter((l) => l.studentId === student.id)) {
          const parent = world.dir.people.get(link.parentId);
          if (parent?.active && parent.role === "parent") reach.push(parent);
        }
        for (const other of reach) {
          if (!mayTalk(world, me, other)) continue;
          const key = `t${me.id}:${other.id}`;
          const shared = sharedStudents(world, me, other);
          const conversation = conversationOf(me.id, other.id);
          out.set(key, {
            person_id: other.id,
            role: other.role as "parent" | "student",
            name: other.name,
            photo_url: photo(other),
            students: other.role === "parent" ? shared.map((s) => s.name) : [],
            classes: [...new Set(shared.map((s) => className(s.classId)).filter((n): n is string => Boolean(n)))],
            subjects: [],
            class_teacher: false,
            conversation_id: conversation?.id ?? null,
            can_write: !conversation?.closedAt,
          });
        }
      }
    } else if (me.role === "parent" || me.role === "student") {
      const students = me.role === "parent" ? childrenOf(world, me.id) : [me];
      const teachers = new Set<number>();
      for (const s of students) {
        if (s.classId === null) continue;
        for (const p of world.periods) if (p.classId === s.classId && p.teacherId !== null) teachers.add(p.teacherId);
        const own = world.dir.classes.get(s.classId)?.homeroomTeacherId;
        if (own) teachers.add(own);
      }
      for (const teacherId of teachers) {
        const teacher = world.dir.people.get(teacherId);
        if (!mayTalk(world, teacher, me)) continue;
        const shared = sharedStudents(world, teacher!, me);
        const sharedClasses = new Set(shared.map((s) => s.classId));
        const conversation = conversationOf(teacherId, me.id);
        const subjects = [...new Set(world.periods.filter((p) => p.teacherId === teacherId && sharedClasses.has(p.classId)).map((p) => world.dir.subjects.get(p.subjectId)?.name).filter((n): n is string => Boolean(n)))].sort();
        out.set(`f${teacherId}:${me.id}`, {
          person_id: teacherId,
          role: "teacher",
          name: teacher!.name,
          photo_url: photo(teacher!),
          students: me.role === "parent" ? shared.map((s) => s.name) : [],
          classes: [...new Set(shared.map((s) => className(s.classId)).filter((n): n is string => Boolean(n)))],
          subjects,
          class_teacher: [...sharedClasses].some((id) => world.dir.classes.get(id ?? 0)?.homeroomTeacherId === teacherId),
          conversation_id: conversation?.id ?? null,
          can_write: !conversation?.closedAt && (world.messages.startedBy === "both" || Boolean(conversation?.teacherWroteAt)),
        });
      }
    }
  }
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name) || a.person_id - b.person_id);
}

/**
 * The conversation of the user with a contact, made the first time: a
 * teacher with a parent or student of their classes, a parent or student
 * with their (children's) teacher. Never someone else.
 */
export async function openSchoolConversation(store: DataStore, app: App, world: SchoolWorld, userId: number, personId: number, now: Date): Promise<ChatResult<ChatConversation>> {
  const fail = (status: ChatFailure["status"], code: string, message: string): ChatFailure => ({ ok: false, status, code, message });
  if (world.messages.with === "none") return fail(403, "messages_not_allowed", "The school doesn't allow messages between teachers and families.");
  const records = recordsOf(world, userId);
  const target = world.dir.people.get(personId);
  if (!target || !target.active) return fail(404, "not_found", "This person isn't one you can write to.");
  let pair: { teacher: SchoolPerson; other: SchoolPerson } | null = null;
  if (target.role === "teacher") {
    const mine = records.find((r) => (r.role === "parent" || r.role === "student") && mayTalk(world, target, r));
    if (mine) pair = { teacher: target, other: mine };
  } else {
    const teacher = records.find((r) => r.role === "teacher" && mayTalk(world, r, target));
    if (teacher) pair = { teacher, other: target };
  }
  if (!pair) return fail(404, "not_found", "This person isn't one you can write to.");
  const conversation = await store.ensureSchoolConversation({ appId: app.id, teacherId: pair.teacher.id, personId: pair.other.id }, now);
  return { ok: true, value: conversation };
}

/**
 * A teacher writes to a whole class at once: the same message in each
 * one-to-one conversation with the class's parents (or students, or both,
 * as the school allows), so every answer comes back to the teacher alone.
 * People who never signed in to the app can't be written to yet.
 */
export async function writeToClass(
  deps: Pick<ChatDeps, "store" | "now" | "onMessage">,
  app: App,
  world: SchoolWorld,
  input: { teacher: SchoolPerson; teacherMember: ChatMember; classId: number; to: "parents" | "students" | "families"; clientId: string; text: string },
): Promise<ChatResult<{ sent: number; not_in_app: number }>> {
  const fail = (status: ChatFailure["status"], code: string, message: string): ChatFailure => ({ ok: false, status, code, message });
  const m = world.messages;
  if (m.with === "none") return fail(403, "messages_not_allowed", "The school doesn't allow messages between teachers and families.");
  if (!m.classBroadcast) return fail(403, "class_messages_not_allowed", "The school doesn't allow writing to a whole class at once.");
  if (!classesOf(world, input.teacher.id).includes(input.classId)) return fail(403, "not_your_class", "You don't teach this class.");
  if (input.to !== "parents" && m.with !== "parents_students") return fail(403, "messages_not_allowed", "The school allows messages to parents only.");
  if (!input.text || input.text.length > BROADCAST_MAX) return fail(400, "invalid_request", `Write the message, up to ${BROADCAST_MAX} characters.`);
  const window = messageWindow(m, world.settings.timezone, deps.now);
  if (!window.open) return fail(409, "outside_hours", hoursMessage(world, deps.now));
  const students = activeStudentsIn(world, [input.classId]);
  const people = new Map<number, SchoolPerson>();
  for (const student of students) {
    if (input.to !== "parents") people.set(student.id, student);
    if (input.to === "students") continue;
    for (const link of world.family.filter((l) => l.studentId === student.id)) {
      const parent = world.dir.people.get(link.parentId);
      if (parent?.active && parent.role === "parent") people.set(parent.id, parent);
    }
  }
  let sent = 0;
  let notInApp = 0;
  for (const person of people.values()) {
    if (!mayTalk(world, input.teacher, person)) continue;
    const member = await memberOfPerson(deps.store, app, person, deps.now);
    if (!member) {
      notInApp += 1;
      continue;
    }
    const conversation = await deps.store.ensureSchoolConversation({ appId: app.id, teacherId: input.teacher.id, personId: person.id }, deps.now);
    if (conversation.closedAt) continue;
    await deps.store.addChatParticipant(conversation.id, input.teacherMember.id, deps.now);
    await deps.store.addChatParticipant(conversation.id, member.id, deps.now);
    const { message, created } = await deps.store.createChatMessage({
      appId: app.id,
      conversationId: conversation.id,
      senderKind: "member",
      memberId: input.teacherMember.id,
      teamUserId: null,
      teamName: null,
      // The same message again (a retry) is sent once to each.
      clientId: `class:${sha256Hex(`${input.clientId}:${person.id}`).slice(0, 40)}`,
      text: input.text,
      mediaId: null,
      durationSeconds: null,
      deletedAt: null,
      createdAt: deps.now,
    });
    sent += 1;
    if (!created) continue;
    await deps.store.setChatRead(conversation.id, input.teacherMember.id, message.id);
    if (!conversation.teacherWroteAt) await deps.store.updateChatConversation(conversation.id, { teacherWroteAt: deps.now });
    if (deps.onMessage) {
      try {
        await deps.onMessage({ app, conversation: { ...conversation, lastMessageId: message.id, lastMessageAt: message.createdAt }, message, sender: input.teacherMember });
      } catch (error) {
        console.error(`[school] app ${app.id}: telling a family about a class message failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  return { ok: true, value: { sent, not_in_app: notInApp } };
}

// The administration (the dashboard)

/** Whether the administration may open this school conversation: the school's settings let it read them, or a message in it was reported. */
export async function adminMayRead(store: DataStore, app: App, conversation: ChatConversation, messages?: SchoolMessageSettings): Promise<boolean> {
  if (conversation.kind !== "school") return false;
  const m = messages ?? schoolMessagesOf(schoolSettingsOf(await store.getSchoolSettings(app.id), app));
  if (m.adminReads) return true;
  return (await reportedSchoolConversations(store, app)).has(conversation.id);
}

/** The school conversations with a reported message (open or closed). */
export async function reportedSchoolConversations(store: DataStore, app: App): Promise<Set<string>> {
  const [open, closed] = await Promise.all([store.listChatReports(app.id, { status: "open", limit: 1000 }), store.listChatReports(app.id, { status: "closed", limit: 1000 })]);
  return new Set([...open, ...closed].map((r) => r.conversationId));
}

export interface AdminSchoolConversation {
  conversation: ChatConversation;
  teacher: SchoolPerson | null;
  other: SchoolPerson | null;
  students: string[];
  reported: boolean;
  last: ChatMessage | null;
}

/** The school conversations the administration may see: all of them when it reads them, else those with a report. */
export async function adminSchoolConversations(store: DataStore, app: App, input: { q?: string } = {}): Promise<{ reads: boolean; items: AdminSchoolConversation[] }> {
  const world = await schoolWorld(store, app);
  const reported = await reportedSchoolConversations(store, app);
  const all = await store.listSchoolConversations(app.id, { limit: 500 });
  const q = input.q?.trim().toLowerCase() ?? "";
  const items: AdminSchoolConversation[] = [];
  for (const conversation of all) {
    if (!world.messages.adminReads && !reported.has(conversation.id)) continue;
    const teacher = world.dir.people.get(conversation.schoolTeacherId ?? 0) ?? null;
    const other = world.dir.people.get(conversation.schoolPersonId ?? 0) ?? null;
    if (q && ![teacher?.name, other?.name].some((n) => n?.toLowerCase().includes(q))) continue;
    items.push({
      conversation,
      teacher,
      other,
      students: teacher && other ? sharedStudents(world, teacher, other).map((s) => s.name) : [],
      reported: reported.has(conversation.id),
      last: conversation.lastMessageId !== null ? await store.getChatMessage(app.id, conversation.lastMessageId) : null,
    });
  }
  return { reads: world.messages.adminReads, items };
}

/** The administration closes a conversation (nothing more is sent in it) or opens it again. */
export async function closeSchoolConversation(store: DataStore, app: App, conversationId: string, closed: boolean, by: string, now: Date): Promise<boolean> {
  const conversation = await store.getChatConversation(app.id, conversationId);
  if (!conversation || !(await adminMayRead(store, app, conversation))) return false;
  await store.updateChatConversation(conversation.id, closed ? { closedAt: now, closedBy: by.slice(0, 120), updatedAt: now } : { closedAt: null, closedBy: null, updatedAt: now });
  return true;
}

/** The teachers the administration writes to: one, all of them, or a department's. */
export type TeacherAudience = { kind: "all" } | { kind: "department"; name: string } | { kind: "teacher"; id: number };

export function teachersFor(people: Iterable<SchoolPerson>, audience: TeacherAudience): SchoolPerson[] {
  return [...people].filter(
    (p) =>
      p.role === "teacher" &&
      p.active &&
      (audience.kind === "all" || (audience.kind === "department" ? (p.department ?? "").trim().toLowerCase() === audience.name.trim().toLowerCase() : p.id === audience.id)),
  );
}

/** The school's departments, from its teachers. */
export function departmentsOf(people: Iterable<SchoolPerson>): string[] {
  const out = new Map<string, string>();
  for (const p of people) {
    const name = p.role === "teacher" && p.active ? p.department?.trim() : "";
    if (name && !out.has(name.toLowerCase())) out.set(name.toLowerCase(), name);
  }
  return [...out.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * The administration writes to its teachers: the message goes into each
 * teacher's own conversation with the school, where they answer. Teachers
 * who never signed in to the app can't be written to yet.
 */
export async function writeToTeachers(
  deps: ChatDeps,
  app: App,
  input: { audience: TeacherAudience; text: string; clientId: string; team: { userId: string; name: string } },
): Promise<ChatResult<{ sent: number; notInApp: string[] }>> {
  const people = await deps.store.listSchoolPeople(app.id, { role: "teacher" });
  const teachers = teachersFor(people, input.audience);
  if (teachers.length === 0) return { ok: false, status: 404, code: "not_found", message: "No teacher to write to." };
  let sent = 0;
  const notInApp: string[] = [];
  for (const teacher of teachers) {
    const member = await memberOfPerson(deps.store, app, teacher, deps.now);
    if (!member) {
      notInApp.push(teacher.name);
      continue;
    }
    const conversation = await deps.store.ensureDirectConversation(app.id, member.id, deps.now);
    const result = await ownerSend(deps, app, conversation.id, input.team, { client_id: `staff:${sha256Hex(`${input.clientId}:${teacher.id}`).slice(0, 40)}`, text: input.text });
    if (!result.ok) return result;
    sent += 1;
  }
  return { ok: true, value: { sent, notInApp } };
}

/** Before a school person is deleted: the files sent in their school conversations (the conversations go with them). */
export async function removeSchoolConversations(deps: Pick<ChatDeps, "store" | "storage">, app: App, personId: number): Promise<void> {
  for (const conversation of await deps.store.listSchoolConversations(app.id, { personIds: [personId], limit: 1000 })) {
    for (const mediaId of await deps.store.clearChatConversation(app.id, conversation.id)) await removeChatFile(deps, app, mediaId);
  }
}
