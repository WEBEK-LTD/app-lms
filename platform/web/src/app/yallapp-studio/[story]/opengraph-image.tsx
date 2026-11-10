import { OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-image";
import { storyOgImage } from "@/site/og";
import { storyParams } from "@/site/story/types";

/** Each Studio story page's share image: the story's title and its one line. */
export const alt = "A Yallapp Studio story";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return storyParams();
}

export default async function Image({ params }: { params: Promise<{ story: string }> }) {
  return storyOgImage("en", (await params).story);
}
