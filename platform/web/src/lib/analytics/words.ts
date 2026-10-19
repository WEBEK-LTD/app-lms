import type { AppType } from "../data/types";

/** 44 The dashboard's words for what an app's people look at and do, per app type. */

const ITEM_WORDS: Record<string, string> = {
  course: "Course",
  lesson: "Lesson",
  product: "Product",
  service: "Service",
  class: "Class",
  membership: "Membership",
  listing: "Listing",
  article: "Article",
  event: "Event",
  campaign: "Campaign",
  page: "Page",
};

export function itemWord(kind: string): string {
  return ITEM_WORDS[kind] ?? "Item";
}

/** The funnel's steps after "Viewed", or null for apps that sell nothing (news, listings). */
export function funnelWords(appType: AppType): { intent: string; checkout: string } | null {
  switch (appType) {
    case "lms":
      return { intent: "Enrolled or added to cart", checkout: "Went to checkout" };
    case "store":
      return { intent: "Added to cart", checkout: "Went to checkout" };
    case "booking":
      return { intent: "Booked", checkout: "Went to checkout" };
    case "events":
      return { intent: "Got tickets", checkout: "Went to checkout" };
    case "donations":
      return { intent: "Chose to give", checkout: "Went to the payment page" };
    default:
      return null;
  }
}

/** What a push notification of a website's own type is, in the Notifications table. */
export function pushTypeWord(type: string): string {
  const words: Record<string, string> = {
    announcement: "Announcements",
    new_lesson: "New lessons",
    enrolled: "Enrolments",
    qna_answer: "Answers to questions",
    article: "Articles",
    event: "Event changes",
    campaign_update: "Campaign updates",
    order: "Order updates",
  };
  return words[type] ?? type.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}
