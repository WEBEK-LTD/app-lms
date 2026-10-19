import type { Metadata } from "next";
import { FaqPage, faqMetadata } from "@/site/contact";

/** 55 The page itself is in src/site/contact.tsx, in every language. */
export async function generateMetadata(): Promise<Metadata> {
  return faqMetadata("en");
}

export default function Page() {
  return <FaqPage lang="en" />;
}
