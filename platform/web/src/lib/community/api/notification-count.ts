import type { TrustStore } from "../trust/store";
import type { CommunityContext } from "./http";

/** 231 How many of the member's notifications are unread, for `/me` and the header's bell. */
export async function unreadNotifications(ctx: CommunityContext, memberId: string): Promise<number> {
  return (ctx.store.trust as TrustStore).unreadNotifications(memberId);
}
