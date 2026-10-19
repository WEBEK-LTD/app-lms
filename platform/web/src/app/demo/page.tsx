import type { Metadata } from "next";
import { DemoPage, demoMetadata } from "@/site/demo";

export const metadata: Metadata = demoMetadata("en");
/** Whether each download is ready comes from the admin. */
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: PageProps<"/demo">) {
  return <DemoPage lang="en" download={(await searchParams).download} />;
}
