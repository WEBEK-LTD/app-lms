import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Refund policy" };

export default function RefundPage() {
  return <LegalPage contentKey="refund" path="/refund" />;
}
