import type { Metadata } from "next";
import Link from "next/link";
import { ColumnChart, SERIES_COLORS, TrendChart } from "@/components/analytics-charts";
import { BarList, DataTable, KpiTiles, percent, RetentionTiles } from "@/components/analytics-report";
import { Icon } from "@/components/icon";
import { EmptyState, Notice, PageHeader, Section, btn } from "@/components/ui";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";
import { compactIn } from "@/lib/analytics/format";
import { loadReport, rangeFrom, RANGE_PRESETS, MIN_SEARCH_COUNT, type AnalyticsReport } from "@/lib/analytics/report";
import { relabel } from "@/lib/analytics/localize";
import { analyticsKeep } from "@/lib/analytics/retention";
import { loadSales } from "@/lib/analytics/sales";
import { appPlan, effectivePlans } from "@/lib/entitlements";
import { analyticsEventsKeepText, analyticsKeepText } from "@/components/plan-cards";
import { funnelWords, itemWord, pushTypeWord } from "@/lib/analytics/words";
import { timeZones, zoneLabel, zoneOf } from "@/lib/analytics/zone";
import { wordsOf } from "@/lib/app/kinds";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import type { App } from "@/lib/data/types";
import type { AutoKind } from "@/lib/hosted/auto-notifications";

import { SalesTiles } from "./sales";
import { CAMPAIGN_NAME, ShareCard, shareLinks, SourcesSection } from "./sources";
import { WeeklyForm } from "./weekly-form";
import { ZoneForm } from "./zone-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("analytics.title") };
}

function dayText(day: string, text: DashboardText): string {
  return text.date(new Date(`${day}T00:00:00Z`));
}

function exportHref(report: AnalyticsReport): string {
  const { range } = report;
  const query: Record<string, string> = range.preset === "custom" ? { range: "custom", from: range.from, to: range.to } : { range: range.preset };
  return `/api/dashboard/analytics/export?${new URLSearchParams(query)}`;
}

/** Date range first: the presets, then a custom range. Everything below follows it. */
function RangeFilter({ report, text }: { report: AnalyticsReport; text: DashboardText }) {
  const { range } = report;
  // 72 Not before the first day the plan keeps.
  const min = range.keptFrom ?? undefined;
  const { t } = text;
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <nav aria-label={t("analytics.dateRange")} className="flex flex-wrap gap-1 rounded-xl border border-line bg-white p-1">
        {RANGE_PRESETS.map((n) => {
          const current = range.preset === String(n);
          return (
            <Link
              key={n}
              href={`/dashboard/analytics?range=${n}`}
              aria-current={current ? "page" : undefined}
              className={`inline-flex h-9 items-center rounded-[9px] px-3 text-sm font-semibold no-underline ${current ? "bg-midnight text-white hover:text-white" : "text-ink-3 hover:bg-ivory hover:text-midnight"}`}
            >
              {t("analytics.lastDays", { count: n })}
            </Link>
          );
        })}
      </nav>
      <form action="/dashboard/analytics" className="flex flex-wrap items-end gap-2" aria-label={t("analytics.customRange")}>
        <input type="hidden" name="range" value="custom" />
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          {t("analytics.from")}
          <input type="date" name="from" defaultValue={range.from} min={min} required className="input input-sm h-9 w-[150px]" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          {t("analytics.to")}
          <input type="date" name="to" defaultValue={range.to} min={min} required className="input input-sm h-9 w-[150px]" />
        </label>
        <button type="submit" className={`${btn.secondary} h-9 px-3 text-sm`}>
          {t("analytics.apply")}
        </button>
      </form>
    </div>
  );
}

function NoData({ app, text }: { app: App; text: DashboardText }) {
  return (
    <EmptyState icon="monitoring" title={text.t("analytics.noData")}>
      {app.appName ? text.t("analytics.noDataText", { app: app.appName }) : text.t("analytics.noDataTextNoName")}
    </EmptyState>
  );
}

export default async function AnalyticsPage({ searchParams }: PageProps<"/dashboard/analytics">) {
  const { app, client, license } = await requireClient("analytics");
  const text = await dashboardText();
  const { t, k, lang, num } = text;
  if (!app) {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <PageHeader title={t("analytics.title")} description={t("analytics.noApp")} />
      </div>
    );
  }
  const query = await searchParams;
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;
  const now = new Date();
  // 47 Days in the owner's time zone.
  const zone = zoneOf(app, client);
  const store = await getStore();
  // 72 The plan keeps daily totals for so many months: the range starts no earlier.
  const plan = await appPlan(store, license, now);
  const kept = analyticsKeep(plan, now, zone, await effectivePlans(store));
  const range = rangeFrom({ range: one(query.range), from: one(query.from), to: one(query.to) }, now, zone, kept.from);
  const report = await loadReport(store, app.id, range, now, zone);
  const sales = await loadSales(store, app, range, zone, report.funnel[0]?.value ?? 0);
  const planName = plan?.name ?? (await effectivePlans(store)).starter.name;
  const items = wordsOf(app).items;
  const funnel = funnelWords(app.appType);
  const days = report.daily.map((d) => d.day);
  const from = dayText(range.from, text);
  const to = dayText(range.to, text);
  const zoneText = zoneLabel(zone, now);
  const short = (value: number) => compactIn(lang, value);
  // 86.2 The campaign name for the link and QR code to share.
  const asked = (one(query.campaign) ?? "").trim().toLowerCase();
  const campaign = CAMPAIGN_NAME.test(asked) ? asked : "";
  const share = shareLinks(app, appUrl(), campaign || null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("analytics.title")}
        description={richText(t("analytics.intro", { from, to }), { zone: () => <bdi dir="ltr">{zoneText}</bdi> })}
        actions={
          <a href={exportHref(report)} className={`${btn.secondary} h-11`} download>
            <Icon name="download" size={20} />
            {t("analytics.exportCsv")}
          </a>
        }
      />
      <RangeFilter report={report} text={text} />
      <ZoneForm zone={zone} label={zoneText} zones={timeZones()} chosen={Boolean(app.timeZone)} />
      {/* 86.4 The weekly summary email. */}
      <WeeklyForm on={app.weeklySummary !== false} />
      <Notice>
        {kept.from === null
          ? t("analytics.keptNoteForever", { plan: planName, days: analyticsEventsKeepText(lang) })
          : t("analytics.keptNote", { plan: planName, kept: analyticsKeepText(lang, kept.months), days: analyticsEventsKeepText(lang), from: dayText(kept.from, text) })}
        {range.limited && kept.from ? ` ${t("analytics.keptLimited", { from: dayText(kept.from, text) })}` : null}
      </Notice>
      <Notice>{t("analytics.installsNote")}</Notice>

      <KpiTiles report={report} lang={lang} />

      {/* 86.1 What the business sold over the same days. */}
      {Object.values(sales.shows).some(Boolean) ? (
        <Section id="sales" titleId="h-sales" title={t("analytics.sales")} description={t(app.backend === "wordpress" ? "analytics.salesTextSite" : "analytics.salesText")}>
          <SalesTiles sales={sales} days={range.days} text={text} />
        </Section>
      ) : null}

      {!report.hasData ? <NoData app={app} text={text} /> : null}

      <Section id="active" titleId="h-active" title={t("analytics.dau")} description={t("analytics.dauText")}>
        <TrendChart
          label={t("analytics.dauChart", { from, to })}
          days={days}
          series={[
            { name: t("analytics.lastDays", { count: range.days }), color: SERIES_COLORS.current, values: report.daily.map((d) => d.active) },
            ...(report.daily.some((d) => d.previousActive !== null)
              ? [{ name: t("analytics.previousDays", { count: range.days }), color: SERIES_COLORS.previous, values: report.daily.map((d) => d.previousActive) }]
              : []),
          ]}
        />
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">{t("analytics.showTable")}</summary>
          <DataTable
            caption={t("analytics.dailyCaption")}
            head={[t("analytics.day"), t("analytics.activeUsers"), t("analytics.installs"), t("analytics.sessions")]}
            rows={report.daily.map((d) => [dayText(d.day, text), num(d.active), num(d.installs), num(d.sessions)])}
          />
        </details>
      </Section>

      <div className="grid items-start gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(440px,100%),1fr))]">
        <Section id="installs" titleId="h-installs" title={t("analytics.installs")} description={t("analytics.installsText")}>
          <ColumnChart label={t("analytics.installsChart", { from, to })} days={days} values={report.daily.map((d) => d.installs)} unit={t("analytics.installsUnit")} />
        </Section>
        <Section id="retention" titleId="h-retention" title={t("analytics.retention")} description={t("analytics.retentionText")}>
          <RetentionTiles report={report} lang={lang} />
        </Section>
      </div>

      <div className="grid items-start gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
        <Section id="platforms" titleId="h-platforms" title={t("analytics.platforms")} description={t("analytics.platformsText")}>
          <BarList items={relabel(report.platforms, text, "other")} label={t("analytics.platforms")} lang={lang} />
        </Section>
        <Section id="systems" titleId="h-systems" title={t("analytics.systems")}>
          <BarList items={relabel(report.systems, text, "other")} label={t("analytics.systems")} lang={lang} />
        </Section>
        <Section id="versions" titleId="h-versions" title={t("analytics.versions")}>
          <BarList items={relabel(report.versions, text, "other")} label={t("analytics.versions")} lang={lang} />
        </Section>
        <Section id="countries" titleId="h-countries" title={t("analytics.countries")} description={t("analytics.countriesText")}>
          <BarList items={relabel(report.countries, text, "country")} label={t("analytics.countries")} lang={lang} />
        </Section>
        <Section id="languages" titleId="h-languages" title={t("analytics.languages")} description={t("analytics.languagesText")}>
          <BarList items={relabel(report.languages, text, "language")} label={t("analytics.languages")} lang={lang} />
        </Section>
        <Section id="screens" titleId="h-screens" title={t("analytics.screens")} description={t("analytics.screensText")}>
          <BarList items={relabel(report.screens, text, "other")} label={t("analytics.screens")} valueText={(s) => short(s.value)} lang={lang} />
        </Section>
      </div>

      {/* 86.2 Where people come from, and the app's link and QR code to share. */}
      <Section id="sources" titleId="h-sources" title={t("analytics.sources")} description={t("analytics.sourcesText")}>
        <SourcesSection sources={report.sources} text={text} />
      </Section>
      <Section id="share" titleId="h-share" title={t("analytics.shareTitle")} description={t("analytics.shareText")}>
        <ShareCard links={share} campaign={campaign} invalid={asked !== "" && !campaign} text={text} />
      </Section>

      <Section id="items" titleId="h-items" title={t("analytics.topItems", { items })} description={t("analytics.topItemsText", { items })}>
        {report.items.length === 0 ? (
          <p className="m-0 text-sm text-muted">{t("analytics.noItems", { items })}</p>
        ) : (
          <DataTable
            caption={t("analytics.topItems", { items })}
            head={[t("analytics.name"), t("analytics.kind"), t("analytics.views")]}
            rows={report.items.map((item) => [item.title, k(itemWord(item.kind)), num(item.views)])}
          />
        )}
      </Section>

      {funnel ? (
        <Section id="funnel" titleId="h-funnel" title={t("analytics.conversions")} description={t("analytics.conversionsText")}>
          <BarList
            label={t("analytics.conversions")}
            lang={lang}
            items={report.funnel.map((step) => ({
              key: step.step,
              label: step.step === "view" ? t("analytics.viewed") : k(step.step === "intent" ? funnel.intent : funnel.checkout),
              value: step.value,
              share: step.rate ?? 1,
            }))}
            valueText={(s) => (s.key === "view" ? short(s.value) : t("analytics.ofViews", { value: short(s.value), percent: percent(s.share, 1, lang) }))}
          />
          {report.checkoutValue.length > 0 ? (
            <p className="m-0 text-sm text-muted">
              {t("analytics.checkoutValue", { values: report.checkoutValue.map((v) => formatCents(v.cents, v.currency as Parameters<typeof formatCents>[1])).join(", ") })}
            </p>
          ) : null}
        </Section>
      ) : null}

      {/* 62 Screenshots of protected lessons, for academies (iPhones tell the app; Android blocks them). */}
      {app.appType === "lms" ? (
        <Section id="screenshots" titleId="h-screenshots" title={t("analytics.screenshots")} description={t("analytics.screenshotsText")}>
          {report.screenshots.length === 0 ? (
            <p className="m-0 text-sm text-muted">{t("analytics.noScreenshots")}</p>
          ) : (
            <DataTable
              caption={t("analytics.screenshotsCaption")}
              head={[t("analytics.lesson"), t("analytics.screenshotsCount")]}
              rows={report.screenshots.map((shot) => [shot.kind === "other" ? t("analytics.otherProtected") : shot.title, num(shot.count)])}
            />
          )}
        </Section>
      ) : null}

      <div className="grid items-start gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(440px,100%),1fr))]">
        <Section id="push" titleId="h-push" title={t("analytics.notifications")} description={t("analytics.notificationsText")}>
          {report.push.length === 0 && report.pushFromSite.length === 0 && report.auto.length === 0 ? (
            <p className="m-0 text-sm text-muted">{t("analytics.noNotifications")}</p>
          ) : (
            <>
              {report.push.length > 0 ? (
                <DataTable
                  caption={t("analytics.sentCaption")}
                  head={[t("analytics.notification"), t("analytics.sent"), t("analytics.phones"), t("analytics.opened"), t("analytics.openRate")]}
                  rows={report.push.map((p) => [p.title, dayText(p.sentDay, text), num(p.pushed), num(p.opened), percent(p.rate, 1, lang)])}
                />
              ) : null}
              {/* 86.3 The automatic ones, by kind. */}
              {report.auto.length > 0 ? (
                <DataTable
                  caption={t("analytics.autoCaption")}
                  hideCaption={report.push.length === 0}
                  head={[t("analytics.autoKind"), t("analytics.autoPeople"), t("analytics.phones"), t("analytics.opened"), t("analytics.openRate")]}
                  rows={report.auto.map((a) => [t(`campaigns.auto_${a.kind as AutoKind}`), num(a.people), num(a.pushed), num(a.opened), percent(a.rate, 1, lang)])}
                />
              ) : null}
              {report.pushFromSite.length > 0 ? (
                <DataTable
                  caption={t("analytics.siteCaption")}
                  hideCaption={report.push.length === 0}
                  head={[t("analytics.fromSite"), t("analytics.opened")]}
                  rows={report.pushFromSite.map((p) => [k(pushTypeWord(p.type)), num(p.opened)])}
                />
              ) : null}
            </>
          )}
        </Section>
        <Section id="searches" titleId="h-searches" title={t("analytics.searches")} description={t("analytics.searchesText", { count: MIN_SEARCH_COUNT })}>
          {report.searches.length === 0 ? (
            <p className="m-0 text-sm text-muted">{t("analytics.noSearches")}</p>
          ) : (
            <DataTable caption={t("analytics.searches")} head={[t("analytics.search"), t("analytics.times")]} rows={report.searches.map((s) => [s.query, num(s.count)])} />
          )}
        </Section>
      </div>

      <p className="m-0 text-sm text-muted">
        {richText(t("analytics.guide"), { link: (chunk) => <Link href={localePath(lang, "/docs/analytics")}>{chunk}</Link> })}
      </p>
    </div>
  );
}
