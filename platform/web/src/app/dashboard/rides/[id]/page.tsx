import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTime } from "@/components/ui";
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

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="m-0 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
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
      <Link href="/dashboard/rides" className="text-[15px] font-semibold">
        {t("rides.backToRides")}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] sm:text-[30px]">{t("rides.rideTitle", { reference })}</h1>
        <RideStatusBadge status={ride.status} t={t} />
      </div>
      <p className="m-0 text-[15px] text-ink-4">
        {t("rides.askedOn", { date: formatDateTime(ride.createdAt, lang) })}
        {ride.scheduledAt ? ` · ${t("rides.scheduledFor", { date: formatDateTime(ride.scheduledAt, lang) })}` : ""}
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Box title={t("rides.route")}>
          <dl className="m-0 grid gap-3 text-[15px]">
            <div>
              <dt className="text-[13px] text-muted">{t("rides.pickup")}</dt>
              <dd className="m-0">{place(ride.pickup)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">{t("rides.dropoff")}</dt>
              <dd className="m-0">{place(ride.dropoff)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">{t("rides.vehicleType")}</dt>
              <dd className="m-0">{ride.vehicleTypeName}</dd>
            </div>
            {ride.notes ? (
              <div>
                <dt className="text-[13px] text-muted">{t("rides.notes")}</dt>
                <dd className="m-0">{ride.notes}</dd>
              </div>
            ) : null}
          </dl>
        </Box>
        <Box title={t("rides.rider")}>
          <p className="m-0 text-[15px]">
            {ride.riderName}
            {ride.riderPhone ? (
              <span className="block text-[13px] text-muted" dir="ltr">
                {ride.riderPhone}
              </span>
            ) : null}
          </p>
          <h3 className="m-0 text-[15px] font-bold">{t("rides.driver")}</h3>
          <p className="m-0 text-[15px]">
            {ride.driverName ?? <span className="text-muted">{t("rides.noDriver")}</span>}
            {driver ? (
              <span className="block text-[13px] text-muted" dir="auto">
                {[driver.phone ?? driver.email, carText(driver)].filter(Boolean).join(" · ")}
              </span>
            ) : null}
          </p>
        </Box>
      </div>

      <Box title={t("rides.payment")}>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[15px]">
          <li>
            {t(ride.paymentMethod === "cash" ? "rides.cash" : "rides.card")} · {t(ride.paymentStatus === "paid" ? "rides.paid" : ride.paymentStatus === "refunded" ? "rides.refunded" : "rides.unpaid")}
          </li>
          <li>{t("rides.estimate", { fare: money(ride.quotedCents), km: String(ride.estimateKm), minutes: ride.estimateMinutes })}</li>
          {ride.status === "completed" && ride.finalCents !== null ? (
            <li className="font-semibold">{t("rides.finalFare", { fare: money(ride.finalCents), km: String(km), minutes: ride.rideMinutes ?? ride.estimateMinutes })}</li>
          ) : null}
          {ride.waitMinutes ? <li>{t("rides.waited", { minutes: ride.waitMinutes })}</li> : null}
          {ride.promoCode && ride.discountCents > 0 ? <li>{t("rides.discount", { code: ride.promoCode, amount: money(ride.discountCents) })}</li> : null}
          {ride.previousFeeCents > 0 ? <li>{t("rides.previousFee", { amount: money(ride.previousFeeCents) })}</li> : null}
          {ride.commissionCents !== null ? <li>{t("rides.share", { amount: money(ride.commissionCents) })}</li> : null}
          {ride.cancellation ? (
            <li>
              {t("rides.cancelled", { by: t(`rides.by_${ride.cancellation.by}`) })}
              {ride.cancellation.reason ? ` · ${ride.cancellation.reason}` : ""}
              {ride.cancellation.feeCents > 0 ? ` · ${t("rides.cancelledFee", { amount: money(ride.cancellation.feeCents) })}` : ""}
            </li>
          ) : null}
          {ride.rating ? (
            <li>
              {t("rides.rating", { stars: ride.rating.driver })}
              {ride.rating.comment ? ` · “${ride.rating.comment}”` : ""}
            </li>
          ) : null}
        </ul>
      </Box>

      <Box title={t("rides.timeline")}>
        <ol className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
          {ride.timeline.map((s, i) => (
            <li key={i} className="flex flex-wrap gap-2">
              <span className="font-semibold">{t(RIDE_STATUS_KEYS[s.status])}</span>
              <span className="text-muted">{formatDateTime(new Date(s.at), lang)}</span>
              {s.note ? <span className="text-muted">· {s.note}</span> : null}
            </li>
          ))}
        </ol>
      </Box>

      {givable ? (
        <Box title={t("rides.giveToDriver")}>
          <p className="m-0 text-[15px] text-ink-4">{t("rides.giveHint")}</p>
          <GiveRideForm rideId={ride.id} drivers={choices} current={ride.driverId} />
        </Box>
      ) : null}
      {cancellable ? (
        <Box title={t("rides.cancelRide")}>
          <CancelRideForm rideId={ride.id} reference={reference} />
        </Box>
      ) : null}
    </div>
  );
}
