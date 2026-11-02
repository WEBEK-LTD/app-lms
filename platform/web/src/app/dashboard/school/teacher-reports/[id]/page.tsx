import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { reviewTeacherReportAction, shareTeacherReportAction } from "@/app/actions/school-reports";
import { Icon } from "@/components/icon";
import { Badge, btn, formatDateTime } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { schoolDirectory } from "@/lib/school/service";
import { markReportRead, REPORT_LIMITS, reportAbout } from "@/lib/school/teacher-reports";
import { SchoolForm } from "../../forms";
import { isSchool, Panel } from "../../parts";
import { AnswerText, StatusBadge } from "../../report-parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("reports.report") };
}

/**
 * 113.5 A teacher's report as the administration reads it: the answers, the
 * comments both ways, and what to do with it (comment, send back for
 * changes, approve, share an approved student report with the parents);
 * the student's other reports. Opening it marks it read for the teacher.
 */
export default async function TeacherReportPage({ params }: PageProps<"/dashboard/school/teacher-reports/[id]">) {
  const { app } = await requireClient("settings");
  if (!isSchool(app)) notFound();
  const id = Number((await params).id);
  const store = await getStore();
  const report = Number.isSafeInteger(id) ? await store.getSchoolReport(app.id, id) : null;
  if (!report || report.status === "draft") notFound();
  await markReportRead(store, app, report, new Date());
  const { t, lang } = await dashboardText();
  const dir = await schoolDirectory(store, app.id);
  const student = report.studentId !== null ? dir.people.get(report.studentId) : undefined;
  const history = student ? (await store.listSchoolReports(app.id, { studentId: student.id, statuses: ["sent", "returned", "approved"] })).filter((r) => r.id !== report.id) : [];

  return (
    <div className="flex max-w-[860px] flex-col gap-6">
      <Link href="/dashboard/school/teacher-reports" className="flex items-center gap-1 text-sm no-underline">
        <Icon name="arrow_back" size={18} />
        {t("reports.inbox")}
      </Link>
      <article className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-5 sm:p-6" data-teacher-report={report.id}>
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="m-0 text-[24px] leading-tight font-extrabold">{report.templateName}</h1>
            <p className="m-0 text-[15px] text-ink-4">{reportAbout(report, dir)}</p>
            <p className="m-0 text-[14px] text-muted">
              {[
                t("reports.byTeacher", { name: report.teacherName }),
                report.subjectId !== null ? dir.subjects.get(report.subjectId)?.name : null,
                report.periodFrom && report.periodTo ? t("lms.period", { from: report.periodFrom, to: report.periodTo }) : null,
                report.sentAt ? t("reports.sentOn", { date: report.sentAt.toISOString().slice(0, 10) }) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {report.sharedAt ? <Badge tone="neutral">{t("reports.sharedBadge")}</Badge> : null}
            <StatusBadge status={report.status} t={t} />
          </div>
        </header>
        <dl className="m-0 flex flex-col gap-4">
          {report.fields.map((field) => (
            <div key={field.id} className="flex flex-col gap-1" data-field={field.label}>
              <dt className="text-sm font-bold text-ink-3">{field.label}</dt>
              <dd className="m-0 text-[15px] leading-relaxed">
                <AnswerText field={field} value={report.answers[field.id]} t={t} />
              </dd>
            </div>
          ))}
        </dl>
      </article>

      <Panel id="h-comments" title={t("reports.comments")}>
        {report.comments.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("reports.noComments")}</p> : null}
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {report.comments.map((c, i) => (
            <li key={i} className={`flex flex-col gap-1 rounded-xl px-4 py-3 ${c.by === "school" ? "bg-sand" : "bg-peach-soft"}`}>
              <span className="text-[13px] font-semibold text-ink-4">
                {c.by === "school" ? t("reports.fromSchool") : t("reports.fromTeacher", { name: c.name })} · {formatDateTime(new Date(c.at), lang)}
              </span>
              <span className="text-[15px] whitespace-pre-line">{c.text}</span>
            </li>
          ))}
        </ol>
        <SchoolForm action={reviewTeacherReportAction} submit={t("reports.send")} reset>
          <input type="hidden" name="id" value={report.id} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-review-text" className="text-sm font-semibold">
              {t("reports.yourComment")}
            </label>
            <textarea id="f-review-text" name="text" rows={3} maxLength={REPORT_LIMITS.comment} className="input min-h-20 py-3" />
          </div>
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1 text-sm font-semibold">{t("reports.whatToDo")}</legend>
            <label className="flex items-center gap-2 text-[15px]">
              <input type="radio" name="action" value="comment" defaultChecked={report.status !== "sent"} className="h-4 w-4 accent-midnight" />
              {t("reports.doComment")}
            </label>
            {report.status === "sent" || report.status === "approved" ? (
              <label className="flex items-center gap-2 text-[15px]">
                <input type="radio" name="action" value="return" className="h-4 w-4 accent-midnight" />
                {t("reports.doReturn")}
              </label>
            ) : null}
            {report.status === "sent" ? (
              <label className="flex items-center gap-2 text-[15px]">
                <input type="radio" name="action" value="approve" defaultChecked className="h-4 w-4 accent-midnight" />
                {t("reports.doApprove")}
              </label>
            ) : null}
          </fieldset>
        </SchoolForm>
      </Panel>

      {report.kind === "student" ? (
        <Panel id="h-share" title={t("reports.shareTitle")} intro={report.status === "approved" ? (report.sharedAt ? t("reports.sharedIntro") : t("reports.shareIntro")) : t("reports.shareAfterApproval")}>
          {report.status === "approved" ? (
            <form action={shareTeacherReportAction}>
              <input type="hidden" name="id" value={report.id} />
              <input type="hidden" name="share" value={report.sharedAt ? "0" : "1"} />
              <button type="submit" className={`${report.sharedAt ? btn.secondary : btn.primary} h-10 px-4 text-[15px]`}>
                {report.sharedAt ? t("reports.unshare") : t("reports.share")}
              </button>
            </form>
          ) : null}
        </Panel>
      ) : null}

      {student ? (
        <Panel id="h-history" title={t("reports.historyOf", { name: student.name })}>
          {history.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("reports.noOtherReports")}</p> : null}
          <ul className="m-0 flex list-none flex-col p-0">
            {history.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-2.5 first:border-t-0 first:pt-0">
                <span className="flex min-w-0 flex-1 flex-col">
                  <Link href={`/dashboard/school/teacher-reports/${r.id}`} className="text-[15px] font-semibold">
                    {r.templateName}
                  </Link>
                  <span className="text-[13px] text-muted">{[r.teacherName, r.sentAt ? t("reports.sentOn", { date: r.sentAt.toISOString().slice(0, 10) }) : null].filter(Boolean).join(" · ")}</span>
                </span>
                <StatusBadge status={r.status} t={t} />
              </li>
            ))}
          </ul>
          <Link href={`/dashboard/school/teacher-reports?student=${student.id}`} className="text-sm">
            {t("reports.seeHistory")}
          </Link>
        </Panel>
      ) : null}
    </div>
  );
}
