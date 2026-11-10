import { LANGS, type Lang } from "@/i18n/config";
import { messagesFor } from "@/i18n";
import { isReviewSource, type ReviewSource } from "../brands";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import { isPlan, type Plan, type PlanInfo } from "../plans";
import { platformSetting } from "../settings/platform";
import { REVIEW_PHOTO_BYTES, REVIEWS_DEFAULTS, REVIEW_TEXT_MAX, type PublicReview, type ReviewRating, type ReviewsSetting, type SiteReview } from "./types";

/**
 * Customer reviews on the home page (Admin › Reviews): the team's form,
 * the reviews the page shows, and their photos. Only reviews saved with
 * the box "This is a real review and the customer agreed to it being
 * shown", and not hidden, ever reach the website.
 */

export const REVIEW_PHOTO_PREFIX = "review-photos/";
/** A photo's file name: what /api/reviews/photo/<name> serves. */
export const REVIEW_PHOTO_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/i;

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

export interface ReviewForm {
  name: string;
  role: string | null;
  city: string | null;
  appName: string | null;
  plan: Plan | null;
  client: string;
  rating: ReviewRating;
  lang: Lang;
  text: string;
  translations: Partial<Record<Lang, string>>;
  source: ReviewSource;
  sourceUrl: string | null;
  reviewedAt: Date;
  consent: true;
}

/** An http or https address, as typed (up to 500 characters), or null. */
export function parseSourceUrl(value: string): string | null {
  if (!value || value.length > 500) return null;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".") && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

function day(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const at = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(at.getTime()) || at.toISOString().slice(0, 10) !== value ? null : at;
}

/** The team's form, checked. */
export function readReviewForm(
  input: Record<string, unknown>,
  plans: Record<Plan, PlanInfo>,
  now: Date,
): { ok: true; form: ReviewForm } | { ok: false; errors: Record<string, string> } {
  const text = (name: string, max: number) => (typeof input[name] === "string" ? (input[name] as string).trim().slice(0, max) : "");
  const long = (name: string) => (typeof input[name] === "string" ? (input[name] as string).replace(/\r\n/g, "\n").trim() : "");
  const errors: Record<string, string> = {};
  const name = text("name", 80);
  if (name.length < 2) errors.name = "Enter the customer's name as they agreed to be shown.";
  const planId = text("plan", 16);
  const plan = planId ? (isPlan(planId) && plans[planId] ? planId : null) : null;
  if (planId && !plan) errors.plan = "Choose a plan from the list.";
  const rating = Number(text("rating", 1));
  if (![1, 2, 3, 4, 5].includes(rating)) errors.rating = "Choose 1 to 5 stars.";
  const lang = text("lang", 2);
  if (!isLang(lang)) errors.lang = "Choose the language it was written in.";
  const body = long("text");
  if (body.length < 10) errors.text = "Enter the review as the customer wrote it.";
  else if (body.length > REVIEW_TEXT_MAX) errors.text = `Up to ${REVIEW_TEXT_MAX} characters.`;
  const translations: Partial<Record<Lang, string>> = {};
  for (const l of LANGS) {
    const t = long(`text_${l}`);
    if (!t || l === lang) continue;
    if (t.length > REVIEW_TEXT_MAX) errors[`text_${l}`] = `Up to ${REVIEW_TEXT_MAX} characters.`;
    else translations[l] = t;
  }
  const source = text("source", 16) || "direct";
  if (!isReviewSource(source)) errors.source = "Choose where the review was written.";
  const urlText = text("sourceUrl", 501);
  const sourceUrl = urlText ? parseSourceUrl(urlText) : null;
  if (urlText && !sourceUrl) errors.sourceUrl = "An address starting with https:// or http://, up to 500 characters.";
  else if (sourceUrl && source === "direct") errors.sourceUrl = "A review given to us directly has no address. Choose where it was written, or leave the address empty.";
  const reviewedAt = day(text("reviewedOn", 10));
  if (!reviewedAt) errors.reviewedOn = "Enter the day the customer gave the review.";
  else if (reviewedAt.getTime() > now.getTime() + 12 * 3_600_000) errors.reviewedOn = "The day can't be in the future.";
  // The rule: only real reviews, with the customer's agreement.
  if (!(input.consent === "on" || input.consent === true)) errors.consent = "Tick the box: only real reviews the customer agreed to show can be added.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    form: {
      name,
      role: text("role", 80) || null,
      city: text("city", 60) || null,
      appName: text("appName", 80) || null,
      plan,
      client: text("client", 191),
      rating: rating as ReviewRating,
      lang: lang as Lang,
      text: body,
      translations,
      source: source as ReviewSource,
      sourceUrl,
      reviewedAt: reviewedAt!,
      consent: true,
    },
  };
}

/** A new review at the end of the page's order. */
export function newReview(form: ReviewForm, extra: { clientId: string | null; photo: string | null; position: number; createdBy: string; now: Date }): SiteReview {
  const { client, ...rest } = form;
  void client;
  return { id: newId(), ...rest, clientId: extra.clientId, photo: extra.photo, hidden: false, position: extra.position, createdBy: extra.createdBy, createdAt: extra.now };
}

/** The reviews the website shows: agreed to and not hidden, in the team's order. */
export function shownReviews(reviews: SiteReview[]): SiteReview[] {
  return reviews.filter((r) => r.consent === true && !r.hidden && r.text.trim()).sort((a, b) => a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime());
}

/** What the home page shows of each review in `lang`: the team's translation when there is one, else the customer's own words. */
export function publicReviews(reviews: SiteReview[], lang: Lang): PublicReview[] {
  return shownReviews(reviews).map((r, i) => {
    const translated = r.lang !== lang ? r.translations[lang]?.trim() : undefined;
    return {
      key: `review-${i}`,
      name: r.name,
      byline: [r.role, r.city].filter(Boolean).join(" · ") || null,
      about: r.appName,
      rating: r.rating,
      text: translated || r.text,
      textLang: translated ? lang : r.lang,
      photoUrl: r.photo ? `/api/reviews/photo/${r.photo}` : null,
      initial: ([...r.name.trim()][0] ?? "?").toLocaleUpperCase(),
      source: r.source ?? "direct",
      sourceUrl: r.source && r.source !== "direct" ? r.sourceUrl : null,
    };
  });
}

/** Admin › Reviews' setting, or the default (samples on). */
export async function reviewsSetting(store: DataStore, options: { fresh?: boolean } = {}): Promise<ReviewsSetting> {
  const saved = (await platformSetting(store, "reviews", options))?.value;
  return { samples: typeof saved?.samples === "boolean" ? saved.samples : REVIEWS_DEFAULTS.samples };
}

/**
 * The sample cards in `lang` (the i18n messages' `reviews.samples`): each
 * labelled "Sample review" on the card, a role and a city instead of a
 * name, no rating, no source badge and no link. Never review rows.
 */
export function sampleReviews(lang: Lang): PublicReview[] {
  const r = messagesFor(lang).reviews;
  return Object.entries(r.samples).map(([key, s]) => ({
    key: `sample-${key}`,
    name: s.who,
    byline: null,
    about: s.app,
    rating: 5,
    text: s.text,
    textLang: lang,
    photoUrl: null,
    initial: "",
    source: "direct",
    sourceUrl: null,
    sample: true,
  }));
}

/** What the home page's reviews section shows: the real shown reviews with their average, else the labelled samples, else nothing. */
export type ReviewsView = { kind: "real"; reviews: PublicReview[]; average: number; count: number } | { kind: "samples"; reviews: PublicReview[] } | null;

export function reviewsView(reviews: SiteReview[], setting: ReviewsSetting, lang: Lang): ReviewsView {
  const real = publicReviews(reviews, lang);
  if (real.length) return { kind: "real", reviews: real, average: Math.round((real.reduce((sum, r) => sum + r.rating, 0) / real.length) * 10) / 10, count: real.length };
  return setting.samples ? { kind: "samples", reviews: sampleReviews(lang) } : null;
}

/** The home page's reviews section in `lang`. */
export async function homeReviews(store: DataStore, lang: Lang): Promise<ReviewsView> {
  const [reviews, setting] = await Promise.all([store.listSiteReviews(), reviewsSetting(store)]);
  return reviewsView(reviews, setting, lang);
}

/** The rows the section draws: one still row for one or two cards; then two rows (three from 12), drifting in turn left and right. */
export function reviewRows<T>(items: T[]): { moving: boolean; rows: T[][] } {
  if (items.length === 0) return { moving: false, rows: [] };
  if (items.length < 3) return { moving: false, rows: [items] };
  const count = items.length >= 12 ? 3 : 2;
  if (items.length < 8) {
    const half = Math.ceil(items.length / 2);
    return { moving: true, rows: [items, [...items.slice(half), ...items.slice(0, half)]] };
  }
  const rows: T[][] = Array.from({ length: count }, () => []);
  items.forEach((item, i) => rows[i % count]!.push(item));
  return { moving: true, rows };
}

/** Moves a review one place up or down in the page's order; the positions are written again from 1. False when it can't move. */
export async function moveReview(store: DataStore, id: string, direction: "up" | "down"): Promise<boolean> {
  const all = await store.listSiteReviews();
  const at = all.findIndex((r) => r.id === id);
  const to = direction === "up" ? at - 1 : at + 1;
  if (at < 0 || to < 0 || to >= all.length) return false;
  [all[at], all[to]] = [all[to]!, all[at]!];
  await Promise.all(all.map((r, i) => (r.position === i + 1 ? null : store.saveSiteReview({ ...r, position: i + 1 }))));
  return true;
}

/** A photo's type from its first bytes (PNG, JPEG or WebP), or null. */
export function photoType(data: Buffer): { contentType: string; extension: "png" | "jpg" | "webp" } | null {
  if (data.length < 12) return null;
  if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { contentType: "image/png", extension: "png" };
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return { contentType: "image/jpeg", extension: "jpg" };
  if (data.toString("latin1", 0, 4) === "RIFF" && data.toString("latin1", 8, 12) === "WEBP") return { contentType: "image/webp", extension: "webp" };
  return null;
}

/** Checks a photo the team chose: an error for the form, or its bytes and type. */
export function checkPhoto(size: number, data: Buffer): { ok: true; type: NonNullable<ReturnType<typeof photoType>> } | { ok: false; error: string } {
  if (size > REVIEW_PHOTO_BYTES) return { ok: false, error: "The photo is over 5 MB. Make it smaller." };
  const type = photoType(data);
  return type ? { ok: true, type } : { ok: false, error: "Use a PNG, JPEG or WebP photo." };
}
