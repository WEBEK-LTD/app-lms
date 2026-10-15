import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "Refund policy",
  description: "Cancel within 3 days of your account being activated for a full refund. How refunds and renewals work.",
  path: "/refund",
});

export default function RefundPage() {
  return <LegalPage contentKey="refund" path="/refund" />;
}
