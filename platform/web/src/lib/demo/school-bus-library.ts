import { addDays, utcToLocal } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import type { SchoolPeople } from "./school";

/**
 * 113.10 and 113.11 Nakhla School's bus and library, for Studio's school
 * demo: one route in Maadi (Ms. Mona, the demo number's teacher, drives it;
 * Lina and Adam ride it) and a shelf of books with their copies, one of them
 * out to Lina. Made again when the demo is set up.
 */

const STOPS: { name: string; lat: number; lng: number; morning: number; afternoon: number; riders: string[] }[] = [
  { name: "Road 9, Maadi", lat: 29.9602, lng: 31.2569, morning: 7 * 60, afternoon: 14 * 60 + 10, riders: ["Lina Haddad", "Adam Haddad"] },
  { name: "Victoria Square", lat: 29.9668, lng: 31.2502, morning: 7 * 60 + 10, afternoon: 14 * 60, riders: ["Omar Khalil", "Jana Ashraf"] },
  { name: "Corniche, Dar El Salam", lat: 29.9786, lng: 31.2387, morning: 7 * 60 + 20, afternoon: 13 * 60 + 50, riders: ["Nour Hegazy"] },
];

const BOOKS: { title: string; author: string; isbn: string | null; shelf: string; category: string; language: string; codes: string[] }[] = [
  { title: "The Little Prince", author: "Antoine de Saint-Exupéry", isbn: "9780156012195", shelf: "A3", category: "Stories", language: "English", codes: ["LP-1", "LP-2"] },
  { title: "Kalila wa Dimna", author: "Ibn al-Muqaffa", isbn: null, shelf: "A1", category: "Stories", language: "Arabic", codes: ["KD-1", "KD-2", "KD-3"] },
  { title: "Atlas of Egypt", author: "Nakhla School", isbn: null, shelf: "C2", category: "Geography", language: "Arabic", codes: ["AT-1"] },
  { title: "Charlotte's Web", author: "E. B. White", isbn: "9780064400558", shelf: "A4", category: "Stories", language: "English", codes: ["CW-1"] },
  { title: "Science for Young Minds", author: "Nakhla School", isbn: null, shelf: "B1", category: "Science", language: "English", codes: ["SC-1", "SC-2"] },
];

export async function syncSchoolBusAndLibrary(store: DataStore, app: Pick<App, "id">, people: SchoolPeople, now: Date): Promise<void> {
  const person = (role: string, name: string) => people.byName.get(`${role}:${name}`) ?? null;
  for (const route of await store.listSchoolBusRoutes(app.id)) await store.deleteSchoolBusRoute(app.id, route.id);
  const route = await store.saveSchoolBusRoute(
    { id: null, appId: app.id, name: "Route 1, Maadi", plate: "ن ق ص 2741", capacity: 24, driverId: person("teacher", "Mona Saleh")?.id ?? null, supervisorId: person("teacher", "Heba Mansour")?.id ?? null, active: true },
    now,
  );
  if (route) {
    for (const s of STOPS) {
      const stop = await store.saveSchoolBusStop({ id: null, appId: app.id, routeId: route.id, name: s.name, lat: s.lat, lng: s.lng, morningMinute: s.morning, afternoonMinute: s.afternoon });
      if (!stop) continue;
      const riders = s.riders.map((name) => person("student", name)).filter((p) => p !== null);
      await store.setSchoolBusRiders(app.id, riders.flatMap((p) => (["morning", "afternoon"] as const).map((trip) => ({ studentId: p.id, trip, stop }))));
    }
  }
  for (const book of await store.listSchoolBooks(app.id)) await store.deleteSchoolBook(app.id, book.id);
  const lina = person("student", "Lina Haddad");
  const today = utcToLocal(now, "Africa/Cairo").date;
  for (const b of BOOKS) {
    const book = await store.createSchoolBook({ appId: app.id, title: b.title, author: b.author, isbn: b.isbn, coverAssetId: null, shelf: b.shelf, category: b.category, language: b.language, description: null, file: null, createdAt: now, updatedAt: now });
    for (const code of b.codes) {
      const made = await store.createSchoolBookCopy({ appId: app.id, bookId: book.id, code, note: null, createdAt: now });
      // Lina has the first copy of Charlotte's Web, due in a week.
      if (made.ok && lina && code === "CW-1") {
        await store.createSchoolBookLoan({ appId: app.id, bookId: book.id, copyId: made.copy.id, personId: lina.id, lentAt: now, dueOn: addDays(today, 7), returnedAt: null, dueToldOn: null, overdueToldOn: null });
      }
    }
  }
}
