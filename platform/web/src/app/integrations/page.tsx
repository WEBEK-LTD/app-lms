import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { brandColors, MarkSvg } from "@/components/brand-marks";
import { Chip, FeatureIcon, MarketingPage, MoreLink, Section, SectionTitle } from "@/components/marketing";
import { integrationMark, TRADEMARK_NOTE } from "@/lib/brands";
import { getSiteContent } from "@/lib/content/get";
import { INTEGRATION_GROUPS } from "@/lib/marketing";

export const metadata: Metadata = pageMetadata({
  title: "Integrations",
  description:
    "WordPress with Tutor LMS, LearnPress, LifterLMS, MasterStudy, Sensei, Masteriyo, LearnDash, WooCommerce, Amelia, BookingPress and LatePoint; Shopify, ikas, Ticimax, IdeaSoft, Wix, Salla, Zid, Teachable, Thinkific, SimplyBook.me; your own API; or no website.",
  path: "/integrations",
});

export default async function IntegrationsPage() {
  const text = await getSiteContent("integrations");
  return (
    <MarketingPage current="integrations" eyebrow={text.eyebrow} title={text.title!} intro={text.intro!}>
      {INTEGRATION_GROUPS.map((group, index) => (
        <Section key={group.id} id={group.id} tinted={index % 2 === 1}>
          <div className="flex items-start gap-4">
            <FeatureIcon name={group.icon} />
            <SectionTitle title={group.title} text={group.text} />
          </div>
          <ul className="m-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
            {group.items.map((item) => {
              const mark = integrationMark(item.name);
              return (
                <li
                  key={item.name}
                  className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-5 transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-[0_20px_36px_-28px_rgba(14,13,36,0.4)]"
                >
                  <h3 className="m-0 flex items-center gap-2.5 text-lg font-bold">
                    {/* 41 The brand's mark, when simple-icons has it (docs/BRAND.md). */}
                    {mark ? (
                      <span className="store-mark flex text-ink-3" style={brandColors(mark)} data-integration-mark="">
                        <MarkSvg mark={mark} height={22} />
                      </span>
                    ) : null}
                    {item.name}
                  </h3>
                  <span className="flex flex-wrap gap-1.5" aria-label={`For ${item.types.join(", ")} apps`}>
                    {item.types.map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  </span>
                  <p className="m-0 text-[15px] leading-relaxed text-ink-4">{item.text}</p>
                  {item.docs ? (
                    <Link href={item.docs} className="mt-auto flex items-center gap-1 text-[15px] font-semibold">
                      How to connect
                      <span className="sr-only"> {item.name}</span>
                      <Icon name="arrow_forward" size={18} />
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Section>
      ))}
      <Section>
        <SectionTitle
          title="Not on the list?"
          text="A developer can serve our documented API from any website, and a live check tells them what's missing. Or start without a website and add your content in the dashboard."
        />
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <MoreLink href="/docs/my-own-api">Connect your own API</MoreLink>
          <MoreLink href="/docs/no-website">Start without a website</MoreLink>
        </div>
        <p className="m-0 text-xs text-muted">{TRADEMARK_NOTE}</p>
      </Section>
    </MarketingPage>
  );
}
