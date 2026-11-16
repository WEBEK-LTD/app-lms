import type { RatingReply } from "../data/types";

/** 132 `reply` under a rating in the customer's app: the business's text and when; the app shows it in the business's name. */
export function appReplyJson(reply: RatingReply | null | undefined) {
  return reply ? { text: reply.text, at: reply.editedAt ?? reply.at } : null;
}

/** 132 `reply` under a rating in the Owner API: the text, when, who wrote it. */
export function ownerReplyJson(reply: RatingReply | null | undefined) {
  return reply ? { text: reply.text, at: reply.at, edited_at: reply.editedAt, by: reply.by } : null;
}
