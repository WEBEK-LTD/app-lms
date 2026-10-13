import type { DataStore } from "../data/store";
import type { App, HostedNotification, HostedUser, Listing, ListingInquiry } from "../data/types";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX } from "../hosted/notify";
import { sendPush, type ServiceAccount } from "../hosted/push";

/** The email telling the office about a message from the app. */
export function newInquiryMail(input: { listing: Listing; user: HostedUser; text: string; appName: string; url: string }): { subject: string; text: string } {
  const { listing, user } = input;
  return {
    subject: `New message about ${listing.title}`.slice(0, 150),
    text:
      `${user.name} wrote about ${listing.reference ? `${listing.title} (${listing.reference})` : listing.title} in ${input.appName}:\n\n` +
      `${input.text}\n\n` +
      `Phone: ${user.phone}\n` +
      (user.email ? `Email: ${user.email}\n` : "") +
      `\nReply in your dashboard: ${input.url}`,
  };
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/**
 * Tells the user the office answered: a notification in their inbox, and a
 * push to their phones when push is on. The inbox keeps it even when push fails.
 */
export async function notifyInquiryReply(input: {
  store: DataStore;
  app: App;
  inquiry: ListingInquiry;
  listing: Listing | null;
  officeName: string;
  text: string;
  account: ServiceAccount | null;
  now: Date;
  send?: typeof sendPush;
}): Promise<{ notification: HostedNotification; pushed: number }> {
  const { store, app, inquiry } = input;
  const title = clip(`${input.officeName} replied`, NOTIFICATION_TITLE_MAX);
  const body = clip(input.listing ? `${input.listing.title}: ${input.text}` : input.text, NOTIFICATION_BODY_MAX);
  const notification = await store.createHostedNotification({ appId: app.id, userId: inquiry.userId, title, body, createdAt: input.now });
  if (!input.account) return { notification, pushed: 0 };
  const tokens = (await store.listHostedPushDevices(app.id, [inquiry.userId])).map((d) => d.pushToken!);
  if (tokens.length === 0) return { notification, pushed: 0 };
  try {
    const result = await (input.send ?? sendPush)(
      input.account,
      tokens,
      {
        title,
        body,
        data: { type: "announcement", notification_id: String(notification.id), inquiry_id: String(inquiry.id), listing_id: String(inquiry.listingId) },
      },
      { now: input.now },
    );
    for (const token of result.invalidTokens) await store.clearHostedPushToken(app.id, token);
    return { notification, pushed: result.sent };
  } catch {
    return { notification, pushed: 0 };
  }
}
