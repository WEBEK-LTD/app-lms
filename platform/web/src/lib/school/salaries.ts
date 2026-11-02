import { randomToken } from "../crypto/tokens";
import { centsToDecimal, formatCents } from "../catalog/money";
import type { DataStore } from "../data/store";
import type {
  App,
  CatalogCurrency,
  SchoolPayRecord,
  SchoolPayslip,
  SchoolPayslipAttendance,
  SchoolPayslipLine,
  SchoolPayslipLineKind,
  SchoolPerson,
  SchoolSalary,
  SchoolSalaryAdvance,
  SchoolSalarySettings,
  SchoolSettings,
} from "../data/types";
import { checkinSettingsOf, daysFor, monthRange, monthReport, type CheckinRole } from "./checkin";
import { isoWeekday, schoolToday } from "./service";
import { schoolSettingsOf } from "./settings";

/**
 * 113.12 Salaries, recorded by hand (the owner's decision): each teacher's
 * and staff member's salary as the school sets it, the month's sheet per
 * person (base, allowances, bonuses, deductions, advances taken back, the
 * net), deductions suggested from 113.2's absences and lateness that a
 * person in the office accepts or changes, advances handed over and taken
 * back in instalments, and each payment written down as paid out. Nothing
 * here moves money: "paid" is a record. Every amount is the school's own;
 * nothing is made up.
 */

export const SALARY_LIMITS = {
  allowances: 8,
  name: 60,
  label: 80,
  note: 500,
  lines: 30,
  payments: 20,
  repayments: 60,
  /** Sheets are made for this many months back, and for the current one. */
  monthsBack: 24,
  /** The largest amount (cents), as parsePrice reads them. */
  maxCents: 100_000_000_00,
} as const;

export const DEFAULT_SALARY_SETTINGS: SchoolSalarySettings = {
  absence: { on: false, days: 1 },
  lateness: { on: false, every: 3, days: 1, countEarly: false },
  dayPayWithAllowances: false,
};

/** The school's rules for suggested deductions; off until it turns them on. */
export function salarySettingsOf(settings: SchoolSettings): SchoolSalarySettings {
  const saved = settings.salaries;
  return {
    absence: { ...DEFAULT_SALARY_SETTINGS.absence, ...(saved?.absence ?? {}) },
    lateness: { ...DEFAULT_SALARY_SETTINGS.lateness, ...(saved?.lateness ?? {}) },
    dayPayWithAllowances: saved?.dayPayWithAllowances ?? DEFAULT_SALARY_SETTINGS.dayPayWithAllowances,
  };
}

export const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
export const isMonth = (value: unknown): value is string => typeof value === "string" && MONTH.test(value);

/** "2026-11" → "2026-10" (`by` months back), or ahead with a negative `by`. */
export function monthBefore(month: string, by = 1): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const index = y * 12 + (m - 1) - by;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Whether a sheet can be made for the month: the current one or up to two years back. */
export function monthOpenForSheets(month: string, current: string): boolean {
  return isMonth(month) && month <= current && month >= monthBefore(current, SALARY_LIMITS.monthsBack);
}

export const lineId = () => randomToken(6);

/** When a sheet is changed: now, and always after its last change, so a copy read before is told apart. */
export const stampAfter = (before: Date, now: Date) => new Date(Math.max(now.getTime(), before.getTime() + 1));
export const isWorkerRole = (role: string): role is "teacher" | "staff" => role === "teacher" || role === "staff";

// The sums

export interface PayslipTotals {
  base: number;
  allowances: number;
  bonuses: number;
  deductions: number;
  advances: number;
  /** Base, allowances and bonuses. */
  gross: number;
  net: number;
}

const counted = (lines: readonly SchoolPayslipLine[], kind: SchoolPayslipLineKind) => lines.filter((l) => l.kind === kind && l.status === "accepted").reduce((sum, l) => sum + l.cents, 0);

/** A sheet's sums: suggestions waiting for the office and dismissed ones don't count. */
export function payslipTotals(p: Pick<SchoolPayslip, "baseCents" | "allowances" | "lines">): PayslipTotals {
  const allowances = p.allowances.reduce((sum, a) => sum + a.cents, 0);
  const bonuses = counted(p.lines, "bonus");
  const deductions = counted(p.lines, "deduction");
  const advances = counted(p.lines, "advance");
  const gross = p.baseCents + allowances + bonuses;
  return { base: p.baseCents, allowances, bonuses, deductions, advances, gross, net: gross - deductions - advances };
}

/** What is still to pay on a sheet. */
export const leftToPay = (p: Pick<SchoolPayslip, "netCents" | "paidCents">) => Math.max(0, p.netCents - p.paidCents);

export type PaidState = "unpaid" | "part_paid" | "paid";
export function paidState(p: Pick<SchoolPayslip, "netCents" | "paidCents" | "status">): PaidState {
  // Nothing to pay on a final sheet counts as paid.
  if (p.status === "paid" || (p.status !== "draft" && p.paidCents >= p.netCents)) return "paid";
  return p.paidCents > 0 ? "part_paid" : "unpaid";
}

/** "PS-2026-11-42". */
export const payslipNumber = (p: Pick<SchoolPayslip, "id" | "month">) => `PS-${p.month}-${p.id}`;

// Suggestions from check-in

/** The person's working days in the whole month (their own days, else the school's). */
export function monthWorkingDays(month: string, weekdays: readonly number[]): number {
  const { from, to } = monthRange(month);
  let n = 0;
  for (let day = Number(from.slice(8)); day <= Number(to.slice(8)); day += 1) if (weekdays.includes(isoWeekday(`${month}-${String(day).padStart(2, "0")}`))) n += 1;
  return n;
}

/** `days` of a day's pay, a day's pay being the base (and the allowances) over the month's working days. */
export function daysOfPay(input: { baseCents: number; allowancesCents: number; workingDays: number; withAllowances: boolean }, days: number): number {
  if (input.workingDays <= 0 || days <= 0) return 0;
  const monthly = input.baseCents + (input.withAllowances ? input.allowancesCents : 0);
  return Math.round((monthly * days) / input.workingDays);
}

/**
 * The deductions the school's rules suggest from the month's days at the
 * gate: each absence without an excuse (approved leave and excused days are
 * no absence), and every N late arrivals (and leaving early, when counted).
 * Only suggestions: the office accepts or changes each one.
 */
export function suggestedDeductions(rules: SchoolSalarySettings, sheet: { baseCents: number; allowancesCents: number }, attendance: SchoolPayslipAttendance | null): SchoolPayslipLine[] {
  if (!attendance) return [];
  const pay = { ...sheet, workingDays: attendance.workingDays, withAllowances: rules.dayPayWithAllowances };
  const out: SchoolPayslipLine[] = [];
  if (rules.absence.on && attendance.absent > 0) {
    const cents = daysOfPay(pay, attendance.absent * rules.absence.days);
    if (cents > 0) out.push({ id: lineId(), kind: "deduction", source: "absence", status: "suggested", label: `Absences (${attendance.absent})`, cents, suggestedCents: cents, count: attendance.absent, advanceId: null });
  }
  const lateCount = attendance.late + (rules.lateness.countEarly ? attendance.leftEarly : 0);
  const times = rules.lateness.every > 0 ? Math.floor(lateCount / rules.lateness.every) : 0;
  if (rules.lateness.on && times > 0) {
    const cents = daysOfPay(pay, times * rules.lateness.days);
    if (cents > 0) out.push({ id: lineId(), kind: "deduction", source: "lateness", status: "suggested", label: `Late (${lateCount})`, cents, suggestedCents: cents, count: lateCount, advanceId: null });
  }
  return out;
}

// Advances

/** An advance's instalment taken back on a sheet that counts (final or paid). */
function takenOn(payslips: readonly SchoolPayslip[], advanceId: number, exceptPayslipId: number | null): number {
  return payslips
    .filter((p) => p.status !== "draft" && p.id !== exceptPayslipId)
    .flatMap((p) => p.lines)
    .filter((l) => l.kind === "advance" && l.status === "accepted" && l.advanceId === advanceId)
    .reduce((sum, l) => sum + l.cents, 0);
}

export interface AdvanceBalance {
  /** Taken back on final sheets. */
  fromPayslips: number;
  /** Paid back at the office. */
  repaid: number;
  left: number;
}

/** What is taken back of an advance and what is left: final sheets' instalments and the payments back at the office. */
export function advanceBalance(advance: SchoolSalaryAdvance, payslips: readonly SchoolPayslip[], exceptPayslipId: number | null = null): AdvanceBalance {
  const fromPayslips = takenOn(payslips, advance.id, exceptPayslipId);
  const repaid = advance.repayments.reduce((sum, r) => sum + r.cents, 0);
  return { fromPayslips, repaid, left: Math.max(0, advance.amountCents - fromPayslips - repaid) };
}

/** The instalments the person's open advances take back on a month's sheet (in the sheet's currency, from their first month). */
export function advanceLines(advances: readonly SchoolSalaryAdvance[], payslips: readonly SchoolPayslip[], sheet: { id: number | null; month: string; currency: CatalogCurrency }): SchoolPayslipLine[] {
  const out: SchoolPayslipLine[] = [];
  for (const advance of [...advances].sort((a, b) => a.id - b.id)) {
    if (advance.currency !== sheet.currency || advance.startsMonth > sheet.month) continue;
    const { left } = advanceBalance(advance, payslips, sheet.id);
    const cents = Math.min(advance.instalmentCents, left);
    if (cents > 0) out.push({ id: lineId(), kind: "advance", source: "advance", status: "accepted", label: `Advance of ${advance.given.paidOn}`, cents, suggestedCents: cents, count: null, advanceId: advance.id });
  }
  return out;
}

// The month's sheets

export interface SalaryDeps {
  store: DataStore;
  app: Pick<App, "id" | "timeZone" | "catalogSettings">;
  now: Date;
  /** Who acts (the dashboard's user). */
  by: string;
}

export type SheetError = "month_locked" | "month_closed" | "not_draft" | "negative" | "changed" | "too_much" | "not_found" | "too_many";

export const SHEET_MESSAGES: Record<SheetError, string> = {
  month_locked: "This month is locked. Open it again to change its payslips.",
  month_closed: "Payslips are made for this month or up to two years back.",
  not_draft: "This payslip is final. Open the month again to change it.",
  negative: "The deductions are more than the pay.",
  changed: "Someone changed this payslip meanwhile. Look at it again and try once more.",
  too_much: "That is more than is left to pay.",
  not_found: "This payslip doesn't exist anymore.",
  too_many: "This payslip has as many lines as it can.",
};

async function attendanceOf(deps: SalaryDeps, month: string, settings: SchoolSettings, people: readonly SchoolPerson[]): Promise<Map<number, SchoolPayslipAttendance>> {
  const c = checkinSettingsOf(settings);
  const out = new Map<number, SchoolPayslipAttendance>();
  // Without check-in in the app, there is nothing to count.
  if (!c.on || people.length === 0) return out;
  const report = await monthReport(deps.store, deps.app, month, deps.now, { roles: ["teacher", "staff"] });
  for (const row of report.rows) {
    const person = people.find((p) => p.id === row.person.id);
    if (!person) continue;
    out.set(person.id, {
      workingDays: monthWorkingDays(month, daysFor(c, person, person.role as CheckinRole)),
      days: row.days,
      present: row.present,
      late: row.late,
      leftEarly: row.leftEarly,
      absent: row.absent,
      excused: row.excused,
      leave: row.leave,
    });
  }
  return out;
}

/** A draft's lines made again: the office's own and what it answered stay; suggestions waiting are made from the new numbers. */
function mergeLines(before: readonly SchoolPayslipLine[], suggestions: readonly SchoolPayslipLine[], advances: readonly SchoolPayslipLine[]): SchoolPayslipLine[] {
  const kept = before.filter((l) => l.source === "office" || l.status !== "suggested");
  const out = kept.filter((l) => l.source !== "advance" || advances.some((a) => a.advanceId === l.advanceId) || l.status === "dismissed");
  for (const s of suggestions) if (!out.some((l) => l.source === s.source)) out.push(s);
  for (const a of advances) {
    const i = out.findIndex((l) => l.source === "advance" && l.advanceId === a.advanceId);
    // An instalment the office changed or dismissed stays as it left it.
    if (i < 0) out.push(a);
  }
  return out;
}

export interface MonthResult {
  made: number;
  updated: number;
  /** Teachers and staff without a salary yet. */
  noSalary: string[];
}

/**
 * Makes the month's sheets: one draft for every active teacher and staff
 * member with a salary, from their salary, their open advances and (when
 * the school's rules are on) the deductions check-in suggests. Drafts made
 * before are brought up to date; final and paid ones are never touched.
 */
export async function makeMonthSheets(deps: SalaryDeps, month: string): Promise<{ ok: true; value: MonthResult } | { ok: false; code: SheetError }> {
  const { store, app, now } = deps;
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  if (!monthOpenForSheets(month, schoolToday(settings, now).slice(0, 7))) return { ok: false, code: "month_closed" };
  if ((await store.getSchoolSalaryMonth(app.id, month))?.lockedAt) return { ok: false, code: "month_locked" };
  const rules = salarySettingsOf(settings);
  const [people, salaries, sheets, advances, all] = await Promise.all([
    store.listSchoolPeople(app.id),
    store.listSchoolSalaries(app.id),
    store.listSchoolPayslips(app.id, { month }),
    store.listSchoolSalaryAdvances(app.id),
    store.listSchoolPayslips(app.id),
  ]);
  const workers = people.filter((p) => p.active && isWorkerRole(p.role));
  const salaryOf = new Map(salaries.map((s) => [s.personId, s]));
  const days = await attendanceOf(deps, month, settings, workers);
  const result: MonthResult = { made: 0, updated: 0, noSalary: [] };
  for (const person of workers) {
    const salary = salaryOf.get(person.id);
    if (!salary) {
      result.noSalary.push(person.name);
      continue;
    }
    const before = sheets.find((s) => s.personId === person.id) ?? null;
    if (before && before.status !== "draft") continue;
    const attendance = days.get(person.id) ?? null;
    const allowancesCents = salary.allowances.reduce((sum, a) => sum + a.cents, 0);
    const suggestions = suggestedDeductions(rules, { baseCents: salary.monthlyCents, allowancesCents }, attendance);
    const mine = advances.filter((a) => a.personId === person.id);
    const instalments = advanceLines(mine, all, { id: before?.id ?? null, month, currency: salary.currency });
    const lines = before && before.currency === salary.currency ? mergeLines(before.lines, suggestions, instalments) : [...suggestions, ...instalments];
    const sheet = {
      personName: person.name,
      role: person.role as "teacher" | "staff",
      jobTitle: person.jobTitle ?? null,
      department: person.department ?? null,
      currency: salary.currency,
      baseCents: salary.monthlyCents,
      allowances: salary.allowances,
      lines,
      attendance,
    };
    const net = payslipTotals(sheet).net;
    if (before) {
      if (await store.updateSchoolPayslip(app.id, before.id, { ...sheet, netCents: net, updatedAt: stampAfter(before.updatedAt, now) }, { statuses: ["draft"], updatedAt: before.updatedAt })) result.updated += 1;
      continue;
    }
    const made = await store.createSchoolPayslip({
      appId: app.id,
      personId: person.id,
      month,
      ...sheet,
      netCents: net,
      status: "draft",
      payments: [],
      paidCents: 0,
      note: null,
      finalAt: null,
      finalBy: null,
      createdAt: now,
      updatedAt: now,
    });
    if (made.ok) result.made += 1;
  }
  return { ok: true, value: result };
}

/** A draft changed with `change`, its net counted again; refused when the month is locked, the sheet final, the net below zero or it changed meanwhile. */
export async function changeDraft(deps: SalaryDeps, payslip: SchoolPayslip, change: (lines: SchoolPayslipLine[]) => SchoolPayslipLine[] | SheetError, note?: string | null): Promise<{ ok: true; value: SchoolPayslip } | { ok: false; code: SheetError }> {
  if (payslip.status !== "draft") return { ok: false, code: "not_draft" };
  if ((await deps.store.getSchoolSalaryMonth(payslip.appId, payslip.month))?.lockedAt) return { ok: false, code: "month_locked" };
  const lines = change(payslip.lines.map((l) => ({ ...l })));
  if (typeof lines === "string") return { ok: false, code: lines };
  if (lines.length > SALARY_LIMITS.lines) return { ok: false, code: "too_many" };
  const net = payslipTotals({ ...payslip, lines }).net;
  if (net < 0) return { ok: false, code: "negative" };
  const patch = { lines, netCents: net, updatedAt: stampAfter(payslip.updatedAt, deps.now), ...(note !== undefined ? { note } : {}) };
  if (!(await deps.store.updateSchoolPayslip(payslip.appId, payslip.id, patch, { statuses: ["draft"], updatedAt: payslip.updatedAt }))) return { ok: false, code: "changed" };
  return { ok: true, value: { ...payslip, ...patch } };
}

/** The office's answer to a line: accept it (at its amount or a changed one), dismiss it, or remove a line it wrote. */
export function answerLine(lines: SchoolPayslipLine[], id: string, answer: { accept: true; cents: number } | { accept: false }): SchoolPayslipLine[] | SheetError {
  const line = lines.find((l) => l.id === id);
  if (!line) return "not_found";
  if (!answer.accept) return line.source === "office" ? lines.filter((l) => l.id !== id) : lines.map((l) => (l.id === id ? { ...l, status: "dismissed" } : l));
  return lines.map((l) => (l.id === id ? { ...l, status: "accepted", cents: answer.cents } : l));
}

/** A bonus or a deduction the office writes. */
export function officeLine(kind: "bonus" | "deduction", label: string, cents: number): SchoolPayslipLine {
  return { id: lineId(), kind, source: "office", status: "accepted", label, cents, suggestedCents: null, count: null, advanceId: null };
}

/** The sheet made final (the person sees it in the app); suggestions left unanswered are dropped. */
async function finalise(deps: SalaryDeps, payslip: SchoolPayslip): Promise<SchoolPayslip | null> {
  const lines = payslip.lines.filter((l) => l.status !== "suggested");
  const net = payslipTotals({ ...payslip, lines }).net;
  if (net < 0) return null;
  const patch = { lines, netCents: net, status: "final" as const, finalAt: deps.now, finalBy: deps.by, updatedAt: stampAfter(payslip.updatedAt, deps.now) };
  return (await deps.store.updateSchoolPayslip(payslip.appId, payslip.id, patch, { statuses: ["draft"], updatedAt: payslip.updatedAt })) ? { ...payslip, ...patch } : null;
}

/** Locks the month: every draft made final, and no sheet made or changed until it's opened again. */
export async function lockMonth(deps: SalaryDeps, month: string): Promise<{ ok: true; value: { final: number; negative: string[] } } | { ok: false; code: SheetError }> {
  const { store, app, now } = deps;
  if (!isMonth(month)) return { ok: false, code: "month_closed" };
  const drafts = await store.listSchoolPayslips(app.id, { month, statuses: ["draft"] });
  const negative = drafts.filter((p) => payslipTotals({ ...p, lines: p.lines.filter((l) => l.status !== "suggested") }).net < 0).map((p) => p.personName);
  if (negative.length) return { ok: true, value: { final: 0, negative } };
  let final = 0;
  for (const p of drafts) if (await finalise(deps, p)) final += 1;
  await store.saveSchoolSalaryMonth({ appId: app.id, month, lockedAt: now, lockedBy: deps.by, updatedAt: now });
  return { ok: true, value: { final, negative: [] } };
}

/** Opens a locked month again: its final sheets with nothing paid on them go back to drafts (and leave the app). */
export async function reopenMonth(deps: SalaryDeps, month: string): Promise<{ reopened: number; paid: number }> {
  const { store, app, now } = deps;
  const sheets = await store.listSchoolPayslips(app.id, { month, statuses: ["final"] });
  let reopened = 0;
  for (const p of sheets) {
    if (p.payments.length > 0) continue;
    if (await store.updateSchoolPayslip(app.id, p.id, { status: "draft", finalAt: null, finalBy: null, updatedAt: stampAfter(p.updatedAt, now) }, { statuses: ["final"], updatedAt: p.updatedAt })) reopened += 1;
  }
  const paid = (await store.listSchoolPayslips(app.id, { month })).filter((p) => p.status !== "draft").length;
  await store.saveSchoolSalaryMonth({ appId: app.id, month, lockedAt: null, lockedBy: null, updatedAt: now });
  return { reopened, paid };
}

/** One sheet made final on its own. */
export async function finalisePayslip(deps: SalaryDeps, payslip: SchoolPayslip): Promise<{ ok: true; value: SchoolPayslip } | { ok: false; code: SheetError }> {
  if (payslip.status !== "draft") return { ok: false, code: "not_draft" };
  if ((await deps.store.getSchoolSalaryMonth(payslip.appId, payslip.month))?.lockedAt) return { ok: false, code: "month_locked" };
  if (payslipTotals({ ...payslip, lines: payslip.lines.filter((l) => l.status !== "suggested") }).net < 0) return { ok: false, code: "negative" };
  const done = await finalise(deps, payslip);
  return done ? { ok: true, value: done } : { ok: false, code: "changed" };
}

/** A payment written down as paid out (a draft is made final first); paid in full, the sheet is paid. */
export async function recordPayment(deps: SalaryDeps, payslip: SchoolPayslip, record: Omit<SchoolPayRecord, "id" | "by" | "at">): Promise<{ ok: true; value: SchoolPayslip } | { ok: false; code: SheetError }> {
  let sheet = payslip;
  if (sheet.status === "draft") {
    const done = await finalisePayslip(deps, sheet);
    if (!done.ok) return done;
    sheet = done.value;
  }
  if (sheet.payments.length >= SALARY_LIMITS.payments) return { ok: false, code: "too_many" };
  if (record.cents <= 0 || record.cents > leftToPay(sheet)) return { ok: false, code: "too_much" };
  const payments = [...sheet.payments, { ...record, id: lineId(), by: deps.by, at: deps.now.toISOString() }];
  const paidCents = payments.reduce((sum, p) => sum + p.cents, 0);
  const patch = { payments, paidCents, status: paidCents >= sheet.netCents ? ("paid" as const) : ("final" as const), updatedAt: stampAfter(sheet.updatedAt, deps.now) };
  if (!(await deps.store.updateSchoolPayslip(sheet.appId, sheet.id, patch, { statuses: ["final"], updatedAt: sheet.updatedAt }))) return { ok: false, code: "changed" };
  return { ok: true, value: { ...sheet, ...patch } };
}

/** A payment recorded by mistake taken off the sheet again. */
export async function removePayment(deps: SalaryDeps, payslip: SchoolPayslip, paymentId: string): Promise<{ ok: true; value: SchoolPayslip } | { ok: false; code: SheetError }> {
  if (!payslip.payments.some((p) => p.id === paymentId)) return { ok: false, code: "not_found" };
  const payments = payslip.payments.filter((p) => p.id !== paymentId);
  const paidCents = payments.reduce((sum, p) => sum + p.cents, 0);
  const patch = { payments, paidCents, status: paidCents >= payslip.netCents && payslip.netCents > 0 ? ("paid" as const) : ("final" as const), updatedAt: stampAfter(payslip.updatedAt, deps.now) };
  if (!(await deps.store.updateSchoolPayslip(payslip.appId, payslip.id, patch, { statuses: ["final", "paid"], updatedAt: payslip.updatedAt }))) return { ok: false, code: "changed" };
  return { ok: true, value: { ...payslip, ...patch } };
}

// Totals and the CSV file

export interface MonthTotals {
  currency: CatalogCurrency;
  people: number;
  gross: number;
  deductions: number;
  advances: number;
  net: number;
  paid: number;
  left: number;
}

/** The month's sums per currency. */
export function monthTotals(payslips: readonly SchoolPayslip[]): MonthTotals[] {
  const out = new Map<CatalogCurrency, MonthTotals>();
  for (const p of payslips) {
    const t = payslipTotals(p);
    const row = out.get(p.currency) ?? { currency: p.currency, people: 0, gross: 0, deductions: 0, advances: 0, net: 0, paid: 0, left: 0 };
    row.people += 1;
    row.gross += t.gross;
    row.deductions += t.deductions;
    row.advances += t.advances;
    row.net += p.netCents;
    row.paid += p.paidCents;
    row.left += leftToPay(p);
    out.set(p.currency, row);
  }
  return [...out.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

const csvCell = (value: string | number) => {
  const text = String(value);
  // A cell starting like a formula is read as text by spreadsheets.
  const safe = /^[=+\-@\t\r]/.test(text) && !/^-?\d/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const METHOD_WORDS = { cash: "Cash", bank: "Bank transfer" } as const;
const STATUS_WORDS = { draft: "Draft", final: "Final", paid: "Paid" } as const;

/** The month's sheets as a CSV file, its header and words in the dashboard's language (`k`). */
export function payslipsCsv(payslips: readonly SchoolPayslip[], k: (english: string) => string = (english) => english): string {
  const head = [k("Payslip"), k("Name"), k("Role"), k("Job"), k("Department"), k("Currency"), k("Base"), k("Allowances"), k("Bonuses"), k("Deductions"), k("Advances taken back"), k("Net"), k("Paid"), k("Left to pay"), k("Status"), k("Paid by"), k("Paid on")];
  const lines = payslips.map((p) => {
    const t = payslipTotals(p);
    return [
      payslipNumber(p),
      p.personName,
      k(p.role === "teacher" ? "Teacher" : "Staff member"),
      p.jobTitle ?? "",
      p.department ?? "",
      p.currency,
      centsToDecimal(t.base),
      centsToDecimal(t.allowances),
      centsToDecimal(t.bonuses),
      centsToDecimal(t.deductions),
      centsToDecimal(t.advances),
      centsToDecimal(p.netCents),
      centsToDecimal(p.paidCents),
      centsToDecimal(leftToPay(p)),
      k(STATUS_WORDS[p.status]),
      [...new Set(p.payments.map((x) => k(METHOD_WORDS[x.method])))].join(" + "),
      [...new Set(p.payments.map((x) => x.paidOn))].join(" "),
    ]
      .map(csvCell)
      .join(",");
  });
  return [head.map(csvCell).join(","), ...lines].join("\r\n") + "\r\n";
}

// The hosted API's payslips

const money = (cents: number, currency: CatalogCurrency) => ({ amount: centsToDecimal(cents), amount_formatted: formatCents(cents, currency) });

/** A payslip as the person sees it in the app (`GET /staff/payslips`): never who recorded the payments, never the receipts' photos. */
export function payslipJson(p: SchoolPayslip, pdfUrl: string) {
  const t = payslipTotals(p);
  const line = (l: SchoolPayslipLine) => ({ kind: l.kind, source: l.source, label: l.label, count: l.count, ...money(l.cents, p.currency) });
  const shown = p.lines.filter((l) => l.status === "accepted");
  return {
    id: p.id,
    number: payslipNumber(p),
    month: p.month,
    currency: p.currency,
    name: p.personName,
    job_title: p.jobTitle,
    department: p.department,
    base: money(t.base, p.currency),
    allowances: p.allowances.map((a) => ({ name: a.name, ...money(a.cents, p.currency) })),
    bonuses: shown.filter((l) => l.kind === "bonus").map(line),
    deductions: shown.filter((l) => l.kind !== "bonus").map(line),
    gross: money(t.gross, p.currency),
    total_deductions: money(t.deductions + t.advances, p.currency),
    net: money(p.netCents, p.currency),
    paid: money(p.paidCents, p.currency),
    left: money(leftToPay(p), p.currency),
    status: paidState(p),
    payments: p.payments.map((x) => ({ method: x.method, paid_on: x.paidOn, note: x.note, ...money(x.cents, p.currency) })),
    attendance: p.attendance
      ? { working_days: p.attendance.workingDays, present: p.attendance.present, late: p.attendance.late, left_early: p.attendance.leftEarly, absent: p.attendance.absent, excused: p.attendance.excused, leave: p.attendance.leave }
      : null,
    note: p.note,
    issued_at: (p.finalAt ?? p.updatedAt).toISOString(),
    pdf_url: pdfUrl,
  };
}

/** An advance as the person sees it: how much, what is taken back each month and what is left. */
export function advanceJson(a: SchoolSalaryAdvance, payslips: readonly SchoolPayslip[]) {
  const b = advanceBalance(a, payslips);
  return {
    id: a.id,
    given_on: a.given.paidOn,
    currency: a.currency,
    amount: money(a.amountCents, a.currency),
    instalment: money(a.instalmentCents, a.currency),
    starts_month: a.startsMonth,
    taken_back: money(b.fromPayslips + b.repaid, a.currency),
    left: money(b.left, a.currency),
  };
}

/** The person's own sheets that are final, and their advances, for the hosted API. */
export async function ownPayslips(store: DataStore, appId: string, personIds: number[]): Promise<{ payslips: SchoolPayslip[]; advances: SchoolSalaryAdvance[]; all: SchoolPayslip[] }> {
  if (personIds.length === 0) return { payslips: [], advances: [], all: [] };
  const [all, advances] = await Promise.all([store.listSchoolPayslips(appId, { personIds }), store.listSchoolSalaryAdvances(appId, { personIds })]);
  return { payslips: all.filter((p) => p.status !== "draft"), advances, all };
}

/** A salary's allowances in all. */
export const allowancesOf = (salary: Pick<SchoolSalary, "allowances">) => salary.allowances.reduce((sum, a) => sum + a.cents, 0);
