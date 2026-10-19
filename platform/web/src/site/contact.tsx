import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { JsonLdScript } from "@/components/json-ld";
import { MarkdownBlocks } from "@/components/markdown";
import { MarketingPage, MoreLink, Section } from "@/components/marketing";
import { WhatsAppMark } from "@/components/brand-marks";
import { getSiteContent } from "@/lib/content/get";
import { headingId } from "@/lib/content/markdown";
import { parseFaq } from "@/lib/content/site";
import { COMPANY, COMPANY_PLACE } from "@/lib/company";
import { getContact, type Contact } from "@/lib/contact";
import { blocksText, faqLd, siteMetadata } from "@/lib/seo";
import { messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";

/** 55 The Contact and FAQ pages, in any language. */

export function contactMetadata(lang: Lang): Metadata {
  const m = messagesFor(lang).meta;
  return siteMetadata(lang, { title: m.contactTitle, description: m.contactDescription, path: "/contact" });
}

const channels = (contact: Contact, lang: Lang): { id: "whatsapp" | "email"; icon: IconName; title: string; text: string; href: string; label: string }[] => {
  const m = messagesFor(lang).contact;
  return [
    { id: "whatsapp", icon: "chat", title: m.whatsappTitle, text: m.whatsappText, href: contact.whatsappUrl, label: contact.whatsappDisplay },
    { id: "email", icon: "mail", title: m.emailTitle, text: m.emailText, href: `mailto:${contact.email}`, label: contact.email },
  ];
};

export async function ContactPage({ lang }: { lang: Lang }) {
  const list = channels(await getContact(), lang);
  const text = await getSiteContent("contact", lang);
  const m = messagesFor(lang).contact;
  return (
    <MarketingPage current="contact" eyebrow={text.eyebrow} title={text.title!} intro={text.intro!} lang={lang}>
      <Section>
        <div className="grid max-w-[900px] gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
          {list.map((channel) => (
            <div key={channel.id} className="flex flex-col gap-3 rounded-2xl border border-line p-6 sm:p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ivory text-midnight">
                {channel.id === "whatsapp" ? <WhatsAppMark size={26} /> : <Icon name={channel.icon} size={26} />}
              </span>
              <h2 className="m-0 text-xl font-bold">{channel.title}</h2>
              <p className="m-0 text-[15px] leading-relaxed text-ink-4">{channel.text}</p>
              <a href={channel.href} className="mt-auto text-lg font-bold">
                <bdi dir="ltr">{channel.label}</bdi>
              </a>
            </div>
          ))}
        </div>
      </Section>
      <Section tinted>
        <div className="flex max-w-[900px] flex-wrap gap-5">
          <div className="flex flex-[1_1_320px] gap-4 rounded-2xl border border-line bg-white p-6">
            <Icon name="location_on" size={26} className="flex-none" />
            <div className="flex flex-col gap-1 text-[15px]">
              <h2 className="m-0 text-lg font-bold">{COMPANY.name}</h2>
              <span>{lang === "en" ? `Based in ${COMPANY_PLACE}` : m.basedIn}</span>
              <span className="text-ink-4">{m.worldwide}</span>
            </div>
          </div>
        </div>
        <p className="m-0 max-w-[900px] text-[15px] text-ink-4">
          {richText(m.client, {
            signIn: (chunk) => <Link href={localePath(lang, "/sign-in")}>{chunk}</Link>,
            docs: (chunk) => <Link href={localePath(lang, "/docs")}>{chunk}</Link>,
          })}
        </p>
      </Section>
    </MarketingPage>
  );
}

export function faqMetadata(lang: Lang): Metadata {
  const m = messagesFor(lang).meta;
  return siteMetadata(lang, { title: m.faqTitle, path: "/faq", description: m.faqDescription });
}

export async function FaqPage({ lang }: { lang: Lang }) {
  const text = await getSiteContent("faq", lang);
  const groups = parseFaq(text.entries!);
  const m = messagesFor(lang);
  return (
    <MarketingPage current="faq" eyebrow={text.eyebrow} title={text.title!} intro={text.intro!} lang={lang}>
      <JsonLdScript
        data={faqLd(
          groups.flatMap((g) => g.items.map((item) => ({ question: item.question, answer: blocksText(item.answer) }))),
          lang === "en" ? undefined : lang,
        )}
      />
      <Section narrow>
        <nav aria-label={m.faq.topics} className="flex flex-wrap gap-2">
          {groups.map((group, i) => (
            <a
              key={`${i}-${group.title}`}
              href={`#${headingId(group.title)}`}
              className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold text-midnight no-underline transition-colors hover:border-midnight hover:text-midnight"
            >
              {group.title}
            </a>
          ))}
        </nav>
        {groups.map((group, groupIndex) => (
          <div key={`${groupIndex}-${group.title}`} className="flex flex-col gap-4">
            <h2 id={headingId(group.title)} className="m-0 scroll-mt-4 pt-4 text-2xl font-extrabold tracking-[-0.4px]">
              {group.title}
            </h2>
            {group.items.map((item, index) => (
              <details
                key={`${index}-${item.question}`}
                open={groupIndex === 0 && index === 0}
                className="group rounded-2xl border border-line bg-white transition-colors duration-200 open:border-line-strong hover:border-line-strong"
              >
                <summary className="flex items-center justify-between gap-4 rounded-2xl px-5 py-[18px] text-[17px] leading-snug font-bold sm:px-6">
                  {item.question}
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-sand transition-colors group-open:bg-midnight group-open:text-white">
                    <Icon name="expand_more" size={22} className="transition-transform duration-200 group-open:rotate-180" />
                  </span>
                </summary>
                <div className="flex flex-col gap-3 px-5 pb-5 text-[15px] leading-relaxed text-ink-4 sm:px-6 [&_p]:m-0 [&_ul]:m-0 [&_ul]:ps-5">
                  <MarkdownBlocks blocks={item.answer} lang={lang} />
                </div>
              </details>
            ))}
          </div>
        ))}
        <MoreLink href={localePath(lang, "/docs")}>{m.common.readDocs}</MoreLink>
      </Section>
    </MarketingPage>
  );
}
