import { parsePrice } from "../catalog/money";
import type { ListingAreaUnit, ListingInput, ListingSettings } from "../data/types";
import { isPropertyType, LISTING_CURRENCIES } from "./types";

/** Checks of the dashboard's listing and office forms. */

export const LISTING_IMAGES_MAX = 20;
export const LISTING_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const LISTING_FEATURES_MAX = 30;
export const OFFICE_REPLY_MAX = 2000;

export type ListingFields = Omit<ListingInput, "appId" | "imageAssetIds" | "status" | "publishedAt" | "featured">;

type Result<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "+20 100 123 4567" to "+201001234567"; null when it isn't an international number. */
export function parseOfficePhone(value: string): string | null {
  const compact = value.replace(/[\s().-]/g, "");
  return /^\+[1-9]\d{6,14}$/.test(compact) ? compact : null;
}

function features(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\n,]/)) {
    const feature = raw.trim().replace(/\s+/g, " ");
    if (!feature || seen.has(feature.toLowerCase())) continue;
    seen.add(feature.toLowerCase());
    out.push(feature);
  }
  return out;
}

/** The listing's fields from the form's text values (checkboxes as "on"). */
export function parseListingForm(values: Record<string, string>, now: Date): Result<ListingFields> {
  const v = (name: string) => (values[name] ?? "").trim();
  const errors: Record<string, string> = {};
  const optionalNumber = (name: string, min: number, max: number, integer: boolean): number | null => {
    const raw = v(name).replace(/,/g, "");
    if (!raw) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
      errors[name] = `Enter ${integer ? "a whole number" : "a number"} from ${min} to ${max}, or leave it empty.`;
      return null;
    }
    return value;
  };

  const title = v("title");
  if (!title) errors.title = "Enter a title.";
  else if (title.length > 150) errors.title = "Use at most 150 characters.";
  const description = v("description");
  if (description.length > 10_000) errors.description = "Use at most 10,000 characters.";
  const reference = v("reference");
  if (reference.length > 40) errors.reference = "Use at most 40 characters.";
  const purpose = v("purpose");
  if (purpose !== "sale" && purpose !== "rent") errors.purpose = "Choose for sale or for rent.";
  const type = v("type");
  if (!isPropertyType(type)) errors.type = "Choose the property type.";
  const price = parsePrice(v("price"));
  if (price === null || price === 0) errors.price = "Enter the price, like 4250000.";
  const currency = v("currency");
  if (!(LISTING_CURRENCIES as readonly string[]).includes(currency)) errors.currency = "Choose a currency.";
  const period = v("period");
  if (purpose === "rent" && period !== "month" && period !== "year") errors.period = "Choose per month or per year.";
  const city = v("city");
  if (!city) errors.city = "Enter the city.";
  else if (city.length > 80) errors.city = "Use at most 80 characters.";
  const district = v("district");
  if (district.length > 80) errors.district = "Use at most 80 characters.";
  const address = v("address");
  if (address.length > 200) errors.address = "Use at most 200 characters.";
  const latitude = optionalNumber("latitude", -90, 90, false);
  const longitude = optionalNumber("longitude", -180, 180, false);
  if (!errors.latitude && !errors.longitude && (latitude === null) !== (longitude === null)) {
    errors[latitude === null ? "latitude" : "longitude"] = "Enter both the latitude and the longitude, or neither.";
  }
  const area = optionalNumber("area", 1, 10_000_000, false);
  const bedrooms = optionalNumber("bedrooms", 0, 50, true);
  const bathrooms = optionalNumber("bathrooms", 0, 50, true);
  const floor = optionalNumber("floor", -5, 200, true);
  const yearBuilt = optionalNumber("yearBuilt", 1800, now.getUTCFullYear() + 5, true);
  const furnished = v("furnished");
  if (furnished !== "" && furnished !== "yes" && furnished !== "no") errors.furnished = "Choose yes, no or not set.";
  const list = features(v("features"));
  if (list.length > LISTING_FEATURES_MAX) errors.features = `Add up to ${LISTING_FEATURES_MAX} features.`;
  else if (list.some((f) => f.length > 60)) errors.features = "Keep each feature to 60 characters.";
  const videoUrl = v("videoUrl");
  if (videoUrl) {
    let ok = false;
    try {
      ok = new URL(videoUrl).protocol === "https:" && videoUrl.length <= 500;
    } catch {
      ok = false;
    }
    if (!ok) errors.videoUrl = "Enter an https address, like a YouTube or Vimeo link.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      reference: reference || null,
      title,
      description,
      purpose: purpose as "sale" | "rent",
      type,
      priceCents: price!,
      currency,
      pricePeriod: purpose === "rent" ? (period as "month" | "year") : null,
      negotiable: v("negotiable") === "on",
      city,
      district: district || null,
      address: address || null,
      latitude,
      longitude,
      area,
      bedrooms,
      bathrooms,
      floor,
      yearBuilt,
      furnished: furnished === "" ? null : furnished === "yes",
      features: list,
      videoUrl: videoUrl || null,
    },
  };
}

/** The office settings from the form. */
export function parseOfficeForm(values: Record<string, string>): Result<ListingSettings> {
  const v = (name: string) => (values[name] ?? "").trim();
  const errors: Record<string, string> = {};
  const currency = v("currency");
  if (!(LISTING_CURRENCIES as readonly string[]).includes(currency)) errors.currency = "Choose a currency.";
  const areaUnit = v("areaUnit");
  if (areaUnit !== "m2" && areaUnit !== "ft2") errors.areaUnit = "Choose square metres or square feet.";
  const contactName = v("contactName");
  if (!contactName) errors.contactName = "Enter your office's name.";
  else if (contactName.length > 120) errors.contactName = "Use at most 120 characters.";
  const phone = (name: string): string | null => {
    if (!v(name)) return null;
    const parsed = parseOfficePhone(v(name));
    if (!parsed) errors[name] = "Use the international format, like +20 100 123 4567.";
    return parsed;
  };
  const contactPhone = phone("contactPhone");
  const contactWhatsapp = phone("contactWhatsapp");
  const contactEmail = v("contactEmail");
  if (contactEmail && (!EMAIL.test(contactEmail) || contactEmail.length > 191)) errors.contactEmail = "Enter a valid email address.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      currency,
      areaUnit: areaUnit as ListingAreaUnit,
      contactName,
      contactPhone,
      contactWhatsapp,
      contactEmail: contactEmail || null,
      messages: v("messages") === "on",
    },
  };
}
