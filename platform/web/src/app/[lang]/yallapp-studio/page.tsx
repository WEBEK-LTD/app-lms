import type { Metadata } from "next";
import { StudioPage, studioMetadata } from "@/site/studio";
import { routeLang } from "@/site/lang";

/** The Studio plans the team offers, and their prices, come from the admin. */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return studioMetadata(await routeLang(params));
}

export default async function Page({ params }: Props) {
  return <StudioPage lang={await routeLang(params)} />;
}
