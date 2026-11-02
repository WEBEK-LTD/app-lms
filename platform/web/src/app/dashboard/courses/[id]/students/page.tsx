import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { Badge, btn, formatDate } from "@/components/ui";
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
  const riskOnly = ((await searchParams) as { filter?: string }).filter === "at_risk";
  const rows = riskOnly ? all.filter((r) => atRisk(r, now)) : all;
  const insights = await courseInsights(store, app, courseSetup(app), course, all, now);
  const currency = courseSetup(app).currency;
  const finished = all.filter((r) => r.completedAt).length;
  const started = all.filter((r) => r.lastActivity).length;
  const head = "py-2 pe-4 text-start font-semibold";
  const cell = "md:py-2.5 md:pe-4";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href={`/dashboard/courses/${course.id}`} className="flex items-center gap-1 text-sm no-underline">
          <Icon name="arrow_back" size={18} />
          {course.title}
        </Link>
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("courses.progressTitle")}</h1>
        <p className="m-0 text-[15px] text-muted">{t("courses.progressIntro", { students: all.length, started, finished })}</p>
      </div>

      {/* 112.5 The course at a glance. */}
      {all.length ? (
        <section aria-labelledby="h-insights" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-insights" className="m-0 text-lg font-bold">
            {t("lms.insights")}
          </h2>
          <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: t("lms.newStudents"), value: String(insights.newStudents30) },
              { label: t("lms.completionRate"), value: `${insights.completionRate}%` },
              { label: t("lms.averageProgress"), value: `${insights.averageProgress}%` },
              { label: t("lms.atRiskCount"), value: String(insights.atRisk) },
              ...(course.priceCents > 0 ? [{ label: t("lms.sales"), value: String(insights.sales) }, { label: t("lms.netSales"), value: formatCents(insights.netCents, currency) }] : []),
            ].map((tile) => (
              <div key={tile.label} className="flex flex-col gap-1 rounded-xl border border-line-soft p-3">
                <dt className="text-[13px] text-muted">{tile.label}</dt>
                <dd className="m-0 text-[22px] font-extrabold" dir="ltr">
                  {tile.value}
                </dd>
              </div>
            ))}
          </dl>
          {insights.lessons.length ? (
            <div className="flex flex-col gap-2">
              <h3 className="m-0 text-[15px] font-bold">{t("lms.topLessons")}</h3>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[15px]">
                {insights.lessons.map((l) => (
                  <li key={l.lessonId} className="flex flex-wrap justify-between gap-x-4">
                    <span className="font-semibold">{l.title}</span>
                    <span className="text-muted">{t("lms.lessonStats", { started: l.started, completed: l.completed })}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="h-progress" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="h-progress" className="m-0 text-lg font-bold">
            {t("courses.students")} <span className="font-normal text-muted">{rows.length}</span>
          </h2>
          {/* 112.5 Everyone, or only those at risk. */}
          <nav aria-label={t("courses.students")} className="flex flex-wrap gap-2">
            {[
              { href: `/dashboard/courses/${course.id}/students`, on: !riskOnly, text: t("community.all") },
              { href: `/dashboard/courses/${course.id}/students?filter=at_risk`, on: riskOnly, text: t("lms.atRiskFilter", { count: insights.atRisk }) },
            ].map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={tab.on ? "page" : undefined}
                className={`rounded-[10px] px-3 py-1.5 text-sm no-underline ${tab.on ? "bg-midnight font-bold text-white hover:text-white" : "border border-line bg-white text-midnight hover:text-midnight"}`}
              >
                {tab.text}
              </Link>
            ))}
          </nav>
          {all.length ? (
            <a href={`/api/dashboard/courses/${course.id}/progress`} download className={`${btn.secondary} h-10 gap-1.5 px-4 text-sm`}>
              <Icon name="download" size={18} />
              {t("courses.downloadCsv")}
            </a>
          ) : null}
        </div>
        {rows.length ? (
          <table className="table-cards w-full border-collapse text-sm">
            <thead>
              <tr className="text-muted">
                <th scope="col" className={head}>{t("courses.student")}</th>
                <th scope="col" className={head}>{t("courses.progress")}</th>
                {quizzes.length ? <th scope="col" className={head}>{t("courses.quizResults")}</th> : null}
                {assignments.length ? <th scope="col" className={head}>{t("lms.assignmentGrades")}</th> : null}
                <th scope="col" className={head}>{t("courses.lastActivity")}</th>
                <th scope="col" className="py-2 text-start font-semibold">{t("courses.enrolled")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="align-top md:border-t md:border-line-soft" data-student={r.userId}>
                  <td data-label={t("courses.student")} className={cell}>
                    <span>
                      <span className="block font-semibold">{r.name}</span>
                      <span className="block text-xs text-muted" dir="ltr">
                        {r.phone}
                      </span>
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
                  <td data-label={t("courses.enrolled")} className="md:py-2.5">
                    <span>
                      <span className="block">{formatDate(r.enrolledAt, lang)}</span>
                      {r.accessEndsAt ? <span className="block text-xs text-muted">{t("courses.accessEndsOn", { date: formatDate(r.accessEndsAt, lang) })}</span> : null}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="m-0 text-[15px] text-muted">{riskOnly ? t("lms.noneAtRisk") : t("courses.noStudents")}</p>
        )}
      </section>

      {assignments.length ? (
        <section aria-labelledby="h-assignments" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="h-assignments" className="m-0 text-lg font-bold">
              {t("lms.assignmentsTitle")}
            </h2>
            <Link href={`/dashboard/courses/${course.id}/assignments`} className="text-sm font-semibold no-underline">
              {t("lms.openGrading")}
            </Link>
          </div>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
            {assignments.map((a) => (
              <li key={a.assignmentId} className="flex flex-wrap justify-between gap-x-4 gap-y-1 rounded-lg border border-line-soft px-3 py-2.5">
                <span className="font-semibold">{a.title}</span>
                <span className="text-muted">{t("lms.assignmentSummary", { handedIn: a.handedIn, waiting: a.waiting, average: a.averagePercent ?? 0 })}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {quizzes.length ? (
        <section aria-labelledby="h-quizzes" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-quizzes" className="m-0 text-lg font-bold">
            {t("courses.quizzesTitle")}
          </h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
            {quizzes.map((q) => (
              <li key={q.quizId} className="flex flex-wrap justify-between gap-x-4 gap-y-1 rounded-lg border border-line-soft px-3 py-2.5" data-quiz={q.quizId}>
                <span className="font-semibold">{q.title}</span>
                <span className="text-muted">
                  {q.took ? t("courses.quizSummary", { took: q.took, passed: q.passed, average: q.averageBest ?? 0 }) : t("courses.quizNobody")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
