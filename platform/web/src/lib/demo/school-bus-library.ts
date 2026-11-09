import { addDays, utcToLocal } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { newest } from "./rows";
import type { SchoolPeople } from "./school";

/**
 * 113.10 and 113.11 Nakhla School's bus and library, for Studio's school
 * demo: one route in Maadi (Ms. Mona, the demo number's teacher, drives it;
 * Lina and Adam ride it, theirs the last stop before the school, so their
 * mother watches the bus come; lib/demo/school-bus.ts) and a shelf of books
 * with their copies: one out to Lina, one to Adam a few days late, and the
 * atlas out to Omar with Lina waiting for it. Made again each school day.
 */

const STOPS: { name: string; lat: number; lng: number; morning: number; afternoon: number; riders: string[] }[] = [
  { name: "Corniche, Dar El Salam", lat: 29.9786, lng: 31.2387, morning: 7 * 60, afternoon: 14 * 60 + 15, riders: ["Nour Hegazy"] },
  { name: "Victoria Square", lat: 29.9668, lng: 31.2502, morning: 7 * 60 + 10, afternoon: 14 * 60 + 5, riders: ["Omar Khalil", "Jana Ashraf"] },
  { name: "Road 9, Maadi", lat: 29.9602, lng: 31.2569, morning: 7 * 60 + 20, afternoon: 13 * 60 + 55, riders: ["Lina Haddad", "Adam Haddad"] },
];

const BOOKS: { title: string; author: string; isbn: string | null; shelf: string; category: string; language: string; codes: string[] }[] = [
  { title: "The Little Prince", author: "Antoine de Saint-Exupéry", isbn: "9780156012195", shelf: "A3", category: "Stories", language: "English", codes: ["LP-1", "LP-2"] },
  { title: "Kalila wa Dimna", author: "Ibn al-Muqaffa", isbn: null, shelf: "A1", category: "Stories", language: "Arabic", codes: ["KD-1", "KD-2", "KD-3"] },
  { title: "Atlas of Egypt", author: "Nakhla School", isbn: null, shelf: "C2", category: "Geography", language: "Arabic", codes: ["AT-1"] },
  { title: "Charlotte's Web", author: "E. B. White", isbn: "9780064400558", shelf: "A4", category: "Stories", language: "English", codes: ["CW-1"] },
  { title: "Science for Young Minds", author: "Nakhla School", isbn: null, shelf: "B1", category: "Science", language: "English", codes: ["SC-1", "SC-2"] },
];

const LOANS: { code: string; student: string; daysAgo: number; dueIn: number }[] = [
  { code: "CW-1", student: "Lina Haddad", daysAgo: 0, dueIn: 7 },
  { code: "KD-1", student: "Adam Haddad", daysAgo: 16, dueIn: -2 },
  { code: "AT-1", student: "Omar Khalil", daysAgo: 11, dueIn: 3 },
];

export async function syncSchoolBusAndLibrary(store: DataStore, app: Pick<App, "id">, people: SchoolPeople, now: Date): Promise<void> {
  const person = (role: string, name: string) => people.byName.get(`${role}:${name}`) ?? null;
  await store.deleteSchoolRows(app.id, "busRoutes", (await store.listSchoolBusRoutes(app.id)).map((r) => r.id));
  const route = await store.saveSchoolBusRoute(
    { id: null, appId: app.id, name: "Route 1, Maadi", plate: "ن ق ص 2741", capacity: 24, driverId: person("teacher", "Mona Saleh")?.id ?? null, supervisorId: person("teacher", "Heba Mansour")?.id ?? null, active: true },
    now,
  );
  if (route) {
    // The new route's stops in order, then everyone's stop.
    await store.saveSchoolRows(
      "busStops",
      STOPS.map((s, i) => ({ appId: app.id, routeId: route.id, name: s.name, lat: s.lat, lng: s.lng, morningMinute: s.morning, afternoonMinute: s.afternoon, position: i + 1 })),
    );
    const stops = await store.listSchoolBusStops(app.id, { routeId: route.id });
    const riders = STOPS.flatMap((s) => {
      const stop = newest(stops, (x) => x.name === s.name);
      if (!stop) return [];
      return s.riders.map((name) => person("student", name)).filter((p) => p !== null).flatMap((p) => (["morning", "afternoon"] as const).map((trip) => ({ studentId: p.id, trip, stop })));
    });
    await store.setSchoolBusRiders(app.id, riders);
  }
  await store.deleteSchoolRows(app.id, "books", (await store.listSchoolBooks(app.id)).map((b) => b.id));
  const lina = person("student", "Lina Haddad");
  const today = utcToLocal(now, "Africa/Cairo").date;
  await store.saveSchoolRows(
    "books",
    BOOKS.map((b) => ({ appId: app.id, title: b.title, author: b.author, isbn: b.isbn, coverAssetId: null, shelf: b.shelf, category: b.category, language: b.language, description: null, file: null, createdAt: now, updatedAt: now })),
  );
  const books = await store.listSchoolBooks(app.id);
  const bookOf = (title: string) => newest(books, (x) => x.title === title);
  await store.saveSchoolRows(
    "bookCopies",
    BOOKS.flatMap((b) => {
      const book = bookOf(b.title);
      return book ? b.codes.map((code) => ({ appId: app.id, bookId: book.id, code, note: null, createdAt: now })) : [];
    }),
  );
  const copies = await store.listSchoolBookCopies(app.id, { bookIds: books.map((b) => b.id) });
  for (const b of BOOKS) {
    const book = bookOf(b.title);
    if (!book) continue;
    for (const code of b.codes) {
      const copy = newest(copies, (c) => c.bookId === book.id && c.code === code);
      // Lina has the first copy of Charlotte's Web, due in a week; Adam is two days late with Kalila wa Dimna; Omar has the atlas, which Lina is waiting for.
      const loan = LOANS.find((l) => l.code === code);
      const reader = loan ? person("student", loan.student) : null;
      if (copy && loan && reader) {
        await store.createSchoolBookLoan({ appId: app.id, bookId: book.id, copyId: copy.id, personId: reader.id, lentAt: new Date(now.getTime() - loan.daysAgo * 86_400_000), dueOn: addDays(today, loan.dueIn), returnedAt: null, dueToldOn: null, overdueToldOn: null });
      }
    }
    if (b.title === "Atlas of Egypt" && lina) {
      await store.createSchoolBookHold({ appId: app.id, bookId: book.id, personId: lina.id, status: "waiting", copyId: null, readyAt: null, expiresAt: null, createdAt: new Date(now.getTime() - 2 * 86_400_000), updatedAt: now });
    }
  }
}
