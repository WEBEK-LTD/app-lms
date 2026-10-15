import type { Metadata } from "next";
import { blocksText, faqLd, pageMetadata } from "@/lib/seo";
import { JsonLdScript } from "@/components/json-ld";
import { Icon } from "@/components/icon";
import { MarkdownBlocks } from "@/components/markdown";
import { MarketingPage, MoreLink, Section } from "@/components/marketing";
import { getSiteContent } from "@/lib/content/get";
import { headingId } from "@/lib/content/markdown";
import { parseFaq } from "@/lib/content/site";

export const metadata: Metadata = pageMetadata({
  title: "FAQ",
  path: "/faq",
  description:
    "Answers about getting started, content sources, publishing on Google Play and the App Store, push notifications, payments, languages, plans, several apps per account, security and support.",
});

export default async function FaqPage() {
  const text = await getSiteContent("faq");
  const groups = parseFaq(text.entries!);
  return (
    <MarketingPage current="faq" eyebrow={text.eyebrow} title={text.title!} intro={text.intro!}>
      <JsonLdScript data={faqLd(groups.flatMap((g) => g.items.map((item) => ({ question: item.question, answer: blocksText(item.answer) }))))} />
      <Section narrow>
        <nav aria-label="Topics" className="flex flex-wrap gap-2">
          {groups.map((group, i) => (
            <a
              key={`${i}-${group.title}`}
              href={`#${headingId(group.title)}`}
              className="rounded-full border border-line px-3.5 py-1.5 text-sm font-semibold text-midnight no-underline hover:border-midnight hover:text-midnight"
            >
              {group.title}
            </a>
          ))}
        </nav>
        {groups.map((group, groupIndex) => (
          <div key={`${groupIndex}-${group.title}`} className="flex flex-col gap-4">
            <h2 id={headingId(group.title)} className="m-0 scroll-mt-4 text-[22px] font-extrabold">
              {group.title}
            </h2>
            {group.items.map((item, index) => (
              <details key={`${index}-${item.question}`} open={groupIndex === 0 && index === 0} className="group rounded-[14px] border border-line bg-white px-5 py-[18px]">
                <summary className="flex items-start justify-between gap-3 rounded-md text-[17px] font-bold">
                  {item.question}
                  <Icon name="expand_more" size={24} className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-ink-4 [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-5">
                  <MarkdownBlocks blocks={item.answer} />
                </div>
              </details>
            ))}
          </div>
        ))}
        <MoreLink href="/docs">Read the documentation</MoreLink>
      </Section>
    </MarketingPage>
  );
}
