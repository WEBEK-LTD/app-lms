import Link from "next/link";
import { notFound } from "next/navigation";
import { setListingFeaturedAction, setListingStatusAction } from "@/app/actions/listings";
import { SubmitButton } from "@/components/form";
import { Badge } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { centsToDecimal } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import type { Listing, ListingStatus } from "@/lib/data/types";
import { areaSymbol, isPropertyType, LISTING_CURRENCIES, listingSettingsFor, PROPERTY_TYPES } from "@/lib/listings/types";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";
import type { DashKey } from "@/i18n/dashboard";
import { ListingForm, type ListingFormValues } from "./forms";

export function StatusBadge({ status, t }: { status: ListingStatus; t: DashboardText["t"] }) {
  if (status === "published") return <Badge tone="success">{t("listings.published")}</Badge>;
  if (status === "draft") return <Badge tone="neutral">{t("listings.draft")}</Badge>;
  return <Badge tone="warn">{t("listings.archived")}</Badge>;
}

/** A property type's name in the dashboard's language; an unknown key shows as it is. */
export function propertyTypeIn(t: DashboardText["t"], key: string): string {
  return isPropertyType(key) ? t(`listings.types.${key}`) : key;
}

const text = (value: number | null) => (value === null ? "" : String(value));

function formValues(l: Listing): ListingFormValues {
  return {
    id: l.id,
    reference: l.reference ?? "",
    title: l.title,
    description: l.description,
    purpose: l.purpose,
    type: l.type,
    // Whole amounts without ".00", as offices type them.
    price: centsToDecimal(l.priceCents).replace(/\.00$/, ""),
    currency: l.currency,
    period: l.pricePeriod ?? "",
    negotiable: l.negotiable,
    city: l.city,
    district: l.district ?? "",
    address: l.address ?? "",
    latitude: text(l.latitude),
    longitude: text(l.longitude),
    area: text(l.area),
    bedrooms: text(l.bedrooms),
    bathrooms: text(l.bathrooms),
    floor: text(l.floor),
    yearBuilt: text(l.yearBuilt),
    furnished: l.furnished === null ? "" : l.furnished ? "yes" : "no",
    features: l.features.join("\n"),
    videoUrl: l.videoUrl ?? "",
    images: l.imageAssetIds.map((id) => ({ id, url: assetUrl(id) })),
  };
}

const STATUS_ACTIONS: Record<ListingStatus, { status: ListingStatus; label: DashKey; primary?: boolean }[]> = {
  draft: [
    { status: "published", label: "listings.publish", primary: true },
    { status: "archived", label: "listings.archive" },
  ],
  published: [
    { status: "draft", label: "listings.unpublish" },
    { status: "archived", label: "listings.archive" },
  ],
  archived: [
    { status: "published", label: "listings.publishAgain", primary: true },
    { status: "draft", label: "listings.toDrafts" },
  ],
};

const STATUS_TEXT: Record<ListingStatus, DashKey> = {
  draft: "listings.isDraft",
  published: "listings.isPublished",
  archived: "listings.isArchived",
};

/** Adding (id null) or editing a listing. */
export async function ListingPage({ id }: { id: number | null }) {
  const { app } = await requireClient();
  if (!app || app.connector?.kind !== "listings") notFound();
  const store = await getStore();
  const [listing, saved] = await Promise.all([id !== null ? store.getListing(app.id, id) : Promise.resolve(null), store.getListingSettings(app.id)]);
  if (id !== null && !listing) notFound();
  const settings = listingSettingsFor(app, saved);
  const { t } = await dashboardText();
  const values: ListingFormValues = listing
    ? formValues(listing)
    : {
        id: null,
        reference: "",
        title: "",
        description: "",
        purpose: "sale",
        type: "",
        price: "",
        currency: settings.currency,
        period: "",
        negotiable: false,
        city: "",
        district: "",
        address: "",
        latitude: "",
        longitude: "",
        area: "",
        bedrooms: "",
        bathrooms: "",
        floor: "",
        yearBuilt: "",
        furnished: "",
        features: "",
        videoUrl: "",
        images: [],
      };
  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/listings" className="text-sm font-semibold">
          {t("listings.back")}
        </Link>
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{listing ? listing.title : t("listings.newListing")}</h1>
      </div>
      {listing ? (
        <section aria-labelledby="h-status" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="h-status" className="m-0 text-lg font-bold">
              {t("common.status")}
            </h2>
            <StatusBadge status={listing.status} t={t} />
            {listing.featured ? <Badge tone="info">{t("listings.featured")}</Badge> : null}
          </div>
          <p className="m-0 text-[15px] text-ink-4">{t(STATUS_TEXT[listing.status])}</p>
          <div className="flex flex-wrap gap-3">
            {STATUS_ACTIONS[listing.status].map((a) => (
              <form key={a.status} action={setListingStatusAction}>
                <input type="hidden" name="id" value={listing.id} />
                <input type="hidden" name="status" value={a.status} />
                <SubmitButton variant={a.primary ? "primary" : "secondary"} className="h-10" pendingText={t("common.saving")}>
                  {t(a.label)}
                </SubmitButton>
              </form>
            ))}
            <form action={setListingFeaturedAction}>
              <input type="hidden" name="id" value={listing.id} />
              <input type="hidden" name="featured" value={listing.featured ? "off" : "on"} />
              <SubmitButton variant="secondary" className="h-10" pendingText={t("common.saving")}>
                {listing.featured ? t("listings.unfeature") : t("listings.markFeatured")}
              </SubmitButton>
            </form>
          </div>
        </section>
      ) : null}
      <section aria-label={t("listings.listing")} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <ListingForm
          listing={values}
          types={PROPERTY_TYPES.map((type) => ({ key: type.key, label: propertyTypeIn(t, type.key) }))}           currencies={LISTING_CURRENCIES}
          areaSymbol={areaSymbol(settings.areaUnit)}
        />
      </section>
    </div>
  );
}
