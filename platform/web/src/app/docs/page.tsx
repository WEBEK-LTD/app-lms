import type { Metadata } from "next";
import { DocsIndexPage, docsMetadata } from "@/site/docs";

/** 55 The page itself is in src/site/docs.tsx, in every language. */
export async function generateMetadata(): Promise<Metadata> {
  return docsMetadata("en");
}

export default function Page() {
  return <DocsIndexPage lang="en" />;
}
