export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { ItemList, ItemRow } from "@/components/page-kit";
import { Badge, btn, EmptyState, PageHeader, Section } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { TravelBookingStatus } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { BookingStatusBadge, isTravel, NotTravel, PaymentBadge, TravelPlanNotice } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("travel.bookings") };
}

const PER_PAGE = 30;
const FILTERS: { id: string; key: DashKey; statuses?: TravelBookingStatus[] }[] = [
  { id: "all", key: "travel.filterAll" },
  { id: "confirmed", key: "travel.filterConfirmed", statuses: ["confirmed"] },
  { id: "awaiting", key: "travel.filterAwaiting", statuses: ["awaiting_payment"] },
  { id: "completed", key: "travel.filterCompleted", statuses: ["completed"] },
  { id: "cancelled", key: "travel.filterCancelled", statuses: ["cancelled"] },
  { id: "refunds", key: "travel.filterRefunds" },
];

/** 126 Every booking made in the app: stays, flights and trips, newest first. */
export default async function TravelBookingsPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string; page?: string }> }) {
  const { app, license } = await requireClient("orders");
  const { t, date } = await dashboardText();
  if (!isTravel(app)) return <NotTravel title={t("travel.bookings")} t={t} />;
  const query = await searchParams;
  const store = await getStore();
  const filter = FILTERS.find((f) => f.id === query.filter) ?? FILTERS[0]!;
  const page = Math.max(1, Number(query.page) || 1);
  const search = (query.q ?? "").trim().slice(0, 80);
  const refunds = filter.id === "refunds";
  const [found, plan] = await Promise.all([
    store.listTravelBookings({ appId: app.id, ...(filter.statuses ? { statuses: filter.statuses } : {}), ...(search ? { search } : {}), page: refunds ? 1 : page, perPage: refunds ? 1000 : PER_PAGE }),
    appPlan(store, license, new Date()),
  ]);
  const all = refunds ? found.items.filter((b) => b.paymentStatus === "refund_due") : found.items;
  const items = refunds ? all.slice((page - 1) * PER_PAGE, page * PER_PAGE) : all;
  const total = refunds ? all.length : found.total;
  const link = (patch: Record<string, string>) => `/dashboard/travel/bookings?${new URLSearchParams({ ...(filter.id !== "all" ? { filter: filter.id } : {}), ...(search ? { q: search } : {}), ...patch })}`;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("travel.bookings")} description={t("travel.bookingsIntro")} />
      <TravelPlanNotice app={app} plan={plan} t={t} />
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link key={f.id} href={`/dashboard/travel/bookings${f.id === "all" ? "" : `?filter=${f.id}`}`} aria-current={f.id === filter.id ? "page" : undefined} className={`${btn.secondary} h-9 px-3.5 text-sm aria-[current=page]:border-midnight`}>
            {t(f.key)}
          </Link>
        ))}
        <form action="/dashboard/travel/bookings" className="ms-auto flex gap-2">
          {filter.id !== "all" ? <input type="hidden" name="filter" value={filter.id} /> : null}
          <label htmlFor="b-q" className="sr-only">
            {t("travel.search")}
          </label>
          <input id="b-q" name="q" defaultValue={search} placeholder={t("travel.searchPlaceholder")} className="input h-9" />
          <button type="submit" className={`${btn.secondary} h-9 px-3.5 text-sm`}>
            {t("travel.search")}
          </button>
        </form>
      </div>
      <Section titleId="h-bookings" title={t("travel.bookings")} flush>
        {items.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="luggage" title={t("travel.noBookings")}>
              {t("travel.noBookingsText")}
            </EmptyState>
          </div>
        ) : (
          <ItemList>
            {items.map((b) => {
              const dates = b.stay ? `${b.stay.checkIn} → ${b.stay.checkOut}` : b.flight ? b.flight.outbound.number : "";
              return (
                <ItemRow
                  key={b.id}
                  href={`/dashboard/travel/bookings/${b.id}`}
                  title={`${b.reference} · ${b.contact.name}`}
                  badges={
                    <>
                      <Badge tone="neutral">{t(`travel.kind_${b.kind}` as DashKey)}</Badge>
                      <BookingStatusBadge status={b.status} t={t} />
                      <PaymentBadge status={b.paymentStatus} t={t} />
                    </>
                  }
                  meta={[b.stay?.hotelName, dates, formatCents(b.totalCents, b.currency)].filter(Boolean).join(" · ")}
                  extra={date(b.createdAt)}
                />
              );
            })}
          </ItemList>
        )}
      </Section>
      <div className="flex justify-between">
        {page > 1 ? (
          <Link href={link({ page: String(page - 1) })} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
            {t("travel.newer")}
          </Link>
        ) : (
          <span />
        )}
        {page * PER_PAGE < total ? (
          <Link href={link({ page: String(page + 1) })} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
            {t("travel.older")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
