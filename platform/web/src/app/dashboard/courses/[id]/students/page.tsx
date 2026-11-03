import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setStudentCohortAction } from "@/app/actions/courses";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, btn, formatDate, PageHeader, Section } from "@/components/ui";
import { ItemList, ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterLinks, ListBar } from "@/components/page-kit-b";
import { formatCents } from "@/lib/catalog/money";
import { courseInsights } from "@/lib/courses/insights";
import { requireClient } from "@/lib/auth/session";
import { assignmentSummaries, atRisk, AT_RISK_DAYS, courseReport, quizSummaries } from "@/lib/courses/report";
import { courseSetup } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata({ params }: PageProps<"/dashboard/courses/[id]/students">): Promise<Metadata> {
  const { app } = await requireClient("catalog");
  const id = Number((await params).id);
  const course = app ? courseSetup(app).courses.find((c) => c.id === id) : null;
  const { t } = await dashboardText();
  return { title: course ? `${t("courses.progressTitle")} · ${course.title}` : t("courses.title") };
}

/**
 * 90.2 Progress for the teacher: each student of a course, how far they got
 * and their quiz results, with the CSV file. 112.5 The gradebook: the
 * assignments' grades, students at risk (nothing learned for a week), and
 * the course at a glance.
 */
export default async function CourseStudentsPage({ params, searchParams }: PageProps<"/dashboard/courses/[id]/students">) {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "courses") notFound();
  const id = Number((await params).id);
  const course = courseSetup(app).courses.find((c) => c.id === id);
  if (!course) notFound();
  const store = await getStore();
  const all = await courseReport(store, app, course);
  const quizzes = quizSummaries(course, all);
  const assignments = assignmentSummaries(course, all);
  const { t, lang } = await dashboardText();
  const now = new Date();
  const query = (await searchParams) as { filter?: string; cohort?: string };
  const riskOnly = query.filter === "at_risk";
  // 112.5 One cohort's students.
  const cohorts = course.cohorts ?? [];
  const cohort = cohorts.find((c) => c.id === Number(query.cohort)) ?? null;
  const rows = all.filter((r) => (!riskOnly || atRisk(r, now)) && (!cohort || r.cohortId === cohort.id));
  const base = `/dashboard/courses/${course.id}/students`;
  const insights = await courseInsights(store, app, courseSetup(app), course, all, now);
  const currency = courseSetup(app).currency;
  const finished = all.filter((r) => r.completedAt).length;
  const started = all.filter((r) => r.lastActivity).length;
  const head = "px-3 py-3 text-start font-semibold first:ps-5 sm:first:ps-6";
  const cell = "md:px-3 md:py-3 md:first:ps-6";
  const tabs = [
    { href: base, current: !riskOnly && !cohort, label: t("community.all"), count: all.length },
    { href: `${base}?filter=at_risk`, current: riskOnly && !cohort, label: t("lms.atRiskFilter", { count: insights.atRisk }) },
    ...cohorts.map((c) => ({ href: `${base}?cohort=${c.id}`, current: cohort?.id === c.id, label: c.name, count: all.filter((r) => r.cohortId === c.id).length })),
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its download, the course at a glance, the students in a flush Section, then the lessons, assignments and quizzes. */}
      <PageHeader
        back={{ href: `/dashboard/courses/${course.id}`, label: course.title }}
        title={t("courses.progressTitle")}
        description={t("courses.progressIntro", { students: all.length, started, finished })}
        actions={
          all.length ? (
            <a href={`/api/dashboard/courses/${course.id}/progress`} download className={`${btn.main} h-11`}>
              <Icon name="download" size={20} />
              {t("courses.downloadCsv")}
            </a>
          ) : null
        }
      />

      {/* 112.5 The course at a glance. */}
      {all.length ? (
        <StatRow label={t("lms.insights")}>
          <Stat icon="groups" tone="accent" label={t("lms.newStudents")} value={insights.newStudents30} />
          <Stat icon="task_alt" tone="success" label={t("lms.completionRate")} value={<bdi dir="ltr">{insights.completionRate}%</bdi>} />
          <Stat icon="monitoring" label={t("lms.averageProgress")} value={<bdi dir="ltr">{insights.averageProgress}%</bdi>} />
          <Stat icon="warning" tone="warn" label={t("lms.atRiskCount")} value={insights.atRisk} href={`${base}?filter=at_risk`} />
          {course.priceCents > 0 ? <Stat icon="sell" label={t("lms.sales")} value={insights.sales} hint={`${t("lms.netSales")}: ${formatCents(insights.netCents, currency)}`} /> : null}
        </StatRow>
      ) : null}

      <Section titleId="h-progress" title={t("courses.students")} actions={<Badge tone="neutral">{rows.length}</Badge>} flush>
        {/* 112.5 Everyone, only those at risk, or one cohort. */}
        <ListBar>
          <FilterLinks label={t("courses.students")} items={tabs} />
        </ListBar>
        {rows.length ? (
          <div className="max-md:p-4">
          <table className="table-cards w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-soft bg-sand text-[13px] text-muted">
                <th scope="col" className={head}>{t("courses.student")}</th>
                <th scope="col" className={head}>{t("courses.progress")}</th>
                {quizzes.length ? <th scope="col" className={head}>{t("courses.quizResults")}</th> : null}
                {assignments.length ? <th scope="col" className={head}>{t("lms.assignmentGrades")}</th> : null}
                <th scope="col" className={head}>{t("courses.lastActivity")}</th>
                <th scope="col" className={`${head} pe-5 sm:pe-6`}>{t("courses.enrolled")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="align-top md:border-t md:border-line-soft md:first:border-t-0" data-student={r.userId}>
                  <td data-label={t("courses.student")} className={cell}>
                    <span>
                      <span className="block font-semibold">{r.name}</span>
                      <span className="block text-xs text-muted" dir="ltr">
                        {r.phone}
                      </span>
                      {/* 112.5 The student's cohort, and moving them to another. */}
                      {cohorts.length ? (
                        <form action={setStudentCohortAction} className="mt-1 flex items-center gap-1.5" data-cohort-form={r.userId}>
                          <input type="hidden" name="courseId" value={course.id} />
                          <input type="hidden" name="userId" value={r.userId} />
                          <label htmlFor={`f-cohort-${r.userId}`} className="sr-only">
                            {t("lms.cohort")}
                          </label>
                          <select id={`f-cohort-${r.userId}`} name="cohortId" defaultValue={r.cohortId ? String(r.cohortId) : ""} className="input h-8 py-0 text-xs">
                            <option value="">{t("lms.noCohort")}</option>
                            {cohorts.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <SubmitButton variant="secondary" className="h-8 px-2 text-xs">
                            {t("lms.moveToCohort")}
                          </SubmitButton>
                        </form>
                      ) : null}
                      {atRisk(r, now) ? (
                        <span className="mt-1 block">
                          <Badge tone="warn">{t("lms.atRisk", { days: AT_RISK_DAYS })}</Badge>
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td data-label={t("courses.progress")} className={cell}>
                    <span>
                      <span className="block font-semibold" data-percent={r.percent}>
                        {r.percent}%
                      </span>
                      <span className="block text-xs text-muted">
                        {r.completedAt ? t("courses.finishedOn", { date: formatDate(r.completedAt, lang) }) : t("courses.lessonsDone", { done: r.lessonsDone, total: r.lessons })}
                      </span>
                    </span>
                  </td>
                  {quizzes.length ? (
                    <td data-label={t("courses.quizResults")} className={cell}>
                      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                        {r.quizzes.map((q) => (
                          <li key={q.quizId} className="text-xs">
                            <span className="font-semibold">{q.title}</span>{" "}
                            <span className={q.passed ? "text-success" : "text-muted"}>
                              {q.best === null ? t("courses.notTaken") : q.passed ? t("courses.passedScore", { score: q.best }) : t("courses.failedScore", { score: q.best })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  ) : null}
                  {assignments.length ? (
                    <td data-label={t("lms.assignmentGrades")} className={cell}>
                      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                        {r.assignments.map((a) => (
                          <li key={a.assignmentId} className="text-xs" data-assignment={a.assignmentId}>
                            <span className="font-semibold">{a.title}</span>{" "}
                            <span className={a.passed ? "text-success" : "text-muted"}>
                              {a.status === "graded"
                                ? t("lms.scoreBadge", { score: a.score ?? 0, max: a.maxPoints })
                                : a.status === "submitted"
                                  ? t("lms.waitingGrade")
                                  : a.status === "returned"
                                    ? t("lms.sentBack")
                                    : t("lms.notHandedIn")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  ) : null}
                  <td data-label={t("courses.lastActivity")} className={cell}>
                    {r.lastActivity ? formatDate(r.lastActivity, lang) : t("courses.notStarted")}
                  </td>
                  <td data-label={t("courses.enrolled")} className={`${cell} md:pe-6`}>
                    <span>
                      <span className="block">{formatDate(r.enrolledAt, lang)}</span>
                      {r.accessEndsAt ? <span className="block text-xs text-muted">{t("courses.accessEndsOn", { date: formatDate(r.accessEndsAt, lang) })}</span> : null}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ) : (
          <p className="m-0 px-5 py-8 text-center text-[15px] text-muted sm:px-6">{riskOnly ? t("lms.noneAtRisk") : t("courses.noStudents")}</p>
        )}
      </Section>

      <div className="flex flex-wrap items-start gap-5">
        {insights.lessons.length ? (
          <Section titleId="h-lessons" title={t("lms.topLessons")} className="flex-[1_1_320px]" flush>
            <ItemList>
              {insights.lessons.map((l, i) => (
                <ItemRow key={l.lessonId} media={<Thumb icon="play_circle" shape="square" tint={i} />} title={l.title} meta={t("lms.lessonStats", { started: l.started, completed: l.completed })} />
              ))}
            </ItemList>
          </Section>
        ) : null}

        {assignments.length ? (
          <Section
            titleId="h-assignments"
            title={t("lms.assignmentsTitle")}
            className="flex-[1_1_320px]"
            actions={
              <Link href={`/dashboard/courses/${course.id}/assignments`} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
                {t("lms.openGrading")}
              </Link>
            }
            flush
          >
            <ItemList>
              {assignments.map((a, i) => (
                <ItemRow key={a.assignmentId} media={<Thumb icon="assignment" shape="square" tint={i + 2} />} title={a.title} meta={t("lms.assignmentSummary", { handedIn: a.handedIn, waiting: a.waiting, average: a.averagePercent ?? 0 })} />
              ))}
            </ItemList>
          </Section>
        ) : null}

        {quizzes.length ? (
          <Section titleId="h-quizzes" title={t("courses.quizzesTitle")} className="flex-[1_1_320px]" flush>
            <ItemList>
              {quizzes.map((q, i) => (
                <ItemRow
                  key={q.quizId}
                  data-quiz={q.quizId}
                  media={<Thumb icon="quiz" shape="square" tint={i + 1} />}
                  title={q.title}
                  meta={q.took ? t("courses.quizSummary", { took: q.took, passed: q.passed, average: q.averageBest ?? 0 }) : t("courses.quizNobody")}
                />
              ))}
            </ItemList>
          </Section>
        ) : null}
      </div>
    </div>
  );
}
