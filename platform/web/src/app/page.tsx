import Link from "next/link";
import { Icon } from "@/components/icon";
import { ContactBand, MoreLink, Section, SectionTitle } from "@/components/marketing";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { FEATURES, STEPS, WORKS_WITH } from "@/lib/marketing";
import { getStore } from "@/lib/data";
import { getPlans } from "@/lib/settings/platform";
import { getContact } from "@/lib/contact";
import { getSiteContent } from "@/lib/content/get";

/** Plans and prices come from the admin. */
export const dynamic = "force-dynamic";

function PhoneMock() {
  return (
    <div className="h-[560px] w-[280px] max-w-full rounded-[40px] bg-midnight p-3" aria-hidden="true">
      <div className="flex h-full w-full flex-col gap-3.5 overflow-hidden rounded-[30px] bg-ivory px-4 pt-7 pb-4">
        <span className="text-[11px] text-muted">Good morning</span>
        <span className="-mt-2.5 text-base font-bold">Your student</span>
        <div className="flex flex-col gap-2.5 rounded-[14px] bg-midnight p-3.5 text-white">
          <span className="text-xs font-bold">Python Programming Basics</span>
          <span className="text-[10px] text-night-text">Lesson 7: Functions &amp; Variables</span>
          <div className="h-[5px] rounded-[3px] bg-night-3">
            <div className="h-full w-3/5 rounded-[3px] bg-white" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="h-[120px] rounded-xl bg-tile-1" />
          <div className="h-[120px] rounded-xl bg-tile-2" />
          <div className="h-[120px] rounded-xl bg-tile-3" />
          <div className="h-[120px] rounded-xl bg-tile-4" />
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const contact = await getContact();
  const all = await getPlans(await getStore());
  const plans = [all.starter, all.pro];
  const text = await getSiteContent("home");
  return (
    <div className="bg-white">
      <SiteHeader current="home" />
      <main>
        <section className="bg-ivory">
          <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-12 px-4 py-14 sm:px-6 sm:py-[72px]">
            <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-[22px]">
              <span className="flex h-[30px] items-center self-start rounded-[15px] bg-peach px-3 text-[13px] font-bold">
                {text.badge}
              </span>
              <h1 className="m-0 text-[38px] leading-[1.08] font-extrabold tracking-[-1px] sm:text-[52px]">
                {text.title}
              </h1>
              <p className="m-0 max-w-[540px] text-lg leading-relaxed text-ink-4">
                {text.intro}
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={contact.whatsappUrl} className="flex h-[52px] items-center gap-2.5 rounded-xl bg-midnight px-[22px] text-base font-bold text-white no-underline hover:bg-ink-3 hover:text-white">
                  <Icon name="chat" size={20} />
                  {text.primaryCta}
                </a>
                <Link href="/how-it-works" className="flex h-[52px] items-center rounded-xl border border-line-button bg-white px-[22px] text-base font-semibold text-midnight no-underline hover:border-midnight hover:text-midnight">
                  {text.secondaryCta}
                </Link>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                <span>Works with:</span>
                {WORKS_WITH.map((name) => (
                  <span key={name} className="font-semibold text-midnight">
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-[1_1_280px] justify-center">
              <PhoneMock />
            </div>
          </div>
        </section>

        <Section>
          <SectionTitle title={text.featuresTitle!} text={text.featuresText} />
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
            {FEATURES.slice(0, 6).map((feature) => (
              <div key={feature.title} className="flex flex-col gap-2.5 rounded-2xl border border-line p-6">
                <Icon name={feature.icon} size={28} />
                <h3 className="m-0 text-lg font-bold">{feature.title}</h3>
                <p className="m-0 text-[15px] leading-relaxed text-ink-4">{feature.text}</p>
              </div>
            ))}
          </div>
          <MoreLink href="/features">See all features</MoreLink>
        </Section>

        <Section tinted>
          <SectionTitle title={text.stepsTitle!} />
          <ol className="m-0 grid list-none gap-5 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-midnight font-bold text-white">{index + 1}</span>
                <h3 className="m-0 text-[17px] font-bold">{step.title}</h3>
                <p className="m-0 text-[15px] leading-relaxed text-ink-4">{step.text}</p>
              </li>
            ))}
          </ol>
          <MoreLink href="/how-it-works">How it works in detail</MoreLink>
        </Section>

        <Section>
          <SectionTitle title={text.plansTitle!} text={text.plansText} />
          <div className="grid max-w-[900px] gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
            {plans.map((plan) => (
              <Link
                key={plan.id}
                href="/pricing"
                className={`flex flex-col gap-1.5 rounded-[20px] p-6 text-midnight no-underline hover:text-midnight ${
                  plan.id === "pro" ? "border-2 border-midnight bg-peach-soft" : "border border-line hover:border-midnight"
                }`}
              >
                <span className="text-lg font-bold">{plan.name}</span>
                <span className="text-[15px] text-ink-4">{plan.tagline}</span>
              </Link>
            ))}
          </div>
          <MoreLink href="/pricing">Compare plans</MoreLink>
        </Section>

        <ContactBand />
      </main>
      <SiteFooter full />
    </div>
  );
}
