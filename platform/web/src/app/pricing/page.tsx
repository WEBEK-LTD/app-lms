import type { Metadata } from "next";
import { PricingPage, pricingMetadata } from "@/site/pricing";

/**
 * Plans, prices, features and limits come from the admin (roadmap 9.2 and
 * 13.1). 52 Prices show in pounds in Egypt and in dollars elsewhere: the
 * page is rendered per request and sent with `Vary` (next.config.ts).
 * 55 The page itself is in src/site/pricing.tsx, in every language.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = pricingMetadata("en");

export default function Page() {
  return <PricingPage lang="en" />;
}
