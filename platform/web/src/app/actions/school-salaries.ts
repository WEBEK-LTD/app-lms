"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { formatCents } from "@/lib/catalog/money";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { App, SchoolPayslip, SchoolSalaryAdvance } from "@/lib/data/types";
import { formValues, type FormState } from "@/lib/forms";
import { imageType } from "@/lib/images";
import {
  advanceBalance,
  answerLine,
  changeDraft,
  finalisePayslip,
  isMonth,
  isWorkerRole,
  lineId,
  lockMonth,
  makeMonthSheets,
  officeLine,
  recordPayment,
  removePayment,
  reopenMonth,
  SALARY_LIMITS,
  SHEET_MESSAGES,
  type SalaryDeps,
} from "@/lib/school/salaries";
import { parseAdvanceForm, parseAdvancePlan, parseLineAmount, parseLineForm, parsePayForm, parseSalaryForm, parseSalarySettings } from "@/lib/school/salary-forms";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";

/**
 * 113.12 Salaries on the dashboard, for those of the team given Salaries:
 * each person's salary, the rules for suggested deductions, the month's
 * sheets (made, answered, final, locked), payments written down as paid
 * out and advances handed over and paid back. Nothing here moves money.
 */

const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

async function requireSalaries(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("salaries");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "school") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

function refresh() {
  revalidatePath("/dashboard/school/salaries", "layout");
  revalidatePath("/studio/project/school/salaries", "layout");
}

/** Who acts, as payments and sheets keep it. */
function whoActs(context: ClientContext): string {
  const person = context.member ?? context.staff ?? context.user;
  return (person.name || person.email).slice(0, 191);
}

const idOf = (formData: FormData, name = "id"): number | null => {
  const n = Number(formData.get(name));
  return formData.get(name) && Number.isSafeInteger(n) && n > 0 ? n : null;
};

async function depsOf(context: ClientContext & { app: App }): Promise<SalaryDeps> {
  return { store: await getStore(), app: context.app, now: new Date(), by: whoActs(context) };
}

/** A photo (or PDF) of a receipt, kept where only the school's dashboard sees it. */
async function receiptFile(context: ClientContext, file: FormDataEntryValue | null, now: Date): Promise<{ assetId: string | null } | { error: string }> {
  if (!file || typeof file === "string" || file.size === 0) return { assetId: null };
  if (file.size > RECEIPT_MAX_BYTES) return { error: "A receipt can be up to 5 MB." };
  const data = Buffer.from(await file.arrayBuffer());
  const image = imageType(data);
  const pdf = data.subarray(0, 5).toString("latin1") === "%PDF-";
  if (!image && !pdf) return { error: "Receipts must be PNG, JPEG or PDF files." };
  const assetId = newId();
  const extension = image ? image.extension : "pdf";
  const contentType = image ? image.contentType : "application/pdf";
  const blobKey = `assets/${context.client.id}/${assetId}.${extension}`;
  await getBlobStore().put(blobKey, data, contentType);
  await (await getStore()).createAsset({ id: assetId, clientId: context.client.id, kind: "salary_receipt", blobKey, contentType, size: data.length, createdAt: now });
  return { assetId };
}

const today = async (app: App, now: Date) => schoolToday(schoolSettingsOf(await (await getStore()).getSchoolSettings(app.id), app), now);

// Salaries and the rules

export async function saveSalaryAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSalaries();
  const { app } = context;
  const values = formValues(formData);
  const store = await getStore();
  const id = idOf(formData, "personId");
  const person = id !== null ? await store.getSchoolPerson(app.id, id) : null;
  if (!person || !isWorkerRole(person.role)) return { message: "This person isn't one of the school's teachers or staff." };
  const parsed = parseSalaryForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const saved = await store.saveSchoolSalary({ appId: app.id, personId: person.id, ...parsed.value, updatedBy: whoActs(context), updatedAt: new Date() });
  if (!saved) return { message: "This person isn't one of the school's teachers or staff." };
  await recordStaffChange(context, `Set the salary of ${person.name}`);
  refresh();
  return { ok: true, message: "Saved. Drafts take it the next time the month's payslips are made.", values };
}

export async function removeSalaryAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSalaries();
  const id = idOf(formData, "personId");
  if (id === null) return { message: "This person isn't one of the school's teachers or staff." };
  await (await getStore()).deleteSchoolSalary(context.app.id, id);
  await recordStaffChange(context, "Removed a salary");
  refresh();
  return { ok: true, message: "Removed. Their payslips stay." };
}

export async function saveSalarySettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSalaries();
  const { app } = context;
  const values = formValues(formData);
  const parsed = parseSalarySettings(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const store = await getStore();
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  await store.saveSchoolSettings(app.id, { ...settings, salaries: parsed.value }, new Date());
  await recordStaffChange(context, "Changed the suggested deductions");
  refresh();
  return { ok: true, message: "Saved. Drafts take them the next time the month's payslips are made.", values };
}

// The month

export async function makeSheetsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSalaries();
  const month = String(formData.get("month") ?? "");
  if (!isMonth(month)) return { message: SHEET_MESSAGES.month_closed };
  const result = await makeMonthSheets(await depsOf(context), month);
  if (!result.ok) return { message: SHEET_MESSAGES[result.code] };
  const { made, updated, noSalary } = result.value;
  await recordStaffChange(context, `Made the payslips of ${month}`);
  refresh();
  const done = `Made ${made}, brought ${updated} up to date.`;
  return { ok: true, message: noSalary.length ? `${done} Without a salary yet: ${noSalary.join(", ")}.` : done };
}

export async function lockMonthAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSalaries();
  const month = String(formData.get("month") ?? "");
  const result = await lockMonth(await depsOf(context), month);
  if (!result.ok) return { message: SHEET_MESSAGES[result.code] };
  if (result.value.negative.length) return { message: `The deductions are more than the pay for: ${result.value.negative.join(", ")}.` };
  await recordStaffChange(context, `Locked the payslips of ${month}`);
  refresh();
  return { ok: true, message: `Locked. ${result.value.final} payslips are final; each person sees theirs in the app.` };
}

export async function reopenMonthAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSalaries();
  const month = String(formData.get("month") ?? "");
  if (!isMonth(month)) return { message: SHEET_MESSAGES.month_closed };
  const { reopened, paid } = await reopenMonth(await depsOf(context), month);
  await recordStaffChange(context, `Opened the payslips of ${month} again`);
  refresh();
  return { ok: true, message: paid ? `Opened again: ${reopened} back to drafts; ${paid} with payments stay final.` : `Opened again: ${reopened} back to drafts.` };
}

// A sheet

async function payslipOf(context: ClientContext & { app: App }, formData: FormData): Promise<SchoolPayslip | null> {
  const id = idOf(formData);
  return id !== null ? (await getStore()).getSchoolPayslip(context.app.id, id) : null;
}

const gone = (): FormState => ({ message: SHEET_MESSAGES.not_found });

export async function answerLineAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSalaries();
  const payslip = await payslipOf(context, formData);
  if (!payslip) return gone();
  const values = formValues(formData);
  const keep = values.answer !== "dismiss";
  let cents = 0;
  if (keep) {
    const amount = parseLineAmount(values);
    if (!amount.ok) return { errors: amount.errors, values };
    cents = amount.value;
  }
  const result = await changeDraft(await depsOf(context), payslip, (lines) => answerLine(lines, values.line ?? "", keep ? { accept: true, cents } : { accept: false }));
  if (!result.ok) return { message: SHEET_MESSAGES[result.code], values };
  refresh();
  return { ok: true, message: "Saved." };
}

export async function addLineAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSalaries();
  const payslip = await payslipOf(context, formData);
  if (!payslip) return gone();
  const values = formValues(formData);
  const parsed = parseLineForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const result = await changeDraft(await depsOf(context), payslip, (lines) => [...lines, officeLine(parsed.value.kind, parsed.value.label, parsed.value.cents)]);
  if (!result.ok) return { message: SHEET_MESSAGES[result.code], values };
  refresh();
  return { ok: true, message: "Added." };
}

export async function savePayslipNoteAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSalaries();
  const payslip = await payslipOf(context, formData);
  if (!payslip) return gone();
  const note = String(formData.get("note") ?? "").trim();
  if (note.length > SALARY_LIMITS.note) return { errors: { note: `Keep it under ${SALARY_LIMITS.note} characters.` }, values: { note } };
  const result = await changeDraft(await depsOf(context), payslip, (lines) => lines, note || null);
  if (!result.ok) return { message: SHEET_MESSAGES[result.code], values: { note } };
  refresh();
  return { ok: true, message: "Saved.", values: { note } };
}

export async function finalisePayslipAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSalaries();
  const payslip = await payslipOf(context, formData);
  if (!payslip) return gone();
  const result = await finalisePayslip(await depsOf(context), payslip);
  if (!result.ok) return { message: SHEET_MESSAGES[result.code] };
  await recordStaffChange(context, `Made the payslip of ${payslip.personName} for ${payslip.month} final`);
  refresh();
  return { ok: true, message: "Final. They see it in the app." };
}

export async function deleteDraftAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSalaries();
  const payslip = await payslipOf(context, formData);
  if (!payslip) return gone();
  if (!(await (await getStore()).deleteSchoolPayslip(context.app.id, payslip.id))) return { message: SHEET_MESSAGES.not_draft };
  await recordStaffChange(context, `Removed the draft payslip of ${payslip.personName} for ${payslip.month}`);
  refresh();
  redirect(`/dashboard/school/salaries?month=${payslip.month}`);
}

export async function recordPaymentAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSalaries();
  const payslip = await payslipOf(context, formData);
  if (!payslip) return gone();
  const values = formValues(formData);
  const now = new Date();
  const parsed = parsePayForm(values, await today(context.app, now));
  if (!parsed.ok) return { errors: parsed.errors, values };
  const receipt = await receiptFile(context, formData.get("receipt"), now);
  if ("error" in receipt) return { errors: { receipt: receipt.error }, values };
  const result = await recordPayment(await depsOf(context), payslip, { ...parsed.value, receiptAssetId: receipt.assetId });
  if (!result.ok) return { message: SHEET_MESSAGES[result.code], values };
  await recordStaffChange(context, `Recorded a payment of ${formatCents(parsed.value.cents, payslip.currency)} to ${payslip.personName} for ${payslip.month}`);
  refresh();
  return { ok: true, message: result.value.status === "paid" ? "Recorded. The payslip is paid." : "Recorded." };
}

export async function removePaymentAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSalaries();
  const payslip = await payslipOf(context, formData);
  if (!payslip) return gone();
  const result = await removePayment(await depsOf(context), payslip, String(formData.get("payment") ?? ""));
  if (!result.ok) return { message: SHEET_MESSAGES[result.code] };
  await recordStaffChange(context, `Removed a payment to ${payslip.personName} for ${payslip.month}`);
  refresh();
  return { ok: true, message: "Removed." };
}

// Advances

async function advanceOf(context: ClientContext & { app: App }, formData: FormData): Promise<SchoolSalaryAdvance | null> {
  const id = idOf(formData);
  return id !== null ? (await getStore()).getSchoolSalaryAdvance(context.app.id, id) : null;
}

export async function giveAdvanceAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSalaries();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const id = idOf(formData, "personId");
  const person = id !== null ? await store.getSchoolPerson(app.id, id) : null;
  if (!person || !isWorkerRole(person.role)) return { message: "This person isn't one of the school's teachers or staff." };
  const salary = await store.getSchoolSalary(app.id, person.id);
  if (!salary) return { message: "Set their salary first: an advance is taken back from it." };
  const now = new Date();
  const parsed = parseAdvanceForm(values, await today(app, now));
  if (!parsed.ok) return { errors: parsed.errors, values };
  const receipt = await receiptFile(context, formData.get("receipt"), now);
  if ("error" in receipt) return { errors: { receipt: receipt.error }, values };
  const { cents, method, paidOn, note, instalmentCents, startsMonth } = parsed.value;
  await store.createSchoolSalaryAdvance({
    appId: app.id,
    personId: person.id,
    personName: person.name,
    currency: salary.currency,
    amountCents: cents,
    instalmentCents,
    startsMonth,
    given: { id: lineId(), cents, method, paidOn, note, receiptAssetId: receipt.assetId, by: whoActs(context), at: now.toISOString() },
    repayments: [],
    createdAt: now,
    updatedAt: now,
  });
  await recordStaffChange(context, `Recorded an advance of ${formatCents(cents, salary.currency)} to ${person.name}`);
  refresh();
  return { ok: true, message: `Recorded. ${formatCents(instalmentCents, salary.currency)} is taken back each month from ${startsMonth}.` };
}

export async function advancePlanAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSalaries();
  const advance = await advanceOf(context, formData);
  if (!advance) return { message: "This advance doesn't exist anymore." };
  const values = formValues(formData);
  const parsed = parseAdvancePlan(values, advance.amountCents);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const changed = await (await getStore()).updateSchoolSalaryAdvance(context.app.id, advance.id, { ...parsed.value, updatedAt: new Date() }, advance.updatedAt);
  if (!changed) return { message: "Someone changed this advance meanwhile. Look at it again and try once more.", values };
  refresh();
  return { ok: true, message: "Saved. Drafts take it the next time the month's payslips are made.", values };
}

export async function repayAdvanceAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSalaries();
  const advance = await advanceOf(context, formData);
  if (!advance) return { message: "This advance doesn't exist anymore." };
  const store = await getStore();
  const values = formValues(formData);
  const now = new Date();
  const parsed = parsePayForm(values, await today(context.app, now));
  if (!parsed.ok) return { errors: parsed.errors, values };
  if (advance.repayments.length >= SALARY_LIMITS.repayments) return { message: "This advance has as many payments back as it can." };
  const { left } = advanceBalance(advance, await store.listSchoolPayslips(context.app.id, { personId: advance.personId }));
  if (parsed.value.cents > left) return { errors: { amount: `That is more than is left: ${formatCents(left, advance.currency)}.` }, values };
  const receipt = await receiptFile(context, formData.get("receipt"), now);
  if ("error" in receipt) return { errors: { receipt: receipt.error }, values };
  const repayments = [...advance.repayments, { id: lineId(), ...parsed.value, receiptAssetId: receipt.assetId, by: whoActs(context), at: now.toISOString() }];
  if (!(await store.updateSchoolSalaryAdvance(context.app.id, advance.id, { repayments, updatedAt: now }, advance.updatedAt))) return { message: "Someone changed this advance meanwhile. Look at it again and try once more.", values };
  await recordStaffChange(context, `Recorded ${formatCents(parsed.value.cents, advance.currency)} paid back by ${advance.personName}`);
  refresh();
  return { ok: true, message: "Recorded as paid back." };
}

export async function deleteAdvanceAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSalaries();
  const advance = await advanceOf(context, formData);
  if (!advance) return { message: "This advance doesn't exist anymore." };
  const store = await getStore();
  const payslips = await store.listSchoolPayslips(context.app.id, { personId: advance.personId });
  // Only one written by mistake: nothing taken back on any sheet, a draft's included, nor paid back.
  const used = advance.repayments.length > 0 || payslips.some((p) => p.lines.some((l) => l.advanceId === advance.id && l.status === "accepted"));
  if (used) return { message: "Part of this advance is taken back already, so it stays on the record." };
  await store.deleteSchoolSalaryAdvance(context.app.id, advance.id);
  await recordStaffChange(context, `Removed an advance of ${advance.personName}`);
  refresh();
  return { ok: true, message: "Removed." };
}
