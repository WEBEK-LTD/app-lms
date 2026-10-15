import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "Terms of service",
  description: "The terms that cover your use of Yallapp: the website, the dashboard, the WordPress plugin and the apps we build for you.",
  path: "/terms",
});

export default function TermsPage() {
  return <LegalPage contentKey="terms" path="/terms" />;
}
