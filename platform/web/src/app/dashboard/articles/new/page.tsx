import type { Metadata } from "next";
import { ArticlePage } from "../article-page";

export const metadata: Metadata = { title: "New article" };

export default function NewArticlePage() {
  return <ArticlePage id={null} />;
}
