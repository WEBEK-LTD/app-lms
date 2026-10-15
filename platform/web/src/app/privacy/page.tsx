import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "Privacy policy",
  description: "What personal data Yallapp collects, why, who it's shared with, how long it's kept, and your rights.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return <LegalPage contentKey="privacy" path="/privacy" />;
}
