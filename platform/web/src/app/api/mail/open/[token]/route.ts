import { getStore } from "@/lib/data";
import { signingSecret } from "@/lib/env";
import { recipientOfToken } from "@/lib/mailing/consent";

/** 114 GET /api/mail/open/<token>: a campaign email's 1×1 picture; loading it counts an open (when the campaign counts them). */
export const dynamic = "force-dynamic";

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

function pixel(): Response {
  return new Response(new Uint8Array(GIF), {
    status: 200,
    headers: { "content-type": "image/gif", "content-length": String(GIF.length), "cache-control": "no-store, no-cache, must-revalidate, private", "x-robots-tag": "noindex" },
  });
}

export async function GET(_request: Request, { params }: RouteContext<"/api/mail/open/[token]">): Promise<Response> {
  const { token } = await params;
  try {
    const store = await getStore();
    const found = await recipientOfToken(store, token, signingSecret());
    if (found) {
      const campaign = await store.getMailCampaign(found.recipient.campaignId);
      if (campaign?.track) await store.addMailEvent({ campaignId: campaign.id, email: found.recipient.email, kind: "open", url: null, at: new Date() });
    }
  } catch (error) {
    // The picture always loads; a count that fails is only logged.
    console.error("[mail open]", error instanceof Error ? error.message : String(error));
  }
  return pixel();
}
