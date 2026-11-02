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
 * 113.8 Exams published and the day before each (`school_exam`), and a
 * merit or a note to the parents (`school_behaviour`).
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

// 113.2 Checking in and out

const CHECKIN: Record<"in" | "late" | "out" | "early", Record<Lang, (name: string, time: string) => Words>> = {
  in: {
    en: (name, time) => ({ title: `${name} arrived at school`, body: `${name} checked in at ${time}.` }),
    ar: (name, time) => ({ title: `وصل ${name} إلى المدرسة`, body: `سجّل ${name} حضوره الساعة ${time}.` }),
    tr: (name, time) => ({ title: `${name} okula geldi`, body: `${name} saat ${time} itibarıyla giriş yaptı.` }),
  },
  late: {
    en: (name, time) => ({ title: `${name} arrived late`, body: `${name} checked in late, at ${time}.` }),
    ar: (name, time) => ({ title: `وصل ${name} متأخرًا`, body: `سجّل ${name} حضوره متأخرًا الساعة ${time}.` }),
    tr: (name, time) => ({ title: `${name} geç geldi`, body: `${name} saat ${time} itibarıyla geç giriş yaptı.` }),
  },
  out: {
    en: (name, time) => ({ title: `${name} left school`, body: `${name} checked out at ${time}.` }),
    ar: (name, time) => ({ title: `غادر ${name} المدرسة`, body: `سجّل ${name} انصرافه الساعة ${time}.` }),
    tr: (name, time) => ({ title: `${name} okuldan çıktı`, body: `${name} saat ${time} itibarıyla çıkış yaptı.` }),
  },
  early: {
    en: (name, time) => ({ title: `${name} left early`, body: `${name} checked out before the end of the day, at ${time}.` }),
    ar: (name, time) => ({ title: `انصرف ${name} مبكرًا`, body: `سجّل ${name} انصرافه قبل نهاية اليوم الساعة ${time}.` }),
    tr: (name, time) => ({ title: `${name} erken çıktı`, body: `${name} gün bitmeden, saat ${time} itibarıyla çıkış yaptı.` }),
  },
};

/** A student's parents (not the student), of their check-in or check-out, late or early. */
export async function tellCheckin(deps: DeliveryNotifyDeps, student: SchoolPerson, action: "in" | "out", time: string, flagged: boolean): Promise<number> {
  const text = CHECKIN[action === "in" ? (flagged ? "late" : "in") : flagged ? "early" : "out"];
  const own = await personUser(deps.store, student);
  let reached = 0;
  for (const user of await familyUsers(deps.store, student)) {
    if (own && user.id === own.id) continue;
    reached += await deliver(deps, user.id, text[await langOf(deps, user)](student.name, time), { type: "school_checkin", student_id: String(student.id) }, false);
  }
  return reached;
}

// 113.3 Teachers and staff

/** The school's teachers and staff, of news for them only. */
export async function tellStaff(deps: DeliveryNotifyDeps, title: string, body: string): Promise<number> {
  const people = [...(await deps.store.listSchoolPeople(deps.app.id, { role: "teacher" })), ...(await deps.store.listSchoolPeople(deps.app.id, { role: "staff" }))].filter((p) => p.active);
  const seen = new Set<number>();
  let reached = 0;
  for (const person of people) {
    const user = await personUser(deps.store, person);
    if (!user || seen.has(user.id)) continue;
    seen.add(user.id);
    reached += await deliver(deps, user.id, { title, body: body.slice(0, 180) }, { type: "school_staff" }, false);
  }
  return reached;
}

const LEAVE: Record<"approved" | "refused", Record<Lang, (from: string, to: string) => Words>> = {
  approved: {
    en: (from, to) => ({ title: "Leave approved", body: `Your leave from ${from} to ${to} was approved.` }),
    ar: (from, to) => ({ title: "تمت الموافقة على الإجازة", body: `تمت الموافقة على إجازتك من ${from} إلى ${to}.` }),
    tr: (from, to) => ({ title: "İzin onaylandı", body: `${from} – ${to} tarihleri arasındaki izniniz onaylandı.` }),
  },
  refused: {
    en: (from, to) => ({ title: "Leave not approved", body: `Your leave from ${from} to ${to} wasn't approved. See the school's note in the app.` }),
    ar: (from, to) => ({ title: "لم تتم الموافقة على الإجازة", body: `لم تتم الموافقة على إجازتك من ${from} إلى ${to}. اطّلع على ملاحظة المدرسة في التطبيق.` }),
    tr: (from, to) => ({ title: "İzin onaylanmadı", body: `${from} – ${to} tarihleri arasındaki izniniz onaylanmadı. Okulun notu uygulamada.` }),
  },
};

/** A teacher or staff member, of the school's answer to their leave request. */
export async function tellLeave(deps: DeliveryNotifyDeps, person: SchoolPerson, status: "approved" | "refused", from: string, to: string): Promise<number> {
  const user = await personUser(deps.store, person);
  if (!user) return 0;
  return deliver(deps, user.id, LEAVE[status][await langOf(deps, user)](from, to), { type: "school_leave" }, false);
}

// 113.8 Exams and behaviour

/** The accounts of a student's parents (not the student's own). */
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

export interface ExamWords {
  id: number;
  subject: string;
  date: string;
  time: string;
  room: string | null;
}

const EXAMS: Record<Lang, (name: string, exams: readonly ExamWords[]) => Words> = {
  en: (name, exams) =>
    exams.length === 1
      ? { title: `${exams[0]!.subject} exam for ${name}`, body: `On ${exams[0]!.date} at ${exams[0]!.time}. See the exams' timetable in the app.` }
      : { title: `Exams' timetable for ${name}`, body: `${exams.length} exams, the first on ${exams[0]!.date}. See them in the app.` },
  ar: (name, exams) =>
    exams.length === 1
      ? { title: `امتحان ${exams[0]!.subject} لـ ${name}`, body: `يوم ${exams[0]!.date} الساعة ${exams[0]!.time}. جدول الامتحانات في التطبيق.` }
      : { title: `جدول امتحانات ${name}`, body: `${exams.length} امتحانات، أولها يوم ${exams[0]!.date}. التفاصيل في التطبيق.` },
  tr: (name, exams) =>
    exams.length === 1
      ? { title: `${name} için ${exams[0]!.subject} sınavı`, body: `${exams[0]!.date}, saat ${exams[0]!.time}. Sınav programı uygulamada.` }
      : { title: `${name} için sınav programı`, body: `${exams.length} sınav, ilki ${exams[0]!.date}. Ayrıntılar uygulamada.` },
};

/** A student and their family, of exams published for them (one push for all of them). */
export async function tellExams(deps: DeliveryNotifyDeps, student: SchoolPerson, exams: readonly ExamWords[]): Promise<number> {
  if (exams.length === 0) return 0;
  return tellFamily(deps, student, (lang) => EXAMS[lang](student.name, exams), {
    type: "school_exam",
    student_id: String(student.id),
    ...(exams.length === 1 ? { exam_id: String(exams[0]!.id) } : {}),
  });
}

const REMINDER: Record<Lang, (name: string, exam: ExamWords) => Words> = {
  en: (name, exam) => ({ title: `${exam.subject} exam tomorrow`, body: `${name}: ${exam.time}${exam.room ? `, room ${exam.room}` : ""}. Good luck!` }),
  ar: (name, exam) => ({ title: `امتحان ${exam.subject} غدًا`, body: `${name}: الساعة ${exam.time}${exam.room ? `، القاعة ${exam.room}` : ""}. بالتوفيق!` }),
  tr: (name, exam) => ({ title: `Yarın ${exam.subject} sınavı`, body: `${name}: saat ${exam.time}${exam.room ? `, derslik ${exam.room}` : ""}. Başarılar!` }),
};

/** A student and their family, the day before an exam. */
export async function tellExamReminder(deps: DeliveryNotifyDeps, student: SchoolPerson, exam: ExamWords): Promise<number> {
  return tellFamily(deps, student, (lang) => REMINDER[lang](student.name, exam), { type: "school_exam", student_id: String(student.id), exam_id: String(exam.id) });
}

const BEHAVIOUR: Record<"positive" | "negative", Record<Lang, (name: string, category: string, points: string, note: string) => Words>> = {
  positive: {
    en: (name, category, points, note) => ({ title: `${name}: ${category}`, body: `${points} points.${note ? ` ${note}` : ""}` }),
    ar: (name, category, points, note) => ({ title: `${name}: ${category}`, body: `${points} نقاط.${note ? ` ${note}` : ""}` }),
    tr: (name, category, points, note) => ({ title: `${name}: ${category}`, body: `${points} puan.${note ? ` ${note}` : ""}` }),
  },
  negative: {
    en: (name, category, points, note) => ({ title: `A note about ${name}`, body: `${category} (${points} points).${note ? ` ${note}` : ""}` }),
    ar: (name, category, points, note) => ({ title: `ملاحظة عن ${name}`, body: `${category} (${points} نقاط).${note ? ` ${note}` : ""}` }),
    tr: (name, category, points, note) => ({ title: `${name} hakkında bir not`, body: `${category} (${points} puan).${note ? ` ${note}` : ""}` }),
  },
};

/** A student's parents, of a merit or a note. */
export async function tellBehaviour(deps: DeliveryNotifyDeps, student: SchoolPerson, note: { id: number; kind: "positive" | "negative"; categoryName: string; points: number; note: string | null }): Promise<number> {
  let reached = 0;
  const points = note.points > 0 ? `+${note.points}` : String(note.points);
  for (const user of await parentUsers(deps.store, student)) {
    const words = BEHAVIOUR[note.kind][await langOf(deps, user)](student.name, note.categoryName, points, (note.note ?? "").slice(0, 120));
    reached += await deliver(deps, user.id, words, { type: "school_behaviour", student_id: String(student.id), note_id: String(note.id) }, false);
  }
  return reached;
}
