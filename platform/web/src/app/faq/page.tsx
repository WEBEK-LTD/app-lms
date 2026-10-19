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
    "Answers about getting started, content sources, publishing on Google Play, the App Store, Galaxy Store, AppGallery and GetApps, push notifications, payments, languages, plans, several apps per account, security and support.",
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
                <div className="flex flex-col gap-3 px-5 pb-5 text-[15px] leading-relaxed text-ink-4 sm:px-6 [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-5">
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
