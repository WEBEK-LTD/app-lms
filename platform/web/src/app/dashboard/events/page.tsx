import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, Notice, btn } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { CATALOG_CURRENCIES } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import { eventWhen } from "@/lib/events/notify";
import { loadEvents, phaseOf, placesLeft } from "@/lib/events/service";
import { CardPayments } from "../catalog/payments";
import { EventStatusBadge } from "./event-page";
import { EventSettingsForm } from "./forms";

export const metadata: Metadata = { title: "Events" };

const FILTERS = [
  { value: "upcoming", label: "Coming up" },
  { value: "past", label: "Past" },
  { value: "draft", label: "Drafts" },
  { value: "all", label: "All" },
] as const;

/** 28 The events of an Events & tickets app, its event settings and card payments. */
export default async function EventsPage({ searchParams }: { searchParams: Promise<{ show?: string; deleted?: string }> }) {
  const { app } = await requireClient();
  if (!app || app.connector?.kind !== "events") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Events</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          Events are for Events &amp; tickets apps. Choose Events &amp; tickets on <Link href="/dashboard/app-type">App type</Link>, then Events managed in Yallapp on
          the Website step.
        </p>
      </div>
    );
  }
  const { show = "upcoming", deleted } = await searchParams;
  const now = new Date();
  const store = await getStore();
  const [data, tickets] = await Promise.all([loadEvents(store, app, now), store.countTicketPlaces(app.id, now)]);
  const sold = new Map<number, number>();
  for (const t of tickets) sold.set(t.eventId, (sold.get(t.eventId) ?? 0) + t.count);
  const events = data.events
    .filter((e) =>
      show === "all"
        ? true
        : show === "draft"
          ? e.status === "draft"
          : show === "past"
            ? e.status !== "draft" && e.endAt.getTime() <= now.getTime()
            : e.status !== "draft" && e.endAt.getTime() > now.getTime(),
    )
    .sort((a, b) => (show === "past" ? b.startAt.getTime() - a.startAt.getTime() : a.startAt.getTime() - b.startAt.getTime()));
  const paid = data.types.some((t) => t.priceCents > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[620px] flex-col gap-2">
          <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Events</h1>
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">Your programme. Published events show in the app right away, with their tickets.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/check-in" className={`${btn.secondary} h-11`}>
            <Icon name="qr_code_scanner" size={20} />
            Check-in
          </Link>
          <Link href="/dashboard/events/new" className={`${btn.primary} h-11`}>
            <Icon name="add" size={20} />
            Add an event
          </Link>
        </div>
      </div>

      {deleted ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          Deleted “{deleted}”.
        </p>
      ) : null}
      {paid && !app.catalogSettings?.payment && !app.demo ? (
        <Notice tone="warn" icon="warning">
          Paid tickets can&apos;t be bought until you set up <a href="#h-payments">Card payments</a> below.
        </Notice>
      ) : null}

      <section aria-labelledby="h-events" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="h-events" className="m-0 text-lg font-bold">
            {data.events.length} {data.events.length === 1 ? "event" : "events"}
          </h2>
          <nav aria-label="Show" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Link
                key={f.value}
                href={`/dashboard/events?show=${f.value}`}
                aria-current={show === f.value ? "page" : undefined}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold no-underline ${show === f.value ? "border-midnight bg-midnight text-white" : "border-line text-midnight"}`}
              >
                {f.label}
              </Link>
            ))}
          </nav>
        </div>
        {data.events.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">No events yet. Add your first one, then its tickets.</p>
        ) : events.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">Nothing here.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {events.map((e) => {
              const left = placesLeft(data, e).event;
              return (
                <li key={e.id} className="border-t border-line-soft first:border-t-0">
                  <Link href={`/dashboard/events/${e.id}`} className="flex items-center gap-3 py-3 text-midnight no-underline hover:bg-sand">
                    {e.imageAssetIds[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={assetUrl(e.imageAssetIds[0])} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-sand text-muted">
                        <Icon name="event" size={22} />
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[15px] font-bold">{e.title}</span>
                      <span className="truncate text-[13px] text-muted">
                        {[eventWhen(e.startAt, data.settings.timeZone), e.venueName ?? "Online", `${sold.get(e.id) ?? 0} tickets`, left !== null ? `${left} left` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {phaseOf(e, now) === "ended" ? <Badge tone="neutral">Ended</Badge> : null}
                    <EventStatusBadge status={e.status} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="h-event-settings" className="flex max-w-[640px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-event-settings" className="m-0 text-lg font-bold">
            Event settings
          </h2>
          <p className="m-0 text-[15px] text-ink-4">Your currency and time zone, and what people can do in the app.</p>
        </div>
        <EventSettingsForm settings={data.settings} currencies={CATALOG_CURRENCIES} />
      </section>

      <CardPayments app={app} />
    </div>
  );
}
