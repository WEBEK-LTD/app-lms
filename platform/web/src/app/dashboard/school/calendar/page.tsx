import type { Metadata } from "next";
import Link from "next/link";
import { deleteSchoolEventAction, saveSchoolEventAction } from "@/app/actions/school-calendar";
import { Field } from "@/components/form";
import { EmptyState, btn } from "@/components/ui";
import { ItemRow, Stat, StatRow } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { ChipLinks } from "@/components/page-kit-c";
import { requireClient } from "@/lib/auth/session";
import { addDays, timeOf } from "@/lib/bookings/time";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { SchoolEvent } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { eventDays, monthRange } from "@/lib/school/calendar";
import { CALENDAR_LIMITS, eventFormValues } from "@/lib/school/calendar-forms";
import { isoWeekday, schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { ConfirmButton } from "../../chat/forms";
import { Choice, SchoolForm } from "../forms";
import { audienceLabel, audienceOptions, KIND_TONE } from "../life";
import { isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice, WEEKDAY_KEYS } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("schoolLife.calendar") };
}

const KIND_KEY = { event: "schoolLife.kindEvent", holiday: "schoolLife.kindHoliday", exam: "schoolLife.kindExam" } as const;

/** 113.8 The school's calendar: a month at a time or a list from today; events, holidays and breaks, exam days, and the exams' timetable. */
export default async function SchoolCalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; view?: string; edit?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("schoolLife.calendar")} t={t} />;
  const query = await searchParams;
  const store = await getStore();
  const [classes, subjects, saved, plan] = await Promise.all([store.listSchoolClasses(app.id), store.listSchoolSubjects(app.id), store.getSchoolSettings(app.id), appPlan(store, license, new Date())]);
  const settings = schoolSettingsOf(saved, app);
  const today = schoolToday(settings, new Date());
  const month = query.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(query.month) ? query.month : today.slice(0, 7);
  const list = query.view === "list";
  const range = list ? { from: today, to: addDays(today, CALENDAR_LIMITS.days) } : monthRange(month);
  const [events, exams] = await Promise.all([store.listSchoolEvents(app.id, range), store.listSchoolExams(app.id, range)]);
  const className = new Map(classes.map((c) => [c.id, c.name]));
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  const editing = query.edit ? (events.find((e) => e.id === Number(query.edit)) ?? (await store.getSchoolEvent(app.id, Number(query.edit)))) : null;
  const shift = (n: number) => {
    const [y, m] = month.split("-").map(Number) as [number, number];
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    return d.toISOString().slice(0, 7);
  };
  const kindOptions = (["event", "holiday", "exam"] as const).map((k) => ({ value: k, label: t(KIND_KEY[k]) }));
  const forOptions = audienceOptions(classes, t);

  const fields = (suffix: string, event: SchoolEvent | null) => {
    const v = eventFormValues(event, list ? today : month === today.slice(0, 7) ? today : `${month}-01`);
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice id={`f-kind${suffix}`} name="kind" label={t("schoolLife.kind")} options={kindOptions} defaultValue={v.kind} />
        <Field id={`f-title${suffix}`} label={t("schoolLife.eventTitle")} name="title" defaultValue={v.title} maxLength={CALENDAR_LIMITS.title} required />
        <Field id={`f-from${suffix}`} label={t("schoolLife.startsOn")} name="startsOn" type="date" dir="ltr" defaultValue={v.startsOn} required />
        <Field id={`f-to${suffix}`} label={t("schoolLife.endsOn")} name="endsOn" type="date" dir="ltr" defaultValue={v.endsOn} hint={t("schoolLife.endsOnHint")} />
        <Field id={`f-starts${suffix}`} label={t("schoolLife.starts")} name="starts" type="time" dir="ltr" defaultValue={v.starts} hint={t("schoolLife.timesHint")} />
        <Field id={`f-ends${suffix}`} label={t("schoolLife.ends")} name="ends" type="time" dir="ltr" defaultValue={v.ends} />
        <Field id={`f-place${suffix}`} label={t("schoolLife.place")} name="place" defaultValue={v.place} maxLength={CALENDAR_LIMITS.place} />
        <Choice id={`f-for${suffix}`} name="for" label={t("schoolLife.for")} options={forOptions} defaultValue={v.for} />
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor={`f-notes${suffix}`} className="text-sm font-semibold">
            {t("schoolLife.notes")}
          </label>
          <textarea id={`f-notes${suffix}`} name="notes" rows={3} defaultValue={v.notes} maxLength={CALENDAR_LIMITS.notes} className="input min-h-20 py-3" />
        </div>
      </div>
    );
  };

  const when = (e: SchoolEvent) =>
    [
      e.startsOn === e.endsOn ? e.startsOn : t("schoolLife.dayRange", { from: e.startsOn, to: e.endsOn }),
      e.startMinute === null ? t("schoolLife.allDay") : e.endMinute !== null ? t("schoolLife.timeRange", { starts: timeOf(e.startMinute), ends: timeOf(e.endMinute) }) : timeOf(e.startMinute),
    ].join(" · ");

  // The month's grid, Monday first.
  const { from, to } = monthRange(month);
  const lead = isoWeekday(from) - 1;
  const cells: (string | null)[] = [...Array.from({ length: lead }, () => null)];
  for (let day = from; day <= to; day = addDays(day, 1)) cells.push(day);
  const onDay = (day: string) => [
    ...events.filter((e) => eventDays(e).includes(day)).map((e) => ({ key: `e${e.id}`, text: e.title, tone: KIND_TONE[e.kind], href: `?month=${month}&edit=${e.id}#h-edit` })),
    ...exams.filter((x) => x.date === day).map((x) => ({ key: `x${x.id}`, text: t("schoolLife.examOn", { subject: subjectName.get(x.subjectId) ?? "—" }), tone: KIND_TONE.exam, href: "/dashboard/school/exams" })),
  ];

  const adding = !editing;
  const firstOne = events.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the numbers, the month (or the list), then its events. */}
      <PageHead
        title={t("schoolLife.calendar")}
        intro={t("schoolLife.calendarIntro")}
        actions={
          adding && !firstOne ? (
            <SheetButton target="new-event" icon="add">
              {t("schoolLife.addEvent")}
            </SheetButton>
          ) : null
        }
      />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChipLinks
          label={t("schoolLife.views")}
          items={[
            { href: `?month=${month}`, label: t("schoolLife.monthView"), current: !list },
            { href: "?view=list", label: t("schoolLife.listView"), current: list },
          ]}
        />
      </div>

      {events.length || exams.length ? (
        <StatRow label={list ? t("schoolLife.comingUp") : month}>
          <Stat icon="event" tone="success" label={t(KIND_KEY.event)} value={events.filter((e) => e.kind === "event").length} />
          <Stat icon="event_busy" tone="accent" label={t(KIND_KEY.holiday)} value={events.filter((e) => e.kind === "holiday").length} />
          <Stat icon="quiz" label={t(KIND_KEY.exam)} value={events.filter((e) => e.kind === "exam").length + exams.length} href="/dashboard/school/exams" />
        </StatRow>
      ) : null}

      {editing ? (
        <Panel id="h-edit" title={t("schoolLife.editEvent", { title: editing.title })}>
          <SchoolForm action={saveSchoolEventAction} submit={t("school.save")}>
            <input type="hidden" name="id" value={editing.id} />
            {fields(`-${editing.id}`, editing)}
          </SchoolForm>
          <Link href={list ? "?view=list" : `?month=${month}`} className="text-sm font-semibold no-underline">
            {t("schoolLife.cancel")}
          </Link>
        </Panel>
      ) : null}

      {list ? null : (
        <Panel
          id="h-month"
          title={month}
          actions={
            <>
              <Link href={`?month=${shift(-1)}`} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
                {t("schoolLife.previousMonth")}
              </Link>
              <Link href={`?month=${shift(1)}`} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
                {t("schoolLife.nextMonth")}
              </Link>
            </>
          }
        >
          <div className="overflow-x-auto">
            <div className="grid min-w-[560px] grid-cols-7 gap-1.5" data-calendar-month={month}>
              {WEEKDAY_KEYS.map((key) => (
                <div key={key} className="px-1 pb-1 text-center text-xs font-bold tracking-[0.4px] text-muted uppercase">
                  {t(key)}
                </div>
              ))}
              {cells.map((day, i) =>
                day === null ? (
                  <div key={`lead-${i}`} />
                ) : (
                  <div key={day} data-day={day} className={`flex min-h-[92px] flex-col gap-1 rounded-xl border p-1.5 ${day === today ? "border-ember bg-peach-soft" : "border-line-soft bg-white"}`}>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold tabular-nums ${day === today ? "bg-ember text-[#0e0d24]" : ""}`}>{Number(day.slice(8))}</span>
                    {onDay(day)
                      .slice(0, 3)
                      .map((item) => (
                        <Link key={item.key} href={item.href} className={`truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold no-underline ${item.tone}`}>
                          {item.text}
                        </Link>
                      ))}
                    {onDay(day).length > 3 ? <span className="text-[11px] text-muted">{t("schoolLife.moreOnDay", { count: onDay(day).length - 3 })}</span> : null}
                  </div>
                ),
              )}
            </div>
          </div>
        </Panel>
      )}

      {adding ? (
        // One place in the page either way, so the form that adds the first event keeps its message.
        <Sheet id="new-event" inline={firstOne} title={t("schoolLife.addEvent")}>
          <SchoolForm action={saveSchoolEventAction} submit={t("school.add")} reset sheet>
            {fields("-new", null)}
          </SchoolForm>
        </Sheet>
      ) : null}

      <Panel id="h-events" title={list ? t("schoolLife.comingUp") : t("schoolLife.calendar")} flush>
        {events.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="calendar_month" title={list ? t("schoolLife.noEventsAhead") : t("schoolLife.noEventsMonth")} />
          </div>
        ) : null}
        <ul className="m-0 flex list-none flex-col p-0" data-events="">
          {events.map((e) => (
            <ItemRow
              key={e.id}
              data-event={e.id}
              media={
                <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl leading-none ${KIND_TONE[e.kind]}`}>
                  <span className="text-[16px] font-extrabold tabular-nums">{Number(e.startsOn.slice(8))}</span>
                  <span className="text-[10px] font-bold tabular-nums">{e.startsOn.slice(5, 7)}</span>
                </span>
              }
              title={e.title}
              badges={<span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${KIND_TONE[e.kind]}`}>{t(KIND_KEY[e.kind])}</span>}
              meta={[when(e), e.place, audienceLabel(e, className, t)].filter(Boolean).join(" · ")}
              extra={e.notes ? <span className="whitespace-pre-line text-ink-4">{e.notes}</span> : null}
              actions={
                <>
                  <Link href={`?${list ? "view=list" : `month=${month}`}&edit=${e.id}#h-edit`} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
                    {t("schoolLife.edit")}
                  </Link>
                  <form action={deleteSchoolEventAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <ConfirmButton confirm={t("schoolLife.deleteEvent", { title: e.title })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                      {t("schoolLife.delete")}
                    </ConfirmButton>
                  </form>
                </>
              }
            />
          ))}
        </ul>
      </Panel>
    </div>
  );
}
