import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, PageHeader, Section } from "@/components/ui";
import { ItemList, ItemRow, Thumb } from "@/components/page-kit";
import { FilterLinks, ListBar } from "@/components/page-kit-b";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { queueTimers } from "@/lib/market/complaints";
import { complaintReference, marketOrderReference } from "@/lib/market/json";
import { byWait, QUEUES, queueOf, queueQuery, SLA_MINUTES, type Queue } from "@/lib/market/support";
import { isFood } from "../../shipments/parts";
import { ComplaintStatusBadge, NotMarket, waitText } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("market.complaints") };
}

const QUEUE_KEYS: Record<Queue, DashKey> = {
  open: "market.queueOpen",
  customer: "market.queueCustomer",
  mine: "market.queueMine",
  closed: "market.queueClosed",
  all: "market.queueAll",
};

/** 115.12 The support team's queue: the longest wait first, with who has each ticket and how long it has waited. */
export default async function ComplaintsPage({ searchParams }: { searchParams: Promise<{ queue?: string }> }) {
  const context = await requireClient("orders");
  const { app } = context;
  const { t } = await dashboardText();
  if (!isFood(app)) return <NotMarket title={t("market.complaints")} t={t} />;
  const queue = queueOf((await searchParams).queue);
  const me = (context.member ?? context.staff ?? context.user).email;
  const store = await getStore();
  const now = new Date();
  const found = await store.listMarketComplaints({ appId: app.id, ...queueQuery(queue, me), limit: 200, offset: 0 });
  const items = queue === "closed" || queue === "all" ? found.items : [...found.items].sort(byWait);
  const orders = new Map((await Promise.all([...new Set(items.map((c) => c.orderId))].map((id) => store.getMarketOrder(app.id, id)))).filter((o) => o !== null).map((o) => [o.id, o]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("market.complaints")} description={t("market.complaintsIntro")} />
      <Section titleId="h-complaints" title={t(QUEUE_KEYS[queue])} actions={<Badge tone="neutral">{found.total}</Badge>} flush>
        <ListBar>
          <FilterLinks label={t("market.complaints")} items={QUEUES.map((q) => ({ href: `?queue=${q}`, label: t(QUEUE_KEYS[q]), current: q === queue }))} />
        </ListBar>
        {items.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="support_agent" title={t("market.noComplaints")}>
              {t("market.noComplaintsText")}
            </EmptyState>
          </div>
        ) : (
          <ItemList>
            {items.map((c, i) => {
              const timers = queueTimers(c, now);
              const order = orders.get(c.orderId);
              const late = timers.waitingOn === "support" && (timers.waitingMinutes ?? 0) >= SLA_MINUTES;
              return (
                <ItemRow
                  key={c.id}
                  href={`/dashboard/market/complaints/${c.id}`}
                  media={<Thumb icon="support_agent" shape="square" tint={i} />}
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      <bdi dir="ltr">{complaintReference(c)}</bdi>
                      <span className="font-medium text-ink-4">{t(`market.r_${c.reason}` as DashKey)}</span>
                    </span>
                  }
                  meta={`${order ? `${order.vendorName} · ${order.customerName} · ` : ""}${marketOrderReference({ id: c.orderId })}`}
                  extra={
                    <>
                      <span className="flex items-center gap-1">
                        <Icon name="schedule" size={16} className="text-muted" />
                        {t("market.openFor", { time: waitText(timers.openMinutes, t) })}
                      </span>
                      {timers.waitingMinutes !== null ? (
                        <span className={`flex items-center gap-1 ${late ? "font-semibold text-danger" : ""}`}>
                          <Icon name="timer" size={16} className={late ? "text-danger" : "text-muted"} />
                          {t("market.waitingFor", { time: waitText(timers.waitingMinutes, t) })}
                        </span>
                      ) : null}
                      <span>{c.assignee ?? t("market.unassigned")}</span>
                      {c.photoAssetIds.length ? (
                        <span className="flex items-center gap-1">
                          <Icon name="photo_library" size={16} className="text-muted" />
                          {c.photoAssetIds.length}
                        </span>
                      ) : null}
                    </>
                  }
                  aside={<ComplaintStatusBadge status={c.status} t={t} />}
                />
              );
            })}
          </ItemList>
        )}
      </Section>
    </div>
  );
}
