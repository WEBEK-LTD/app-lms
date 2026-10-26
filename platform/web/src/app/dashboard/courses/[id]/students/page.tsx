import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { btn, formatDate } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { courseReport, quizSummaries } from "@/lib/courses/report";
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

/** 90.2 Progress for the teacher: each student of a course, how far they got and their quiz results, with the CSV file. */
export default async function CourseStudentsPage({ params }: PageProps<"/dashboard/courses/[id]/students">) {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "courses") notFound();
  const id = Number((await params).id);
  const course = courseSetup(app).courses.find((c) => c.id === id);
  if (!course) notFound();
  const rows = await courseReport(await getStore(), app, course);
  const quizzes = quizSummaries(course, rows);
  const { t, lang } = await dashboardText();
  const finished = rows.filter((r) => r.completedAt).length;
  const started = rows.filter((r) => r.lastActivity).length;
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
        <p className="m-0 text-[15px] text-muted">{t("courses.progressIntro", { students: rows.length, started, finished })}</p>
      </div>

      <section aria-labelledby="h-progress" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="h-progress" className="m-0 text-lg font-bold">
            {t("courses.students")} <span className="font-normal text-muted">{rows.length}</span>
          </h2>
          {rows.length ? (
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
          <p className="m-0 text-[15px] text-muted">{t("courses.noStudents")}</p>
        )}
      </section>

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
