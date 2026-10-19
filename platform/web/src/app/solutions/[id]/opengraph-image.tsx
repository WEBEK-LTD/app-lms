import { OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-image";
import { solutionParams } from "@/site/solutions";
import { solutionOgImage } from "@/site/og";

/** 32 Each solution page's share image: its title from the admin and its one line. */
export const alt = "A Yallapp app type";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return solutionParams();
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  return solutionOgImage("en", (await params).id);
}
