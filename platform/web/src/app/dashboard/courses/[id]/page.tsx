import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteCohortAction, deleteCourseAction } from "@/app/actions/courses";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, formatDate, PageHeader, Section } from "@/components/ui";
import { ItemList, ItemRow, LinkCards, Stat, StatRow, Thumb } from "@/components/page-kit";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { centsToDecimal, formatCents } from "@/lib/catalog/money";
import { courseSetup, lessonsOf } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import { appZone } from "@/lib/analytics/zone";
import { localParts } from "@/lib/courses/builder";
import { topicItems } from "@/lib/courses/learning";
import { CohortForm, StudentsForm } from "../builder-forms";
import { questionsText } from "@/lib/courses/quizzes";
import { QuestionBankForm, StudentForm } from "../forms";
import { setCourseTeacherAction } from "@/app/actions/teachers";
import { courseStage, isTeachersApp } from "@/lib/teachers/service";
import { ReviewForm } from "../../teachers/forms";
import { StageBadge } from "../../teachers/parts";
import { dashboardText } from "@/lib/dashboard-lang";
import { CourseEditorTabs, TabPanel } from "./editor-tabs";
import { CourseEditorForm } from "./course-form";
import { Curriculum, type CurriculumTopic } from "./curriculum";
import { itemMeta, itemTitle } from "./items";

export async function generateMetadata({ params }: PageProps<"/dashboard/courses/[id]">): Promise<Metadata> {
  const { app } = await requireClient("catalog");
  const id = Number((await params).id);
  const course = app ? courseSetup(app).courses.find((c) => c.id === id) : null;
  return { title: course?.title ?? (await dashboardText()).t("courses.title") };
}

const TABS = ["details", "curriculum", "pricing", "students", "certificate", "settings"] as const;

/**
 * One course. 132.13 Its editor, in tabs: Details, Curriculum (sections and
 * lessons in order, each lesson on its own page), Pricing and access,
 * Students (and cohorts), Certificate, and Settings (its teacher, question
 * bank, and deleting it). `?tab=` opens one.
 */
export default async function CoursePage({ params, searchParams }: PageProps<"/dashboard/courses/[id]">) {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "courses") notFound();
  const setup = courseSetup(app);
  const id = Number((await params).id);
  const course = setup.courses.find((c) => c.id === id);
  if (!course) notFound();
  const query = await searchParams;
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
  const base = `/dashboard/courses/${course.id}`;
  const tab = typeof query.tab === "string" && (TABS as readonly string[]).includes(query.tab) ? query.tab : "details";

  const topics: CurriculumTopic[] = course.topics.map((topic) => ({
    id: topic.id,
    title: topic.title,
    lessons: topic.lessons.length,
    items: topicItems(topic).map((it) => ({ id: it.id, kind: it.kind, title: itemTitle(it), meta: itemMeta(it, t, zone), href: `${base}/lessons/${it.id}` })),
    add: {
      lesson: `${base}/lessons/new?section=${topic.id}&kind=lesson`,
      quiz: `${base}/lessons/new?section=${topic.id}&kind=quiz`,
      assignment: `${base}/lessons/new?section=${topic.id}&kind=assignment`,
      live: `${base}/lessons/new?section=${topic.id}&kind=live`,
    },
  }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        back={{ href: "/dashboard/courses", label: t("courses.backToCourses") }}
        title={course.title}
        description={
          <span className="flex flex-col gap-2">
            <span>{t("courses.courseLine", { price: course.priceCents ? formatCents(course.priceCents, setup.currency) : t("common.free"), lessons, students: enrollments.length })}</span>
            <span className="flex flex-wrap items-center gap-2">
              <StageBadge stage={stage} t={t} />
              {teachers && course.teacherId && stage === "returned" && course.reviewNote ? <span className="text-sm text-muted">{t("teachers.reviewNote", { note: course.reviewNote })}</span> : null}
            </span>
          </span>
        }
      />

      <CourseEditorTabs
        label={course.title}
        initial={tab}
        tabs={[
          { id: "details", label: t("common.details"), icon: "edit_note" },
          { id: "curriculum", label: t("manage.tabCurriculum"), icon: "menu_book", count: lessons },
          { id: "pricing", label: t("manage.tabPricing"), icon: "sell" },
          { id: "students", label: t("courses.students"), icon: "groups", count: enrollments.length },
          { id: "certificate", label: t("manage.tabCertificate"), icon: "workspace_premium" },
          { id: "settings", label: t("manage.settings"), icon: "settings" },
        ]}
      >
        <CourseEditorForm
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
        />

        <TabPanel tab="curriculum">
          <Section titleId="h-curriculum" title={t("courses.curriculum")} description={t("courses.curriculumCount", { sections: course.topics.length, lessons })}>
            {course.topics.length ? null : (
              <EmptyState icon="menu_book" title={t("manage.noSections")}>
                {t("manage.noSectionsText")}
              </EmptyState>
            )}
            <Curriculum courseId={course.id} topics={topics} />
          </Section>
        </TabPanel>

        <TabPanel tab="students">
          <StatRow label={t("courses.students")}>
            <Stat icon="groups" tone="accent" label={t("courses.statStudents")} value={enrollments.length} href={enrollments.length ? `${base}/students` : undefined} />
            <Stat icon="assignment" tone={toGrade ? "warn" : "success"} label={t("courses.statToGrade")} value={toGrade} href={`${base}/assignments`} />
            <Stat icon="groups" label={t("lms.cohorts")} value={cohorts.length} />
          </StatRow>
          {/* 90.2 Each student's progress and quiz results; 112.5 the gradebook, assignments to grade and a notification to the course. */}
          <LinkCards
            label={t("courses.courseTools")}
            items={[
              ...(enrollments.length ? [{ href: `${base}/students`, icon: "monitoring" as const, label: t("lms.gradebook") }] : []),
              // 113.7
              ...(enrollments.length && setup.gamification ? [{ href: `${base}/leaderboard`, icon: "emoji_events" as const, label: t("learning.leaderboard") }] : []),
              { href: `${base}/assignments`, icon: "assignment" as const, label: toGrade ? t("lms.toGradeCount", { count: toGrade }) : t("lms.assignmentsTitle") },
              ...(enrollments.length && app.backend === "hosted" ? [{ href: `/dashboard/notifications/campaigns/new?course=${course.id}`, icon: "campaign" as const, label: t("lms.notifyStudents") }] : []),
            ]}
          />
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
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
                <div className="p-5 sm:p-6">
                  <EmptyState icon="groups" title={t("courses.noStudents")} />
                </div>
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
          </div>
        </TabPanel>

        <TabPanel tab="settings">
          {teachers ? (
            <Section titleId="h-teacher" title={t("teachers.courseTeacher")} description={t("teachers.courseTeacherIntro")} className="max-w-[760px]">
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
          ) : null}

          {/* 112.5 The question bank the quizzes draw from. */}
          <Section titleId="h-bank" title={t("lms.bankTitle")} description={t("lms.bankIntro")} actions={<Badge tone="neutral">{t("courses.bankCount", { count: bank.length })}</Badge>} className="max-w-[760px]">
            <details className="rounded-xl border border-line-soft bg-sand p-3" open={bank.length > 0}>
              <summary className="cursor-pointer text-[15px] font-semibold">{t("lms.editBank")}</summary>
              <div className="pt-3">
                <QuestionBankForm courseId={course.id} current={questionsText({ questions: bank })} />
              </div>
            </details>
          </Section>

          <form action={deleteCourseAction} className="flex max-w-[760px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger/30 bg-white p-5">
            <input type="hidden" name="id" value={course.id} />
            <span className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5">
              <span className="text-[15px] font-bold">{t("courses.deleteCourse")}</span>
              <span className="text-sm leading-relaxed text-ink-4">{t("manage.deleteCourseNote")}</span>
            </span>
            <SubmitButton variant="danger" className="h-10">
              <Icon name="delete" size={18} />
              {t("courses.deleteCourse")}
            </SubmitButton>
          </form>
        </TabPanel>
      </CourseEditorTabs>
    </div>
  );
}
