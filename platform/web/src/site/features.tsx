import type { Metadata } from "next";
import Link from "next/link";
import { BrowserFrame, DASHBOARD_PATHS, DeviceFrame } from "@/components/device-frame";
import { brandColors, MarkSvg, StoreMarks, WorksWithStrip } from "@/components/brand-marks";
import { Icon } from "@/components/icon";
import { CheckList, Chip, Comparison, FeatureIcon, MarketingPage, MoreLink, Section, SectionTitle } from "@/components/marketing";
import { integrationMark, TRADEMARK_NOTE } from "@/lib/brands";
import { getSiteContent } from "@/lib/content/get";
import { DASHBOARD_SCREENS, type AppScreen, type DashboardScreen } from "@/lib/marketing";
import { comparisonFor, featureGroupsFor, integrationGroupsFor, numberWordFor, requirementsFor, screenAltFor, stepsFor } from "@/lib/marketing-lang";
import { siteMetadata } from "@/lib/seo";
import { APP_STORES } from "@/lib/stores";
import { formatList, formatMessage, messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";

/** 55 The Features, Integrations and How it works pages, in any language. */

const isDashboard = (screen: AppScreen | DashboardScreen): screen is DashboardScreen => (DASHBOARD_SCREENS as readonly string[]).includes(screen);

export function featuresMetadata(lang: Lang): Metadata {
  const m = messagesFor(lang).meta;
  return siteMetadata(lang, { title: m.featuresTitle, description: m.featuresDescription, path: "/features" });
}

export async function FeaturesPage({ lang }: { lang: Lang }) {
  const text = await getSiteContent("features", lang);
  const m = messagesFor(lang).features;
  const alt = screenAltFor(lang);
  const groups = featureGroupsFor(lang);
  return (
    <MarketingPage
      current="features"
      eyebrow={text.eyebrow}
      title={text.title!}
      intro={text.intro!}
      aside={<DeviceFrame screen="store-product" size="md" alt={alt["store-product"]} priority />}
      lang={lang}
    >
      <section aria-label={m.atGlance} className="bg-white">
        <div className="mx-auto max-w-[1160px] px-4 pt-12 sm:px-6">
          <nav aria-label={m.onThisPage} className="flex flex-wrap gap-2.5">
            {groups.map((group) => (
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
          <WorksWithStrip lang={lang} />
        </div>
      </section>

      {groups.map((group, index) => (
        <Section key={group.id} id={group.id} tinted={index % 2 === 0}>
          <SectionTitle title={group.title} text={group.text} />
          {group.screens.length ? (
            group.screens.every(isDashboard) ? (
              <div className="flex flex-col gap-5">
                {group.screens.filter(isDashboard).map((screen) => (
                  <BrowserFrame key={screen} screen={screen} path={DASHBOARD_PATHS[screen]} alt={alt[screen]} />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-6 sm:justify-start">
                {group.screens
                  .filter((s): s is AppScreen => !isDashboard(s))
                  .map((screen) => (
                    <DeviceFrame key={screen} screen={screen} size="sm" alt={alt[screen]} />
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
        <SectionTitle title={m.compareTitle} text={m.compareText} />
        <Comparison rows={comparisonFor(lang)} lang={lang} />
        <MoreLink href={localePath(lang, "/integrations")}>{m.seeSources}</MoreLink>
      </Section>
    </MarketingPage>
  );
}

export function integrationsMetadata(lang: Lang): Metadata {
  const m = messagesFor(lang).meta;
  return siteMetadata(lang, { title: m.integrationsTitle, description: m.integrationsDescription, path: "/integrations" });
}

export async function IntegrationsPage({ lang }: { lang: Lang }) {
  const text = await getSiteContent("integrations", lang);
  const m = messagesFor(lang);
  const t = m.integrations;
  return (
    <MarketingPage current="integrations" eyebrow={text.eyebrow} title={text.title!} intro={text.intro!} lang={lang}>
      {integrationGroupsFor(lang).map((group, index) => (
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
                    {item.label}
                  </h3>
                  <span className="flex flex-wrap gap-1.5" aria-label={formatMessage(lang, t.forTypes, { types: lang === "en" ? item.types.join(", ") : formatList(lang, item.types) })}>
                    {item.types.map((type) => (
                      <Chip key={type}>{type}</Chip>
                    ))}
                  </span>
                  <p className="m-0 text-[15px] leading-relaxed text-ink-4">{item.text}</p>
                  {item.docs ? (
                    <Link href={localePath(lang, item.docs)} className="mt-auto flex items-center gap-1 text-[15px] font-semibold">
                      {t.howToConnect}
                      <span className="sr-only"> {item.label}</span>
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
        <SectionTitle title={t.notListedTitle} text={t.notListedText} />
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <MoreLink href={localePath(lang, "/docs/my-own-api")}>{t.ownApi}</MoreLink>
          <MoreLink href={localePath(lang, "/docs/no-website")}>{t.noWebsite}</MoreLink>
        </div>
        <p className="m-0 text-xs text-muted">{lang === "en" ? TRADEMARK_NOTE : m.worksWith.trademarks}</p>
      </Section>
    </MarketingPage>
  );
}

export function howMetadata(lang: Lang): Metadata {
  const m = messagesFor(lang).meta;
  return siteMetadata(lang, { title: m.howTitle, description: formatMessage(lang, m.howDescription, { count: numberWordFor(lang, stepsFor(lang).length) }), path: "/how-it-works" });
}

export async function HowItWorksPage({ lang }: { lang: Lang }) {
  const text = await getSiteContent("how-it-works", lang);
  const m = messagesFor(lang);
  const t = m.how;
  const steps = stepsFor(lang);
  return (
    <MarketingPage current="how" eyebrow={text.eyebrow} title={text.title!} intro={text.intro!} lang={lang}>
      <Section>
        <ol className="m-0 flex list-none flex-col gap-5 p-0">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-wrap gap-5 rounded-2xl border border-line bg-white p-6 transition-colors duration-200 hover:border-line-strong sm:p-7">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-midnight text-lg font-extrabold text-white">{index + 1}</span>
              <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2.5">
                <h2 className="m-0 text-xl font-bold">{step.title}</h2>
                <p className="m-0 text-[15px] leading-relaxed text-ink-4">{step.text}</p>
                <CheckList items={step.details} />
                {/* 41 The last step ends on the stores. */}
                {index === steps.length - 1 ? <StoreMarks stores={[...APP_STORES]} label={m.footer.storesLabel} size={18} className="pt-1" /> : null}
              </div>
            </li>
          ))}
        </ol>
        {/* 103R Studio projects are made in Yallapp Studio; the rest of the way is the same. */}
        <div className="flex flex-wrap items-start gap-5 rounded-2xl bg-peach-soft p-6 sm:p-7" data-how-studio="">
          <FeatureIcon name="dashboard_customize" />
          <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2.5">
            <h2 className="m-0 text-xl font-bold">{m.studio.howTitle}</h2>
            <p className="m-0 text-[15px] leading-relaxed text-ink-4">{m.studio.howText}</p>
            <MoreLink href={localePath(lang, "/yallapp-studio")}>{m.studio.homeLink}</MoreLink>
          </div>
        </div>
      </Section>
      <Section tinted>
        <SectionTitle title={t.dashboardTitle} text={t.dashboardText} />
        <BrowserFrame screen="dashboard-setup" path={DASHBOARD_PATHS["dashboard-setup"]} alt={screenAltFor(lang)["dashboard-setup"]} />
        <MoreLink href={localePath(lang, "/docs/setup-steps")}>{t.setupSteps}</MoreLink>
      </Section>
      <Section>
        <SectionTitle title={t.needTitle} text={t.needText} />
        <ul className="m-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
          {requirementsFor(lang).map((item) => (
            <li key={item} className="flex gap-3 rounded-2xl border border-line bg-white p-5 text-[15px]">
              <Icon name="check_circle" size={22} className="text-success" />
              {item}
            </li>
          ))}
        </ul>
        <MoreLink href={localePath(lang, "/docs")}>{m.common.readDocs}</MoreLink>
      </Section>
    </MarketingPage>
  );
}
