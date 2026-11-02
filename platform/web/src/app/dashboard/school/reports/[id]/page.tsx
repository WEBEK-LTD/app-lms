import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { trimScore } from "@/lib/school/flow";
import { classGradebook, reportPeriod } from "@/lib/school/report-cards";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { isSchool } from "../../parts";
import { PrintButton } from "../print-button";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("lms.reportCard") };
}

/** 112.5 One student's report card over the term, ready to print or keep as a PDF: each subject's scores and percent, overall, attendance. */
export default async function ReportCardPage({ params, searchParams }: PageProps<"/dashboard/school/reports/[id]">) {
  const { app } = await requireClient("settings");
  if (!isSchool(app)) notFound();
  const id = Number((await params).id);
  const query = (await searchParams) as { from?: string; to?: string };
  const store = await getStore();
  const [student] = Number.isSafeInteger(id) ? await store.listSchoolPeople(app.id, { role: "student", ids: [id] }) : [];
  if (!student || student.classId === null) notFound();
  const [classes, saved] = await Promise.all([store.listSchoolClasses(app.id), store.getSchoolSettings(app.id)]);
  const settings = schoolSettingsOf(saved, app);
  const period = reportPeriod(settings, query, schoolToday(settings, new Date()));
  const book = await classGradebook(store, app, student.classId, period, student.id);
  const row = book.rows[0];
  if (!row) notFound();
  const { t } = await dashboardText();
  const klass = classes.find((c) => c.id === student.classId);
  const logo = app.logoAssetId ?? app.iconAssetId;
  const pct = (value: number | null) => (value === null ? "—" : `${value}%`);

  return (
    <div className="flex max-w-[860px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/dashboard/school/reports?class=${student.classId}&from=${period.from}&to=${period.to}`} className="flex items-center gap-1 text-sm no-underline">
          <Icon name="arrow_back" size={18} />
          {t("lms.reportCards")}
        </Link>
        <PrintButton label={t("lms.print")} />
      </div>
      <article className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-6 sm:p-8" data-report-card={student.id}>
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- The school's own logo.
              <img src={assetUrl(logo)} alt="" className="h-12 w-auto max-w-[160px] object-contain" />
            ) : null}
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-ink-4">{app.appName ?? app.storeTitle}</span>
              <h1 className="m-0 text-[24px] leading-tight font-extrabold">{t("lms.reportCard")}</h1>
            </div>
          </div>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
            <dt className="text-muted">{t("courses.student")}</dt>
            <dd className="m-0 font-semibold" data-report-student="">
              {student.name}
            </dd>
            <dt className="text-muted">{t("school.class")}</dt>
            <dd className="m-0">{klass?.name ?? ""}</dd>
            <dt className="text-muted">{t("lms.periodLabel")}</dt>
            <dd className="m-0" dir="ltr">
              {period.term ? `${period.term} · ` : ""}
              {period.from} – {period.to}
            </dd>
          </dl>
        </header>
        {row.subjects.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("lms.noScores")}</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-muted">
                <th scope="col" className="py-2 pe-4 text-start font-semibold">{t("lms.subject")}</th>
                <th scope="col" className="py-2 pe-4 text-start font-semibold">{t("lms.scores")}</th>
                <th scope="col" className="py-2 text-end font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              {row.subjects.map((s) => (
                <tr key={s.subjectId} className="border-t border-line-soft align-top" data-subject={s.subjectId}>
                  <td className="py-2.5 pe-4 font-semibold">{s.name}</td>
                  <td className="py-2.5 pe-4 text-ink-4">
                    {s.scores.length ? s.scores.map((x) => `${x.assessment.title} ${trimScore(x.score)}/${trimScore(x.assessment.maxScore)}`).join(" · ") : "—"}
                  </td>
                  <td className="py-2.5 text-end font-bold">{pct(s.percent)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-line">
                <td className="py-2.5 pe-4 font-extrabold" colSpan={2}>
                  {t("lms.overall")}
                </td>
                <td className="py-2.5 text-end font-extrabold" data-report-overall="">
                  {pct(row.overall)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
        <p className="m-0 text-sm text-ink-4">
          {t("lms.attendanceLine", { present: row.attendance.present, absent: row.attendance.absent, late: row.attendance.late, excused: row.attendance.excused })}
        </p>
      </article>
    </div>
  );
}
