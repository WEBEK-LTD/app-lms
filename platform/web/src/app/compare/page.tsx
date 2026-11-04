import type { Metadata } from "next";
import { ComparePage, compareMetadata } from "@/site/compare";

/** The page itself is in src/site/compare.tsx, in every language. */
export async function generateMetadata(): Promise<Metadata> {
  return compareMetadata("en");
}

export default function Page() {
  return <ComparePage lang="en" />;
}
