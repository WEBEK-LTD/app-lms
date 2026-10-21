import { centsToDecimal, formatCents } from "../catalog/money";
import type { App, Campaign, CatalogCurrency, Donation, DonationRecurring, DonationSettings } from "../data/types";
import { donationReceiptPdfUrl } from "../receipts/links";
import { articleBody, excerptOf, plainText } from "../news/html";

/**
 * 29 Charity & donations apps: campaigns as the app reads them (tag
 * Donations in docs/api/openapi.yaml) and the rules of a donation. The
 * donation is paid on our donation page (/give/<token>) into the charity's
 * own account (37 iyzico, Kashier or Fawaterk); it counts towards its campaign only once the provider
 * confirms it (lib/donations/payment.ts).
 */

export const DEFAULT_DONATION_SETTINGS: DonationSettings = { currency: "TRY", iosMode: "browser" };

/** How long a donation page link works. */
export const DONATION_LINK_MINUTES = 60;

/**
 * Monthly donations need a card stored for a subscription, which our payment
 * integration (checkout form only) doesn't do yet: the app offers one-off
 * donations only (`Config.donations.monthly`), and a request for a monthly
 * one is refused rather than charged once.
 */
export const MONTHLY_DONATIONS = false;

export const PRESETS_MAX = 6;
export const RECENT_DONATIONS = 10;
export const MESSAGE_MAX = 280;
/** The largest single donation: a mistyped amount shouldn't reach the card. */
export const DONATION_MAX_CENTS = 1_000_000_00;

export function donationSettingsOf(saved: DonationSettings | null): DonationSettings {
  return { ...DEFAULT_DONATION_SETTINGS, ...(saved ?? {}) };
}

/** Whether the campaign takes donations at this moment. */
export function campaignOpen(campaign: Pick<Campaign, "status" | "endsAt">, now: Date): boolean {
  return campaign.status === "open" && (campaign.endsAt === null || campaign.endsAt.getTime() > now.getTime());
}

/** What the app sees: open or closed; null for a draft, which the app never sees. */
export function publicStatus(campaign: Pick<Campaign, "status" | "endsAt">, now: Date): "open" | "closed" | null {
  if (campaign.status === "draft") return null;
  return campaignOpen(campaign, now) ? "open" : "closed";
}

/** Open campaigns first (featured first, then newest), then closed ones, newest first. */
export function campaignsInOrder(campaigns: Campaign[], now: Date): Campaign[] {
  const time = (c: Campaign) => (c.publishedAt ?? c.createdAt).getTime();
  return campaigns
    .filter((c) => publicStatus(c, now) !== null)
    .sort((a, b) => {
      const open = Number(campaignOpen(b, now)) - Number(campaignOpen(a, now));
      if (open !== 0) return open;
      if (campaignOpen(a, now)) {
        const featured = Number(b.featured) - Number(a.featured);
        if (featured !== 0) return featured;
      }
      return time(b) - time(a) || b.id - a.id;
    });
}

/** "D-1042": what the donor and the charity call a donation. */
export function donationReference(donation: Pick<Donation, "id">): string {
  return `D-${1000 + donation.id}`;
}

export function giveUrl(platformUrl: string, token: string): string {
  return `${platformUrl.replace(/\/+$/, "")}/give/${token}`;
}

export function receiptUrl(platformUrl: string, code: string): string {
  return `${platformUrl.replace(/\/+$/, "")}/receipts/${code}`;
}

/** Whether the app's donation page can take a card payment: the charity's own keys (37 iyzico, Kashier or Fawaterk; never Yallapp's account), or a demo. */
export function donationsSetUp(app: Pick<App, "catalogSettings" | "demo">): boolean {
  const provider = app.catalogSettings?.payment?.provider;
  return (provider !== undefined && provider !== "yallapp") || app.demo === true;
}

/** `Config.donations`. */
export function donationsConfig(settings: DonationSettings, updatesPush: boolean) {
  return { currency: settings.currency, ios_mode: settings.iosMode, monthly: MONTHLY_DONATIONS, updates_push: updatesPush };
}

/** "Elif Y.": how a donor shows on a campaign. */
export function shortName(name: string | null): string | null {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const last = words.length > 1 ? words[words.length - 1]! : "";
  return last ? `${words[0]} ${last.charAt(0).toLocaleUpperCase("tr")}.` : words[0]!;
}

/** raised / goal, rounded to 4 places; null without a goal. */
export function progressOf(campaign: Pick<Campaign, "goalCents" | "raisedCents">): number | null {
  if (!campaign.goalCents) return null;
  return Math.round((campaign.raisedCents / campaign.goalCents) * 10_000) / 10_000;
}

export function campaignSummaryJson(c: Campaign, currency: CatalogCurrency, assetUrl: (id: string) => string, now: Date) {
  return {
    id: c.id,
    title: c.title,
    summary: c.summary ?? excerptOf(plainText(c.story)),
    image_url: c.imageAssetIds[0] ? assetUrl(c.imageAssetIds[0]) : null,
    goal: c.goalCents !== null ? centsToDecimal(c.goalCents) : null,
    goal_formatted: c.goalCents !== null ? formatCents(c.goalCents, currency) : null,
    raised: centsToDecimal(c.raisedCents),
    raised_formatted: formatCents(c.raisedCents, currency),
    donor_count: c.donorCount,
    currency,
    progress: progressOf(c),
    ends_at: c.endsAt ? c.endsAt.toISOString() : null,
    status: publicStatus(c, now) ?? "closed",
    featured: c.featured,
  };
}

export function recentDonationJson(d: Donation) {
  return {
    name: d.anonymous ? null : shortName(d.donorName),
    amount_formatted: formatCents(d.amountCents, d.currency),
    message: d.message,
    created_at: (d.paidAt ?? d.createdAt).toISOString(),
  };
}

export function campaignJson(c: Campaign, currency: CatalogCurrency, assetUrl: (id: string) => string, recent: Donation[], now: Date) {
  return {
    ...campaignSummaryJson(c, currency, assetUrl, now),
    images: c.imageAssetIds.map((id) => ({ url: assetUrl(id), alt: c.title })),
    ...articleBody(c.story),
    preset_amounts: [...c.presetCents].sort((a, b) => a - b).map(centsToDecimal),
    allow_custom_amount: c.allowCustomAmount,
    min_amount: centsToDecimal(c.minCents),
    recent_donations: recent.slice(0, RECENT_DONATIONS).map(recentDonationJson),
  };
}

export function donationJson(d: Donation, platformUrl: string) {
  return {
    id: d.id,
    reference: donationReference(d),
    campaign_id: d.campaignId,
    campaign_title: d.campaignTitle,
    amount: centsToDecimal(d.amountCents),
    amount_formatted: formatCents(d.amountCents, d.currency),
    currency: d.currency,
    recurring: d.recurring,
    anonymous: d.anonymous,
    created_at: (d.paidAt ?? d.createdAt).toISOString(),
    receipt_url: receiptUrl(platformUrl, d.receiptCode),
    // 71 The same receipt as a PDF.
    receipt_pdf_url: donationReceiptPdfUrl(platformUrl, d.receiptCode),
    // 47 What the charity refunded of it.
    refunded_total: d.refundedCents ? formatCents(d.refundedCents, d.currency) : null,
  };
}

export interface DonationRequest {
  campaignId: number;
  amountCents: number;
  recurring: DonationRecurring;
  anonymous: boolean;
  message: string | null;
}

/** The body of POST /donations/checkout-link, checked on its own; the campaign's rules are checked by `checkAmount`. */
export function readDonationRequest(body: unknown): { ok: true; value: DonationRequest } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const campaignId = Number(b.campaign_id);
  if (!Number.isSafeInteger(campaignId) || campaignId < 1) return { ok: false, error: "Choose a campaign." };
  const amount = typeof b.amount === "string" ? b.amount.trim() : typeof b.amount === "number" ? String(b.amount) : "";
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(amount)) return { ok: false, error: "Enter an amount, like 250 or 250.00." };
  const amountCents = Math.round(Number(amount) * 100);
  const recurring = b.recurring === undefined || b.recurring === null ? "none" : b.recurring;
  if (recurring !== "none" && recurring !== "monthly") return { ok: false, error: "Choose a one-off or a monthly donation." };
  if (recurring === "monthly" && !MONTHLY_DONATIONS) return { ok: false, error: "Monthly donations aren't available yet. Give once instead." };
  if (b.anonymous !== undefined && typeof b.anonymous !== "boolean") return { ok: false, error: "Anonymous must be true or false." };
  if (b.message !== undefined && b.message !== null && typeof b.message !== "string") return { ok: false, error: "The message must be text." };
  const message = typeof b.message === "string" ? b.message.replace(/\s+/g, " ").trim() : "";
  if (message.length > MESSAGE_MAX) return { ok: false, error: `Keep the message under ${MESSAGE_MAX} characters.` };
  return { ok: true, value: { campaignId, amountCents, recurring, anonymous: b.anonymous === true, message: message || null } };
}

/** Why this amount can't be given to the campaign, or null when it can. */
export function amountProblem(campaign: Pick<Campaign, "minCents" | "presetCents" | "allowCustomAmount">, amountCents: number, currency: CatalogCurrency): string | null {
  if (amountCents < campaign.minCents || amountCents < 1) return `The smallest donation is ${formatCents(Math.max(campaign.minCents, 1), currency)}.`;
  if (amountCents > DONATION_MAX_CENTS) return `The largest donation in the app is ${formatCents(DONATION_MAX_CENTS, currency)}.`;
  if (!campaign.allowCustomAmount && !campaign.presetCents.includes(amountCents)) return "Choose one of the amounts.";
  return null;
}
