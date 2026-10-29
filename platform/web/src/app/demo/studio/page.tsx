import type { Metadata } from "next";
import { StudioDemoPage, studioDemoMetadata } from "@/site/studio";

export const metadata: Metadata = studioDemoMetadata("en");
/** The WhatsApp number follows the visitor's country. */
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: PageProps<"/demo/studio">) {
  return <StudioDemoPage lang="en" download={(await searchParams).download} />;
}
