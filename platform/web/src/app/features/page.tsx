import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { MarketingPage, Section, SectionTitle } from "@/components/marketing";
import { FEATURES, WORKS_WITH } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Features",
  description: "Branding, one-time code sign-in, protected video, HTML lessons, quizzes, push notifications and selling courses: everything in a Yallapp app.",
};

export default function FeaturesPage() {
  return (
    <MarketingPage
      current="features"
      eyebrow="Features"
      title="Everything your students need, in their pocket"
      intro="Your courses, lessons and quizzes stay in your LMS plugin. The app reads them live, so there's nothing to copy or maintain twice."
    >
      <Section>
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr))]">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="flex flex-col gap-3 rounded-2xl border border-line p-6 sm:p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ivory text-midnight">
                <Icon name={feature.icon} size={26} />
              </span>
              <h2 className="m-0 text-xl font-bold">{feature.title}</h2>
              <p className="m-0 text-[15px] leading-relaxed text-ink-4">{feature.text}</p>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
                {feature.details.map((detail) => (
                  <li key={detail} className="flex gap-2.5">
                    <Icon name="check" size={20} className="flex-none text-success" />
                    {detail}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Section>
      <Section tinted>
        <SectionTitle title="Works with the plugins you already use" text="Install the Yallapp plugin on your WordPress site. It detects your LMS, Digits and WooCommerce and connects them to your apps." />
        <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
          {WORKS_WITH.map((name) => (
            <li key={name} className="rounded-full border border-line bg-white px-4 py-2 text-[15px] font-semibold">
              {name}
            </li>
          ))}
        </ul>
      </Section>
    </MarketingPage>
  );
}
