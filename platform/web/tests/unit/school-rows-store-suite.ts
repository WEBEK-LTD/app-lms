import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { registerClient } from "@/lib/auth/accounts";
import { newApp } from "@/lib/app/setup";
import type { DataStore, SchoolRows } from "@/lib/data/store";
import type { App } from "@/lib/data/types";
import { without } from "@/lib/demo/rows";

/**
 * DataStore.saveSchoolRows and deleteSchoolRows (the demo apps' refresh in
 * a few queries): the same rows as their own create, save and delete make
 * one by one, in either store. New rows in their order; rows kept one per
 * key saved over; nothing of another school's touched. And the daily
 * job's purge of what visitors did, for every demo app in one go.
 */

const NOW = new Date("2026-11-02T08:00:00.000Z");
const LATER = new Date("2026-11-02T09:00:00.000Z");

export function schoolRowsStoreSuite(storeOf: () => DataStore) {
  async function school(): Promise<{ app: App; teacher: number; student: number; other: number; classId: number; subjectId: number }> {
    const store = storeOf();
    const { client } = await registerClient(store, { name: "Nile", email: `rows-${randomUUID()}@school.test`, whatsapp: "+201000000199", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "school"), backend: "hosted", appName: "Nile School", connector: { kind: "school" } };
    await store.createApp(app);
    const person = async (role: "teacher" | "student", name: string) => {
      const made = await store.createSchoolPerson({ appId: app.id, role, name, phone: null, email: null, classId: null, code: null, photoAssetId: null, active: true }, NOW);
      if (!made.ok) throw new Error("person");
      return made.person.id;
    };
    const subject = await store.saveSchoolSubject({ appId: app.id, id: null, name: "Maths" }, NOW);
    if (!subject.ok) throw new Error("subject");
    const teacher = await person("teacher", "Mona Saleh");
    const klass = await store.saveSchoolClass({ appId: app.id, id: null, name: "Grade 5 A", grade: "Grade 5", homeroomTeacherId: teacher }, NOW);
    return { app, teacher, student: await person("student", "Lina Haddad"), other: await person("student", "Omar Khalil"), classId: klass!.id, subjectId: subject.subject.id };
  }

  it("adds new rows as given, in their order, as their own create makes them", async () => {
    const store = storeOf();
    const s = await school();
    const periods: SchoolRows["periods"][] = Array.from({ length: 230 }, (_, i) => ({ appId: s.app.id, classId: s.classId, subjectId: s.subjectId, teacherId: s.teacher, weekday: (i % 5) + 1, startMinute: 480 + i, endMinute: 525 + i, room: `R${i}` }));
    await store.saveSchoolRows("periods", periods);
    // More than one query's worth, every one there.
    const saved = await store.listSchoolPeriods(s.app.id);
    expect(saved).toHaveLength(230);
    expect(saved.map((p) => without(p, "id")).sort((a, b) => a.startMinute - b.startMinute)).toEqual(periods);

    const homework: SchoolRows["homework"][] = ["First", "Second"].map((title, i) => ({ appId: s.app.id, classId: s.classId, subjectId: s.subjectId, teacherId: s.teacher, title, text: "Page 42.", dueOn: "2026-11-05", files: [], createdAt: new Date(NOW.getTime() + i * 60_000) }));
    await store.saveSchoolRows("homework", homework);
    const one = await store.createSchoolHomework({ ...homework[0]!, title: "One by one" });
    const listed = await store.listSchoolHomework(s.app.id);
    // Newest first, then the later ID: the one made after them comes before "First".
    expect(listed.map((h) => h.title)).toEqual(["Second", "One by one", "First"]);
    // The same row as one made on its own.
    const made = without(listed.find((h) => h.title === "First")!, "id");
    const alone = without((await store.getSchoolHomework(s.app.id, one.id))!, "id");
    expect(made).toEqual({ ...alone, title: "First" });
    // In the order given: the first row has the lower ID.
    expect(listed.find((h) => h.title === "First")!.id).toBeLessThan(listed.find((h) => h.title === "Second")!.id);

    await store.saveSchoolRows("exams", [
      { appId: s.app.id, classId: s.classId, grade: null, subjectId: s.subjectId, date: "2026-11-12", startMinute: 510, durationMinutes: 45, room: "7", notes: null, published: true, publishedAt: NOW, remindedAt: null, createdAt: NOW, updatedAt: NOW },
    ]);
    expect((await store.listSchoolExams(s.app.id, { published: true })).map((e) => [e.date, e.published, e.publishedAt])).toEqual([["2026-11-12", true, NOW]]);

    // A shelf of books and their copies.
    await store.saveSchoolRows("books", [{ appId: s.app.id, title: "Atlas", author: "Nile School", isbn: null, coverAssetId: null, shelf: "C2", category: "Geography", language: "Arabic", description: null, file: null, createdAt: NOW, updatedAt: NOW }]);
    const [book] = await store.listSchoolBooks(s.app.id);
    await store.saveSchoolRows("bookCopies", [
      { appId: s.app.id, bookId: book!.id, code: "AT-1", note: null, createdAt: NOW },
      { appId: s.app.id, bookId: book!.id, code: "AT-2", note: null, createdAt: NOW },
    ]);
    expect((await store.listSchoolBookCopies(s.app.id, { bookId: book!.id })).map((c) => c.code)).toEqual(["AT-1", "AT-2"]);
    // Nothing to add, nothing done.
    await store.saveSchoolRows("announcements", []);
    expect(await store.listSchoolAnnouncements(s.app.id)).toEqual([]);
  });

  it("saves rows kept one per key over the old ones, and leaves out another school's", async () => {
    const store = storeOf();
    const s = await school();
    const b = await school();
    const day = { appId: s.app.id, personId: s.student, role: "student" as const, date: "2026-11-01", inAt: NOW, inMethod: "qr" as const, outAt: null, outMethod: null, late: false, leftEarly: false, mark: null, corrections: [], updatedAt: NOW };
    await store.saveSchoolRows("checkins", [day, { ...day, date: "2026-11-02" }, { ...day, personId: b.student }]);
    await store.saveSchoolRows("checkins", [{ ...day, late: true, updatedAt: LATER }]);
    const checkins = await store.listSchoolCheckins(s.app.id, {});
    expect(checkins.map((c) => [c.personId, c.date, c.late])).toEqual(expect.arrayContaining([[s.student, "2026-11-01", true], [s.student, "2026-11-02", false]]));
    expect(checkins).toHaveLength(2);
    expect(await store.listSchoolCheckins(b.app.id, {})).toEqual([]);

    // Salaries only for teachers and staff of the school.
    const salary = { appId: s.app.id, personId: s.teacher, monthlyCents: 10_000_00, currency: "EGP" as const, allowances: [], note: null, updatedBy: "Office", updatedAt: NOW };
    await store.saveSchoolRows("salaries", [salary, { ...salary, personId: s.student }, { ...salary, personId: b.teacher }]);
    await store.saveSchoolRows("salaries", [{ ...salary, monthlyCents: 11_000_00 }]);
    expect(await store.listSchoolSalaries(s.app.id)).toEqual([{ ...salary, monthlyCents: 11_000_00 }]);

    // Scores and submissions saved over.
    const assessment = await store.createSchoolAssessment({ appId: s.app.id, classId: s.classId, subjectId: s.subjectId, teacherId: s.teacher, kind: "quiz", title: "Fractions", date: "2026-10-30", maxScore: 20, createdAt: NOW });
    await store.saveSchoolRows("scores", [{ appId: s.app.id, assessmentId: assessment.id, studentId: s.student, score: 15, note: null, updatedAt: NOW }]);
    await store.saveSchoolRows("scores", [
      { appId: s.app.id, assessmentId: assessment.id, studentId: s.student, score: 17, note: "Better", updatedAt: LATER },
      { appId: s.app.id, assessmentId: assessment.id, studentId: s.other, score: 12, note: null, updatedAt: LATER },
    ]);
    expect((await store.listSchoolScores(s.app.id, { assessmentId: assessment.id })).map((x) => [x.studentId, x.score, x.note]).sort((x, y) => Number(x[0]) - Number(y[0]))).toEqual(
      [[s.student, 17, "Better"], [s.other, 12, null]].sort((x, y) => Number(x[0]) - Number(y[0])),
    );

    // Bus marks only on the school's own trips; slip answers only on its own slips.
    const route = await store.saveSchoolBusRoute({ id: null, appId: s.app.id, name: "Route 1", plate: "1", capacity: 20, driverId: null, supervisorId: null, active: true }, NOW);
    await store.saveSchoolRows("busRuns", [{ appId: s.app.id, routeId: route!.id, trip: "morning", date: "2026-11-01", status: "done", startedAt: NOW, endedAt: LATER, startedBy: null, lat: null, lng: null, locatedAt: null, passedStopIds: [], toldStopIds: [] }]);
    const [run] = await store.listSchoolBusRuns(s.app.id, { routeId: route!.id });
    const mark = { appId: s.app.id, runId: run!.id, studentId: s.student, status: "off" as const, boardedAt: NOW, offAt: LATER, markedBy: null, updatedAt: LATER };
    await store.saveSchoolRows("busMarks", [mark, { ...mark, appId: b.app.id }]);
    await store.saveSchoolRows("busMarks", [{ ...mark, status: "absent", boardedAt: null, offAt: null }]);
    expect((await store.listSchoolBusMarks(s.app.id, { runId: run!.id })).map((m) => [m.studentId, m.status])).toEqual([[s.student, "absent"]]);
    expect(await store.listSchoolBusMarks(b.app.id, { runId: run!.id })).toEqual([]);
    const slip = await store.saveSchoolSlip({ id: null, appId: s.app.id, title: "Trip", details: "Thursday", dueOn: "2026-11-06", feeNote: null, audience: "school", grade: null, classId: null }, NOW);
    const answer = { appId: s.app.id, slipId: slip!.id, studentId: s.student, answer: "yes" as const, signedName: "Rania", parentId: null, answeredAt: NOW };
    await store.saveSchoolRows("slipAnswers", [answer, { ...answer, studentId: b.student }]);
    await store.saveSchoolRows("slipAnswers", [{ ...answer, answer: "no" }]);
    expect((await store.listSchoolSlipAnswers(s.app.id, { slipId: slip!.id })).map((x) => [x.studentId, x.answer])).toEqual([[s.student, "no"]]);
  });

  it("deletes the school's rows by ID with what goes with each, and nothing of another school's", async () => {
    const store = storeOf();
    const s = await school();
    const b = await school();
    const homework = await store.createSchoolHomework({ appId: s.app.id, classId: s.classId, subjectId: s.subjectId, teacherId: s.teacher, title: "Gone", text: "", dueOn: "2026-11-05", files: [], createdAt: NOW });
    const kept = await store.createSchoolHomework({ appId: s.app.id, classId: s.classId, subjectId: s.subjectId, teacherId: s.teacher, title: "Kept", text: "", dueOn: "2026-11-05", files: [], createdAt: NOW });
    const theirs = await store.createSchoolHomework({ appId: b.app.id, classId: b.classId, subjectId: b.subjectId, teacherId: b.teacher, title: "Theirs", text: "", dueOn: "2026-11-05", files: [], createdAt: NOW });
    await store.saveSchoolSubmission({ appId: s.app.id, homeworkId: homework.id, studentId: s.student, text: "Done", file: null, submittedAt: NOW, late: false, mark: null, feedback: null, markedAt: null });
    // Another school's ID among them is left alone.
    await store.deleteSchoolRows(s.app.id, "homework", [homework.id, homework.id, theirs.id]);
    expect((await store.listSchoolHomework(s.app.id)).map((h) => h.id)).toEqual([kept.id]);
    expect((await store.listSchoolHomework(b.app.id)).map((h) => h.id)).toEqual([theirs.id]);
    expect(await store.listSchoolSubmissions(s.app.id, { homeworkId: homework.id })).toEqual([]);

    // A route with its stops and riders; books with their copies.
    const route = await store.saveSchoolBusRoute({ id: null, appId: s.app.id, name: "Route 1", plate: "1", capacity: 20, driverId: null, supervisorId: null, active: true }, NOW);
    await store.saveSchoolRows("busStops", [
      { appId: s.app.id, routeId: route!.id, name: "Corniche", lat: 29.97, lng: 31.23, morningMinute: 420, afternoonMinute: 855, position: 1 },
      { appId: s.app.id, routeId: route!.id, name: "Road 9", lat: 29.96, lng: 31.25, morningMinute: 440, afternoonMinute: 835, position: 2 },
    ]);
    const stops = await store.listSchoolBusStops(s.app.id, { routeId: route!.id });
    expect(stops.map((x) => [x.name, x.position])).toEqual([["Corniche", 1], ["Road 9", 2]]);
    // Everyone's stop at once: a student's later row wins, as one by one.
    await store.setSchoolBusRiders(s.app.id, [
      { studentId: s.student, trip: "morning", stop: stops[0]! },
      { studentId: s.other, trip: "morning", stop: stops[0]! },
      { studentId: s.student, trip: "morning", stop: stops[1]! },
      { studentId: b.student, trip: "morning", stop: stops[0]! },
    ]);
    expect((await store.listSchoolBusRiders(s.app.id, { routeId: route!.id })).map((r) => [r.studentId, r.stopId]).sort((x, y) => x[0]! - y[0]!)).toEqual(
      [[s.student, stops[1]!.id], [s.other, stops[0]!.id]].sort((x, y) => x[0]! - y[0]!),
    );
    await store.deleteSchoolRows(s.app.id, "busRoutes", [route!.id]);
    expect(await store.listSchoolBusRoutes(s.app.id)).toEqual([]);
    expect(await store.listSchoolBusStops(s.app.id)).toEqual([]);
    expect(await store.listSchoolBusRiders(s.app.id)).toEqual([]);

    // Each kind, and none at all.
    const categories = Array.from({ length: 3 }, (_, i) => ({ appId: s.app.id, name: `Kind ${i}`, kind: "positive" as const, points: 1, position: i + 1, active: true, createdAt: NOW }));
    await store.saveSchoolRows("behaviourCategories", categories);
    const listed = await store.listSchoolBehaviourCategories(s.app.id);
    expect(listed.map((c) => without(c, "id"))).toEqual(categories);
    await store.deleteSchoolRows(s.app.id, "behaviourCategories", []);
    expect(await store.listSchoolBehaviourCategories(s.app.id)).toHaveLength(3);
    await store.deleteSchoolRows(s.app.id, "behaviourCategories", listed.map((c) => c.id));
    expect(await store.listSchoolBehaviourCategories(s.app.id)).toEqual([]);
  });

  it("deletes what visitors did a day ago in several demo apps at once, and nothing newer or another app's", async () => {
    const store = storeOf();
    const [a, b, c] = [await school(), await school(), await school()];
    const device = async (appId: string, lastSeenAt: Date) => {
      const user = await store.createHostedUser({ appId, phone: `+1202555${Math.floor(Math.random() * 1e4).toString().padStart(4, "0")}`, name: "Visitor", email: null, city: null, now: NOW });
      await store.createHostedDevice({ id: randomUUID(), appId, userId: user!.id, deviceId: randomUUID(), platform: "android", name: "Phone", appVersion: "1.0.0", pushToken: null, pushPreferences: null, language: null, country: null, createdAt: lastSeenAt, lastSeenAt });
    };
    const old = new Date(NOW.getTime() - 3 * 86_400_000);
    await device(a.app.id, old);
    await device(a.app.id, NOW);
    await device(b.app.id, old);
    await device(c.app.id, old);
    const counts = await store.purgeDemoActivity([a.app.id, b.app.id], new Date(NOW.getTime() - 86_400_000));
    expect(counts.devices).toBe(2);
    expect(await store.listAppHostedDevices(a.app.id)).toHaveLength(1);
    expect(await store.listAppHostedDevices(b.app.id)).toEqual([]);
    expect(await store.listAppHostedDevices(c.app.id)).toHaveLength(1);
    // None at all: nothing done.
    expect(Object.values(await store.purgeDemoActivity([], NOW)).every((n) => n === 0)).toBe(true);
    expect(await store.listAppHostedDevices(c.app.id)).toHaveLength(1);
  });
}
