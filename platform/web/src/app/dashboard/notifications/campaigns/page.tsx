import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { btn, EmptyState, Notice } from "@/components/ui";
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
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("campaigns.title")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {t("notify.fromSite")} <Link href="/dashboard/setup">{t("notify.backToSetup")}</Link>
        </p>
      </div>
    );
  }
  const { deleted } = await searchParams;
  const store = await getStore();
  const now = new Date();
  const [campaigns, zone] = await Promise.all([store.listNotificationCampaigns(app.id, CAMPAIGN_LIMITS.kept), appZone(store, app)]);
  const stats = await campaignStats(store, app, campaigns, now);
  const weekdays = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : lang, { weekday: "long", timeZone: "UTC" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[680px] flex-col gap-2">
        <Link href="/dashboard/notifications" className="flex items-center gap-1 text-[14px] font-semibold no-underline">
          <Icon name="arrow_back" size={18} className="rtl:rotate-180" />
          {t("campaigns.back")}
        </Link>
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("campaigns.title")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("campaigns.intro")}</p>
      </div>
      {deleted ? (
        <div className="max-w-[680px]">
          <Notice tone="success" icon="check_circle" role="status">
            {t("campaigns.deleted")}
          </Notice>
        </div>
      ) : null}
      <div>
        <Link href="/dashboard/notifications/campaigns/new" className={`${btn.primary} h-11`}>
          <Icon name="add" size={20} />
          {t("campaigns.newCampaign")}
        </Link>
      </div>
      <section aria-label={t("campaigns.title")} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        {campaigns.length === 0 ? (
          <EmptyState icon="campaign" title={t("campaigns.none")}>
            {t("campaigns.noneText")}
          </EmptyState>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {campaigns.map((c) => {
              const local = c.sendAt ? utcToLocal(c.sendAt, zone) : null;
              return (
                <li key={c.id} className="flex flex-col gap-1 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/dashboard/notifications/campaigns/${c.id}`} className="text-[16px] font-bold">
                      {c.title}
                    </Link>
                    <CampaignStatus campaign={c} />
                  </div>
                  <span className="text-[15px] text-ink-4">{c.body}</span>
                  {c.status === "scheduled" && local ? (
                    <span className="text-[13px] text-muted">
                      {c.repeat === "weekly" && c.weekday !== null && c.time
                        ? t("campaigns.weeklyOn", { day: weekdays.format(new Date(Date.UTC(1970, 0, 4 + c.weekday))), time: c.time })
                        : t("campaigns.next", { date: formatDate(lang, c.sendAt!, { weekday: "short", day: "numeric", month: "short", timeZone: zone }), time: local.time })}
                    </span>
                  ) : null}
                  {stats.get(c.id)?.sends ? <CampaignNumbers stats={stats.get(c.id)!} /> : null}
                </li>
              );
            })}
          </ul>
        )}
        {campaigns.some((c) => stats.get(c.id)?.sends) ? <p className="m-0 text-[13px] text-muted">{t("campaigns.opensNote")}</p> : null}
      </section>
    </div>
  );
}
