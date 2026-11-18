import { decrypt, encrypt } from "../crypto/encryption";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { DesignerLedgerEntry, DesignerPayout, DesignerPayoutDetails, TemplateDesigner, TemplateOrder } from "../data/types";
import { csvCell } from "../mailing/contacts";
import { nextPeriod, payoutPeriod, periodCutoff } from "./payout-calendar";
import { detailsAccount, maskAccount } from "./payout-details";

/**
 * 106.11 The designer's money, as the owner decided it:
 *
 * - **The ledger.** Each paid sale is written once, from the order's own
 *   amounts: the sale, Yallapp's 25% and the designer's exact 75%. Yallapp's
 *   share includes taxes, the gateway's fees and the SWIFT and intermediary
 *   banks' fees, so nothing comes off the designer's 75%. No refunds (the
 *   owner's decision): a paid order can't be taken back by anyone, so the
 *   ledger has sales and payouts only.
 * - **Payouts.** On the 1st of every month (the owner's decision, 18
 *   November 2026), by SWIFT to the designer's bank, in US dollars, for the
 *   sales paid up to the end of the month before, cut off at midnight
 *   Istanbul time (lib/studio-market/payout-calendar.ts); from USD 250:
 *   below that the balance carries over to the next 1st.
 *   Only once the designer's checks (ID, name and country, the bank) are
 *   approved, which happens before the first payout, never before
 *   publishing. From the 1st, Yallapp's team prepares the month's bank
 *   file (each due designer's balance before the cut-off, fixed then, with
 *   the bank details as approved then), sends the transfers from its bank, and marks each one sent with
 *   the bank's reference and date: the designer gets a receipt. Nothing here
 *   moves money: the platform only records what the team did.
 *
 * The designer's balance, in whole US cents:
 * - available: their sales less every payout prepared or sent;
 * - pending: payouts prepared and not sent yet (on their way);
 * - paid out: payouts sent.
 */

/** USD 250: the least a payout is; below it the balance carries over. */
export const PAYOUT_MIN_CENTS = 25_000;

/** English texts the dashboard and the admin show (marketMoney.known translates the designer's). */
export const MONEY_MESSAGES = {
  reference: "Enter the bank's reference for the transfer, 3 to 64 characters.",
  sentOn: "Enter the day the bank sent it, not before it was prepared nor in the future.",
  note: "Say why it wasn't sent, 3 to 500 characters.",
  notProcessing: "This payout isn't waiting to be sent any more.",
  sent: "Marked as sent. The designer was emailed a receipt.",
  cancelled: "Cancelled. The amount is back in the designer's balance.",
} as const;

// ——— The ledger ———

const cents = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;

/**
 * The ledger's entry for a paid order: the order's own amounts, never
 * worked out again. Null when the order isn't paid, or when its amounts
 * aren't whole cents adding up to the sale (they always are: the checkout
 * splits them, lib/studio-market/plans.ts › splitSale).
 */
export function saleEntry(order: TemplateOrder, now: Date): DesignerLedgerEntry | null {
  if (order.status !== "paid") return null;
  if (!cents(order.grossCents) || !cents(order.designerCents) || !cents(order.yallappCents) || order.designerCents + order.yallappCents !== order.grossCents) return null;
  return {
    id: order.id,
    designerId: order.designerId,
    templateId: order.templateId,
    clientId: order.clientId,
    kind: order.kind,
    plan: order.plan,
    grossCents: order.grossCents,
    designerCents: order.designerCents,
    yallappCents: order.yallappCents,
    earnedAt: order.paidAt ?? now,
    createdAt: now,
  };
}

/** Writes a paid sale in the designer's ledger, once. True when it was written now. */
export async function recordSale(store: DataStore, order: TemplateOrder, now: Date): Promise<boolean> {
  const entry = saleEntry(order, now);
  if (!entry) {
    if (order.status === "paid") console.error(`[studio-market] order ${order.id}'s amounts don't add up: it isn't in the designer's ledger`);
    return false;
  }
  return store.recordDesignerSale(entry);
}

/**
 * Every paid sale in the ledger (a designer's, or everyone's): the delivery
 * writes each one as it is paid; this puts in any a cut-short delivery
 * missed and the sales paid before the ledger existed. The daily job, the
 * designer's page and the payouts run it. Returns how many it wrote.
 */
export async function syncLedger(store: DataStore, now: Date, designerId?: string): Promise<number> {
  const [paid, entries] = await Promise.all([store.listTemplateOrders({ status: "paid", ...(designerId ? { designerId } : {}) }), store.listDesignerLedger(designerId ? { designerId } : {})]);
  const have = new Set(entries.map((e) => e.id));
  let written = 0;
  for (const order of paid) if (!have.has(order.id) && (await recordSale(store, order, now))) written++;
  return written;
}

// ——— The balance ———

export interface DesignerMoney {
  /** Every sale's 75% added up. */
  earnedCents: number;
  sales: number;
  /** Earned less every payout prepared or sent. */
  availableCents: number;
  /** Payouts prepared, on their way. */
  pendingCents: number;
  /** Payouts sent. */
  paidCents: number;
}

export function moneyOf(earned: { cents: number; sales: number } | undefined, payouts: readonly DesignerPayout[]): DesignerMoney {
  let pendingCents = 0;
  let paidCents = 0;
  for (const p of payouts) {
    if (p.status === "processing") pendingCents += p.amountCents;
    else if (p.status === "sent") paidCents += p.amountCents;
  }
  const earnedCents = earned?.cents ?? 0;
  return { earnedCents, sales: earned?.sales ?? 0, availableCents: earnedCents - pendingCents - paidCents, pendingCents, paidCents };
}

/** Before the cut-off: what a run can pay a designer (their sales paid before it, less every payout prepared or sent). */
export function dueOf(earnedBefore: { cents: number } | undefined, money: Pick<DesignerMoney, "pendingCents" | "paidCents">): number {
  return Math.max(0, (earnedBefore?.cents ?? 0) - money.pendingCents - money.paidCents);
}

/**
 * The designer's next payout: this month's run while it has USD 250 or more
 * for them and isn't prepared yet (from the 1st, for the sales paid before
 * it), else the next 1st. What it
 * includes, what counts toward the run after it, and whether it's under
 * USD 250 (then it carries over to the next 1st).
 */
export interface NextPayout {
  period: string;
  cutoff: Date;
  includedCents: number;
  laterCents: number;
  belowMin: boolean;
}

/** Where a sale is: paid out, in a payout on its way, in the next payout (or carried over under USD 250), or toward the one after. */
export type SaleState = "paid" | "on_way" | "next" | "carried" | "later";

export function nextPayout(money: DesignerMoney, sales: readonly DesignerLedgerEntry[], payouts: readonly DesignerPayout[], now: Date): NextPayout {
  const earnedBefore = (cutoff: Date) => ({ cents: sales.reduce((n, e) => (e.earnedAt.getTime() < cutoff.getTime() ? n + e.designerCents : n), 0) });
  // This month's run while it still has something for them (USD 250 or more, not prepared yet); else the next 1st.
  const current = payoutPeriod(now);
  const preparedNow = payouts.some((p) => p.period === current && p.status !== "cancelled");
  const period = !preparedNow && dueOf(earnedBefore(periodCutoff(current)), money) >= PAYOUT_MIN_CENTS ? current : nextPeriod(current);
  const cutoff = periodCutoff(period);
  const includedCents = dueOf(earnedBefore(cutoff), money);
  return { period, cutoff, includedCents, laterCents: Math.max(0, money.availableCents - includedCents), belowMin: includedCents < PAYOUT_MIN_CENTS };
}

/** A sale is in a payout when it was paid before its cut-off and was in the ledger when the payout was prepared (each payout pays the whole balance before its cut-off). */
export function saleState(sale: Pick<DesignerLedgerEntry, "earnedAt" | "createdAt">, payouts: readonly DesignerPayout[], next: NextPayout): SaleState {
  const covered = (p: DesignerPayout) => sale.earnedAt.getTime() < periodCutoff(p.period).getTime() && sale.createdAt.getTime() <= p.preparedAt.getTime();
  if (payouts.some((p) => p.status === "sent" && covered(p))) return "paid";
  if (payouts.some((p) => p.status === "processing" && covered(p))) return "on_way";
  if (sale.earnedAt.getTime() < next.cutoff.getTime()) return next.belowMin ? "carried" : "next";
  return "later";
}

/** A designer's money, their sales in the ledger first, and their next payout. */
export async function designerMoney(store: DataStore, designerId: string, now: Date): Promise<{ money: DesignerMoney; sales: DesignerLedgerEntry[]; payouts: DesignerPayout[]; next: NextPayout }> {
  await syncLedger(store, now, designerId);
  const [sales, payouts] = await Promise.all([store.listDesignerLedger({ designerId }), store.listDesignerPayouts({ designerId })]);
  const earned = { cents: sales.reduce((n, e) => n + e.designerCents, 0), sales: sales.length };
  const money = moneyOf(earned, payouts);
  return { money, sales, payouts, next: nextPayout(money, sales, payouts, now) };
}

export { nextPeriod, payoutPeriod, periodCutoff } from "./payout-calendar";

/** "300.00": cents as dollars for the bank's file, without floating point. */
export function centsDecimal(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError("Not a whole, positive number of cents");
  return `${(value - (value % 100)) / 100}.${String(value % 100).padStart(2, "0")}`;
}

// ——— The month's payouts ———

/**
 * Where a designer is in the month's run (the payout of the 1st): due (USD
 * 250 or more of sales paid before the cut-off, checks approved), waiting
 * for their checks, below USD 250 (it carries over to the next 1st),
 * prepared (in the bank's file, to send) or sent this month.
 */
export type RunState = "due" | "checks" | "below" | "processing" | "sent";

export interface RunRow {
  designer: TemplateDesigner;
  money: DesignerMoney;
  /** What this run can pay: the sales paid before its cut-off, less every payout prepared or sent. */
  dueCents: number;
  /** Sales after the cut-off: they wait for the next 1st. */
  laterCents: number;
  details: DesignerPayoutDetails | null;
  /** This month's payout, prepared or sent. */
  payout: DesignerPayout | null;
  state: RunState;
}

export interface PayoutRun {
  /** "2026-12": the run of 1 December 2026. */
  period: string;
  /** Its cut-off: 1 December 00:00 in Istanbul. */
  cutoff: Date;
  rows: RunRow[];
}

/** This month's run: every designer who earned something, the due first, then those waiting, the prepared, the sent and those below USD 250. */
export async function payoutRun(store: DataStore, now: Date): Promise<PayoutRun> {
  await syncLedger(store, now);
  const period = payoutPeriod(now);
  const cutoff = periodCutoff(period);
  const [earnings, before, payouts, details] = await Promise.all([store.designerEarnings(), store.designerEarnings(cutoff), store.listDesignerPayouts({}), store.listDesignerPayoutDetails()]);
  const ids = [...new Set([...Object.keys(earnings), ...payouts.map((p) => p.designerId)])];
  const designers = await store.listTemplateDesigners(ids);
  const detailsOf = new Map(details.map((d) => [d.designerId, d]));
  const order: Record<RunState, number> = { due: 0, checks: 1, processing: 2, sent: 3, below: 4 };
  const rows = designers.map((designer): RunRow => {
    const own = payouts.filter((p) => p.designerId === designer.id);
    const money = moneyOf(earnings[designer.id], own);
    const dueCents = dueOf(before[designer.id], money);
    const payout = own.find((p) => p.period === period && p.status !== "cancelled") ?? null;
    const d = detailsOf.get(designer.id) ?? null;
    const state: RunState = payout ? (payout.status === "sent" ? "sent" : "processing") : dueCents < PAYOUT_MIN_CENTS ? "below" : d?.status === "approved" ? "due" : "checks";
    return { designer, money, dueCents, laterCents: Math.max(0, money.availableCents - dueCents), details: d, payout, state };
  });
  rows.sort((a, b) => order[a.state] - order[b.state] || b.dueCents - a.dueCents || a.designer.name.localeCompare(b.designer.name));
  return { period, cutoff, rows };
}

/** The admin menu's count, without writing anything: this month's payouts due and those prepared, still to send. */
export async function payoutsToDo(store: DataStore, now: Date): Promise<number> {
  const period = payoutPeriod(now);
  const [before, payouts, approved] = await Promise.all([store.designerEarnings(periodCutoff(period)), store.listDesignerPayouts({ statuses: ["processing", "sent"] }), store.listDesignerPayoutDetails(["approved"])]);
  let n = payouts.filter((p) => p.status === "processing").length;
  for (const d of approved) {
    const own = payouts.filter((p) => p.designerId === d.designerId);
    if (own.some((p) => p.period === period)) continue;
    if (dueOf(before[d.designerId], moneyOf(undefined, own)) >= PAYOUT_MIN_CENTS) n++;
  }
  return n;
}

export interface MoneyDeps {
  store: DataStore;
  /** The platform's encryption key (lib/env.ts › encryptionKey). */
  key: Buffer;
  now: Date;
  /** The team member's email. */
  by: string;
}

/** The encryption context of a payout's account: bound to it, so a value can't be moved to another row (the rekey job knows it: lib/jobs/rekey.ts). */
export const payoutAccountContext = (payoutId: string) => `studio_market_payouts.account:${payoutId}`;

/**
 * Prepares this month's bank file: each due designer's balance before the
 * cut-off (their sales paid before the 1st at 00:00 in Istanbul, less what
 * was paid) becomes a payout, its amount fixed now with the bank details as
 * approved (the account encrypted again for the payout). A sale after the
 * cut-off never goes in it. A designer whose balance or month changed
 * meanwhile is left for the next try. Returns the payouts made.
 */
export async function preparePayouts(deps: MoneyDeps): Promise<{ prepared: DesignerPayout[]; skipped: number }> {
  const run = await payoutRun(deps.store, deps.now);
  const prepared: DesignerPayout[] = [];
  let skipped = 0;
  for (const row of run.rows) {
    if (row.state !== "due" || !row.details) continue;
    const payout = newPayout(deps, row.designer, row.details, row.dueCents, run.period);
    const outcome = await deps.store.createDesignerPayout(payout, { before: run.cutoff, expectedCents: row.dueCents });
    if (outcome === "created") prepared.push(payout);
    else skipped++;
  }
  return { prepared, skipped };
}

function newPayout(deps: MoneyDeps, designer: TemplateDesigner, details: DesignerPayoutDetails, amountCents: number, period: string): DesignerPayout {
  const id = newId();
  const account = detailsAccount(details, deps.key);
  return {
    id,
    designerId: designer.id,
    period,
    status: "processing",
    amountCents,
    currency: "USD",
    payeeName: details.holderName,
    payeeCountry: details.country,
    payeeAddress: details.address,
    accountKind: details.accountKind,
    accountEncrypted: encrypt(account, deps.key, payoutAccountContext(id)),
    accountHint: maskAccount(account, details.accountKind),
    swift: details.swift,
    bankCode: details.bankCode,
    bankName: details.bankName,
    bankCountry: details.bankCountry,
    preparedAt: deps.now,
    preparedBy: deps.by,
    bankReference: null,
    sentOn: null,
    sentAt: null,
    sentBy: null,
    emailedAt: null,
    cancelledAt: null,
    cancelledBy: null,
    cancelNote: null,
  };
}

/** The payout's account (IBAN or number) in full, for the bank's file. */
export function payoutAccount(payout: Pick<DesignerPayout, "id" | "accountEncrypted">, key: Buffer): string {
  return decrypt(payout.accountEncrypted, key, payoutAccountContext(payout.id));
}

/** "YYYY-MM-DD" as a day, or null. */
function readDay(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const day = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === value ? value : null;
}

/** "Mark as sent": the bank's reference and the day it went out (not before the payout was prepared, nor after today). */
export function readSent(input: { reference: string; sentOn: string }, payout: Pick<DesignerPayout, "preparedAt">, now: Date): { ok: true; value: { bankReference: string; sentOn: string } } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const bankReference = input.reference.replace(/\s+/g, " ").trim();
  if (bankReference.length < 3 || bankReference.length > 64 || /[\u0000-\u001f\u007f]/.test(bankReference)) errors.reference = MONEY_MESSAGES.reference;
  const sentOn = readDay(input.sentOn.trim());
  if (!sentOn || sentOn < payout.preparedAt.toISOString().slice(0, 10) || sentOn > now.toISOString().slice(0, 10)) errors.sentOn = MONEY_MESSAGES.sentOn;
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { bankReference, sentOn: sentOn! } };
}

export type SentResult = { ok: true; payout: DesignerPayout } | { ok: false; errors: Record<string, string> };

/** Records the transfer the team sent: the payout is sent, the pending amount is paid out. Once, whoever clicks first. */
export async function markPayoutSent(deps: Omit<MoneyDeps, "key">, payout: DesignerPayout, input: { reference: string; sentOn: string }): Promise<SentResult> {
  if (payout.status !== "processing") return { ok: false, errors: { form: MONEY_MESSAGES.notProcessing } };
  const read = readSent(input, payout, deps.now);
  if (!read.ok) return read;
  const patch = { ...read.value, sentAt: deps.now, sentBy: deps.by };
  if (!(await deps.store.markDesignerPayoutSent(payout.id, patch))) return { ok: false, errors: { form: MONEY_MESSAGES.notProcessing } };
  return { ok: true, payout: { ...payout, ...patch, status: "sent" } };
}

/** A prepared payout the bank didn't send (a wrong account, a transfer returned before it left): cancelled with why, its amount back in the balance. */
export async function cancelPayout(deps: Omit<MoneyDeps, "key">, payout: DesignerPayout, note: string): Promise<{ ok: true } | { ok: false; errors: Record<string, string> }> {
  if (payout.status !== "processing") return { ok: false, errors: { form: MONEY_MESSAGES.notProcessing } };
  const cancelNote = note.replace(/\s+/g, " ").trim();
  if (cancelNote.length < 3 || cancelNote.length > 500) return { ok: false, errors: { note: MONEY_MESSAGES.note } };
  if (!(await deps.store.cancelDesignerPayout(payout.id, { cancelledAt: deps.now, cancelledBy: deps.by, cancelNote }))) return { ok: false, errors: { form: MONEY_MESSAGES.notProcessing } };
  return { ok: true };
}

// ——— The bank's file ———

export const CSV_COLUMNS = [
  "Payout ID",
  "Designer",
  "Beneficiary name",
  "Beneficiary address",
  "Beneficiary country",
  "Account type",
  "IBAN or account number",
  "SWIFT/BIC",
  "Bank code",
  "Bank name",
  "Bank country",
  "Amount",
  "Currency",
  "Payment reference",
] as const;

/** The transfer's own words on the designer's statement. */
export const paymentReference = (payout: Pick<DesignerPayout, "id" | "period">) => `Yallapp Studio Market ${payout.period} ${payout.id.slice(0, 8).toUpperCase()}`;

/**
 * The month's bank file: one row a payout prepared and not sent yet, the
 * account in full (for Yallapp's bank only: the file is downloaded by those
 * with `market.payouts`, and each download is in the audit log). UTF-8 with
 * a BOM, so a spreadsheet reads names in any language; a formula-looking cell
 * is kept as text.
 */
export function payoutsCsv(payouts: readonly DesignerPayout[], designers: ReadonlyMap<string, Pick<TemplateDesigner, "name" | "slug">>, key: Buffer): string {
  const rows: string[][] = [[...CSV_COLUMNS]];
  for (const p of payouts) {
    if (p.status !== "processing") continue;
    const designer = designers.get(p.designerId);
    rows.push([
      p.id,
      designer ? `${designer.name} (${designer.slug})` : p.designerId,
      p.payeeName,
      p.payeeAddress,
      p.payeeCountry,
      p.accountKind === "iban" ? "IBAN" : "Account number",
      payoutAccount(p, key),
      p.swift,
      p.bankCode ?? "",
      p.bankName,
      p.bankCountry,
      centsDecimal(p.amountCents),
      p.currency,
      paymentReference(p),
    ]);
  }
  return `﻿${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
