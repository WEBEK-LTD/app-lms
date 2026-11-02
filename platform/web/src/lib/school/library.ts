import type { Lang } from "@/i18n/config";
import { addDays, utcToLocal } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App, SchoolBook, SchoolBookCopy, SchoolBookHold, SchoolBookLoan, SchoolLibrarySettings, SchoolPerson, SchoolSettings } from "../data/types";
import { notifyDeps, type FlowDeps } from "../delivery/flow";
import type { Words } from "../delivery/notify";
import type { sendPush } from "../hosted/push";
import { appIsActive } from "../license/status";
import { schoolSettingsOf } from "./settings";
import { schoolToday } from "./service";
import { borrowerUsers, tellUsers } from "./tell";

/**
 * 113.11 The school's library: books and their copies (each with its own
 * code), lent and returned at the desk in the dashboard by the student's
 * code or name and the copy's code, due after the school's loan days;
 * books reserved from the app wait for a copy, which is then held for the
 * school's days; the student and their parents are told when a hold is
 * ready, before the due date and when a book is overdue.
 */

export const DEFAULT_LIBRARY_SETTINGS: SchoolLibrarySettings = { loanDays: 14, holdDays: 3, maxLoans: 3, remindDays: 2 };

export const LIBRARY_LIMITS = {
  books: 20_000,
  copiesPerBook: 200,
  title: 200,
  author: 120,
  isbn: 20,
  shelf: 40,
  category: 60,
  language: 40,
  description: 2000,
  code: 40,
  maxLoanDays: 180,
  maxHoldDays: 30,
  maxLoans: 20,
  maxRemindDays: 14,
  /** Holds one person keeps waiting or ready at once. */
  holdsPerPerson: 5,
} as const;

/** Overdue books are reminded of again every this many days. */
export const OVERDUE_EVERY_DAYS = 3;

export function librarySettingsOf(settings: Pick<SchoolSettings, "library">): SchoolLibrarySettings {
  return { ...DEFAULT_LIBRARY_SETTINGS, ...(settings.library ?? {}) };
}

/** A copy's code as it is kept: its letters in capitals, without spaces around. */
export const copyCode = (text: string): string => text.trim().toUpperCase();

/** Whether a ready hold still holds its copy. */
export const holdLive = (hold: SchoolBookHold, now: Date): boolean => hold.status === "waiting" || (hold.status === "ready" && (hold.expiresAt === null || hold.expiresAt > now));

/** A book's copies now: on loan, held for someone, and free on the shelf. */
export interface BookShelf {
  copies: SchoolBookCopy[];
  onLoan: Map<number, SchoolBookLoan>;
  heldFor: Map<number, SchoolBookHold>;
  free: SchoolBookCopy[];
  waiting: SchoolBookHold[];
}

export async function bookShelf(store: DataStore, appId: string, bookId: number, now: Date): Promise<BookShelf> {
  const [copies, loans, holds] = await Promise.all([
    store.listSchoolBookCopies(appId, { bookId }),
    store.listSchoolBookLoans(appId, { bookId, open: true }),
    store.listSchoolBookHolds(appId, { bookId, statuses: ["waiting", "ready"] }),
  ]);
  const onLoan = new Map(loans.map((l) => [l.copyId, l]));
  const heldFor = new Map(holds.filter((h) => h.status === "ready" && h.copyId !== null && holdLive(h, now)).map((h) => [h.copyId!, h]));
  return { copies, onLoan, heldFor, free: copies.filter((c) => !onLoan.has(c.id) && !heldFor.has(c.id)), waiting: holds.filter((h) => h.status === "waiting") };
}

const READY: Record<Lang, (title: string, until: string) => Words> = {
  en: (title, until) => ({ title: "Your book is waiting", body: `${title} is held for you at the library until ${until}.` }),
  ar: (title, until) => ({ title: "كتابك بانتظارك", body: `كتاب ${title} محجوز لك في المكتبة حتى ${until}.` }),
  tr: (title, until) => ({ title: "Kitabınız sizi bekliyor", body: `${title}, ${until} tarihine kadar kütüphanede sizin için ayrıldı.` }),
};

const DUE: Record<"soon" | "overdue", Record<Lang, (name: string, title: string, due: string) => Words>> = {
  soon: {
    en: (name, title, due) => ({ title: "A library book is due soon", body: `${name}: ${title} goes back to the library by ${due}.` }),
    ar: (name, title, due) => ({ title: "موعد إعادة كتاب المكتبة قريب", body: `${name}: يُعاد كتاب ${title} إلى المكتبة قبل ${due}.` }),
    tr: (name, title, due) => ({ title: "Kütüphane kitabının iade günü yaklaşıyor", body: `${name}: ${title}, ${due} tarihine kadar kütüphaneye iade edilmeli.` }),
  },
  overdue: {
    en: (name, title, due) => ({ title: "A library book is overdue", body: `${name}: ${title} was due back on ${due}. Please return it to the library.` }),
    ar: (name, title, due) => ({ title: "تأخرت إعادة كتاب المكتبة", body: `${name}: كان موعد إعادة كتاب ${title} يوم ${due}. يُرجى إعادته إلى المكتبة.` }),
    tr: (name, title, due) => ({ title: "Kütüphane kitabının iadesi gecikti", body: `${name}: ${title} ${due} tarihinde iade edilmeliydi. Lütfen kütüphaneye iade edin.` }),
  },
};

async function safely(task: () => Promise<unknown>): Promise<void> {
  try {
    await task();
  } catch {
    // The change is saved either way.
  }
}

/** The day a hold ends, in the school's time zone. */
const dayOf = (at: Date, settings: SchoolSettings) => utcToLocal(at, settings.timezone).date;

/**
 * A book's holds put right: ready holds whose days ran out end, and the
 * free copies go to those waiting, in the order they reserved; each told
 * their copy is held for them.
 */
export async function settleHolds(deps: FlowDeps, book: Pick<SchoolBook, "id" | "title">): Promise<void> {
  const { store, app, now } = deps;
  const ready = await store.listSchoolBookHolds(app.id, { bookId: book.id, statuses: ["ready"] });
  for (const hold of ready) {
    if (holdLive(hold, now)) continue;
    await store.updateSchoolBookHold(app.id, hold.id, { status: "expired", updatedAt: now }, { statuses: ["ready"] });
  }
  const shelf = await bookShelf(store, app.id, book.id, now);
  if (shelf.waiting.length === 0 || shelf.free.length === 0) return;
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  const days = librarySettingsOf(settings).holdDays;
  const expiresAt = new Date(now.getTime() + days * 86_400_000);
  const free = [...shelf.free];
  for (const hold of shelf.waiting) {
    const copy = free.shift();
    if (!copy) break;
    const moved = await store.updateSchoolBookHold(app.id, hold.id, { status: "ready", copyId: copy.id, readyAt: now, expiresAt, updatedAt: now }, { statuses: ["waiting"] });
    if (!moved) continue;
    const person = await store.getSchoolPerson(app.id, hold.personId);
    if (person) await safely(async () => tellUsers(notifyDeps(deps), await borrowerUsers(store, person), (lang) => READY[lang](book.title, dayOf(expiresAt, settings)), { type: "school_library" }));
  }
}

export type HoldResult = { ok: true; hold: SchoolBookHold } | { ok: false; code: "already_held" | "on_loan_to_you" | "too_many_holds" | "no_copies"; message: string };

/** Reserves the book for the person: held now when a copy is free, else waiting for one. */
export async function placeHold(deps: FlowDeps, book: SchoolBook, person: SchoolPerson): Promise<HoldResult> {
  const { store, app, now } = deps;
  const [holds, loans, copies] = await Promise.all([
    store.listSchoolBookHolds(app.id, { personId: person.id, statuses: ["waiting", "ready"] }),
    store.listSchoolBookLoans(app.id, { personId: person.id, open: true }),
    store.listSchoolBookCopies(app.id, { bookId: book.id }),
  ]);
  const live = holds.filter((h) => holdLive(h, now));
  if (copies.length === 0) return { ok: false, code: "no_copies", message: "The library has no copy of this book to reserve." };
  if (live.some((h) => h.bookId === book.id)) return { ok: false, code: "already_held", message: "This book is reserved already." };
  if (loans.some((l) => l.bookId === book.id)) return { ok: false, code: "on_loan_to_you", message: "This book is borrowed already." };
  if (live.length >= LIBRARY_LIMITS.holdsPerPerson) return { ok: false, code: "too_many_holds", message: `You can reserve up to ${LIBRARY_LIMITS.holdsPerPerson} books at once.` };
  const made = await store.createSchoolBookHold({ appId: app.id, bookId: book.id, personId: person.id, status: "waiting", copyId: null, readyAt: null, expiresAt: null, createdAt: now, updatedAt: now });
  await settleHolds(deps, book);
  const [hold] = await store.listSchoolBookHolds(app.id, { personId: person.id, bookId: book.id }).then((list) => list.filter((h) => h.id === made.id));
  return { ok: true, hold: hold ?? made };
}

/** Cancels a hold that is waiting or ready; its copy goes to the next one waiting. */
export async function cancelHold(deps: FlowDeps, hold: SchoolBookHold, book: Pick<SchoolBook, "id" | "title">): Promise<boolean> {
  const done = await deps.store.updateSchoolBookHold(deps.app.id, hold.id, { status: "cancelled", updatedAt: deps.now }, { statuses: ["waiting", "ready"] });
  if (done) await settleHolds(deps, book);
  return done;
}

export type LendResult = { ok: true; loan: SchoolBookLoan } | { ok: false; message: string };

/** Lends the copy at the desk: due after the school's loan days; the person's hold of the book is collected. */
export async function lendCopy(deps: FlowDeps, copy: SchoolBookCopy, book: SchoolBook, person: SchoolPerson): Promise<LendResult> {
  const { store, app, now } = deps;
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  const library = librarySettingsOf(settings);
  const [shelf, loans, holds] = await Promise.all([
    bookShelf(store, app.id, book.id, now),
    store.listSchoolBookLoans(app.id, { personId: person.id, open: true }),
    store.listSchoolBookHolds(app.id, { personId: person.id, bookId: book.id, statuses: ["waiting", "ready"] }),
  ]);
  if (shelf.onLoan.has(copy.id)) return { ok: false, message: "This copy is out on loan. Return it first." };
  const heldFor = shelf.heldFor.get(copy.id);
  if (heldFor && heldFor.personId !== person.id) return { ok: false, message: "This copy is held for someone who reserved the book. Lend another copy." };
  if (loans.length >= library.maxLoans) return { ok: false, message: `They have ${loans.length} books out already, the most the library lends at once.` };
  const made = await store.createSchoolBookLoan({
    appId: app.id,
    bookId: book.id,
    copyId: copy.id,
    personId: person.id,
    lentAt: now,
    dueOn: addDays(schoolToday(settings, now), library.loanDays),
    returnedAt: null,
    dueToldOn: null,
    overdueToldOn: null,
  });
  if (!made.ok) return { ok: false, message: "This copy is out on loan. Return it first." };
  for (const hold of holds) await store.updateSchoolBookHold(app.id, hold.id, { status: "collected", updatedAt: now }, { statuses: ["waiting", "ready"] });
  if (holds.length > 0) await settleHolds(deps, book);
  return { ok: true, loan: made.loan };
}

/** The copy came back to the desk: its loan ends and it goes to the next one waiting. */
export async function returnCopy(deps: FlowDeps, copy: SchoolBookCopy, book: Pick<SchoolBook, "id" | "title">): Promise<SchoolBookLoan | null> {
  const { store, app, now } = deps;
  const [loan] = await store.listSchoolBookLoans(app.id, { copyId: copy.id, open: true });
  if (!loan) return null;
  if (!(await store.updateSchoolBookLoan(app.id, loan.id, { returnedAt: now }, { open: true }))) return null;
  await settleHolds(deps, book);
  return { ...loan, returnedAt: now };
}

/** Whether the loan is overdue on [today]. */
export const isOverdue = (loan: Pick<SchoolBookLoan, "dueOn" | "returnedAt">, today: string): boolean => loan.returnedAt === null && loan.dueOn < today;

/** The reminder a loan needs today, if any: before it is due, and every few days once overdue. */
export function reminderDue(loan: SchoolBookLoan, today: string, library: SchoolLibrarySettings): "soon" | "overdue" | null {
  if (loan.returnedAt !== null) return null;
  if (loan.dueOn < today) return loan.overdueToldOn === null || addDays(loan.overdueToldOn, OVERDUE_EVERY_DAYS) <= today ? "overdue" : null;
  if (loan.dueToldOn === null && library.remindDays > 0 && addDays(today, library.remindDays) >= loan.dueOn) return "soon";
  return null;
}

/** 113.11 The frequent job's part: each school's loan reminders due now, told to the student and their parents. */
export async function runLibraryReminders(deps: { store: DataStore; now: Date; send?: typeof sendPush; limit?: number }): Promise<{ looked: number; told: number }> {
  const { store, now } = deps;
  const dueBy = addDays(now.toISOString().slice(0, 10), LIBRARY_LIMITS.maxRemindDays + 1);
  const loans = await store.listDueSchoolBookLoans(dueBy, deps.limit ?? 500);
  const apps = new Map<string, { app: App; settings: SchoolSettings } | null>();
  let told = 0;
  for (const loan of loans) {
    if (!apps.has(loan.appId)) {
      const app = await store.getAppById(loan.appId);
      let ok = app !== null && app.connector?.kind === "school" && !app.demo;
      if (app && ok) {
        const [client, license] = await Promise.all([store.getClientById(app.clientId), store.getLicenseForApp(app.clientId, app.id)]);
        ok = client?.status === "active" && appIsActive(license, client, now);
      }
      apps.set(loan.appId, app && ok ? { app, settings: schoolSettingsOf(await store.getSchoolSettings(app.id), app) } : null);
    }
    const school = apps.get(loan.appId);
    if (!school) continue;
    const today = schoolToday(school.settings, now);
    const kind = reminderDue(loan, today, librarySettingsOf(school.settings));
    if (!kind) continue;
    const flow = { store, app: school.app, now, send: deps.send };
    const marked = await store.updateSchoolBookLoan(school.app.id, loan.id, kind === "soon" ? { dueToldOn: today } : { overdueToldOn: today }, { open: true });
    if (!marked) continue;
    try {
      const [person, book] = await Promise.all([store.getSchoolPerson(school.app.id, loan.personId), store.getSchoolBook(school.app.id, loan.bookId)]);
      if (!person || !book) continue;
      await tellUsers(notifyDeps(flow), await borrowerUsers(store, person), (lang) => DUE[kind][lang](person.name, book.title, loan.dueOn), { type: "school_library", ...(person.role === "student" ? { student_id: String(person.id) } : {}) });
      told += 1;
    } catch (error) {
      // One reminder that can't go out never stops the others.
      console.error("[library] reminder", loan.id, error instanceof Error ? error.message : String(error));
    }
  }
  return { looked: loans.length, told };
}
