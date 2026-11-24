/* eslint-disable @typescript-eslint/no-unused-vars -- stubs the other areas fill in */
import type { CommunityContext } from "./http";

/** 231 How many of the member's notifications are unread, for `/me` and the header's bell (area C fills this from its notifications). */
export async function unreadNotifications(_ctx: CommunityContext, _memberId: string): Promise<number> {
  return 0;
}
