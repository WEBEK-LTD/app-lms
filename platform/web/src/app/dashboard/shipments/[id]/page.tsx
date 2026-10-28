import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { formatDateTime } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { richText } from "@/i18n/rich";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { PackageSize, ShipmentPlace, ShipmentStage } from "@/lib/data/types";
import { COMPANY_STEPS, LIVE_STATUSES, shipmentReference } from "@/lib/delivery/service";
import { AssignForm, MoveForm } from "../forms";
import { isDelivery, mapsLink, NotDelivery, ShipmentStatusBadge, STATUS_KEYS } from "../parts";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { t } = await dashboardText();
  return { title: /^\d{1,15}$/.test(id) ? t("delivery.shipmentTitle", { reference: shipmentReference({ id: Number(id) }) }) : t("delivery.shipments") };
}

const SIZE_KEYS: Record<PackageSize, DashKey> = { small: "delivery.sizeSmall", medium: "delivery.sizeMedium", large: "delivery.sizeLarge" };
const BY_KEYS: Record<NonNullable<ShipmentStage["by"]>, DashKey> = {
  customer: "delivery.byCustomer",
  courier: "delivery.byCourier",
  company: "delivery.byCompany",
  payment: "delivery.byPayment",
};

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="m-0 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

/** 104 One shipment: its places, parcel and payment, its stages, and giving it to a courier or moving it on. */
export default async function ShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { app } = await requireClient("orders");
  const { t, lang } = await dashboardText();
  if (!isDelivery(app)) return <NotDelivery title={t("delivery.shipments")} t={t} />;
  const { id } = await params;
  if (!/^\d{1,15}$/.test(id)) notFound();
  const store = await getStore();
  const shipment = await store.getShipment(app.id, Number(id));
  if (!shipment) notFound();
  const couriers = await store.listCouriers(app.id);
  const courier = shipment.courierId !== null ? (couriers.find((c) => c.id === shipment.courierId) ?? null) : null;
  const steps = COMPANY_STEPS[shipment.status] ?? [];
  const canGive = shipment.status === "pending" || shipment.status === "assigned";
  const active = couriers.filter((c) => c.active);
  const live = courier && LIVE_STATUSES.includes(shipment.status) && courier.lat !== null && courier.lng !== null && courier.locatedAt;

  const place = (title: string, p: ShipmentPlace) => (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] font-semibold text-muted">{title}</span>
      <span className="text-[15px]">{p.address}</span>
      {p.details ? <span className="text-[13px] text-ink-4">{t("delivery.details", { details: p.details })}</span> : null}
      {p.lat !== null && p.lng !== null ? (
        <a href={mapsLink(p.lat, p.lng)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold">
          <Icon name="pin_drop" size={16} />
          {t("delivery.openMap")}
        </a>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/shipments" className="text-[15px] font-semibold">
        {t("delivery.backToShipments")}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] sm:text-[30px]">{t("delivery.shipmentTitle", { reference: shipmentReference(shipment) })}</h1>
        <ShipmentStatusBadge status={shipment.status} t={t} />
      </div>
      <p className="m-0 -mt-3 text-[15px] text-muted">{t("delivery.sentOn", { date: formatDateTime(shipment.createdAt, lang) })}</p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          <Box title={`${t("delivery.pickup")} → ${t("delivery.dropoff")}`}>
            <div className="grid gap-4 sm:grid-cols-2">
              {place(t("delivery.pickup"), shipment.pickup)}
              {place(t("delivery.dropoff"), shipment.dropoff)}
            </div>
            <dl className="m-0 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div className="flex flex-col gap-0.5">
                <dt className="text-[13px] font-semibold text-muted">{t("delivery.sender")}</dt>
                <dd className="m-0 text-[15px]">
                  {shipment.senderName}
                  {shipment.senderPhone ? (
                    <a href={`tel:${shipment.senderPhone}`} dir="ltr" className="block text-[13px]">
                      {shipment.senderPhone}
                    </a>
                  ) : null}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-[13px] font-semibold text-muted">{t("delivery.recipient")}</dt>
                <dd className="m-0 text-[15px]">
                  {shipment.recipientName}
                  <a href={`tel:${shipment.recipientPhone}`} dir="ltr" className="block text-[13px]">
                    {shipment.recipientPhone}
                  </a>
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-[13px] font-semibold text-muted">{t("delivery.parcel")}</dt>
                <dd className="m-0 text-[15px]">
                  {t(SIZE_KEYS[shipment.packageSize])}
                  {shipment.packageDescription ? ` · ${shipment.packageDescription}` : ""}
                </dd>
              </div>
              {shipment.serviceName ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[13px] font-semibold text-muted">{t("delivery.service")}</dt>
                  <dd className="m-0 text-[15px]">{shipment.serviceName}</dd>
                </div>
              ) : null}
              {shipment.zoneName ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[13px] font-semibold text-muted">{t("delivery.zone")}</dt>
                  <dd className="m-0 text-[15px]">{shipment.zoneName}</dd>
                </div>
              ) : null}
              {shipment.distanceKm !== null ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[13px] font-semibold text-muted">{t("delivery.route")}</dt>
                  <dd className="m-0 text-[15px]">{t("delivery.distance", { km: shipment.distanceKm })}</dd>
                </div>
              ) : null}
              {shipment.notes ? (
                <div className="flex flex-col gap-0.5 sm:col-span-2">
                  <dt className="text-[13px] font-semibold text-muted">{t("delivery.notes")}</dt>
                  <dd className="m-0 text-[15px]">{shipment.notes}</dd>
                </div>
              ) : null}
            </dl>
          </Box>

          <Box title={t("delivery.timeline")}>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {shipment.timeline.map((s, i) => (
                <li key={`${s.at}-${i}`} className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-midnight" aria-hidden />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">{t(STATUS_KEYS[s.status])}</span>
                    <span className="text-[13px] text-muted">
                      {formatDateTime(new Date(s.at), lang)}
                      {s.by ? ` · ${t(BY_KEYS[s.by])}` : ""}
                    </span>
                    {s.note ? <span className="text-[13px] text-ink-4">{s.note}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </Box>
        </div>

        <div className="flex flex-col gap-5">
          <Box title={t("delivery.payment")}>
            <p className="m-0 text-[22px] font-extrabold">{formatCents(shipment.priceCents, shipment.currency)}</p>
            <p className="m-0 text-[15px]">
              {t(shipment.paymentMethod === "cash" ? "delivery.cash" : "delivery.card")} ·{" "}
              {t(shipment.paymentStatus === "paid" ? "delivery.paid" : shipment.paymentStatus === "refunded" ? "delivery.refunded" : "delivery.unpaid")}
            </p>
            {shipment.paymentMethod === "card" && shipment.paymentStatus === "paid" && shipment.status === "cancelled" ? (
              <p role="note" className="m-0 rounded-xl bg-peach-soft px-4 py-3 text-[15px]">
                {richText(t("delivery.refundDue"), { link: (chunk) => <Link href="/dashboard/orders">{chunk}</Link> })}
              </p>
            ) : shipment.orderId !== null && shipment.paymentStatus !== "unpaid" ? (
              <Link href="/dashboard/orders" className="text-[15px] font-semibold">
                {t("delivery.cardOrder")}
              </Link>
            ) : null}
          </Box>

          <Box title={t("delivery.courier")}>
            {shipment.courierName ? (
              <p className="m-0 text-[15px]">
                {shipment.courierName}
                {courier?.phone ? (
                  <a href={`tel:${courier.phone}`} dir="ltr" className="block text-[13px]">
                    {courier.phone}
                  </a>
                ) : null}
              </p>
            ) : (
              <p className="m-0 text-[15px] text-muted">{t("delivery.noCourier")}</p>
            )}
            {live ? (
              <a href={mapsLink(courier.lat!, courier.lng!)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[15px] font-semibold">
                <Icon name="my_location" size={18} />
                {t("delivery.liveNow", { time: formatDateTime(courier.locatedAt!, lang) })}
              </a>
            ) : null}
            {canGive ? (
              <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
                <h3 className="m-0 text-[15px] font-bold">{t("delivery.giveTo")}</h3>
                <p className="m-0 text-[13px] text-muted">{t("delivery.giveToText")}</p>
                {active.length === 0 ? (
                  <p className="m-0 text-[15px]">{richText(t("delivery.noCouriers"), { link: (chunk) => <Link href="/dashboard/couriers">{chunk}</Link> })}</p>
                ) : (
                  <AssignForm
                    shipmentId={shipment.id}
                    current={shipment.courierId}
                    couriers={active.map((c) => ({ id: c.id, label: `${c.name} · ${t(c.onDuty ? "delivery.onDuty" : "delivery.offDuty")}` }))}
                  />
                )}
              </div>
            ) : null}
          </Box>

          {steps.length > 0 ? (
            <Box title={t("delivery.moveTo")}>
              <p className="m-0 text-[13px] text-muted">{t("delivery.moveToText")}</p>
              <MoveForm shipmentId={shipment.id} steps={steps.map((s) => ({ value: s, label: t(STATUS_KEYS[s]) }))} />
            </Box>
          ) : null}
        </div>
      </div>
    </div>
  );
}
