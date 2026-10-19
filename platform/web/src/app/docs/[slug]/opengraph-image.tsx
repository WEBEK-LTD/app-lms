import { OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-image";
import { docParams } from "@/site/docs";
import { docOgImage } from "@/site/og";

/** 32 Each documentation article's share image: its title and description from the admin. */
export const alt = "A Yallapp documentation article";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return docParams();
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  return docOgImage("en", (await params).slug);
}
