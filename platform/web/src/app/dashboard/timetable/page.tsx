import type { Metadata } from "next";
import Link from "next/link";
import { cancelClassSessionAction, deleteClassTemplateAction } from "@/app/actions/classes";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, Notice, PageHeader, Section, btn } from "@/components/ui";
import { ItemList, Stat, StatRow, Thumb } from "@/components/page-kit";
import { AddDetails, ItemDetails } from "@/components/page-kit-a";
import { DetailsButton } from "@/components/page-kit-a-client";
import { requireClient } from "@/lib/auth/session";
import { CLASS_WEEKS, classWhen } from "@/lib/bookings/classes";
import { bookingSetup, WEEKDAYS } from "@/lib/bookings/setup";
import { addDays, localToUtc, utcToLocal } from "@/lib/bookings/time";
import { getStore } from "@/lib/data";
import type { ClassBooking, ClassTemplate } from "@/lib/data/types";
import { ClassTemplateForm } from "./forms";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { formatDate } from "@/i18n/format";
import type { Lang } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("bookings.timetable") };
}

/** "Mon 3 Nov, 18:00" (lib/bookings/classes.ts classWhen) in the dashboard's language. */
function classWhenIn(lang: Lang, startAt: Date, timeZone: string): string {
  if (lang === "en") return classWhen(startAt, timeZone);
  const local = utcToLocal(startAt, timeZone);
  return `${formatDate(lang, new Date(`${local.date}T12:00:00Z`), { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}, ${local.time}`;
}

/** A weekday's long name in the dashboard's language (1 January 2023 was a Sunday). */
const weekdayIn = (lang: Lang, d: number) => (lang === "en" ? WEEKDAYS[d]! : formatDate(lang, new Date(Date.UTC(2023, 0, 1 + d)), { weekday: "long", timeZone: "UTC" }));

function templateValues(t: ClassTemplate | null, firstService?: { id: number; durationMinutes: number }): Record<string, string> {
  if (!t) return { serviceId: firstService ? String(firstService.id) : "", staffId: "", weekday: "1", time: "18:00", duration: String(firstService?.durationMinutes ?? 60), capacity: "12", active: "on" };
  return {
    id: String(t.id),
    serviceId: String(t.serviceId),
    staffId: String(t.staffId),
    weekday: String(t.weekday),
    time: t.time,
    duration: String(t.durationMinutes),
    capacity: String(t.capacity),
    active: t.active ? "on" : "",
  };
}

function who(b: ClassBooking): string {
  return [b.customerName, b.customerPhone ?? b.customerEmail].filter(Boolean).join(" · ");
}

/** 27 A gym's or studio's weekly timetable, and the classes of the coming week with who booked them. */
export default async function TimetablePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { app } = await requireClient("bookings");
  const { t, lang } = await dashboardText();
  const kind = app?.vertical === "fitness" ? "fitness" : app?.vertical === "clinic" ? "clinic" : "other";
  const sr = { sr: (chunk: string) => <span className="sr-only">{chunk}</span> };
  if (!app || app.connector?.kind !== "bookings") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("bookings.timetable")} description={richText(t("bookings.timetableNotHere"), { link: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })} />
      </div>
    );
  }
  const setup = bookingSetup(app);
  const { timezone } = setup.rules;
  const week = Math.min(CLASS_WEEKS - 1, Math.max(0, Number.parseInt((await searchParams).week ?? "0", 10) || 0));
  const now = new Date();
  const from = addDays(utcToLocal(now, timezone).date, week * 7);
  const store = await getStore();
  const sessions = await store.listClassSessions({ appId: app.id, startFrom: week === 0 ? now : localToUtc(from, "00:00", timezone), startBefore: localToUtc(addDays(from, 7), "00:00", timezone) });
  const bookings = await store.listClassBookings({ appId: app.id, sessionIds: sessions.map((s) => s.id), status: "booked" });
  const service = new Map(setup.services.map((s) => [s.id, s]));
  const coach = new Map(setup.staff.map((s) => [s.id, s.name]));
  const templates = [...setup.classTemplates].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.time.localeCompare(b.time));
  const coaches = setup.staff.filter((s) => s.active);

  const canAdd = setup.services.length > 0 && coaches.length > 0;
  const live = sessions.filter((s) => s.status !== "cancelled");
  const pageLink = (to: number, label: string, icon: "chevron_left" | "chevron_right") => (
    <Link href={`/dashboard/timetable?week=${to}`} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
      {icon === "chevron_left" ? <Icon name={icon} size={18} /> : null}
      {label}
      {icon === "chevron_right" ? <Icon name={icon} size={18} /> : null}
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the numbers, the weekly classes (each opens in place), then the week's classes. */}
      <PageHeader
        title={t("bookings.timetable")}
        description={richText(t("bookings.timetableIntro", { kind, weeks: CLASS_WEEKS }), { zone: () => <bdi dir="ltr">{timezone}</bdi> })}
        actions={
          canAdd && templates.length ? (
            <DetailsButton target="add-class" icon="add">
              {t("bookings.addClass")}
            </DetailsButton>
          ) : null
        }
      />
      {!canAdd ? (
        <Notice tone="warn" icon="warning">
          {richText(t("bookings.firstAdd", { kind }), { link: (chunk) => <Link href="/dashboard/services">{chunk}</Link> })}
        </Notice>
      ) : null}

      {templates.length ? (
        <StatRow label={t("bookings.timetable")}>
          <Stat icon="calendar_month" label={t("bookings.weekly")} value={templates.length} hint={templates.some((x) => !x.active) ? `${t("bookings.paused")}: ${templates.filter((x) => !x.active).length}` : undefined} />
          <Stat icon="event" tone="accent" label={t("bookings.statWeekClasses")} value={live.length} />
          <Stat icon="groups" tone="success" label={t("bookings.statBooked")} value={live.reduce((sum, x) => sum + x.bookedCount, 0)} hint={t("bookings.statSpots", { count: live.reduce((sum, x) => sum + x.capacity, 0) })} />
        </StatRow>
      ) : null}

      <Section titleId="h-weekly" title={t("bookings.weekly")} description={t("bookings.weeklyText")} flush>
        {templates.length ? (
          <ItemList>
            {templates.map((template, i) => {
              const name = service.get(template.serviceId)?.name ?? t("bookings.removedClass");
              return (
                <ItemDetails
                  key={template.id}
                  media={<Thumb icon="fitness_center" shape="square" tint={template.weekday + i} />}
                  title={`${weekdayIn(lang, template.weekday)} ${template.time} · ${name}`}
                  meta={t("bookings.classLine", { coach: coach.get(template.staffId) ?? t("bookings.noCoach"), minutes: template.durationMinutes, spots: template.capacity })}
                  aside={template.active ? null : <Badge tone="warn">{t("bookings.paused")}</Badge>}
                >
                  <ClassTemplateForm current={templateValues(template)} services={setup.services} coaches={coaches} submit={t("bookings.saveClass")} />
                  <form action={deleteClassTemplateAction}>
                    <input type="hidden" name="id" value={template.id} />
                    <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                      {richText(t("bookings.takeOff", { name }), sr)}
                    </SubmitButton>
                  </form>
                </ItemDetails>
              );
            })}
          </ItemList>
        ) : null}
        {canAdd ? (
          <AddDetails id="add-class" label={t("bookings.addClass")} open={templates.length === 0}>
            <ClassTemplateForm current={templateValues(null, setup.services[0])} services={setup.services} coaches={coaches} submit={t("bookings.addToTimetable")} />
          </AddDetails>
        ) : null}
      </Section>

      <Section
        titleId="h-coming"
        title={week === 0 ? t("bookings.coming7") : t("bookings.weekOf", { date: classWhenIn(lang, localToUtc(from, "12:00", timezone), timezone).split(",")[0]! })}
        description={t("bookings.comingText")}
        actions={
          <nav aria-label={t("bookings.weeks")} className="flex flex-wrap gap-2">
            {week > 0 ? pageLink(week - 1, t("bookings.previousWeek"), "chevron_left") : null}
            {week < CLASS_WEEKS - 1 ? pageLink(week + 1, t("bookings.nextWeek"), "chevron_right") : null}
          </nav>
        }
        flush
      >
        {sessions.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="event_busy" title={t("bookings.noClasses")} />
          </div>
        ) : (
          <ItemList>
            {sessions.map((s, i) => {
              const people = bookings.filter((b) => b.sessionId === s.id);
              const cancelled = s.status === "cancelled";
              return (
                <li key={s.id} className="flex flex-col gap-3 border-t border-line-soft px-5 py-3.5 first:border-t-0 sm:px-6">
                  <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
                    <Thumb icon={cancelled ? "event_busy" : "event"} shape="square" tint={i} />
                    <span className="flex min-w-0 flex-[1_1_200px] flex-col gap-0.5">
                      <span className="text-[15px] font-bold break-words">
                        {classWhenIn(lang, s.startAt, timezone)} · {s.serviceName}
                      </span>
                      <span className="text-[13px] text-muted">{t("bookings.withCoach", { name: s.staffName })}</span>
                    </span>
                    {cancelled ? (
                      <Badge tone="neutral">{t("events.cancelled")}</Badge>
                    ) : (
                      <Badge tone={s.bookedCount >= s.capacity ? "warn" : "success"}>{t("bookings.bookedOf", { booked: s.bookedCount, capacity: s.capacity })}</Badge>
                    )}
                    {!cancelled && s.startAt > now ? (
                      <form action={cancelClassSessionAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                          {richText(t("bookings.cancelClass", { name: s.serviceName, when: classWhenIn(lang, s.startAt, timezone) }), sr)}
                        </SubmitButton>
                      </form>
                    ) : null}
                  </div>
                  {people.length ? (
                    <details className="group rounded-xl border border-line-soft bg-sand">
                      <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-2.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                        <Icon name="groups" size={18} className="text-muted" />
                        <span className="flex-1">{richText(t("bookings.whosComing", { count: people.length, name: s.serviceName }), sr)}</span>
                        <Icon name="expand_more" size={18} className="text-muted transition-transform group-open:rotate-180" />
                      </summary>
                      <ol className="m-0 flex flex-col gap-1 border-t border-line-soft py-2.5 ps-9 pe-3.5 text-[15px]">
                        {people.map((b) => (
                          <li key={b.id}>{who(b)}</li>
                        ))}
                      </ol>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ItemList>
        )}
      </Section>
    </div>
  );
}
