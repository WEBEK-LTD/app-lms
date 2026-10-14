import type { Metadata } from "next";
import Link from "next/link";
import { setAppointmentStatusAction } from "@/app/actions/bookings";
import { SubmitButton } from "@/components/form";
import { Badge } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { BOOKING_STATUS_LABELS, bookingSetup, bookingWords } from "@/lib/bookings/setup";
import { utcToLocal } from "@/lib/bookings/time";
import { formatCents } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import type { BookingAppointment, BookingStatus } from "@/lib/data/types";

export async function generateMetadata(): Promise<Metadata> {
  const { app } = await requireClient();
  return { title: bookingWords(app?.vertical).appointments };
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
export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ show?: string; page?: string }> }) {
  const { app } = await requireClient();
  const words = bookingWords(app?.vertical);
  if (!app || app.connector?.kind !== "bookings") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{words.appointments}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">Appointments from your app are in your booking plugin. This page is for businesses without a website.</p>
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
    `flex h-9 items-center rounded-[18px] px-3.5 text-sm no-underline ${active ? "bg-midnight font-semibold text-white hover:text-white" : "border border-line bg-white text-midnight hover:border-midnight hover:text-midnight"}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{words.appointments}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          Booked in your app, in {rules.timezone} time. {rules.autoApprove ? "New ones are approved at once." : "Approve new ones, or reject them."}
        </p>
      </div>
      <nav aria-label={words.appointments} className="flex gap-2.5">
        <Link href="/dashboard/appointments" aria-current={past ? undefined : "page"} className={tab(!past)}>
          Upcoming
        </Link>
        <Link href="/dashboard/appointments?show=past" aria-current={past ? "page" : undefined} className={tab(past)}>
          Past and cancelled
        </Link>
      </nav>
      {items.length === 0 ? (
        <p className="m-0 rounded-2xl border border-line bg-white p-5 text-[15px] text-muted sm:p-6">{past ? "Nothing here yet." : `No upcoming ${words.appointments.toLowerCase()}.`}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {items.map((a) => {
            const local = utcToLocal(a.startAt, rules.timezone);
            const ended = a.endAt < now;
            return (
              <li key={a.id} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[17px] font-bold">
                    {local.date} · {local.time} · {a.serviceName}
                  </span>
                  <Badge tone={TONES[a.status]}>{BOOKING_STATUS_LABELS[a.status]}</Badge>
                </div>
                <span className="text-[15px]">
                  {a.customerName}
                  {/* 19 Someone who signed in by email is reached by email. */}
                  {a.customerPhone ? (
                    <>
                      {" "}
                      · <a href={`tel:${a.customerPhone}`}>{a.customerPhone}</a>
                    </>
                  ) : a.customerEmail ? (
                    <>
                      {" "}
                      · <a href={`mailto:${a.customerEmail}`}>{a.customerEmail}</a>
                    </>
                  ) : null}{" "}
                  · with {a.staffName} · {formatCents(a.priceCents, a.currency)}
                </span>
                {a.notes ? <span className="rounded-xl bg-sand p-3 text-[15px] text-ink-4">{a.notes}</span> : null}
                {/* 21 Intake answers: health data, shown here only (never emailed). */}
                {a.answers?.length ? (
                  <details className="rounded-xl border border-line-soft">
                    <summary className="cursor-pointer px-3 py-2 text-[15px] font-semibold">
                      Intake answers<span className="sr-only"> of {a.customerName}</span>
                    </summary>
                    <dl className="m-0 flex flex-col gap-2 border-t border-line-soft p-3 text-[15px]">
                      {a.answers.map((x) => (
                        <div key={x.id} className="flex flex-col gap-0.5">
                          <dt className="text-[13px] font-semibold text-muted">{x.label}</dt>
                          <dd className="m-0 whitespace-pre-line">{x.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {a.status === "pending" ? (
                    <>
                      <Action a={a} status="approved" label="Approve" variant="primary" />
                      <Action a={a} status="rejected" label="Reject" variant="danger" />
                    </>
                  ) : null}
                  {a.status === "approved" && !ended ? <Action a={a} status="cancelled" label="Cancel" variant="danger" /> : null}
                  {a.status === "approved" && ended ? (
                    <>
                      <Action a={a} status="completed" label="Mark done" />
                      <Action a={a} status="no_show" label="Didn't come" />
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {pages > 1 ? (
        <nav aria-label="Pages" className="flex items-center gap-3 text-[15px]">
          {page > 1 ? <Link href={`/dashboard/appointments?${past ? "show=past&" : ""}page=${page - 1}`}>Previous</Link> : null}
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? <Link href={`/dashboard/appointments?${past ? "show=past&" : ""}page=${page + 1}`}>Next</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}
