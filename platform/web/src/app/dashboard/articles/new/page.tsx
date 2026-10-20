import type { Metadata } from "next";
import { ArticlePage } from "../article-page";
import { dashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("articles.newArticle") };
}

export default function NewArticlePage() {
  return <ArticlePage id={null} />;
}
