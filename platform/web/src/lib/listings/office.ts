import type { DataStore } from "../data/store";
import type { App, Listing, ListingInquiry, ListingStatus } from "../data/types";
import type { sendPush, ServiceAccount } from "../hosted/push";
import { OFFICE_REPLY_MAX } from "./forms";
import { notifyInquiryReply } from "./notify";
import { listingSettingsFor } from "./types";

/**
 * The office's own changes, for Dashboard › Listings and Inquiries and 58
 * the Owner API: the same rules and the same consequences from both.
 */

export const LISTING_STATUSES: ListingStatus[] = ["draft", "published", "archived"];

/** Publish, back to drafts, or archive; the first publication keeps its date. False for an unknown status. */
export async function setListingStatus(store: DataStore, listing: Listing, status: unknown, now: Date): Promise<boolean> {
  if (!LISTING_STATUSES.includes(status as ListingStatus)) return false;
  await store.updateListing(listing.appId, listing.id, { status: status as ListingStatus, ...(status === "published" && !listing.publishedAt ? { publishedAt: now } : {}) }, now);
  return true;
}

export type ReplyResult = { ok: false; error: string } | { ok: true; pushed: number };

/**
 * The office answers a conversation: it has read everything up to its
 * reply, a closed conversation opens again, and the person gets it in their
 * inbox and on their phones.
 */
export async function replyToInquiry(
  deps: { store: DataStore; app: App; account: ServiceAccount | null; now: Date; send?: typeof sendPush },
  inquiry: ListingInquiry,
  message: unknown,
): Promise<ReplyResult> {
  const text = typeof message === "string" ? message.trim() : "";
  if (!text) return { ok: false, error: "Write your reply." };
  if (text.length > OFFICE_REPLY_MAX) return { ok: false, error: `Keep your reply to ${OFFICE_REPLY_MAX} characters.` };
  const { store, app, now } = deps;
  await store.markListingInquiryRead(app.id, inquiry.id, "user", now);
  if (inquiry.status === "closed") await store.updateListingInquiry(app.id, inquiry.id, { status: "open" });
  await store.addListingInquiryMessage({ appId: app.id, inquiryId: inquiry.id, from: "office", text, createdAt: now });
  const [listing, settings] = await Promise.all([store.getListing(app.id, inquiry.listingId), store.getListingSettings(app.id)]);
  const result = await notifyInquiryReply({ store, app, inquiry, listing, officeName: listingSettingsFor(app, settings).contactName, text, account: deps.account, now, send: deps.send });
  return { ok: true, pushed: result.pushed };
}
