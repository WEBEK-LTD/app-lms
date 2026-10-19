import type { Metadata } from "next";
import { IntegrationsPage, integrationsMetadata } from "@/site/features";

/** 55 The page itself is in src/site/features.tsx, in every language. */
export async function generateMetadata(): Promise<Metadata> {
  return integrationsMetadata("en");
}

export default function Page() {
  return <IntegrationsPage lang="en" />;
}
