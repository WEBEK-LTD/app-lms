import { getStore } from "@/lib/data";
import { appUrl, signingSecret } from "@/lib/env";
import { recipientOfToken } from "@/lib/mailing/consent";
import { validClick } from "@/lib/mailing/tokens";

/**
 * 114 GET /api/mail/click/<token>?u=<address>&s=<signature>: a tracked link
 * of a campaign email. It counts the click and sends the reader on. Only an
 * address the email itself linked to (signed for this recipient) is
 * followed, so the link can't send anyone elsewhere.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: RouteContext<"/api/mail/click/[token]">): Promise<Response> {
  const { token } = await params;
  const url = new URL(request.url);
  const target = url.searchParams.get("u") ?? "";
  const signature = url.searchParams.get("s") ?? "";
  const secret = signingSecret();
  if (!/^https?:\/\//i.test(target) || !validClick(token, target, signature, secret)) {
    return Response.redirect(appUrl(), 302);
  }
  try {
    const store = await getStore();
    const found = await recipientOfToken(store, token, secret);
    if (found) {
      const campaign = await store.getMailCampaign(found.recipient.campaignId);
      if (campaign?.track) await store.addMailEvent({ campaignId: campaign.id, email: found.recipient.email, kind: "click", url: target, at: new Date() });
    }
  } catch (error) {
    console.error("[mail click]", error instanceof Error ? error.message : String(error));
  }
  return new Response(null, { status: 302, headers: { location: target, "cache-control": "no-store", "referrer-policy": "no-referrer", "x-robots-tag": "noindex" } });
}
