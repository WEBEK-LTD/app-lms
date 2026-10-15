import type { Metadata } from "next";
import { PLANS } from "@/lib/plans";
import Link from "next/link";
import { BrowserFrame, DASHBOARD_PATHS, DeviceFrame } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import { JsonLdScript } from "@/components/json-ld";
import { Chip, Comparison, ContactBand, MoreLink, NumbersBand, Section, SectionTitle } from "@/components/marketing";
import { PlanCards } from "@/components/plan-cards";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { COMPARISON, FEATURE_GROUPS, INTEGRATION_GROUPS, NUMBERS, numberWord, SOLUTIONS, STEPS, WORKS_WITH } from "@/lib/marketing";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { getContact } from "@/lib/contact";
import { getSiteContent } from "@/lib/content/get";
import { DEFAULT_DESCRIPTION, organizationLd, pageMetadata, siteUrl, softwareLd, websiteLd } from "@/lib/seo";

/** Plans and prices come from the admin. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({ description: DEFAULT_DESCRIPTION, path: "/" });

/** The looks a client can pick, shown side by side. */
const LOOKS = [
  { screen: "store-home", caption: "Classic" },
  { screen: "store-home-bold", caption: "Bold" },
  { screen: "store-home-minimal", caption: "Minimal" },
  { screen: "academy-home-dark", caption: "Dark mode" },
  { screen: "academy-home-ar", caption: "Arabic, right to left" },
] as const;

export default async function LandingPage() {
  const contact = await getContact();
  // 32 The same plans as the pricing page.
  const all = await effectivePlans(await getStore());
  const plans = PLANS.map((id) => all[id]);
  const base = siteUrl();
  const text = await getSiteContent("home");
  const features = FEATURE_GROUPS.flatMap((g) => g.features).slice(0, 6);
  return (
    <div className="bg-white">
      <SiteHeader current="home" />
      <JsonLdScript data={[organizationLd(base, { email: contact.email, whatsapp: contact.whatsappDisplay }), websiteLd(base), softwareLd(base, plans)]} />
      <main>
        <section className="overflow-hidden bg-ivory">
          <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-12 px-4 py-14 sm:px-6 sm:py-[72px]">
            <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-[22px]">
              <span className="flex min-h-[30px] items-center self-start rounded-[15px] bg-peach px-3 py-1 text-[13px] font-bold">{text.badge}</span>
              <h1 className="m-0 text-[38px] leading-[1.08] font-extrabold tracking-[-1px] sm:text-[52px]">{text.title}</h1>
              <p className="m-0 max-w-[560px] text-lg leading-relaxed text-ink-4">{text.intro}</p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={contact.whatsappUrl}
                  className="flex h-[52px] items-center gap-2.5 rounded-xl bg-midnight px-[22px] text-base font-bold text-white no-underline hover:bg-ink-3 hover:text-white"
                >
                  <Icon name="chat" size={20} />
                  {text.primaryCta}
                </a>
                <Link
                  href="/how-it-works"
                  className="flex h-[52px] items-center rounded-xl border border-line-button bg-white px-[22px] text-base font-semibold text-midnight no-underline hover:border-midnight hover:text-midnight"
                >
                  {text.secondaryCta}
                </Link>
              </div>
              <MoreLink href="/demo">Try a demo app on your phone</MoreLink>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
                <span>Works with:</span>
                {WORKS_WITH.map((name) => (
                  <span key={name} className="font-semibold text-midnight">
                    {name}
                  </span>
                ))}
                <Link href="/integrations" className="font-semibold">
                  and more
                </Link>
              </div>
            </div>
            <div className="flex min-w-0 flex-[1_1_564px] items-end justify-center gap-4" aria-label="Yallapp apps" role="group">
              <DeviceFrame screen="store-home" size="xs" className="hidden translate-y-6 md:flex" />
              <DeviceFrame screen="academy-home" size="md" priority />
              <DeviceFrame screen="bookings-services" size="xs" className="hidden translate-y-6 md:flex" />
            </div>
          </div>
        </section>

        <section aria-label="Yallapp in numbers" className="bg-white">
          <div className="mx-auto max-w-[1160px] px-4 pt-12 pb-2 sm:px-6 sm:pt-14">
            <NumbersBand numbers={NUMBERS} />
          </div>
        </section>

        <Section tinted id="solutions">
          <SectionTitle title={text.solutionsTitle!} text={text.solutionsText} />
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr))]">
            {SOLUTIONS.map((s) => (
              <Link
                key={s.id}
                href={`/solutions/${s.id}`}
                className="group flex flex-col gap-4 overflow-hidden rounded-2xl border border-line bg-white p-6 text-midnight no-underline hover:border-midnight hover:text-midnight"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ivory">
                  <Icon name={s.icon} size={26} />
                </span>
                <span className="flex flex-col gap-1.5">
                  <span className="text-xl font-bold">{s.name}</span>
                  <span className="text-[15px] leading-relaxed text-ink-4">{s.summary}</span>
                </span>
                <DeviceFrame screen={s.screens[0]!} size="sm" className="mt-auto self-center" />
                <span className="flex items-center gap-1.5 font-bold group-hover:underline">
                  {s.name} apps
                  <Icon name="arrow_forward" size={20} />
                </span>
              </Link>
            ))}
          </div>
          <MoreLink href="/demo">{`Try the ${numberWord(SOLUTIONS.length)} demo apps`}</MoreLink>
        </Section>

        <Section>
          <SectionTitle title={text.featuresTitle!} text={text.featuresText} />
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
            {features.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-2.5 rounded-2xl border border-line p-6">
                <Icon name={feature.icon} size={28} />
                <h3 className="m-0 text-lg font-bold">{feature.title}</h3>
                <p className="m-0 text-[15px] leading-relaxed text-ink-4">{feature.text}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-5 rounded-[20px] bg-sand p-4 sm:p-8">
            <h3 className="m-0 text-xl font-bold">3 templates, light and dark, 3 languages</h3>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-8">
              {LOOKS.map((look) => (
                <DeviceFrame key={look.screen} screen={look.screen} size="xs" caption={look.caption} />
              ))}
            </div>
          </div>
          <MoreLink href="/features">See all features</MoreLink>
        </Section>

        <Section tinted>
          <SectionTitle title={text.integrationsTitle!} text={text.integrationsText} />
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
            {INTEGRATION_GROUPS.slice(0, 3).map((group) => (
              <div key={group.id} className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-6">
                <span className="flex items-center gap-2.5">
                  <Icon name={group.icon} size={24} />
                  <h3 className="m-0 text-lg font-bold">{group.title}</h3>
                </span>
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {group.items.map((item) => (
                    <li key={item.name}>
                      <Chip>{item.name}</Chip>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <MoreLink href="/integrations">All integrations</MoreLink>
        </Section>

        <Section>
          <SectionTitle title={text.dashboardTitle!} text={text.dashboardText} />
          <BrowserFrame screen="dashboard-pages" path={DASHBOARD_PATHS["dashboard-pages"]} />
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
            <div className="flex flex-col gap-3">
              <BrowserFrame screen="dashboard-setup" path={DASHBOARD_PATHS["dashboard-setup"]} />
              <p className="m-0 text-[15px] text-ink-4">
                <b className="text-midnight">Setup, step by step.</b> App type, content, branding, store listing and publishing, each checked as you go.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <BrowserFrame screen="dashboard-builds" path={DASHBOARD_PATHS["dashboard-builds"]} />
              <p className="m-0 text-[15px] text-ink-4">
                <b className="text-midnight">Every build, ready to download.</b> APK, App Bundle, iOS build, signing key and store assets.
              </p>
            </div>
          </div>
        </Section>

        <Section tinted>
          <SectionTitle title={text.compareTitle!} text={text.compareText} />
          <Comparison rows={COMPARISON} />
        </Section>

        <Section>
          <SectionTitle title={text.stepsTitle!} />
          {/* 32 A timeline: numbered nodes joined by a line, across on wide screens and down on phones. */}
          <ol className="m-0 grid list-none gap-0 p-0 lg:grid-cols-5" data-steps-timeline="">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative flex gap-5 pb-9 last:pb-0 lg:flex-col lg:items-center lg:gap-5 lg:px-3 lg:pb-0 lg:text-center">
                {index < STEPS.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-16 bottom-1 left-[31px] w-0.5 rounded-full bg-line-strong lg:top-[31px] lg:right-[calc(-50%+40px)] lg:bottom-auto lg:left-[calc(50%+40px)] lg:h-0.5 lg:w-auto"
                  />
                ) : null}
                <span className="relative flex h-16 w-16 flex-none items-center justify-center rounded-full bg-midnight text-white">
                  <Icon name={step.icon} size={28} />
                  <span className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-ember text-sm font-extrabold text-midnight ring-[3px] ring-white">
                    {index + 1}
                  </span>
                </span>
                <div className="flex min-w-0 flex-col gap-1.5 pt-1.5 lg:pt-0">
                  <h3 className="m-0 text-lg font-bold">
                    <span className="sr-only">Step {index + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="m-0 text-[15px] leading-relaxed text-ink-4">{step.short}</p>
                </div>
              </li>
            ))}
          </ol>
          <MoreLink href="/how-it-works">How it works in detail</MoreLink>
        </Section>

        <Section tinted id="plans">
          <SectionTitle title={text.plansTitle!} text={text.plansText} />
          <PlanCards plans={plans} headingLevel={3} />
          <MoreLink href="/pricing">Compare all features</MoreLink>
        </Section>

        <ContactBand />
      </main>
      <SiteFooter full />
    </div>
  );
}
