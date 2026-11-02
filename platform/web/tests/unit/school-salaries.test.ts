import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { verifySignedUrl } from "@/lib/crypto/signed-url";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, DEFAULT_HOSTED_SETTINGS, type App, type SchoolPayslip, type SchoolSalaryAdvance } from "@/lib/data/types";
import "@/lib/hosted/pages/sources";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { PLAN_INFO, type PlanInfo } from "@/lib/plans";
import { renderReceiptPdf } from "@/lib/receipts/pdf";
import {
  advanceBalance,
  advanceLines,
  answerLine,
  changeDraft,
  daysOfPay,
  finalisePayslip,
  lockMonth,
  makeMonthSheets,
  monthBefore,
  monthOpenForSheets,
  monthTotals,
  monthWorkingDays,
  officeLine,
  paidState,
  payslipsCsv,
  payslipTotals,
  recordPayment,
  removePayment,
  reopenMonth,
  salarySettingsOf,
  suggestedDeductions,
  type SalaryDeps,
} from "@/lib/school/salaries";
import { payslipLinkKey } from "@/lib/school/salaries-hosted";
import { parseAdvanceForm, parseLineForm, parsePayForm, parseSalaryForm, parseSalarySettings } from "@/lib/school/salary-forms";
import { lineName, payslipDocument } from "@/lib/school/salary-pdf";
import { schoolSettingsOf } from "@/lib/school/settings";
import { teamCan } from "@/lib/team/permissions";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
const SECRET = "test-hosted-secret";

const sheet = (over: Partial<SchoolPayslip> = {}): SchoolPayslip => ({
  id: 1,
  appId: "a",
  personId: 1,
  month: "2026-10",
  personName: "Mona Adel",
  role: "teacher",
  jobTitle: null,
  department: null,
  currency: "EGP",
  baseCents: 10_500_00,
  allowances: [{ name: "Transport", cents: 600_00 }],
  lines: [],
  attendance: null,
  netCents: 11_100_00,
  status: "draft",
  payments: [],
  paidCents: 0,
  note: null,
  finalAt: null,
  finalBy: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

const record = { id: "r", method: "cash" as const, paidOn: "2026-10-05", note: null, receiptAssetId: null, by: "Office", at: NOW.toISOString() };
const advance = (over: Partial<SchoolSalaryAdvance> = {}): SchoolSalaryAdvance => ({
  id: 7,
  appId: "a",
  personId: 1,
  personName: "Mona Adel",
  currency: "EGP",
  amountCents: 3000_00,
  instalmentCents: 1000_00,
  startsMonth: "2026-10",
  given: { ...record, cents: 3000_00 },
  repayments: [],
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

describe("113.12 the sums, the suggestions and the advances", () => {
  it("counts the net from the base, the allowances and the lines the office accepted", () => {
    const lines = [
      officeLine("bonus", "Exam supervision", 400_00),
      officeLine("deduction", "Uniform", 150_00),
      { ...officeLine("deduction", "", 1000_00), source: "absence" as const, status: "suggested" as const },
      { ...officeLine("deduction", "", 250_00), source: "lateness" as const, status: "dismissed" as const },
      { ...officeLine("bonus", "", 0), kind: "advance" as const, source: "advance" as const, cents: 1000_00, advanceId: 7 },
    ];
    expect(payslipTotals(sheet({ lines }))).toEqual({ base: 10_500_00, allowances: 600_00, bonuses: 400_00, deductions: 150_00, advances: 1000_00, gross: 11_500_00, net: 10_350_00 });
    expect(paidState(sheet({ status: "final", netCents: 100_00, paidCents: 40_00 }))).toBe("part_paid");
    expect(paidState(sheet({ status: "paid", netCents: 100_00, paidCents: 100_00 }))).toBe("paid");
    expect(paidState(sheet({ status: "final", netCents: 0, paidCents: 0 }))).toBe("paid");
    expect(paidState(sheet({ status: "draft", netCents: 0 }))).toBe("unpaid");
  });

  it("suggests nothing until the school turns its rules on, then a day's pay per absence and part of a day every N late arrivals", () => {
    expect(monthWorkingDays("2026-10", [7, 1, 2, 3, 4])).toBe(21);
    expect(monthWorkingDays("2026-02", [1, 2, 3, 4, 5])).toBe(20);
    expect(daysOfPay({ baseCents: 10_500_00, allowancesCents: 600_00, workingDays: 21, withAllowances: false }, 1)).toBe(500_00);
    expect(daysOfPay({ baseCents: 10_500_00, allowancesCents: 630_00, workingDays: 21, withAllowances: true }, 2)).toBe(1060_00);
    const days = { workingDays: 21, days: 21, present: 18, late: 4, leftEarly: 2, absent: 2, excused: 0, leave: 1 };
    const pay = { baseCents: 10_500_00, allowancesCents: 600_00 };
    const off = salarySettingsOf(schoolSettingsOf(null, { timeZone: "Africa/Cairo", catalogSettings: DEFAULT_CATALOG_SETTINGS } as App));
    expect(off.absence.on || off.lateness.on).toBe(false);
    expect(suggestedDeductions(off, pay, days)).toEqual([]);
    const on = { ...off, absence: { on: true, days: 1 }, lateness: { on: true, every: 3, days: 0.5, countEarly: false } };
    expect(suggestedDeductions(on, pay, days).map((l) => [l.source, l.status, l.cents, l.count])).toEqual([
      ["absence", "suggested", 1000_00, 2],
      ["lateness", "suggested", 250_00, 4],
    ]);
    // Leaving early counted too: six times, twice three.
    expect(suggestedDeductions({ ...on, lateness: { ...on.lateness, countEarly: true } }, pay, days).find((l) => l.source === "lateness")).toMatchObject({ cents: 500_00, count: 6 });
    // No check-in, nothing to count.
    expect(suggestedDeductions(on, pay, null)).toEqual([]);
  });

  it("takes an advance back in instalments from its first month, never more than is left", () => {
    const a = advance();
    expect(advanceLines([a], [], { id: null, month: "2026-09", currency: "EGP" })).toEqual([]);
    expect(advanceLines([a], [], { id: null, month: "2026-10", currency: "EGP" }).map((l) => [l.kind, l.status, l.cents, l.advanceId])).toEqual([["advance", "accepted", 1000_00, 7]]);
    // Another currency is left to the office.
    expect(advanceLines([a], [], { id: null, month: "2026-10", currency: "USD" })).toEqual([]);
    const taken = (month: string, cents: number, status: SchoolPayslip["status"] = "final") =>
      sheet({ id: Number(month.slice(5)), month, status, lines: [{ ...officeLine("deduction", "", cents), kind: "advance", source: "advance", advanceId: 7 }] });
    const sheets = [taken("2026-10", 1000_00), taken("2026-11", 1000_00), taken("2026-12", 1000_00, "draft")];
    // A draft's instalment doesn't count yet; 200 paid back at the office does.
    const back = advance({ repayments: [{ ...record, cents: 200_00 }] });
    expect(advanceBalance(back, sheets)).toEqual({ fromPayslips: 2000_00, repaid: 200_00, left: 800_00 });
    expect(advanceLines([back], sheets, { id: 12, month: "2026-12", currency: "EGP" })[0]!.cents).toBe(800_00);
    expect(advanceLines([back], [...sheets.slice(0, 2), taken("2026-12", 800_00)], { id: 1, month: "2027-01", currency: "EGP" })).toEqual([]);
  });

  it("checks the forms", () => {
    expect(parseSalaryForm({ monthly: "10,500", currency: "EGP", allowanceName1: "Transport", allowanceAmount1: "600", allowanceName2: "", allowanceAmount2: "" })).toEqual({
      ok: true,
      value: { monthlyCents: 10_500_00, currency: "EGP", allowances: [{ name: "Transport", cents: 600_00 }], note: null },
    });
    expect(parseSalaryForm({ monthly: "0", currency: "XYZ", allowanceName1: "", allowanceAmount1: "50" })).toMatchObject({
      ok: false,
      errors: { monthly: expect.any(String), currency: "Choose the currency.", allowanceName1: "Name each allowance, like Transport." },
    });
    expect(parseSalarySettings({ absenceOn: "on", absenceDays: "1", lateOn: "on", lateEvery: "3", lateDays: "0.5", countEarly: "on" })).toEqual({
      ok: true,
      value: { absence: { on: true, days: 1 }, lateness: { on: true, every: 3, days: 0.5, countEarly: true }, dayPayWithAllowances: false },
    });
    expect(parseSalarySettings({ absenceDays: "0.3", lateEvery: "0", lateDays: "40" })).toMatchObject({ ok: false, errors: { absenceDays: expect.any(String), lateEvery: expect.any(String), lateDays: expect.any(String) } });
    expect(parseLineForm({ kind: "bonus", label: "Exam supervision", amount: "400" })).toEqual({ ok: true, value: { kind: "bonus", label: "Exam supervision", cents: 400_00 } });
    expect(parsePayForm({ amount: "100", method: "cheque", paidOn: "2026-12-01" }, "2026-11-02")).toMatchObject({ ok: false, errors: { method: expect.any(String), paidOn: "The day can't be after today." } });
    expect(parseAdvanceForm({ amount: "3000", method: "bank", paidOn: "2026-10-05", instalment: "1000", startsMonth: "2026-10" }, "2026-11-02")).toEqual({
      ok: true,
      value: { cents: 3000_00, method: "bank", paidOn: "2026-10-05", note: null, instalmentCents: 1000_00, startsMonth: "2026-10" },
    });
    expect(parseAdvanceForm({ amount: "300", method: "cash", paidOn: "2026-10-05", instalment: "500", startsMonth: "2026-09" }, "2026-11-02")).toMatchObject({
      ok: false,
      errors: { instalment: expect.any(String), startsMonth: "It is taken back from the month it was given or later." },
    });
    expect(monthBefore("2026-01")).toBe("2025-12");
    expect(monthBefore("2026-11", -2)).toBe("2027-01");
    expect(monthOpenForSheets("2026-12", "2026-11")).toBe(false);
    expect(monthOpenForSheets("2024-11", "2026-11")).toBe(true);
    expect(monthOpenForSheets("2024-10", "2026-11")).toBe(false);
  });

  it("only the team members given Salaries see them", () => {
    expect(teamCan({ role: "owner", areas: [], appIds: null }, "salaries")).toBe(true);
    expect(teamCan({ role: "manager", areas: [], appIds: null }, "salaries")).toBe(true);
    expect(teamCan({ role: "staff", areas: ["salaries"], appIds: null }, "salaries")).toBe(true);
    expect(teamCan({ role: "staff", areas: ["orders", "messages"], appIds: null }, "salaries")).toBe(false);
  });
});

describe("113.12 a school's month of salaries, recorded by hand", () => {
  let store: MemoryStore;
  let app: App;
  let other: App;
  let sender: LogSender;
  let now: Date;
  let mona: number;
  let samir: number;
  let karim: number;
  const plan: PlanInfo = { ...PLAN_INFO.pro, features: [...PLAN_INFO.pro.features, "school"] };
  const deps = (): SalaryDeps => ({ store, app, now, by: "Office" });

  const schoolApp = async (clientId: string, name: string): Promise<App> => {
    const base = newApp(clientId, null, NOW, "school");
    const made: App = {
      ...base,
      backend: "hosted",
      appName: name,
      websiteDoneAt: NOW,
      connector: { kind: "school" },
      timeZone: "Africa/Cairo",
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" },
      catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "EGP" },
    };
    await store.createApp(made);
    return made;
  };

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = await schoolApp(client.id, "Nile School");
    other = await schoolApp(client.id, "Delta School");
    const added = new Date("2026-09-01T08:00:00Z");
    const person = async (target: App, role: "teacher" | "staff" | "student", name: string, phone: string) => {
      const made = await store.createSchoolPerson({ appId: target.id, role, name, phone, email: null, classId: null, code: null, photoAssetId: null, active: true, jobTitle: role === "staff" ? "Nurse" : null }, added);
      if (!made.ok) throw new Error("duplicate");
      return made.person.id;
    };
    mona = await person(app, "teacher", "Mona Adel", "+201110000002");
    samir = await person(app, "staff", "Samir Fawzy", "+201002223366");
    await person(app, "staff", "Nadia New", "+201002223377");
    karim = await person(other, "staff", "Karim Other", "+201009998888");
    const settings = schoolSettingsOf(null, app);
    await store.saveSchoolSettings(app.id, { ...settings, checkin: { ...(settings.checkin ?? {}), on: true, methods: "qr", place: null, days: [7, 1, 2, 3, 4], students: { startMinute: 450, lateMinute: 480, endMinute: 840, earlyMinute: 825 }, staff: { startMinute: 420, lateMinute: 450, endMinute: 900, earlyMinute: 885 }, parentAlerts: false, gateKey: 1, since: null } });
    // Mona's October at the gate: absent on the 6th and 20th, on approved leave on the 13th, late four times.
    const late = [4, 5, 11, 12];
    for (let day = 1; day <= 31; day += 1) {
      const date = `2026-10-${String(day).padStart(2, "0")}`;
      if (![7, 1, 2, 3, 4].includes(((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1) || [6, 13, 20].includes(day)) continue;
      for (const personId of [mona, samir]) {
        await store.saveSchoolCheckin({ appId: app.id, personId, role: personId === mona ? "teacher" : "staff", date, inAt: new Date(`${date}T05:00:00Z`), inMethod: "qr", outAt: new Date(`${date}T12:00:00Z`), outMethod: "qr", late: personId === mona && late.includes(day), leftEarly: false, mark: null, corrections: [], updatedAt: NOW });
      }
    }
    for (const day of [6, 13, 20]) {
      const date = `2026-10-${String(day).padStart(2, "0")}`;
      await store.saveSchoolCheckin({ appId: app.id, personId: samir, role: "staff", date, inAt: new Date(`${date}T05:00:00Z`), inMethod: "qr", outAt: null, outMethod: null, late: false, leftEarly: false, mark: null, corrections: [], updatedAt: NOW });
    }
    await store.createSchoolLeave({ appId: app.id, personId: mona, kind: "sick", startsOn: "2026-10-13", endsOn: "2026-10-13", note: null, file: null, status: "approved", answer: null, answeredBy: "Office", answeredAt: NOW, createdAt: NOW, updatedAt: NOW });
    await store.saveSchoolSalary({ appId: app.id, personId: mona, monthlyCents: 10_500_00, currency: "EGP", allowances: [{ name: "Transport", cents: 600_00 }], note: null, updatedBy: "Office", updatedAt: NOW });
    await store.saveSchoolSalary({ appId: app.id, personId: samir, monthlyCents: 6000_00, currency: "EGP", allowances: [], note: null, updatedBy: "Office", updatedAt: NOW });
    await store.saveSchoolSalary({ appId: other.id, personId: karim, monthlyCents: 9999_00, currency: "EGP", allowances: [], note: null, updatedBy: "Them", updatedAt: NOW });
    sender = new LogSender();
    now = new Date("2026-11-02T08:00:00Z");
  });

  it("keeps a salary to the school's own teachers and staff", async () => {
    // Another school's person, or a student, gets none.
    expect(await store.saveSchoolSalary({ appId: app.id, personId: karim, monthlyCents: 1, currency: "EGP", allowances: [], note: null, updatedBy: "x", updatedAt: NOW })).toBe(false);
    const student = await store.createSchoolPerson({ appId: app.id, role: "student", name: "Omar", phone: "+201001000001", email: null, classId: null, code: null, photoAssetId: null, active: true }, NOW);
    expect(await store.saveSchoolSalary({ appId: app.id, personId: student.ok ? student.person.id : 0, monthlyCents: 1, currency: "EGP", allowances: [], note: null, updatedBy: "x", updatedAt: NOW })).toBe(false);
    expect((await store.listSchoolSalaries(app.id)).map((s) => s.personId).sort()).toEqual([mona, samir].sort());
    // The person removed, their salary goes; their payslips stay with their name.
    await makeMonthSheets(deps(), "2026-10");
    await store.deleteSchoolPerson(app.id, samir);
    expect(await store.getSchoolSalary(app.id, samir)).toBeNull();
    expect((await store.listSchoolPayslips(app.id, { month: "2026-10" })).map((p) => p.personName)).toEqual(["Mona Adel", "Samir Fawzy"]);
  });

  it("makes the month's sheets with suggestions the office answers, locks the month and records the payments", async () => {
    // The rules are off: no suggestion, only the days counted.
    let made = await makeMonthSheets(deps(), "2026-10");
    expect(made).toEqual({ ok: true, value: { made: 2, updated: 0, noSalary: ["Nadia New"] } });
    let [monaSheet] = await store.listSchoolPayslips(app.id, { personId: mona });
    expect(monaSheet!.attendance).toEqual({ workingDays: 21, days: 21, present: 18, late: 4, leftEarly: 0, absent: 2, excused: 0, leave: 1 });
    expect(monaSheet!.lines).toEqual([]);
    expect(monaSheet!.netCents).toBe(11_100_00);

    // The school turns them on; making the sheets again brings the drafts up to date.
    const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
    await store.saveSchoolSettings(app.id, { ...settings, salaries: { absence: { on: true, days: 1 }, lateness: { on: true, every: 3, days: 0.5, countEarly: false }, dayPayWithAllowances: false } });
    made = await makeMonthSheets(deps(), "2026-10");
    expect(made).toMatchObject({ ok: true, value: { made: 0, updated: 2 } });
    [monaSheet] = await store.listSchoolPayslips(app.id, { personId: mona });
    expect(monaSheet!.lines.map((l) => [l.source, l.status, l.cents])).toEqual([
      ["absence", "suggested", 1000_00],
      ["lateness", "suggested", 250_00],
    ]);
    // Waiting suggestions don't count.
    expect(monaSheet!.netCents).toBe(11_100_00);

    // The office accepts the absences at a lower amount, dismisses the lateness and adds a bonus.
    const [absence, lateness] = monaSheet!.lines;
    let changed = await changeDraft(deps(), monaSheet!, (lines) => answerLine(lines, absence!.id, { accept: true, cents: 500_00 }));
    expect(changed.ok).toBe(true);
    changed = await changeDraft(deps(), (changed as { value: SchoolPayslip }).value, (lines) => answerLine(lines, lateness!.id, { accept: false }));
    changed = await changeDraft(deps(), (changed as { value: SchoolPayslip }).value, (lines) => [...lines, officeLine("bonus", "Exam supervision", 400_00)]);
    expect(changed).toMatchObject({ ok: true, value: { netCents: 11_000_00 } });
    // Its old copy is refused: someone changed it meanwhile.
    expect(await changeDraft(deps(), monaSheet!, (lines) => lines)).toEqual({ ok: false, code: "changed" });
    // A deduction that takes the pay below nothing is refused.
    expect(await changeDraft(deps(), (changed as { value: SchoolPayslip }).value, (lines) => [...lines, officeLine("deduction", "Too much", 20_000_00)])).toEqual({ ok: false, code: "negative" });

    // Made again, the office's answers stay as it left them.
    await makeMonthSheets(deps(), "2026-10");
    [monaSheet] = await store.listSchoolPayslips(app.id, { personId: mona });
    expect(monaSheet!.lines.map((l) => [l.source, l.status, l.cents])).toEqual([
      ["absence", "accepted", 500_00],
      ["lateness", "dismissed", 250_00],
      ["office", "accepted", 400_00],
    ]);
    expect(monaSheet!.lines[0]!.suggestedCents).toBe(1000_00);

    // Samir's draft is left with nothing suggested to answer; locking makes both final.
    const locked = await lockMonth(deps(), "2026-10");
    expect(locked).toEqual({ ok: true, value: { final: 2, negative: [] } });
    expect((await store.listSchoolPayslips(app.id, { month: "2026-10" })).map((p) => p.status)).toEqual(["final", "final"]);
    expect(await makeMonthSheets(deps(), "2026-10")).toEqual({ ok: false, code: "month_locked" });
    [monaSheet] = await store.listSchoolPayslips(app.id, { personId: mona });
    expect(await changeDraft(deps(), monaSheet!, (lines) => lines)).toEqual({ ok: false, code: "not_draft" });

    // Paid by hand in two parts: cash, then a bank transfer.
    expect(await recordPayment(deps(), monaSheet!, { cents: 11_000_01, method: "cash", paidOn: "2026-10-30", note: null, receiptAssetId: null })).toEqual({ ok: false, code: "too_much" });
    const first = await recordPayment(deps(), monaSheet!, { cents: 5000_00, method: "cash", paidOn: "2026-10-30", note: "Half now", receiptAssetId: null });
    expect(first).toMatchObject({ ok: true, value: { status: "final", paidCents: 5000_00 } });
    const second = await recordPayment(deps(), (first as { value: SchoolPayslip }).value, { cents: 6000_00, method: "bank", paidOn: "2026-11-01", note: null, receiptAssetId: null });
    expect(second).toMatchObject({ ok: true, value: { status: "paid", paidCents: 11_000_00 } });
    expect((second as { value: SchoolPayslip }).value.payments.map((p) => [p.method, p.by])).toEqual([
      ["cash", "Office"],
      ["bank", "Office"],
    ]);

    // Opened again: Samir's goes back to a draft, Mona's (paid) stays final.
    expect(await reopenMonth(deps(), "2026-10")).toEqual({ reopened: 1, paid: 1 });
    expect((await store.listSchoolPayslips(app.id, { month: "2026-10" })).map((p) => [p.personName, p.status])).toEqual([
      ["Mona Adel", "paid"],
      ["Samir Fawzy", "draft"],
    ]);
    // A payment written by mistake taken off: the sheet is final again, with what's left to pay.
    const paid = (second as { value: SchoolPayslip }).value;
    const off = await removePayment(deps(), paid, paid.payments[1]!.id);
    expect(off).toMatchObject({ ok: true, value: { status: "final", paidCents: 5000_00 } });

    // The month's totals and its CSV file.
    const sheets = await store.listSchoolPayslips(app.id, { month: "2026-10" });
    expect(monthTotals(sheets)).toEqual([{ currency: "EGP", people: 2, gross: 17_500_00, deductions: 500_00, advances: 0, net: 17_000_00, paid: 5000_00, left: 12_000_00 }]);
    const csv = payslipsCsv(sheets);
    expect(csv.split("\r\n")[0]).toBe("Payslip,Name,Role,Job,Department,Currency,Base,Allowances,Bonuses,Deductions,Advances taken back,Net,Paid,Left to pay,Status,Paid by,Paid on");
    expect(csv).toContain(`PS-2026-10-${paid.id},Mona Adel,Teacher,,,EGP,10500.00,600.00,400.00,500.00,0.00,11000.00,5000.00,6000.00,Final,Cash,2026-10-30`);
    expect(csv).toContain("Samir Fawzy,Staff member,Nurse,,EGP,6000.00,0.00,0.00,0.00,0.00,6000.00,0.00,6000.00,Draft,,");
  });

  it("takes an advance back month by month until it is paid back", async () => {
    await store.createSchoolSalaryAdvance({ ...advance({ personId: samir, personName: "Samir Fawzy", amountCents: 2500_00, instalmentCents: 1000_00, startsMonth: "2026-09" }), appId: app.id } as Omit<SchoolSalaryAdvance, "id">);
    const taken: number[] = [];
    for (const month of ["2026-09", "2026-10", "2026-11"]) {
      now = new Date(`${month}-28T08:00:00Z`);
      await makeMonthSheets(deps(), month);
      const [s] = await store.listSchoolPayslips(app.id, { personId: samir, month });
      taken.push(payslipTotals(s!).advances);
      const final = await finalisePayslip(deps(), s!);
      expect(final.ok).toBe(true);
    }
    expect(taken).toEqual([1000_00, 1000_00, 500_00]);
    now = new Date("2026-12-28T08:00:00Z");
    await makeMonthSheets(deps(), "2026-12");
    const [december] = await store.listSchoolPayslips(app.id, { personId: samir, month: "2026-12" });
    expect(december!.lines.filter((l) => l.kind === "advance")).toEqual([]);
    const [a] = await store.listSchoolSalaryAdvances(app.id, { personId: samir });
    expect(advanceBalance(a!, await store.listSchoolPayslips(app.id, { personId: samir })).left).toBe(0);
  });

  it("a payslip's PDF in English and Arabic", async () => {
    await makeMonthSheets(deps(), "2026-10");
    const [s] = await store.listSchoolPayslips(app.id, { personId: mona });
    const doc = payslipDocument({ lang: "en", app, payslip: { ...s!, status: "final", lines: [officeLine("bonus", "Exam supervision", 400_00)] } });
    expect(doc.title).toBe("Payslip");
    expect(doc.items.map((i) => i.name)).toEqual(["Base salary", "Transport", "Exam supervision"]);
    expect(doc.totals.find((t) => t.strong)?.label).toBe("Net pay");
    expect(lineName("ar", { source: "absence", label: "", count: 2, kind: "deduction" })).toBe("الغياب (2)");
    for (const lang of ["en", "ar", "tr"] as const) {
      const pdf = await renderReceiptPdf(payslipDocument({ lang, app, payslip: s! }));
      expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    }
  });

  // The hosted API: each person sees only their own final payslips.

  const context = async (): Promise<HostedContext> => {
    const fresh = (await store.getAppById(app.id))!;
    return { store, app: fresh, active: true, plan, now, ip: "203.0.113.9", secret: SECRET, sender, push: false, assetUrl: ASSETS, platformUrl: "https://yallapp.test", connector: null };
  };

  async function call(method: string, route: string, options: { params?: string[]; token?: string; lang?: string } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const headers = new Headers(options.lang ? { "accept-language": options.lang } : {});
    const result = await handleHosted(await context(), { method, path: concrete.split("/").filter(Boolean), query: new URLSearchParams(), body: {}, token: options.token ?? null, headers });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone: string, name: string) {
    now = new Date(now.getTime() + 61_000);
    const asked = await handleHosted(await context(), { method: "POST", path: ["auth", "otp", "request"], query: new URLSearchParams(), body: { country_code: "+20", phone }, token: null });
    const requestId = (asked.body as { request_id: string }).request_id;
    const verified = await handleHosted(await context(), { method: "POST", path: ["auth", "otp", "verify"], query: new URLSearchParams(), body: { request_id: requestId, code: sender.sent.get(`+20${phone}`)!, device: { ...DEVICE, id: `install-${phone}` } }, token: null });
    if ((verified.body as { access_token?: string }).access_token) return (verified.body as { access_token: string }).access_token;
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await handleHosted(await context(), { method: "POST", path: ["auth", "register"], query: new URLSearchParams(), body: { signup_token: signupToken, name, device: { ...DEVICE, id: `install-${phone}` } }, token: null });
    return (registered.body as { access_token: string }).access_token;
  }

  it("the app: only one's own payslips once final, with a short-lived signed PDF link", async () => {
    await store.createSchoolSalaryAdvance({ ...advance({ personId: mona, startsMonth: "2026-10" }), appId: app.id } as Omit<SchoolSalaryAdvance, "id">);
    await makeMonthSheets(deps(), "2026-10");
    const monaToken = await signUp("1110000002", "Mona");
    const samirToken = await signUp("1002223366", "Samir");
    // Drafts are never shown.
    const empty = (await call("GET", "/staff/payslips", { token: monaToken })).body as { items: unknown[]; advances: { left: { amount: string } }[] };
    expect(empty.items).toEqual([]);
    expect(empty.advances.map((a) => a.left.amount)).toEqual(["3000.00"]);
    await lockMonth(deps(), "2026-10");
    const [monaSheet] = await store.listSchoolPayslips(app.id, { personId: mona });
    const [samirSheet] = await store.listSchoolPayslips(app.id, { personId: samir });

    const list = (await call("GET", "/staff/payslips", { token: monaToken, lang: "ar" })).body as { total: number; items: { id: number; net: { amount: string }; deductions: { source: string }[]; status: string; pdf_url: string }[]; advances: { left: { amount: string } }[] };
    expect(list.total).toBe(1);
    expect(list.items[0]).toMatchObject({ id: monaSheet!.id, net: { amount: "10100.00" }, deductions: [{ source: "advance" }], status: "unpaid" });
    // The instalment on a final payslip counts.
    expect(list.advances.map((a) => a.left.amount)).toEqual(["2000.00"]);
    const link = new URL(list.items[0]!.pdf_url);
    expect(link.pathname).toBe(`/a/${app.id}/payslips/${monaSheet!.id}/pdf`);
    expect(link.searchParams.get("lang")).toBe("ar");
    const key = payslipLinkKey(SECRET, app.id);
    expect(verifySignedUrl(link, key, now)).toBe("valid");
    expect(verifySignedUrl(link, key, new Date(now.getTime() + 16 * 60_000))).toBe("expired");
    // Another school's key, or another payslip's address with this signature, fails.
    expect(verifySignedUrl(link, payslipLinkKey(SECRET, other.id), now)).toBe("invalid");
    const moved = new URL(link);
    moved.pathname = `/a/${app.id}/payslips/${samirSheet!.id}/pdf`;
    expect(verifySignedUrl(moved, key, now)).toBe("invalid");

    // Mona never sees Samir's payslip, nor he hers.
    expect((await call("GET", "/staff/payslips/{payslip_id}", { params: [String(samirSheet!.id)], token: monaToken })).status).toBe(404);
    expect((await call("GET", "/staff/payslips/{payslip_id}", { params: [String(monaSheet!.id)], token: samirToken })).status).toBe(404);
    const own = await call("GET", "/staff/payslips/{payslip_id}", { params: [String(samirSheet!.id)], token: samirToken });
    expect(own.body).toMatchObject({ name: "Samir Fawzy", job_title: "Nurse", net: { amount_formatted: "E£6,000.00" } });
    // Who recorded a payment and the receipts' photos stay in the dashboard.
    await recordPayment(deps(), samirSheet!, { cents: 6000_00, method: "cash", paidOn: "2026-11-01", note: null, receiptAssetId: "receipt-photo" });
    const paid = JSON.stringify((await call("GET", "/staff/payslips/{payslip_id}", { params: [String(samirSheet!.id)], token: samirToken })).body);
    expect(paid).toContain('"status":"paid"');
    expect(paid).not.toContain("Office");
    expect(paid).not.toContain("receipt-photo");

    // A parent or a student isn't staff.
    const student = await store.createSchoolPerson({ appId: app.id, role: "student", name: "Omar", phone: "+201001000001", email: null, classId: null, code: null, photoAssetId: null, active: true }, NOW);
    expect(student.ok).toBe(true);
    const omarToken = await signUp("1001000001", "Omar");
    expect((await call("GET", "/staff/payslips", { token: omarToken })).body).toMatchObject({ code: "not_staff" });
  });

  it("one school never reaches another's salaries", async () => {
    await makeMonthSheets(deps(), "2026-10");
    await makeMonthSheets({ ...deps(), app: other }, "2026-10");
    const theirs = (await store.listSchoolPayslips(other.id))[0]!;
    expect(await store.getSchoolPayslip(app.id, theirs.id)).toBeNull();
    expect(await store.updateSchoolPayslip(app.id, theirs.id, { note: "x" }, { statuses: ["draft"] })).toBe(false);
    expect(await store.deleteSchoolPayslip(app.id, theirs.id)).toBe(false);
    expect(await store.getSchoolSalary(app.id, karim)).toBeNull();
    expect((await store.listSchoolPayslips(app.id)).map((p) => p.personName).sort()).toEqual(["Mona Adel", "Samir Fawzy"]);
    const theirAdvance = await store.createSchoolSalaryAdvance({ ...advance({ personId: karim }), appId: other.id } as Omit<SchoolSalaryAdvance, "id">);
    expect(await store.getSchoolSalaryAdvance(app.id, theirAdvance.id)).toBeNull();
    expect(await store.updateSchoolSalaryAdvance(app.id, theirAdvance.id, { instalmentCents: 1 }, theirAdvance.updatedAt)).toBe(false);
    await store.deleteSchoolSalaryAdvance(app.id, theirAdvance.id);
    expect(await store.getSchoolSalaryAdvance(other.id, theirAdvance.id)).not.toBeNull();
    // Locking one school's month leaves the other's open.
    await lockMonth(deps(), "2026-10");
    expect(await store.getSchoolSalaryMonth(other.id, "2026-10")).toBeNull();
    expect((await store.getSchoolPayslip(other.id, theirs.id))!.status).toBe("draft");
  });
});
