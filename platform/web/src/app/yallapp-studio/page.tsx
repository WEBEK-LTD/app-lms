import type { Metadata } from "next";
import { StudioPage, studioMetadata } from "@/site/studio";

export const metadata: Metadata = studioMetadata("en");
/** The Studio plans the team offers, and their prices, come from the admin. */
export const dynamic = "force-dynamic";

export default function Page() {
  return <StudioPage lang="en" />;
}
