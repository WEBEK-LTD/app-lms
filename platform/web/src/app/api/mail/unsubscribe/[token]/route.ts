import { getStore } from "@/lib/data";
import { signingSecret } from "@/lib/env";
import { recipientOfToken, unsubscribeRecipient } from "@/lib/mailing/consent";

/**
 * 114 POST /api/mail/unsubscribe/<token>: the inbox's own unsubscribe button
 * (RFC 8058, the campaign's List-Unsubscribe and List-Unsubscribe-Post
 * headers). One click, no page: the address gets no more marketing emails.
 */
export const dynamic = "force-dynamic";

const done = (status: number) => new Response(status === 200 ? "Unsubscribed." : "Not found.", { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });

export async function POST(_request: Request, { params }: RouteContext<"/api/mail/unsubscribe/[token]">): Promise<Response> {
  const { token } = await params;
  const store = await getStore();
  const found = await recipientOfToken(store, token, signingSecret());
  if (!found) return done(404);
  await unsubscribeRecipient(store, found.recipient, new Date());
  return done(200);
}
