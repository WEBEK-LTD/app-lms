import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { isCheckinRole, monthReport, type MonthRow } from "@/lib/school/checkin";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { Choice } from "../../forms";
import { isSchool, NotSchool, PageHead, Panel } from "../../parts";
import { CheckinLinks, CorrectForm, DayRecord, STATE_KEYS, STATE_TONES } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("school.monthReport") };
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * 113.2 The month's report per person: school days, present, late, left
 * early, absent, excused and on leave, as a table and a CSV file; one
 * person's days with their corrections.
 */
export default async function SchoolCheckinReportPage({ searchParams }: { searchParams: Promise<{ month?: string; role?: string; person?: string }> }) {
  const { app } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("school.monthReport")} t={t} />;
  const params = await searchParams;
  const store = await getStore();
  const now = new Date();
  const [saved, classes] = await Promise.all([store.getSchoolSettings(app.id), store.listSchoolClasses(app.id)]);
  const settings = schoolSettingsOf(saved, app);
  const thisMonth = schoolToday(settings, now).slice(0, 7);
  const month = params.month && MONTH.test(params.month) && params.month <= thisMonth ? params.month : thisMonth;
  const role = isCheckinRole(params.role ?? "") ? (params.role as MonthRow["role"]) : null;
  const personId = Number(params.person) || null;
  const [report, personal] = await Promise.all([monthReport(store, app, month, now, role ? { roles: [role] } : undefined), personId !== null ? monthReport(store, app, month, now, { personId }) : null]);
  const className = new Map(classes.map((c) => [c.id, c.name]));
  const detail = (r: MonthRow) => (r.role === "student" ? (r.person.classId ? (className.get(r.person.classId) ?? "") : "") : [r.person.jobTitle, r.person.department].filter(Boolean).join(" · "));
  const query = `month=${month}${role ? `&role=${role}` : ""}`;
  const head = "py-2 pe-4 text-start font-semibold";
  const cell = "py-2 pe-4";
  const one = personal?.rows[0] ?? null;
  const oneDays = one ? (personal?.days.get(one.person.id) ?? []) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("school.monthReport")} intro={t("school.reportIntro")} />
      <CheckinLinks t={t} />
      <form method="get" className="flex max-w-[860px] flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-month" className="text-sm font-semibold">
            {t("school.month")}
          </label>
          <input id="f-month" name="month" type="month" dir="ltr" defaultValue={month} max={thisMonth} className="input input-sm" />
        </div>
        <Choice
          id="f-role"
          name="role"
          label={t("school.people")}
          options={[
            { value: "", label: t("school.allPeople") },
            { value: "student", label: t("school.students") },
            { value: "teacher", label: t("school.teachers") },
            { value: "staff", label: t("school.staff") },
          ]}
          defaultValue={role ?? ""}
        />
        <button type="submit" className={`${btn.secondary} h-10`}>
          {t("school.show")}
        </button>
        <a href={`/api/dashboard/school/checkins?${query}`} className={`${btn.secondary} h-10 px-4 text-sm`}>
          <Icon name="download" size={18} />
          {t("school.downloadCsv")}
        </a>
      </form>

      {one ? (
        <Panel id="h-person" title={t("school.daysOf", { name: one.person.name, month })} intro={detail(one)}>
          {oneDays.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("school.noDays")}</p> : null}
          <ul className="m-0 flex list-none flex-col p-0">
            {oneDays.map((d) => (
              <li key={d.date} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex min-w-[160px] flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-bold" dir="ltr">
                      {d.date}
                    </span>
                    <DayRecord row={d.row} timezone={settings.timezone} t={t} />
                  </span>
                  <Badge tone={STATE_TONES[d.state]}>{t(STATE_KEYS[d.state])}</Badge>
                  {d.row?.late && (d.state === "in" || d.state === "left") ? <Badge tone="warn">{t("school.late")}</Badge> : null}
                  {d.row?.leftEarly && d.state === "left" ? <Badge tone="warn">{t("school.leftEarly")}</Badge> : null}
                </div>
                <CorrectForm entry={{ person: one.person, row: d.row, state: d.state }} date={d.date} timezone={settings.timezone} t={t} />
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel id="h-month" title={t("school.monthReport")} intro={month}>
        {report.rows.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("school.noDays")}</p> : null}
        {report.rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="border-b border-line">
                  <th className={head}>{t("school.colName")}</th>
                  <th className={head}>{t("school.colDays")}</th>
                  <th className={head}>{t("school.colPresent")}</th>
                  <th className={head}>{t("school.colLate")}</th>
                  <th className={head}>{t("school.colLeftEarly")}</th>
                  <th className={head}>{t("school.colAbsent")}</th>
                  <th className={head}>{t("school.colExcused")}</th>
                  <th className={head}>{t("school.colLeave")}</th>
                  <th className={head}>
                    <span className="sr-only">{t("school.seeDays")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.person.id} className="border-b border-line-soft">
                    <td className={cell}>
                      <span className="flex flex-col">
                        <span className="font-semibold">{r.person.name}</span>
                        <span className="text-[12px] text-muted">{detail(r)}</span>
                      </span>
                    </td>
                    <td className={cell}>{r.days}</td>
                    <td className={cell}>{r.present}</td>
                    <td className={cell}>{r.late}</td>
                    <td className={cell}>{r.leftEarly}</td>
                    <td className={cell}>{r.absent}</td>
                    <td className={cell}>{r.excused}</td>
                    <td className={cell}>{r.leave}</td>
                    <td className={cell}>
                      <Link href={`/dashboard/school/checkin/report?${query}&person=${r.person.id}`}>{t("school.seeDays")}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
