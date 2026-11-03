import type { Metadata } from "next";
import { Badge, btn } from "@/components/ui";
import { ItemList, ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { ListBar, Pager } from "@/components/page-kit-c";
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
  const pickups = board.filter((b) => b.pickup !== null && (classId === null || b.person.classId === classId));
  const link = (p: number) => `/dashboard/school/checkin?date=${date}&role=${role}${classId ? `&class=${classId}` : ""}${p > 1 ? `&page=${p}` : ""}`;
  const detail = (b: BoardRow) =>
    b.role === "student" ? (b.person.classId ? (className.get(b.person.classId) ?? null) : null) : ([b.person.jobTitle, b.person.department].filter(Boolean).join(" · ") || t(b.role === "teacher" ? "school.teacher" : "school.staff"));

  const STATE_ICONS = { not_yet: "hourglass_top", in: "login", left: "logout", absent: "cancel", excused: "event_busy", leave: "event_busy", off: "block" } as const;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, the day's numbers, the other check-in pages, today's pick-ups, then the board. */}
      <PageHead title={t("school.checkin")} intro={t("school.checkinIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {c.on ? null : <FirstNote text={t("school.checkinOff")} href="/dashboard/school/checkin/settings" />}
      {counts.length ? (
        <StatRow label={t("school.boardOf", { date })}>
          {counts.map((x) => (
            <Stat key={x.state} icon={STATE_ICONS[x.state]} tone={x.state === "in" ? "success" : x.state === "absent" ? "warn" : "neutral"} label={t(STATE_KEYS[x.state])} value={x.count} />
          ))}
          {late || early ? <Stat icon="schedule" tone="accent" label={t("school.late")} value={late} hint={early ? `${t("school.leftEarly")}: ${early}` : undefined} /> : null}
        </StatRow>
      ) : null}
      <CheckinLinks t={t} current="/dashboard/school/checkin" />
      {/* 113.4 The day's pick-up notes from the parents. */}
      <Panel id="h-pickup-today" title={t("parents.todayPickup")} intro={pickups.length ? t("parents.todayPickupIntro") : undefined} flush>
        {pickups.length === 0 ? <p className="m-0 px-5 py-4 text-[15px] text-muted sm:px-6">{t("parents.noTodayPickup")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0" data-pickup-board>
          {pickups.map((b, i) => (
            <ItemRow
              key={b.person.id}
              href={`/dashboard/school/people/${b.person.id}`}
              media={<Thumb icon="child_care" shape="round" tint={i} />}
              title={<span dir="auto">{b.person.name}</span>}
              meta={[detail(b), t("parents.picksUp", { who: [b.pickup!.name, b.pickup!.relation, b.pickup!.phone].filter(Boolean).join(" · ") }), b.pickup!.note].filter(Boolean).join(" · ")}
            />
          ))}
        </ul>
      </Panel>
      <Panel id="h-board" title={t("school.boardOf", { date })} flush>
        <ListBar>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="f-date" className="text-xs font-semibold text-muted">
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
            <button type="submit" className={`${btn.secondary} h-10 px-3.5 text-sm`}>
              {t("school.show")}
            </button>
          </form>
        </ListBar>
        {board.length === 0 ? (
          <div className="p-5 sm:p-6">
            <FirstNote text={t("school.noOneChecksIn")} href="/dashboard/school/people" />
          </div>
        ) : null}
        {board.length > 0 && list.length === 0 ? <p className="m-0 px-5 py-8 text-center text-[15px] text-muted sm:px-6">{t("school.noMatch")}</p> : null}
        <ItemList>
          {list.map((b, i) => (
            <ItemRow
              key={b.person.id}
              data-person={b.person.id}
              href={b.role === "student" ? `/dashboard/school/people/${b.person.id}` : undefined}
              media={<Thumb icon={b.role === "student" ? "school" : b.role === "teacher" ? "menu_book" : "home_work"} shape="round" tint={i} />}
              title={b.person.name}
              meta={detail(b)}
              extra={
                <>
                  <DayRecord row={b.row} timezone={settings.timezone} t={t} />
                  {b.register ? <span>{t("school.register", { status: t(REGISTER_KEYS[b.register]) })}</span> : null}
                  {/* 113.4 The parents' accepted excuse, and who picks the child up today. */}
                  {b.excuse ? <span>{t("parents.excusedFor", { reason: b.excuse.reason })}</span> : null}
                  {b.pickup ? (
                    <span className="font-semibold text-midnight" data-pickup-today>
                      {t("parents.picksUp", { who: [b.pickup.name, b.pickup.relation, b.pickup.phone].filter(Boolean).join(" · ") })}
                    </span>
                  ) : null}
                </>
              }
              aside={
                <>
                  <Badge tone={STATE_TONES[b.state]}>{t(STATE_KEYS[b.state])}</Badge>
                  {b.row?.late && (b.state === "in" || b.state === "left") ? <Badge tone="warn">{t("school.late")}</Badge> : null}
                  {b.row?.leftEarly && b.state === "left" ? <Badge tone="warn">{t("school.leftEarly")}</Badge> : null}
                </>
              }
              actions={b.state !== "off" || b.row ? <CorrectForm entry={b} date={date} timezone={settings.timezone} t={t} /> : null}
            />
          ))}
        </ItemList>
        {pages > 1 ? (
          <Pager
            label={t("school.pages")}
            prev={page > 1 ? { href: link(page - 1), label: t("school.previous") } : null}
            next={page < pages ? { href: link(page + 1), label: t("school.next") } : null}
            text={t("school.pageOf", { page, pages })}
          />
        ) : null}
      </Panel>
    </div>
  );
}
