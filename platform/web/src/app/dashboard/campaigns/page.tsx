import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, PageHeader, ProgressBar, Section, btn } from "@/components/ui";
import { ItemRow, LinkCards, PageGroup, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterList } from "@/components/page-kit-client";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { CATALOG_CURRENCIES, formatCents } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import { CampaignStatusBadge } from "./campaign-page";
import { raisedLine } from "@/lib/donations/page-items";
import { donationSettingsOf, donationsSetUp, publicStatus } from "@/lib/donations/service";
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
      <div className="flex flex-col gap-6">
        <PageHeader title={t("donations.campaigns")} description={richText(t("donations.campaignsNotHere"), { link: (chunk) => <Link href="/dashboard/app-type">{chunk}</Link> })} />
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

  const has = campaigns.length > 0;
  const groupOf = (c: (typeof campaigns)[number]) => publicStatus(c, now) ?? "draft";
  const addLink = (
    <Link href="/dashboard/campaigns/new" className={`${btn.main} h-11`}>
      <Icon name="add" size={20} />
      {t("donations.addCampaign")}
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its one main action, the numbers, the donations, the campaigns, then payments and settings. */}
      <PageHeader title={t("donations.campaigns")} description={t("donations.campaignsIntro")} actions={has ? addLink : null} />

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

      {has ? (
        <StatRow label={t("donations.campaigns")}>
          <Stat icon="campaign" label={t("donations.open")} value={campaigns.filter((c) => groupOf(c) === "open").length} tone="success" />
          <Stat icon="volunteer_activism" tone="accent" label={t("donations.statRaised")} value={formatCents(campaigns.reduce((sum, c) => sum + c.raisedCents, 0), settings.currency)} />
          <Stat icon="groups" label={t("donations.donorsTitle")} value={campaigns.reduce((sum, c) => sum + c.donorCount, 0)} href="/dashboard/donations/donors" />
        </StatRow>
      ) : null}

      <LinkCards
        label={t("donations.toolsLabel")}
        items={[
          { href: "/dashboard/donations", icon: "receipt_long", label: t("donations.donations"), hint: t("donations.donationsHint") },
          { href: "/dashboard/donations/donors", icon: "groups", label: t("donations.donorsTitle"), hint: t("donations.donorsHint") },
        ]}
      />

      <Section titleId="h-campaigns" title={t("donations.count", { count: campaigns.length })} flush>
        {has ? (
          <FilterList
            allLabel={t("common.all")}
            searchLabel={t("donations.search")}
            noMatch={t("donations.noMatch")}
            filters={[
              { value: "open", label: t("donations.open") },
              { value: "draft", label: t("donations.draft") },
              { value: "closed", label: t("donations.ended") },
            ]}
            items={campaigns.map((c, i) => ({
              id: c.id,
              text: [c.title, c.summary].filter(Boolean).join(" "),
              group: groupOf(c),
              node: (
                <ItemRow
                  href={`/dashboard/campaigns/${c.id}`}
                  media={<Thumb src={c.imageAssetIds[0] ? assetUrl(c.imageAssetIds[0]) : null} icon="volunteer_activism" tint={i} />}
                  title={c.title}
                  badges={
                    <>
                      <SampleBadge sample={c.sample} />
                      {c.featured ? <Badge tone="info">{t("donations.featured")}</Badge> : null}
                    </>
                  }
                  meta={[raisedLine(c, settings.currency, itemWords(lang)), t("donations.donors", { count: c.donorCount }), c.endsAt ? t("donations.ends", { date: date(c.endsAt, ENDS) }) : null]
                    .filter(Boolean)
                    .join(" · ")}
                  extra={c.goalCents ? <span className="block w-full max-w-[320px]"><ProgressBar value={c.raisedCents} max={c.goalCents} label={t("donations.raisedSoFar", { title: c.title })} tone="success" /></span> : null}
                  aside={<CampaignStatusBadge campaign={c} now={now} t={t} />}
                />
              ),
            }))}
          />
        ) : (
          <div className="p-5 sm:p-6">
            <EmptyState icon="volunteer_activism" title={t("donations.noCampaigns")} action={addLink} />
          </div>
        )}
      </Section>

      <PageGroup title={t("donations.groupSettings")}>
        {ready ? <DonationPayments app={app} currency={settings.currency} /> : null}
        <Section titleId="h-donation-settings" title={t("donations.inApp")} description={t("donations.inAppText")} className="max-w-[640px]">
          <DonationSettingsForm settings={settings} currencies={CATALOG_CURRENCIES} currencyLocked={given.total > 0} />
        </Section>
      </PageGroup>
    </div>
  );
}
