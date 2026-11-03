import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { deleteCampaignAction, sendCampaignNowAction, stopCampaignAction } from "@/app/actions/campaigns";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { DetailLayout, ItemList, ItemRow, Thumb } from "@/components/page-kit";
import { Notice, PageHeader, Section } from "@/components/ui";
import { formatDate } from "@/i18n/format";
import { richText } from "@/i18n/rich";
import { appZone } from "@/lib/analytics/zone";
import { utcToLocal } from "@/lib/bookings/time";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { appUrl } from "@/lib/env";
import { campaignStats } from "@/lib/hosted/campaigns";
import { campaignChoices, campaignFormValues } from "../choices";
import { CampaignForm } from "../forms";
import { CampaignNumbers, CampaignStatus } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("campaigns.title") };
}

/** 85.2 One campaign: how it did, each send, and what can be done with it now. */
export default async function CampaignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string }> }) {
  const { app } = await requireClient("notifications");
  if (!app || (app.backend !== "hosted" && app.backend !== "wordpress")) redirect("/dashboard/notifications/campaigns");
  const { t, k, lang } = await dashboardText();
  const id = Number((await params).id);
  const store = await getStore();
  const campaign = Number.isSafeInteger(id) ? await store.getNotificationCampaign(app.id, id) : null;
  if (!campaign) notFound();
  const { notice } = await searchParams;
  const now = new Date();
  const [zone, sends, stats, choices] = await Promise.all([
    appZone(store, app),
    store.listCampaignSends(app.id, [campaign.id]),
    campaignStats(store, app, [campaign], now),
    campaignChoices(store, app, lang, now),
  ]);
  const numbers = stats.get(campaign.id);
  const editable = campaign.status === "draft" || campaign.status === "scheduled";
  const when = (date: Date) => formatDate(lang, date, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: zone });
  const weekday = campaign.weekday === null ? "" : new Intl.DateTimeFormat(lang === "en" ? "en-GB" : lang, { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(1970, 0, 4 + campaign.weekday)));
  const sr = { sr: (chunk: React.ReactNode) => <span className="sr-only">{chunk}</span> };

  const actions = (
    <>
      {campaign.status === "draft" ? (
        <form action={sendCampaignNowAction}>
          <input type="hidden" name="id" value={campaign.id} />
          <SubmitButton variant="main" className="h-11" pendingText={t("common.sending")}>
            <Icon name="send" size={20} />
            {t("campaigns.sendNow")}
          </SubmitButton>
        </form>
      ) : null}
      {campaign.status === "scheduled" ? (
        <form action={stopCampaignAction}>
          <input type="hidden" name="id" value={campaign.id} />
          <SubmitButton variant="secondary" className="h-11" pendingText={t("common.saving")}>
            {t(campaign.repeat === "weekly" ? "campaigns.stop" : "campaigns.backToDraft")}
          </SubmitButton>
        </form>
      ) : null}
    </>
  );
  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: back to the campaigns, its one action, the message and its sends, and how it did beside them. */}
      <PageHeader
        back={{ href: "/dashboard/notifications/campaigns", label: t("campaigns.title") }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {campaign.title}
            <CampaignStatus campaign={campaign} />
          </span>
        }
        actions={campaign.status === "draft" || campaign.status === "scheduled" ? actions : null}
      />
      {notice ? (
        <Notice tone="info" icon="info" role="status">
          {k(notice)}
        </Notice>
      ) : null}

      <DetailLayout
        main={
          <>
            <Section titleId="h-message" title={t("campaigns.message")}>
              <p className="m-0 text-[15px] leading-relaxed text-ink-2 whitespace-pre-line" dir="auto">
                {campaign.body}
              </p>
              {campaign.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={campaign.imageUrl} alt={t("campaigns.pictureAlt")} className="h-40 w-full max-w-[360px] rounded-xl border border-line object-cover" />
              ) : null}
              {campaign.status === "scheduled" && campaign.sendAt ? (
                <p className="m-0 flex items-center gap-1.5 text-[14px] font-semibold text-muted">
                  <Icon name="schedule" size={18} />
                  {campaign.repeat === "weekly" && campaign.time ? `${t("campaigns.weeklyOn", { day: weekday, time: campaign.time })} · ` : ""}
                  {t("campaigns.next", { date: formatDate(lang, campaign.sendAt, { weekday: "short", day: "numeric", month: "short", timeZone: zone }), time: utcToLocal(campaign.sendAt, zone).time })}
                </p>
              ) : null}
              {campaign.result && campaign.status === "failed" ? (
                <p className="m-0 text-[14px] text-danger">
                  {t("campaigns.lastResult")}: {k(campaign.result)}
                </p>
              ) : null}
            </Section>

            {sends.length > 0 ? (
              <Section titleId="h-sends" title={t("campaigns.history")} flush>
                <ItemList>
                  {sends.slice(0, 30).map((s, i) => (
                    <ItemRow
                      key={s.id}
                      media={<Thumb icon="send" shape="square" tint={i} />}
                      title={t("campaigns.sentOn", { date: when(s.sentAt) })}
                      meta={`${t("campaigns.people")} ${s.recipients} · ${t("campaigns.reached")} ${s.pushed} · ${t("campaigns.missed")} ${s.failed}`}
                    />
                  ))}
                </ItemList>
              </Section>
            ) : null}

            {editable ? (
              <section aria-labelledby="h-edit" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
                <details open={campaign.status === "draft"}>
                  <summary id="h-edit" className="cursor-pointer text-lg font-bold">
                    {t("campaigns.edit")}
                  </summary>
                  <div className="pt-4">
                    <CampaignForm initial={campaignFormValues(app, campaign, zone, appUrl())} choices={choices} />
                  </div>
                </details>
              </section>
            ) : null}
          </>
        }
        side={
          <>
            {numbers && numbers.sends > 0 ? (
              <Section titleId="h-numbers" title={t("campaigns.numbers")} description={t("campaigns.opensNote")}>
                <CampaignNumbers stats={numbers} />
              </Section>
            ) : null}
            {campaign.status !== "sending" ? (
              <Section titleId="h-campaign-delete" title={t("campaigns.deleteTitle")}>
                <form action={deleteCampaignAction}>
                  <input type="hidden" name="id" value={campaign.id} />
                  <SubmitButton variant="danger" className="h-10" pendingText={t("common.saving")}>
                    {richText(t("campaigns.delete", { title: campaign.title }), sr)}
                  </SubmitButton>
                </form>
              </Section>
            ) : null}
          </>
        }
      />
    </div>
  );
}
