import { ogImage } from "@/components/og-image";
import { docSectionName } from "@/components/docs-shell";
import { docBySlug } from "@/content/docs";
import { getSiteContent } from "@/lib/content/get";
import { solutionFor } from "@/lib/marketing-lang";
import { formatMessage, messagesFor, type Lang } from "@/i18n";
import { storyCopyFor } from "@/content/stories";
import { isStoryId } from "@/site/story/types";

/** 32 The share images, 55 in every language: the text on them is the page's language. */

export function siteOgImage(lang: Lang) {
  const m = messagesFor(lang).og;
  return ogImage({ title: m.siteTitle, text: m.siteText, lang });
}

export async function pricingOgImage(lang: Lang) {
  const text = await getSiteContent("pricing", lang);
  const m = messagesFor(lang).og;
  return ogImage({ eyebrow: m.pricingEyebrow, title: text.title!, text: m.pricingText, lang });
}

export async function solutionOgImage(lang: Lang, id: string) {
  const s = solutionFor(lang, id);
  if (!s) return ogImage({ title: messagesFor(lang).solutions.ogFallback, lang });
  const text = await getSiteContent(s.contentKey, lang);
  return ogImage({ eyebrow: s.appsTitle, title: text.title!, text: s.summary, lang });
}

export async function docOgImage(lang: Lang, slug: string) {
  const article = docBySlug(slug);
  const m = messagesFor(lang);
  if (!article) return ogImage({ eyebrow: m.docs.docs, title: m.docs.ogTitle, lang });
  const text = await getSiteContent(article.key, lang);
  return ogImage({ eyebrow: formatMessage(lang, m.og.docEyebrow, { section: docSectionName(lang, article.section) }), title: text.title!, text: text.description, lang });
}

/** SEO: the share images of Yallapp Studio, Features and the FAQ, in the page's language. */
export function studioOgImage(lang: Lang) {
  const m = messagesFor(lang).og;
  return ogImage({ eyebrow: m.studioEyebrow, title: m.studioTitle, text: m.studioText, lang });
}

export function featuresOgImage(lang: Lang) {
  const m = messagesFor(lang);
  return ogImage({ eyebrow: m.meta.featuresTitle, title: m.og.featuresTitle, text: m.og.featuresText, lang });
}

export function faqOgImage(lang: Lang) {
  const m = messagesFor(lang);
  return ogImage({ eyebrow: m.meta.faqTitle, title: m.og.faqTitle, text: m.og.faqText, lang });
}

/** The Studio story pages' share images: the story's title and its one line. */
export function storyOgImage(lang: Lang, id: string) {
  if (!isStoryId(id)) return studioOgImage(lang);
  const t = storyCopyFor(lang).stories[id];
  return ogImage({ eyebrow: t.navName, title: t.title, text: t.summary, lang });
}
