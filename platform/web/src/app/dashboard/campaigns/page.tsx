import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, btn, ProgressBar } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { CATALOG_CURRENCIES } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import { CampaignStatusBadge } from "./campaign-page";
import { raisedLine } from "@/lib/donations/page-items";
import { donationSettingsOf, donationsSetUp } from "@/lib/donations/service";
import { DonationSettingsForm } from "./forms";
import { DonationPayments } from "./payments";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { itemWords } from "@/lib/hosted/pages/item-words";
import { SampleBadge, SampleEntries, type SampleQuery } from "@/components/samples";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("donations.campaigns") };
}

const ENDS: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Istanbul" };

/** 29 A charity's campaigns, its card payments and how the app takes donations. */
export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ saved?: string; published?: string; deleted?: string } & SampleQuery> }) {
  const { app } = await requireClient("donations");
  const { t, lang, date } = await dashboardText();
  if (!app || app.connector?.kind !== "campaigns") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("donations.campaigns")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {richText(t("donations.campaignsNotHere"), { link: (chunk) => <Link href="/dashboard/app-type">{chunk}</Link> })}
        </p>
      </div>
    );
  }
  const query = await searchParams;
  const { saved, published, deleted } = query;
  const store = await getStore();
  const now = new Date();
  const [campaigns, settingsRow, given] = await Promise.all([
    store.listCampaigns(app.id),
    store.getDonationSettings(app.id),
    store.listDonations({ appId: app.id, statuses: ["paid", "refunded"], offset: 0, limit: 1 }),
  ]);
  const settings = donationSettingsOf(settingsRow);
  const ready = donationsSetUp(app);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[620px] flex-col gap-2">
          <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("donations.campaigns")}</h1>
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("donations.campaignsIntro")}</p>
        </div>
        <Link href="/dashboard/campaigns/new" className={`${btn.primary} h-11`}>
          <Icon name="add" size={20} />
          {t("donations.addCampaign")}
        </Link>
      </div>

      {saved ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          {t(published ? "donations.published" : "donations.saved", { title: saved })}
        </p>
      ) : null}
      {deleted ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          {t("donations.deleted", { title: deleted })}
        </p>
      ) : null}
      {/* 110.2 */}
      <SampleEntries app={app} list="campaigns" query={query} />

      {!ready ? <DonationPayments app={app} currency={settings.currency} /> : null}

      <section aria-labelledby="h-campaigns" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-campaigns" className="m-0 text-lg font-bold">
          {t("donations.count", { count: campaigns.length })}
        </h2>
        {campaigns.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("donations.noCampaigns")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {campaigns.map((c) => (
              <li key={c.id} className="border-t border-line-soft first:border-t-0">
                <Link href={`/dashboard/campaigns/${c.id}`} className="flex items-center gap-3 py-3 text-midnight no-underline hover:bg-sand">
                  {c.imageAssetIds[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(c.imageAssetIds[0])} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-sand text-muted">
                      <Icon name="volunteer_activism" size={22} />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-[15px] font-bold">{c.title}</span>
                    <span className="truncate text-[13px] text-muted">
                      {[
                        raisedLine(c, settings.currency, itemWords(lang)),
                        t("donations.donors", { count: c.donorCount }),
                        c.endsAt ? t("donations.ends", { date: date(c.endsAt, ENDS) }) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {c.goalCents ? <ProgressBar value={c.raisedCents} max={c.goalCents} label={t("donations.raisedSoFar", { title: c.title })} tone="success" /> : null}
                  </span>
                  <SampleBadge sample={c.sample} />
                  {c.featured ? <Badge tone="info">{t("donations.featured")}</Badge> : null}
                  <CampaignStatusBadge campaign={c} now={now} t={t} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {ready ? <DonationPayments app={app} currency={settings.currency} /> : null}

      <section aria-labelledby="h-donation-settings" className="flex max-w-[640px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-donation-settings" className="m-0 text-lg font-bold">
            {t("donations.inApp")}
          </h2>
          <p className="m-0 text-[15px] text-ink-4">{t("donations.inAppText")}</p>
        </div>
        <DonationSettingsForm settings={settings} currencies={CATALOG_CURRENCIES} currencyLocked={given.total > 0} />
      </section>
    </div>
  );
}
