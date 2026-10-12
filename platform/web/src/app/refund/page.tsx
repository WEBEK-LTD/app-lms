import type { Metadata } from "next";
import { DocLayout, DocTitle, LEGAL_NAV, LastUpdated } from "@/components/doc-layout";

export const metadata: Metadata = { title: "Refund policy" };

export default function RefundPage() {
  return (
    <DocLayout groups={LEGAL_NAV} current="/refund">
      <DocTitle>Refund policy</DocTitle>
      <LastUpdated />

      <h2>1. How payments work</h2>
      <p>Payments for Yallapp plans are arranged directly with our team. There are no automatic charges.</p>

      <h2>2. Cancel within 3 days</h2>
      <p>You can cancel within 3 days of your account being activated. We refund the full amount you paid for the current period.</p>

      <h2>3. After 3 days</h2>
      <p>
        After the 3-day period, the fee for the current period is non-refundable, including when app files have been delivered or your app has been submitted to a store.
      </p>

      <h2>4. Renewals</h2>
      <p>Your plan renews only when you pay for the next period. If you decide not to renew, nothing more is charged.</p>

      <h2>5. Store and third-party fees</h2>
      <p>
        Fees you pay to other providers, such as the Apple Developer Program, Google Play registration, LMS or Digits licenses and SMS or WhatsApp gateways, are paid to those providers. We can’t refund them.
      </p>

      <h2>6. If something goes wrong on our side</h2>
      <p>If we can’t deliver a working build because of a problem on our side, we will fix it. If we can’t fix it, we refund the unused part of your current period.</p>

      <h2>7. How to ask for a refund</h2>
      <p>
        Message us on WhatsApp at <a href="https://wa.me/905446731942">+90 544 673 19 42</a> or email <a href="mailto:info@yallapp.com.tr">info@yallapp.com.tr</a> from your account email. Once we approve a refund, we send it to your original payment method. Depending on your bank, it takes 5 to 14 business days to reach you.
      </p>

      <h2>8. Your legal rights</h2>
      <p>Yallapp is a business service. This policy does not affect any rights you have under the law that applies to you.</p>
    </DocLayout>
  );
}
