import type { Metadata } from "next";
import { authMetadata, SignInPage } from "@/site/auth";
import { routeLang } from "@/site/lang";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return authMetadata(await routeLang(params), "signIn", "/sign-in");
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <SignInPage lang={await routeLang(params)} />;
}
