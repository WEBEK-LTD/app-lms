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
import { areaSymbol, LISTING_CURRENCIES, listingSettingsFor, PROPERTY_TYPES } from "@/lib/listings/types";
import { ListingForm, type ListingFormValues } from "./forms";

export function StatusBadge({ status }: { status: ListingStatus }) {
  if (status === "published") return <Badge tone="success">Published</Badge>;
  if (status === "draft") return <Badge tone="neutral">Draft</Badge>;
  return <Badge tone="warn">Archived</Badge>;
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

const STATUS_ACTIONS: Record<ListingStatus, { status: ListingStatus; label: string; primary?: boolean }[]> = {
  draft: [
    { status: "published", label: "Publish", primary: true },
    { status: "archived", label: "Archive" },
  ],
  published: [
    { status: "draft", label: "Unpublish" },
    { status: "archived", label: "Archive" },
  ],
  archived: [
    { status: "published", label: "Publish again", primary: true },
    { status: "draft", label: "Move to drafts" },
  ],
};

const STATUS_TEXT: Record<ListingStatus, string> = {
  draft: "A draft: only you see it.",
  published: "Published: it's in the app.",
  archived: "Archived: hidden from the app, kept with its messages.",
};

/** Adding (id null) or editing a listing. */
export async function ListingPage({ id }: { id: number | null }) {
  const { app } = await requireClient();
  if (!app || app.connector?.kind !== "listings") notFound();
  const store = await getStore();
  const [listing, saved] = await Promise.all([id !== null ? store.getListing(app.id, id) : Promise.resolve(null), store.getListingSettings(app.id)]);
  if (id !== null && !listing) notFound();
  const settings = listingSettingsFor(app, saved);
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
          ← Listings
        </Link>
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px] sm:text-[34px]">{listing ? listing.title : "New listing"}</h1>
      </div>
      {listing ? (
        <section aria-labelledby="h-status" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="h-status" className="m-0 text-[19px] font-bold">
              Status
            </h2>
            <StatusBadge status={listing.status} />
            {listing.featured ? <Badge tone="info">Featured</Badge> : null}
          </div>
          <p className="m-0 text-[15px] text-ink-4">{STATUS_TEXT[listing.status]}</p>
          <div className="flex flex-wrap gap-3">
            {STATUS_ACTIONS[listing.status].map((a) => (
              <form key={a.status} action={setListingStatusAction}>
                <input type="hidden" name="id" value={listing.id} />
                <input type="hidden" name="status" value={a.status} />
                <SubmitButton variant={a.primary ? "primary" : "secondary"} className="h-10" pendingText="Saving…">
                  {a.label}
                </SubmitButton>
              </form>
            ))}
            <form action={setListingFeaturedAction}>
              <input type="hidden" name="id" value={listing.id} />
              <input type="hidden" name="featured" value={listing.featured ? "off" : "on"} />
              <SubmitButton variant="secondary" className="h-10" pendingText="Saving…">
                {listing.featured ? "Remove from featured" : "Mark as featured"}
              </SubmitButton>
            </form>
          </div>
        </section>
      ) : null}
      <section aria-label="Listing" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <ListingForm listing={values} types={[...PROPERTY_TYPES]} currencies={LISTING_CURRENCIES} areaSymbol={areaSymbol(settings.areaUnit)} />
      </section>
    </div>
  );
}
