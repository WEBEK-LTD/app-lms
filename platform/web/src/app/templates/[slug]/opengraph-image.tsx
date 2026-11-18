import { OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-image";
import { templateOgImage } from "@/site/og";

/** 106.13 A template's share image: its title and short line. */
export const alt = "Studio Market";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  return templateOgImage("en", (await params).slug);
}
