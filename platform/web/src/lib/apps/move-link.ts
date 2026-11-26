import "server-only";
import { verifySignedUrl, type SignatureCheck } from "../crypto/signed-url";
import { appUrl, signingSecret } from "../env";

/**
 * 132.113 The signed link of a move's page (the email's "Review and
 * approve"), checked again on every approve or decline; and where the owner
 * goes back to after signing in (only a move's page, through a short cookie
 * the sign-in reads: never anywhere else).
 */

export const NEXT_COOKIE = "yallapp_next";
export const NEXT_TTL_SECONDS = 15 * 60;
const MOVE_PAGE = /^\/dashboard\/app-moves\/[0-9a-f-]{36}\?expires=\d{1,12}&sig=[\w-]{20,100}$/;

/** 231 Yallapp Community's page that links a Yallapp account to a member (lib/community/base/linking.ts). */
const COMMUNITY_LINK_PAGE = /^\/link-community\?state=[\w-]{20,100}&return=(?:web|app)$/;
/** 231 "Continue with Yallapp"'s approval page. */
const COMMUNITY_SIGNIN_PAGE = /^\/link-community\?mode=signin&request=[\w-]{20,100}$/;

/** A move's page (or 231 the community's link page) to go back to after signing in, or null. */
export function safeNext(value: string | null | undefined): string | null {
  return value && (MOVE_PAGE.test(value) || COMMUNITY_LINK_PAGE.test(value) || COMMUNITY_SIGNIN_PAGE.test(value)) ? value : null;
}

/** The link's signature for the request's page: valid, expired or invalid. */
export function checkMoveLink(requestId: string, params: { expires?: unknown; sig?: unknown }, now: Date = new Date()): SignatureCheck {
  if (typeof params.expires !== "string" || typeof params.sig !== "string") return "invalid";
  const url = new URL(`${appUrl()}/dashboard/app-moves/${requestId}`);
  url.searchParams.set("expires", params.expires);
  url.searchParams.set("sig", params.sig);
  return verifySignedUrl(url, signingSecret(), now);
}
