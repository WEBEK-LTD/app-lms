import type { Metadata } from "next";
import { HomePage, homeMetadata } from "@/site/home";
import { routeLang } from "@/site/lang";

/** 55 The home page in Arabic and Turkish. Plans and prices come from the admin. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  return homeMetadata(await routeLang(params));
}

export default async function LandingPage({ params }: PageProps<"/[lang]">) {
  return <HomePage lang={await routeLang(params)} />;
}
