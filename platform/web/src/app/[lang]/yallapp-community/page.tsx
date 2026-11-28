import type { Metadata } from "next";
import { CommunityPage, communityPageMetadata } from "@/site/community-page";
import { routeLang } from "@/site/lang";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return communityPageMetadata(await routeLang(params));
}

export default async function Page({ params }: Props) {
  return <CommunityPage lang={await routeLang(params)} />;
}
