import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import { ListBar } from "@/components/page-kit-c";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { classGradebook, reportPeriod } from "@/lib/school/report-cards";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { ClassTabs, FirstNote, isSchool, NotSchool, PageHead, Panel } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("lms.reportCards") };
}

/** 112.5 A class's gradebook over the term: each student's percent per subject, overall and attendance, the CSV file and each report card. */
export default async function SchoolReportsPage({ searchParams }: { searchParams: Promise<{ class?: string; from?: string; to?: string }> }) {
  const { app } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("lms.reportCards")} t={t} />;
  const query = await searchParams;
  const store = await getStore();
  const [classes, saved] = await Promise.all([store.listSchoolClasses(app.id), store.getSchoolSettings(app.id)]);
  const settings = schoolSettingsOf(saved, app);
  const period = reportPeriod(settings, query, schoolToday(settings, new Date()));
  const klass = classes.find((c) => c.id === Number(query.class)) ?? classes[0] ?? null;
  const book = klass ? await classGradebook(store, app, klass.id, period) : null;
  const range = `&from=${period.from}&to=${period.to}`;
  const head = "py-2 pe-4 text-start font-semibold";
  const cell = "md:py-2.5 md:pe-4";
  const pct = (value: number | null) => (value === null ? "—" : `${value}%`);

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("lms.reportCards")} intro={t("lms.reportCardsIntro")} />
      {classes.length === 0 ? <FirstNote text={t("school.classesFirst")} href="/dashboard/school/classes" /> : null}
      {klass && book ? (
        <>
          {/* The page kit: the class chips and the period in the list's bar, the CSV file in the header of the gradebook. */}
          <Panel
            id="h-gradebook"
            title={klass.name}
            intro={period.term ? t("lms.periodTerm", { term: period.term, from: period.from, to: period.to }) : t("lms.period", { from: period.from, to: period.to })}
            flush
            actions={
              book.rows.length ? (
                <a href={`/api/dashboard/school/reports?class=${klass.id}${range}`} download className={`${btn.secondary} h-10 gap-1.5 px-4 text-sm`}>
                  <Icon name="download" size={18} />
                  {t("courses.downloadCsv")}
                </a>
              ) : null
            }
          >
            <ListBar>
              <ClassTabs classes={classes} current={klass.id} base="/dashboard/school/reports" label={t("school.classes")} extra={range} />
              <form method="get" className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="class" value={klass.id} />
                <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                  {t("lms.periodFrom")}
                  <input type="date" name="from" defaultValue={period.from} className="input input-sm" />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                  {t("lms.periodTo")}
                  <input type="date" name="to" defaultValue={period.to} className="input input-sm" />
                </label>
                <button type="submit" className={`${btn.secondary} h-10 px-3.5 text-sm`}>
                  {t("lms.showPeriod")}
                </button>
              </form>
            </ListBar>
            <div className="flex flex-col gap-4 px-5 pt-4 pb-5 sm:px-6">
            {book.rows.length === 0 ? (
              <FirstNote text={t("school.studentsFirst")} href="/dashboard/school/people" />
            ) : (
              <>
                <table className="table-cards w-full border-collapse text-sm" data-gradebook="">
                  <thead>
                    <tr className="text-muted">
                      <th scope="col" className={head}>{t("courses.student")}</th>
                      {book.subjects.map((s) => (
                        <th key={s.id} scope="col" className={head}>
                          {s.name}
                        </th>
                      ))}
                      <th scope="col" className={head}>{t("lms.overall")}</th>
                      <th scope="col" className={head}>{t("lms.attendanceShort")}</th>
                      <th scope="col" className="py-2 text-start font-semibold">
                        <span className="sr-only">{t("lms.reportCard")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {book.rows.map((r) => (
                      <tr key={r.student.id} className="align-top md:border-t md:border-line-soft" data-student={r.student.id}>
                        <td data-label={t("courses.student")} className={`${cell} font-semibold`}>
                          {r.student.name}
                        </td>
                        {r.subjects.map((s) => (
                          <td key={s.subjectId} data-label={s.name} className={cell}>
                            {pct(s.percent)}
                          </td>
                        ))}
                        <td data-label={t("lms.overall")} className={`${cell} font-bold`}>
                          {pct(r.overall)}
                        </td>
                        <td data-label={t("lms.attendanceShort")} className={cell}>
                          {t("lms.attendanceCounts", { present: r.attendance.present, absent: r.attendance.absent, late: r.attendance.late })}
                        </td>
                        <td className="md:py-2.5">
                          <Link href={`/dashboard/school/reports/${r.student.id}?from=${period.from}&to=${period.to}`} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
                            <Icon name="description" size={18} />
                            {t("lms.reportCard")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            </div>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
