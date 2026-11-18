import type { Metadata } from "next";
import { isFiltered, templatesMetadata, TemplatesPage } from "@/site/templates";

/** 106.13 Studio Market's public page: the published templates, read per request (new ones, prices and flash sales change). */
export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: PageProps<"/templates">): Promise<Metadata> {
  return templatesMetadata("en", isFiltered(await searchParams));
}

export default async function Page({ searchParams }: PageProps<"/templates">) {
  return <TemplatesPage lang="en" params={await searchParams} />;
}
