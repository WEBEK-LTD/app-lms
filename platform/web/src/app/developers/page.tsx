import type { Metadata } from "next";
import { DevelopersPage, developersMetadata } from "@/site/docs";

/** 55 The page itself is in src/site/docs.tsx, in every language. */
export async function generateMetadata(): Promise<Metadata> {
  return developersMetadata("en");
}

export default function Page() {
  return <DevelopersPage lang="en" />;
}
