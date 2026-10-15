import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { DeviceFrame } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import { CheckList, Comparison, MarketingPage, Section, SectionTitle } from "@/components/marketing";
import { getSiteContent } from "@/lib/content/get";
import { COMPARISON, SOLUTIONS } from "@/lib/marketing";

export const metadata: Metadata = pageMetadata({
  title: "Solutions",
  description: "Branded apps for academies, shops, restaurants, clinics, gyms, real estate offices, news sites, events and charities, with or without a website.",
  path: "/solutions",
});

export default async function SolutionsPage() {
  const text = await getSiteContent("solutions");
  return (
    <MarketingPage current="solutions" eyebrow={text.eyebrow} title={text.title!} intro={text.intro!}>
      {SOLUTIONS.map((s, index) => (
        <Section key={s.id} tinted={index % 2 === 1}>
          <div className="flex flex-wrap items-center gap-10">
            <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-peach">
                <Icon name={s.icon} size={26} />
              </span>
              <SectionTitle title={`${s.name} apps`} text={`${s.summary} ${s.audience}`} />
              <CheckList items={s.inTheApp} />
              <p className="m-0 text-[15px] text-ink-4">
                <b className="text-midnight">Content from:</b> {s.sources.join(" · ")}
              </p>
              <Link
                href={`/solutions/${s.id}`}
                className="flex h-[50px] items-center gap-2 self-start rounded-xl bg-midnight px-5 font-bold text-white no-underline hover:bg-ink-3 hover:text-white"
              >
                More about {s.name.toLowerCase()} apps
                <Icon name="arrow_forward" size={20} />
              </Link>
            </div>
            <div className="flex min-w-0 flex-[1_1_300px] flex-wrap justify-center gap-5">
              {s.screens.slice(0, 2).map((screen) => (
                <DeviceFrame key={screen} screen={screen} size="sm" />
              ))}
            </div>
          </div>
        </Section>
      ))}
      <Section>
        <SectionTitle title="Every app type, the same promises" text="Whatever you build, these come with it." />
        <Comparison rows={COMPARISON} />
      </Section>
    </MarketingPage>
  );
}
