import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { legalMetadata } from "@/site/legal";

export const metadata: Metadata = legalMetadata("en", "refund");

export default function Page() {
  return <LegalPage contentKey="refund" path="/refund" />;
}
