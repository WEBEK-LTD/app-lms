import { parseCountry } from "../account/country";
import { decrypt, encrypt } from "../crypto/encryption";
import type { DataStore } from "../data/store";
import type { DesignerPayoutDetails, TemplateDesigner } from "../data/types";

/**
 * 106.11 The checks before a designer's first payout (never before
 * publishing): their ID, the name on it and where they live, and the bank
 * account a SWIFT transfer goes to (its holder and address, the IBAN or the
 * account number, SWIFT/BIC, a routing or sort code where the bank has one,
 * the bank and its country). The designer enters them in the designer area
 * with a photo or PDF of the ID; Yallapp's team approves them or asks for a
 * fix with a note (Admin › Studio Market › Payout checks). A change sends
 * them to the team again, and payouts wait until they are approved.
 *
 * The ID number and the IBAN or account number are encrypted at rest with
 * the platform's key (the same as every other secret), bound to the
 * designer, and shown masked ("•••• 1326") everywhere except to the team
 * members with `market.payouts`. They are never logged, nor written to the
 * audit log.
 */

export const DETAILS_LIMITS = { name: 120, address: 300, bankName: 120, note: 1000, documentBytes: 5 * 1024 * 1024 } as const;

/** English texts the dashboard translates (marketMoney.known). */
export const DETAILS_MESSAGES = {
  legalName: "Enter your full name as it is on your ID.",
  country: "Choose the country you live in.",
  idType: "Choose your ID's kind.",
  idNumber: "Enter your ID's number: 4 to 30 letters and numbers.",
  document: "Add a photo or PDF of your ID: PNG, JPEG or PDF, up to 5 MB.",
  holderName: "Enter the name on the bank account.",
  account: "Enter your account number: 4 to 34 letters and numbers.",
  iban: "This IBAN isn't right: check its letters and numbers.",
  ibanCountry: "The IBAN's first two letters should be the bank's country.",
  swift: "Enter the bank's SWIFT/BIC code: 8 or 11 letters and numbers.",
  swiftCountry: "The SWIFT/BIC code's 5th and 6th letters should be the bank's country.",
  bankCode: "Keep the routing or sort code to 34 letters and numbers.",
  bankName: "Enter the bank's name.",
  bankCountry: "Choose the bank's country.",
  address: "Enter your address: the street, city and postal code (SWIFT transfers need it).",
  confirm: "Tick the box to confirm these are yours and right.",
  saved: "Sent to our team. We check them within 2 working days and email you.",
  note: "Write what the designer should fix, 3 to 1000 characters.",
  changed: "The designer changed these meanwhile: look at them again.",
  approved: "Approved. Their payouts can go out.",
  fixAsked: "Sent back to the designer with your note.",
} as const;

const clean = (value: string) => value.replace(/\s+/g, " ").trim();
/** IBANs, numbers and codes as banks write them: capitals, no spaces or dashes. */
export const compact = (value: string) => value.replace(/[\s-]+/g, "").toUpperCase();

/** ISO 13616: two letters, two check digits, up to 30 letters and numbers, and the whole mod 97 is 1. */
export function ibanValid(value: string): boolean {
  const iban = compact(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const moved = iban.slice(4) + iban.slice(0, 4);
  let rest = 0;
  for (const ch of moved) {
    const code = ch >= "A" && ch <= "Z" ? String(ch.charCodeAt(0) - 55) : ch;
    for (const digit of code) rest = (rest * 10 + (digit.charCodeAt(0) - 48)) % 97;
  }
  return rest === 1;
}

/** SWIFT/BIC: the bank (4 letters), its country (2), its place (2) and, optionally, the branch (3). */
export function swiftValid(value: string): boolean {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/.test(compact(value));
}

/** "TR33 •••• 1326" for an IBAN (its country and check digits, the last four), "•••• 6789" for an account number or an ID. */
export function maskAccount(value: string, kind: "iban" | "number"): string {
  const v = compact(value);
  const tail = v.length >= 8 ? v.slice(-4) : v.slice(-2);
  return kind === "iban" && v.length >= 8 ? `${v.slice(0, 4)} •••• ${tail}` : `•••• ${tail}`;
}

export function maskId(value: string): string {
  return maskAccount(value, "number");
}

/** The encryption contexts: each value bound to its designer and field. */
const context = (designerId: string, field: "id_number" | "account") => `studio_market_payout_details.${field}:${designerId}`;

export function detailsIdNumber(details: Pick<DesignerPayoutDetails, "designerId" | "idNumberEncrypted">, key: Buffer): string {
  return decrypt(details.idNumberEncrypted, key, context(details.designerId, "id_number"));
}

export function detailsAccount(details: Pick<DesignerPayoutDetails, "designerId" | "accountEncrypted">, key: Buffer): string {
  return decrypt(details.accountEncrypted, key, context(details.designerId, "account"));
}

export interface DetailsInput {
  legalName: string;
  country: string;
  idType: string;
  /** Empty when editing: the number kept. */
  idNumber: string;
  holderName: string;
  accountKind: string;
  /** Empty when editing: the account kept (only while its kind stays). */
  account: string;
  swift: string;
  bankCode: string;
  bankName: string;
  bankCountry: string;
  address: string;
  /** "These are mine and right." */
  confirm: boolean;
  /** A new ID document was added (checked by the action: its type and size). */
  hasDocument: boolean;
}

export interface ReadDetails {
  legalName: string;
  country: string;
  idType: DesignerPayoutDetails["idType"];
  /** Null: keep the one saved. */
  idNumber: string | null;
  holderName: string;
  accountKind: DesignerPayoutDetails["accountKind"];
  account: string | null;
  swift: string;
  bankCode: string | null;
  bankName: string;
  bankCountry: string;
  address: string;
}

/** The checks as sent, each field checked; an error per field otherwise (English, marketMoney.known). */
export function readPayoutDetails(input: DetailsInput, existing: DesignerPayoutDetails | null): { ok: true; value: ReadDetails } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const legalName = clean(input.legalName);
  if (legalName.length < 2 || legalName.length > DETAILS_LIMITS.name) errors.legalName = DETAILS_MESSAGES.legalName;
  const country = parseCountry(input.country);
  if (!country) errors.country = DETAILS_MESSAGES.country;
  const idType = input.idType === "passport" || input.idType === "national_id" ? input.idType : null;
  if (!idType) errors.idType = DETAILS_MESSAGES.idType;
  const idNumber = compact(input.idNumber);
  if (idNumber ? !/^[A-Z0-9]{4,30}$/.test(idNumber) : !existing) errors.idNumber = DETAILS_MESSAGES.idNumber;
  if (!input.hasDocument && !existing?.idDocumentAssetId) errors.document = DETAILS_MESSAGES.document;
  const holderName = clean(input.holderName);
  if (holderName.length < 2 || holderName.length > DETAILS_LIMITS.name) errors.holderName = DETAILS_MESSAGES.holderName;
  const accountKind = input.accountKind === "number" ? "number" : "iban";
  const bankCountry = parseCountry(input.bankCountry);
  if (!bankCountry) errors.bankCountry = DETAILS_MESSAGES.bankCountry;
  const account = compact(input.account);
  // A saved account is kept only while its kind stays: an IBAN can't become a number unseen.
  const keepAccount = !account && existing !== null && existing.accountKind === accountKind;
  if (!keepAccount) {
    if (accountKind === "iban") {
      if (!ibanValid(account)) errors.account = DETAILS_MESSAGES.iban;
      else if (bankCountry && account.slice(0, 2) !== bankCountry) errors.account = DETAILS_MESSAGES.ibanCountry;
    } else if (!/^[A-Z0-9]{4,34}$/.test(account)) errors.account = DETAILS_MESSAGES.account;
  }
  const swift = compact(input.swift);
  if (!swiftValid(swift)) errors.swift = DETAILS_MESSAGES.swift;
  else if (bankCountry && swift.slice(4, 6) !== bankCountry) errors.swift = DETAILS_MESSAGES.swiftCountry;
  const bankCode = compact(input.bankCode);
  if (bankCode && !/^[A-Z0-9]{1,34}$/.test(bankCode)) errors.bankCode = DETAILS_MESSAGES.bankCode;
  const bankName = clean(input.bankName);
  if (bankName.length < 2 || bankName.length > DETAILS_LIMITS.bankName) errors.bankName = DETAILS_MESSAGES.bankName;
  const address = clean(input.address);
  if (address.length < 5 || address.length > DETAILS_LIMITS.address) errors.address = DETAILS_MESSAGES.address;
  if (!input.confirm) errors.confirm = DETAILS_MESSAGES.confirm;
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { legalName, country: country!, idType: idType!, idNumber: idNumber || null, holderName, accountKind, account: keepAccount ? null : account, swift, bankCode: bankCode || null, bankName, bankCountry: bankCountry!, address },
  };
}

/**
 * Saves the designer's checks, the ID number and the account encrypted,
 * and sends them to the team (again): a change waits for a new approval
 * before any payout. `documentAssetId`: the ID document just added, else
 * the one saved is kept.
 */
export async function savePayoutDetails(
  deps: { store: DataStore; key: Buffer; now: Date },
  designer: Pick<TemplateDesigner, "id">,
  value: ReadDetails,
  documentAssetId: string | null,
): Promise<DesignerPayoutDetails> {
  const existing = await deps.store.getDesignerPayoutDetails(designer.id);
  const idNumberEncrypted = value.idNumber ? encrypt(value.idNumber, deps.key, context(designer.id, "id_number")) : existing?.idNumberEncrypted;
  const accountEncrypted = value.account ? encrypt(value.account, deps.key, context(designer.id, "account")) : existing?.accountEncrypted;
  if (!idNumberEncrypted || !accountEncrypted) throw new Error("The ID number and the account are needed the first time");
  const details: DesignerPayoutDetails = {
    designerId: designer.id,
    legalName: value.legalName,
    country: value.country,
    idType: value.idType,
    idNumberEncrypted,
    idDocumentAssetId: documentAssetId ?? existing?.idDocumentAssetId ?? null,
    holderName: value.holderName,
    accountKind: value.accountKind,
    accountEncrypted,
    swift: value.swift,
    bankCode: value.bankCode,
    bankName: value.bankName,
    bankCountry: value.bankCountry,
    address: value.address,
    status: "submitted",
    reviewNote: null,
    submittedAt: deps.now,
    reviewedAt: null,
    reviewedBy: null,
    createdAt: existing?.createdAt ?? deps.now,
    updatedAt: deps.now,
  };
  await deps.store.saveDesignerPayoutDetails(details);
  return details;
}

/** The checks as a page shows them: the ID number and the account masked, or in full (`reveal`, the team with `market.payouts`). */
export interface DetailsView {
  legalName: string;
  country: string;
  idType: DesignerPayoutDetails["idType"];
  idNumber: string;
  holderName: string;
  accountKind: DesignerPayoutDetails["accountKind"];
  account: string;
  swift: string;
  bankCode: string | null;
  bankName: string;
  bankCountry: string;
  address: string;
  masked: boolean;
}

export function detailsView(details: DesignerPayoutDetails, key: Buffer, reveal: boolean): DetailsView {
  const idNumber = detailsIdNumber(details, key);
  const account = detailsAccount(details, key);
  return {
    legalName: details.legalName,
    country: details.country,
    idType: details.idType,
    idNumber: reveal ? idNumber : maskId(idNumber),
    holderName: details.holderName,
    accountKind: details.accountKind,
    account: reveal ? account : maskAccount(account, details.accountKind),
    swift: details.swift,
    bankCode: details.bankCode,
    bankName: details.bankName,
    bankCountry: details.bankCountry,
    address: details.address,
    masked: !reveal,
  };
}

export type ReviewResult = { ok: true; details: DesignerPayoutDetails } | { ok: false; errors: Record<string, string> };

/**
 * The team's answer to a designer's checks: approved (their payouts can go
 * out), or a fix asked for with a note the designer reads and is emailed.
 * Only on the checks the reviewer looked at (`submittedAt`): a change the
 * designer made meanwhile is looked at again.
 */
export async function reviewPayoutDetails(
  store: DataStore,
  details: DesignerPayoutDetails,
  input: { decision: "approve" | "fix"; note: string; seen: Date },
  reviewer: string,
  now: Date,
): Promise<ReviewResult> {
  const note = input.note.trim();
  if (input.decision === "fix" && (note.length < 3 || note.length > DETAILS_LIMITS.note)) return { ok: false, errors: { note: DETAILS_MESSAGES.note } };
  if (details.status !== "submitted" || details.submittedAt.getTime() !== input.seen.getTime()) return { ok: false, errors: { form: DETAILS_MESSAGES.changed } };
  const patch = { status: input.decision === "approve" ? ("approved" as const) : ("changes_requested" as const), reviewNote: input.decision === "fix" ? note : null, reviewedAt: now, reviewedBy: reviewer };
  if (!(await store.reviewDesignerPayoutDetails(details.designerId, details.submittedAt, patch))) return { ok: false, errors: { form: DETAILS_MESSAGES.changed } };
  return { ok: true, details: { ...details, ...patch, updatedAt: now } };
}
