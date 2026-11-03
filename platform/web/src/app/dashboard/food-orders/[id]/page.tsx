import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { formatDateTime, Notice, PageHeader, Section } from "@/components/ui";
import { DetailLayout, ItemList } from "@/components/page-kit";
import { Facts, SideCard, Timeline } from "@/components/page-kit-b";
import { richText } from "@/i18n/rich";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { shipmentReference } from "@/lib/delivery/service";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { FOOD_COMPANY_STEPS, foodOrderReference } from "@/lib/food/service";
import { isFood, mapsLink } from "../../shipments/parts";
import { OrderStepForm } from "../../restaurants/forms";
import { FoodStatusBadge, FOOD_STATUS_KEYS, NotFood, percentOf } from "../../restaurants/parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("food.foodOrders") };
}

/** 105.1 One food order: its dishes, the customer and where it goes, payment and the company's share, its stages and the company's steps. */
export default async function FoodOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { app } = await requireClient("orders");
  const { t, lang } = await dashboardText();
  if (!isFood(app)) return <NotFood title={t("food.foodOrders")} t={t} />;
  const { id } = await params;
  if (!/^\d{1,15}$/.test(id)) notFound();
  const store = await getStore();
  const order = await store.getFoodOrder(app.id, Number(id));
  if (!order) notFound();
  const [restaurant, job, settings] = await Promise.all([
    order.restaurantId !== null ? store.getRestaurant(app.id, order.restaurantId) : null,
    order.shipmentId !== null ? store.getShipment(app.id, order.shipmentId) : null,
    store.getDeliverySettings(app.id).then(deliverySettingsOf),
  ]);
  const steps = FOOD_COMPANY_STEPS[order.status] ?? [];
  const money = (cents: number) => formatCents(cents, order.currency);
  const d = order.dropoff;
  const share = order.subtotalCents > 0 ? percentOf(Math.round((order.commissionCents / order.subtotalCents) * 10_000)) : "0";
  const refundDue = order.paymentMethod === "card" && order.paymentStatus === "paid" && ["rejected", "cancelled", "failed"].includes(order.status);

  const facts = [
    {
      label: t("food.customer"),
      value: (
        <>
          {order.customerName}
          <a href={`tel:${order.customerPhone}`} dir="ltr" className="block text-[13px]">
            {order.customerPhone}
          </a>
        </>
      ),
    },
    {
      label: t("food.deliverTo"),
      value: (
        <span className="flex flex-col gap-0.5">
          {d.address}
          {d.details ? <span className="text-[13px] text-ink-4">{d.details}</span> : null}
          {d.lat !== null && d.lng !== null ? (
            <a href={mapsLink(d.lat, d.lng)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold">
              <Icon name="pin_drop" size={16} />
              {t("food.openMap")}
            </a>
          ) : null}
        </span>
      ),
    },
    {
      label: t("food.payment"),
      value: `${t(order.paymentMethod === "cash" ? "food.payCash" : "food.payCard")} · ${t(order.paymentStatus === "paid" ? "food.paid" : order.paymentStatus === "refunded" ? "food.refunded" : "food.unpaid")}`,
    },
    ...(order.notes ? [{ label: t("food.customerNotes"), value: order.notes }] : []),
    ...(order.readyAt && (order.status === "accepted" || order.status === "ready") ? [{ label: t("food.status_accepted"), value: t("food.readyAround", { time: formatDateTime(order.readyAt, lang) }) }] : []),
    ...(order.rejection
      ? [{ label: t("food.status_rejected"), value: `${t("food.turnedDown", { reason: t(`food.reason_${order.rejection.reason}`) })}${order.rejection.note ? ` · ${order.rejection.note}` : ""}` }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, then the dishes and where they go beside the company's steps, the courier's job and the order's stages. */}
      <PageHeader
        back={{ href: "/dashboard/food-orders", label: t("food.foodOrders") }}
        title={t("food.orderTitle", { reference: foodOrderReference(order) })}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <FoodStatusBadge status={order.status} t={t} />
            <span>
              {t("food.placedOn", { date: formatDateTime(order.createdAt, lang) })}
              {" · "}
              {restaurant ? <Link href={`/dashboard/restaurants/${restaurant.id}`}>{order.restaurantName}</Link> : order.restaurantName}
            </span>
          </span>
        }
      />
      {refundDue ? (
        <Notice tone="warn" icon="warning">
          {richText(t("food.refundDue"), { link: (chunk) => <Link href="/dashboard/orders">{chunk}</Link> })}
        </Notice>
      ) : null}

      <DetailLayout
        main={
          <>
            <Section titleId="h-dishes" title={t("food.dishes")} flush>
              <ItemList>
                {order.lines.map((l, i) => (
                  <li key={i} className="flex items-start gap-3 border-t border-line-soft px-5 py-3 first:border-t-0 sm:px-6">
                    <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-[10px] bg-ivory px-2 text-[15px] font-extrabold tabular-nums">{l.quantity}×</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-semibold">{l.name}</span>
                      {l.choices.length ? <span className="text-[13px] text-ink-4">{l.choices.join(" · ")}</span> : null}
                      {l.note ? <span className="text-[13px] text-muted">“{l.note}”</span> : null}
                    </span>
                    <span className="text-[15px] whitespace-nowrap tabular-nums">{money(l.unitCents * l.quantity)}</span>
                  </li>
                ))}
              </ItemList>
              <dl className="m-0 flex flex-col gap-1.5 border-t border-line bg-sand px-5 py-4 text-[15px] sm:px-6">
                {(
                  [
                    [t("food.dishes"), money(order.subtotalCents)],
                    [t("food.deliveryFee"), money(order.deliveryFeeCents)],
                    [t("food.total"), money(order.totalCents)],
                    [t("food.share", { percent: share }), money(order.commissionCents)],
                  ] as const
                ).map(([label, value], i) => (
                  <div key={label} className={`flex justify-between gap-3 ${i === 2 ? "text-[17px] font-extrabold" : i === 3 ? "text-muted" : ""}`}>
                    <dt>{label}</dt>
                    <dd className="m-0 tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </Section>

            <Section titleId="h-deliver" title={t("food.deliverTo")}>
              <Facts items={facts} />
            </Section>

            {order.rating ? (
              <Section titleId="h-rating" title={t("food.ratingTitle")}>
                <p className="m-0 flex items-center gap-1.5 text-[15px]">
                  <Icon name="star" size={18} filled className="text-ember" />
                  {t("food.ratingRestaurant", { stars: order.rating.restaurant })}
                  {order.rating.courier !== null ? ` · ${t("food.ratingCourier", { stars: order.rating.courier })}` : ""}
                </p>
                {order.rating.comment ? <p className="m-0 text-[15px] text-ink-4">“{order.rating.comment}”</p> : null}
              </Section>
            ) : null}
          </>
        }
        side={
          <>
            {steps.length ? (
              <SideCard titleId="h-step" icon="touch_app" title={t("food.stepIn")}>
                <p className="m-0 text-sm text-ink-4">{t("food.stepInText")}</p>
                <OrderStepForm order={order.id} steps={steps} prepMinutes={restaurant?.prepMinutes ?? 20} />
              </SideCard>
            ) : null}

            <SideCard titleId="h-job" icon="two_wheeler" title={t("food.courierJob")}>
              {job ? (
                <Link href={`/dashboard/shipments/${job.id}`} className="inline-flex items-center gap-1.5 text-[15px] font-semibold">
                  <Icon name="package_2" size={18} />
                  {t("food.openJob", { reference: shipmentReference(job) })}
                </Link>
              ) : (
                <p className="m-0 text-[15px] text-muted">{t("food.jobLater", { when: t((settings.foodCourierJob ?? "accepted") === "ready" ? "food.jobOnReady" : "food.jobOnAccept") })}</p>
              )}
              {job?.courierName ? <p className="m-0 text-[15px]">{job.courierName}</p> : null}
            </SideCard>

            <SideCard titleId="h-timeline" icon="schedule" title={t("food.timeline")}>
              <Timeline
                items={order.timeline.map((st, i) => ({
                  key: String(i),
                  title: t(FOOD_STATUS_KEYS[st.status]),
                  meta: `${formatDateTime(new Date(st.at), lang)}${st.by ? ` · ${t(`food.by_${st.by}`)}` : ""}`,
                  note: st.note || undefined,
                }))}
              />
            </SideCard>
          </>
        }
      />
    </div>
  );
}
