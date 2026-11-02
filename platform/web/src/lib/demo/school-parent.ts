import { addDays, utcToLocal } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import type { SchoolPeople } from "./school";

/**
 * 113.4 Nakhla School's parent's area, for Studio's school demo: a
 * permission slip for Grade 5 A that Rania hasn't signed yet, Lina's
 * pick-up list, and Adam's excused day last week. Made again when the demo
 * is set up.
 */
export async function syncSchoolParentArea(store: DataStore, app: Pick<App, "id">, people: SchoolPeople, now: Date): Promise<void> {
  const today = utcToLocal(now, "Africa/Cairo").date;
  const lina = people.byName.get("student:Lina Haddad") ?? null;
  const adam = people.byName.get("student:Adam Haddad") ?? null;
  const rania = people.byName.get("parent:Rania Haddad") ?? null;
  for (const slip of await store.listSchoolSlips(app.id)) await store.deleteSchoolSlip(app.id, slip.id);
  const grade5 = people.classes.get("Grade 5 A") ?? null;
  if (grade5 !== null) {
    await store.saveSchoolSlip(
      { id: null, appId: app.id, title: "Science museum trip", details: "Grade 5 A visits the science museum on Thursday, 9:00 to 13:00. Children bring a packed lunch.", dueOn: addDays(today, 5), feeNote: "E£350, on the fees page", audience: "class", grade: null, classId: grade5 },
      now,
    );
  }
  if (lina) {
    await store.saveSchoolPickup({
      appId: app.id,
      studentId: lina.id,
      people: [
        { name: "Rania Haddad", relation: "Mother", phone: "+20 100 000 0000", photo: null },
        { name: "Samir Haddad", relation: "Grandfather", phone: "+20 122 555 0101", photo: null },
      ],
      updatedBy: "Rania Haddad",
      updatedAt: now,
    });
  }
  if (adam) {
    const reason = "A cold: he stayed at home on the doctor's advice.";
    const had = (await store.listSchoolExcuses(app.id, { studentId: adam.id })).some((e) => e.reason === reason);
    if (!had) {
      const day = addDays(today, -6);
      await store.createSchoolExcuse({ appId: app.id, studentId: adam.id, parentId: rania?.id ?? null, startsOn: day, endsOn: day, reason, file: null, status: "accepted", answer: null, answeredBy: "Nakhla School", answeredAt: now, createdAt: now, updatedAt: now });
    }
  }
}
