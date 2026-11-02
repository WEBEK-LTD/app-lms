import { isDate } from "../bookings/time";
import { CATALOG_CURRENCIES, parsePrice } from "../catalog/money";
import { SCHOOL_PAY_METHODS, type CatalogCurrency, type SchoolPayMethod, type SchoolSalary, type SchoolSalaryAllowance, type SchoolSalarySettings } from "../data/types";
import { isMonth, SALARY_LIMITS } from "./salaries";

/**
 * 113.12 The dashboard's salary forms, checked: a person's salary and its
 * allowances, the rules for suggested deductions, a bonus or deduction on a
 * sheet, a payment written down as paid out, an advance handed over and an
 * advance paid back. Every amount is the school's own. Messages are
 * English; the dashboard translates them (`salaries.known`).
 */

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const str = (form: Record<string, string>, name: string) => (form[name] ?? "").trim();

function text(form: Record<string, string>, name: string, max: number, errors: Record<string, string>): string | null {
  const value = str(form, name);
  if (value.length > max) errors[name] = `Keep it under ${max} characters.`;
  return value || null;
}

/** An amount typed in the dashboard, in cents; `zero` lets 0 through. */
function amount(form: Record<string, string>, name: string, errors: Record<string, string>, zero = false): number {
  const value = str(form, name);
  const cents = value ? parsePrice(value) : null;
  if (cents === null || (!zero && cents === 0)) errors[name] = zero ? "Enter an amount, like 1500 or 1500.50." : "Enter an amount above 0, like 1500 or 1500.50.";
  return cents ?? 0;
}

const isCurrency = (value: string): value is CatalogCurrency => (CATALOG_CURRENCIES as string[]).includes(value);
const isMethod = (value: string): value is SchoolPayMethod => (SCHOOL_PAY_METHODS as readonly string[]).includes(value);

export type SalaryForm = Pick<SchoolSalary, "monthlyCents" | "currency" | "allowances" | "note">;

/** The monthly amount, its currency and up to eight allowances (`allowanceName1`, `allowanceAmount1`, …). */
export function parseSalaryForm(form: Record<string, string>): Parsed<SalaryForm> {
  const errors: Record<string, string> = {};
  const monthlyCents = amount(form, "monthly", errors);
  const currency = str(form, "currency");
  if (!isCurrency(currency)) errors.currency = "Choose the currency.";
  const allowances: SchoolSalaryAllowance[] = [];
  for (let i = 1; i <= SALARY_LIMITS.allowances; i += 1) {
    const name = str(form, `allowanceName${i}`);
    const value = str(form, `allowanceAmount${i}`);
    if (!name && !value) continue;
    if (!name) errors[`allowanceName${i}`] = "Name each allowance, like Transport.";
    else if (name.length > SALARY_LIMITS.name) errors[`allowanceName${i}`] = `Keep it under ${SALARY_LIMITS.name} characters.`;
    const cents = amount(form, `allowanceAmount${i}`, errors);
    if (name) allowances.push({ name, cents });
  }
  const note = text(form, "note", SALARY_LIMITS.note, errors);
  if (Object.keys(errors).length || !isCurrency(currency)) return { ok: false, errors };
  return { ok: true, value: { monthlyCents, currency, allowances, note } };
}

export function salaryFormValues(salary: SchoolSalary | null, currency: string): Record<string, string> {
  const out: Record<string, string> = { monthly: salary ? (salary.monthlyCents / 100).toFixed(2) : "", currency: salary?.currency ?? currency, note: salary?.note ?? "" };
  for (let i = 1; i <= SALARY_LIMITS.allowances; i += 1) {
    const a = salary?.allowances[i - 1];
    out[`allowanceName${i}`] = a?.name ?? "";
    out[`allowanceAmount${i}`] = a ? (a.cents / 100).toFixed(2) : "";
  }
  return out;
}

/** A number of days typed (0.25 to 31, in quarters). */
function days(form: Record<string, string>, name: string, errors: Record<string, string>): number {
  const value = Number(str(form, name).replace(",", "."));
  if (!Number.isFinite(value) || value < 0.25 || value > 31 || Math.round(value * 4) !== value * 4) errors[name] = "Enter the days, like 1 or 0.5.";
  return value;
}

/** The rules for suggested deductions. */
export function parseSalarySettings(form: Record<string, string>): Parsed<SchoolSalarySettings> {
  const errors: Record<string, string> = {};
  const absenceDays = days(form, "absenceDays", errors);
  const every = Number(str(form, "lateEvery"));
  if (!Number.isInteger(every) || every < 1 || every > 31) errors.lateEvery = "Enter how many times, from 1 to 31.";
  const lateDays = days(form, "lateDays", errors);
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      absence: { on: form.absenceOn === "on", days: absenceDays },
      lateness: { on: form.lateOn === "on", every, days: lateDays, countEarly: form.countEarly === "on" },
      dayPayWithAllowances: form.withAllowances === "on",
    },
  };
}

/** A bonus or a deduction the office writes on a sheet. */
export function parseLineForm(form: Record<string, string>): Parsed<{ kind: "bonus" | "deduction"; label: string; cents: number }> {
  const errors: Record<string, string> = {};
  const kind = str(form, "kind");
  if (kind !== "bonus" && kind !== "deduction") errors.kind = "Choose a bonus or a deduction.";
  const label = str(form, "label");
  if (!label) errors.label = "Say what it is for, like Exam supervision.";
  else if (label.length > SALARY_LIMITS.label) errors.label = `Keep it under ${SALARY_LIMITS.label} characters.`;
  const cents = amount(form, "amount", errors);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { kind: kind as "bonus" | "deduction", label, cents } };
}

/** An amount the office changes on a line (0 is allowed: nothing taken). */
export function parseLineAmount(form: Record<string, string>): Parsed<number> {
  const errors: Record<string, string> = {};
  const cents = amount(form, "amount", errors, true);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: cents };
}

export interface PayForm {
  cents: number;
  method: SchoolPayMethod;
  paidOn: string;
  note: string | null;
}

/** Money handed over or paid back: the amount, cash or a bank transfer, the day and a note. */
export function parsePayForm(form: Record<string, string>, today: string): Parsed<PayForm> {
  const errors: Record<string, string> = {};
  const cents = amount(form, "amount", errors);
  const method = str(form, "method");
  if (!isMethod(method)) errors.method = "Choose cash or a bank transfer.";
  const paidOn = str(form, "paidOn");
  if (!isDate(paidOn)) errors.paidOn = "Enter the day, like 2026-11-28.";
  else if (paidOn > today) errors.paidOn = "The day can't be after today.";
  const note = text(form, "note", SALARY_LIMITS.note, errors);
  if (Object.keys(errors).length || !isMethod(method)) return { ok: false, errors };
  return { ok: true, value: { cents, method, paidOn, note } };
}

/** An advance handed over: as money paid out, with what is taken back each month and from which month. */
export function parseAdvanceForm(form: Record<string, string>, today: string): Parsed<PayForm & { instalmentCents: number; startsMonth: string }> {
  const paid = parsePayForm(form, today);
  const errors: Record<string, string> = paid.ok ? {} : { ...paid.errors };
  const instalmentCents = amount(form, "instalment", errors);
  const startsMonth = str(form, "startsMonth");
  if (!isMonth(startsMonth)) errors.startsMonth = "Enter the first month, like 2026-12.";
  else if (paid.ok && startsMonth < paid.value.paidOn.slice(0, 7)) errors.startsMonth = "It is taken back from the month it was given or later.";
  if (paid.ok && instalmentCents > paid.value.cents) errors.instalment = "Each month's part can't be more than the advance.";
  if (!paid.ok || Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { ...paid.value, instalmentCents, startsMonth } };
}

/** Changing an advance's monthly part and its first month. */
export function parseAdvancePlan(form: Record<string, string>, amountCents: number): Parsed<{ instalmentCents: number; startsMonth: string }> {
  const errors: Record<string, string> = {};
  const instalmentCents = amount(form, "instalment", errors);
  if (!errors.instalment && instalmentCents > amountCents) errors.instalment = "Each month's part can't be more than the advance.";
  const startsMonth = str(form, "startsMonth");
  if (!isMonth(startsMonth)) errors.startsMonth = "Enter the first month, like 2026-12.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { instalmentCents, startsMonth } };
}
