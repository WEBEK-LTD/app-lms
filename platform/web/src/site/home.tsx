import type { Metadata } from "next";
import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { BrowserFrame, DASHBOARD_PATHS, DeviceFrame } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import { JsonLdScript } from "@/components/json-ld";
import { StoreMarks, WhatsAppMark, WorksWithStrip } from "@/components/brand-marks";
import { Chip, Comparison, ContactBand, FeatureIcon, MoreLink, Section, SectionTitle } from "@/components/marketing";
import { currencyNote, PlanCards } from "@/components/plan-cards";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { APP_STORES } from "@/lib/stores";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { visitorPriceView } from "@/lib/billing/display";
import { getContact } from "@/lib/contact";
import { getSiteContent } from "@/lib/content/get";
import { comparisonFor, featureGroupsFor, integrationGroupsFor, numberWordFor, planFor, screenAltFor, solutionsFor, stepsFor } from "@/lib/marketing-lang";
import { DEFAULT_DESCRIPTION, organizationLd, siteMetadata, siteUrl, softwareLd, websiteLd } from "@/lib/seo";
import { formatMessage, messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";

export function homeMetadata(lang: Lang): Metadata {
  return siteMetadata(lang, { description: lang === "en" ? DEFAULT_DESCRIPTION : messagesFor(lang).meta.defaultDescription, path: "/" });
}

/** The landing page (32, 41, 52, 54), in any language (55). */
export async function HomePage({ lang }: { lang: Lang }) {
  const contact = await getContact();
  // 32 The same plans as the pricing page.
  const store = await getStore();
  // 52 Prices in the visitor's currency: pounds in Egypt, dollars elsewhere.
  const [all, view] = await Promise.all([effectivePlans(store), visitorPriceView(store)]);
  const plans = PLANS.map((id) => planFor(lang, all[id]));
  const base = siteUrl();
  const text = await getSiteContent("home", lang);
  const m = messagesFor(lang);
  const h = m.home;
  const lp = (path: string) => localePath(lang, path);
  const alt = screenAltFor(lang);
  const solutions = solutionsFor(lang);
  const steps = stepsFor(lang);
  const features = featureGroupsFor(lang).flatMap((g) => g.features).slice(0, 6);
  /** The looks a client can pick, shown side by side. */
  const looks = [
    { screen: "store-home", caption: h.lookClassic },
    { screen: "store-home-bold", caption: h.lookBold },
    { screen: "store-home-minimal", caption: h.lookMinimal },
    { screen: "academy-home-dark", caption: h.lookDark },
    { screen: "academy-home-ar", caption: h.lookArabic },
  ] as const;
  const bold = { b: (chunk: string) => <b className="text-midnight">{chunk}</b> };
  return (
    <div className="bg-white">
      <SiteHeader current="home" lang={lang} />
      <JsonLdScript
        data={[
          organizationLd(base, { email: contact.email, whatsapp: contact.whatsappDisplay }),
          websiteLd(base, lang),
          softwareLd(base, plans, view, lang === "en" ? undefined : lang),
        ]}
      />
      <main>
        <section className="overflow-hidden bg-ivory">
          <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-x-12 gap-y-14 px-4 pt-12 pb-16 sm:px-6 sm:pt-[72px] sm:pb-24">
            <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-6">
              <span className="flex min-h-[32px] items-center gap-2 self-start rounded-full border border-line bg-white py-1 ps-1.5 pe-3.5 text-[13px] font-bold">
                <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-peach">
                  <Icon name="smartphone" size={15} />
                </span>
                {text.badge}
              </span>
              <h1 className="m-0 text-[40px] leading-[1.04] font-extrabold tracking-[-1.5px] text-balance sm:text-[60px] sm:tracking-[-2px]">{text.title}</h1>
              <p className="m-0 max-w-[540px] text-lg leading-relaxed text-ink-4 sm:text-[19px]">{text.intro}</p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={contact.whatsappUrl}
                  className="flex h-[54px] items-center gap-2.5 rounded-xl bg-midnight px-6 text-base font-bold text-white no-underline shadow-[0_12px_24px_-14px_rgba(14,13,36,0.6)] transition-colors hover:bg-ink-3 hover:text-white"
                >
                  <WhatsAppMark size={20} />
                  {text.primaryCta}
                </a>
                <Link
                  href={lp("/how-it-works")}
                  className="flex h-[54px] items-center gap-2 rounded-xl border border-line-button bg-white px-6 text-base font-semibold text-midnight no-underline transition-colors hover:border-midnight hover:text-midnight"
                >
                  {text.secondaryCta}
                  <Icon name="arrow_forward" size={20} />
                </Link>
              </div>
              {/* 41 The five stores, as marks. */}
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 pt-1">
                <span className="text-sm font-semibold text-muted">{h.publishTo}</span>
                <StoreMarks stores={[...APP_STORES]} label={m.footer.storesLabel} size={18} />
              </div>
              <MoreLink href={lp("/demo")}>{h.tryDemo}</MoreLink>
            </div>
            <div className="relative flex min-w-0 flex-[1_1_520px] items-end justify-center gap-4" aria-label={h.appsGroup} role="group">
              <span aria-hidden="true" className="absolute inset-x-[6%] top-[14%] bottom-[-6%] rounded-[40px] bg-peach" />
              <DeviceFrame screen="store-home" size="xs" alt={alt["store-home"]} className="relative hidden translate-y-6 md:flex" />
              <DeviceFrame screen="academy-home" size="md" alt={alt["academy-home"]} priority className="relative" />
              <DeviceFrame screen="bookings-services" size="xs" alt={alt["bookings-services"]} className="relative hidden translate-y-6 md:flex" />
            </div>
          </div>
        </section>

        {/* 41 The brands Yallapp works with, in place of the numbers strip. */}
        <section aria-labelledby="works-with-title" className="border-b border-line-soft bg-white py-14 sm:py-16">
          <div className="mx-auto max-w-[1280px]">
            <WorksWithStrip lang={lang} />
          </div>
        </section>

        <Section tinted id="solutions">
          <SectionTitle title={text.solutionsTitle!} text={text.solutionsText} />
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr))]">
            {solutions.map((s) => (
              <Link
                key={s.id}
                href={lp(`/solutions/${s.id}`)}
                className="group flex flex-col gap-4 overflow-hidden rounded-2xl border border-line bg-white p-6 text-midnight no-underline transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-0.5 hover:border-midnight hover:text-midnight hover:shadow-[0_24px_40px_-28px_rgba(14,13,36,0.4)]"
              >
                <FeatureIcon name={s.icon} />
                <span className="flex flex-col gap-1.5">
                  <span className="text-xl font-bold">{s.name}</span>
                  <span className="text-[15px] leading-relaxed text-ink-4">{s.summary}</span>
                </span>
                <DeviceFrame screen={s.screens[0]!} size="sm" alt={alt[s.screens[0]!]} className="mt-auto self-center" />
                <span className="flex items-center gap-1.5 font-bold group-hover:underline">
                  {s.appsTitle}
                  <Icon name="arrow_forward" size={20} />
                </span>
              </Link>
            ))}
          </div>
          <MoreLink href={lp("/demo")}>{formatMessage(lang, h.tryDemos, { count: numberWordFor(lang, solutions.length) })}</MoreLink>
        </Section>

        <Section>
          <SectionTitle title={text.featuresTitle!} text={text.featuresText} />
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
            {features.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 transition-colors duration-200 hover:border-line-strong">
                <FeatureIcon name={feature.icon} />
                <h3 className="m-0 text-lg font-bold">{feature.title}</h3>
                <p className="m-0 text-[15px] leading-relaxed text-ink-4">{feature.text}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-5 rounded-[20px] bg-sand p-4 sm:p-8">
            <h3 className="m-0 text-xl font-bold">{h.looksTitle}</h3>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-8">
              {looks.map((look) => (
                <DeviceFrame key={look.screen} screen={look.screen} size="xs" caption={look.caption} alt={alt[look.screen]} />
              ))}
            </div>
          </div>
          <MoreLink href={lp("/features")}>{h.seeAllFeatures}</MoreLink>
        </Section>

        <Section tinted>
          <SectionTitle title={text.integrationsTitle!} text={text.integrationsText} />
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
            {integrationGroupsFor(lang)
              .slice(0, 3)
              .map((group) => (
                <div key={group.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6">
                  <span className="flex items-center gap-3">
                    <FeatureIcon name={group.icon} />
                    <h3 className="m-0 text-lg font-bold">{group.title}</h3>
                  </span>
                  <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                    {group.items.map((item) => (
                      <li key={item.name}>
                        <Chip>{item.label}</Chip>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
          <MoreLink href={lp("/integrations")}>{m.common.allIntegrations}</MoreLink>
        </Section>

        <Section>
          <SectionTitle title={text.dashboardTitle!} text={text.dashboardText} />
          <BrowserFrame screen="dashboard-pages" path={DASHBOARD_PATHS["dashboard-pages"]} alt={alt["dashboard-pages"]} />
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
            <div className="flex flex-col gap-3">
              <BrowserFrame screen="dashboard-setup" path={DASHBOARD_PATHS["dashboard-setup"]} alt={alt["dashboard-setup"]} />
              <p className="m-0 text-[15px] text-ink-4">{richText(h.setup, bold)}</p>
            </div>
            <div className="flex flex-col gap-3">
              <BrowserFrame screen="dashboard-builds" path={DASHBOARD_PATHS["dashboard-builds"]} alt={alt["dashboard-builds"]} />
              <p className="m-0 text-[15px] text-ink-4">{richText(h.builds, bold)}</p>
            </div>
          </div>
        </Section>

        <Section tinted>
          <SectionTitle title={text.compareTitle!} text={text.compareText} />
          <Comparison rows={comparisonFor(lang)} lang={lang} />
        </Section>

        <Section>
          <SectionTitle title={text.stepsTitle!} />
          {/* 32 A timeline: numbered nodes joined by a line, across on wide screens and down on phones (55 from the right in Arabic). */}
          <ol className="m-0 grid list-none gap-0 p-0 lg:grid-cols-5" data-steps-timeline="">
            {steps.map((step, index) => (
              <li key={step.title} className="relative flex gap-5 pb-9 last:pb-0 lg:flex-col lg:items-center lg:gap-5 lg:px-3 lg:pb-0 lg:text-center">
                {index < steps.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute start-[31px] top-16 bottom-1 w-0.5 rounded-full bg-line-strong lg:start-[calc(50%+40px)] lg:end-[calc(-50%+40px)] lg:top-[31px] lg:bottom-auto lg:h-0.5 lg:w-auto"
                  />
                ) : null}
                <span className="relative flex h-16 w-16 flex-none items-center justify-center rounded-full bg-midnight text-white">
                  <Icon name={step.icon} size={28} />
                  <span className="absolute -end-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-ember text-sm font-extrabold text-[#0e0d24] ring-[3px] ring-white">
                    {index + 1}
                  </span>
                </span>
                <div className="flex min-w-0 flex-col gap-1.5 pt-1.5 lg:pt-0">
                  <h3 className="m-0 text-lg font-bold">
                    <span className="sr-only">{formatMessage(lang, m.common.step, { n: index + 1 })}</span>
                    {step.title}
                  </h3>
                  <p className="m-0 text-[15px] leading-relaxed text-ink-4">{step.short}</p>
                </div>
              </li>
            ))}
          </ol>
          <MoreLink href={lp("/how-it-works")}>{h.howInDetail}</MoreLink>
        </Section>

        <Section tinted id="plans">
          <SectionTitle title={text.plansTitle!} text={text.plansText} />
          <PlanCards plans={plans} view={view} headingLevel={3} lang={lang} />
          <p data-currency-note="" className="m-0 text-[15px] text-ink-4">
            {currencyNote(view, lang)}
          </p>
          <MoreLink href={lp("/pricing")}>{h.compareFeatures}</MoreLink>
        </Section>

        <ContactBand lang={lang} />
      </main>
      <SiteFooter full lang={lang} />
    </div>
  );
}
