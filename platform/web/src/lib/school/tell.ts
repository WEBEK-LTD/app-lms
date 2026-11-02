import type { Lang } from "@/i18n/config";
import { appLang } from "../bookings/reschedule";
import type { DataStore } from "../data/store";
import type { HostedUser, SchoolPerson } from "../data/types";
import { asLang, deliver, type DeliveryNotifyDeps, type Words } from "../delivery/notify";
import { familyUsers, personUser } from "./notify";

/**
 * 113.10 and 113.11 Pushes about the bus and the library: to a student's
 * parents only (the bus), or to the student and their parents (the
 * library), each in their phone's language (or the app's).
 */

/** The accounts of a student's active parents. */
export async function parentUsers(store: DataStore, student: SchoolPerson): Promise<HostedUser[]> {
  const links = await store.listSchoolFamily(student.appId, { studentId: student.id });
  const parents = await store.listSchoolPeople(student.appId, { role: "parent", ids: links.map((l) => l.parentId) });
  const out: HostedUser[] = [];
  for (const person of parents.filter((p) => p.active)) {
    const user = await personUser(store, person);
    if (user && !out.some((u) => u.id === user.id)) out.push(user);
  }
  return out;
}

/** Whoever follows a person's loans: a student and their parents; anyone else themselves. */
export async function borrowerUsers(store: DataStore, person: SchoolPerson): Promise<HostedUser[]> {
  if (person.role === "student") return familyUsers(store, person);
  const user = await personUser(store, person);
  return user ? [user] : [];
}

async function langOf(deps: DeliveryNotifyDeps, user: HostedUser): Promise<Lang> {
  const devices = await deps.store.listHostedPushDevices(deps.app.id, [user.id]);
  return asLang(devices[0]?.language) ?? (await appLang(deps.store, deps.app.id));
}

/** Tells each account, in its language; returns the phones reached. */
export async function tellUsers(deps: DeliveryNotifyDeps, users: readonly HostedUser[], words: (lang: Lang) => Words, data: Record<string, string>): Promise<number> {
  let reached = 0;
  for (const user of users) reached += await deliver(deps, user.id, words(await langOf(deps, user)), data, false);
  return reached;
}
