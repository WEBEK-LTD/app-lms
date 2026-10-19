import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { legalMetadata } from "@/site/legal";

export const metadata: Metadata = legalMetadata("en", "terms");

export default function Page() {
  return <LegalPage contentKey="terms" path="/terms" />;
}
