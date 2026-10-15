import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { BrowserFrame, DASHBOARD_PATHS } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import { CheckList, MarketingPage, MoreLink, Section, SectionTitle } from "@/components/marketing";
import { getSiteContent } from "@/lib/content/get";
import { numberWord, REQUIREMENTS, STEPS } from "@/lib/marketing";

export const metadata: Metadata = pageMetadata({
  title: "How it works",
  description: `From sign-up to Google Play and the App Store in ${numberWord(STEPS.length)} steps, with your website, an online platform, your own API or no website at all.`,
  path: "/how-it-works",
});

export default async function HowItWorksPage() {
  const text = await getSiteContent("how-it-works");
  return (
    <MarketingPage current="how" eyebrow={text.eyebrow} title={text.title!} intro={text.intro!}>
      <Section>
        <ol className="m-0 flex list-none flex-col gap-5 p-0">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-wrap gap-5 rounded-2xl border border-line p-6 sm:p-7">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-midnight text-lg font-bold text-white">{index + 1}</span>
              <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2.5">
                <h2 className="m-0 text-xl font-bold">{step.title}</h2>
                <p className="m-0 text-[15px] leading-relaxed text-ink-4">{step.text}</p>
                <CheckList items={step.details} />
              </div>
            </li>
          ))}
        </ol>
      </Section>
      <Section tinted>
        <SectionTitle title="All of it in your dashboard" text="Each setup step is checked as you go, and your first build starts when the last one is done." />
        <BrowserFrame screen="dashboard-setup" path={DASHBOARD_PATHS["dashboard-setup"]} />
        <MoreLink href="/docs/setup-steps">The setup steps, one by one</MoreLink>
      </Section>
      <Section>
        <SectionTitle title="What you need" text="Your apps are published under your own name, so the store accounts are yours." />
        <ul className="m-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
          {REQUIREMENTS.map((item) => (
            <li key={item} className="flex gap-3 rounded-2xl border border-line bg-white p-5 text-[15px]">
              <Icon name="check_circle" size={22} className="text-success" />
              {item}
            </li>
          ))}
        </ul>
        <MoreLink href="/docs">Read the documentation</MoreLink>
      </Section>
    </MarketingPage>
  );
}
