export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { travelBookingAction } from "@/app/actions/travel";
import { DetailLayout } from "@/components/page-kit";
import { btn, PageHeader, Section } from "@/components/ui";
import type { DashKey, DashT } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { TravelLine } from "@/lib/data/types";
import { dueCents } from "@/lib/travel/pricing";
import { ConfirmButton } from "../../../chat/forms";
import { BookingStatusBadge, isTravel, NotTravel, PaymentBadge } from "../../parts";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { app } = await requireClient("orders");
  const booking = app ? await (await getStore()).getTravelBooking(app.id, Number((await params).id)) : null;
  return { title: booking?.reference ?? (await dashboardText()).t("travel.bookings") };
}

function lineLabel(t: DashT, line: TravelLine): string {
  return t(`travel.line_${line.kind}` as DashKey, { count: line.count });
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="m-0 grid gap-x-6 gap-y-2 text-[15px] sm:grid-cols-[180px_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-semibold text-muted">{k}</dt>
          <dd className="m-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 126 A booking: the stay, the flights and seats, the travellers, the price, the payment, and what the company can do with it. */
export default async function TravelBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { app } = await requireClient("orders");
  const { t, date } = await dashboardText();
  if (!isTravel(app)) return <NotTravel title={t("travel.bookings")} t={t} />;
  const store = await getStore();
  const id = Number((await params).id);
  const b = Number.isSafeInteger(id) ? await store.getTravelBooking(app.id, id) : null;
  if (!b) notFound();
  const money = (cents: number) => formatCents(cents, b.currency);
  const legs = [b.flight?.outbound, b.flight?.inbound].filter((l) => !!l);
  const flights = await Promise.all(legs.map((l) => store.getTravelFlight(app.id, l!.flightId)));
  const due = dueCents(b);
  const act = (op: string, label: string, confirm?: string) => (
    <form action={travelBookingAction}>
      <input type="hidden" name="id" value={b.id} />
      <input type="hidden" name="op" value={op} />
      {confirm ? (
        <ConfirmButton confirm={confirm} className={`${btn.danger} h-10 px-4 text-sm`}>
          {label}
        </ConfirmButton>
      ) : (
        <button type="submit" className={`${btn.secondary} h-10 px-4 text-sm`}>
          {label}
        </button>
      )}
    </form>
  );
  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: "/dashboard/travel/bookings", label: t("travel.backToBookings") }} title={t("travel.booking", { reference: b.reference })} description={`${t(`travel.kind_${b.kind}` as DashKey)} · ${date(b.createdAt)}`} />
      <DetailLayout
        main={
          <>
            {b.stay ? (
              <Section titleId="h-stay" title={t("travel.stay")}>
                <Facts
                  rows={[
                    [t("travel.details"), b.stay.hotelName],
                    [t("travel.rooms"), `${b.stay.roomName} × ${b.stay.rooms} · ${b.stay.rateName}`],
                    [t("travel.dates"), `${b.stay.checkIn} → ${b.stay.checkOut} · ${t("travel.nights", { count: b.stay.nights.length })}`],
                    [t("travel.guests", { count: b.stay.guests }), t(`travel.board_${b.stay.board}` as DashKey)],
                    ...(b.stay.freeCancelUntil ? [[t("travel.refundable"), b.stay.freeCancelUntil] as [string, string]] : []),
                  ]}
                />
              </Section>
            ) : null}
            {legs.length ? (
              <Section titleId="h-flights" title={t("travel.flightsOfBooking")}>
                <Facts
                  rows={legs.map((l, i) => {
                    const f = flights[i];
                    return [
                      `${l!.number} · ${l!.fareName}`,
                      `${f ? `${f.from.code} → ${f.to.code} · ${f.departs.replace("T", " ")} · ${t(`travel.fs_${f.status}` as DashKey)}` : ""} · ${t("travel.seatsOf", { seats: l!.seats.map((s) => s ?? "—").join(", ") })}`,
                    ] as [string, string];
                  })}
                />
                {b.transfer ? <p className="m-0 text-[15px]">{`${t("travel.transfer")}: ${b.transfer.note ?? ""}`}</p> : null}
              </Section>
            ) : null}
            <Section titleId="h-travellers" title={t("travel.travellers")}>
              <Facts
                rows={[
                  ...b.travellers.map((p, i) => [`${i + 1}`, `${p.firstName} ${p.lastName}`] as [string, string]),
                  [t("travel.contact"), [b.contact.name, b.contact.email, b.contact.phone].filter(Boolean).join(" · ")],
                  ...(b.requests.length ? [[t("travel.requests"), b.requests.map((r) => t(`travel.rq_${r}` as DashKey)).join(" · ")] as [string, string]] : []),
                  ...(b.note ? [[t("travel.note"), b.note] as [string, string]] : []),
                ]}
              />
            </Section>
            <Section titleId="h-price" title={t("travel.lines")}>
              <Facts rows={[...b.lines.map((l) => [lineLabel(t, l), l.cents < 0 ? `−${money(-l.cents)}` : money(l.cents)] as [string, string]), [t("travel.total"), money(b.totalCents)]]} />
            </Section>
            {b.changes.length ? (
              <Section titleId="h-history" title={t("travel.history")}>
                <Facts rows={b.changes.map((c) => [date(new Date(c.at)), c.what] as [string, string])} />
              </Section>
            ) : null}
          </>
        }
        side={
          <Section titleId="h-payment" title={t("travel.payment")}>
            <div className="flex flex-wrap gap-2">
              <BookingStatusBadge status={b.status} t={t} />
              <PaymentBadge status={b.paymentStatus} t={t} />
            </div>
            <Facts
              rows={[
                [t("travel.total"), money(b.totalCents)],
                [t("travel.paid"), money(b.paidCents)],
                ...(due > 0 ? [[t("travel.due"), money(due)] as [string, string]] : []),
                ...(b.refundCents > 0 ? [[t("travel.refundDue"), money(b.refundCents)] as [string, string]] : []),
              ]}
            />
            <div className="flex flex-col gap-2">
              {b.status === "awaiting_payment" || (b.paymentMethod === "at_hotel" && b.paymentStatus === "at_hotel") ? act("paid", t("travel.markPaid")) : null}
              {b.paymentStatus === "refund_due" ? act("refunded", t("travel.markRefunded")) : null}
              {b.status === "confirmed" || b.status === "awaiting_payment" ? act("cancel", t("travel.cancelBooking"), t("travel.cancelConfirm", { reference: b.reference })) : null}
              <Link href="/dashboard/chat" className={`${btn.secondary} h-10 px-4 text-sm`}>
                {t("travel.messageTraveller")}
              </Link>
            </div>
          </Section>
        }
      />
    </div>
  );
}
