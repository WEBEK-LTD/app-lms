import Link from "next/link";
import { DocLayout, DocTitle, LastUpdated, legalNav } from "./doc-layout";
import { Markdown } from "./markdown";
import { getContact } from "@/lib/contact";
import { getSiteContent } from "@/lib/content/get";
import { fillValues } from "@/lib/content/markdown";
import { DEFAULT_LANG, messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { Icon } from "./icon";

/**
 * Terms, privacy and refund pages: their text from the admin (Website content), with the contact details filled in.
 * 55 In Arabic and Turkish, with a note that the English version prevails and a link to it.
 */
export async function LegalPage({ contentKey, path, lang = DEFAULT_LANG }: { contentKey: "privacy" | "terms" | "refund"; path: string; lang?: Lang }) {
  const [contact, text] = await Promise.all([getContact(), getSiteContent(contentKey, lang)]);
  const body = fillValues(text.body!, {
    contact_email: contact.email,
    contact_whatsapp: contact.lines.international.display,
    contact_whatsapp_url: contact.lines.international.url,
    contact_whatsapp_egypt: contact.lines.egypt.display,
    contact_whatsapp_egypt_url: contact.lines.egypt.url,
  });
  const m = messagesFor(lang).legal;
  return (
    <DocLayout groups={legalNav(lang)} current={localePath(lang, path)} lang={lang}>
      <DocTitle>{text.title}</DocTitle>
      <LastUpdated date={text.updated!} lang={lang} />
      {lang !== "en" ? (
        <p data-english-prevails="" className="!m-0 flex gap-2.5 rounded-xl bg-peach px-4 py-3 text-[15px] text-ink-2">
          <Icon name="info" size={22} className="mt-0.5 text-accent" />
          <span>
            {m.prevails}{" "}
            <Link href={path} hrefLang="en" className="font-semibold">
              {m.englishVersion}
            </Link>
          </span>
        </p>
      ) : null}
      <Markdown source={body} lang={lang} />
    </DocLayout>
  );
}
