import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { assetUrl } from "@/lib/assets";
import { courseSetup } from "@/lib/courses/setup";
import { courseProgress, readCertificateCode } from "@/lib/courses/learning";
import { getStore } from "@/lib/data";
import { signingSecret } from "@/lib/env";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * 90.1 /a/<app_id>/certificate/<code>: the certificate of a student who
 * finished a course managed in Yallapp (every lesson completed, every quiz
 * passed, 112.5 every assignment graded), in the app's branding, with 112.5
 * the course's signature line, ready to print or keep as a PDF. The code is
 * signed, so the page also proves the certificate is real.
 */
const TEXT = {
  en: { heading: "Certificate of completion", given: "This certifies that", finished: "has completed the course", on: "Completed on {date}", code: "Certificate {code}", signed: "Signed", verified: "This page is the certificate's proof: {app} issued it." },
  ar: { heading: "شهادة إتمام", given: "تشهد هذه الوثيقة بأن", finished: "قد أتمّ الدورة", on: "تاريخ الإتمام: {date}", code: "الشهادة {code}", signed: "التوقيع", verified: "هذه الصفحة دليل صحة الشهادة: أصدرتها {app}." },
  tr: { heading: "Tamamlama sertifikası", given: "Bu belge,", finished: "adlı kişinin şu kursu tamamladığını onaylar", on: "Tamamlanma tarihi: {date}", code: "Sertifika {code}", signed: "İmza", verified: "Bu sayfa sertifikanın kanıtıdır: {app} tarafından verildi." },
} as const;

type Lang = keyof typeof TEXT;

function pageLanguage(acceptLanguage: string | null): Lang {
  for (const part of (acceptLanguage ?? "").split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (code === "en" || code === "ar" || code === "tr") return code;
  }
  return "en";
}

type Params = { params: Promise<{ appId: string; code: string }> };

async function load(appId: string, code: string) {
  if (!UUID.test(appId)) return null;
  const who = readCertificateCode(signingSecret(), appId, code);
  if (!who) return null;
  const store = await getStore();
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
  // The name only: a page anyone with the link opens never shows a phone number or email address.
  return { app, course, name: user.name, completedAt: new Date(result.completed_at) };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { appId, code } = await params;
  const found = await load(appId, code);
  return { title: { absolute: found ? `${found.course.title} · ${found.name}` : "Certificate" }, robots: { index: false } };
}

export default async function CertificatePage({ params }: Params) {
  const { appId, code } = await params;
  const found = await load(appId, code);
  if (!found) notFound();
  const { app, course, name, completedAt } = found;
  const lang = pageLanguage((await headers()).get("accept-language"));
  const t = TEXT[lang];
  const date = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG-u-nu-latn" : lang, { dateStyle: "long", timeZone: "UTC" }).format(completedAt);
  const logo = app.logoAssetId ?? app.iconAssetId;
  return (
    <main lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className="mx-auto flex min-h-screen w-full max-w-[860px] items-center bg-white px-4 py-8 print:p-0">
      <section
        className="flex w-full flex-col items-center gap-5 rounded-3xl border-[6px] bg-white px-6 py-12 text-center sm:px-14"
        style={{ borderColor: app.primaryColor }}
        data-certificate=""
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(logo)} alt="" className="h-16 w-auto max-w-[220px] object-contain" />
        ) : null}
        <p className="m-0 text-sm font-semibold tracking-wide text-ink-4 uppercase">{app.appName ?? app.storeTitle}</p>
        <h1 className="m-0 text-[30px] leading-tight font-extrabold sm:text-[38px]" style={{ color: app.primaryColor }}>
          {t.heading}
        </h1>
        <p className="m-0 text-[16px] text-ink-4">{t.given}</p>
        <p className="m-0 border-b-2 border-line px-6 pb-2 text-[28px] font-bold sm:text-[34px]" data-certificate-name="">
          {name}
        </p>
        <p className="m-0 text-[16px] text-ink-4">{t.finished}</p>
        <p className="m-0 text-[22px] font-bold sm:text-[26px]" data-certificate-course="">
          {course.title}
        </p>
        <p className="m-0 text-[15px] text-ink-4">{t.on.replace("{date}", date)}</p>
        {/* 112.5 Who signs it. */}
        {course.certificateSigner ? (
          <div className="mt-4 flex flex-col items-center gap-1" data-certificate-signer="">
            <span className="min-w-[220px] border-b border-ink-4 pb-1 text-[18px] italic">{course.certificateSigner}</span>
            <span className="text-xs text-muted">{t.signed}</span>
          </div>
        ) : null}
        <p className="m-0 text-xs text-muted" dir="ltr">
          {t.code.replace("{code}", code)}
        </p>
        <p className="m-0 text-xs text-muted">{t.verified.replace("{app}", app.appName ?? app.storeTitle ?? "")}</p>
      </section>
    </main>
  );
}
