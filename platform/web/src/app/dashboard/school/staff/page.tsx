import type { Metadata } from "next";
import Link from "next/link";
import { answerLeaveAction } from "@/app/actions/school";
import { Badge, EmptyState, btn } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ItemList, ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
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
    <li data-leave={leave.id} className="flex flex-col gap-3 border-t border-line-soft px-5 py-3.5 first:border-t-0 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <Thumb icon="event_busy" shape="round" tint={leave.id} />
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
        <SchoolForm action={answerLeaveAction} submit={t("school.save")} className="rounded-xl bg-sand p-4">
          <input type="hidden" name="id" value={leave.id} />
          <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0">
            <legend className="sr-only">{person?.name ?? ""}</legend>
            {(["approved", "refused"] as const).map((a) => (
              <label key={a} className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-white px-3 text-sm has-[:checked]:border-midnight has-[:checked]:bg-midnight has-[:checked]:font-bold has-[:checked]:text-ivory">
                <input type="radio" name="answer" value={a} defaultChecked={a === "approved"} className="h-4 w-4 accent-ember" />
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
      {/* The page kit: the header (people are added on People), the numbers, leave requests, who works here, then their news. */}
      <PageHead
        title={t("school.staff")}
        intro={t("school.staffIntro")}
        actions={
          <Link href="/dashboard/school/people?role=staff" className={`${btn.main} h-11`}>
            <Icon name="add" size={20} />
            {t("school.addStaff")}
          </Link>
        }
      />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />

      {workers.length ? (
        <StatRow label={t("school.staff")}>
          <Stat icon="menu_book" label={t("school.teachers")} value={workers.filter((p) => p.role === "teacher").length} href="/dashboard/school/people?role=teacher" />
          <Stat icon="home_work" label={t("school.staff")} value={workers.filter((p) => p.role === "staff").length} href="/dashboard/school/people?role=staff" />
          <Stat icon="pending" tone={waiting.length ? "warn" : "neutral"} label={t("school.leaveRequests")} value={waiting.length} hint={waiting.length ? t("school.waitingCount", { count: waiting.length }) : undefined} />
          <Stat icon="campaign" tone="accent" label={t("school.staffNews")} value={staffNews.length} href="/dashboard/school/news" />
        </StatRow>
      ) : null}

      <Panel id="h-leave" title={t("school.leaveRequests")} intro={waiting.length ? `${t("school.leaveIntro")} ${t("school.waitingCount", { count: waiting.length })}` : t("school.leaveIntro")} flush>
        {ordered.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="event_available" title={t("school.noLeave")} />
          </div>
        ) : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {ordered.map((l) => (
            <LeaveItem key={l.id} leave={l} person={byId.get(l.personId)} t={t} timezone={settings.timezone} />
          ))}
        </ul>
      </Panel>

      <Panel id="h-workers" title={t("school.whoWorks")} flush>
        {workers.length === 0 ? (
          <div className="p-5 sm:p-6">
            <FirstNote text={t("school.noStaff")} href="/dashboard/school/people?role=staff" />
          </div>
        ) : null}
        {departments.map(([department, list]) => (
          <section key={department || "-"} className="flex flex-col border-t border-line-soft first:border-t-0">
            {department ? <h3 className="m-0 bg-sand px-5 py-2 text-xs font-bold tracking-[0.4px] text-muted uppercase sm:px-6">{department}</h3> : null}
            <ItemList>
              {list.map((person, i) => {
                const today = board.get(person.id);
                return (
                  <ItemRow
                    key={person.id}
                    href={`/dashboard/school/people?role=${person.role}&q=${encodeURIComponent(person.name)}`}
                    media={<Thumb icon={person.role === "teacher" ? "menu_book" : "home_work"} shape="round" tint={i} />}
                    title={person.name}
                    badges={person.active ? null : <Badge tone="neutral">{t("school.inactive")}</Badge>}
                    meta={[person.jobTitle ?? t("school.noJob"), t(person.role === "teacher" ? "school.teacher" : "school.staff"), hoursLine(person, t)].filter(Boolean).join(" · ")}
                    extra={person.duties ? <span className="whitespace-pre-line">{person.duties}</span> : null}
                    aside={today && person.active ? <Badge tone={STATE_TONES[today.state]}>{t("school.todayIs", { state: t(STATE_KEYS[today.state]) })}</Badge> : null}
                  />
                );
              })}
            </ItemList>
          </section>
        ))}
      </Panel>

      <Panel id="h-staff-news" title={t("school.staffNews")} intro={<FirstNote text={t("school.staffNewsIntro")} href="/dashboard/school/news" />} flush>
        {staffNews.length === 0 ? <p className="m-0 px-5 py-5 text-[15px] text-muted sm:px-6">{t("school.noStaffNews")}</p> : null}
        <ItemList>
          {staffNews.map((a, i) => (
            <ItemRow key={a.id} media={<Thumb icon="campaign" shape="square" tint={i} />} title={a.title} meta={a.createdAt.toISOString().slice(0, 10)} extra={<span className="whitespace-pre-line text-ink-4">{a.body}</span>} />
          ))}
        </ItemList>
      </Panel>
    </div>
  );
}
