import type { Metadata } from "next";
import { siteMetadata } from "@/lib/seo";
import { messagesFor, type Lang } from "@/i18n";

/** 55 The legal pages' metadata in a language (the pages are components/legal-page.tsx). */
export function legalMetadata(lang: Lang, key: "terms" | "privacy" | "refund"): Metadata {
  const m = messagesFor(lang).meta;
  const words = { terms: [m.termsTitle, m.termsDescription], privacy: [m.privacyTitle, m.privacyDescription], refund: [m.refundTitle, m.refundDescription] }[key];
  return siteMetadata(lang, { title: words[0], description: words[1]!, path: `/${key}` });
}
