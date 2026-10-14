import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { formatCents } from "@/lib/catalog/money";
import { sha256Hex } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { donationReference } from "@/lib/donations/service";
import { PayShell } from "@/app/pay/[token]/shell";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };
export const dynamic = "force-dynamic";

/** 29 After a donation. The Android app watches for "/thank-you" in the address to close its web view. */
export default async function ThankYouPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = await getStore();
  const donation = await store.getDonationByToken(sha256Hex(token));
  const app = donation ? await store.getAppById(donation.appId) : null;
  const paid = donation?.status === "paid";
  return (
    <PayShell app={app}>
      {paid ? (
        <>
          <Icon name="check_circle" size={48} filled className="text-success" />
          <h1 className="m-0 text-[24px] font-extrabold">Thank you!</h1>
          <p className="m-0 text-[16px] leading-relaxed text-ink-4">
            {app?.demo
              ? `Your demo donation ${donationReference(donation!)} of ${formatCents(donation!.amountCents, donation!.currency)} is done. Nothing was charged.`
              : `Your donation ${donationReference(donation!)} of ${formatCents(donation!.amountCents, donation!.currency)} went through. We've emailed your receipt to ${donation!.donorEmail}.`}{" "}
            You can go back to the app now; your donations are under My donations.
          </p>
          <Link href={`/receipts/${donation!.receiptCode}`} className="text-[16px] font-semibold">
            See your receipt
          </Link>
        </>
      ) : (
        <>
          <h1 className="m-0 text-[24px] font-extrabold">Donation not confirmed</h1>
          <p className="m-0 text-[16px] leading-relaxed text-ink-4">
            We couldn&apos;t confirm a payment for this donation. Go back to the app and donate again.
          </p>
        </>
      )}
    </PayShell>
  );
}
