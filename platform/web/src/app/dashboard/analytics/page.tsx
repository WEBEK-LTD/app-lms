import type { Metadata } from "next";
import Link from "next/link";
import { ColumnChart, SERIES_COLORS, TrendChart } from "@/components/analytics-charts";
import { BarList, DataTable, KpiTiles, percent, RetentionTiles } from "@/components/analytics-report";
import { Icon } from "@/components/icon";
import { EmptyState, Notice, PageHeader, Section, btn } from "@/components/ui";
import { compact } from "@/lib/analytics/format";
import { loadReport, rangeFrom, RANGE_PRESETS, MIN_SEARCH_COUNT, type AnalyticsReport } from "@/lib/analytics/report";
import { funnelWords, itemWord, pushTypeWord } from "@/lib/analytics/words";
import { timeZones, zoneLabel, zoneOf } from "@/lib/analytics/zone";
import { wordsOf } from "@/lib/app/kinds";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";

import { ZoneForm } from "./zone-form";

export const metadata: Metadata = { title: "Analytics" };

function dayText(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function exportHref(report: AnalyticsReport): string {
  const { range } = report;
  const query: Record<string, string> = range.preset === "custom" ? { range: "custom", from: range.from, to: range.to } : { range: range.preset };
  return `/api/dashboard/analytics/export?${new URLSearchParams(query)}`;
}

/** Date range first: the presets, then a custom range. Everything below follows it. */
function RangeFilter({ report }: { report: AnalyticsReport }) {
  const { range } = report;
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <nav aria-label="Date range" className="flex flex-wrap gap-1 rounded-xl border border-line bg-white p-1">
        {RANGE_PRESETS.map((n) => {
          const current = range.preset === String(n);
          return (
            <Link
              key={n}
              href={`/dashboard/analytics?range=${n}`}
              aria-current={current ? "page" : undefined}
              className={`inline-flex h-9 items-center rounded-[9px] px-3 text-sm font-semibold no-underline ${current ? "bg-midnight text-white hover:text-white" : "text-ink-3 hover:bg-ivory hover:text-midnight"}`}
            >
              Last {n} days
            </Link>
          );
        })}
      </nav>
      <form action="/dashboard/analytics" className="flex flex-wrap items-end gap-2" aria-label="Custom range">
        <input type="hidden" name="range" value="custom" />
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          From
          <input type="date" name="from" defaultValue={range.from} required className="input input-sm h-9 w-[150px]" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          To
          <input type="date" name="to" defaultValue={range.to} required className="input input-sm h-9 w-[150px]" />
        </label>
        <button type="submit" className={`${btn.secondary} h-9 px-3 text-sm`}>
          Apply
        </button>
      </form>
    </div>
  );
}

function NoData({ app }: { app: App }) {
  return (
    <EmptyState icon="monitoring" title="No usage in this range yet">
      Numbers appear here a minute or so after people open {app.appName ?? "your app"} on their phones. Your app sends them from its first build made after
      Analytics arrived: publish a new build to start. The app preview in the dashboard isn&apos;t counted.
    </EmptyState>
  );
}

export default async function AnalyticsPage({ searchParams }: PageProps<"/dashboard/analytics">) {
  const { app, client } = await requireClient();
  if (!app) {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <PageHeader title="Analytics" description="Choose your app type first; your app's numbers show here once people use it." />
      </div>
    );
  }
  const query = await searchParams;
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;
  const now = new Date();
  // 47 Days in the owner's time zone.
  const zone = zoneOf(app, client);
  const range = rangeFrom({ range: one(query.range), from: one(query.from), to: one(query.to) }, now, zone);
  const report = await loadReport(await getStore(), app.id, range, now, zone);
  const items = wordsOf(app).items;
  const funnel = funnelWords(app.appType);
  const days = report.daily.map((d) => d.day);
  const previousLabel = `Previous ${range.days} days`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        description={
          <>
            How people use your app, {dayText(range.from)} to {dayText(range.to)} ({zoneLabel(zone, now)}). Totals only: no one is identified.
          </>
        }
        actions={
          <a href={exportHref(report)} className={`${btn.secondary} h-11`} download>
            <Icon name="download" size={20} />
            Export CSV
          </a>
        }
      />
      <RangeFilter report={report} />
      <ZoneForm zone={zone} label={zoneLabel(zone, now)} zones={timeZones()} chosen={Boolean(app.timeZone)} />
      <Notice>
        Installs are counted when the app is first opened. Downloads from Google Play, the App Store and the other stores aren&apos;t shared with Yallapp, so
        your store consoles may show more. People who turn off &ldquo;Share usage statistics&rdquo; in the app&apos;s Settings aren&apos;t counted.
      </Notice>

      <KpiTiles report={report} />

      {!report.hasData ? <NoData app={app} /> : null}

      <Section id="active" titleId="h-active" title="Daily active users" description="People who opened the app each day, against the same days of the period before.">
        <TrendChart
          label={`Daily active users, ${dayText(range.from)} to ${dayText(range.to)}, with the previous period`}
          days={days}
          series={[
            { name: `Last ${range.days} days`, color: SERIES_COLORS.current, values: report.daily.map((d) => d.active) },
            ...(report.daily.some((d) => d.previousActive !== null)
              ? [{ name: previousLabel, color: SERIES_COLORS.previous, values: report.daily.map((d) => d.previousActive) }]
              : []),
          ]}
        />
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">Show as a table</summary>
          <DataTable
            caption="Daily active users, installs and sessions"
            head={["Day", "Active users", "Installs", "Sessions"]}
            rows={report.daily.map((d) => [dayText(d.day), d.active, d.installs, d.sessions])}
          />
        </details>
      </Section>

      <div className="grid items-start gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(440px,100%),1fr))]">
        <Section id="installs" titleId="h-installs" title="Installs" description="First opens a day: counted when the app is first opened, not when it's downloaded.">
          <ColumnChart label={`Installs a day, ${dayText(range.from)} to ${dayText(range.to)}`} days={days} values={report.daily.map((d) => d.installs)} unit="installs" />
        </Section>
        <Section id="retention" titleId="h-retention" title="Retention" description="Of the people who first opened the app in this range, how many came back 1, 7 and 30 days later.">
          <RetentionTiles report={report} />
        </Section>
      </div>

      <div className="grid items-start gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
        <Section id="platforms" titleId="h-platforms" title="Platforms" description="Share of active users.">
          <BarList items={report.platforms} label="Platforms" />
        </Section>
        <Section id="systems" titleId="h-systems" title="System versions">
          <BarList items={report.systems} label="System versions" />
        </Section>
        <Section id="versions" titleId="h-versions" title="App versions">
          <BarList items={report.versions} label="App versions" />
        </Section>
        <Section id="countries" titleId="h-countries" title="Countries" description="From the network people used, when the numbers arrived.">
          <BarList items={report.countries} label="Countries" />
        </Section>
        <Section id="languages" titleId="h-languages" title="Languages" description="The language people use the app in.">
          <BarList items={report.languages} label="Languages" />
        </Section>
        <Section id="screens" titleId="h-screens" title="Top screens" description="Screen views.">
          <BarList items={report.screens} label="Top screens" valueText={(s) => compact(s.value)} />
        </Section>
      </div>

      <Section id="items" titleId="h-items" title={`Top ${items}`} description={`The ${items} people opened most.`}>
        {report.items.length === 0 ? (
          <p className="m-0 text-sm text-muted">No {items} opened in this range yet.</p>
        ) : (
          <DataTable
            caption={`Top ${items}`}
            head={["Name", "Kind", "Views"]}
            rows={report.items.map((item) => [item.title, itemWord(item.kind), item.views.toLocaleString("en-GB")])}
          />
        )}
      </Section>

      {funnel ? (
        <Section id="funnel" titleId="h-funnel" title="Conversions" description="From looking to buying: how many views led to the next step. The payment itself happens on the checkout page.">
          <BarList
            label="Conversions"
            items={report.funnel.map((step) => ({
              key: step.step,
              label: step.step === "view" ? "Viewed" : step.step === "intent" ? funnel.intent : funnel.checkout,
              value: step.value,
              share: step.rate ?? 1,
            }))}
            valueText={(s) => (s.key === "view" ? compact(s.value) : `${compact(s.value)} · ${percent(s.share, 1)} of views`)}
          />
          {report.checkoutValue.length > 0 ? (
            <p className="m-0 text-sm text-muted">
              Value taken to checkout: {report.checkoutValue.map((v) => formatCents(v.cents, v.currency as Parameters<typeof formatCents>[1])).join(", ")}
            </p>
          ) : null}
        </Section>
      ) : null}

      <div className="grid items-start gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(440px,100%),1fr))]">
        <Section id="push" titleId="h-push" title="Notifications" description="How many of the phones a notification went to opened the app from it.">
          {report.push.length === 0 && report.pushFromSite.length === 0 ? (
            <p className="m-0 text-sm text-muted">No notifications sent or opened in this range.</p>
          ) : (
            <>
              {report.push.length > 0 ? (
                <DataTable
                  caption="Notifications you sent"
                  head={["Notification", "Sent", "Phones", "Opened", "Open rate"]}
                  rows={report.push.map((p) => [p.title, dayText(p.sentDay), p.pushed, p.opened, percent(p.rate, 1)])}
                />
              ) : null}
              {report.pushFromSite.length > 0 ? (
                <DataTable
                  caption="Opened notifications from your website"
                  hideCaption={report.push.length === 0}
                  head={["From your website", "Opened"]}
                  rows={report.pushFromSite.map((p) => [pushTypeWord(p.type), p.opened])}
                />
              ) : null}
            </>
          )}
        </Section>
        <Section id="searches" titleId="h-searches" title="Top searches" description={`What people searched for, without who searched; a search shows once it was made at least ${MIN_SEARCH_COUNT} times.`}>
          {report.searches.length === 0 ? (
            <p className="m-0 text-sm text-muted">No searches to show in this range yet.</p>
          ) : (
            <DataTable caption="Top searches" head={["Search", "Times"]} rows={report.searches.map((s) => [s.query, s.count])} />
          )}
        </Section>
      </div>

      <p className="m-0 text-sm text-muted">
        What the app sends and how long it is kept: <Link href="/docs/analytics">Analytics in the guides</Link>.
      </p>
    </div>
  );
}
