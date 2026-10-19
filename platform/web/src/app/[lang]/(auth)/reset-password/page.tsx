import type { Metadata } from "next";
import { authMetadata, ResetPasswordPage } from "@/site/auth";
import { routeLang } from "@/site/lang";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return authMetadata(await routeLang(params), "reset", "/reset-password");
}

export default async function Page({ params, searchParams }: Props) {
  return <ResetPasswordPage lang={await routeLang(params)} token={(await searchParams).token} />;
}
