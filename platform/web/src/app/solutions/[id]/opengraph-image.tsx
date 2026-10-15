import { OG_CONTENT_TYPE, OG_SIZE, ogImage } from "@/components/og-image";
import { getSiteContent } from "@/lib/content/get";
import { SOLUTIONS, solution } from "@/lib/marketing";

/** 32 Each solution page's share image: its title from the admin and its one line. */
export const alt = "A Yallapp app type";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return SOLUTIONS.map((s) => ({ id: s.id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const s = solution((await params).id);
  if (!s) return ogImage({ title: "An app for the way your business works" });
  const text = await getSiteContent(s.contentKey);
  return ogImage({ eyebrow: `${s.name} apps`, title: text.title!, text: s.summary });
}
