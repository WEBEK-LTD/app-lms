import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import { formatCents } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import { receiptDate } from "@/lib/donations/payment";
import { donationReference } from "@/lib/donations/service";
import { PayShell } from "@/app/pay/[token]/shell";

export const metadata: Metadata = { title: "Donation receipt", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * 29 A donation's receipt, linked from the receipt email and from My
 * donations in the app. Its address is a random code only the donor has.
 * It states what was given; it makes no tax claims.
 */
export default async function ReceiptPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const store = await getStore();
  const donation = /^[A-Za-z0-9_-]{16,64}$/.test(code) ? await store.getDonationByReceipt(code) : null;
  const app = donation ? await store.getAppById(donation.appId) : null;
  if (!donation || !app || (donation.status !== "paid" && donation.status !== "refunded")) {
    return (
      <PayShell app={app}>
        <h1 className="m-0 text-[24px] font-extrabold">Receipt not found</h1>
        <p className="m-0 text-[16px] leading-relaxed text-ink-4">This receipt doesn&apos;t exist, or the donation wasn&apos;t paid.</p>
      </PayShell>
    );
  }
  const org = app.appName ?? "The charity";
  const rows: [string, string][] = [
    ["Reference", donationReference(donation)],
    ["Date", receiptDate(donation)],
    ["Amount", formatCents(donation.amountCents, donation.currency)],
    ["Campaign", donation.campaignTitle],
    ["Donor", donation.donorName ?? "—"],
    ["Paid to", org],
  ];
  return (
    <PayShell app={app}>
      <h1 className="m-0 text-[24px] font-extrabold">Donation receipt</h1>
      {app.demo ? <p className="m-0 text-[15px] text-muted">A demo donation: nothing was charged.</p> : null}
      {donation.status === "refunded" ? (
        <p className="m-0 text-[15px] font-semibold text-danger">This donation was refunded.</p>
      ) : donation.refundedCents ? (
        // 47 Refunded in part.
        <p className="m-0 text-[15px] font-semibold text-danger">{formatCents(donation.refundedCents, donation.currency)} of this donation was refunded.</p>
      ) : null}
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-line p-4 text-[15px]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="font-semibold text-muted">{label}</dt>
            <dd className="m-0 min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">Thank you for supporting {org}. Keep this receipt for your records.</p>
      {/* 71 The same receipt as a PDF, in the app's language. */}
      <a href={`/receipts/${code}/pdf`} download className={`${btn.secondary} h-11 px-4 text-[15px]`}>
        <Icon name="download" size={20} />
        Download PDF
      </a>
    </PayShell>
  );
}
