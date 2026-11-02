import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteCohortAction, deleteCourseAction, deleteItemAction, deleteLessonAction, deleteQuizAction, deleteTopicAction, moveItemAction, moveTopicAction } from "@/app/actions/courses";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { Badge, formatDate, PageHeader, Section } from "@/components/ui";
import { DetailLayout, ItemList, ItemRow, LinkCards, Stat, StatRow, Thumb } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { centsToDecimal, formatCents } from "@/lib/catalog/money";
import { courseSetup, lessonsOf } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import type { CourseLesson, CourseQuiz } from "@/lib/data/types";
import { appZone } from "@/lib/analytics/zone";
import { assignmentValues, liveValues, localParts } from "@/lib/courses/builder";
import { topicItems, type TopicItem } from "@/lib/courses/learning";
import { AssignmentForm, CohortForm, LiveForm, StudentsForm, TopicTitleForm } from "../builder-forms";
import type { DashT } from "@/i18n/dashboard";
import { examValues, questionsText } from "@/lib/courses/quizzes";
import { CourseForm, LessonForm, QuestionBankForm, QuizForm, StudentForm, TopicForm } from "../forms";
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

function quizValues(q: CourseQuiz, zone: string): Record<string, string> {
  return {
    id: String(q.id),
    title: q.title,
    passPercent: String(q.passPercent),
    attemptsAllowed: q.attemptsAllowed ? String(q.attemptsAllowed) : "",
    timeLimit: q.timeLimitMinutes ? String(q.timeLimitMinutes) : "",
    questions: questionsText(q),
    shuffle: q.shuffle ? "on" : "",
    showAnswers: q.showAnswers ? "on" : "",
    bankPicks: q.bankPicks ? String(q.bankPicks) : "",
    // 113.7
    ...examValues(q, zone),
  };
}

const ITEM_ICON = { lesson: "play_circle", quiz: "quiz", assignment: "assignment", live: "live_tv" } as const;
const ITEM_TINT = { lesson: "bg-tile-1 text-ink-3", quiz: "bg-tile-2 text-ink-3", assignment: "bg-tile-3 text-ink-3", live: "bg-tile-4 text-ink-3" } as const;

/** Something to add to a section, opened in place. */
function AddBox({ icon, title, open = false, children }: { icon: IconName; title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details className="rounded-xl border border-dashed border-line-strong bg-white px-3 py-2.5" open={open}>
      <summary className="flex cursor-pointer items-center gap-2 text-[15px] font-semibold">
        <Icon name="add" size={18} className="text-muted" />
        <Icon name={icon} size={18} />
        {title}
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

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
  if (it.kind === "quiz") {
    const meta = t("courses.quizMeta", { questions: it.quiz.questions.length, pass: it.quiz.passPercent });
    // 113.7 An exam says when it opens.
    const exam = it.quiz.exam ? ` · ${it.quiz.exam.opensAt ? t("learning.examMeta", { date: localParts(it.quiz.exam.opensAt, zone).date }) : t("learning.examShort")}` : "";
    return (it.quiz.bankPicks ? `${meta} · ${t("lms.bankPicksMeta", { count: it.quiz.bankPicks })}` : meta) + exam;
  }
  if (it.kind === "assignment") {
    const meta = t("lms.assignmentMeta", { points: it.assignment.maxPoints });
    return [meta, ...(it.assignment.rubric?.length ? [t("learning.rubricMeta")] : []), ...((it.assignment.attemptsAllowed ?? 1) > 1 ? [t("learning.triesMeta", { count: it.assignment.attemptsAllowed! })] : [])].join(" · ");
  }
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
  const cohortName = new Map((course.cohorts ?? []).map((c) => [c.id, c.name]));
  const toGrade = (await store.listAssignmentSubmissions({ appId: app.id, courseId: course.id, status: "submitted" })).length;

  const lessons = lessonsOf(course).length;
  const cohorts = course.cohorts ?? [];
  const bank = course.questionBank ?? [];

  const teacherSection = teachers ? (
    <Section titleId="h-teacher" title={t("teachers.courseTeacher")} description={t("teachers.courseTeacherIntro")}>
      <form action={setCourseTeacherAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="courseId" value={course.id} />
        <label htmlFor="f-course-teacher" className="sr-only">
          {t("teachers.courseTeacher")}
        </label>
        <select id="f-course-teacher" name="teacherId" defaultValue={course.teacherId ? String(course.teacherId) : ""} className="input h-10 min-w-0 flex-[1_1_200px]">
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
    </Section>
  ) : null;

  const curriculum = (
    <Section titleId="h-curriculum" title={t("courses.curriculum")} description={t("courses.curriculumCount", { sections: course.topics.length, lessons })}>
      {course.topics.map((topic, topicIndex) => {
        const items = topicItems(topic);
        return (
          <div key={topic.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-sand/40 p-4" data-topic={topic.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-midnight text-sm font-extrabold text-ivory tabular-nums">
                  {topicIndex + 1}
                </span>
                <span className="flex min-w-0 flex-col">
                  <h3 className="m-0 text-[17px] font-bold break-words">{topic.title}</h3>
                  <span className="text-[13px] text-muted">{t("courses.sectionItems", { count: items.length })}</span>
                </span>
              </div>
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
            <details className="rounded-xl border border-line-soft bg-white px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold">{t("lms.renameSection")}</summary>
              <div className="pt-3">
                <TopicTitleForm courseId={course.id} topicId={topic.id} title={topic.title} />
              </div>
            </details>
            {items.length ? (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {items.map((it, i) => (
                  <li key={`${it.kind}-${it.id}`} className="flex items-start gap-2" data-item={it.id} data-kind={it.kind}>
                    <details className="group min-w-0 flex-1 rounded-xl border border-line bg-white">
                      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5 text-[15px]">
                        <span className="flex min-w-0 items-center gap-2.5 font-semibold">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${ITEM_TINT[it.kind]}`}>
                            <Icon name={ITEM_ICON[it.kind]} size={18} />
                          </span>
                          <span className="min-w-0 break-words">{it.kind === "lesson" ? it.lesson.title : it.kind === "quiz" ? it.quiz.title : it.kind === "assignment" ? it.assignment.title : it.live.title}</span>
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
                            <QuizForm courseId={course.id} topicId={topic.id} current={quizValues(it.quiz, zone)} submit={t("courses.saveQuiz")} />
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
                  </li>
                ))}
              </ul>
            ) : null}
            {/* What can go in the section, each opened in place. */}
            <div className="flex flex-col gap-2">
              <AddBox icon="play_circle" title={t("courses.addLessonTo", { section: topic.title })} open={topic.lessons.length === 0}>
                <LessonForm courseId={course.id} topicId={topic.id} current={{ title: "", videoUrl: "", text: "", duration: "", preview: "" }} submit={t("courses.addLesson")} />
              </AddBox>
              {topic.lessons.length ? (
                <AddBox icon="quiz" title={t("courses.addQuizTo", { section: topic.title })}>
                  <QuizForm courseId={course.id} topicId={topic.id} current={{ title: "", passPercent: "70", attemptsAllowed: "", timeLimit: "", questions: "" }} submit={t("courses.addQuiz")} />
                </AddBox>
              ) : null}
              {/* 112.5 Assignments and live classes. */}
              <AddBox icon="assignment" title={t("lms.addAssignmentTo", { section: topic.title })}>
                <AssignmentForm courseId={course.id} topicId={topic.id} current={{ title: "", instructions: "", maxPoints: "100", passPoints: "", dueDays: "", dueOn: "", attachments: "" }} submit={t("lms.addAssignment")} />
              </AddBox>
              <AddBox icon="live_tv" title={t("lms.addLiveTo", { section: topic.title })}>
                <LiveForm courseId={course.id} topicId={topic.id} current={{ title: "", date: "", time: "", duration: "60", meetingUrl: "", notes: "", recordingUrl: "" }} submit={t("lms.addLive")} zone={zone} />
              </AddBox>
            </div>
          </div>
        );
      })}
      {/* The course's next section: in a Sheet, in place for the first one. */}
      <Sheet id="new-section" inline={course.topics.length === 0} title={t("courses.addSectionTitle")} description={t("courses.addSectionHint")}>
        <TopicForm courseId={course.id} />
      </Sheet>
    </Section>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the numbers, then the course's forms beside its students, links and cohorts. */}
      <PageHeader
        back={{ href: "/dashboard/courses", label: t("courses.backToCourses") }}
        title={course.title}
        description={
          <span className="flex flex-col gap-2">
            <span>{t("courses.courseLine", { price: course.priceCents ? formatCents(course.priceCents, setup.currency) : t("common.free"), lessons, students: enrollments.length })}</span>
            {teachers && course.teacherId ? (
              <span className="flex flex-wrap items-center gap-2">
                <StageBadge stage={stage} t={t} />
                {stage === "returned" && course.reviewNote ? <span className="text-sm text-muted">{t("teachers.reviewNote", { note: course.reviewNote })}</span> : null}
              </span>
            ) : null}
          </span>
        }
        actions={
          course.topics.length ? (
            <SheetButton target="new-section" icon="add">
              {t("courses.addSectionTitle")}
            </SheetButton>
          ) : null
        }
      />

      <StatRow label={course.title}>
        <Stat icon="groups" tone="accent" label={t("courses.statStudents")} value={enrollments.length} href={enrollments.length ? `/dashboard/courses/${course.id}/students` : undefined} />
        <Stat icon="play_circle" label={t("courses.statLessons")} value={lessons} hint={t("courses.sectionsCount", { count: course.topics.length })} />
        <Stat icon="assignment" tone={toGrade ? "warn" : "success"} label={t("courses.statToGrade")} value={toGrade} />
        <Stat icon="groups" label={t("lms.cohorts")} value={cohorts.length} />
      </StatRow>

      <DetailLayout
        main={
          <>
            <Section titleId="h-details" title={t("courses.details")}>
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
                  // 113.7
                  completeWhen: course.completeWhen ?? "all",
                  minFinalScore: course.minFinalScore ? String(course.minFinalScore) : "",
                  prerequisiteIds: (course.prerequisites ?? []).join(","),
                }}
                others={setup.courses.filter((c) => c.id !== course.id).map((c) => ({ id: c.id, title: c.title }))}
                categories={setup.categories}
                currency={setup.currency}
                imageUrl={course.imageAssetId ? assetUrl(course.imageAssetId) : null}
                submit={t("courses.saveCourse")}
              />
            </Section>

            {curriculum}

            {/* 112.5 The question bank the quizzes draw from. */}
            <Section titleId="h-bank" title={t("lms.bankTitle")} description={t("lms.bankIntro")} actions={<Badge tone="neutral">{t("courses.bankCount", { count: bank.length })}</Badge>}>
              <details className="rounded-xl border border-line-soft bg-sand p-3" open={bank.length > 0}>
                <summary className="cursor-pointer text-[15px] font-semibold">{t("lms.editBank")}</summary>
                <div className="pt-3">
                  <QuestionBankForm courseId={course.id} current={questionsText({ questions: bank })} />
                </div>
              </details>
            </Section>
          </>
        }
        side={
          <>
            {teacherSection}

            {/* 90.2 Each student's progress and quiz results; 112.5 the gradebook, assignments to grade and a notification to the course. */}
            <LinkCards
              label={t("courses.courseTools")}
              items={[
                ...(enrollments.length ? [{ href: `/dashboard/courses/${course.id}/students`, icon: "monitoring" as const, label: t("lms.gradebook") }] : []),
                // 113.7
                ...(enrollments.length && setup.gamification ? [{ href: `/dashboard/courses/${course.id}/leaderboard`, icon: "emoji_events" as const, label: t("learning.leaderboard") }] : []),
                { href: `/dashboard/courses/${course.id}/assignments`, icon: "assignment" as const, label: toGrade ? t("lms.toGradeCount", { count: toGrade }) : t("lms.assignmentsTitle") },
                ...(enrollments.length && app.backend === "hosted" ? [{ href: `/dashboard/notifications/campaigns/new?course=${course.id}`, icon: "campaign" as const, label: t("lms.notifyStudents") }] : []),
              ]}
            />

            <Section titleId="h-students" title={t("courses.students")} actions={<Badge tone="neutral">{enrollments.length}</Badge>} flush>
              {students.length ? (
                <ItemList>
                  {students.map((s, i) => (
                    <ItemRow
                      key={s.userId}
                      media={<Thumb icon="person" shape="round" tint={i} />}
                      title={s.user?.name ?? t("courses.deletedAccount")}
                      meta={
                        <>
                          {s.user?.phone ? <bdi dir="ltr">{s.user.phone}</bdi> : null}
                          {s.user?.phone ? " · " : null}
                          {s.source === "paid" ? t("courses.paid") : s.source === "manual" ? t("courses.addedByYou") : t("common.free")} · {formatDate(s.enrolledAt, lang)}
                          {s.cohortId && cohortName.get(s.cohortId) ? ` · ${cohortName.get(s.cohortId)}` : ""}
                        </>
                      }
                    />
                  ))}
                </ItemList>
              ) : (
                <p className="m-0 px-5 py-4 text-[15px] text-muted sm:px-6">{t("courses.noStudents")}</p>
              )}
              <div className="flex flex-col gap-3 border-t border-line-soft px-5 py-4 sm:px-6">
                <StudentForm courseId={course.id} cohorts={cohorts} />
                {/* 112.5 Many at once. */}
                <details className="rounded-xl bg-sand p-3">
                  <summary className="cursor-pointer text-[15px] font-semibold">{t("lms.addStudents")}</summary>
                  <div className="pt-3">
                    <StudentsForm courseId={course.id} cohorts={cohorts} />
                  </div>
                </details>
              </div>
            </Section>

            {/* 112.5 Cohorts: students who start together. */}
            <Section titleId="h-cohorts" title={t("lms.cohorts")} description={t("lms.cohortsIntro")} actions={<Badge tone="neutral">{cohorts.length}</Badge>}>
              {cohorts.length ? (
                <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
                  {cohorts.map((cohort) => (
                    <li key={cohort.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line-soft px-3 py-2" data-cohort={cohort.id}>
                      <span className="flex min-w-0 flex-col">
                        <span className="font-semibold">{cohort.name}</span>
                        <span className="text-[13px] text-muted">{t("lms.cohortLine", { date: localParts(cohort.startsAt, zone).date, count: enrollments.filter((e) => e.cohortId === cohort.id).length })}</span>
                      </span>
                      <form action={deleteCohortAction}>
                        <input type="hidden" name="courseId" value={course.id} />
                        <input type="hidden" name="cohortId" value={cohort.id} />
                        <SubmitButton variant="secondary" className="h-8 px-3 text-[13px]">
                          {t("lms.deleteCohort")}
                        </SubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : null}
              <CohortForm courseId={course.id} />
            </Section>

            <form action={deleteCourseAction} className="flex justify-end">
              <input type="hidden" name="id" value={course.id} />
              <SubmitButton variant="danger" className="h-10">
                <Icon name="delete" size={18} />
                {t("courses.deleteCourse")}
              </SubmitButton>
            </form>
          </>
        }
      />
    </div>
  );
}
