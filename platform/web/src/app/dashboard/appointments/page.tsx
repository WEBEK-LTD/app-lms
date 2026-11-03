import type { Metadata } from "next";
import Link from "next/link";
import { setAppointmentStatusAction } from "@/app/actions/bookings";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, btn, EmptyState, Notice, PageHeader, Section } from "@/components/ui";
import { Thumb } from "@/components/page-kit";
import { FilterList } from "@/components/page-kit-client";
import { canReschedule } from "@/lib/bookings/reschedule";
import { requireClient } from "@/lib/auth/session";
import { BOOKING_STATUS_LABELS, bookingSetup } from "@/lib/bookings/setup";
import { utcToLocal } from "@/lib/bookings/time";
import { formatCents } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import type { BookingAppointment, BookingStatus } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";

export async function generateMetadata(): Promise<Metadata> {
  const { app } = await requireClient("bookings");
  const kind = app?.vertical === "fitness" ? "fitness" : app?.vertical === "clinic" ? "clinic" : "other";
  return { title: (await dashboardText()).t("bookings.appointments", { kind }) };
}

const PER_PAGE = 30;

const TONES: Record<BookingStatus, "success" | "warn" | "danger" | "neutral"> = {
  approved: "success",
  pending: "warn",
  cancelled: "neutral",
  rejected: "danger",
  no_show: "danger",
  completed: "neutral",
};

function Action({ a, status, label, variant = "secondary" }: { a: BookingAppointment; status: BookingStatus; label: string; variant?: "primary" | "secondary" | "danger" }) {
  return (
    <form action={setAppointmentStatusAction}>
      <input type="hidden" name="id" value={a.id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton variant={variant} className="h-9 px-3 text-sm">
        {label}
      </SubmitButton>
    </form>
  );
}

/** Appointments booked in the app, for Bookings apps without a website (21 a clinic's visits, with their intake answers). */
export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ show?: string; page?: string; moved?: string }> }) {
  const { app } = await requireClient("bookings");
  const { t, k } = await dashboardText();
  const kind = app?.vertical === "fitness" ? "fitness" : app?.vertical === "clinic" ? "clinic" : "other";
  const title = t("bookings.appointments", { kind });
  const sr = { sr: (chunk: string) => <span className="sr-only">{chunk}</span> };
  if (!app || app.connector?.kind !== "bookings") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={title} description={t("bookings.apptNotHere")} />
      </div>
    );
  }
  const params = await searchParams;
  const past = params.show === "past";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const { rules } = bookingSetup(app);
  const now = new Date();
  const { items, total } = await (await getStore()).listBookingAppointments({
    appId: app.id,
    scope: { kind: past ? "past" : "upcoming", now },
    offset: (page - 1) * PER_PAGE,
    limit: PER_PAGE,
  });
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const tab = (active: boolean) =>
    `inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] no-underline ${active ? "border-midnight bg-midnight font-bold text-ivory hover:text-ivory" : "border-line bg-white text-midnight hover:border-line-strong hover:text-midnight"}`;
  const groups: { value: BookingStatus; label: string }[] = (["pending", "approved", "completed", "cancelled", "rejected", "no_show"] as const).map((value) => ({ value, label: k(BOOKING_STATUS_LABELS[value]) }));

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, then the appointments with their status, search and filters. */}
      <PageHeader title={title} description={richText(t(rules.autoApprove ? "bookings.apptIntroAuto" : "bookings.apptIntroManual"), { zone: () => <bdi dir="ltr">{rules.timezone}</bdi> })} />
      {/* 61 Back from Change time. */}
      {params.moved ? (
        <Notice tone="success" icon="check_circle" role="status">
          {t("bookings.movedDone")}
        </Notice>
      ) : null}
      <Section
        titleId="h-appointments"
        title={`${past ? t("bookings.pastCancelled") : t("bookings.upcoming")} · ${total}`}
        actions={
          <nav aria-label={title} className="flex flex-wrap gap-2">
            <Link href="/dashboard/appointments" aria-current={past ? undefined : "page"} className={tab(!past)}>
              {t("bookings.upcoming")}
            </Link>
            <Link href="/dashboard/appointments?show=past" aria-current={past ? "page" : undefined} className={tab(past)}>
              {t("bookings.pastCancelled")}
            </Link>
          </nav>
        }
        flush
      >
        {items.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="event_available" title={past ? t("bookings.nothingYet") : t("bookings.noUpcoming", { kind })} />
          </div>
        ) : (
          <FilterList
            allLabel={t("common.all")}
            searchLabel={t("bookings.apptSearch")}
            noMatch={t("bookings.apptNoMatch")}
            filters={groups}
            items={items.map((a, i) => {
              const local = utcToLocal(a.startAt, rules.timezone);
              const ended = a.endAt < now;
              return {
                id: a.id,
                text: [a.customerName, a.customerPhone, a.customerEmail, a.serviceName, a.staffName, local.date].filter(Boolean).join(" "),
                group: a.status,
                node: (
                  <li className="flex flex-col gap-3 border-t border-line-soft px-5 py-4 first:border-t-0 sm:px-6">
                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
                      <Thumb icon="event_available" shape="square" tint={i} />
                      <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[15px] font-bold break-words">
                            {local.date} · {local.time} · {a.serviceName}
                          </span>
                          <Badge tone={TONES[a.status]}>{k(BOOKING_STATUS_LABELS[a.status])}</Badge>
                        </span>
                        <span className="text-[13px] text-muted">
                          {a.customerName}
                          {/* 19 Someone who signed in by email is reached by email. */}
                          {a.customerPhone ? (
                            <>
                              {" "}
                              ·{" "}
                              <a href={`tel:${a.customerPhone}`} dir="ltr">
                                {a.customerPhone}
                              </a>
                            </>
                          ) : a.customerEmail ? (
                            <>
                              {" "}
                              · <a href={`mailto:${a.customerEmail}`} className="break-all">{a.customerEmail}</a>
                            </>
                          ) : null}{" "}
                          · {t("bookings.withPrice", { staff: a.staffName, price: formatCents(a.priceCents, a.currency) })}
                        </span>
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {a.status === "pending" ? (
                          <>
                            <Action a={a} status="approved" label={t("bookings.approve")} variant="primary" />
                            <Action a={a} status="rejected" label={t("bookings.reject")} variant="danger" />
                          </>
                        ) : null}
                        {a.status === "approved" && !ended ? <Action a={a} status="cancelled" label={t("common.cancel")} variant="danger" /> : null}
                        {canReschedule(a, now) ? (
                          <Link href={`/dashboard/appointments/${a.id}/move`} className={`${btn.secondary} h-9 px-3 text-sm`}>
                            <Icon name="schedule" size={18} />
                            {t("bookings.changeTime")}
                          </Link>
                        ) : null}
                        {a.status === "approved" && ended ? (
                          <>
                            <Action a={a} status="completed" label={t("bookings.markDone")} />
                            <Action a={a} status="no_show" label={t("bookings.didntCome")} />
                          </>
                        ) : null}
                      </div>
                    </div>
                    {a.notes ? <span className="rounded-xl bg-sand px-4 py-3 text-[15px] text-ink-4">{a.notes}</span> : null}
                    {/* 21 Intake answers: health data, shown here only (never emailed). */}
                    {a.answers?.length ? (
                      <details className="group rounded-xl border border-line-soft">
                        <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-2.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                          <Icon name="assignment" size={18} className="text-muted" />
                          <span className="flex-1">{richText(t("bookings.intakeAnswers", { name: a.customerName }), sr)}</span>
                          <Icon name="expand_more" size={18} className="text-muted transition-transform group-open:rotate-180" />
                        </summary>
                        <dl className="m-0 flex flex-col gap-2 border-t border-line-soft px-3.5 py-3 text-[15px]">
                          {a.answers.map((x) => (
                            <div key={x.id} className="flex flex-col gap-0.5">
                              <dt className="text-[13px] font-semibold text-muted">{x.label}</dt>
                              <dd className="m-0 whitespace-pre-line">{x.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    ) : null}
                  </li>
                ),
              };
            })}
          />
        )}
        {pages > 1 ? (
          <nav aria-label={t("orders.pages")} className="flex items-center justify-between gap-3 border-t border-line-soft px-5 py-3 text-[15px] sm:px-6">
            {page > 1 ? (
              <Link href={`/dashboard/appointments?${past ? "show=past&" : ""}page=${page - 1}`} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
                {t("common.previous")}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-muted">{t("common.page", { page, pages })}</span>
            {page < pages ? (
              <Link href={`/dashboard/appointments?${past ? "show=past&" : ""}page=${page + 1}`} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
                {t("common.next")}
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </Section>
    </div>
  );
}
