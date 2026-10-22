import type { AnnouncementKind } from "./data/types";

/**
 * 57 The words of the dashboard's bell that the browser needs too (no
 * server code here: components/updates-bell.tsx imports it).
 */

export type UpdateKind = AnnouncementKind | "account";

/** What an account item is about, for its icon. */
export type AccountTopic = "notice" | "plan" | "users" | "storage" | "site" | "build_ready" | "build_failed" | "payment" | "chat";

/** The chips, in the words the dashboard shows. */
export const UPDATE_KIND_LABEL: Record<UpdateKind, string> = {
  update: "Update",
  announcement: "Announcement",
  maintenance: "Maintenance",
  offer: "Offer",
  account: "Your account",
};

/** The bell's badge: "9+" above 9, nothing at 0. */
export function badgeText(unread: number): string {
  return unread <= 0 ? "" : unread > 9 ? "9+" : String(unread);
}

/** The bell button's accessible name: "Notifications from Yallapp, 3 unread". */
export function bellLabel(unread: number): string {
  return unread > 0 ? `Notifications from Yallapp, ${unread} unread` : "Notifications from Yallapp";
}

/** "Showing the newest 8 of 12", under the bell's list when there are more. */
export function shownLine(shown: number, total: number): string {
  return total > shown ? `Showing the newest ${shown} of ${total}` : "";
}
