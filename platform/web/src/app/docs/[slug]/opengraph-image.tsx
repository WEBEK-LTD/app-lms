import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/components/og-image";
import { DOCS, docBySlug } from "@/content/docs";
import { getSiteContent } from "@/lib/content/get";

/** 32 Each documentation article's share image: its title and description from the admin. */
export const alt = "A Yallapp documentation article";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const article = docBySlug((await params).slug);
  if (!article) return ogImage({ eyebrow: "Docs", title: "Yallapp documentation" });
  const text = await getSiteContent(article.key);
  return ogImage({ eyebrow: `Docs · ${article.section}`, title: text.title!, text: text.description });
}
