"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/admin/audit";
import { parseCountry } from "@/lib/account/country";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import {
  checkContactImport,
  checkSource,
  cleanContactInput,
  cleanTag,
  cleanTags,
  contactOf,
  importSummary,
  parseLang,
  readContactImport,
  type ContactFields,
  type ContactImportFormat,
  type ContactImportRow,
  type ContactRowStatus,
} from "@/lib/mailing/contacts";
import { MAIL_CONTACT_AGREEMENT } from "@/lib/mailing/types";

/**
 * 114 Admin › Email campaigns › Contacts: the admin's customers and leads who
 * have no Yallapp account. Everything here needs "marketing.edit". Adding or
 * importing needs where they're from and the admin's tick of
 * MAIL_CONTACT_AGREEMENT (kept as who added them and when). Deleting a contact
 * keeps its address on the list never to be mailed. Every change is in the
 * audit log.
 */

export type ContactFieldErrors = Partial<Record<keyof ContactFields | "source" | "sourceNote" | "agreed", string>>;
export type ContactActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; errors?: ContactFieldErrors };

const AGREE_ERROR = `Tick “${MAIL_CONTACT_AGREEMENT}” to add them.`;
const MAX_IDS = 200;

function refresh() {
  revalidatePath("/admin/email-campaigns", "layout");
}

export interface NewContactInput {
  email: string;
  name?: string;
  company?: string;
  lang?: string;
  country?: string;
  tags?: string[] | string;
  source: string;
  sourceNote?: string;
  agreed: boolean;
}

/** Adds one contact by hand. An address that's a contact already, or a Yallapp account's, isn't added again. */
export async function addMailContactAction(input: NewContactInput): Promise<ContactActionResult<{ id: string }>> {
  const admin = await requireAdmin("marketing.edit");
  const errors: ContactFieldErrors = {};
  const fields = cleanContactInput(input);
  if (!fields.ok) Object.assign(errors, fields.errors);
  const source = checkSource(input.source, input.sourceNote);
  if (!source.ok) errors[input.source === "other" ? "sourceNote" : "source"] = source.error;
  if (input.agreed !== true) errors.agreed = AGREE_ERROR;
  if (!fields.ok || !source.ok || input.agreed !== true) return { ok: false, error: "Check the highlighted fields.", errors };
  const store = await getStore();
  const { email } = fields.fields;
  if ((await store.listAccountEmails([email])).length) return { ok: false, error: `${email} has a Yallapp account: campaigns to accounts reach it, so it isn't added as a contact.`, errors: { email: "Has a Yallapp account." } };
  if ((await store.findMailContacts([email])).length) return { ok: false, error: `${email} is a contact already.`, errors: { email: "Already a contact." } };
  const contact = contactOf(fields.fields, { source: source.source, sourceNote: source.sourceNote, addedBy: admin.email, now: new Date() });
  if ((await store.addMailContacts([contact])) === 0) return { ok: false, error: `${email} is a contact already.`, errors: { email: "Already a contact." } };
  await recordAudit({ actor: admin, action: "mail.contact_add", target: { type: "mail_contact", id: contact.id }, summary: `Added the contact ${email} (they confirmed: “${MAIL_CONTACT_AGREEMENT}”)` });
  refresh();
  return { ok: true, id: contact.id };
}

export interface ImportInput {
  text: string;
  format: ContactImportFormat;
  /** For rows without their own. */
  lang?: string;
  country?: string;
  /** Added to every row. */
  tags?: string[] | string;
}

export interface ImportPreview {
  rows: ContactImportRow[];
  summary: Record<ContactRowStatus, number>;
}

async function checkImport(input: ImportInput): Promise<{ ok: true; preview: ImportPreview } | { ok: false; error: string }> {
  const format: ContactImportFormat = input.format === "csv" ? "csv" : "paste";
  const read = readContactImport(typeof input.text === "string" ? input.text : "", format);
  if (read.error) return { ok: false, error: read.error };
  const store = await getStore();
  const emails = read.rows.map((r) => r.email.trim().toLowerCase()).filter(Boolean);
  const [contacts, accounts] = await Promise.all([store.findMailContacts(emails), store.listAccountEmails(emails)]);
  const rows = checkContactImport(read.rows, { lang: parseLang(input.lang) ?? "en", country: parseCountry(input.country), tags: cleanTags(input.tags) }, { contacts: contacts.map((c) => c.email), accounts });
  return { ok: true, preview: { rows, summary: importSummary(rows) } };
}

/** The import's rows checked, before anything is added (the preview). */
export async function previewMailContactImportAction(input: ImportInput): Promise<ContactActionResult<ImportPreview>> {
  await requireAdmin("marketing.edit");
  const checked = await checkImport(input);
  return checked.ok ? { ok: true, ...checked.preview } : checked;
}

/** Checks the rows again (never what the browser says) and adds the new ones. */
export async function importMailContactsAction(input: ImportInput & { source: string; sourceNote?: string; agreed: boolean }): Promise<ContactActionResult<{ added: number; summary: Record<ContactRowStatus, number> }>> {
  const admin = await requireAdmin("marketing.edit");
  const source = checkSource(input.source, input.sourceNote);
  if (!source.ok) return { ok: false, error: source.error, errors: { [input.source === "other" ? "sourceNote" : "source"]: source.error } };
  if (input.agreed !== true) return { ok: false, error: AGREE_ERROR, errors: { agreed: AGREE_ERROR } };
  const checked = await checkImport(input);
  if (!checked.ok) return checked;
  const now = new Date();
  const contacts = checked.preview.rows.filter((r) => r.status === "new").map((r) => contactOf(r, { source: source.source, sourceNote: source.sourceNote, addedBy: admin.email, now }));
  if (contacts.length === 0) return { ok: false, error: "No new contacts to add." };
  const added = await (await getStore()).addMailContacts(contacts);
  const s = checked.preview.summary;
  await recordAudit({
    actor: admin,
    action: "mail.contact_import",
    target: { type: "mail_contact", id: null },
    summary: `Imported ${added} contacts (${input.format === "csv" ? "CSV file" : "pasted list"}; ${s.contact} already contacts, ${s.account} with an account, ${s.duplicate} listed twice, ${s.error} with errors). They confirmed: “${MAIL_CONTACT_AGREEMENT}”`,
  });
  refresh();
  return { ok: true, added, summary: s };
}

export interface ContactEdit {
  email: string;
  name?: string;
  company?: string;
  lang?: string;
  country?: string;
  tags?: string[] | string;
  source: string;
  sourceNote?: string;
}

export async function updateMailContactAction(id: string, input: ContactEdit): Promise<ContactActionResult> {
  const admin = await requireAdmin("marketing.edit");
  const store = await getStore();
  const existing = await store.getMailContact(id);
  if (!existing) return { ok: false, error: "This contact no longer exists." };
  const errors: ContactFieldErrors = {};
  const fields = cleanContactInput(input);
  if (!fields.ok) Object.assign(errors, fields.errors);
  const source = checkSource(input.source, input.sourceNote);
  if (!source.ok) errors[input.source === "other" ? "sourceNote" : "source"] = source.error;
  if (!fields.ok || !source.ok) return { ok: false, error: "Check the highlighted fields.", errors };
  const { email } = fields.fields;
  if (email !== existing.email && (await store.listAccountEmails([email])).length) return { ok: false, error: `${email} has a Yallapp account.`, errors: { email: "Has a Yallapp account." } };
  const result = await store.updateMailContact(id, { ...fields.fields, source: source.source, sourceNote: source.sourceNote, updatedAt: new Date() });
  if (result === "missing") return { ok: false, error: "This contact no longer exists." };
  if (result === "duplicate") return { ok: false, error: `${email} is another contact's address.`, errors: { email: "Another contact has it." } };
  await recordAudit({
    actor: admin,
    action: "mail.contact_update",
    target: { type: "mail_contact", id },
    summary: `Changed the contact ${email}`,
    before: { email: existing.email, name: existing.name, company: existing.company, lang: existing.lang, country: existing.country, tags: existing.tags.join(", "), source: existing.source, sourceNote: existing.sourceNote },
    after: { email, name: fields.fields.name, company: fields.fields.company, lang: fields.fields.lang, country: fields.fields.country, tags: fields.fields.tags.join(", "), source: source.source, sourceNote: source.sourceNote },
  });
  refresh();
  return { ok: true };
}

function ids(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === "string" && v.length <= 36))].slice(0, MAX_IDS) : [];
}

/** Adds a tag to the chosen contacts, or takes it off. */
export async function tagMailContactsAction(contactIds: string[], tag: string, add: boolean): Promise<ContactActionResult<{ changed: number }>> {
  const admin = await requireAdmin("marketing.edit");
  const clean = cleanTag(tag);
  if (!clean) return { ok: false, error: "Write a tag." };
  const store = await getStore();
  const now = new Date();
  let changed = 0;
  for (const id of ids(contactIds)) {
    const contact = await store.getMailContact(id);
    if (!contact || contact.tags.includes(clean) === add) continue;
    const tags = add ? cleanTags([...contact.tags, clean]) : contact.tags.filter((t) => t !== clean);
    if (add && !tags.includes(clean)) continue; // It has the most tags a contact can.
    if ((await store.updateMailContact(id, { tags, updatedAt: now })) === "ok") changed += 1;
  }
  if (changed) await recordAudit({ actor: admin, action: "mail.contact_tag", target: { type: "mail_contact", id: null }, summary: `${add ? "Tagged" : "Untagged"} ${changed} contacts “${clean}”` });
  refresh();
  return { ok: true, changed };
}

/** Deletes the chosen contacts. Their addresses stay on the list never to be mailed, when they're on it. */
export async function deleteMailContactsAction(contactIds: string[]): Promise<ContactActionResult<{ deleted: number }>> {
  const admin = await requireAdmin("marketing.edit");
  const store = await getStore();
  const emails: string[] = [];
  for (const id of ids(contactIds)) {
    const contact = await store.getMailContact(id);
    if (contact && (await store.deleteMailContact(id))) emails.push(contact.email);
  }
  if (emails.length) await recordAudit({ actor: admin, action: "mail.contact_delete", target: { type: "mail_contact", id: null }, summary: `Deleted ${emails.length === 1 ? `the contact ${emails[0]}` : `${emails.length} contacts`}` });
  refresh();
  return { ok: true, deleted: emails.length };
}

