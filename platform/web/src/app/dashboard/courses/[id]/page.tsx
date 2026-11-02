import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCourseAction, deleteItemAction, deleteLessonAction, deleteQuizAction, deleteTopicAction, moveItemAction, moveTopicAction } from "@/app/actions/courses";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { formatDate } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { centsToDecimal } from "@/lib/catalog/money";
import { courseSetup } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import type { CourseLesson, CourseQuiz } from "@/lib/data/types";
import { appZone } from "@/lib/analytics/zone";
import { assignmentValues, liveValues, localParts } from "@/lib/courses/builder";
import { topicItems, type TopicItem } from "@/lib/courses/learning";
import { AssignmentForm, LiveForm, StudentsForm, TopicTitleForm } from "../builder-forms";
import type { DashT } from "@/i18n/dashboard";
import { questionsText } from "@/lib/courses/quizzes";
import { CourseForm, LessonForm, QuizForm, StudentForm, TopicForm } from "../forms";
import { setCourseTeacherAction } from "@/app/actions/teachers";
import { courseStage, isTeachersApp } from "@/lib/teachers/service";
import { ReviewForm } from "../../teachers/forms";
import { StageBadge } from "../../teachers/parts";
import { dashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata({ params }: PageProps<"/dashboard/courses/[id]">): Promise<Metadata> {
  const { app } = await requireClient("catalog");
  const id = Number((await params).id);
  const course = app ? courseSetup(app).courses.find((c) => c.id === id) : null;
  return { title: course?.title ?? (await dashboardText()).t("courses.title") };
}

function lessonValues(l: CourseLesson, zone: string): Record<string, string> {
  return {
    id: String(l.id),
    title: l.title,
    videoUrl: l.videoUrl ?? "",
    text: l.text,
    duration: l.durationMinutes ? String(l.durationMinutes) : "",
    preview: l.preview ? "on" : "",
    dripDays: l.dripDays ? String(l.dripDays) : "",
    opensOn: localParts(l.opensAt, zone).date,
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
    shuffle: q.shuffle ? "on" : "",
    showAnswers: q.showAnswers ? "on" : "",
  };
}

const ITEM_ICON = { lesson: "play_circle", quiz: "quiz", assignment: "assignment", live: "live_tv" } as const;

/** 112.5 An item's place in its section: one place up or down. */
function MoveButtons({ courseId, topicId, itemId, first, last, t }: { courseId: number; topicId: number; itemId: number; first: boolean; last: boolean; t: DashT }) {
  return (
    <div className="flex shrink-0 gap-1 pt-1.5">
      {(["up", "down"] as const).map((step) => (
        <form key={step} action={moveItemAction}>
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="topicId" value={topicId} />
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="step" value={step} />
          <SubmitButton variant="secondary" className="h-8 w-8 px-0" disabled={step === "up" ? first : last}>
            <Icon name={step === "up" ? "arrow_upward" : "arrow_downward"} size={16} />
            <span className="sr-only">{step === "up" ? t("lms.moveUp") : t("lms.moveDown")}</span>
          </SubmitButton>
        </form>
      ))}
    </div>
  );
}

/** 112.5 What the row says about an item. */
function itemMeta(it: TopicItem, t: DashT, zone: string): string {
  if (it.kind === "lesson") {
    const l = it.lesson;
    const kind = l.videoUrl ? t("courses.video") : t("courses.text");
    return [
      l.durationMinutes ? t("courses.lessonMeta", { kind, minutes: l.durationMinutes }) : kind,
      ...(l.preview ? [t("courses.freePreviewMeta")] : []),
      ...(l.dripDays ? [t("courses.opensAfterMeta", { days: l.dripDays })] : []),
      ...(l.opensAt ? [t("lms.opensOnMeta", { date: localParts(l.opensAt, zone).date })] : []),
      ...(l.attachments?.length ? [t("courses.filesMeta", { count: l.attachments.length })] : []),
    ].join(" · ");
  }
  if (it.kind === "quiz") return t("courses.quizMeta", { questions: it.quiz.questions.length, pass: it.quiz.passPercent });
  if (it.kind === "assignment") return t("lms.assignmentMeta", { points: it.assignment.maxPoints });
  const { date, time } = localParts(it.live.startsAt, zone);
  return t("lms.liveMeta", { date, time, minutes: it.live.durationMinutes });
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
  // 105.3 An academy with many teachers: whose course it is, and its review.
  const teachers = isTeachersApp(app) ? (await store.listTeachers(app.id)).filter((teacher) => teacher.status === "active" || teacher.status === "suspended") : null;
  const stage = courseStage(course);
  // 112.5 Days and times in the app's time zone; assignments waiting for a grade.
  const zone = await appZone(store, app);
  const toGrade = (await store.listAssignmentSubmissions({ appId: app.id, courseId: course.id, status: "submitted" })).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/courses" className="flex items-center gap-1 text-sm no-underline">
          <Icon name="arrow_back" size={18} />
          {t("courses.backToCourses")}
        </Link>
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{course.title}</h1>
        {teachers && course.teacherId ? (
          <div className="flex flex-wrap items-center gap-2">
            <StageBadge stage={stage} t={t} />
            {stage === "returned" && course.reviewNote ? <span className="text-sm text-muted">{t("teachers.reviewNote", { note: course.reviewNote })}</span> : null}
          </div>
        ) : null}
      </div>

      {teachers ? (
        <section aria-labelledby="h-teacher" className="flex max-w-[860px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 id="h-teacher" className="m-0 text-lg font-bold">
              {t("teachers.courseTeacher")}
            </h2>
            <p className="m-0 text-sm leading-relaxed text-muted">{t("teachers.courseTeacherIntro")}</p>
          </div>
          <form action={setCourseTeacherAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="courseId" value={course.id} />
            <label htmlFor="f-course-teacher" className="sr-only">
              {t("teachers.courseTeacher")}
            </label>
            <select id="f-course-teacher" name="teacherId" defaultValue={course.teacherId ? String(course.teacherId) : ""} className="input h-10 min-w-[240px]">
              <option value="">{t("teachers.theAcademy")}</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
            <SubmitButton variant="secondary" className="h-10">
              {t("teachers.setTeacher")}
            </SubmitButton>
          </form>
          {course.teacherId && stage === "in_review" ? <ReviewForm courseId={course.id} /> : null}
        </section>
      ) : null}

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
            sequential: course.sequential ? "on" : "",
            certificateSigner: course.certificateSigner ?? "",
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
        {course.topics.map((topic, topicIndex) => {
          const items = topicItems(topic);
          return (
          <div key={topic.id} className="flex flex-col gap-3 rounded-xl border border-line p-4" data-topic={topic.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="m-0 text-[17px] font-bold">{topic.title}</h3>
              <div className="flex flex-wrap items-center gap-1.5">
                {/* 112.5 The section's place in the course. */}
                {(["up", "down"] as const).map((step) => (
                  <form key={step} action={moveTopicAction}>
                    <input type="hidden" name="courseId" value={course.id} />
                    <input type="hidden" name="topicId" value={topic.id} />
                    <input type="hidden" name="step" value={step} />
                    <SubmitButton variant="secondary" className="h-8 w-8 px-0" disabled={step === "up" ? topicIndex === 0 : topicIndex === course.topics.length - 1}>
                      <Icon name={step === "up" ? "arrow_upward" : "arrow_downward"} size={16} />
                      <span className="sr-only">{step === "up" ? t("lms.moveSectionUp") : t("lms.moveSectionDown")}</span>
                    </SubmitButton>
                  </form>
                ))}
                <form action={deleteTopicAction}>
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="topicId" value={topic.id} />
                  <SubmitButton variant="secondary" className="h-8 px-3 text-[13px]">
                    {t("courses.deleteSection")}
                  </SubmitButton>
                </form>
              </div>
            </div>
            <details className="rounded-lg border border-line-soft px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold">{t("lms.renameSection")}</summary>
              <div className="pt-3">
                <TopicTitleForm courseId={course.id} topicId={topic.id} title={topic.title} />
              </div>
            </details>
            {items.map((it, i) => (
              <div key={`${it.kind}-${it.id}`} className="flex items-start gap-2" data-item={it.id} data-kind={it.kind}>
                <details className="min-w-0 flex-1 rounded-lg border border-line-soft">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-[15px]">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Icon name={ITEM_ICON[it.kind]} size={18} />
                      {it.kind === "lesson" ? it.lesson.title : it.kind === "quiz" ? it.quiz.title : it.kind === "assignment" ? it.assignment.title : it.live.title}
                    </span>
                    <span className="text-[13px] text-muted">{itemMeta(it, t, zone)}</span>
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-line-soft p-3">
                    {it.kind === "lesson" ? (
                      <>
                        <LessonForm courseId={course.id} topicId={topic.id} current={lessonValues(it.lesson, zone)} submit={t("courses.saveLesson")} />
                        <form action={deleteLessonAction}>
                          <input type="hidden" name="courseId" value={course.id} />
                          <input type="hidden" name="lessonId" value={it.id} />
                          <SubmitButton variant="danger" className="h-8 px-3 text-[13px]">
                            {t("courses.deleteLesson")}
                          </SubmitButton>
                        </form>
                      </>
                    ) : it.kind === "quiz" ? (
                      <>
                        <QuizForm courseId={course.id} topicId={topic.id} current={quizValues(it.quiz)} submit={t("courses.saveQuiz")} />
                        <form action={deleteQuizAction}>
                          <input type="hidden" name="courseId" value={course.id} />
                          <input type="hidden" name="quizId" value={it.id} />
                          <SubmitButton variant="danger" className="h-8 px-3 text-[13px]">
                            {t("courses.deleteQuiz")}
                          </SubmitButton>
                        </form>
                      </>
                    ) : (
                      <>
                        {it.kind === "assignment" ? (
                          <AssignmentForm courseId={course.id} topicId={topic.id} current={assignmentValues(it.assignment, zone)} submit={t("lms.saveAssignment")} />
                        ) : (
                          <LiveForm courseId={course.id} topicId={topic.id} current={liveValues(it.live, zone)} submit={t("lms.saveLive")} zone={zone} />
                        )}
                        <form action={deleteItemAction}>
                          <input type="hidden" name="courseId" value={course.id} />
                          <input type="hidden" name="itemId" value={it.id} />
                          <SubmitButton variant="danger" className="h-8 px-3 text-[13px]">
                            {it.kind === "assignment" ? t("lms.deleteAssignment") : t("lms.deleteLive")}
                          </SubmitButton>
                        </form>
                      </>
                    )}
                  </div>
                </details>
                <MoveButtons courseId={course.id} topicId={topic.id} itemId={it.id} first={i === 0} last={i === items.length - 1} t={t} />
              </div>
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
            {/* 112.5 Assignments and live classes. */}
            <details className="rounded-lg bg-sand p-3">
              <summary className="cursor-pointer text-[15px] font-semibold">{t("lms.addAssignmentTo", { section: topic.title })}</summary>
              <div className="pt-3">
                <AssignmentForm courseId={course.id} topicId={topic.id} current={{ title: "", instructions: "", maxPoints: "100", passPoints: "", dueDays: "", dueOn: "", attachments: "" }} submit={t("lms.addAssignment")} />
              </div>
            </details>
            <details className="rounded-lg bg-sand p-3">
              <summary className="cursor-pointer text-[15px] font-semibold">{t("lms.addLiveTo", { section: topic.title })}</summary>
              <div className="pt-3">
                <LiveForm courseId={course.id} topicId={topic.id} current={{ title: "", date: "", time: "", duration: "60", meetingUrl: "", notes: "", recordingUrl: "" }} submit={t("lms.addLive")} zone={zone} />
              </div>
            </details>
          </div>
          );
        })}
        <TopicForm courseId={course.id} />
      </section>

      <section aria-labelledby="h-students" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="h-students" className="m-0 text-lg font-bold">
            {t("courses.students")} <span className="font-normal text-muted">{enrollments.length}</span>
          </h2>
          {/* 90.2 Each student's progress and quiz results; 112.5 the gradebook, assignments to grade and a notification to the course. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {enrollments.length ? (
              <Link href={`/dashboard/courses/${course.id}/students`} className="flex items-center gap-1 text-sm font-semibold no-underline">
                <Icon name="monitoring" size={18} />
                {t("lms.gradebook")}
              </Link>
            ) : null}
            <Link href={`/dashboard/courses/${course.id}/assignments`} className="flex items-center gap-1 text-sm font-semibold no-underline" data-to-grade={toGrade}>
              <Icon name="assignment" size={18} />
              {toGrade ? t("lms.toGradeCount", { count: toGrade }) : t("lms.assignmentsTitle")}
            </Link>
            {enrollments.length && app.backend === "hosted" ? (
              <Link href={`/dashboard/notifications/campaigns/new?course=${course.id}`} className="flex items-center gap-1 text-sm font-semibold no-underline">
                <Icon name="campaign" size={18} />
                {t("lms.notifyStudents")}
              </Link>
            ) : null}
          </div>
        </div>
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
        {/* 112.5 Many at once. */}
        <details className="rounded-lg bg-sand p-3">
          <summary className="cursor-pointer text-[15px] font-semibold">{t("lms.addStudents")}</summary>
          <div className="pt-3">
            <StudentsForm courseId={course.id} />
          </div>
        </details>
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
