import type { Metadata } from "next";
import Link from "next/link";
import { Badge, btn } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { addDays, isDate } from "@/lib/bookings/time";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { SchoolAttendanceStatus } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { checkinBoard, checkinSettingsOf, type BoardRow, type CheckinState } from "@/lib/school/checkin";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { Choice } from "../forms";
import { FirstNote, isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";
import { CheckinLinks, CorrectForm, DayRecord, STATE_KEYS, STATE_TONES } from "./parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("school.checkin") };
}

const ROLES = ["all", "student", "teacher", "staff"] as const;
const PER_PAGE = 100;
const REGISTER_KEYS: Record<SchoolAttendanceStatus, DashKey> = { present: "school.present", absent: "school.absent", late: "school.late", excused: "school.excused" };

/**
 * 113.2 The board of the day: everyone who checks in (students, teachers and
 * staff), who is in, late, not in yet, left or absent, by role and class;
 * a student's class register next to it; the office corrects a day with a
 * reason.
 */
export default async function SchoolCheckinPage({ searchParams }: { searchParams: Promise<{ date?: string; role?: string; class?: string; page?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("school.checkin")} t={t} />;
  const params = await searchParams;
  const store = await getStore();
  const now = new Date();
  const [saved, classes, plan] = await Promise.all([store.getSchoolSettings(app.id), store.listSchoolClasses(app.id), appPlan(store, license, now)]);
  const settings = schoolSettingsOf(saved, app);
  const c = checkinSettingsOf(settings);
  const today = schoolToday(settings, now);
  const date = params.date && isDate(params.date) && params.date <= today && params.date >= addDays(today, -366) ? params.date : today;
  const role = (ROLES as readonly string[]).includes(params.role ?? "") ? (params.role as (typeof ROLES)[number]) : "all";
  const classId = classes.find((k) => k.id === Number(params.class))?.id ?? null;
  const board = await checkinBoard(store, app, date, now);
  const shown = board.filter((b) => (role === "all" || b.role === role) && (classId === null || b.person.classId === classId));
  const className = new Map(classes.map((k) => [k.id, k.name]));
  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(params.page) || 1));
  const list = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const counts = (Object.keys(STATE_KEYS) as CheckinState[]).map((s) => ({ state: s, count: shown.filter((b) => b.state === s).length })).filter((x) => x.count > 0);
  const late = shown.filter((b) => b.row?.late && (b.state === "in" || b.state === "left")).length;
  const early = shown.filter((b) => b.row?.leftEarly && b.state === "left").length;
  const link = (p: number) => `/dashboard/school/checkin?date=${date}&role=${role}${classId ? `&class=${classId}` : ""}${p > 1 ? `&page=${p}` : ""}`;
  const detail = (b: BoardRow) =>
    b.role === "student" ? (b.person.classId ? (className.get(b.person.classId) ?? null) : null) : ([b.person.jobTitle, b.person.department].filter(Boolean).join(" · ") || t(b.role === "teacher" ? "school.teacher" : "school.staff"));

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("school.checkin")} intro={t("school.checkinIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {c.on ? null : <FirstNote text={t("school.checkinOff")} href="/dashboard/school/checkin/settings" />}
      <CheckinLinks t={t} />
      <form method="get" className="flex max-w-[860px] flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-date" className="text-sm font-semibold">
            {t("school.date")}
          </label>
          <input id="f-date" name="date" type="date" dir="ltr" defaultValue={date} max={today} className="input input-sm" />
        </div>
        <Choice
          id="f-role"
          name="role"
          label={t("school.people")}
          options={[
            { value: "all", label: t("school.allPeople") },
            { value: "student", label: t("school.students") },
            { value: "teacher", label: t("school.teachers") },
            { value: "staff", label: t("school.staff") },
          ]}
          defaultValue={role}
        />
        {classes.length ? <Choice id="f-class" name="class" label={t("school.class")} options={classes.map((k) => ({ value: String(k.id), label: k.name }))} defaultValue={classId ? String(classId) : ""} empty={t("school.allClasses")} /> : null}
        <button type="submit" className={`${btn.secondary} h-10`}>
          {t("school.show")}
        </button>
      </form>
      <Panel
        id="h-board"
        title={t("school.boardOf", { date })}
        intro={[...counts.map((x) => `${t(STATE_KEYS[x.state])}: ${x.count}`), late ? `${t("school.late")}: ${late}` : null, early ? `${t("school.leftEarly")}: ${early}` : null].filter(Boolean).join(" · ")}
      >
        {board.length === 0 ? <FirstNote text={t("school.noOneChecksIn")} href="/dashboard/school/people" /> : null}
        {board.length > 0 && list.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("school.noMatch")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {list.map((b) => (
            <li key={b.person.id} data-person={b.person.id} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex min-w-[180px] flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-bold">{b.person.name}</span>
                  <span className="text-[13px] text-muted">{detail(b)}</span>
                  <DayRecord row={b.row} timezone={settings.timezone} t={t} />
                  {b.register ? <span className="text-[13px] text-muted">{t("school.register", { status: t(REGISTER_KEYS[b.register]) })}</span> : null}
                </span>
                <Badge tone={STATE_TONES[b.state]}>{t(STATE_KEYS[b.state])}</Badge>
                {b.row?.late && (b.state === "in" || b.state === "left") ? <Badge tone="warn">{t("school.late")}</Badge> : null}
                {b.row?.leftEarly && b.state === "left" ? <Badge tone="warn">{t("school.leftEarly")}</Badge> : null}
              </div>
              {b.state !== "off" || b.row ? <CorrectForm entry={b} date={date} timezone={settings.timezone} t={t} /> : null}
            </li>
          ))}
        </ul>
        {pages > 1 ? (
          <nav aria-label={t("school.pages")} className="flex items-center justify-between gap-3 text-[15px]">
            {page > 1 ? <Link href={link(page - 1)}>{t("school.previous")}</Link> : <span />}
            <span className="text-muted">{t("school.pageOf", { page, pages })}</span>
            {page < pages ? <Link href={link(page + 1)}>{t("school.next")}</Link> : <span />}
          </nav>
        ) : null}
      </Panel>
    </div>
  );
}
