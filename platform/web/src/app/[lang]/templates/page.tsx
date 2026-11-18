import type { Metadata } from "next";
import { routeLang } from "@/site/lang";
import { isFiltered, templatesMetadata, TemplatesPage } from "@/site/templates";

/** 106.13 Studio Market's public page in Arabic and Turkish. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: PageProps<"/[lang]/templates">): Promise<Metadata> {
  return templatesMetadata(await routeLang(params), isFiltered(await searchParams));
}

export default async function Page({ params, searchParams }: PageProps<"/[lang]/templates">) {
  return <TemplatesPage lang={await routeLang(params)} params={await searchParams} />;
}
