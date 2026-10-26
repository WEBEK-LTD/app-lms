import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { formatCents } from "@/lib/catalog/money";
import { sha256Hex } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { withDemoChecked } from "@/lib/demo/apps";
import { donationAccount, donationLinkExpired } from "@/lib/donations/payment";
import { campaignOpen } from "@/lib/donations/service";
import { encryptionKey } from "@/lib/env";
import { PROVIDER_NAME } from "@/lib/payments/provider";
import { PayShell, textOn } from "@/app/pay/[token]/shell";
import { GiveForm } from "./form";

export const metadata: Metadata = { title: "Donate", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * 29 The donation page a Charity & donations app opens: in the system
 * browser on iPhone (App Store guideline 3.2.2), inside the app on Android.
 * The donor gives their name and email for the receipt, then pays on
 * the provider's page (37 iyzico, Kashier, Fawaterk, Stripe or PayPal) into the charity's own account.
 */
export default async function GivePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ payment?: string }> }) {
  const { token } = await params;
  const { payment } = await searchParams;
  const store = await getStore();
  const donation = await store.getDonationByToken(sha256Hex(token));
  const found = donation ? await store.getAppById(donation.appId) : null;
  const app = found ? await withDemoChecked(store, found) : null;
  const note = (title: string, text: string) => (
    <PayShell app={app}>
      <h1 className="m-0 text-[24px] font-extrabold">{title}</h1>
      <p className="m-0 text-[16px] leading-relaxed text-ink-4">{text}</p>
    </PayShell>
  );
  if (!donation || !app) return note("Link not valid", "This donation link isn't valid. Go back to the app and donate again.");
  if (donation.status === "paid") redirect(`/give/${token}/thank-you`);
  if (donation.status !== "pending") return note("Donation closed", "This donation is closed. Go back to the app and donate again.");
  const now = new Date();
  if (donationLinkExpired(donation, now)) return note("Link expired", "This donation link has expired. Go back to the app and donate again.");
  const campaign = donation.campaignId !== null ? await store.getCampaign(app.id, donation.campaignId) : null;
  if (!campaign || !campaignOpen(campaign, now)) return note("Campaign ended", "This campaign has ended and takes no more donations. Thank you for your support.");
  const account = app.demo ? null : donationAccount(app, encryptionKey());
  if (!app.demo && !account) return note("Donations are off", "This charity can't take donations right now. Please try again later.");

  const user = donation.userId !== null ? await store.getHostedUser(app.id, donation.userId) : null;
  const amount = formatCents(donation.amountCents, donation.currency);
  const color = app.primaryColor;
  return (
    <PayShell app={app}>
      <h1 className="m-0 text-[24px] font-extrabold">Your donation</h1>
      {app.demo ? (
        <p role="note" className="m-0 flex gap-2.5 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
          <Icon name="info" size={20} className="mt-0.5" />
          <span>
            <b>Demo.</b> This is a demo app: no card is asked for and nothing is charged. In your own app, supporters pay here by card, into your
            own account with iyzico, Kashier, Fawaterk, Stripe or PayPal.
          </span>
        </p>
      ) : null}
      {payment === "failed" ? (
        <p role="alert" className="m-0 rounded-xl bg-danger-bg px-4 py-3 text-[15px] font-semibold text-danger">
          The payment didn&apos;t go through. Check your card details and try again.
        </p>
      ) : null}
      {payment === "pending" ? (
        <p role="status" className="m-0 rounded-xl bg-peach-soft px-4 py-3 text-[15px] font-semibold">
          Your payment isn&apos;t confirmed yet. If you paid, it&apos;s confirmed within a few minutes and your receipt comes by email; otherwise, try
          again.
        </p>
      ) : null}
      <section aria-labelledby="h-gift" className="flex flex-col gap-2 rounded-xl border border-line p-4">
        <h2 id="h-gift" className="m-0 text-[15px] font-bold">
          {campaign.title}
        </h2>
        <p className="m-0 flex justify-between gap-3 text-[16px] font-bold">
          <span>{donation.recurring === "monthly" ? "Every month" : "One-off donation"}</span>
          <span>{amount}</span>
        </p>
        {donation.message ? <p className="m-0 text-[15px] text-ink-4">“{donation.message}”</p> : null}
        {donation.anonymous ? <p className="m-0 text-[14px] text-muted">Your name won&apos;t show on the campaign.</p> : null}
      </section>
      <GiveForm
        token={token}
        label={app.demo ? `Donate ${amount} (demo)` : `Donate ${amount}`}
        color={color}
        textColor={textOn(color)}
        defaults={{ name: donation.donorName ?? user?.name ?? "", email: donation.donorEmail ?? user?.email ?? "", phone: donation.donorPhone ?? user?.phone ?? "", city: user?.city ?? "" }}
      />
      <p className="m-0 text-center text-[13px] text-muted">
        {app.demo ? "Nothing is charged in a demo." : `Card payments are processed securely by ${account ? PROVIDER_NAME[account.provider] : "the payment provider"} and go to ${app.appName ?? "the charity"}.`}
      </p>
    </PayShell>
  );
}
