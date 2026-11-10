import type { Metadata } from "next";
import { StoryPage, storyMetadata } from "@/site/story/page";
import { routeLang } from "@/site/lang";

/** The Studio plans the team offers, and their prices, come from the admin. */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string; story: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return storyMetadata(await routeLang(params), (await params).story);
}

export default async function Page({ params }: Props) {
  return <StoryPage lang={await routeLang(params)} id={(await params).story} />;
}
