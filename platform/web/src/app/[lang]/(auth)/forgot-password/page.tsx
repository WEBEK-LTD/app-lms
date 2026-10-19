import type { Metadata } from "next";
import { authMetadata, ForgotPasswordPage } from "@/site/auth";
import { routeLang } from "@/site/lang";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return authMetadata(await routeLang(params), "forgot", "/forgot-password");
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <ForgotPasswordPage lang={await routeLang(params)} />;
}
