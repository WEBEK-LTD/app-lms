import { emailTemplate, renderTemplate } from "../email/templates";
import type { DataStore } from "../data/store";
import type { App, HostedNotification, HostedUser, Listing, ListingInquiry } from "../data/types";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX } from "../hosted/notify";
import { pushTarget, sendPush, type ServiceAccount } from "../hosted/push";
import { getDashT } from "@/i18n/dashboard";
import type { Lang } from "@/i18n/config";

/** The values of the office's "New message to the office" email (lib/email/templates.ts). */
export function newInquiryMailValues(input: { listing: Listing; user: HostedUser; text: string; appName: string; url: string; lang?: Lang }): Record<string, string> {
  const { listing, user } = input;
  const t = getDashT(input.lang ?? "en");
  return {
    app_name: input.appName,
    customer_name: user.name,
    listing: listing.reference ? `${listing.title} (${listing.reference})` : listing.title,
    listing_title: listing.title,
    message: input.text,
    phone: user.phone ?? t("emails.phoneNotGiven"),
    email_line: user.email ? `${t("emails.emailLine", { email: user.email })}\n` : "",
    conversation_url: input.url,
  };
}

/** The email telling the office about a message, with the default template (sending uses the team's edit). */
export function newInquiryMail(input: { listing: Listing; user: HostedUser; text: string; appName: string; url: string }): { subject: string; text: string } {
  const { subject, text } = renderTemplate(emailTemplate("new_inquiry")!, newInquiryMailValues(input));
  return { subject: subject.slice(0, 150), text };
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
  const tokens = (await store.listHostedPushDevices(app.id, [inquiry.userId])).map(pushTarget);
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
