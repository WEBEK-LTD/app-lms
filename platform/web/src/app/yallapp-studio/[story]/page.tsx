import type { Metadata } from "next";
import { StoryPage, storyMetadata } from "@/site/story/page";

/** The Studio plans the team offers, and their prices, come from the admin. */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ story: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return storyMetadata("en", (await params).story);
}

export default async function Page({ params }: Props) {
  return <StoryPage lang="en" id={(await params).story} />;
}
