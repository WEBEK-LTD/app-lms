import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { rescheduleAppointmentAction } from "@/app/actions/bookings";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { btn, Notice } from "@/components/ui";
import { formatDate } from "@/i18n/format";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { canReschedule, rescheduleTimes } from "@/lib/bookings/reschedule";
import { bookingSetup } from "@/lib/bookings/setup";
import { addDays, isDate, localToUtc, utcToLocal } from "@/lib/bookings/time";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("bookings.moveTitle") };
}

const DAYS = 7;

const ERRORS: Record<string, DashKey> = {
  slot_taken: "bookings.moveTaken",
  invalid_status: "bookings.moveCant",
  not_bookable: "bookings.moveNotBookable",
  invalid_request: "bookings.moveTaken",
};

/**
 * 61 Change time: the free times of the appointment's service, a week at a
 * time, as booking in the app offers them (lib/bookings/reschedule.ts). The
 * customer is told when it moves.
 */
export default async function MoveAppointmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; staff?: string; error?: string }> }) {
  const { app } = await requireClient("bookings");
  const { t, lang } = await dashboardText();
  if (!app || app.connector?.kind !== "bookings") notFound();
  const { id } = await params;
  const query = await searchParams;
  const store = await getStore();
  const appointment = /^\d{1,15}$/.test(id) ? await store.getBookingAppointment(app.id, Number(id)) : null;
  if (!appointment) notFound();
  const kind = app.vertical === "fitness" ? "fitness" : app.vertical === "clinic" ? "clinic" : "other";
  const zone = bookingSetup(app).rules.timezone;
  const now = new Date();
  const current = utcToLocal(appointment.startAt, zone);
  const back = (
    <Link href="/dashboard/appointments" className="flex items-center gap-1 text-[15px]">
      <Icon name="arrow_back" size={20} />
      {t("bookings.appointments", { kind })}
    </Link>
  );
  const title = (
    <div className="flex max-w-[620px] flex-col gap-2">
      {back}
      <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("bookings.moveTitle")}</h1>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">
        {t("bookings.moveNow", { service: appointment.serviceName, staff: appointment.staffName, customer: appointment.customerName, date: current.date, time: current.time })}
      </p>
    </div>
  );
  if (!canReschedule(appointment, now)) {
    return (
      <div className="flex flex-col gap-6">
        {title}
        <Notice tone="warn">{t("bookings.moveCant")}</Notice>
      </div>
    );
  }
  const staffParam = query.staff && /^\d{1,9}$/.test(query.staff) ? Number(query.staff) : null;
  const from = query.from && isDate(query.from) ? query.from : null;
  const times = await rescheduleTimes({ store, app, now }, appointment, { from, days: DAYS, staffId: staffParam });
  if (!times) {
    return (
      <div className="flex flex-col gap-6">
        {title}
        <Notice tone="warn">{t("bookings.moveNotBookable")}</Notice>
      </div>
    );
  }
  const first = times.days[0]?.date ?? utcToLocal(now, zone).date;
  const today = utcToLocal(now, zone).date;
  const staffName = new Map(times.staff.map((s) => [s.id, s.name]));
  const link = (date: string) => `/dashboard/appointments/${appointment.id}/move?from=${date}${staffParam !== null ? `&staff=${staffParam}` : ""}`;
  const dayLabel = (date: string) => formatDate(lang, localToUtc(date, "12:00", zone), { weekday: "long", day: "numeric", month: "long", timeZone: zone });
  const open = times.days.filter((d) => d.slots.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {title}
      {query.error && ERRORS[query.error] ? (
        <Notice tone="danger" role="alert">
          {t(ERRORS[query.error]!)}
        </Notice>
      ) : null}
      <p className="m-0 max-w-[620px] text-[15px] leading-relaxed text-ink-4">{t("bookings.moveIntro", { zone })}</p>

      {times.staff.length > 1 ? (
        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="from" value={first} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-staff" className="text-sm font-semibold">
              {t("bookings.moveWho", { kind })}
            </label>
            <select id="f-staff" name="staff" defaultValue={staffParam ?? ""} className="input h-11 min-w-48">
              <option value="">{t("bookings.moveAnyone")}</option>
              {times.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={`${btn.secondary} h-11`}>
            {t("bookings.moveShow")}
          </button>
        </form>
      ) : null}

      <nav aria-label={t("bookings.moveWeeks")} className="flex flex-wrap items-center gap-3 text-[15px]">
        {first > today ? <Link href={link(addDays(first, -DAYS) < today ? today : addDays(first, -DAYS))}>{t("bookings.movePrevious")}</Link> : null}
        <span className="text-muted">{t("bookings.moveRange", { from: dayLabel(first), to: dayLabel(addDays(first, DAYS - 1)) })}</span>
        <Link href={link(addDays(first, DAYS))}>{t("bookings.moveNext")}</Link>
      </nav>

      {open.length === 0 ? (
        <p className="m-0 rounded-2xl border border-line bg-white p-5 text-[15px] text-muted sm:p-6">{t("bookings.moveNoTimes")}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {open.map((day) => (
            <li key={day.date} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
              <h2 className="m-0 text-[17px] font-bold">{dayLabel(day.date)}</h2>
              <div className="flex flex-wrap gap-2">
                {day.slots.map((slot) => {
                  const staff = staffParam ?? (slot.staffIds.includes(appointment.staffId) ? appointment.staffId : slot.staffIds[0]!);
                  const isCurrent = slot.start.getTime() === appointment.startAt.getTime() && staff === appointment.staffId;
                  return (
                    <form key={slot.localTime} action={rescheduleAppointmentAction}>
                      <input type="hidden" name="id" value={appointment.id} />
                      <input type="hidden" name="start" value={slot.start.toISOString()} />
                      <input type="hidden" name="staff" value={staff} />
                      <SubmitButton variant="secondary" className="h-11 px-3.5 text-[15px]" disabled={isCurrent} pendingText={slot.localTime}>
                        <span dir="ltr">{slot.localTime}</span>
                        {times.staff.length > 1 && staffParam === null ? <span className="text-[13px] font-normal text-muted">{staffName.get(staff)}</span> : null}
                      </SubmitButton>
                    </form>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
