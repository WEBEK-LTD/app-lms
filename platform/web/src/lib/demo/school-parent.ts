import { addDays, utcToLocal } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { sameRows, unchanged } from "./rows";
import type { SchoolPeople } from "./school";

/**
 * 113.4 Nakhla School's parent's area, for Studio's school demo: a
 * permission slip for Grade 5 A that Rania hasn't signed yet and one for
 * the whole school she signed, Lina's pick-up list with today's note (her
 * grandfather picks her up), and Adam's excused day last week. Made again
 * each school day, so a visitor's answers go with it.
 */
export async function syncSchoolParentArea(store: DataStore, app: Pick<App, "id">, people: SchoolPeople, now: Date): Promise<void> {
  const today = utcToLocal(now, "Africa/Cairo").date;
  const lina = people.byName.get("student:Lina Haddad") ?? null;
  const adam = people.byName.get("student:Adam Haddad") ?? null;
  const rania = people.byName.get("parent:Rania Haddad") ?? null;
  await store.deleteSchoolRows(app.id, "slips", (await store.listSchoolSlips(app.id)).map((slip) => slip.id));
  const grade5 = people.classes.get("Grade 5 A") ?? null;
  if (grade5 !== null) {
    await store.saveSchoolSlip(
      { id: null, appId: app.id, title: "Science museum trip", details: "Grade 5 A visits the science museum on Thursday, 9:00 to 13:00. Children bring a packed lunch.", dueOn: addDays(today, 5), feeNote: "E£350, on the fees page", audience: "class", grade: null, classId: grade5 },
      now,
    );
  }
  const school = await store.saveSchoolSlip(
    { id: null, appId: app.id, title: "Sports day photos", details: "The school would like to take photos on sports day for the school's page and the yearbook.", dueOn: addDays(today, 3), feeNote: null, audience: "school", grade: null, classId: null },
    now,
  );
  if (school && rania) {
    await store.saveSchoolRows(
      "slipAnswers",
      [lina, adam].flatMap((child) => (child ? [{ appId: app.id, slipId: school.id, studentId: child.id, answer: "yes" as const, signedName: "Rania Haddad", parentId: rania.id, answeredAt: new Date(now.getTime() - 20 * 3_600_000) }] : [])),
    );
  }
  if (lina) {
    // Today's note and the list, saved again only when they aren't so already.
    const note = { appId: app.id, studentId: lina.id, date: today, name: "Samir Haddad", relation: "Grandfather", phone: "+20 122 555 0101", note: "I have a meeting until 15:00.", writtenBy: "Rania Haddad" };
    const notes = await store.listSchoolPickupNotes(app.id, { studentId: lina.id });
    if (!sameRows(notes, [note])) {
      for (const old of notes) await store.deleteSchoolPickupNote(app.id, lina.id, old.date);
      await store.saveSchoolPickupNote({ ...note, createdAt: now });
    }
    const pickup = {
      appId: app.id,
      studentId: lina.id,
      people: [
        { name: "Rania Haddad", relation: "Mother", phone: "+20 100 000 0000", photo: null },
        { name: "Samir Haddad", relation: "Grandfather", phone: "+20 122 555 0101", photo: null },
      ],
      updatedBy: "Rania Haddad",
    };
    const saved = await store.getSchoolPickup(app.id, lina.id);
    if (!saved || !unchanged(saved, pickup)) await store.saveSchoolPickup({ ...pickup, updatedAt: now });
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
