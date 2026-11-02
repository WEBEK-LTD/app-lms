import type { Metadata } from "next";
import Link from "next/link";
import { answerLeaveAction } from "@/app/actions/school";
import { Badge } from "@/components/ui";
import type { DashKey, DashT } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { timeOf, utcToLocal } from "@/lib/bookings/time";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { SchoolLeave, SchoolLeaveKind, SchoolLeaveStatus, SchoolPerson } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { mediaLink } from "@/lib/media/files";
import { checkinBoard } from "@/lib/school/checkin";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { daysBetween, STAFF_LIMITS } from "@/lib/school/staff";
import { appUrl } from "@/lib/env";
import { STATE_KEYS, STATE_TONES } from "../checkin/parts";
import { SchoolForm } from "../forms";
import { FirstNote, isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice, WEEKDAY_KEYS } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("school.staff") };
}

const KIND_KEYS: Record<SchoolLeaveKind, DashKey> = { sick: "school.leaveSick", annual: "school.leaveAnnual", other: "school.leaveOther" };
const STATUS_KEYS: Record<SchoolLeaveStatus, DashKey> = { pending: "school.leavePending", approved: "school.leaveApproved", refused: "school.leaveRefused", cancelled: "school.leaveCancelled" };
const STATUS_TONES: Record<SchoolLeaveStatus, "success" | "warn" | "danger" | "neutral"> = { pending: "warn", approved: "success", refused: "danger", cancelled: "neutral" };

/** "Sunday, Monday · 07:30–15:00", or null without their own hours. */
function hoursLine(person: SchoolPerson, t: DashT): string | null {
  const hours = person.workHours;
  if (!hours) return null;
  const days = [...hours.days].sort((a, b) => a - b).map((d) => t(WEEKDAY_KEYS[d - 1]!));
  return t("school.workHoursLine", { days: days.join(", "), start: timeOf(hours.startMinute), end: timeOf(hours.endMinute) });
}

function LeaveItem({ leave, person, t, timezone }: { leave: SchoolLeave; person: SchoolPerson | undefined; t: DashT; timezone: string }) {
  const answered = leave.answeredAt ? utcToLocal(leave.answeredAt, timezone).date : null;
  return (
    <li data-leave={leave.id} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex min-w-[180px] flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-bold">{person?.name ?? "—"}</span>
          <span className="text-[13px] text-muted">
            {[t(KIND_KEYS[leave.kind]), t("school.leaveLine", { from: leave.startsOn, to: leave.endsOn, days: daysBetween(leave.startsOn, leave.endsOn) })].join(" · ")}
          </span>
          {leave.note ? <span className="text-[14px] whitespace-pre-line text-ink-4">{leave.note}</span> : null}
          {leave.file ? (
            <a href={mediaLink(appUrl(), leave.file.fileId)} target="_blank" rel="noreferrer" className="text-[14px]">
              {t("school.leaveDocument")}: {leave.file.name}
            </a>
          ) : null}
          {answered ? (
            <span className="text-[13px] text-muted">
              {[t("school.answeredBy", { by: leave.answeredBy ?? "—", date: answered }), leave.answer].filter(Boolean).join(" · ")}
            </span>
          ) : null}
        </span>
        <Badge tone={STATUS_TONES[leave.status]}>{t(STATUS_KEYS[leave.status])}</Badge>
      </div>
      {leave.status === "pending" ? (
        <SchoolForm action={answerLeaveAction} submit={t("school.save")} className="rounded-xl border border-line p-3">
          <input type="hidden" name="id" value={leave.id} />
          <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0">
            <legend className="sr-only">{person?.name ?? ""}</legend>
            {(["approved", "refused"] as const).map((a) => (
              <label key={a} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-midnight has-[:checked]:bg-sand has-[:checked]:font-bold">
                <input type="radio" name="answer" value={a} defaultChecked={a === "approved"} className="h-4 w-4 accent-midnight" />
                {t(a === "approved" ? "school.approve" : "school.refuse")}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`f-note-${leave.id}`} className="text-sm font-semibold">
              {t("school.answerNote")}
            </label>
            <textarea id={`f-note-${leave.id}`} name="note" rows={2} maxLength={STAFF_LIMITS.answer} className="input min-h-16 py-3" />
          </div>
        </SchoolForm>
      ) : null}
    </li>
  );
}

/**
 * 113.3 Everyone who works at the school, teachers and staff: their jobs,
 * departments and hours, where their day stands at the gate, their leave
 * requests (approved or refused here with a note) and the staff's news.
 */
export default async function SchoolStaffPage() {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("school.staff")} t={t} />;
  const store = await getStore();
  const now = new Date();
  const [saved, people, leave, news, plan] = await Promise.all([
    store.getSchoolSettings(app.id),
    store.listSchoolPeople(app.id),
    store.listSchoolLeave(app.id),
    store.listSchoolAnnouncements(app.id, { limit: 100 }),
    appPlan(store, license, now),
  ]);
  const settings = schoolSettingsOf(saved, app);
  const board = new Map((await checkinBoard(store, app, schoolToday(settings, now), now)).map((b) => [b.person.id, b]));
  const workers = people.filter((p) => p.role === "teacher" || p.role === "staff");
  const byId = new Map(people.map((p) => [p.id, p]));
  const groups = new Map<string, SchoolPerson[]>();
  for (const person of workers) {
    const key = person.department ?? "";
    groups.set(key, [...(groups.get(key) ?? []), person]);
  }
  const departments = [...groups.entries()].sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));
  const waiting = leave.filter((l) => l.status === "pending");
  const ordered = [...waiting.sort((a, b) => a.startsOn.localeCompare(b.startsOn) || a.id - b.id), ...leave.filter((l) => l.status !== "pending")].slice(0, 100);
  const staffNews = news.filter((a) => a.audience === "staff");

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("school.staff")} intro={t("school.staffIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />

      <Panel id="h-leave" title={t("school.leaveRequests")} intro={waiting.length ? `${t("school.leaveIntro")} ${t("school.waitingCount", { count: waiting.length })}` : t("school.leaveIntro")}>
        {ordered.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("school.noLeave")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {ordered.map((l) => (
            <LeaveItem key={l.id} leave={l} person={byId.get(l.personId)} t={t} timezone={settings.timezone} />
          ))}
        </ul>
      </Panel>

      <Panel id="h-workers" title={t("school.whoWorks")}>
        {workers.length === 0 ? <FirstNote text={t("school.noStaff")} href="/dashboard/school/people?role=staff" /> : null}
        {departments.map(([department, list]) => (
          <section key={department || "-"} className="flex flex-col gap-1">
            {department ? <h3 className="m-0 text-[15px] font-bold">{department}</h3> : null}
            <ul className="m-0 flex list-none flex-col p-0">
              {list.map((person) => {
                const today = board.get(person.id);
                return (
                  <li key={person.id} className="flex flex-wrap items-center gap-2 border-t border-line-soft py-2.5 first:border-t-0">
                    <span className="flex min-w-[180px] flex-1 flex-col gap-0.5">
                      <Link href={`/dashboard/school/people?role=${person.role}&q=${encodeURIComponent(person.name)}`} className="text-[15px] font-bold">
                        {person.name}
                      </Link>
                      <span className="text-[13px] text-muted">{[person.jobTitle ?? t("school.noJob"), t(person.role === "teacher" ? "school.teacher" : "school.staff"), hoursLine(person, t)].filter(Boolean).join(" · ")}</span>
                      {person.duties ? <span className="text-[13px] whitespace-pre-line text-ink-4">{person.duties}</span> : null}
                    </span>
                    {today && person.active ? <Badge tone={STATE_TONES[today.state]}>{t("school.todayIs", { state: t(STATE_KEYS[today.state]) })}</Badge> : null}
                    {person.active ? null : <Badge tone="neutral">{t("school.inactive")}</Badge>}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </Panel>

      <Panel id="h-staff-news" title={t("school.staffNews")}>
        <FirstNote text={t("school.staffNewsIntro")} href="/dashboard/school/news" />
        {staffNews.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("school.noStaffNews")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {staffNews.map((a) => (
            <li key={a.id} className="flex flex-col gap-0.5 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
              <span className="text-[15px] font-bold">{a.title}</span>
              <span className="text-[13px] text-muted">{a.createdAt.toISOString().slice(0, 10)}</span>
              <span className="text-[14px] whitespace-pre-line text-ink-4">{a.body}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
