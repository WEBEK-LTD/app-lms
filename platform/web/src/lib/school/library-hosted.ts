import type { SchoolBook, SchoolBookHold, SchoolBookLoan, SchoolPerson, SchoolSettings } from "../data/types";
import { error, intParam } from "../hosted/connectors/common";
import type { ConnectorRequest, ConnectorResult } from "../hosted/connectors/types";
import { fileUrl } from "../media/files";
import { hitRateLimit, type RateLimitRule } from "../rate-limit";
import type { SchoolContext } from "./hosted";
import { bookShelf, cancelHold, holdLive, isOverdue, librarySettingsOf, placeHold } from "./library";
import { schoolToday, visibleStudents, type SchoolMember } from "./service";

/**
 * 113.11 The hosted API's library endpoints (tag School): the books
 * searched and browsed, a book with its e-book to read in the app, a book
 * reserved, and each person's loans and holds (a parent's children's).
 * Students and the school's teachers and staff borrow; parents follow
 * their children's.
 */

const ok = (body: unknown, status = 200): ConnectorResult => ({ status, body });
const record = (value: unknown): Record<string, unknown> => (typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const idOf = (value: string | undefined): number | null => (value && /^\d{1,15}$/.test(value) ? Number(value) : null);
const bookNotFound = () => error(404, "not_found", "Book not found.");

const HOLD_LIMIT: RateLimitRule = { name: "school_library_hold", limit: 30, windowSeconds: 3600 };
/** An e-book's signed link lasts this long. */
const EBOOK_LINK_SECONDS = 6 * 3600;

/** Whose loans the signed-in person follows: themselves (a student, a teacher, staff) and a parent's children. */
async function borrowersOf(ctx: SchoolContext, member: SchoolMember): Promise<SchoolPerson[]> {
  const out = Object.values(member).filter((p): p is SchoolPerson => p !== null && p.role !== "parent" && p.active);
  for (const child of await visibleStudents(ctx.store, ctx.app, member)) if (!out.some((p) => p.id === child.id)) out.push(child);
  return out;
}

/** The answer for a `/school/library/…` path, or null when the path isn't one. */
export async function handleLibraryRoute(ctx: SchoolContext, request: ConnectorRequest, member: SchoolMember, settings: SchoolSettings): Promise<ConnectorResult | null> {
  const path = request.path;
  if (path[1] !== "library") return null;
  const route = `${request.method} /${path.join("/")}`;
  if (route === "GET /school/library/books") return books(ctx, request);
  if (route === "GET /school/library/loans") return loans(ctx, request, member, settings);
  const id = idOf(path[3]);
  if (path[2] === "books" && id !== null) {
    const book = await ctx.store.getSchoolBook(ctx.app.id, id);
    if (!book) return bookNotFound();
    if (request.method === "GET" && path.length === 4) return bookDetail(ctx, book, member);
    if (request.method === "POST" && path[4] === "hold" && path.length === 5) return hold(ctx, request, book, member);
  }
  if (path[2] === "holds" && id !== null && request.method === "DELETE" && path.length === 4) {
    const people = await borrowersOf(ctx, member);
    const [found] = (await ctx.store.listSchoolBookHolds(ctx.app.id, { personIds: people.map((p) => p.id) })).filter((h) => h.id === id);
    if (!found) return error(404, "not_found", "Reservation not found.");
    const book = await ctx.store.getSchoolBook(ctx.app.id, found.bookId);
    if (book) await cancelHold({ store: ctx.store, app: ctx.app, now: request.now }, found, book);
    return { status: 204 };
  }
  return error(404, "not_found", "Page not found.");
}

function bookRef(book: SchoolBook, ctx: SchoolContext) {
  return { id: book.id, title: book.title, author: book.author, cover_url: book.coverAssetId ? ctx.assetUrl(book.coverAssetId) : null };
}

async function bookJson(ctx: SchoolContext, book: SchoolBook) {
  const shelf = await bookShelf(ctx.store, ctx.app.id, book.id, ctx.now);
  return {
    ...bookRef(book, ctx),
    isbn: book.isbn,
    shelf: book.shelf,
    category: book.category,
    language: book.language,
    copies: shelf.copies.length,
    available: shelf.free.length,
    waiting: shelf.waiting.length,
    ebook: book.file !== null,
  };
}

const personRef = (person: SchoolPerson | undefined) => (person ? { id: person.id, name: person.name } : null);

function holdJson(hold: SchoolBookHold, book: SchoolBook, person: SchoolPerson | undefined, ctx: SchoolContext) {
  const expired = hold.status === "ready" && !holdLive(hold, ctx.now);
  return {
    id: hold.id,
    book: bookRef(book, ctx),
    person: personRef(person),
    status: expired ? "expired" : hold.status,
    created_at: hold.createdAt.toISOString(),
    ready_at: hold.readyAt?.toISOString() ?? null,
    expires_at: hold.expiresAt?.toISOString() ?? null,
  };
}

function loanJson(loan: SchoolBookLoan, book: SchoolBook | undefined, code: string, person: SchoolPerson | undefined, today: string, ctx: SchoolContext) {
  return {
    id: loan.id,
    book: book ? bookRef(book, ctx) : null,
    person: personRef(person),
    copy_code: code,
    lent_at: loan.lentAt.toISOString(),
    due_on: loan.dueOn,
    returned_at: loan.returnedAt?.toISOString() ?? null,
    overdue: isOverdue(loan, today),
  };
}

async function books(ctx: SchoolContext, request: ConnectorRequest): Promise<ConnectorResult> {
  const q = (request.query.get("q") ?? "").trim().slice(0, 100);
  const category = (request.query.get("category") ?? "").trim().slice(0, 60);
  const all = await ctx.store.listSchoolBooks(ctx.app.id);
  const found = all.filter(
    (b) =>
      (!q || b.title.toLowerCase().includes(q.toLowerCase()) || b.author.toLowerCase().includes(q.toLowerCase()) || (b.isbn ?? "").replace(/-/g, "").includes(q.replace(/-/g, ""))) &&
      (!category || (b.category ?? "").toLowerCase() === category.toLowerCase()),
  );
  const page = intParam(request.query, "page", 1, 10_000);
  const perPage = intParam(request.query, "per_page", 20, 100);
  const items = await Promise.all(found.slice((page - 1) * perPage, page * perPage).map((b) => bookJson(ctx, b)));
  const categories = [...new Set(all.map((b) => b.category).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b));
  return ok({ page, per_page: perPage, total: found.length, total_pages: Math.max(1, Math.ceil(found.length / perPage)), items, categories });
}

async function bookDetail(ctx: SchoolContext, book: SchoolBook, member: SchoolMember): Promise<ConnectorResult> {
  const people = await borrowersOf(ctx, member);
  const holds = (await ctx.store.listSchoolBookHolds(ctx.app.id, { bookId: book.id, personIds: people.map((p) => p.id), statuses: ["waiting", "ready"] })).filter((h) => holdLive(h, ctx.now));
  let file = null;
  if (book.file && ctx.storage) {
    const media = await ctx.store.getMediaFile(ctx.app.id, book.file.fileId);
    if (media && media.status === "ready") file = { name: book.file.name, kind: book.file.kind, url: fileUrl(ctx.storage, media, { ttlSeconds: EBOOK_LINK_SECONDS }).url };
  }
  return ok({
    ...(await bookJson(ctx, book)),
    description: book.description,
    file,
    holds: holds.map((h) => holdJson(h, book, people.find((p) => p.id === h.personId), ctx)),
    borrowers: people.map((p) => ({ id: p.id, name: p.name })),
  });
}

async function hold(ctx: SchoolContext, request: ConnectorRequest, book: SchoolBook, member: SchoolMember): Promise<ConnectorResult> {
  const people = await borrowersOf(ctx, member);
  const wanted = record(request.body).person_id;
  const person = wanted === undefined || wanted === null ? (people.length === 1 ? people[0] : undefined) : people.find((p) => p.id === wanted);
  if (!person) return error(400, "invalid_request", people.length === 0 ? "Only students and the school's staff borrow books." : "Choose whom the book is for (person_id).");
  const wait = await limited(ctx, request, HOLD_LIMIT);
  if (wait) return wait;
  const placed = await placeHold({ store: ctx.store, app: ctx.app, now: request.now }, book, person);
  if (!placed.ok) return error(409, placed.code, placed.message);
  return ok(holdJson(placed.hold, book, person, ctx), 201);
}

async function limited(ctx: SchoolContext, request: ConnectorRequest, rule: RateLimitRule): Promise<ConnectorResult | null> {
  const result = await hitRateLimit(ctx.store, rule, `${ctx.app.id}:${request.user!.id}`, request.now);
  if (result.allowed) return null;
  return { status: 429, body: { code: "rate_limited", message: "You've done this many times in a short while. Please try again later.", retry_after_seconds: result.retryAfter } };
}

/** Each person's books out now, what they borrowed before and their holds: everyone the asker follows, or the one in `person_id`. */
async function loans(ctx: SchoolContext, request: ConnectorRequest, member: SchoolMember, settings: SchoolSettings): Promise<ConnectorResult> {
  const all = await borrowersOf(ctx, member);
  const wanted = request.query.get("person_id");
  const people = wanted ? all.filter((p) => String(p.id) === wanted) : all;
  if (wanted && people.length === 0) return error(404, "not_found", "Person not found.");
  const ids = people.map((p) => p.id);
  const [list, holds] = await Promise.all([
    ctx.store.listSchoolBookLoans(ctx.app.id, { personIds: ids, limit: 200 }),
    ctx.store.listSchoolBookHolds(ctx.app.id, { personIds: ids, statuses: ["waiting", "ready"] }),
  ]);
  const live = holds.filter((h) => holdLive(h, ctx.now));
  const bookIds = [...new Set([...list.map((l) => l.bookId), ...live.map((h) => h.bookId)])];
  const [bookList, copies] = await Promise.all([ctx.store.listSchoolBooks(ctx.app.id, { ids: bookIds }), ctx.store.listSchoolBookCopies(ctx.app.id, { bookIds })]);
  const book = new Map(bookList.map((b) => [b.id, b]));
  const code = new Map(copies.map((c) => [c.id, c.code]));
  const person = new Map(people.map((p) => [p.id, p]));
  const today = schoolToday(settings, ctx.now);
  const json = (l: SchoolBookLoan) => loanJson(l, book.get(l.bookId), code.get(l.copyId) ?? "", person.get(l.personId), today, ctx);
  const library = librarySettingsOf(settings);
  return ok({
    people: people.map((p) => ({ id: p.id, name: p.name })),
    loan_days: library.loanDays,
    hold_days: library.holdDays,
    current: list.filter((l) => l.returnedAt === null).sort((a, b) => a.dueOn.localeCompare(b.dueOn)).map(json),
    history: list.filter((l) => l.returnedAt !== null).map(json),
    holds: live.filter((h) => book.has(h.bookId)).map((h) => holdJson(h, book.get(h.bookId)!, person.get(h.personId), ctx)),
  });
}
