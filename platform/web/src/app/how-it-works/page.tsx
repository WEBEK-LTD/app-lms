import type { Metadata } from "next";
import { HowItWorksPage, howMetadata } from "@/site/features";

/** 55 The page itself is in src/site/features.tsx, in every language. */
export async function generateMetadata(): Promise<Metadata> {
  return howMetadata("en");
}

export default function Page() {
  return <HowItWorksPage lang="en" />;
}
