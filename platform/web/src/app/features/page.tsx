import type { Metadata } from "next";
import { FeaturesPage, featuresMetadata } from "@/site/features";

/** 55 The page itself is in src/site/features.tsx, in every language. */
export async function generateMetadata(): Promise<Metadata> {
  return featuresMetadata("en");
}

export default function Page() {
  return <FeaturesPage lang="en" />;
}
