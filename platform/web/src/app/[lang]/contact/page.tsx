import type { Metadata } from "next";
import { ContactPage, contactMetadata } from "@/site/contact";
import { routeLang } from "@/site/lang";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return contactMetadata(await routeLang(params));
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <ContactPage lang={await routeLang(params)} />;
}
