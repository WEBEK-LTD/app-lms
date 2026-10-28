import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { formatDateTime } from "@/components/ui";
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

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="m-0 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
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

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/food-orders" className="text-[15px] font-semibold">
        {t("food.backToOrders")}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] sm:text-[30px]">{t("food.orderTitle", { reference: foodOrderReference(order) })}</h1>
        <FoodStatusBadge status={order.status} t={t} />
      </div>
      <p className="m-0 -mt-3 text-[15px] text-muted">
        {t("food.placedOn", { date: formatDateTime(order.createdAt, lang) })}
        {restaurant ? (
          <>
            {" · "}
            <Link href={`/dashboard/restaurants/${restaurant.id}`}>{order.restaurantName}</Link>
          </>
        ) : (
          ` · ${order.restaurantName}`
        )}
      </p>
      {refundDue ? (
        <p role="note" className="m-0 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
          {richText(t("food.refundDue"), { link: (chunk) => <Link href="/dashboard/orders">{chunk}</Link> })}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          <Box title={t("food.dishes")}>
            <ul className="m-0 flex list-none flex-col p-0">
              {order.lines.map((l, i) => (
                <li key={i} className="flex items-start gap-3 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                  <span className="min-w-8 text-[15px] font-bold">{l.quantity}×</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">{l.name}</span>
                    {l.choices.length ? <span className="text-[13px] text-ink-4">{l.choices.join(" · ")}</span> : null}
                    {l.note ? <span className="text-[13px] text-muted">“{l.note}”</span> : null}
                  </span>
                  <span className="text-[15px] whitespace-nowrap">{money(l.unitCents * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="m-0 flex flex-col gap-1.5 border-t border-line pt-3 text-[15px]">
              {(
                [
                  [t("food.dishes"), money(order.subtotalCents)],
                  [t("food.deliveryFee"), money(order.deliveryFeeCents)],
                  [t("food.total"), money(order.totalCents)],
                  [t("food.share", { percent: share }), money(order.commissionCents)],
                ] as const
              ).map(([label, value], i) => (
                <div key={label} className={`flex justify-between gap-3 ${i === 2 ? "font-bold" : i === 3 ? "text-muted" : ""}`}>
                  <dt>{label}</dt>
                  <dd className="m-0">{value}</dd>
                </div>
              ))}
            </dl>
          </Box>

          <Box title={t("food.deliverTo")}>
            <dl className="m-0 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div className="flex flex-col gap-0.5">
                <dt className="text-[13px] font-semibold text-muted">{t("food.customer")}</dt>
                <dd className="m-0 text-[15px]">
                  {order.customerName}
                  <a href={`tel:${order.customerPhone}`} dir="ltr" className="block text-[13px]">
                    {order.customerPhone}
                  </a>
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-[13px] font-semibold text-muted">{t("food.deliverTo")}</dt>
                <dd className="m-0 flex flex-col gap-0.5 text-[15px]">
                  {d.address}
                  {d.details ? <span className="text-[13px] text-ink-4">{d.details}</span> : null}
                  {d.lat !== null && d.lng !== null ? (
                    <a href={mapsLink(d.lat, d.lng)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold">
                      <Icon name="pin_drop" size={16} />
                      {t("food.openMap")}
                    </a>
                  ) : null}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-[13px] font-semibold text-muted">{t("food.payment")}</dt>
                <dd className="m-0 text-[15px]">
                  {t(order.paymentMethod === "cash" ? "food.payCash" : "food.payCard")} · {t(order.paymentStatus === "paid" ? "food.paid" : order.paymentStatus === "refunded" ? "food.refunded" : "food.unpaid")}
                </dd>
              </div>
              {order.notes ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[13px] font-semibold text-muted">{t("food.customerNotes")}</dt>
                  <dd className="m-0 text-[15px]">{order.notes}</dd>
                </div>
              ) : null}
              {order.readyAt && (order.status === "accepted" || order.status === "ready") ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[13px] font-semibold text-muted">{t("food.status_accepted")}</dt>
                  <dd className="m-0 text-[15px]">{t("food.readyAround", { time: formatDateTime(order.readyAt, lang) })}</dd>
                </div>
              ) : null}
              {order.rejection ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[13px] font-semibold text-muted">{t("food.status_rejected")}</dt>
                  <dd className="m-0 text-[15px]">
                    {t("food.turnedDown", { reason: t(`food.reason_${order.rejection.reason}`) })}
                    {order.rejection.note ? ` · ${order.rejection.note}` : ""}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Box>

          {order.rating ? (
            <Box title={t("food.ratingTitle")}>
              <p className="m-0 text-[15px]">
                {t("food.ratingRestaurant", { stars: order.rating.restaurant })}
                {order.rating.courier !== null ? ` · ${t("food.ratingCourier", { stars: order.rating.courier })}` : ""}
              </p>
              {order.rating.comment ? <p className="m-0 text-[15px] text-ink-4">“{order.rating.comment}”</p> : null}
            </Box>
          ) : null}
        </div>

        <div className="flex flex-col gap-5">
          {steps.length ? (
            <Box title={t("food.stepIn")}>
              <p className="m-0 text-sm text-ink-4">{t("food.stepInText")}</p>
              <OrderStepForm order={order.id} steps={steps} prepMinutes={restaurant?.prepMinutes ?? 20} />
            </Box>
          ) : null}

          <Box title={t("food.courierJob")}>
            {job ? (
              <Link href={`/dashboard/shipments/${job.id}`} className="inline-flex items-center gap-1.5 text-[15px] font-semibold">
                <Icon name="package_2" size={18} />
                {t("food.openJob", { reference: shipmentReference(job) })}
              </Link>
            ) : (
              <p className="m-0 text-[15px] text-muted">{t("food.jobLater", { when: t((settings.foodCourierJob ?? "accepted") === "ready" ? "food.jobOnReady" : "food.jobOnAccept") })}</p>
            )}
            {job?.courierName ? <p className="m-0 text-[15px]">{job.courierName}</p> : null}
          </Box>

          <Box title={t("food.timeline")}>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {order.timeline.map((s, i) => (
                <li key={i} className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{t(FOOD_STATUS_KEYS[s.status])}</span>
                  <span className="text-[13px] text-muted">
                    {formatDateTime(new Date(s.at), lang)}
                    {s.by ? ` · ${t(`food.by_${s.by}`)}` : ""}
                  </span>
                  {s.note ? <span className="text-[13px] text-ink-4">{s.note}</span> : null}
                </li>
              ))}
            </ol>
          </Box>
        </div>
      </div>
    </div>
  );
}
