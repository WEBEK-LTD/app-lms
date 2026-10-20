import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "../article-page";
import { dashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("articles.editArticle") };
}

export default async function EditArticlePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ breaking?: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const { breaking } = await searchParams;
  return <ArticlePage id={id} breaking={breaking} />;
}
