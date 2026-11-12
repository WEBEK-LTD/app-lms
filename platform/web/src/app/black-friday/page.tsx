import type { Metadata } from "next";
import { BlackFridayPage, blackFridayMetadata } from "@/site/occasions/black-friday";

/** 124 The saved occasion, the plans and their prices in the visitor's currency are read per request. */
export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return blackFridayMetadata("en");
}

export default function Page() {
  return <BlackFridayPage lang="en" />;
}
