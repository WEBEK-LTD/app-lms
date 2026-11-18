import { getStore } from "@/lib/data";
import { encryptionKey, paymentApiUrls } from "@/lib/env";
import { settleOrderPayment } from "@/lib/payments/settle";
import { answerSheetRequest } from "@/lib/payments/sheet-request";

export const dynamic = "force-dynamic";

/**
 * 188 The app's Stripe PaymentSheet asks here for the PaymentIntent it pays
 * (card, Apple Pay, Google Pay), with the payment's token
 * (lib/payments/sheet-request.ts). POST: it may start one. The app then
 * reads /pay/<token>/status, never the sheet's own result alone.
 */
export async function POST(_request: Request, { params }: RouteContext<"/pay/[token]/sheet">): Promise<Response> {
  const { token } = await params;
  const answer = await answerSheetRequest(
    { store: await getStore(), encryptionKey: encryptionKey(), urls: paymentApiUrls(), now: new Date(), settle: (t) => settleOrderPayment(t, { provider: "stripe" }) },
    token,
  );
  return Response.json(answer.body, { status: answer.status, headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}
