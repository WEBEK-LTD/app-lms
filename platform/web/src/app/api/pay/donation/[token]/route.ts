import { sha256Hex } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { completeDonationPayment, donationKeys, donationReceiptValues } from "@/lib/donations/payment";
import { receiptUrl } from "@/lib/donations/service";
import { sendTemplate } from "@/lib/email/send";
import { appUrl, encryptionKey, iyzicoApiUrl } from "@/lib/env";

/**
 * 29 Where iyzico sends the donor back after the card payment, with its
 * token. The donation is marked paid, and added to its campaign, only after
 * iyzico confirms the payment; then the donor gets their receipt by email.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/pay/donation/[token]">): Promise<Response> {
  const { token } = await params;
  const back = (path: string) => Response.redirect(`${appUrl()}/give/${encodeURIComponent(token)}${path}`, 303);
  const form = await request.formData().catch(() => null);
  const iyzicoToken = form?.get("token");
  const store = await getStore();
  const donation = await store.getDonationByToken(sha256Hex(token));
  if (!donation) return back("");
  const app = await store.getAppById(donation.appId);
  const keys = app ? donationKeys(app, encryptionKey()) : null;
  if (!app || !keys || typeof iyzicoToken !== "string" || iyzicoToken === "") return back("?payment=failed");
  const outcome = await completeDonationPayment({ store, keys, donation, iyzicoToken, now: new Date(), baseUrl: iyzicoApiUrl() });
  if (outcome === "paid") {
    const paid = await store.getDonation(app.id, donation.id);
    if (paid?.donorEmail) {
      const values = donationReceiptValues(paid, app.appName ?? "the charity", receiptUrl(appUrl(), paid.receiptCode));
      await sendTemplate("donation_receipt", paid.donorEmail, values, { app }).catch(() => {
        // The donation is paid either way; the receipt page and the app have it.
      });
    }
  }
  return outcome === "failed" ? back("?payment=failed") : back("/thank-you");
}
