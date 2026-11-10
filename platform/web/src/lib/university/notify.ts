import type { Lang } from "@/i18n/config";
import { appLang } from "../bookings/reschedule";
import type { HostedUser, PushAudience, SchoolPerson } from "../data/types";
import { staffPushAudience } from "../school/staff-app";
import { asLang, deliver, type DeliveryNotifyDeps, type Words } from "../delivery/notify";
import { familyUsers, personUser } from "../school/notify";

/**
 * 113.9 What a university's students (and their parents, when the school
 * has them) are told, each in their phone's language: the advisor approved
 * or sent back the registration (`uni_registration`), a seat opened on a
 * waiting list (`uni_seat`), a section's results are out (`uni_results`);
 * and what an advisor is told: a registration waits for them.
 */

async function langOf(deps: DeliveryNotifyDeps, user: HostedUser, audience: PushAudience = "customers"): Promise<Lang> {
  const devices = await deps.store.listHostedPushDevices(deps.app.id, [user.id], audience);
  return asLang(devices[0]?.language) ?? (await appLang(deps.store, deps.app.id));
}

async function tellFamily(deps: DeliveryNotifyDeps, student: SchoolPerson, words: (lang: Lang) => Words, data: Record<string, string>): Promise<number> {
  let reached = 0;
  for (const user of await familyUsers(deps.store, student)) reached += await deliver(deps, user.id, words(await langOf(deps, user)), data, false);
  return reached;
}

const DECIDED: Record<"approved" | "returned", Record<Lang, (term: string, note: string | null) => Words>> = {
  approved: {
    en: (term) => ({ title: "Registration approved", body: `Your advisor approved your courses for ${term}.` }),
    ar: (term) => ({ title: "تمت الموافقة على التسجيل", body: `وافق مرشدك الأكاديمي على مقرراتك في ${term}.` }),
    tr: (term) => ({ title: "Kayıt onaylandı", body: `Danışmanın ${term} derslerini onayladı.` }),
  },
  returned: {
    en: (term, note) => ({ title: "Registration sent back", body: note ? `${term}: ${note}` : `Your advisor sent back your courses for ${term}. Change them and send them again.` }),
    ar: (term, note) => ({ title: "أُعيد التسجيل إليك", body: note ? `${term}: ${note}` : `أعاد مرشدك الأكاديمي مقرراتك في ${term}. عدّلها وأرسلها مرة أخرى.` }),
    tr: (term, note) => ({ title: "Kayıt geri gönderildi", body: note ? `${term}: ${note}` : `Danışmanın ${term} derslerini geri gönderdi. Değiştirip yeniden gönder.` }),
  },
};

export async function tellRegistration(deps: DeliveryNotifyDeps, student: SchoolPerson, outcome: "approved" | "returned", term: { id: number; name: string }, note: string | null): Promise<number> {
  return tellFamily(deps, student, (lang) => DECIDED[outcome][lang](term.name, note), { type: "uni_registration", student_id: String(student.id), term_id: String(term.id) });
}

const SEAT: Record<Lang, (course: string) => Words> = {
  en: (course) => ({ title: "A seat opened", body: `You have a seat in ${course} now. Your advisor approves it.` }),
  ar: (course) => ({ title: "توفّر مقعد", body: `أصبح لك مقعد في ${course}. يوافق عليه مرشدك الأكاديمي.` }),
  tr: (course) => ({ title: "Yer açıldı", body: `${course} dersinde artık yerin var. Danışmanın onaylayacak.` }),
};

export async function tellSeat(deps: DeliveryNotifyDeps, student: SchoolPerson, course: string, termId: number): Promise<number> {
  return tellFamily(deps, student, (lang) => SEAT[lang](course), { type: "uni_seat", student_id: String(student.id), term_id: String(termId) });
}

const RESULTS: Record<Lang, (course: string) => Words> = {
  en: (course) => ({ title: "Results are out", body: `Your grade in ${course} is in the app.` }),
  ar: (course) => ({ title: "صدرت النتيجة", body: `تقديرك في ${course} في التطبيق.` }),
  tr: (course) => ({ title: "Sonuçlar açıklandı", body: `${course} notun uygulamada.` }),
};

export async function tellResults(deps: DeliveryNotifyDeps, students: readonly SchoolPerson[], course: string): Promise<number> {
  let reached = 0;
  for (const student of students) reached += await tellFamily(deps, student, (lang) => RESULTS[lang](course), { type: "uni_results", student_id: String(student.id) });
  return reached;
}

const WAITING: Record<Lang, (name: string, term: string) => Words> = {
  en: (name, term) => ({ title: "A registration to approve", body: `${name} sent their courses for ${term}.` }),
  ar: (name, term) => ({ title: "تسجيل بانتظار موافقتك", body: `أرسل ${name} مقرراته في ${term}.` }),
  tr: (name, term) => ({ title: "Onay bekleyen kayıt", body: `${name}, ${term} derslerini gönderdi.` }),
};

/** The student's advisor (a lecturer), of a registration sent to them. */
export async function tellAdvisor(deps: DeliveryNotifyDeps, advisor: SchoolPerson, student: SchoolPerson, term: { id: number; name: string }): Promise<number> {
  const user = await personUser(deps.store, advisor);
  if (!user) return 0;
  return deliver(deps, user.id, WAITING[await langOf(deps, user, staffPushAudience(deps.app))](student.name, term.name), { type: "uni_advisee", student_id: String(student.id), term_id: String(term.id) }, false);
}
