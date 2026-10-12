import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { MarketingPage, MoreLink, Section, SectionTitle } from "@/components/marketing";
import { REQUIREMENTS, STEPS } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "How it works",
  description: "From your WordPress website to Google Play and the App Store in four steps.",
};

export default function HowItWorksPage() {
  return (
    <MarketingPage
      current="how"
      eyebrow="How it works"
      title="From website to app stores in four steps"
      intro="You keep running your website as you do today. Yallapp turns it into your own Android and iOS apps."
    >
      <Section>
        <ol className="m-0 flex list-none flex-col gap-5 p-0">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-wrap gap-5 rounded-2xl border border-line p-6 sm:p-7">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-midnight text-lg font-bold text-white">{index + 1}</span>
              <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2.5">
                <h2 className="m-0 text-xl font-bold">{step.title}</h2>
                <p className="m-0 text-[15px] leading-relaxed text-ink-4">{step.text}</p>
                <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
                  {step.details.map((detail) => (
                    <li key={detail} className="flex gap-2.5">
                      <Icon name="check" size={20} className="flex-none text-success" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </Section>
      <Section tinted>
        <SectionTitle title="What you need" text="Your apps are published under your own name, so the store accounts are yours." />
        <ul className="m-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
          {REQUIREMENTS.map((item) => (
            <li key={item} className="flex gap-3 rounded-2xl border border-line bg-white p-5 text-[15px]">
              <Icon name="check_circle" size={22} className="flex-none text-success" />
              {item}
            </li>
          ))}
        </ul>
        <MoreLink href="/guides">Read the publishing guides</MoreLink>
      </Section>
    </MarketingPage>
  );
}
