import "server-only";
import { signUrl, verifySignedUrl } from "../crypto/signed-url";
import { signingSecret } from "../env";

/**
 * 106.11 A designer's ID document opens only for Yallapp's team with
 * `market.payouts`, from a link signed for a few minutes on the payout
 * checks' page (so an old link, in a browser's history or pasted
 * elsewhere, doesn't open it), and never at the public asset address.
 */

export const ID_DOCUMENT_LINK_SECONDS = 10 * 60;

const path = (assetId: string) => `/admin/market/payouts/documents/${assetId}`;
/** Its own key, from the platform's signing secret: a link signed for anything else doesn't open it. */
const key = () => `${signingSecret()}:studio-market-id-document`;

export function idDocumentLink(assetId: string, now: Date = new Date()): string {
  return signUrl("", path(assetId), {}, key(), ID_DOCUMENT_LINK_SECONDS, now);
}

export function idDocumentLinkValid(url: URL, now: Date = new Date()): boolean {
  return verifySignedUrl(url, key(), now) === "valid";
}
