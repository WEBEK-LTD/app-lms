import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { newApp } from "@/lib/app/setup";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import { DEFAULT_CATALOG_SETTINGS, type App, type SchoolPayslip } from "@/lib/data/types";
import { lockMonth, makeMonthSheets, officeLine, recordPayment, reopenMonth } from "@/lib/school/salaries";
import { KEY } from "./helpers";

/**
 * 113.12 Salaries on MySQL or MariaDB (migration 0109): a salary only for
 * the school's own teachers and staff, one payslip per person and month,
 * a sheet changed only in its status and as it was read, drafts removed,
 * months locked, advances, and a person removed (their salary goes, their
 * payslips stay). Runs only with YALLAPP_TEST_DATABASE_URL (a database with
 * the migrations applied).
 */
const url = process.env.YALLAPP_TEST_DATABASE_URL;
const NOW = new Date("2026-11-02T08:00:00.000Z");

describe.skipIf(!url)("113.12 salaries on MySQL", () => {
  const pool = createPool({ url: url!, ssl: "disabled" });
  const store = new MysqlStore(pool);
  afterAll(async () => {
    await pool.end();
  });

  async function school(): Promise<{ app: App; teacher: number; staff: number; student: number }> {
    const { client } = await registerClient(store, { name: "Nile", email: `school-${randomUUID()}@mysql.test`, whatsapp: "+201000000199", siteUrl: "", password: null }, NOW);
    await activateClient(store, { clientId: client.id, plan: "pro", activeUntil: new Date(NOW.getTime() + 30 * 86_400_000), paymentNote: "" }, KEY, NOW);
    const base = newApp(client.id, null, NOW, "school");
    const app: App = { ...base, backend: "hosted", appName: "Nile School", connector: { kind: "school" }, timeZone: "Africa/Cairo", catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "EGP" } };
    await store.createApp(app);
    const person = async (role: "teacher" | "staff" | "student", name: string) => {
      const made = await store.createSchoolPerson({ appId: app.id, role, name, phone: `+2010${Math.floor(Math.random() * 1e8).toString().padStart(8, "0")}`, email: null, classId: null, code: null, photoAssetId: null, active: true }, new Date("2026-09-01T08:00:00Z"));
      if (!made.ok) throw new Error("person");
      return made.person.id;
    };
    return { app, teacher: await person("teacher", "Mona Adel"), staff: await person("staff", "Samir Fawzy"), student: await person("student", "Omar Hassan") };
  }

  it("keeps salaries, payslips, months and advances, each to its school", async () => {
    const a = await school();
    const b = await school();
    const salary = { appId: a.app.id, personId: a.teacher, monthlyCents: 10_500_00, currency: "EGP" as const, allowances: [{ name: "Transport", cents: 600_00 }], note: null, updatedBy: "Office", updatedAt: NOW };
    expect(await store.saveSchoolSalary(salary)).toBe(true);
    // Saved again, it is changed, not added.
    expect(await store.saveSchoolSalary({ ...salary, monthlyCents: 11_000_00 })).toBe(true);
    expect(await store.saveSchoolSalary({ ...salary, personId: a.student })).toBe(false);
    expect(await store.saveSchoolSalary({ ...salary, appId: b.app.id })).toBe(false);
    expect(await store.listSchoolSalaries(a.app.id)).toEqual([{ ...salary, monthlyCents: 11_000_00 }]);
    expect(await store.getSchoolSalary(b.app.id, a.teacher)).toBeNull();
    await store.saveSchoolSalary({ ...salary, personId: a.staff, monthlyCents: 6000_00, allowances: [] });

    // The month's sheets made, locked, paid by hand, opened again.
    const deps = { store, app: a.app, now: NOW, by: "Office" };
    expect(await makeMonthSheets(deps, "2026-10")).toEqual({ ok: true, value: { made: 2, updated: 0, noSalary: [] } });
    const sheets = await store.listSchoolPayslips(a.app.id, { month: "2026-10" });
    expect(sheets.map((p) => [p.personName, p.status, p.netCents, p.allowances])).toEqual([
      ["Mona Adel", "draft", 11_600_00, [{ name: "Transport", cents: 600_00 }]],
      ["Samir Fawzy", "draft", 6000_00, []],
    ]);
    const mona = sheets[0]!;
    const duplicate = await store.createSchoolPayslip({ ...mona, id: undefined } as unknown as Omit<SchoolPayslip, "id">);
    expect(duplicate).toEqual({ ok: false, reason: "duplicate" });
    // Changed only as it was read and while a draft.
    const later = new Date(NOW.getTime() + 1000);
    expect(await store.updateSchoolPayslip(a.app.id, mona.id, { lines: [officeLine("bonus", "Exam", 400_00)], netCents: 12_000_00, updatedAt: later }, { statuses: ["draft"], updatedAt: mona.updatedAt })).toBe(true);
    expect(await store.updateSchoolPayslip(a.app.id, mona.id, { netCents: 1 }, { statuses: ["draft"], updatedAt: mona.updatedAt })).toBe(false);
    expect(await store.updateSchoolPayslip(a.app.id, mona.id, { netCents: 1 }, { statuses: ["final"] })).toBe(false);
    expect(await store.updateSchoolPayslip(b.app.id, mona.id, { netCents: 1 }, { statuses: ["draft"] })).toBe(false);
    expect((await store.getSchoolPayslip(a.app.id, mona.id))!.lines.map((l) => [l.label, l.cents])).toEqual([["Exam", 400_00]]);
    expect(await store.getSchoolPayslip(b.app.id, mona.id)).toBeNull();

    expect(await lockMonth(deps, "2026-10")).toEqual({ ok: true, value: { final: 2, negative: [] } });
    expect(await store.getSchoolSalaryMonth(a.app.id, "2026-10")).toMatchObject({ lockedBy: "Office" });
    expect(await store.getSchoolSalaryMonth(b.app.id, "2026-10")).toBeNull();
    const final = (await store.getSchoolPayslip(a.app.id, mona.id))!;
    const paid = await recordPayment({ ...deps, now: new Date(NOW.getTime() + 5000) }, final, { cents: 12_000_00, method: "bank", paidOn: "2026-11-01", note: null, receiptAssetId: null });
    expect(paid).toMatchObject({ ok: true, value: { status: "paid" } });
    expect((await store.getSchoolPayslip(a.app.id, mona.id))!.payments.map((p) => [p.method, p.cents, p.by])).toEqual([["bank", 12_000_00, "Office"]]);
    expect(await reopenMonth({ ...deps, now: new Date(NOW.getTime() + 9000) }, "2026-10")).toEqual({ reopened: 1, paid: 1 });
    expect((await store.getSchoolSalaryMonth(a.app.id, "2026-10"))!.lockedAt).toBeNull();
    const samir = (await store.listSchoolPayslips(a.app.id, { personId: a.staff }))[0]!;
    expect(await store.deleteSchoolPayslip(b.app.id, samir.id)).toBe(false);
    expect(await store.deleteSchoolPayslip(a.app.id, mona.id)).toBe(false);
    expect(await store.deleteSchoolPayslip(a.app.id, samir.id)).toBe(true);
    expect((await store.listSchoolPayslips(a.app.id, { statuses: ["paid"] })).map((p) => p.id)).toEqual([mona.id]);
    expect(await store.listSchoolPayslips(a.app.id, { personIds: [] })).toEqual([]);

    // Advances, changed only as they were read.
    const given = { id: "g", cents: 3000_00, method: "cash" as const, paidOn: "2026-10-05", note: null, receiptAssetId: null, by: "Office", at: NOW.toISOString() };
    const advance = await store.createSchoolSalaryAdvance({ appId: a.app.id, personId: a.teacher, personName: "Mona Adel", currency: "EGP", amountCents: 3000_00, instalmentCents: 1000_00, startsMonth: "2026-11", given, repayments: [], createdAt: NOW, updatedAt: NOW });
    expect(await store.getSchoolSalaryAdvance(a.app.id, advance.id)).toEqual(advance);
    expect(await store.getSchoolSalaryAdvance(b.app.id, advance.id)).toBeNull();
    expect(await store.updateSchoolSalaryAdvance(a.app.id, advance.id, { repayments: [{ ...given, id: "r", cents: 500_00 }], updatedAt: later }, NOW)).toBe(true);
    expect(await store.updateSchoolSalaryAdvance(a.app.id, advance.id, { instalmentCents: 1 }, NOW)).toBe(false);
    expect(await store.updateSchoolSalaryAdvance(b.app.id, advance.id, { instalmentCents: 1 }, later)).toBe(false);
    expect((await store.listSchoolSalaryAdvances(a.app.id, { personIds: [a.teacher] })).map((x) => x.repayments.length)).toEqual([1]);
    await store.deleteSchoolSalaryAdvance(b.app.id, advance.id);
    expect(await store.getSchoolSalaryAdvance(a.app.id, advance.id)).not.toBeNull();
    await store.deleteSchoolSalaryAdvance(a.app.id, advance.id);
    expect(await store.listSchoolSalaryAdvances(a.app.id)).toEqual([]);

    // The person removed: their salary goes, their payslip stays with their name.
    await store.deleteSchoolPerson(a.app.id, a.teacher);
    expect(await store.getSchoolSalary(a.app.id, a.teacher)).toBeNull();
    expect((await store.getSchoolPayslip(a.app.id, mona.id))!.personName).toBe("Mona Adel");
  });
});
