import type { Metadata } from "next";
import { NO_INDEX } from "@/lib/seo";
import { DocsSearchPage, docsSearchMetadata } from "@/site/docs";

/** 93.2 The page itself is in src/site/docs.tsx, in every language. */
export async function generateMetadata(): Promise<Metadata> {
  // Results pages stay out of search engines.
  return { ...(await docsSearchMetadata("en")), robots: NO_INDEX };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  return <DocsSearchPage lang="en" query={typeof q === "string" ? q : ""} />;
}
