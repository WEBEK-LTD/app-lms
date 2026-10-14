import { centsToDecimal } from "../catalog/money";
import type { Listing, ListingInquiry, ListingInquiryMessage } from "../data/types";
import { listingDescriptionHtml } from "./html";
import { propertyTypeLabel } from "./types";

/** The app contract's listing shapes (docs/api/openapi.yaml, tag Listings). */

const amount = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** "EGP 4,250,000", or "EGP 4,250.50" with cents. */
export function formatListingPrice(cents: number, currency: string): string {
  return `${currency} ${amount.format(cents / 100)}`;
}

export function listingPriceJson(l: Listing) {
  return {
    amount: centsToDecimal(l.priceCents),
    currency: l.currency,
    formatted: formatListingPrice(l.priceCents, l.currency),
    period: l.purpose === "rent" ? l.pricePeriod : null,
    negotiable: l.negotiable,
  };
}

export interface ListingJsonContext {
  assetUrl: (assetId: string) => string;
  /** The signed-in user's favorite listing IDs; empty when signed out. */
  favorites: Set<number>;
}

export function listingSummaryJson(l: Listing, ctx: ListingJsonContext) {
  return {
    id: l.id,
    reference: l.reference,
    title: l.title,
    purpose: l.purpose,
    type: l.type,
    type_label: propertyTypeLabel(l.type),
    price: listingPriceJson(l),
    image_url: l.imageAssetIds[0] ? ctx.assetUrl(l.imageAssetIds[0]) : null,
    city: l.city,
    district: l.district,
    area: l.area,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    featured: l.featured,
    favorited: ctx.favorites.has(l.id),
  };
}

export function listingDetailJson(l: Listing, similar: Listing[], ctx: ListingJsonContext) {
  return {
    ...listingSummaryJson(l, ctx),
    description_html: listingDescriptionHtml(l.description),
    images: l.imageAssetIds.map((assetId) => ({ url: ctx.assetUrl(assetId), alt: l.title })),
    video_url: l.videoUrl,
    features: l.features,
    floor: l.floor,
    year_built: l.yearBuilt,
    furnished: l.furnished,
    location: { address: l.address, latitude: l.latitude, longitude: l.longitude },
    similar: similar.map((s) => listingSummaryJson(s, ctx)),
    created_at: (l.publishedAt ?? l.createdAt).toISOString(),
  };
}

/** `Inquiry`: the full conversation, or only the latest message in lists. */
export function inquiryJson(
  inquiry: ListingInquiry,
  listing: Listing | null,
  messages: ListingInquiryMessage[],
  unread: number,
  assetUrl: (assetId: string) => string,
) {
  return {
    id: inquiry.id,
    listing: {
      id: inquiry.listingId,
      title: listing?.title ?? "Listing removed",
      image_url: listing?.imageAssetIds[0] ? assetUrl(listing.imageAssetIds[0]) : null,
    },
    status: inquiry.status,
    unread,
    updated_at: inquiry.updatedAt.toISOString(),
    messages: messages.map((m) => ({ id: m.id, from: m.from, text: m.text, created_at: m.createdAt.toISOString() })),
  };
}
