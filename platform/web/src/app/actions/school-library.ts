"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { App, SchoolBook, SchoolFileRef, SchoolPerson } from "@/lib/data/types";
import { appUrl } from "@/lib/env";
import { formValues, type FormState } from "@/lib/forms";
import { imageType } from "@/lib/images";
import { parseMediaLink } from "@/lib/media/files";
import { copyCode, LIBRARY_LIMITS, lendCopy, returnCopy } from "@/lib/school/library";
import { madeCodes, parseBookForm, parseBooksCsv, parseCopyCodes, parseLibrarySettings } from "@/lib/school/library-forms";
import { schoolSettingsOf } from "@/lib/school/settings";

/**
 * 113.11 The school's library on the dashboard: books and their copies
 * (one by one or from a CSV file), the desk where copies are lent and
 * returned, and the library's days.
 */

const CSV_MAX_BYTES = 2 * 1024 * 1024;
const COVER_MAX_BYTES = 3 * 1024 * 1024;

async function requireSchoolApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "school") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

function refresh() {
  revalidatePath("/dashboard/school/library", "layout");
  revalidatePath("/studio/project/school/library", "layout");
}

const idOf = (formData: FormData, name = "id"): number | null => {
  const n = Number(formData.get(name));
  return formData.get(name) && Number.isSafeInteger(n) ? n : null;
};

async function coverPicture(context: ClientContext, file: FormDataEntryValue | null, now: Date): Promise<{ assetId: string | null } | { error: string }> {
  if (!file || typeof file === "string" || file.size === 0) return { assetId: null };
  if (file.size > COVER_MAX_BYTES) return { error: "The picture can be up to 3 MB." };
  const data = Buffer.from(await file.arrayBuffer());
  const type = imageType(data);
  if (!type) return { error: "Pictures must be PNG or JPEG files." };
  const assetId = newId();
  const blobKey = `assets/${context.client.id}/${assetId}.${type.extension}`;
  await getBlobStore().put(blobKey, data, type.contentType);
  await (await getStore()).createAsset({ id: assetId, clientId: context.client.id, kind: "product_image", blobKey, contentType: type.contentType, size: data.length, createdAt: now });
  return { assetId };
}

/** The e-book: a ready PDF of the school's Media library, from its Yallapp link. */
async function ebookOf(app: App, link: string): Promise<{ file: SchoolFileRef | null } | { error: string }> {
  if (!link) return { file: null };
  const id = parseMediaLink(link, appUrl()) ?? (/^[0-9a-f-]{36}$/.test(link) ? link : null);
  const media = id ? await (await getStore()).getMediaFile(app.id, id) : null;
  if (!media || media.status !== "ready" || media.source === "chat") return { error: "Choose a PDF from your Media library." };
  if (media.kind !== "pdf") return { error: "The e-book is a PDF." };
  return { file: { fileId: media.id, name: media.name, kind: "pdf" } };
}

// Books

export async function saveBookAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const now = new Date();
  const id = idOf(formData);
  const existing = id !== null ? await store.getSchoolBook(app.id, id) : null;
  if (id !== null && !existing) return { message: "This book doesn't exist anymore." };
  if (!existing && (await store.listSchoolBooks(app.id, { limit: LIBRARY_LIMITS.books })).length >= LIBRARY_LIMITS.books) return { message: `The library can have up to ${LIBRARY_LIMITS.books} books.`, values };
  const parsed = parseBookForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const ebook = await ebookOf(app, String(formData.get("file") ?? "").trim());
  if ("error" in ebook) return { errors: { file: ebook.error }, values };
  const picture = await coverPicture(context, formData.get("cover"), now);
  if ("error" in picture) return { errors: { cover: picture.error }, values };
  const coverAssetId = picture.assetId ?? (formData.get("removeCover") === "on" ? null : (existing?.coverAssetId ?? null));
  if (existing) {
    await store.updateSchoolBook(app.id, existing.id, { ...parsed.value, coverAssetId, file: ebook.file, updatedAt: now });
    await recordStaffChange(context, `Edited the library book "${parsed.value.title}"`);
    refresh();
    return { ok: true, message: "Saved.", values };
  }
  // A new book's copies: the codes written, else as many as asked, numbered.
  const codesText = String(formData.get("codes") ?? "").trim();
  const codes = codesText ? parseCopyCodes(codesText) : null;
  if (codes && !codes.ok) return { errors: { codes: codes.error }, values };
  const count = codes ? 0 : Number(formData.get("count") || "1");
  if (!codes && (!Number.isInteger(count) || count < 0 || count > LIBRARY_LIMITS.copiesPerBook)) return { errors: { count: `Enter the copies, from 0 to ${LIBRARY_LIMITS.copiesPerBook}.` }, values };
  for (const code of codes?.codes ?? []) if (await store.getSchoolBookCopyByCode(app.id, code)) return { errors: { codes: `Another copy has the code ${code}.` }, values };
  const book = await store.createSchoolBook({ appId: app.id, ...parsed.value, coverAssetId, file: ebook.file, createdAt: now, updatedAt: now });
  await addCopies(app.id, book, codes?.codes ?? null, count, now);
  await recordStaffChange(context, `Added the library book "${book.title}"`);
  refresh();
  redirect(`/dashboard/school/library/${book.id}`);
}

/** Adds copies with these codes, else `count` numbered ones; the codes taken already are left out. */
async function addCopies(appId: string, book: SchoolBook, codes: string[] | null, count: number, now: Date): Promise<{ added: number; taken: string[] }> {
  const store = await getStore();
  const have = await store.listSchoolBookCopies(appId, { bookId: book.id });
  const room = Math.max(0, LIBRARY_LIMITS.copiesPerBook - have.length);
  const list = (codes ?? madeCodes(book.id, new Set(have.map((c) => c.code)), count)).slice(0, room);
  const taken: string[] = [];
  let added = 0;
  for (const code of list) {
    const made = await store.createSchoolBookCopy({ appId, bookId: book.id, code: copyCode(code), note: null, createdAt: now });
    if (made.ok) added += 1;
    else taken.push(code);
  }
  return { added, taken };
}

export async function deleteBookAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  const store = await getStore();
  const book = id !== null ? await store.getSchoolBook(context.app.id, id) : null;
  if (!book) return;
  await store.deleteSchoolBook(context.app.id, book.id);
  await recordStaffChange(context, `Deleted the library book "${book.title}"`);
  refresh();
  redirect("/dashboard/school/library");
}

export async function addCopiesAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const book = idOf(formData, "bookId") !== null ? await store.getSchoolBook(app.id, idOf(formData, "bookId")!) : null;
  if (!book) return { message: "This book doesn't exist anymore." };
  const codesText = String(formData.get("codes") ?? "").trim();
  const codes = codesText ? parseCopyCodes(codesText) : null;
  if (codes && !codes.ok) return { errors: { codes: codes.error }, values };
  const count = codes ? 0 : Number(formData.get("count") || "0");
  if (!codes && (!Number.isInteger(count) || count < 1 || count > LIBRARY_LIMITS.copiesPerBook)) return { errors: { count: `Enter the copies, from 1 to ${LIBRARY_LIMITS.copiesPerBook}.` }, values };
  const result = await addCopies(app.id, book, codes?.codes ?? null, count, new Date());
  await recordStaffChange(context, `Added ${result.added} copies of the library book "${book.title}"`);
  refresh();
  if (result.taken.length) return { message: `Added ${result.added}. These codes are on other copies already: ${result.taken.join(", ")}.`, values };
  return { ok: true, message: `Added ${result.added}.` };
}

export async function deleteCopyAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  const store = await getStore();
  const bookId = idOf(formData, "bookId");
  const copy = bookId !== null && id !== null ? (await store.listSchoolBookCopies(context.app.id, { bookId })).find((c) => c.id === id) : undefined;
  if (!copy) return;
  await store.deleteSchoolBookCopy(context.app.id, copy.id);
  await recordStaffChange(context, `Removed the library copy ${copy.code}`);
  refresh();
}

export async function importBooksAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const now = new Date();
  const file = formData.get("file");
  if (!file || typeof file === "string" || file.size === 0) return { errors: { file: "Choose a CSV file." } };
  if (file.size > CSV_MAX_BYTES) return { errors: { file: "The file can be up to 2 MB." } };
  const parsed = parseBooksCsv(await file.text());
  if (!parsed.ok) return { errors: { file: parsed.message } };
  const problems = [...parsed.problems];
  const books = await store.listSchoolBooks(app.id, { limit: LIBRARY_LIMITS.books });
  let added = 0;
  let copies = 0;
  for (const row of parsed.rows) {
    // The same ISBN (or the same title and author) is the same book: its new copies are added.
    let book = books.find((b) => (row.book.isbn && b.isbn === row.book.isbn) || (b.title.toLowerCase() === row.book.title.toLowerCase() && b.author.toLowerCase() === row.book.author.toLowerCase()));
    if (!book) {
      if (books.length >= LIBRARY_LIMITS.books) {
        problems.push(`Line ${row.line}: the library can have up to ${LIBRARY_LIMITS.books} books.`);
        continue;
      }
      book = await store.createSchoolBook({ appId: app.id, ...row.book, coverAssetId: null, file: null, createdAt: now, updatedAt: now });
      books.push(book);
      added += 1;
    }
    const have = await store.listSchoolBookCopies(app.id, { bookId: book.id });
    const codes = row.codes.length ? row.codes.filter((c) => !have.some((h) => h.code === c)) : null;
    const count = codes ? 0 : Math.max(0, row.copies - have.length);
    const result = await addCopies(app.id, book, codes, count, now);
    copies += result.added;
    if (result.taken.length) problems.push(`Line ${row.line}: these codes are on other copies already: ${result.taken.join(", ")}.`);
  }
  await recordStaffChange(context, `Imported ${added} library books and ${copies} copies`);
  refresh();
  // The rows with problems are listed under the message, by their line.
  const errors = Object.fromEntries(problems.slice(0, 50).map((problem, i) => [`line-${i}`, problem]));
  return { ok: added + copies > 0 || problems.length === 0, message: `Added ${added} books and ${copies} copies.`, ...(problems.length ? { errors } : {}) };
}

// The desk

/** The person at the desk: by the student's code, else by a name only one person has. */
async function borrowerOf(appId: string, text: string): Promise<{ person: SchoolPerson } | { error: string }> {
  const who = text.trim().toLowerCase();
  if (!who) return { error: "Type the student's code or name." };
  const people = (await (await getStore()).listSchoolPeople(appId)).filter((p) => p.active && p.role !== "parent");
  const byCode = people.filter((p) => p.code !== null && p.code.toLowerCase() === who);
  if (byCode.length === 1) return { person: byCode[0]! };
  const exact = people.filter((p) => p.name.toLowerCase() === who);
  const found = exact.length > 0 ? exact : people.filter((p) => p.name.toLowerCase().includes(who));
  if (found.length === 1) return { person: found[0]! };
  if (found.length === 0) return { error: "No student or member of staff has this code or name." };
  return { error: `Several people match: ${found.slice(0, 5).map((p) => (p.code ? `${p.name} (${p.code})` : p.name)).join(", ")}. Type the student's code.` };
}

export async function lendBookAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const who = await borrowerOf(app.id, values.who ?? "");
  if ("error" in who) return { errors: { who: who.error }, values };
  const code = copyCode(values.copy ?? "");
  const copy = code ? await store.getSchoolBookCopyByCode(app.id, code) : null;
  if (!copy) return { errors: { copy: "No copy has this code." }, values };
  const book = await store.getSchoolBook(app.id, copy.bookId);
  if (!book) return { errors: { copy: "No copy has this code." }, values };
  const lent = await lendCopy({ store, app, now: new Date() }, copy, book, who.person);
  if (!lent.ok) return { message: lent.message, values };
  await recordStaffChange(context, `Lent ${book.title} (${copy.code}) to ${who.person.name}`);
  refresh();
  return { ok: true, message: `Lent ${book.title} to ${who.person.name}, due back on ${lent.loan.dueOn}.`, values: { who: values.who ?? "" } };
}

export async function returnBookAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const code = copyCode(values.copy ?? "");
  const copy = code ? await store.getSchoolBookCopyByCode(app.id, code) : null;
  const book = copy ? await store.getSchoolBook(app.id, copy.bookId) : null;
  if (!copy || !book) return { errors: { copy: "No copy has this code." }, values };
  const loan = await returnCopy({ store, app, now: new Date() }, copy, book);
  if (!loan) return { message: "This copy isn't out on loan.", values };
  const person = await store.getSchoolPerson(app.id, loan.personId);
  await recordStaffChange(context, `Took back ${book.title} (${copy.code})`);
  refresh();
  return { ok: true, message: `${book.title} is back from ${person?.name ?? ""}.` };
}

/** Returns a loan from the lists (the overdue list, a person's or a book's). */
export async function returnLoanAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const id = idOf(formData);
  const [loan] = id !== null ? (await store.listSchoolBookLoans(app.id, { open: true })).filter((l) => l.id === id) : [];
  if (!loan) return;
  const [copy] = (await store.listSchoolBookCopies(app.id, { bookId: loan.bookId })).filter((c) => c.id === loan.copyId);
  const book = await store.getSchoolBook(app.id, loan.bookId);
  if (!copy || !book) return;
  await returnCopy({ store, app, now: new Date() }, copy, book);
  await recordStaffChange(context, `Took back ${book.title} (${copy.code})`);
  refresh();
}

export async function saveLibrarySettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const values = formValues(formData);
  const parsed = parseLibrarySettings(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const store = await getStore();
  const settings = schoolSettingsOf(await store.getSchoolSettings(context.app.id), context.app);
  await store.saveSchoolSettings(context.app.id, { ...settings, library: parsed.value }, new Date());
  await recordStaffChange(context, "Saved the library's settings");
  refresh();
  return { ok: true, message: "Saved.", values };
}
