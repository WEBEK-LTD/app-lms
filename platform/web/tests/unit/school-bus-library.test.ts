import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type SchoolBusStop } from "@/lib/data/types";
import "@/lib/hosted/pages/sources";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { PLAN_INFO } from "@/lib/plans";
import { busEta, isNear, metersBetween, stopsAhead, tripStops } from "@/lib/school/bus";
import { parseBusSettings, parseRouteForm, parseStopForm, tickedStudents, tripsOf } from "@/lib/school/bus-forms";
import { bookShelf, lendCopy, reminderDue, returnCopy, runLibraryReminders } from "@/lib/school/library";
import { isbnOf, madeCodes, parseBooksCsv, parseCopyCodes, parseLibrarySettings } from "@/lib/school/library-forms";
import { schoolSettingsOf } from "@/lib/school/settings";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;

const stop = (id: number, position: number, lat: number, lng: number, morning: number | null, afternoon: number | null): SchoolBusStop => ({
  id,
  appId: "a",
  routeId: 1,
  name: `Stop ${id}`,
  lat,
  lng,
  morningMinute: morning,
  afternoonMinute: afternoon,
  position,
});

describe("113.10 the bus's stops, how soon, and its forms", () => {
  // Three stops about 1.1 km apart along a street, north to south.
  const stops = [stop(1, 1, 30.07, 31.24, 420, 900), stop(2, 2, 30.06, 31.24, 430, 890), stop(3, 3, 30.05, 31.24, 440, null)];

  it("orders each trip's stops by their time, and counts how soon through the stops before", () => {
    expect(tripStops(stops, "morning").map((s) => s.id)).toEqual([1, 2, 3]);
    // The afternoon trip comes back the other way and leaves out stop 3.
    expect(tripStops(stops, "afternoon").map((s) => s.id)).toEqual([2, 1]);
    expect(Math.round(metersBetween(stops[0]!, stops[1]!))).toBe(1112);
    expect(stopsAhead(stops, [1]).map((s) => s.id)).toEqual([2, 3]);
    const at = { lat: 30.075, lng: 31.24 };
    const first = busEta(at, stops, [], 1)!;
    const third = busEta(at, stops, [], 3)!;
    expect(first.meters).toBeGreaterThan(700);
    expect(first.meters).toBeLessThan(760);
    // Two more legs and two stops on the way.
    expect(third.minutes).toBeGreaterThan(first.minutes + 2);
    expect(busEta(at, stops, [1], 1)).toBeNull();
    expect(isNear({ meters: 900, minutes: 3 }, { nearBy: "distance", nearMeters: 1000, nearMinutes: 5 })).toBe(true);
    expect(isNear({ meters: 900, minutes: 7 }, { nearBy: "minutes", nearMeters: 1000, nearMinutes: 5 })).toBe(false);
  });

  it("checks routes, stops, bulk assignments and the near setting", () => {
    expect(parseRouteForm({ name: "Route 1", plate: "abc 123", capacity: "30", driverId: "4", supervisorId: "5", active: "on" }, [4, 5])).toEqual({
      ok: true,
      value: { name: "Route 1", plate: "ABC 123", capacity: 30, driverId: 4, supervisorId: 5, active: true },
    });
    expect(parseRouteForm({ name: "", plate: "X", capacity: "0", driverId: "4", supervisorId: "4" }, [4])).toMatchObject({
      ok: false,
      errors: { name: expect.any(String), capacity: expect.any(String), supervisorId: "The supervisor is someone other than the driver." },
    });
    expect(parseRouteForm({ name: "R", plate: "X", capacity: "10", driverId: "9" }, [4])).toMatchObject({ ok: false, errors: { driverId: "Choose one of your teachers or staff." } });
    expect(parseStopForm({ name: "Nile St", place: "https://www.google.com/maps/@30.0444,31.2357,15z", morning: "07:10", afternoon: "" })).toEqual({
      ok: true,
      value: { name: "Nile St", lat: 30.0444, lng: 31.2357, morningMinute: 430, afternoonMinute: null },
    });
    expect(parseStopForm({ name: "Nile St", place: "somewhere", morning: "", afternoon: "" })).toMatchObject({ ok: false, errors: { place: expect.any(String), morning: expect.any(String) } });
    expect(tripsOf("both")).toEqual(["morning", "afternoon"]);
    expect(tripsOf("evening")).toBeNull();
    expect(tickedStudents({ "student-3": "on", "student-9": "on" }, [3, 4])).toEqual([3]);
    expect(parseBusSettings({ nearBy: "distance", nearMeters: "800", nearMinutes: "5" })).toEqual({ ok: true, value: { nearBy: "distance", nearMeters: 800, nearMinutes: 5 } });
    expect(parseBusSettings({ nearBy: "soon", nearMeters: "5", nearMinutes: "0" })).toMatchObject({ ok: false });
  });
});

describe("113.11 the library's forms and reminders", () => {
  it("checks books, codes, settings and a sheet of books", () => {
    expect(isbnOf("978-0-15-601219-5")).toBe("9780156012195");
    expect(isbnOf("0-306-40615-X")).toBe("030640615X");
    expect(isbnOf("12345")).toBeNull();
    expect(parseCopyCodes("lp-1, LP-2\nlp-1")).toEqual({ ok: true, codes: ["LP-1", "LP-2"] });
    expect(parseCopyCodes("  ")).toMatchObject({ ok: false });
    expect(madeCodes(12, new Set(["B12-1"]), 2)).toEqual(["B12-2", "B12-3"]);
    expect(parseLibrarySettings({ loanDays: "14", holdDays: "3", maxLoans: "2", remindDays: "1" })).toEqual({ ok: true, value: { loanDays: 14, holdDays: 3, maxLoans: 2, remindDays: 1 } });
    expect(parseLibrarySettings({ loanDays: "0", holdDays: "99", maxLoans: "2", remindDays: "1" })).toMatchObject({ ok: false, errors: { loanDays: expect.any(String), holdDays: expect.any(String) } });
    const parsed = parseBooksCsv("title,author,isbn,shelf,category,language,copies,codes\nThe Little Prince,Saint-Exupéry,9780156012195,A3,Stories,English,,LP-1|LP-2\nKalila wa Dimna,,,B1,Stories,Arabic,3,\n,Nobody,,,,,,\nBad,Someone,123,,,,,");
    if (!parsed.ok) throw new Error(parsed.message);
    expect(parsed.rows.map((r) => [r.line, r.book.title, r.book.author, r.book.isbn, r.copies, r.codes])).toEqual([
      [2, "The Little Prince", "Saint-Exupéry", "9780156012195", 2, ["LP-1", "LP-2"]],
      [3, "Kalila wa Dimna", "Unknown", null, 3, []],
    ]);
    expect(parsed.problems).toEqual(["Line 4: Enter the book's title.", "Line 5: Enter the ISBN's 10 or 13 digits, or leave it empty."]);
    expect(parseBooksCsv("author\nX")).toMatchObject({ ok: false });
  });

  it("reminds before the due date once, and every few days once overdue", () => {
    const loan = { id: 1, appId: "a", bookId: 1, copyId: 1, personId: 1, lentAt: NOW, dueOn: "2026-11-10", returnedAt: null, dueToldOn: null, overdueToldOn: null };
    const library = { loanDays: 14, holdDays: 3, maxLoans: 3, remindDays: 2 };
    expect(reminderDue(loan, "2026-11-07", library)).toBeNull();
    expect(reminderDue(loan, "2026-11-08", library)).toBe("soon");
    expect(reminderDue({ ...loan, dueToldOn: "2026-11-08" }, "2026-11-09", library)).toBeNull();
    expect(reminderDue(loan, "2026-11-11", library)).toBe("overdue");
    expect(reminderDue({ ...loan, overdueToldOn: "2026-11-11" }, "2026-11-13", library)).toBeNull();
    expect(reminderDue({ ...loan, overdueToldOn: "2026-11-11" }, "2026-11-14", library)).toBe("overdue");
    expect(reminderDue({ ...loan, returnedAt: NOW }, "2026-11-14", library)).toBeNull();
  });
});

describe("113.10 and 113.11 the bus and the library on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let plan = PLAN_INFO.pro;
  let classA: number;
  let omar: number;
  let laila: number;
  let parent: number;
  let driver: number;
  let supervisor: number;
  let route: number;
  let stops: SchoolBusStop[];

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "school");
    app = {
      ...base,
      backend: "hosted",
      appName: "Nile School",
      websiteDoneAt: NOW,
      connector: { kind: "school" },
      timeZone: "Africa/Cairo",
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "EGP" },
    };
    await store.createApp(app);
    const person = async (input: { role: "student" | "parent" | "teacher"; name: string; phone: string; classId?: number | null; code?: string }) => {
      const made = await store.createSchoolPerson({ appId: app.id, role: input.role, name: input.name, phone: input.phone, email: null, classId: input.classId ?? null, code: input.code ?? null, photoAssetId: null, active: true }, NOW);
      if (!made.ok) throw new Error("duplicate");
      return made.person.id;
    };
    classA = (await store.saveSchoolClass({ appId: app.id, id: null, name: "Grade 5 A", grade: null, homeroomTeacherId: null }, NOW))!.id;
    omar = await person({ role: "student", name: "Omar Hassan", phone: "+201001000001", classId: classA, code: "1023" });
    laila = await person({ role: "student", name: "Laila Hassan", phone: "+201001000002", classId: classA, code: "1024" });
    parent = await person({ role: "parent", name: "Hassan Ali", phone: "+201001000009" });
    await store.setSchoolChildren(app.id, parent, [omar, laila]);
    driver = await person({ role: "teacher", name: "Sami Driver", phone: "+201110000001" });
    supervisor = await person({ role: "teacher", name: "Mona Adel", phone: "+201110000002" });
    route = (await store.saveSchoolBusRoute({ id: null, appId: app.id, name: "Route 1", plate: "ABC 123", capacity: 30, driverId: driver, supervisorId: supervisor, active: true }, NOW))!.id;
    stops = [];
    for (const [i, at] of [
      [30.07, 420, 900],
      [30.06, 430, 890],
      [30.05, 440, 880],
    ].entries()) {
      stops.push((await store.saveSchoolBusStop({ id: null, appId: app.id, routeId: route, name: `Stop ${i + 1}`, lat: at[0]!, lng: 31.24, morningMinute: at[1]!, afternoonMinute: at[2]! }))!);
    }
    await store.setSchoolBusRiders(app.id, [
      { studentId: omar, trip: "morning", stop: stops[2]! },
      { studentId: omar, trip: "afternoon", stop: stops[2]! },
      { studentId: laila, trip: "morning", stop: stops[1]! },
    ]);
    await store.saveSchoolSettings(app.id, { ...schoolSettingsOf(null, app), bus: { nearBy: "minutes", nearMeters: 1000, nearMinutes: 5 } });
    sender = new LogSender();
    now = new Date("2026-11-02T05:00:00Z");
    plan = { ...PLAN_INFO.pro, features: [...PLAN_INFO.pro.features, "school"] };
  });

  const context = async (): Promise<HostedContext> => {
    const fresh = (await store.getAppById(app.id))!;
    return { store, app: fresh, active: true, plan, now, ip: "203.0.113.9", secret: "test-hosted-secret", sender, push: false, assetUrl: ASSETS, platformUrl: "https://yallapp.test", connector: null };
  };

  async function call(method: string, route: string, options: { query?: Record<string, string>; params?: string[]; token?: string; body?: unknown } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(await context(), { method, path: concrete.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone: string, name: string) {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+20${phone}`)!, device: { ...DEVICE, id: `install-${phone}` } } });
    if ((verified.body as { access_token?: string }).access_token) return verified.body as { access_token: string };
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device: { ...DEVICE, id: `install-${phone}` } } });
    return registered.body as { access_token: string };
  }

  const later = (seconds: number) => (now = new Date(now.getTime() + seconds * 1000));
  const inbox = async (token: string) => ((await call("GET", "/me/notifications", { token })).body as { items: { title: string; body: string; type: string }[] }).items;

  it("the driver runs the morning trip: the parent sees the bus coming, is told it is near, and when each child gets on and off", async () => {
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { school: Record<string, unknown> };
    expect(config.school).toMatchObject({ bus: true, library: false, map: { tiles_url: null } });
    const crew = await signUp("1110000001", "Sami");
    const dad = await signUp("1001000009", "Hassan");
    expect((await call("GET", "/me", { token: crew.access_token })).body).toMatchObject({ roles: ["teacher", "bus"] });
    expect((await call("GET", "/me", { token: dad.access_token })).body).toMatchObject({ roles: ["parent"] });
    expect((await call("GET", "/school/bus/routes", { token: dad.access_token })).body).toMatchObject({ code: "not_bus_crew" });

    // Before the trip: the stops and Omar's, no bus yet.
    const before = (await call("GET", "/school/students/{student_id}/bus", { params: [String(omar)], token: dad.access_token })).body as { items: { trip: string; stop: { name: string; time: string }; stops: unknown[]; run: unknown }[] };
    expect(before.items.map((t) => [t.trip, t.stop.name, t.stop.time, t.stops.length, t.run])).toEqual([
      ["morning", "Stop 3", "07:20", 3, null],
      ["afternoon", "Stop 3", "14:40", 3, null],
    ]);

    const routes = (await call("GET", "/school/bus/routes", { token: crew.access_token })).body as { items: { id: number; role: string; drives: boolean; trips: { trip: string; riders: number; run: unknown }[] }[] };
    expect(routes.items).toEqual([expect.objectContaining({ id: route, role: "driver", drives: true, trips: [expect.objectContaining({ trip: "morning", riders: 2, run: null }), expect.objectContaining({ trip: "afternoon", riders: 1, run: null })] })]);
    const started = await call("POST", "/school/bus/routes/{route_id}/runs", { params: [String(route)], token: crew.access_token, body: { trip: "morning" } });
    expect(started.status).toBe(201);
    const run = started.body as { id: number; stops: { name: string; riders: { student: { name: string }; status: string | null }[] }[] };
    expect(run.stops.map((s) => [s.name, s.riders.map((r) => r.student.name)])).toEqual([
      ["Stop 1", []],
      ["Stop 2", ["Laila Hassan"]],
      ["Stop 3", ["Omar Hassan"]],
    ]);
    // The supervisor marks students but doesn't drive.
    const mona = await signUp("1110000002", "Mona");
    expect((await call("PUT", "/school/bus/runs/{run_id}/location", { params: [String(run.id)], token: mona.access_token, body: { lat: 30.08, lng: 31.24 } })).status).toBe(403);
    expect((await call("POST", "/school/bus/routes/{route_id}/runs", { params: [String(route)], token: crew.access_token, body: { trip: "afternoon" } })).body).toMatchObject({ code: "trip_running" });

    // Far from the stops: the parent sees the bus and how soon, nobody is told yet.
    expect((await call("PUT", "/school/bus/runs/{run_id}/location", { params: [String(run.id)], token: crew.access_token, body: { lat: 30.1, lng: 31.24 } })).status).toBe(204);
    const live = (await call("GET", "/school/students/{student_id}/bus", { params: [String(omar)], token: dad.access_token })).body as { items: { run: { bus: { lat: number }; eta_minutes: number; distance_m: number } }[] };
    expect(live.items[0]!.run).toMatchObject({ bus: { lat: 30.1 }, eta_minutes: expect.any(Number), distance_m: expect.any(Number) });
    expect(live.items[0]!.run.eta_minutes).toBeGreaterThan(10);
    expect(await inbox(dad.access_token)).toEqual([]);

    // At stop 1, then near stop 2: Laila's parent is told (once), not yet Omar's.
    later(30);
    await call("PUT", "/school/bus/runs/{run_id}/location", { params: [String(run.id)], token: crew.access_token, body: { lat: 30.0701, lng: 31.24 } });
    later(30);
    await call("PUT", "/school/bus/runs/{run_id}/location", { params: [String(run.id)], token: crew.access_token, body: { lat: 30.068, lng: 31.24 } });
    later(30);
    await call("PUT", "/school/bus/runs/{run_id}/location", { params: [String(run.id)], token: crew.access_token, body: { lat: 30.067, lng: 31.24 } });
    const told = await inbox(dad.access_token);
    expect(told.filter((n) => n.title === "The bus is near").map((n) => n.body)).toEqual(["Laila Hassan's bus is about 4 min from Stop 2."]);
    expect(told.every((n) => n.type === "school_bus")).toBe(true);

    // Laila gets on (once told), Omar is absent: no near push for him afterwards.
    await call("PUT", "/school/bus/runs/{run_id}/riders/{student_id}", { params: [String(run.id), String(laila)], token: mona.access_token, body: { status: "boarded" } });
    await call("PUT", "/school/bus/runs/{run_id}/riders/{student_id}", { params: [String(run.id), String(laila)], token: mona.access_token, body: { status: "boarded" } });
    await call("PUT", "/school/bus/runs/{run_id}/riders/{student_id}", { params: [String(run.id), String(omar)], token: crew.access_token, body: { status: "absent" } });
    later(30);
    await call("PUT", "/school/bus/runs/{run_id}/location", { params: [String(run.id)], token: crew.access_token, body: { lat: 30.0601, lng: 31.24 } });
    later(30);
    await call("PUT", "/school/bus/runs/{run_id}/location", { params: [String(run.id)], token: crew.access_token, body: { lat: 30.055, lng: 31.24 } });
    const marked = await call("PUT", "/school/bus/runs/{run_id}/riders/{student_id}", { params: [String(run.id), String(laila)], token: crew.access_token, body: { status: "off" } });
    expect(marked.body).toMatchObject({ status: "off", boarded_at: expect.any(String), off_at: expect.any(String) });
    const titles = (await inbox(dad.access_token)).map((n) => n.title);
    expect(titles.filter((t) => t === "The bus is near")).toHaveLength(1);
    expect(titles).toContain("Laila Hassan got on the bus");
    expect(titles).toContain("Laila Hassan got off the bus");
    expect(titles.filter((t) => t.includes("got on"))).toHaveLength(1);
    // Someone not on the trip can't be marked.
    expect((await call("PUT", "/school/bus/runs/{run_id}/riders/{student_id}", { params: [String(run.id), String(parent)], token: crew.access_token, body: { status: "boarded" } })).status).toBe(404);

    const detail = (await call("GET", "/school/bus/runs/{run_id}", { params: [String(run.id)], token: crew.access_token })).body as { counts: Record<string, number>; stops: { passed: boolean }[] };
    expect(detail.counts).toEqual({ riders: 2, boarded: 0, off: 1, absent: 1 });
    expect(detail.stops.map((s) => s.passed)).toEqual([true, true, false]);
    const ended = (await call("POST", "/school/bus/runs/{run_id}/end", { params: [String(run.id)], token: crew.access_token })).body;
    expect(ended).toMatchObject({ status: "done", ended_at: expect.any(String), bus: null });
    expect((await call("PUT", "/school/bus/runs/{run_id}/location", { params: [String(run.id)], token: crew.access_token, body: { lat: 30.05, lng: 31.24 } })).body).toMatchObject({ code: "trip_ended" });
    const after = (await call("GET", "/school/students/{student_id}/bus", { params: [String(omar)], token: dad.access_token })).body as { items: { run: { status: string; student: { status: string } } | null }[] };
    expect(after.items[0]!.run).toMatchObject({ status: "done", student: { status: "absent" } });
    // Started again the same day, it goes on.
    expect((await call("POST", "/school/bus/routes/{route_id}/runs", { params: [String(route)], token: crew.access_token, body: { trip: "morning" } })).body).toMatchObject({ id: run.id, status: "running" });
  });

  it("a trip left running ends the next day, and families of another route see nothing of it", async () => {
    const crew = await signUp("1110000001", "Sami");
    // Started yesterday and never ended.
    const { run } = await store.startSchoolBusRun({ appId: app.id, routeId: route, trip: "afternoon", date: "2026-11-01", status: "running", startedAt: new Date("2026-11-01T12:00:00Z"), endedAt: null, startedBy: driver, lat: 30.06, lng: 31.24, locatedAt: new Date("2026-11-01T12:30:00Z"), passedStopIds: [], toldStopIds: [] });
    expect((await call("GET", "/school/bus/runs/{run_id}", { params: [String(run.id)], token: crew.access_token })).body).toMatchObject({ status: "done", ended_at: "2026-11-01T12:30:00.000Z" });
    const other = await store.createSchoolPerson({ appId: app.id, role: "student", name: "Other", phone: "+201001000077", email: null, classId: classA, code: null, photoAssetId: null, active: true }, NOW);
    if (!other.ok) throw new Error("other");
    const kid = await signUp("1001000077", "Other");
    expect((await call("GET", "/school/students/{student_id}/bus", { params: [String(other.person.id)], token: kid.access_token })).body).toEqual({ items: [] });
    expect((await call("GET", "/school/students/{student_id}/bus", { params: [String(omar)], token: kid.access_token })).status).toBe(404);
    expect((await call("GET", "/school/bus/runs/{run_id}", { params: [String(run.id)], token: kid.access_token })).status).toBe(403);
  });

  it("students find books, reserve them, borrow at the desk; the parent follows the loans and both are reminded", async () => {
    const book = await store.createSchoolBook({ appId: app.id, title: "The Little Prince", author: "Saint-Exupéry", isbn: "9780156012195", coverAssetId: null, shelf: "A3", category: "Stories", language: "English", description: null, file: null, createdAt: NOW, updatedAt: NOW });
    await store.createSchoolBook({ appId: app.id, title: "Atlas of Egypt", author: "Survey", isbn: null, coverAssetId: null, shelf: "C1", category: "Geography", language: "Arabic", description: null, file: null, createdAt: NOW, updatedAt: NOW });
    const copy = await store.createSchoolBookCopy({ appId: app.id, bookId: book.id, code: "LP-1", note: null, createdAt: NOW });
    if (!copy.ok) throw new Error("copy");
    expect((await store.createSchoolBookCopy({ appId: app.id, bookId: book.id, code: "lp-1", note: null, createdAt: NOW })).ok).toBe(false);
    await store.saveSchoolSettings(app.id, { ...schoolSettingsOf(null, app), library: { loanDays: 7, holdDays: 2, maxLoans: 1, remindDays: 2 } });

    const kid = await signUp("1001000001", "Omar");
    const dad = await signUp("1001000009", "Hassan");
    const config = (await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { school: Record<string, unknown> };
    expect(config.school).toMatchObject({ library: true });
    const found = (await call("GET", "/school/library/books", { query: { q: "prince" }, token: kid.access_token })).body as { items: { title: string; copies: number; available: number }[]; categories: string[] };
    expect(found.items).toEqual([expect.objectContaining({ title: "The Little Prince", copies: 1, available: 1, ebook: false })]);
    expect(found.categories).toEqual(["Geography", "Stories"]);
    expect(((await call("GET", "/school/library/books", { query: { category: "geography" }, token: kid.access_token })).body as { total: number }).total).toBe(1);

    // Omar reserves it: held at once (one copy on the shelf).
    const held = await call("POST", "/school/library/books/{book_id}/hold", { params: [String(book.id)], token: kid.access_token, body: {} });
    expect(held.status).toBe(201);
    expect(held.body).toMatchObject({ status: "ready", person: { id: omar, name: "Omar Hassan" }, expires_at: expect.any(String) });
    expect((await call("POST", "/school/library/books/{book_id}/hold", { params: [String(book.id)], token: kid.access_token, body: {} })).body).toMatchObject({ code: "already_held" });
    expect((await inbox(kid.access_token)).map((n) => n.title)).toEqual(["Your book is waiting"]);
    // The parent reserves for Laila: she waits, the only copy is held for Omar.
    expect((await call("POST", "/school/library/books/{book_id}/hold", { params: [String(book.id)], token: dad.access_token, body: {} })).body).toMatchObject({ code: "invalid_request" });
    const waiting = (await call("POST", "/school/library/books/{book_id}/hold", { params: [String(book.id)], token: dad.access_token, body: { person_id: laila } })).body as { id: number; status: string };
    expect(waiting.status).toBe("waiting");
    const detail = (await call("GET", "/school/library/books/{book_id}", { params: [String(book.id)], token: dad.access_token })).body as { available: number; waiting: number; holds: { status: string }[]; borrowers: { name: string }[] };
    expect(detail).toMatchObject({ available: 0, waiting: 1 });
    expect(detail.holds.map((h) => h.status).sort()).toEqual(["ready", "waiting"]);
    expect(detail.borrowers.map((b) => b.name)).toEqual(["Omar Hassan", "Laila Hassan"]);

    // At the desk: Laila can't take Omar's held copy; Omar can.
    const deps = { store, app: (await store.getAppById(app.id))!, now };
    const lailaP = (await store.getSchoolPerson(app.id, laila))!;
    const omarP = (await store.getSchoolPerson(app.id, omar))!;
    expect(await lendCopy(deps, copy.copy, book, lailaP)).toMatchObject({ ok: false, message: expect.stringContaining("held for someone") });
    const lent = await lendCopy(deps, copy.copy, book, omarP);
    if (!lent.ok) throw new Error(lent.message);
    expect(lent.loan.dueOn).toBe("2026-11-09");
    const loans = (await call("GET", "/school/library/loans", { token: dad.access_token })).body as { current: { person: { name: string }; copy_code: string; due_on: string; overdue: boolean }[]; holds: { status: string }[] };
    expect(loans.current).toEqual([expect.objectContaining({ person: { id: omar, name: "Omar Hassan" }, copy_code: "LP-1", due_on: "2026-11-09", overdue: false })]);
    expect(loans.holds.map((h) => h.status)).toEqual(["waiting"]);

    // Two days before: reminded once; overdue after; the student and the parent both.
    const send = async () => runLibraryReminders({ store, now });
    now = new Date("2026-11-07T08:00:00Z");
    expect(await send()).toEqual({ looked: 1, told: 1 });
    expect(await send()).toEqual({ looked: 1, told: 0 });
    now = new Date("2026-11-10T08:00:00Z");
    expect(await send()).toEqual({ looked: 1, told: 1 });
    const dadAgain = await signUp("1001000009", "Hassan");
    const kidAgain = await signUp("1001000001", "Omar");
    expect((await inbox(dadAgain.access_token)).map((n) => n.title)).toEqual(["A library book is overdue", "A library book is due soon", "Your book is waiting"]);
    expect((await inbox(kidAgain.access_token)).map((n) => n.type)).toEqual(["school_library", "school_library", "school_library"]);

    // Returned: the copy goes to Laila, and her family is told.
    const back = await returnCopy({ store, app: deps.app, now }, copy.copy, book);
    expect(back?.returnedAt).toEqual(now);
    const shelf = await bookShelf(store, app.id, book.id, now);
    expect([...shelf.heldFor.values()].map((h) => h.personId)).toEqual([laila]);
    expect((await inbox(dadAgain.access_token))[0]!.title).toBe("Your book is waiting");
    // She cancels; it is free again.
    expect((await call("DELETE", "/school/library/holds/{hold_id}", { params: [String(waiting.id)], token: dadAgain.access_token })).status).toBe(204);
    expect((await bookShelf(store, app.id, book.id, now)).free).toHaveLength(1);
    const history = (await call("GET", "/school/library/loans", { query: { person_id: String(omar) }, token: kidAgain.access_token })).body as { history: { returned_at: string }[] };
    expect(history.history).toHaveLength(1);
    expect((await call("GET", "/school/library/loans", { query: { person_id: String(laila) }, token: kidAgain.access_token })).status).toBe(404);
  });
});
