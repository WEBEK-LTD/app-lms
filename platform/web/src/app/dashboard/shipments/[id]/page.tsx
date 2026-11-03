import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { formatDateTime, Notice, PageHeader, Section } from "@/components/ui";
import { DetailLayout } from "@/components/page-kit";
import { Facts, SideCard, Timeline } from "@/components/page-kit-b";
import type { DashKey } from "@/i18n/dashboard";
import { richText } from "@/i18n/rich";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { PackageSize, ShipmentPlace, ShipmentStage } from "@/lib/data/types";
import { COMPANY_STEPS, LIVE_STATUSES, shipmentReference } from "@/lib/delivery/service";
import { courierMayHave, reviewUserId } from "@/lib/delivery/review";
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
  // 104.7 The store review account's parcels go to the review courier only, and it gets no others.
  const reviewId = await reviewUserId(store, app);
  const active = couriers.filter((c) => c.active && courierMayHave(app, c, shipment, reviewId));
  const live = courier && LIVE_STATUSES.includes(shipment.status) && courier.lat !== null && courier.lng !== null && courier.locatedAt;

  const place = (title: string, p: ShipmentPlace) => (
    <div className="flex flex-col gap-1 rounded-xl bg-sand p-3.5">
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

  const contact = (name: string, phone: string | null) => (
    <>
      {name}
      {phone ? (
        <a href={`tel:${phone}`} dir="ltr" className="block text-[13px]">
          {phone}
        </a>
      ) : null}
    </>
  );
  const facts = [
    { label: t("delivery.sender"), value: contact(shipment.senderName, shipment.senderPhone) },
    { label: t("delivery.recipient"), value: contact(shipment.recipientName, shipment.recipientPhone) },
    { label: t("delivery.parcel"), value: `${t(SIZE_KEYS[shipment.packageSize])}${shipment.packageDescription ? ` · ${shipment.packageDescription}` : ""}` },
    ...(shipment.serviceName ? [{ label: t("delivery.service"), value: shipment.serviceName }] : []),
    ...(shipment.zoneName ? [{ label: t("delivery.zone"), value: shipment.zoneName }] : []),
    ...(shipment.distanceKm !== null ? [{ label: t("delivery.route"), value: t("delivery.distance", { km: shipment.distanceKm }) }] : []),
    ...(shipment.notes ? [{ label: t("delivery.notes"), value: shipment.notes, wide: true }] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, then the places, parcel and stages beside the payment, the courier and the next step. */}
      <PageHeader
        back={{ href: "/dashboard/shipments", label: t("delivery.shipments") }}
        title={t("delivery.shipmentTitle", { reference: shipmentReference(shipment) })}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ShipmentStatusBadge status={shipment.status} t={t} />
            {t("delivery.sentOn", { date: formatDateTime(shipment.createdAt, lang) })}
          </span>
        }
      />

      <DetailLayout
        main={
          <>
            <Section titleId="h-route" title={`${t("delivery.pickup")} → ${t("delivery.dropoff")}`}>
              <div className="grid gap-3 sm:grid-cols-2">
                {place(t("delivery.pickup"), shipment.pickup)}
                {place(t("delivery.dropoff"), shipment.dropoff)}
              </div>
              <Facts items={facts} />
            </Section>
            <Section titleId="h-timeline" title={t("delivery.timeline")}>
              <Timeline
                items={shipment.timeline.map((st, i) => ({
                  key: `${st.at}-${i}`,
                  title: t(STATUS_KEYS[st.status]),
                  meta: `${formatDateTime(new Date(st.at), lang)}${st.by ? ` · ${t(BY_KEYS[st.by])}` : ""}`,
                  note: st.note || undefined,
                }))}
              />
            </Section>
          </>
        }
        side={
          <>
            <SideCard titleId="h-payment" icon="payments" title={t("delivery.payment")}>
              <p className="m-0 text-[24px] leading-tight font-extrabold tabular-nums">{formatCents(shipment.priceCents, shipment.currency)}</p>
              <p className="m-0 text-[15px] text-ink-4">
                {t(shipment.paymentMethod === "cash" ? "delivery.cash" : "delivery.card")} ·{" "}
                {t(shipment.paymentStatus === "paid" ? "delivery.paid" : shipment.paymentStatus === "refunded" ? "delivery.refunded" : "delivery.unpaid")}
              </p>
              {shipment.paymentMethod === "card" && shipment.paymentStatus === "paid" && shipment.status === "cancelled" ? (
                <Notice tone="warn" icon="warning">
                  {richText(t("delivery.refundDue"), { link: (chunk) => <Link href="/dashboard/orders">{chunk}</Link> })}
                </Notice>
              ) : shipment.orderId !== null && shipment.paymentStatus !== "unpaid" ? (
                <Link href="/dashboard/orders" className="text-[15px] font-semibold">
                  {t("delivery.cardOrder")}
                </Link>
              ) : null}
            </SideCard>

            <SideCard titleId="h-courier" icon="two_wheeler" title={t("delivery.courier")}>
              {shipment.courierName ? <p className="m-0 text-[15px]">{contact(shipment.courierName, courier?.phone ?? null)}</p> : <p className="m-0 text-[15px] text-muted">{t("delivery.noCourier")}</p>}
              {live ? (
                <a href={mapsLink(courier.lat!, courier.lng!)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[15px] font-semibold">
                  <Icon name="my_location" size={18} />
                  {t("delivery.liveNow", { time: formatDateTime(courier.locatedAt!, lang) })}
                </a>
              ) : null}
              {canGive ? (
                <div className="flex flex-col gap-2 border-t border-line-soft pt-3">
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
            </SideCard>

            {steps.length > 0 ? (
              <SideCard titleId="h-move" icon="route" title={t("delivery.moveTo")}>
                <p className="m-0 text-[13px] text-muted">{t("delivery.moveToText")}</p>
                <MoveForm shipmentId={shipment.id} steps={steps.map((st) => ({ value: st, label: t(STATUS_KEYS[st]) }))} />
              </SideCard>
            ) : null}
          </>
        }
      />
    </div>
  );
}
