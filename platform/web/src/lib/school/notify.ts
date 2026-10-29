import type { Lang } from "@/i18n/config";
import { appLang } from "../bookings/reschedule";
import type { DataStore } from "../data/store";
import type { HostedUser, SchoolAttendanceStatus, SchoolPerson } from "../data/types";
import { asLang, deliver, type DeliveryNotifyDeps, type Words } from "../delivery/notify";

/**
 * 105.4 What a school's families are told, in their inbox and on their
 * phones, each in their phone's language (or the app's): a child marked
 * absent or late (`school_absence`), homework given to their class
 * (`school_homework`), a mark or a score (`school_grade`), a fee
 * (`school_fee`) and the school's or a teacher's news
 * (`school_announcement`). A student is told too, once they have the app.
 */

/** The account of a person the school added: the one they last used, else the one with their number (or email). */
export async function personUser(store: DataStore, person: SchoolPerson): Promise<HostedUser | null> {
  if (person.userId !== null) {
    const user = await store.getHostedUser(person.appId, person.userId);
    if (user) return user;
  }
  if (person.phone) return store.getHostedUserByPhone(person.appId, person.phone);
  return person.email ? store.getHostedEmailUser(person.appId, person.email) : null;
}

/** The accounts that follow a student: theirs and their parents'. */
export async function familyUsers(store: DataStore, student: SchoolPerson): Promise<HostedUser[]> {
  const links = await store.listSchoolFamily(student.appId, { studentId: student.id });
  const parents = await store.listSchoolPeople(student.appId, { role: "parent", ids: links.map((l) => l.parentId) });
  const out: HostedUser[] = [];
  for (const person of [student, ...parents.filter((p) => p.active)]) {
    const user = await personUser(store, person);
    if (user && !out.some((u) => u.id === user.id)) out.push(user);
  }
  return out;
}

async function langOf(deps: DeliveryNotifyDeps, user: HostedUser): Promise<Lang> {
  const devices = await deps.store.listHostedPushDevices(deps.app.id, [user.id]);
  return asLang(devices[0]?.language) ?? (await appLang(deps.store, deps.app.id));
}

async function tellFamily(deps: DeliveryNotifyDeps, student: SchoolPerson, words: (lang: Lang) => Words, data: Record<string, string>): Promise<number> {
  let reached = 0;
  for (const user of await familyUsers(deps.store, student)) reached += await deliver(deps, user.id, words(await langOf(deps, user)), data, false);
  return reached;
}

const ABSENCE: Record<"absent" | "late", Record<Lang, (name: string, date: string) => Words>> = {
  absent: {
    en: (name, date) => ({ title: `${name} was absent`, body: `${name} was marked absent on ${date}.` }),
    ar: (name, date) => ({ title: `غياب ${name}`, body: `سُجّل ${name} غائبًا يوم ${date}.` }),
    tr: (name, date) => ({ title: `${name} devamsız`, body: `${name}, ${date} tarihinde devamsız olarak işaretlendi.` }),
  },
  late: {
    en: (name, date) => ({ title: `${name} was late`, body: `${name} was marked late on ${date}.` }),
    ar: (name, date) => ({ title: `تأخر ${name}`, body: `سُجّل ${name} متأخرًا يوم ${date}.` }),
    tr: (name, date) => ({ title: `${name} geç kaldı`, body: `${name}, ${date} tarihinde geç kaldı olarak işaretlendi.` }),
  },
};

/** The family of a student newly marked absent or late. */
export async function tellAbsence(deps: DeliveryNotifyDeps, student: SchoolPerson, status: SchoolAttendanceStatus, date: string): Promise<number> {
  if (status !== "absent" && status !== "late") return 0;
  const text = ABSENCE[status];
  return tellFamily(deps, student, (lang) => text[lang](student.name, date), { type: "school_absence", student_id: String(student.id) });
}

const HOMEWORK: Record<Lang, (subject: string, title: string, due: string) => Words> = {
  en: (subject, title, due) => ({ title: `New ${subject} homework`, body: `${title}, due ${due}.` }),
  ar: (subject, title, due) => ({ title: `واجب جديد في ${subject}`, body: `${title}، يُسلَّم ${due}.` }),
  tr: (subject, title, due) => ({ title: `Yeni ${subject} ödevi`, body: `${title}, teslim ${due}.` }),
};

/** The students of a class and their families, of new homework. */
export async function tellHomework(deps: DeliveryNotifyDeps, students: readonly SchoolPerson[], homework: { id: number; title: string; dueOn: string }, subject: string): Promise<number> {
  let reached = 0;
  for (const student of students) {
    reached += await tellFamily(deps, student, (lang) => HOMEWORK[lang](subject, homework.title, homework.dueOn), {
      type: "school_homework",
      student_id: String(student.id),
      homework_id: String(homework.id),
    });
  }
  return reached;
}

const GRADE: Record<Lang, (name: string, what: string, mark: string) => Words> = {
  en: (name, what, mark) => ({ title: `${name}: ${mark}`, body: `${what} was marked.` }),
  ar: (name, what, mark) => ({ title: `${name}: ${mark}`, body: `صدرت نتيجة ${what}.` }),
  tr: (name, what, mark) => ({ title: `${name}: ${mark}`, body: `${what} notlandırıldı.` }),
};

/** A student and their family, of a mark or a score. */
export async function tellGrade(deps: DeliveryNotifyDeps, student: SchoolPerson, what: string, mark: string): Promise<number> {
  return tellFamily(deps, student, (lang) => GRADE[lang](student.name, what, mark), { type: "school_grade", student_id: String(student.id) });
}

const FEE: Record<"due" | "paid", Record<Lang, (name: string, title: string, amount: string) => Words>> = {
  due: {
    en: (name, title, amount) => ({ title: `${title} for ${name}`, body: `${amount} is due. See it in the app.` }),
    ar: (name, title, amount) => ({ title: `${title} لـ ${name}`, body: `مستحق ${amount}. التفاصيل في التطبيق.` }),
    tr: (name, title, amount) => ({ title: `${name} için ${title}`, body: `${amount} ödenecek. Ayrıntılar uygulamada.` }),
  },
  paid: {
    en: (name, title, amount) => ({ title: "Payment received", body: `${title} for ${name}: ${amount}. The receipt is in the app.` }),
    ar: (name, title, amount) => ({ title: "تم استلام الدفعة", body: `${title} لـ ${name}: ${amount}. الإيصال في التطبيق.` }),
    tr: (name, title, amount) => ({ title: "Ödeme alındı", body: `${name} için ${title}: ${amount}. Makbuz uygulamada.` }),
  },
};

/** A student's family, of a fee added or paid. */
export async function tellFee(deps: DeliveryNotifyDeps, student: SchoolPerson, kind: "due" | "paid", title: string, amount: string): Promise<number> {
  return tellFamily(deps, student, (lang) => FEE[kind][lang](student.name, title, amount), { type: "school_fee", student_id: String(student.id) });
}

/** Everyone the news is for: the school's whole list, a class's students and families, or one student's. */
export async function tellAnnouncement(deps: DeliveryNotifyDeps, students: readonly SchoolPerson[], title: string, body: string, studentId: number | null): Promise<number> {
  const seen = new Set<number>();
  let reached = 0;
  for (const student of students) {
    for (const user of await familyUsers(deps.store, student)) {
      if (seen.has(user.id)) continue;
      seen.add(user.id);
      reached += await deliver(deps, user.id, { title, body: body.slice(0, 180) }, { type: "school_announcement", ...(studentId !== null ? { student_id: String(studentId) } : {}) }, false);
    }
  }
  return reached;
}
