import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCourseAction, deleteLessonAction, deleteQuizAction, deleteTopicAction } from "@/app/actions/courses";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { formatDate } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { centsToDecimal } from "@/lib/catalog/money";
import { courseSetup } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import type { CourseLesson, CourseQuiz } from "@/lib/data/types";
import { questionsText } from "@/lib/courses/quizzes";
import { CourseForm, LessonForm, QuizForm, StudentForm, TopicForm } from "../forms";
import { dashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata({ params }: PageProps<"/dashboard/courses/[id]">): Promise<Metadata> {
  const { app } = await requireClient("catalog");
  const id = Number((await params).id);
  const course = app ? courseSetup(app).courses.find((c) => c.id === id) : null;
  return { title: course?.title ?? (await dashboardText()).t("courses.title") };
}

function lessonValues(l: CourseLesson): Record<string, string> {
  return {
    id: String(l.id),
    title: l.title,
    videoUrl: l.videoUrl ?? "",
    text: l.text,
    duration: l.durationMinutes ? String(l.durationMinutes) : "",
    preview: l.preview ? "on" : "",
    dripDays: l.dripDays ? String(l.dripDays) : "",
    attachments: (l.attachments ?? []).map((a) => `${a.name} | ${a.url}`).join("\n"),
  };
}

function quizValues(q: CourseQuiz): Record<string, string> {
  return {
    id: String(q.id),
    title: q.title,
    passPercent: String(q.passPercent),
    attemptsAllowed: q.attemptsAllowed ? String(q.attemptsAllowed) : "",
    timeLimit: q.timeLimitMinutes ? String(q.timeLimitMinutes) : "",
    questions: questionsText(q),
  };
}

/** One course: details, sections and lessons, students. */
export default async function CoursePage({ params }: PageProps<"/dashboard/courses/[id]">) {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "courses") notFound();
  const setup = courseSetup(app);
  const id = Number((await params).id);
  const course = setup.courses.find((c) => c.id === id);
  if (!course) notFound();
  const store = await getStore();
  const enrollments = await store.listCourseEnrollments({ appId: app.id, courseId: course.id });
  const { t, lang } = await dashboardText();
  const students = await Promise.all(enrollments.slice(0, 50).map(async (e) => ({ ...e, user: await store.getHostedUser(app.id, e.userId) })));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/courses" className="flex items-center gap-1 text-sm no-underline">
          <Icon name="arrow_back" size={18} />
          {t("courses.backToCourses")}
        </Link>
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{course.title}</h1>
      </div>

      <section aria-labelledby="h-details" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-details" className="m-0 text-lg font-bold">
          {t("courses.details")}
        </h2>
        <CourseForm
          current={{
            id: String(course.id),
            title: course.title,
            description: course.description,
            price: course.priceCents ? centsToDecimal(course.priceCents) : "",
            instructor: course.instructorName ?? "",
            level: course.level ?? "",
            categoryIds: course.categoryIds.join(","),
            active: course.active ? "on" : "",
            restart: course.canRestart === false ? "" : "on",
            certificate: course.certificate ? "on" : "",
            accessDays: course.accessDays ? String(course.accessDays) : "",
          }}
          categories={setup.categories}
          currency={setup.currency}
          imageUrl={course.imageAssetId ? assetUrl(course.imageAssetId) : null}
          submit={t("courses.saveCourse")}
        />
      </section>

      <section aria-labelledby="h-curriculum" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-curriculum" className="m-0 text-lg font-bold">
          {t("courses.curriculum")}
        </h2>
        {course.topics.map((topic) => (
          <div key={topic.id} className="flex flex-col gap-3 rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="m-0 text-[17px] font-bold">{topic.title}</h3>
              <form action={deleteTopicAction}>
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="topicId" value={topic.id} />
                <SubmitButton variant="secondary" className="h-8 px-3 text-[13px]">
                  {t("courses.deleteSection")}
                </SubmitButton>
              </form>
            </div>
            {topic.lessons.map((l) => (
              <details key={l.id} className="rounded-lg border border-line-soft">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-[15px]">
                  <span className="font-semibold">{l.title}</span>
                  <span className="text-[13px] text-muted">
                    {l.durationMinutes
                      ? t("courses.lessonMeta", { kind: l.videoUrl ? t("courses.video") : t("courses.text"), minutes: l.durationMinutes })
                      : l.videoUrl
                        ? t("courses.video")
                        : t("courses.text")}
                    {l.preview ? ` · ${t("courses.freePreviewMeta")}` : ""}
                    {l.dripDays ? ` · ${t("courses.opensAfterMeta", { days: l.dripDays })}` : ""}
                    {l.attachments?.length ? ` · ${t("courses.filesMeta", { count: l.attachments.length })}` : ""}
                  </span>
                </summary>
                <div className="flex flex-col gap-3 border-t border-line-soft p-3">
                  <LessonForm courseId={course.id} topicId={topic.id} current={lessonValues(l)} submit={t("courses.saveLesson")} />
                  <form action={deleteLessonAction}>
                    <input type="hidden" name="courseId" value={course.id} />
                    <input type="hidden" name="lessonId" value={l.id} />
                    <SubmitButton variant="danger" className="h-8 px-3 text-[13px]">
                      {t("courses.deleteLesson")}
                    </SubmitButton>
                  </form>
                </div>
              </details>
            ))}
            {(topic.quizzes ?? []).map((q) => (
              <details key={`quiz-${q.id}`} className="rounded-lg border border-line-soft">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-[15px]">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Icon name="quiz" size={18} />
                    {q.title}
                  </span>
                  <span className="text-[13px] text-muted">{t("courses.quizMeta", { questions: q.questions.length, pass: q.passPercent })}</span>
                </summary>
                <div className="flex flex-col gap-3 border-t border-line-soft p-3">
                  <QuizForm courseId={course.id} topicId={topic.id} current={quizValues(q)} submit={t("courses.saveQuiz")} />
                  <form action={deleteQuizAction}>
                    <input type="hidden" name="courseId" value={course.id} />
                    <input type="hidden" name="quizId" value={q.id} />
                    <SubmitButton variant="danger" className="h-8 px-3 text-[13px]">
                      {t("courses.deleteQuiz")}
                    </SubmitButton>
                  </form>
                </div>
              </details>
            ))}
            <details className="rounded-lg bg-sand p-3" open={topic.lessons.length === 0}>
              <summary className="cursor-pointer text-[15px] font-semibold">{t("courses.addLessonTo", { section: topic.title })}</summary>
              <div className="pt-3">
                <LessonForm
                  courseId={course.id}
                  topicId={topic.id}
                  current={{ title: "", videoUrl: "", text: "", duration: "", preview: "" }}
                  submit={t("courses.addLesson")}
                />
              </div>
            </details>
            {topic.lessons.length ? (
              <details className="rounded-lg bg-sand p-3">
                <summary className="cursor-pointer text-[15px] font-semibold">{t("courses.addQuizTo", { section: topic.title })}</summary>
                <div className="pt-3">
                  <QuizForm
                    courseId={course.id}
                    topicId={topic.id}
                    current={{ title: "", passPercent: "70", attemptsAllowed: "", timeLimit: "", questions: "" }}
                    submit={t("courses.addQuiz")}
                  />
                </div>
              </details>
            ) : null}
          </div>
        ))}
        <TopicForm courseId={course.id} />
      </section>

      <section aria-labelledby="h-students" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-students" className="m-0 text-lg font-bold">
          {t("courses.students")} <span className="font-normal text-muted">{enrollments.length}</span>
        </h2>
        {students.length ? (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[15px]">
            {students.map((s) => (
              <li key={s.userId} className="flex flex-wrap gap-x-3">
                <span className="font-semibold">{s.user?.name ?? t("courses.deletedAccount")}</span>
                <span className="text-muted" dir="ltr">
                  {s.user?.phone}
                </span>
                <span className="text-muted">
                  {s.source === "paid" ? t("courses.paid") : s.source === "manual" ? t("courses.addedByYou") : t("common.free")} · {formatDate(s.enrolledAt, lang)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-[15px] text-muted">{t("courses.noStudents")}</p>
        )}
        <StudentForm courseId={course.id} />
      </section>

      <form action={deleteCourseAction}>
        <input type="hidden" name="id" value={course.id} />
        <SubmitButton variant="danger" className="h-10">
          {t("courses.deleteCourse")}
        </SubmitButton>
      </form>
    </div>
  );
}
