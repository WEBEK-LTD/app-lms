import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { secureCookies } from "../env";
import { authenticate, refreshSession, tokensBody } from "./auth/sessions";
import { getCommunityStore } from "./store/server";
import type { CommunityMember, CommunitySession } from "./types";

/**
 * 231 The community website's sign-in (area F's pages): the same sessions
 * as the app, kept in httpOnly cookies on community.yallapp.com.tr. The
 * access cookie lives 15 minutes, the refresh cookie 60 days; the API
 * (/api/community/v1) reads `yc_access` when there is no Authorization
 * header.
 *
 * - `setCommunityCookies(body)` after a sign-in or sign-up the site made
 *   through the API (its Session answer);
 * - `currentCommunityMember()` in a server component or action: the member,
 *   renewing the access cookie from the refresh one when it ran out (in a
 *   server action or route handler; in a page it can only read);
 * - `clearCommunityCookies()` on log out.
 */
export const ACCESS_COOKIE = "yc_access";
export const REFRESH_COOKIE = "yc_refresh";

interface SessionBody {
  access_token: string;
  access_expires_at: string;
  refresh_token: string;
  refresh_expires_at: string;
}

const options = (expires: string) => ({ httpOnly: true, secure: secureCookies(), sameSite: "lax" as const, path: "/", expires: new Date(expires) });

export async function setCommunityCookies(body: SessionBody): Promise<void> {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, body.access_token, options(body.access_expires_at));
  jar.set(REFRESH_COOKIE, body.refresh_token, options(body.refresh_expires_at));
}

export async function clearCommunityCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

/** The signed-in member on this request, or null. Cached for one request. */
export const currentCommunityMember = cache(async (): Promise<{ member: CommunityMember; session: CommunitySession; accessToken: string } | null> => {
  const jar = await cookies();
  const store = await getCommunityStore();
  const now = new Date();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (access) {
    const signed = await authenticate(store.base, access, now);
    if (signed) return { ...signed, accessToken: access };
  }
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;
  const renewed = await refreshSession(store.base, refresh, now);
  if (!renewed) return null;
  try {
    // Only a server action or a route handler may write cookies; a page reads.
    await setCommunityCookies(tokensBody(renewed));
  } catch {
    // In a page: the next action or API call renews them.
  }
  return { member: renewed.member, session: renewed.session, accessToken: renewed.accessToken };
});

/** The language a signed-out visitor's browser asks for (en, ar, tr), for pages before sign-in. */
export async function browserLanguage(): Promise<string | null> {
  return (await headers()).get("accept-language");
}
