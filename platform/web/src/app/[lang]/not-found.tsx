import { LocalizedNotFound, type NotFoundText } from "@/components/localized-not-found";
import { languageLabels } from "@/components/site-chrome";
import { formatMessage, LANGS, messagesFor, type Lang } from "@/i18n";
import { siteNavFor } from "@/lib/site-nav";

/**
 * 55 "Page not found" under /ar and /tr, and in English for any other first
 * segment (/xyz). A not-found page gets no route parameters, so each
 * language's few words go to the page, which shows the one of its address.
 */
export default function NotFound() {
  const texts = Object.fromEntries(
    LANGS.map((lang): [Lang, NotFoundText] => {
      const m = messagesFor(lang);
      return [
        lang,
        {
          nav: siteNavFor(lang, m.nav),
          labels: m.nav,
          languages: languageLabels(lang),
          title: m.notFound.title,
          text: m.notFound.text,
          home: m.notFound.home,
          guides: m.notFound.guides,
          legalLine: formatMessage(lang, m.footer.legalLine, { year: String(new Date().getFullYear()) }),
        },
      ];
    }),
  ) as Record<Lang, NotFoundText>;
  return <LocalizedNotFound texts={texts} />;
}
