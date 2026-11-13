import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { listDemoApps } from "@/lib/demo/apps";
import { cleanDemoActivity } from "@/lib/demo/cleanup";
import { DEMO_SIGN_IN, demoIdOf } from "@/lib/demo/constants";
import { demoBusMark, demoBusNow, demoBusRun, demoBusTrip, NAKHLA_SCHOOL } from "@/lib/demo/school-bus";
import { SCHOOL_STAFF } from "@/lib/demo/school";
import { setupDemoApps } from "@/lib/demo/setup";
import { connectorFor } from "@/lib/hosted/connectors";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { busBoard, tripStops } from "@/lib/school/bus";
import { PLAN_INFO } from "@/lib/plans";
import { schoolSettingsOf } from "@/lib/school/settings";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

/**
 * Studio's school demo, Nakhla School, beyond the lessons: everything a
 * school has in the app, each with sample data (lib/demo/school-life.ts),
 * and the bus going round its trip on the map (lib/demo/school-bus.ts).
 */

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const HOUR = 3_600_000;
const MINUTE = 60_000;

describe("Nakhla School, the whole school in the demo", { timeout: 30_000 }, () => {
  let store: MemoryStore;
  let now: Date;

  beforeEach(async () => {
    clearPlatformSettingsCache();
    ({ store } = await setupClient());
    now = NOW;
    await setupDemoApps({
      store,
      encryptionKey: KEY,
      putBlob: async () => undefined,
      assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
      platformUrl: "https://yallapp.test",
      contact: { whatsapp: "+90 544 673 19 42", email: "info@yallapp.test" },
      actorEmail: "admin@yallapp.test",
      now: NOW,
    });
    // 126 Nineteen demo apps now, Safra's flights twelve weeks ahead among them: the hook gets the tests' time.
  }, 30_000);

  async function school() {
    const app = (await listDemoApps(store, { fresh: true })).find((a) => demoIdOf(a) === "school")!;
    const connector = connectorFor(app, KEY, { store, assetUrl: (id) => id, platformUrl: "https://yallapp.test" }) ?? undefined;
    const context = (): HostedContext => ({ store, app, active: true, now, ip: "203.0.113.20", secret: "test-hosted-secret", sender: new LogSender(), push: false, assetUrl: (id) => id, platformUrl: "https://yallapp.test", connector, plan: PLAN_INFO.business, chat: { storage: null, chunkBytes: 1024, onMessage: async () => undefined } });
    const names: Record<string, string> = { students: "student_id", homework: "homework_id", classes: "class_id", children: "student_id", payslips: "payslip_id", leave: "leave_id", slips: "slip_id", routes: "route_id", runs: "run_id" };
    const go = async <T = Record<string, unknown>>(method: string, route: string, body?: unknown, token: string | null = null): Promise<T> => {
      const [path, search] = route.split("?");
      const parts = path!.split("/").filter(Boolean);
      const result = await handleHosted(context(), { method, path: parts, query: new URLSearchParams({ platform: "android", app_version: "1.0.0", ...Object.fromEntries(new URLSearchParams(search ?? "")) }), body, token });
      expectContract(method, `/${parts.map((part, i) => (/^\d+$/.test(part) ? `{${names[parts[i - 1]!]}}` : part)).join("/")}`, result);
      expect(result.status, `${method} ${route}`).toBeLessThan(300);
      return result.body as T;
    };
    // The app's access token lasts a quarter of an hour: signed in again when the test's clock moves further.
    const signIn = async () => {
      const requested = await go<{ request_id: string }>("POST", "/auth/otp/request", { country_code: DEMO_SIGN_IN.countryCode, phone: DEMO_SIGN_IN.number });
      return (await go<{ access_token: string }>("POST", "/auth/otp/verify", { request_id: requested.request_id, code: DEMO_SIGN_IN.code, device: DEVICE })).access_token;
    };
    const token = await signIn();
    const me = await go<{ students: { id: number; name: string }[] }>("GET", "/school/me", undefined, token);
    const [lina, adam] = me.students as [{ id: number; name: string }, { id: number; name: string }];
    return { app, go, token, lina, adam, signIn };
  }

  it("has staff, behaviour, check-ins, the calendar, exams, the syllabus and the teachers' reports", async () => {
    const { app, go, token, lina, adam } = await school();
    expect((await store.listSchoolPeople(app.id)).filter((p) => p.role === "staff").map((p) => p.name).sort()).toEqual(SCHOOL_STAFF.map((s) => s.name).sort());

    const behaviour = await go<{ items: { category: string; points: number }[] }>("GET", `/school/students/${lina.id}/behaviour`, undefined, token);
    expect(behaviour.items.length).toBeGreaterThanOrEqual(4);
    expect(JSON.stringify(behaviour)).toContain("Helping others");

    const checkins = await go<{ counts: { present: number; late: number } }>("GET", `/school/students/${lina.id}/checkins`, undefined, token);
    expect(checkins.counts.present).toBeGreaterThan(3);

    const calendar = await go<{ events: { title: string }[]; exams: unknown[] }>("GET", "/school/calendar", undefined, token);
    const titles = JSON.stringify(calendar);
    for (const title of ["Parents' evening, Grade 5", "Sports day", "Science museum trip", "Zoo trip", "Staff meeting"]) expect(titles).toContain(title);

    const exams = await go<{ upcoming: unknown[] }>("GET", `/school/students/${lina.id}/exams`, undefined, token);
    expect(exams.upcoming).toHaveLength(4);
    expect((await go<{ upcoming: unknown[] }>("GET", `/school/students/${adam.id}/exams`, undefined, token)).upcoming).toHaveLength(2);

    const card = await go("GET", `/school/students/${lina.id}/report-card`, undefined, token);
    expect(JSON.stringify(card)).toContain("Maths");
    const reports = await go<{ items: unknown[] }>("GET", `/school/students/${lina.id}/reports`, undefined, token);
    expect(JSON.stringify(reports)).toContain("Practise measuring angles");

    // As Ms. Mona: the syllabus of her class, the behaviour categories and her reports, one sent back by the school.
    const classroom = await go<{ classes: { id: number; name: string }[] }>("GET", "/classroom/me", undefined, token);
    const fiveA = classroom.classes.find((c) => c.name === "Grade 5 A")!;
    const syllabus = await go("GET", `/classroom/classes/${fiveA.id}/syllabus`, undefined, token);
    expect(JSON.stringify(syllabus)).toContain("Measuring angles");
    expect(JSON.stringify(await go("GET", "/classroom/behaviour/categories", undefined, token))).toContain("Late to class");
    const mine = JSON.stringify(await go("GET", "/classroom/reports", undefined, token));
    expect(mine).toContain("Weekly class report");
    expect(mine).toContain("returned");
  });

  it("has Ms. Mona's work: payslips, leave, an advance and the staff's news; and messages with the parents", async () => {
    const { app, go, token, lina } = await school();
    const payslips = await go<{ items: { month: string; status: string }[] }>("GET", "/staff/payslips", undefined, token);
    expect(payslips.items.map((p) => p.status)).toEqual(["paid", "paid"]);
    expect(JSON.stringify(payslips)).toContain("advance");
    const leave = await go<{ items: { status: string }[] }>("GET", "/staff/leave", undefined, token);
    expect(leave.items.map((l) => l.status).sort()).toEqual(["approved", "pending"]);
    expect(JSON.stringify(await go("GET", "/staff/announcements", undefined, token))).toContain("Staff meeting tomorrow");
    expect(JSON.stringify(await go("GET", "/staff/me", undefined, token))).toContain("Maths teacher");
    // Everyone who works there has a salary and last month's paid payslip.
    const workers = (await store.listSchoolPeople(app.id)).filter((p) => p.role === "teacher" || p.role === "staff");
    expect(await store.listSchoolSalaries(app.id)).toHaveLength(workers.length);

    // Rania and Ms. Nadia about Adam; Ms. Mona and Omar's father.
    expect(await go("GET", "/school/messages", undefined, token)).toMatchObject({ enabled: true, with: "parents_students" });
    const conversations = JSON.stringify(await go("GET", "/chat/conversations", undefined, token));
    expect(conversations).toContain("Nadia Fahmy");
    expect(conversations).toContain("Khaled Khalil");

    // The parent's area: one slip signed, one to sign, today's pick-up note; the library.
    const slips = JSON.stringify(await go("GET", "/parent/slips", undefined, token));
    expect(slips).toContain("Sports day photos");
    expect(slips).toContain("Science museum trip");
    expect(JSON.stringify(await go("GET", `/parent/children/${lina.id}/pickup`, undefined, token))).toContain("Samir Haddad");
    const loans = await go<{ current: { book: { title: string } }[] }>("GET", "/school/library/loans", undefined, token);
    expect(loans.current.map((l) => l.book.title).sort()).toEqual(["Charlotte's Web", "Kalila wa Dimna"]);
    expect((await store.listSchoolBookHolds(app.id)).map((h) => h.status)).toEqual(["waiting"]);
  });

  it("shows the bus going round the trip of the time of day, nearing Lina's stop, and its past trips", async () => {
    const { app, go, lina, signIn } = await school();
    let token = await signIn();
    // 13:00 in Cairo: the afternoon trip, from the school to Lina's stop first.
    const bus = async () =>
      (await go<{ items: { trip: string; run: { status: string; bus: { lat: number; lng: number } | null; student: { status: string | null }; eta_minutes: number | null } | null }[] }>("GET", `/school/students/${lina.id}/bus`, undefined, token)).items;
    const first = (await bus()).find((t) => t.trip === "afternoon")!;
    expect(first.run).toMatchObject({ status: "running" });
    expect(first.run!.bus).not.toBeNull();
    expect((await bus()).find((t) => t.trip === "morning")!.run).toBeNull();
    // A little later the bus has moved.
    const positions = [];
    for (let m = 0; m < 30; m += 2) {
      now = new Date(NOW.getTime() + m * MINUTE);
      if (m % 10 === 0) token = await signIn();
      positions.push((await bus()).find((t) => t.trip === "afternoon")!.run);
    }
    expect(new Set(positions.map((r) => `${r!.bus?.lat},${r!.bus?.lng}`)).size).toBeGreaterThan(5);
    // On the bus with an ETA, then off at her stop.
    expect(positions.some((r) => r!.student.status === "boarded" && r!.eta_minutes !== null)).toBe(true);
    expect(positions.some((r) => r!.student.status === "off")).toBe(true);

    // The morning trip in the morning, coming towards Lina's stop.
    now = new Date("2026-10-13T04:10:00Z");
    token = await signIn();
    const morning = (await bus()).find((t) => t.trip === "morning")!;
    expect(morning.run).toMatchObject({ status: "running" });

    // The dashboard's live map shows it too; and the five days before, both trips, with who got on and off.
    const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
    const board = await busBoard(store, app, settings, now);
    expect(board).toHaveLength(1);
    expect(board[0]!.position).not.toBeNull();
    const history = await store.listSchoolBusRuns(app.id, { status: "done" });
    expect(history).toHaveLength(10);
    expect((await store.listSchoolBusMarks(app.id, { runId: history[0]!.id })).length).toBeGreaterThan(0);

    // A trip Ms. Mona starts is the real one.
    now = NOW;
    token = await signIn();
    const routes = await go<{ items: { id: number }[] }>("GET", "/school/bus/routes", undefined, token);
    await go("POST", `/school/bus/routes/${routes.items[0]!.id}/runs`, { trip: "afternoon" }, token);
    expect((await bus()).find((t) => t.trip === "afternoon")!.run!.bus).toBeNull();
  });

  it("moves along the trip's stops and marks the riders as the bus reaches them", () => {
    const stops = [
      { id: 1, appId: "a", routeId: 1, name: "A", lat: 29.9786, lng: 31.2387, morningMinute: 420, afternoonMinute: 855, position: 0 },
      { id: 2, appId: "a", routeId: 1, name: "B", lat: 29.9668, lng: 31.2502, morningMinute: 430, afternoonMinute: 845, position: 1 },
      { id: 3, appId: "a", routeId: 1, name: "C", lat: 29.9602, lng: 31.2569, morningMinute: 440, afternoonMinute: 835, position: 2 },
    ];
    expect(demoBusTrip(7 * 60)).toBe("morning");
    expect(demoBusTrip(13 * 60)).toBe("afternoon");
    expect(tripStops(stops, "afternoon").map((s) => s.id)).toEqual([3, 2, 1]);
    const seen = new Set<string>();
    let reachedAll = false;
    for (let m = 0; m < 40; m++) {
      const at = new Date(NOW.getTime() + m * MINUTE);
      const now = demoBusNow(stops, "morning", at)!;
      seen.add(`${now.lat.toFixed(5)},${now.lng.toFixed(5)}`);
      if (now.atSchool) {
        reachedAll = true;
        expect(now.lat).toBeCloseTo(NAKHLA_SCHOOL.lat, 3);
        expect(now.reached.map((r) => r.stopId)).toEqual([1, 2, 3]);
      }
      const made = demoBusRun("a", { id: 1, driverId: 9 }, stops, "morning", "2026-10-12", at)!;
      const mark = demoBusMark(made.run, made.bus, { studentId: 5, stopId: 3 });
      if (made.run.passedStopIds.includes(3)) expect(mark?.status).toMatch(/boarded|off/);
      else expect(mark).toBeUndefined();
    }
    expect(reachedAll).toBe(true);
    expect(seen.size).toBeGreaterThan(15);
  });

  it("is made again the next day, dated from it, and what a visitor sent or signed goes", async () => {
    const { app } = await school();
    const before = await store.listSchoolBehaviour(app.id);
    const later = new Date(NOW.getTime() + 25 * HOUR);
    await cleanDemoActivity(store, later);
    const after = await store.listSchoolBehaviour(app.id);
    expect(after).toHaveLength(before.length);
    expect(after.every((n) => n.createdAt.getTime() > before[before.length - 1]!.createdAt.getTime() - 30 * 24 * HOUR)).toBe(true);
    // Payslips aren't made twice; the leave waiting for an answer is still one.
    const month = (await store.listSchoolPayslips(app.id, { statuses: ["paid"] })).length;
    await cleanDemoActivity(store, new Date(later.getTime() + 25 * HOUR));
    expect((await store.listSchoolPayslips(app.id, { statuses: ["paid"] })).length).toBe(month);
    expect((await store.listSchoolLeave(app.id, { statuses: ["pending"] })).length).toBe(1);
    // The check-ins of the new days are added, the older ones kept.
    expect((await store.listSchoolCheckins(app.id, {})).length).toBeGreaterThan(0);
  });
});

