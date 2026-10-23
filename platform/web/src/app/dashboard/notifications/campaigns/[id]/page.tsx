import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteCampaignAction, sendCampaignNowAction, stopCampaignAction } from "@/app/actions/campaigns";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Notice } from "@/components/ui";
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
  if (!app || app.backend !== "hosted") redirect("/dashboard/notifications/campaigns");
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

  return (
    <div className="flex max-w-[760px] flex-col gap-5">
      <Link href="/dashboard/notifications/campaigns" className="flex items-center gap-1 text-[14px] font-semibold no-underline">
        <Icon name="arrow_back" size={18} className="rtl:rotate-180" />
        {t("campaigns.title")}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{campaign.title}</h1>
        <CampaignStatus campaign={campaign} />
      </div>
      {notice ? (
        <Notice tone="info" icon="info" role="status">
          {k(notice)}
        </Notice>
      ) : null}

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <p className="m-0 text-[15px] text-ink-4">{campaign.body}</p>
        {campaign.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={campaign.imageUrl} alt={t("campaigns.pictureAlt")} className="h-32 w-full max-w-[320px] rounded-xl border border-line object-cover" />
        ) : null}
        {campaign.status === "scheduled" && campaign.sendAt ? (
          <p className="m-0 text-[14px] text-muted">
            {campaign.repeat === "weekly" && campaign.time ? `${t("campaigns.weeklyOn", { day: weekday, time: campaign.time })} · ` : ""}
            {t("campaigns.next", { date: formatDate(lang, campaign.sendAt, { weekday: "short", day: "numeric", month: "short", timeZone: zone }), time: utcToLocal(campaign.sendAt, zone).time })}
          </p>
        ) : null}
        {numbers && numbers.sends > 0 ? (
          <>
            <CampaignNumbers stats={numbers} />
            <p className="m-0 text-[13px] text-muted">{t("campaigns.opensNote")}</p>
          </>
        ) : null}
        {campaign.result && campaign.status === "failed" ? (
          <p className="m-0 text-[14px] text-danger">
            {t("campaigns.lastResult")}: {k(campaign.result)}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {campaign.status === "draft" ? (
            <form action={sendCampaignNowAction}>
              <input type="hidden" name="id" value={campaign.id} />
              <SubmitButton className="h-10" pendingText={t("common.sending")}>
                {t("campaigns.sendNow")}
              </SubmitButton>
            </form>
          ) : null}
          {campaign.status === "scheduled" ? (
            <form action={stopCampaignAction}>
              <input type="hidden" name="id" value={campaign.id} />
              <SubmitButton variant="secondary" className="h-10" pendingText={t("common.saving")}>
                {t(campaign.repeat === "weekly" ? "campaigns.stop" : "campaigns.backToDraft")}
              </SubmitButton>
            </form>
          ) : null}
          {campaign.status !== "sending" ? (
            <form action={deleteCampaignAction}>
              <input type="hidden" name="id" value={campaign.id} />
              <SubmitButton variant="danger" className="h-10" pendingText={t("common.saving")}>
                {richText(t("campaigns.delete", { title: campaign.title }), sr)}
              </SubmitButton>
            </form>
          ) : null}
        </div>
      </section>

      {sends.length > 0 ? (
        <section aria-labelledby="h-sends" className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-sends" className="m-0 text-lg font-bold">
            {t("campaigns.history")}
          </h2>
          <ul className="m-0 flex list-none flex-col p-0">
            {sends.slice(0, 30).map((s) => (
              <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line-soft py-2 first:border-t-0">
                <span className="text-[14px] font-semibold">{t("campaigns.sentOn", { date: when(s.sentAt) })}</span>
                <span className="text-[14px] text-muted">
                  {t("campaigns.people")} {s.recipients} · {t("campaigns.reached")} {s.pushed} · {t("campaigns.missed")} {s.failed}
                </span>
              </li>
            ))}
          </ul>
        </section>
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
    </div>
  );
}
