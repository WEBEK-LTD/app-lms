import type { Metadata } from "next";
import { authMetadata, TwoStepPage } from "@/site/auth";
import { routeLang } from "@/site/lang";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return authMetadata(await routeLang(params), "code", "/sign-in/code");
}

/** 70 The code from the authenticator app, after the password. */
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <TwoStepPage lang={await routeLang(params)} />;
}
