import type { DataStore } from "../data/store";
import type { App, Course } from "../data/types";
import { courseProgress, readCertificateCode } from "./learning";
import { courseSetup } from "./setup";

/**
 * 90.1 A certificate from its signed code: the app, the course and the
 * student's name (never their phone or email), once they finished the
 * course. 112.5 Shared by the certificate's page and its PDF file.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The certificate's words, in English, Arabic and Turkish. */
export const CERTIFICATE_TEXT = {
  en: { heading: "Certificate of completion", given: "This certifies that", finished: "has completed the course", on: "Completed on {date}", code: "Certificate {code}", signed: "Signed", verified: "This page is the certificate's proof: {app} issued it.", check: "Check it at {url}", download: "Download the PDF" },
  ar: { heading: "شهادة إتمام", given: "تشهد هذه الوثيقة بأن", finished: "قد أتمّ الدورة", on: "تاريخ الإتمام: {date}", code: "الشهادة {code}", signed: "التوقيع", verified: "هذه الصفحة دليل صحة الشهادة: أصدرتها {app}.", check: "تحقّق منها على {url}", download: "تنزيل ملف PDF" },
  tr: { heading: "Tamamlama sertifikası", given: "Bu belge,", finished: "adlı kişinin şu kursu tamamladığını onaylar", on: "Tamamlanma tarihi: {date}", code: "Sertifika {code}", signed: "İmza", verified: "Bu sayfa sertifikanın kanıtıdır: {app} tarafından verildi.", check: "Doğrulamak için: {url}", download: "PDF'i indir" },
} as const;

export type CertificateLang = keyof typeof CERTIFICATE_TEXT;

export function certificateLanguage(asked: string | null, acceptLanguage: string | null): CertificateLang {
  for (const part of [asked ?? "", ...(acceptLanguage ?? "").split(",")]) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (code === "en" || code === "ar" || code === "tr") return code;
  }
  return "en";
}

export function certificateDate(lang: CertificateLang, at: Date): string {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG-u-nu-latn" : lang, { dateStyle: "long", timeZone: "UTC" }).format(at);
}

export interface FoundCertificate {
  app: App;
  course: Course;
  name: string;
  completedAt: Date;
}

export async function loadCertificate(store: DataStore, secret: string, appId: string, code: string): Promise<FoundCertificate | null> {
  if (!UUID.test(appId)) return null;
  const who = readCertificateCode(secret, appId, code);
  if (!who) return null;
  const app = await store.getAppById(appId);
  const course = app ? courseSetup(app).courses.find((c) => c.id === who.courseId && c.certificate === true) : undefined;
  const user = app && course ? await store.getHostedUser(app.id, who.userId) : null;
  if (!app || !course || !user) return null;
  const enrolled = (await store.listCourseEnrollments({ appId: app.id, userId: user.id, courseId: course.id })).length > 0;
  const progress = new Map((await store.listLessonProgress({ appId: app.id, userId: user.id, courseId: course.id })).map((p) => [p.lessonId, p]));
  const result = courseProgress(
    course,
    progress,
    await store.listQuizAttempts({ appId: app.id, userId: user.id, courseId: course.id }),
    await store.listAssignmentSubmissions({ appId: app.id, userId: user.id, courseId: course.id }),
  );
  if (!enrolled || !result.course_completed || !result.completed_at) return null;
  return { app, course, name: user.name, completedAt: new Date(result.completed_at) };
}
