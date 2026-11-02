import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterList } from "@/components/page-kit-client";
import { btn, EmptyState, Notice, PageHeader, Section } from "@/components/ui";
import { formatDate } from "@/i18n/format";
import { appZone } from "@/lib/analytics/zone";
import { utcToLocal } from "@/lib/bookings/time";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { campaignStats, CAMPAIGN_LIMITS } from "@/lib/hosted/campaigns";
import { CampaignNumbers, CampaignStatus } from "./parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("campaigns.title") };
}

/** 85.2 The app's notification campaigns: drafts, waiting, weekly and sent, with their numbers. */
export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { app } = await requireClient("notifications");
  const { t, lang } = await dashboardText();
  if (!app || (app.backend !== "hosted" && app.backend !== "wordpress")) {
    return (
      <PageHeader
        title={t("campaigns.title")}
        description={
          <>
            {t("notify.fromSite")} <Link href="/dashboard/setup">{t("notify.backToSetup")}</Link>
          </>
        }
      />
    );
  }
  const { deleted } = await searchParams;
  const store = await getStore();
  const now = new Date();
  const [campaigns, zone] = await Promise.all([store.listNotificationCampaigns(app.id, CAMPAIGN_LIMITS.kept), appZone(store, app)]);
  const stats = await campaignStats(store, app, campaigns, now);
  const weekdays = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : lang, { weekday: "long", timeZone: "UTC" });

  const group = (c: (typeof campaigns)[number]) => (c.status === "scheduled" || c.status === "sending" ? "waiting" : c.status === "failed" ? "stopped" : c.status);
  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: back to notifications, New campaign, the numbers, then the campaigns with search and filters. */}
      <PageHeader
        back={{ href: "/dashboard/notifications", label: t("campaigns.back") }}
        title={t("campaigns.title")}
        description={t("campaigns.intro")}
        actions={
          <Link href="/dashboard/notifications/campaigns/new" className={`${btn.main} h-11`}>
            <Icon name="add" size={20} />
            {t("campaigns.newCampaign")}
          </Link>
        }
      />
      {deleted ? (
        <Notice tone="success" icon="check_circle" role="status">
          {t("campaigns.deleted")}
        </Notice>
      ) : null}
      {campaigns.length ? (
        <StatRow label={t("campaigns.title")}>
          <Stat icon="campaign" label={t("campaigns.title")} value={campaigns.length} />
          <Stat icon="schedule" tone="accent" label={t("campaigns.waiting")} value={campaigns.filter((c) => group(c) === "waiting").length} />
          <Stat icon="check_circle" tone="success" label={t("campaigns.sent")} value={campaigns.filter((c) => c.status === "sent").length} />
          <Stat icon="edit" label={t("campaigns.draft")} value={campaigns.filter((c) => c.status === "draft").length} />
        </StatRow>
      ) : null}
      <Section
        titleId="h-campaigns"
        title={campaigns.length ? t("campaigns.listCount", { count: campaigns.length }) : t("campaigns.title")}
        description={campaigns.some((c) => stats.get(c.id)?.sends) ? t("campaigns.opensNote") : undefined}
        flush
      >
        {campaigns.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="campaign" title={t("campaigns.none")}>
              {t("campaigns.noneText")}
            </EmptyState>
          </div>
        ) : (
          <FilterList
            allLabel={t("common.all")}
            searchLabel={t("campaigns.search")}
            noMatch={t("campaigns.noMatch")}
            filters={[
              { value: "waiting", label: t("campaigns.waiting") },
              { value: "sent", label: t("campaigns.sent") },
              { value: "draft", label: t("campaigns.draft") },
              { value: "stopped", label: t("campaigns.stopped") },
            ]}
            items={campaigns.map((c, i) => {
              const local = c.sendAt ? utcToLocal(c.sendAt, zone) : null;
              const numbers = stats.get(c.id);
              return {
                id: c.id,
                text: `${c.title} ${c.body}`,
                group: group(c),
                node: (
                  <ItemRow
                    href={`/dashboard/notifications/campaigns/${c.id}`}
                    media={<Thumb icon={c.repeat === "weekly" ? "event" : "campaign"} shape="square" tint={i} />}
                    title={c.title}
                    meta={<span className="line-clamp-2">{c.body}</span>}
                    extra={
                      c.status === "scheduled" && local ? (
                        <span className="flex items-center gap-1 font-semibold">
                          <Icon name="schedule" size={16} className="text-muted" />
                          {c.repeat === "weekly" && c.weekday !== null && c.time
                            ? t("campaigns.weeklyOn", { day: weekdays.format(new Date(Date.UTC(1970, 0, 4 + c.weekday))), time: c.time })
                            : t("campaigns.next", { date: formatDate(lang, c.sendAt!, { weekday: "short", day: "numeric", month: "short", timeZone: zone }), time: local.time })}
                        </span>
                      ) : numbers?.sends ? (
                        <CampaignNumbers stats={numbers} />
                      ) : null
                    }
                    aside={<CampaignStatus campaign={c} />}
                  />
                ),
              };
            })}
          />
        )}
      </Section>
    </div>
  );
}
