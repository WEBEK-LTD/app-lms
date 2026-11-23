import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { MarketRating, MarketRatingSummary, MarketTemplate, TemplateDesigner } from "../data/types";
import { imageType } from "../images";
import type { Lang } from "@/i18n/config";
import { localePath } from "@/i18n/paths";

/**
 * 106.14 A designer's public page (yallapp.com.tr/designers/<handle>, in
 * Arabic /ar/designers/<handle>, in Turkish /tr/designers/<handle>), as the
 * owner approved it: their photo, name, the line about them, their country
 * and links when they choose to show them, every published template with
 * its price and rating, their overall rating, how many ratings and buyers,
 * and the buyers' ratings with the designer's answer under each.
 *
 * What it never shows: the designer's account, email, WhatsApp, ID or
 * payout details; a buyer's account, email or app (a rating shows their
 * first name and the family name's first letter only). The photo and the
 * line show once the team approved them the first time; a page the team
 * locked, of a suspended designer or without a published template is
 * "page not found".
 */

export const DESIGNER_PATH = "/designers";

/** A designer's English address on the website: /designers/<handle>. */
export function designerPath(slug: string): string {
  return `${DESIGNER_PATH}/${slug}`;
}

/** Where the cards' designer links start in a language ("/ar/designers"): `${base}/<handle>`. */
export function designersBase(lang: Lang): string {
  const one = localePath(lang, designerPath("x"));
  return one.slice(0, -"/x".length);
}

export const DESIGNER_LINKS_MAX = 4;
export const DESIGNER_LINK_LENGTH = 200;
/** PNG or JPEG, by its first bytes, up to 2 MB (the app logo's limit). */
export const DESIGNER_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export const RATING_LIMITS = { comment: 1000, reply: 1000, reason: 400, note: 1000 } as const;

/** English texts the dashboard translates (marketPage.known). */
export const PAGE_MESSAGES = {
  photo: "Choose a PNG or JPEG photo up to 2 MB.",
  links: "Enter up to 4 addresses that start with https://.",
  saved: "Saved.",
  stars: "Choose 1 to 5 stars.",
  comment: "Keep your comment to 1,000 characters.",
  notBuyer: "Only accounts that got this template can rate it.",
  ownTemplate: "You can't rate your own template.",
  rated: "Thanks. Your rating is on the template's page.",
  ratingChanged: "Your rating was changed.",
  reply: "Write a reply of up to 1,000 characters.",
  replied: "Your reply is under the rating.",
  replyRemoved: "Your reply was taken away.",
  gone: "This rating isn't there any more. Refresh the page.",
  busy: "That's a lot of tries in a short time. Wait a little and try again.",
} as const;

// ——— The profile's links ———

/** A link the designer gave: https, a real host, no account in it ("https://behance.net/nur"). Null otherwise. */
export function readDesignerLink(value: string): string | null {
  const text = value.trim();
  if (!text || text.length > DESIGNER_LINK_LENGTH) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port || !/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(url.hostname)) return null;
  return url.toString();
}

/** The links as typed (one per field, empty ones left out), checked; an error when one isn't an https address or there are too many. */
export function readDesignerLinks(values: readonly string[]): { ok: true; links: string[] } | { ok: false; error: string } {
  const typed = values.map((v) => v.trim()).filter(Boolean);
  if (typed.length > DESIGNER_LINKS_MAX) return { ok: false, error: PAGE_MESSAGES.links };
  const links: string[] = [];
  for (const value of typed) {
    const link = readDesignerLink(value);
    if (!link) return { ok: false, error: PAGE_MESSAGES.links };
    if (!links.includes(link)) links.push(link);
  }
  return { ok: true, links };
}

const SERVICES: [RegExp, string][] = [
  [/(^|\.)behance\.net$/, "Behance"],
  [/(^|\.)dribbble\.com$/, "Dribbble"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)linkedin\.com$/, "LinkedIn"],
  [/(^|\.)(x|twitter)\.com$/, "X"],
  [/(^|\.)github\.com$/, "GitHub"],
  [/(^|\.)youtube\.com$|^youtu\.be$/, "YouTube"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)facebook\.com$/, "Facebook"],
  [/(^|\.)figma\.com$/, "Figma"],
];

/** What a link shows: the service's name ("Behance"), else the site's own name ("nur.design"). */
export function linkLabel(link: string): string {
  const host = new URL(link).hostname.toLowerCase().replace(/^www\./, "");
  return SERVICES.find(([pattern]) => pattern.test(host))?.[1] ?? host;
}

// ——— The photo ———

/** A photo sent from the profile: PNG or JPEG by its first bytes, up to 2 MB; else an error. Nothing sent: null. */
export function readDesignerPhoto(data: Buffer | null): { ok: true; photo: { data: Buffer; contentType: string; extension: string } | null } | { ok: false; error: string } {
  if (!data || !data.length) return { ok: true, photo: null };
  if (data.length > DESIGNER_PHOTO_MAX_BYTES) return { ok: false, error: PAGE_MESSAGES.photo };
  const type = imageType(data);
  return type ? { ok: true, photo: { data, ...type } } : { ok: false, error: PAGE_MESSAGES.photo };
}

/** What the public pages may show of the designer: the photo and the line only once the team approved them. */
export function publicProfile(designer: Pick<TemplateDesigner, "photoAssetId" | "bio" | "profileReview">): { photoAssetId: string | null; bio: string | null } {
  const approved = designer.profileReview === "approved";
  return { photoAssetId: approved ? designer.photoAssetId : null, bio: approved ? designer.bio : null };
}

/** A designer whose page is public: active and not locked by the team (and, see `publicDesigner`, with a published template). */
export function pageOpen(designer: Pick<TemplateDesigner, "status" | "pageLockedAt"> | null): boolean {
  return Boolean(designer && designer.status === "active" && !designer.pageLockedAt);
}

// ——— Ratings ———

/** "Ahmed Kamal Hassan" → "Ahmed K."; one word stays as it is; nothing → "A Yallapp user" (the page translates it). */
export function ratingAuthorName(name: string): string {
  const words = name.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return "";
  const first = [...words[0]!].slice(0, 40).join("");
  const last = words.length > 1 ? [...words[words.length - 1]!][0] : null;
  return last ? `${first} ${last.toUpperCase()}.` : first;
}

export interface RatingInput {
  stars: string | number;
  comment: string;
}

/** The stars (1 to 5) and comment as sent, checked. */
export function readRating(input: RatingInput): { ok: true; stars: number; comment: string | null } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const stars = Number(input.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) errors.stars = PAGE_MESSAGES.stars;
  const comment = input.comment.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (comment.length > RATING_LIMITS.comment) errors.comment = PAGE_MESSAGES.comment;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, stars, comment: comment || null };
}

/** Who may rate a template: an account that got it (free or bought; its plan may have ended), never its designer. */
export async function mayRate(store: DataStore, template: Pick<MarketTemplate, "id" | "clientId">, clientId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (template.clientId === clientId) return { ok: false, error: PAGE_MESSAGES.ownTemplate };
  const licences = await store.listTemplateLicences({ clientId, templateId: template.id });
  return licences.length ? { ok: true } : { ok: false, error: PAGE_MESSAGES.notBuyer };
}

export type RateResult = { ok: true; rating: MarketRating; created: boolean } | { ok: false; errors: Record<string, string> };

/** The buyer rates the template, or changes their rating: one per template and account. */
export async function rateTemplate(store: DataStore, template: MarketTemplate, buyer: { clientId: string; name: string }, input: RatingInput, now: Date): Promise<RateResult> {
  const allowed = await mayRate(store, template, buyer.clientId);
  if (!allowed.ok) return { ok: false, errors: { form: allowed.error } };
  const read = readRating(input);
  if (!read.ok) return read;
  const saved = await store.saveMarketRating({
    id: newId(),
    templateId: template.id,
    designerId: template.designerId,
    clientId: buyer.clientId,
    stars: read.stars,
    comment: read.comment,
    authorName: ratingAuthorName(buyer.name),
    createdAt: now,
    updatedAt: now,
    reply: null,
    repliedAt: null,
    hiddenAt: null,
    hiddenBy: null,
    hiddenReason: null,
  });
  return { ok: true, ...saved };
}

/** The designer's one answer under a rating of their template (an empty one takes it away). */
export async function replyToRating(store: DataStore, designer: Pick<TemplateDesigner, "id">, ratingId: string, text: string, now: Date): Promise<{ ok: true; removed: boolean } | { ok: false; error: string }> {
  const rating = await store.getMarketRating(ratingId);
  if (!rating || rating.designerId !== designer.id) return { ok: false, error: PAGE_MESSAGES.gone };
  const reply = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (reply.length > RATING_LIMITS.reply) return { ok: false, error: PAGE_MESSAGES.reply };
  if (!(await store.replyToMarketRating(rating.id, designer.id, reply || null, now))) return { ok: false, error: PAGE_MESSAGES.gone };
  return { ok: true, removed: !reply };
}

export interface RatingStats {
  /** 1.0 to 5.0, one decimal; null without a rating. */
  average: number | null;
  count: number;
}

/** The average of the visible ratings of these templates (weighted by rating, not by template). */
export function ratingStats(summaries: Record<string, MarketRatingSummary>, templateIds?: readonly string[]): RatingStats {
  let count = 0;
  let sum = 0;
  for (const [id, one] of Object.entries(summaries)) {
    if (templateIds && !templateIds.includes(id)) continue;
    count += one.count;
    sum += one.sum;
  }
  return { average: count ? Math.round((sum / count) * 10) / 10 : null, count };
}
