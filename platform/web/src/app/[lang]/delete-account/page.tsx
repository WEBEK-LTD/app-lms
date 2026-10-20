import type { Metadata } from "next";
import { DeleteAccountPage, deleteAccountMetadata } from "@/site/delete-account";
import { routeLang } from "@/site/lang";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return deleteAccountMetadata(await routeLang(params));
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <DeleteAccountPage lang={await routeLang(params)} />;
}
