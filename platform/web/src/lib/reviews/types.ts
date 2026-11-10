import type { Lang } from "@/i18n/config";
import type { ReviewSource } from "../brands";
import type { Plan } from "../plans";

/**
 * Customer reviews on the website's home page (Admin › Reviews): reviews
 * the team has from real customers, added with the box "This is a real
 * review and the customer agreed to it being shown", ordered, hidden or
 * deleted by the team. With no review shown, the home page has no reviews
 * section at all. There are no sample reviews outside the admin's preview.
 */
export interface SiteReview {
  id: string;
  /** The customer's name, as they agreed to be shown. */
  name: string;
  /** Their role or business ("Owner, Lale Flowers"). */
  role: string | null;
  city: string | null;
  /** The app the review is about, as the customer agreed to it being named. */
  appName: string | null;
  plan: Plan | null;
  /** The client's account, when there is one (never shown). */
  clientId: string | null;
  rating: ReviewRating;
  /** The language the customer wrote it in. */
  lang: Lang;
  /** As the customer wrote it. */
  text: string;
  /** The team's translations into the website's other languages. */
  translations: Partial<Record<Lang, string>>;
  /** The customer's photo: a file in the files store (review-photos/<name>), served by /api/reviews/photo/<name> while the review is shown. */
  photo: string | null;
  /** Where it was first written ("direct": given to us, no badge). */
  source: ReviewSource;
  /** The original review there (http or https), or null. */
  sourceUrl: string | null;
  /** When the customer gave it. */
  reviewedAt: Date;
  /** The box above: without it a review can't be saved, and never shows. */
  consent: boolean;
  hidden: boolean;
  /** The order on the page, smallest first. */
  position: number;
  createdBy: string;
  createdAt: Date;
}

export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export const REVIEW_TEXT_MAX = 600;
export const REVIEW_PHOTO_BYTES = 5 * 1024 * 1024;

/** A review as the home page shows it in one language: no ids, no account, nothing the customer didn't agree to show. */
export interface PublicReview {
  key: string;
  name: string;
  /** "Owner, Lale Flowers · Istanbul". */
  byline: string | null;
  /** The app it is about, or null. */
  about: string | null;
  rating: ReviewRating;
  text: string;
  /** The language `text` is in: the visitor's when translated, else the customer's own. */
  textLang: Lang;
  photoUrl: string | null;
  /** The name's first letter, without a photo. */
  initial: string;
  source: ReviewSource;
  sourceUrl: string | null;
  /** A labelled sample card (from the i18n messages), never a review: no badge, no link, no rating, no score. */
  sample?: true;
}

/** Admin › Reviews' setting. */
export interface ReviewsSetting {
  /** "Show sample cards until real reviews are added" (on by default). Once a real review is shown, samples never show. */
  samples: boolean;
}

export const REVIEWS_DEFAULTS: ReviewsSetting = { samples: true };
