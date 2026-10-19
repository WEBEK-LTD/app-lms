import type { Metadata } from "next";
import { ContactPage, contactMetadata } from "@/site/contact";

/** 55 The page itself is in src/site/contact.tsx, in every language. */
export async function generateMetadata(): Promise<Metadata> {
  return contactMetadata("en");
}

export default function Page() {
  return <ContactPage lang="en" />;
}
