import type { Metadata } from "next";
import { authMetadata, SignUpPage } from "@/site/auth";
import { routeLang } from "@/site/lang";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return authMetadata(await routeLang(params), "signUp", "/sign-up");
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <SignUpPage lang={await routeLang(params)} />;
}
