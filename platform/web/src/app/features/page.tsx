import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { BrowserFrame, DASHBOARD_PATHS, DeviceFrame } from "@/components/device-frame";
import { WorksWithStrip } from "@/components/brand-marks";
import { CheckList, Comparison, FeatureIcon, MarketingPage, MoreLink, Section, SectionTitle } from "@/components/marketing";
import { getSiteContent } from "@/lib/content/get";
import { COMPARISON, DASHBOARD_SCREENS, FEATURE_GROUPS, type AppScreen, type DashboardScreen } from "@/lib/marketing";

export const metadata: Metadata = pageMetadata({
  title: "Features",
  description:
    "Your brand, a drag-and-drop page editor, light and dark, English, Arabic and Turkish, sign-in with a code, push notifications, card payments and publishing on Google Play, the App Store, Galaxy Store, AppGallery and GetApps.",
  path: "/features",
});

const isDashboard = (screen: AppScreen | DashboardScreen): screen is DashboardScreen => (DASHBOARD_SCREENS as readonly string[]).includes(screen);

export default async function FeaturesPage() {
  const text = await getSiteContent("features");
  return (
    <MarketingPage current="features" eyebrow={text.eyebrow} title={text.title!} intro={text.intro!} aside={<DeviceFrame screen="store-product" size="md" priority />}>
      <section aria-label="Features at a glance" className="bg-white">
        <div className="mx-auto max-w-[1160px] px-4 pt-12 sm:px-6">
          <nav aria-label="Features on this page" className="flex flex-wrap gap-2.5">
            {FEATURE_GROUPS.map((group) => (
              <a
                key={group.id}
                href={`#${group.id}`}
                className="rounded-full border border-line bg-white px-4 py-2 text-[15px] font-semibold text-midnight no-underline transition-colors hover:border-midnight hover:text-midnight"
              >
                {group.title}
              </a>
            ))}
          </nav>
        </div>
      </section>
      {/* 41 The brands Yallapp works with, in place of the numbers strip. */}
      <section aria-labelledby="works-with-title" className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-[1280px]">
          <WorksWithStrip />
        </div>
      </section>

      {FEATURE_GROUPS.map((group, index) => (
        <Section key={group.id} id={group.id} tinted={index % 2 === 0}>
          <SectionTitle title={group.title} text={group.text} />
          {group.screens.length ? (
            group.screens.every(isDashboard) ? (
              <div className="flex flex-col gap-5">
                {group.screens.filter(isDashboard).map((screen) => (
                  <BrowserFrame key={screen} screen={screen} path={DASHBOARD_PATHS[screen]} />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-6 sm:justify-start">
                {group.screens
                  .filter((s): s is AppScreen => !isDashboard(s))
                  .map((screen) => (
                    <DeviceFrame key={screen} screen={screen} size="sm" />
                  ))}
              </div>
            )
          ) : null}
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
            {group.features.map((feature) => (
              <article key={feature.title} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 transition-colors duration-200 hover:border-line-strong sm:p-7">
                <FeatureIcon name={feature.icon} />
                <h3 className="m-0 text-xl font-bold">{feature.title}</h3>
                <p className="m-0 text-[15px] leading-relaxed text-ink-4">{feature.text}</p>
                <CheckList items={feature.details} />
              </article>
            ))}
          </div>
        </Section>
      ))}

      <Section>
        <SectionTitle title="A typical app builder, and Yallapp" text="What you often get elsewhere, next to what every Yallapp app does." />
        <Comparison rows={COMPARISON} />
        <MoreLink href="/integrations">See where your content can come from</MoreLink>
      </Section>
    </MarketingPage>
  );
}
