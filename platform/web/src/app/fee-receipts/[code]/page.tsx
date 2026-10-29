import type { Metadata } from "next";
import { getStore } from "@/lib/data";
import { feeReceipt } from "@/lib/school/fees";
import { PayShell } from "@/app/pay/[token]/shell";

export const metadata: Metadata = { title: "Fee receipt", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * 105.4 A school fee's receipt, linked from the fee in the school's app
 * (`SchoolFee.receipt_url`). Its address is a random code only the family
 * has. The amount is the school's; the school was paid, not Yallapp.
 */
export default async function FeeReceiptPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const receipt = await feeReceipt(await getStore(), code);
  if (!receipt) {
    return (
      <PayShell app={null}>
        <h1 className="m-0 text-[24px] font-extrabold">Receipt not found</h1>
        <p className="m-0 text-[16px] leading-relaxed text-ink-4">This receipt doesn&apos;t exist, or the fee wasn&apos;t paid.</p>
      </PayShell>
    );
  }
  return (
    <PayShell app={receipt.app}>
      <h1 className="m-0 text-[24px] font-extrabold">Fee receipt</h1>
      {receipt.app.demo ? <p className="m-0 text-[15px] text-muted">A demo school: nothing was charged.</p> : null}
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-line p-4 text-[15px]">
        {receipt.rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="font-semibold text-muted">{label}</dt>
            <dd className="m-0 min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">Keep this receipt for your records. For any question about the fee, contact the school.</p>
    </PayShell>
  );
}
