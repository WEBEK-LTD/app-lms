import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, Notice, PageHeader, Section, btn } from "@/components/ui";
import { ItemRow, LinkCards, PageGroup, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterList } from "@/components/page-kit-client";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { CATALOG_CURRENCIES } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import { loadEvents, phaseOf, placesLeft } from "@/lib/events/service";
import { CardPayments, OtherPayments } from "../catalog/payments";
import { EventStatusBadge, eventWhenIn } from "./event-page";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { EventSettingsForm } from "./forms";
import { SampleBadge, SampleEntries, type SampleQuery } from "@/components/samples";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("events.title") };
}

/** 28 The events of an Events & tickets app, its event settings and card payments. */
export default async function EventsPage({ searchParams }: { searchParams: Promise<{ deleted?: string } & SampleQuery> }) {
  const { app } = await requireClient("events");
  const { t, lang, num } = await dashboardText();
  if (!app || app.connector?.kind !== "events") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("events.title")} description={richText(t("events.notHere"), { link: (chunk) => <Link href="/dashboard/app-type">{chunk}</Link> })} />
      </div>
    );
  }
  const query = await searchParams;
  const { deleted } = query;
  const now = new Date();
  const store = await getStore();
  const [data, tickets] = await Promise.all([loadEvents(store, app, now), store.countTicketPlaces(app.id, now)]);
  const sold = new Map<number, number>();
  for (const t of tickets) sold.set(t.eventId, (sold.get(t.eventId) ?? 0) + t.count);
  // Coming up soonest first, then drafts, then past ones newest first.
  const groupOf = (e: (typeof data.events)[number]) => (e.status === "draft" ? "draft" : e.endAt.getTime() <= now.getTime() ? "past" : "upcoming");
  const order = { upcoming: 0, draft: 1, past: 2 } as const;
  const events = [...data.events].sort((a, b) => order[groupOf(a)] - order[groupOf(b)] || (groupOf(a) === "past" ? b.startAt.getTime() - a.startAt.getTime() : a.startAt.getTime() - b.startAt.getTime()));
  const paid = data.types.some((t) => t.priceCents > 0);
  const has = data.events.length > 0;
  const addLink = (
    <Link href="/dashboard/events/new" className={`${btn.main} h-11`}>
      <Icon name="add" size={20} />
      {t("events.add")}
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its one main action, the numbers, the door, the events, then the settings and payments. */}
      <PageHeader title={t("events.title")} description={t("events.intro")} actions={has ? addLink : null} />

      {deleted ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          {t("events.deleted", { title: deleted })}
        </p>
      ) : null}
      {/* 110.2 */}
      <SampleEntries app={app} list="events" query={query} />
      {paid && !app.catalogSettings?.payment && !app.demo ? (
        <Notice tone="warn" icon="warning">
          {richText(t("events.paidNoPayments"), { link: (chunk) => <a href="#h-payments">{chunk}</a> })}
        </Notice>
      ) : null}

      {has ? (
        <StatRow label={t("events.title")}>
          <Stat icon="event" label={t("events.comingUp")} value={num(events.filter((e) => groupOf(e) === "upcoming").length)} />
          <Stat icon="confirmation_number" tone="accent" label={t("events.statTickets")} value={num([...sold.values()].reduce((sum, n) => sum + n, 0))} />
          <Stat icon="edit" tone="warn" label={t("events.drafts")} value={num(events.filter((e) => groupOf(e) === "draft").length)} />
          <Stat icon="event_busy" tone="neutral" label={t("events.past")} value={num(events.filter((e) => groupOf(e) === "past").length)} />
        </StatRow>
      ) : null}

      <LinkCards
        label={t("events.toolsLabel")}
        items={[{ href: "/dashboard/check-in", icon: "qr_code_scanner", label: t("events.checkIn"), hint: t("events.checkInHint") }]}
      />

      <Section titleId="h-events" title={t("events.count", { count: data.events.length })} flush>
        {has ? (
          <FilterList
            allLabel={t("events.all")}
            searchLabel={t("events.search")}
            noMatch={t("events.nothingHere")}
            filters={[
              { value: "upcoming", label: t("events.comingUp") },
              { value: "draft", label: t("events.drafts") },
              { value: "past", label: t("events.past") },
            ]}
            items={events.map((e, i) => {
              const left = placesLeft(data, e).event;
              return {
                id: e.id,
                text: [e.title, e.venueName].filter(Boolean).join(" "),
                group: groupOf(e),
                node: (
                  <ItemRow
                    href={`/dashboard/events/${e.id}`}
                    media={<Thumb src={e.imageAssetIds[0] ? assetUrl(e.imageAssetIds[0]) : null} icon="event" tint={i} />}
                    title={e.title}
                    badges={<SampleBadge sample={e.sample} />}
                    meta={[
                      eventWhenIn(lang, e.startAt, data.settings.timeZone),
                      e.venueName ?? t("events.online"),
                      t("events.tickets", { count: sold.get(e.id) ?? 0 }),
                      left !== null ? t("events.left", { count: num(left) }) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    aside={
                      <>
                        {phaseOf(e, now) === "ended" ? <Badge tone="neutral">{t("events.ended")}</Badge> : null}
                        <EventStatusBadge status={e.status} t={t} />
                      </>
                    }
                  />
                ),
              };
            })}
          />
        ) : (
          <div className="p-5 sm:p-6">
            <EmptyState icon="event" title={t("events.noEvents")} action={addLink} />
          </div>
        )}
      </Section>

      <PageGroup title={t("events.groupSettings")}>
        <Section titleId="h-event-settings" title={t("events.settings")} description={t("events.settingsText")} className="max-w-[640px]">
          <EventSettingsForm settings={data.settings} currencies={CATALOG_CURRENCIES} />
        </Section>
        <CardPayments app={app} currency={data.settings.currency} />
        <OtherPayments app={app} />
      </PageGroup>
    </div>
  );
}
