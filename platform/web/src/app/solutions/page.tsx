import type { Metadata } from "next";
import { SolutionsPage, solutionsMetadata } from "@/site/solutions";

/** 55 The page itself is in src/site/solutions.tsx, in every language. */
export async function generateMetadata(): Promise<Metadata> {
  return solutionsMetadata("en");
}

export default function Page() {
  return <SolutionsPage lang="en" />;
}
