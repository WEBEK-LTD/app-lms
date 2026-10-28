import type { Metadata } from "next";
import { StudioDemoPage, studioDemoMetadata } from "@/site/studio";

export const metadata: Metadata = studioDemoMetadata("en");
/** The WhatsApp number follows the visitor's country. */
export const dynamic = "force-dynamic";

export default function Page() {
  return <StudioDemoPage lang="en" />;
}
