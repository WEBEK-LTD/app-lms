import { getStore } from "@/lib/data";
import { encryptionKey } from "@/lib/env";
import { settleDonationRecord, settleOrderRecord } from "@/lib/payments/settle";
import { handleStripeWebhook, STRIPE_WEBHOOK_MAX_BYTES } from "@/lib/payments/webhooks";

/**
 * 132.31 The owner's Stripe webhook endpoint (Stripe › Developers ›
 * Webhooks): POST only, the raw body checked against its Stripe-Signature
 * with the signing secret the owner saved (lib/payments/webhooks.ts). No
 * cookies are read; nothing in the event is trusted before the session is
 * read back from Stripe.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/pay/stripe/webhook/[app]">): Promise<Response> {
  const { app } = await params;
  const headers = { "cache-control": "no-store" };
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > STRIPE_WEBHOOK_MAX_BYTES) return Response.json({ error: "too_large" }, { status: 413, headers });
  const body = new Uint8Array(await request.arrayBuffer().catch(() => new ArrayBuffer(0)));
  if (body.byteLength === 0) return Response.json({ error: "invalid_body" }, { status: 400, headers });
  if (body.byteLength > STRIPE_WEBHOOK_MAX_BYTES) return Response.json({ error: "too_large" }, { status: 413, headers });
  const answer = await handleStripeWebhook(
    { store: await getStore(), encryptionKey: encryptionKey(), now: new Date(), settle: { order: settleOrderRecord, donation: settleDonationRecord } },
    app,
    body,
    request.headers.get("stripe-signature"),
  );
  return Response.json(answer.body, { status: answer.status, headers });
}
