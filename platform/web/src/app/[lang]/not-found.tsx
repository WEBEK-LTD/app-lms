import { LocalizedNotFound, type NotFoundText } from "@/components/localized-not-found";
import { languageLabels } from "@/components/site-chrome";
import { formatMessage, messagesFor, PREFIXED_LANGS, type PrefixedLang } from "@/i18n";
import { siteNavFor } from "@/lib/site-nav";

/**
 * 55 "Page not found" in Arabic and Turkish. A not-found page gets no route
 * parameters, so both languages' few words go to the page, which shows the
 * one of its address.
 */
export default function NotFound() {
  const texts = Object.fromEntries(
    PREFIXED_LANGS.map((lang): [PrefixedLang, NotFoundText] => {
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
  ) as Record<PrefixedLang, NotFoundText>;
  return <LocalizedNotFound texts={texts} />;
}
