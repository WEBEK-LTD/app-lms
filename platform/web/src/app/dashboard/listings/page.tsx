import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, Notice, PageHeader, Section, btn } from "@/components/ui";
import { ItemRow, PageGroup, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterList } from "@/components/page-kit-client";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { ListingStatus } from "@/lib/data/types";
import { formatListingPrice } from "@/lib/listings/json";
import { AREA_UNITS, LISTING_CURRENCIES, listingSettingsFor } from "@/lib/listings/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { OfficeForm } from "./forms";
import { propertyTypeIn, StatusBadge } from "./listing-page";
import { SampleBadge, SampleEntries, type SampleQuery } from "@/components/samples";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("listings.title") };
}

/** The properties of a Real estate app, and the office's settings. */
export default async function ListingsPage({ searchParams }: { searchParams: Promise<{ saved?: string } & SampleQuery> }) {
  const { app } = await requireClient("catalog");
  const { t } = await dashboardText();
  if (!app || app.connector?.kind !== "listings") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("listings.title")} description={richText(t("listings.notHere"), { link: (chunk) => <Link href="/dashboard/app-type">{chunk}</Link> })} />
      </div>
    );
  }
  const query = await searchParams;
  const { saved } = query;
  const store = await getStore();
  const [all, savedSettings, unread] = await Promise.all([
    store.listListings(app.id),
    store.getListingSettings(app.id),
    store.countUnreadListingInquiries(app.id),
  ]);
  const settings = listingSettingsFor(app, savedSettings);
  const unit = AREA_UNITS.find((u) => u.key === settings.areaUnit)?.symbol ?? "m²";
  const has = all.length > 0;
  const count = (status: ListingStatus) => all.filter((l) => l.status === status).length;
  const addLink = (
    <Link href="/dashboard/listings/new" className={`${btn.main} h-11`}>
      <Icon name="add" size={20} />
      {t("listings.add")}
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its one main action, the numbers, the listings, then the office. */}
      <PageHeader title={t("listings.title")} description={t("listings.intro")} actions={has ? addLink : null} />

      {saved ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          {t("listings.saved", { title: saved })}
        </p>
      ) : null}
      {/* 110.2 */}
      <SampleEntries app={app} list="listings" query={query} />
      {unread > 0 ? (
        <Notice tone="info" icon="chat">
          {t("listings.unread", { count: unread })} <Link href="/dashboard/inquiries">{t("listings.openInquiries")}</Link>
        </Notice>
      ) : null}

      {has ? (
        <StatRow label={t("listings.title")}>
          <Stat icon="home_work" label={t("listings.statListings")} value={all.length} />
          <Stat icon="check_circle" tone="success" label={t("listings.filterPublished")} value={count("published")} />
          <Stat icon="edit" tone="warn" label={t("listings.filterDrafts")} value={count("draft")} />
          <Stat icon="forum" tone="accent" label={t("listings.statUnread")} value={unread} href="/dashboard/inquiries" />
        </StatRow>
      ) : null}

      <Section titleId="h-listings" title={t("listings.count", { count: all.length })} flush>
        {has ? (
          <FilterList
            allLabel={t("listings.filterAll")}
            searchLabel={t("listings.searchPlaceholder")}
            noMatch={t("listings.noMatch")}
            filters={[
              { value: "published", label: t("listings.filterPublished") },
              { value: "draft", label: t("listings.filterDrafts") },
              { value: "archived", label: t("listings.filterArchived") },
            ]}
            items={all.map((l, i) => ({
              id: l.id,
              text: [l.title, l.reference, l.city, l.district].filter(Boolean).join(" "),
              group: l.status,
              node: (
                <ItemRow
                  href={`/dashboard/listings/${l.id}`}
                  media={<Thumb src={l.imageAssetIds[0] ? assetUrl(l.imageAssetIds[0]) : null} icon="apartment" tint={i} />}
                  title={l.title}
                  badges={
                    <>
                      <SampleBadge sample={l.sample} />
                      {l.featured ? <Badge tone="info">{t("listings.featured")}</Badge> : null}
                    </>
                  }
                  meta={[
                    l.purpose === "rent" && l.pricePeriod
                      ? t("listings.pricePer", { price: formatListingPrice(l.priceCents, l.currency), period: l.pricePeriod })
                      : formatListingPrice(l.priceCents, l.currency),
                    propertyTypeIn(t, l.type),
                    [l.district, l.city].filter(Boolean).join(", "),
                    l.area !== null ? `${l.area} ${unit}` : null,
                    l.reference,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  aside={<StatusBadge status={l.status} t={t} />}
                />
              ),
            }))}
          />
        ) : (
          <div className="p-5 sm:p-6">
            <EmptyState icon="home_work" title={t("listings.noListings")} action={addLink} />
          </div>
        )}
      </Section>

      <PageGroup title={t("listings.groupSettings")}>
        <Section titleId="h-office" title={t("listings.office")} description={t("listings.officeIntro")}>
          <OfficeForm
            office={{
              currency: settings.currency,
              areaUnit: settings.areaUnit,
              contactName: settings.contactName,
              contactPhone: settings.contactPhone ?? "",
              contactWhatsapp: settings.contactWhatsapp ?? "",
              contactEmail: settings.contactEmail ?? "",
              messages: settings.messages,
            }}
            currencies={LISTING_CURRENCIES}
            units={AREA_UNITS.map((u) => ({ key: u.key, label: t(`listings.units.${u.key}`) }))}
          />
        </Section>
      </PageGroup>
    </div>
  );
}
