import type { Metadata } from "next";
import Link from "next/link";
import { cancelClassSessionAction, deleteClassTemplateAction } from "@/app/actions/classes";
import { SubmitButton } from "@/components/form";
import { Badge, Notice } from "@/components/ui";
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

function Card({ id, title, text, children }: { id: string; title: string; text?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="m-0 text-lg font-bold">
          {title}
        </h2>
        {text ? <p className="m-0 text-[15px] text-ink-4">{text}</p> : null}
      </div>
      {children}
    </section>
  );
}

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
  const { app } = await requireClient();
  const { t, lang } = await dashboardText();
  const kind = app?.vertical === "fitness" ? "fitness" : app?.vertical === "clinic" ? "clinic" : "other";
  const sr = { sr: (chunk: string) => <span className="sr-only">{chunk}</span> };
  if (!app || app.connector?.kind !== "bookings") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("bookings.timetable")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {richText(t("bookings.timetableNotHere"), { link: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })}
        </p>
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("bookings.timetable")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {richText(t("bookings.timetableIntro", { kind, weeks: CLASS_WEEKS }), { zone: () => <bdi dir="ltr">{timezone}</bdi> })}
        </p>
      </div>
      {setup.services.length === 0 || coaches.length === 0 ? (
        <Notice tone="warn" icon="warning">
          {richText(t("bookings.firstAdd", { kind }), { link: (chunk) => <Link href="/dashboard/services">{chunk}</Link> })}
        </Notice>
      ) : null}

      <Card id="h-weekly" title={t("bookings.weekly")} text={t("bookings.weeklyText")}>
        {templates.length ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {templates.map((template) => {
              const name = service.get(template.serviceId)?.name ?? t("bookings.removedClass");
              return (
                <li key={template.id} className="rounded-xl border border-line">
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <span className="text-[15px] font-bold">
                        {weekdayIn(lang, template.weekday)} {template.time} · {name}
                      </span>
                      <span className="flex items-center gap-2 text-sm text-muted">
                        {t("bookings.classLine", { coach: coach.get(template.staffId) ?? t("bookings.noCoach"), minutes: template.durationMinutes, spots: template.capacity })}
                        {template.active ? null : <Badge tone="warn">{t("bookings.paused")}</Badge>}
                      </span>
                    </summary>
                    <div className="flex flex-col gap-3 border-t border-line-soft p-4">
                      <ClassTemplateForm current={templateValues(template)} services={setup.services} coaches={coaches} submit={t("bookings.saveClass")} />
                      <form action={deleteClassTemplateAction}>
                        <input type="hidden" name="id" value={template.id} />
                        <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                          {richText(t("bookings.takeOff", { name }), sr)}
                        </SubmitButton>
                      </form>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        ) : null}
        {setup.services.length && coaches.length ? (
          <details className="rounded-xl border border-line p-4" open={templates.length === 0}>
            <summary className="cursor-pointer text-[15px] font-bold">{t("bookings.addClass")}</summary>
            <div className="pt-3">
              <ClassTemplateForm current={templateValues(null, setup.services[0])} services={setup.services} coaches={coaches} submit={t("bookings.addToTimetable")} />
            </div>
          </details>
        ) : null}
      </Card>

      <Card
        id="h-coming"
        title={week === 0 ? t("bookings.coming7") : t("bookings.weekOf", { date: classWhenIn(lang, localToUtc(from, "12:00", timezone), timezone).split(",")[0]! })}
        text={t("bookings.comingText")}
      >
        <nav aria-label={t("bookings.weeks")} className="flex flex-wrap gap-3 text-[15px]">
          {week > 0 ? <Link href={`/dashboard/timetable?week=${week - 1}`}>{t("bookings.previousWeek")}</Link> : null}
          {week < CLASS_WEEKS - 1 ? <Link href={`/dashboard/timetable?week=${week + 1}`}>{t("bookings.nextWeek")}</Link> : null}
        </nav>
        {sessions.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("bookings.noClasses")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {sessions.map((s) => {
              const people = bookings.filter((b) => b.sessionId === s.id);
              const cancelled = s.status === "cancelled";
              return (
                <li key={s.id} className="flex flex-col gap-2 rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[15px] font-bold">
                      {classWhenIn(lang, s.startAt, timezone)} · {s.serviceName}
                    </span>
                    {cancelled ? (
                      <Badge tone="neutral">{t("events.cancelled")}</Badge>
                    ) : (
                      <Badge tone={s.bookedCount >= s.capacity ? "warn" : "success"}>{t("bookings.bookedOf", { booked: s.bookedCount, capacity: s.capacity })}</Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted">{t("bookings.withCoach", { name: s.staffName })}</span>
                  {people.length ? (
                    <details className="rounded-lg border border-line-soft">
                      <summary className="cursor-pointer px-3 py-2 text-[15px] font-semibold">
                        {richText(t("bookings.whosComing", { count: people.length, name: s.serviceName }), sr)}
                      </summary>
                      <ol className="m-0 flex flex-col gap-1 border-t border-line-soft py-2 ps-8 pe-3 text-[15px]">
                        {people.map((b) => (
                          <li key={b.id}>{who(b)}</li>
                        ))}
                      </ol>
                    </details>
                  ) : null}
                  {!cancelled && s.startAt > now ? (
                    <form action={cancelClassSessionAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                        {richText(t("bookings.cancelClass", { name: s.serviceName, when: classWhenIn(lang, s.startAt, timezone) }), sr)}
                      </SubmitButton>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
