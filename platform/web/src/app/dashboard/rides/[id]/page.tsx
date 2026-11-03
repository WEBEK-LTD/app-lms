import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { formatDateTime, PageHeader, Section } from "@/components/ui";
import { DetailLayout } from "@/components/page-kit";
import { Facts, SideCard, Timeline } from "@/components/page-kit-b";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { exactKm, located } from "@/lib/rides/fares";
import { carText } from "@/lib/rides/notify";
import { DRIVER_ACTIVE, rideReference } from "@/lib/rides/service";
import { mapsLink } from "../../shipments/parts";
import { CancelRideForm, GiveRideForm } from "../forms";
import { isRides, NotRides, RideStatusBadge, RIDE_STATUS_KEYS } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("rides.rides") };
}

/** 105.2 One ride: where from and to, the rider and the driver, the fare and payment, its stages, and the company's steps. */
export default async function RidePage({ params }: { params: Promise<{ id: string }> }) {
  const { app } = await requireClient("orders");
  const { t, lang } = await dashboardText();
  if (!isRides(app)) return <NotRides title={t("rides.rides")} t={t} />;
  const { id } = await params;
  if (!/^\d{1,15}$/.test(id)) notFound();
  const store = await getStore();
  const ride = await store.getRide(app.id, Number(id));
  if (!ride) notFound();
  const [driver, drivers, busy] = await Promise.all([
    ride.driverId !== null ? store.getCourier(app.id, ride.driverId) : null,
    store.listCouriers(app.id),
    store.listRides({ appId: app.id, statuses: DRIVER_ACTIVE, order: "oldest", offset: 0, limit: 2000 }),
  ]);
  const money = (cents: number) => formatCents(cents, ride.currency);
  const reference = rideReference(ride);
  const givable = ["searching", "accepted", "arrived"].includes(ride.status);
  const cancellable = ["scheduled", "searching", "accepted", "arrived", "in_progress"].includes(ride.status);
  const onRide = new Set(busy.items.filter((r) => r.id !== ride.id).map((r) => r.driverId));
  // Free online drivers of its vehicle type first, nearest first; then the rest.
  const choices = drivers
    .filter((d) => d.active && !onRide.has(d.id))
    .map((d) => {
      const km = d.onDuty && d.lat !== null && d.lng !== null && located(ride.pickup) ? Math.round(exactKm({ lat: d.lat, lng: d.lng }, ride.pickup) * 10) / 10 : null;
      const sameType = d.driver?.vehicleTypeId === ride.vehicleTypeId;
      return { d, km, rank: (d.onDuty ? 0 : 2) + (sameType ? 0 : 1) };
    })
    .sort((a, b) => a.rank - b.rank || (a.km ?? 1e9) - (b.km ?? 1e9) || a.d.name.localeCompare(b.d.name))
    .map(({ d, km }) => ({ id: d.id, label: [d.name, d.onDuty ? t("rides.online") : t("rides.offline"), km !== null ? `${km} km` : null].filter(Boolean).join(" · ") }));
  const place = (p: typeof ride.pickup) => (
    <span className="flex flex-col gap-0.5">
      <span>{p.address}</span>
      {p.details ? <span className="text-[13px] text-muted">{p.details}</span> : null}
      {p.lat !== null && p.lng !== null ? (
        <a href={mapsLink(p.lat, p.lng)} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold">
          {t("rides.openMap")}
        </a>
      ) : null}
    </span>
  );
  const km = ride.fareMode === "metered" && ride.meterKm >= 0.1 ? Math.round(ride.meterKm * 10) / 10 : ride.estimateKm;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, then the route, fare and stages beside the rider and driver and the company's steps. */}
      <PageHeader
        back={{ href: "/dashboard/rides", label: t("rides.rides") }}
        title={t("rides.rideTitle", { reference })}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <RideStatusBadge status={ride.status} t={t} />
            <span>
              {t("rides.askedOn", { date: formatDateTime(ride.createdAt, lang) })}
              {ride.scheduledAt ? ` · ${t("rides.scheduledFor", { date: formatDateTime(ride.scheduledAt, lang) })}` : ""}
            </span>
          </span>
        }
      />

      <DetailLayout
        main={
          <>
            <Section titleId="h-route" title={t("rides.route")}>
              <Facts
                items={[
                  { label: t("rides.pickup"), value: place(ride.pickup) },
                  { label: t("rides.dropoff"), value: place(ride.dropoff) },
                  { label: t("rides.vehicleType"), value: ride.vehicleTypeName },
                  ...(ride.notes ? [{ label: t("rides.notes"), value: ride.notes }] : []),
                ]}
              />
            </Section>

            <Section titleId="h-payment" title={t("rides.payment")}>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
                <li className="flex items-center gap-2 font-semibold">
                  <Icon name="payments" size={18} className="text-muted" />
                  {t(ride.paymentMethod === "cash" ? "rides.cash" : "rides.card")} · {t(ride.paymentStatus === "paid" ? "rides.paid" : ride.paymentStatus === "refunded" ? "rides.refunded" : "rides.unpaid")}
                </li>
                <li>{t("rides.estimate", { fare: money(ride.quotedCents), km: String(ride.estimateKm), minutes: ride.estimateMinutes })}</li>
                {ride.status === "completed" && ride.finalCents !== null ? (
                  <li className="rounded-xl bg-sand px-3.5 py-2.5 font-bold">{t("rides.finalFare", { fare: money(ride.finalCents), km: String(km), minutes: ride.rideMinutes ?? ride.estimateMinutes })}</li>
                ) : null}
                {ride.waitMinutes ? <li>{t("rides.waited", { minutes: ride.waitMinutes })}</li> : null}
                {ride.promoCode && ride.discountCents > 0 ? <li>{t("rides.discount", { code: ride.promoCode, amount: money(ride.discountCents) })}</li> : null}
                {ride.previousFeeCents > 0 ? <li>{t("rides.previousFee", { amount: money(ride.previousFeeCents) })}</li> : null}
                {ride.commissionCents !== null ? <li className="text-muted">{t("rides.share", { amount: money(ride.commissionCents) })}</li> : null}
                {ride.cancellation ? (
                  <li>
                    {t("rides.cancelled", { by: t(`rides.by_${ride.cancellation.by}`) })}
                    {ride.cancellation.reason ? ` · ${ride.cancellation.reason}` : ""}
                    {ride.cancellation.feeCents > 0 ? ` · ${t("rides.cancelledFee", { amount: money(ride.cancellation.feeCents) })}` : ""}
                  </li>
                ) : null}
                {ride.rating ? (
                  <li className="flex items-center gap-1.5">
                    <Icon name="star" size={18} filled className="text-ember" />
                    {t("rides.rating", { stars: ride.rating.driver })}
                    {ride.rating.comment ? ` · “${ride.rating.comment}”` : ""}
                  </li>
                ) : null}
              </ul>
            </Section>

            <Section titleId="h-timeline" title={t("rides.timeline")}>
              <Timeline items={ride.timeline.map((st, i) => ({ key: String(i), title: t(RIDE_STATUS_KEYS[st.status]), meta: formatDateTime(new Date(st.at), lang), note: st.note || undefined }))} />
            </Section>
          </>
        }
        side={
          <>
            <SideCard titleId="h-people" icon="person" title={t("rides.rider")}>
              <p className="m-0 text-[15px]">
                {ride.riderName}
                {ride.riderPhone ? (
                  <span className="block text-[13px] text-muted" dir="ltr">
                    {ride.riderPhone}
                  </span>
                ) : null}
              </p>
              <h3 className="m-0 flex items-center gap-1.5 border-t border-line-soft pt-3 text-[15px] font-bold">
                <Icon name="directions_car" size={18} />
                {t("rides.driver")}
              </h3>
              <p className="m-0 text-[15px]">
                {ride.driverName ?? <span className="text-muted">{t("rides.noDriver")}</span>}
                {driver ? (
                  <span className="block text-[13px] text-muted" dir="auto">
                    {[driver.phone ?? driver.email, carText(driver)].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
              </p>
            </SideCard>
            {givable ? (
              <SideCard titleId="h-give" icon="route" title={t("rides.giveToDriver")}>
                <p className="m-0 text-[13px] text-muted">{t("rides.giveHint")}</p>
                <GiveRideForm rideId={ride.id} drivers={choices} current={ride.driverId} />
              </SideCard>
            ) : null}
            {cancellable ? (
              <SideCard titleId="h-cancel" icon="cancel" title={t("rides.cancelRide")}>
                <CancelRideForm rideId={ride.id} reference={reference} />
              </SideCard>
            ) : null}
          </>
        }
      />
    </div>
  );
}
