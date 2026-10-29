import type { Lang } from "@/i18n/config";
import { appLang } from "../bookings/reschedule";
import type { Course, CourseQuestion, HostedUser, Teacher } from "../data/types";
import { asLang, deliver, type DeliveryNotifyDeps, type Words } from "../delivery/notify";

/**
 * 105.3 What students and teachers are told: a teacher's followers when a
 * new course of theirs is published (`new_course`), the teacher when the
 * academy publishes or sends back one of their courses (`teacher_course`),
 * and the teacher when a student asks in one of their courses
 * (`teacher_question`). Each goes to the inbox and the phones.
 */

const NEW_COURSE: Record<Lang, (teacher: string, course: string) => Words> = {
  en: (teacher, course) => ({ title: `New from ${teacher}`, body: `${course} is out. Have a look.` }),
  ar: (teacher, course) => ({ title: `جديد من ${teacher}`, body: `صدرت دورة ${course}. ألقِ نظرة.` }),
  tr: (teacher, course) => ({ title: `${teacher} yeni bir kurs yayınladı`, body: `${course} yayında. Göz atın.` }),
};

const REVIEWED: Record<"published" | "returned", Record<Lang, (course: string, note: string) => Words>> = {
  published: {
    en: (course) => ({ title: "Your course is published", body: `${course} is now in the app for students.` }),
    ar: (course) => ({ title: "تم نشر دورتك", body: `أصبحت ${course} متاحة للطلاب في التطبيق.` }),
    tr: (course) => ({ title: "Kursunuz yayında", body: `${course} artık uygulamada öğrencilere açık.` }),
  },
  returned: {
    en: (course, note) => ({ title: "Your course needs changes", body: note ? `${course}: ${note}` : `${course} was sent back to you. Open it to see why.` }),
    ar: (course, note) => ({ title: "دورتك تحتاج إلى تعديلات", body: note ? `${course}: ${note}` : `أُعيدت إليك ${course}. افتحها لتعرف السبب.` }),
    tr: (course, note) => ({ title: "Kursunuzda değişiklik gerekiyor", body: note ? `${course}: ${note}` : `${course} size geri gönderildi. Nedenini görmek için açın.` }),
  },
};

const QUESTION: Record<Lang, (course: string, text: string) => Words> = {
  en: (course, text) => ({ title: `A question in ${course}`, body: text }),
  ar: (course, text) => ({ title: `سؤال في ${course}`, body: text }),
  tr: (course, text) => ({ title: `${course} kursunda bir soru`, body: text }),
};

/** The teacher's account: the one they last used, else the one with their number (or email). */
async function teacherUser(deps: DeliveryNotifyDeps, teacher: Teacher): Promise<HostedUser | null> {
  const { store, app } = deps;
  if (teacher.userId !== null) {
    const user = await store.getHostedUser(app.id, teacher.userId);
    if (user) return user;
  }
  if (teacher.phone) return store.getHostedUserByPhone(app.id, teacher.phone);
  return teacher.email ? store.getHostedEmailUser(app.id, teacher.email) : null;
}

async function langOf(deps: DeliveryNotifyDeps, userId: number): Promise<Lang> {
  const devices = await deps.store.listHostedPushDevices(deps.app.id, [userId]);
  return asLang(devices[0]?.language) ?? (await appLang(deps.store, deps.app.id));
}

/** A teacher's course was published: each follower hears of it. Returns the phones reached. */
export async function tellFollowers(deps: DeliveryNotifyDeps, teacher: Teacher, course: Pick<Course, "id" | "title">): Promise<number> {
  let phones = 0;
  for (const userId of await deps.store.listTeacherFollowerIds(deps.app.id, teacher.id)) {
    const words = NEW_COURSE[await langOf(deps, userId)](teacher.name, course.title);
    phones += await deliver(deps, userId, words, { type: "new_course", course_id: String(course.id) }, false);
  }
  return phones;
}

/** The academy published or sent back the teacher's course. */
export async function tellTeacherReviewed(deps: DeliveryNotifyDeps, teacher: Teacher, course: Pick<Course, "id" | "title" | "reviewNote">, outcome: "published" | "returned"): Promise<number> {
  const user = await teacherUser(deps, teacher);
  if (!user) return 0;
  const words = REVIEWED[outcome][await langOf(deps, user.id)](course.title, course.reviewNote ?? "");
  return deliver(deps, user.id, words, { type: "teacher_course", course_id: String(course.id) }, false);
}

/** A student asked (or wrote again) in one of the teacher's courses. */
export async function tellTeacherQuestion(deps: DeliveryNotifyDeps, teacher: Teacher, course: Pick<Course, "id" | "title">, question: Pick<CourseQuestion, "id">, text: string): Promise<number> {
  const user = await teacherUser(deps, teacher);
  if (!user) return 0;
  const words = QUESTION[await langOf(deps, user.id)](course.title, text);
  return deliver(deps, user.id, words, { type: "teacher_question", course_id: String(course.id), question_id: String(question.id) }, false);
}
