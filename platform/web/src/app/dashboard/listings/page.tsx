import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, btn } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { ListingStatus } from "@/lib/data/types";
import { formatListingPrice } from "@/lib/listings/json";
import { fold } from "@/lib/listings/search";
import { AREA_UNITS, LISTING_CURRENCIES, listingSettingsFor } from "@/lib/listings/types";
import { dashboardText } from "@/lib/dashboard-lang";
import type { DashKey } from "@/i18n/dashboard";
import { richText } from "@/i18n/rich";
import { OfficeForm } from "./forms";
import { propertyTypeIn, StatusBadge } from "./listing-page";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("listings.title") };
}

const STATUS_FILTERS: { value: ListingStatus | "all"; label: DashKey }[] = [
  { value: "all", label: "listings.filterAll" },
  { value: "published", label: "listings.filterPublished" },
  { value: "draft", label: "listings.filterDrafts" },
  { value: "archived", label: "listings.filterArchived" },
];

/** The properties of a Real estate app, and the office's settings. */
export default async function ListingsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; saved?: string }> }) {
  const { app } = await requireClient("catalog");
  const { t } = await dashboardText();
  if (!app || app.connector?.kind !== "listings") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("listings.title")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {richText(t("listings.notHere"), { link: (chunk) => <Link href="/dashboard/app-type">{chunk}</Link> })}
        </p>
      </div>
    );
  }
  const { q = "", status = "all", saved } = await searchParams;
  const store = await getStore();
  const [all, savedSettings, unread] = await Promise.all([
    store.listListings(app.id),
    store.getListingSettings(app.id),
    store.countUnreadListingInquiries(app.id),
  ]);
  const settings = listingSettingsFor(app, savedSettings);
  const words = fold(q.trim()).split(/\s+/).filter(Boolean);
  const listings = all.filter(
    (l) =>
      (status === "all" || l.status === status) &&
      words.every((w) => fold([l.title, l.reference, l.city, l.district].filter(Boolean).join(" ")).includes(w)),
  );
  const unit = AREA_UNITS.find((u) => u.key === settings.areaUnit)?.symbol ?? "m²";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[620px] flex-col gap-2">
          <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("listings.title")}</h1>
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("listings.intro")}</p>
        </div>
        <Link href="/dashboard/listings/new" className={`${btn.primary} h-11`}>
          <Icon name="add" size={20} />
          {t("listings.add")}
        </Link>
      </div>

      {saved ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          {t("listings.saved", { title: saved })}
        </p>
      ) : null}
      {unread > 0 ? (
        <p className="m-0 flex items-start gap-2 rounded-xl bg-peach px-4 py-3 text-[15px] text-ink-2">
          <Icon name="chat" size={20} className="text-accent" />
          <span>
            {t("listings.unread", { count: unread })} <Link href="/dashboard/inquiries">{t("listings.openInquiries")}</Link>
          </span>
        </p>
      ) : null}

      <section aria-labelledby="h-listings" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-listings" className="m-0 text-lg font-bold">
          {t("listings.count", { count: all.length })}
        </h2>
        <form method="get" className="flex flex-wrap items-end gap-3" role="search">
          <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
            <label htmlFor="f-q" className="text-sm font-semibold">
              {t("listings.search")}
            </label>
            <input id="f-q" name="q" type="search" defaultValue={q} placeholder={t("listings.searchPlaceholder")} className="input input-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-status" className="text-sm font-semibold">
              {t("common.status")}
            </label>
            <select id="f-status" name="status" defaultValue={status} className="input input-sm">
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(s.label)}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={`${btn.secondary} h-10`}>
            <Icon name="search" size={20} />
            {t("common.search")}
          </button>
        </form>
        {all.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("listings.noListings")}</p>
        ) : listings.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("listings.noMatch")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {listings.map((l) => (
              <li key={l.id} className="border-t border-line-soft first:border-t-0">
                <Link href={`/dashboard/listings/${l.id}`} className="flex items-center gap-3 py-3 text-midnight no-underline hover:bg-sand">
                  {l.imageAssetIds[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(l.imageAssetIds[0])} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sand text-muted">
                      <Icon name="apartment" size={22} />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-bold">{l.title}</span>
                    <span className="truncate text-[13px] text-muted">
                      {[
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
                    </span>
                  </span>
                  {l.featured ? <Badge tone="info">{t("listings.featured")}</Badge> : null}
                  <StatusBadge status={l.status} t={t} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="h-office" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-office" className="m-0 text-lg font-bold">
            {t("listings.office")}
          </h2>
          <p className="m-0 text-[15px] text-ink-4">{t("listings.officeIntro")}</p>
        </div>
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
      </section>
    </div>
  );
}
