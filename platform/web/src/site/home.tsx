import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { planOffered, REGULAR_PLANS, STUDIO_PLANS } from "@/lib/plans";
import { StudioPlans } from "@/components/studio-marketing";
import { BrowserFrame, DASHBOARD_PATHS, DeviceFrame } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import { JsonLdScript } from "@/components/json-ld";
import { StoreMarks, WhatsAppMark, WorksWithStrip } from "@/components/brand-marks";
import { Chip, Comparison, ContactBand, FeatureIcon, MoreLink, Section, SectionTitle } from "@/components/marketing";
import { currencyNote, PlanCards } from "@/components/plan-cards";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { HomeReviews } from "@/components/home-reviews";
import { APP_STORES } from "@/lib/stores";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { visitorPriceView } from "@/lib/billing/display";
import { getVisitorContact } from "@/lib/contact";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { getSiteContent } from "@/lib/content/get";
import { contentPage, titleWithWords } from "@/lib/content/site";
import { translatedDefaults } from "@/lib/content/site-lang";
import { DEMO_BRANDS } from "@/lib/demo/content";
import type { AppScreen } from "@/lib/marketing";
import { allSolutionsFor, comparisonFor, featureGroupsFor, integrationGroupsFor, numberWordFor, planFor, screenAltFor, solutionsFor, stepsFor } from "@/lib/marketing-lang";
import { DEFAULT_DESCRIPTION, organizationLd, siteMetadata, siteUrl, softwareLd, websiteLd } from "@/lib/seo";
import { formatMessage, messagesFor, type Lang } from "@/i18n";
import { LANG_INFO } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";
import { StoryEffects } from "./story/effects";
import { HeroStage, RotatingWord, type HeroNotice } from "./home-motion";

/**
 * The hero's fan of real screens, from the start side to the end side: where
 * each phone sits (px, for a 236 px phone: the fan scales with its phones'
 * size, globals.css) and leans (deg).
 */
const FAN_PHONE = 236;
const fanUnit = (px: number) => Number((px / FAN_PHONE).toFixed(4));
const FAN: { screen: AppScreen; x: number; y: number; z: number; r: number }[] = [
  { screen: "taxi-map", x: -230, y: 40, z: -160, r: -11 },
  { screen: "school-today", x: -115, y: 10, z: -60, r: -5 },
  { screen: "zad-home", x: 0, y: -14, z: 60, r: 0 },
  { screen: "store-home", x: 115, y: 10, z: -60, r: 5 },
  { screen: "academy-home", x: 230, y: 40, z: -160, r: 11 },
];

/** The notices the hero's cards take turns showing: the demos' own apps (their names and colours), and "your store". */
function heroNotices(lang: Lang): HeroNotice[] {
  const n = messagesFor(lang).home.notices;
  const { marketplace: zad, school, taxi, instructors: rawaq } = DEMO_BRANDS;
  return [
    { app: zad.appName, text: n.zad, color: "var(--color-peach)", ink: "var(--color-accent)", mark: zad.appName.charAt(0) },
    { app: school.appName, text: n.school, color: "var(--color-peach)", ink: "var(--color-accent)", mark: school.appName.charAt(0) },
    { app: taxi.appName, text: n.taxi, color: "var(--color-peach)", ink: "var(--color-accent)", mark: taxi.appName.charAt(0) },
    { app: n.yourStore, text: n.store, color: "var(--color-peach)", ink: "var(--color-accent)", mark: { icon: "storefront" } },
    { app: rawaq.appName, text: n.academy, color: "var(--color-peach)", ink: "var(--color-accent)", mark: rawaq.appName.charAt(0) },
  ];
}

export function homeMetadata(lang: Lang): Metadata {
  return siteMetadata(lang, { description: lang === "en" ? DEFAULT_DESCRIPTION : messagesFor(lang).meta.defaultDescription, path: "/" });
}

/** The landing page (32, 41, 52, 54), in any language (55). */
export async function HomePage({ lang }: { lang: Lang }) {
  const contact = await getVisitorContact();
  // 32 The same plans as the pricing page.
  const store = await getStore();
  // 52 Prices in the visitor's currency: pounds in Egypt, dollars elsewhere.
  const [all, view] = await Promise.all([effectivePlans(store), visitorPriceView(store)]);
  const plans = REGULAR_PLANS.map((id) => planFor(lang, all[id]));
  // 103R Yallapp Studio's own plans under the regular ones: the ones the team offers.
  const studioPlans = STUDIO_PLANS.map((id) => all[id]).filter(planOffered).map((plan) => planFor(lang, plan));
  const base = siteUrl();
  const text = await getSiteContent("home", lang);
  // The words take turns only in the title they were written for: the default title, or one edited with its words.
  const page = contentPage("home")!;
  const defaults = lang === "en" ? page.defaults : { ...page.defaults, ...translatedDefaults(page, lang) };
  const titleParts = text.title === defaults.title || text.titleWords !== defaults.titleWords ? titleWithWords(text.title!, text.titleWords ?? "") : null;
  const notices = heroNotices(lang);
  const kinds = allSolutionsFor(lang).map((kind) => kind.name);
  const side = LANG_INFO[lang].dir === "rtl" ? -1 : 1;
  const m = messagesFor(lang);
  const h = m.home;
  const s = m.studio;
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
    <div className="bg-white" data-home="">
      <SiteHeader current="home" lang={lang} />
      <JsonLdScript
        data={[
          organizationLd(base, { email: contact.email, whatsapp: contact.lines.international.display, whatsappEgypt: contact.lines.egypt.display }),
          websiteLd(base, lang),
          softwareLd(base, plans, view, lang === "en" ? undefined : lang),
        ]}
      />
      <main>
        {/* The hero: a stage in the site's theme (Ivory light, Midnight dark), the title with its turning word, and a fan of real app screens (home-motion.tsx, globals.css). */}
        <section aria-labelledby="hero-title" className="hero relative isolate overflow-clip bg-ivory text-midnight" data-hero="">
          <span aria-hidden="true" className="hero-glow" />
          <span aria-hidden="true" className="hero-grid" />
          <span aria-hidden="true" className="hero-grain" />
          <div className="mx-auto grid max-w-[1200px] items-center gap-x-10 gap-y-6 px-4 pt-14 sm:px-6 sm:pt-[88px] min-[900px]:grid-cols-[1.02fr_1fr]">
            <div className="hero-copy flex min-w-0 flex-col gap-[22px]">
              <span className="flex min-h-[34px] items-center gap-2.5 self-start rounded-full border border-line bg-white py-1.5 ps-1.5 pe-3.5 text-[13px] font-semibold text-midnight">
                <span aria-hidden="true" className="hero-ping relative h-[22px] w-[22px] flex-none rounded-full bg-ember" />
                {text.badge}
              </span>
              <h1
                id="hero-title"
                className="hero-title m-0 font-extrabold text-balance text-midnight"
                style={titleParts ? ({ "--hero-chars": Math.max(...titleParts.words.map((w) => w.length), 10) } as CSSProperties) : undefined}
              >
                {titleParts ? (
                  <>
                    <span className="sr-only">{text.title}</span>
                    <span aria-hidden="true">
                      {titleParts.lead} <RotatingWord words={titleParts.words} />
                      <span className="block">{titleParts.rest}</span>
                    </span>
                  </>
                ) : (
                  text.title
                )}
              </h1>
              <p className="m-0 max-w-[34em] text-[17px] leading-[1.7] text-ink-4 sm:text-[19px]">{text.intro}</p>
              <div className="flex flex-wrap gap-3">
                <WhatsAppLink
                  lines={contact.lines}
                  country={contact.country}
                  className="hero-cta flex h-[54px] items-center gap-2.5 rounded-[14px] bg-ember px-6 text-base font-bold text-midnight no-underline shadow-[0_18px_40px_-16px_rgba(255,90,31,0.8)] transition-transform hover:-translate-y-px hover:text-midnight"
                >
                  <WhatsAppMark size={20} />
                  {text.primaryCta}
                </WhatsAppLink>
                <Link
                  href={lp("/how-it-works")}
                  className="flex h-[54px] items-center gap-2 rounded-[14px] border border-line-button bg-white px-6 text-base font-semibold text-midnight no-underline transition-[translate,border-color] hover:-translate-y-px hover:border-midnight hover:text-midnight"
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
            </div>
            <HeroStage notices={notices} label={h.appsGroup}>
              {FAN.map((phone, index) => (
                <div
                  key={phone.screen}
                  className="hero-phone"
                  data-centre={phone.x === 0 ? "" : undefined}
                  style={{ "--x": fanUnit(phone.x * side), "--y": fanUnit(phone.y), "--z": fanUnit(phone.z), "--r": `${phone.r * side}deg`, "--i": index } as CSSProperties}
                >
                  <DeviceFrame screen={phone.screen} alt={alt[phone.screen]} priority={phone.x === 0} />
                </div>
              ))}
            </HeroStage>
          </div>
          {/* The kinds of apps, running under the hero (55 the other way in Arabic; still and wrapped with less motion). */}
          <div className="hero-ticker marquee mt-10 sm:mt-14" style={{ "--marquee-duration": `${kinds.length * 3}s` } as CSSProperties}>
            <div className="marquee-track">
              <ul aria-label={h.kindsLabel} className="marquee-list hero-kinds">
                {kinds.map((kind) => (
                  <li key={kind}>{kind}</li>
                ))}
              </ul>
              <ul aria-hidden="true" className="marquee-list hero-kinds">
                {kinds.map((kind) => (
                  <li key={kind}>{kind}</li>
                ))}
              </ul>
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
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr))]" data-reveal-group="">
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

        {/* 103R Yallapp Studio, apart from the regular apps, with its own page, demo and plans. */}
        <section aria-labelledby="studio-title" className="on-dark overflow-clip bg-night-2 text-white" data-home-studio="">
          <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-x-12 gap-y-12 px-4 py-16 sm:px-6 sm:py-24">
            <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-5">
              <span className="flex items-center gap-2 self-start rounded-full bg-ember px-3 py-1 text-[12px] font-bold tracking-[0.5px] text-white uppercase">
                <Icon name="dashboard_customize" size={16} />
                {s.homeBadge}
              </span>
              <h2 id="studio-title" className="m-0 text-[30px] leading-[1.1] font-extrabold tracking-[-0.8px] text-balance sm:text-[40px] sm:tracking-[-1px]">
                {s.homeTitle}
              </h2>
              <p className="m-0 text-[17px] leading-relaxed text-night-text sm:text-lg">{s.homeText}</p>
              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  href={lp("/yallapp-studio")}
                  className="flex h-[50px] items-center gap-2 rounded-xl bg-ivory px-[22px] text-base font-bold text-midnight no-underline hover:bg-white hover:text-midnight"
                >
                  {s.homeLink}
                  <Icon name="arrow_forward" size={20} />
                </Link>
                <Link
                  href={lp("/demo/studio")}
                  className="flex h-[50px] items-center rounded-xl border border-night-line px-[22px] text-base font-semibold text-white no-underline hover:border-ivory hover:text-white"
                >
                  {s.seeDemo}
                </Link>
              </div>
            </div>
            <div className="relative flex min-w-0 flex-[1_1_520px] items-end justify-center">
              <div className="w-full" data-parallax="0.025" style={{ translate: "0 var(--py, 0px)" }}>
                <BrowserFrame screen="studio-editor" path={DASHBOARD_PATHS["studio-editor"]} alt={alt["studio-editor"]} className="w-full" />
              </div>
              <div className="absolute -bottom-6 end-[-8px] hidden sm:flex" data-parallax="-0.05" style={{ translate: "0 var(--py, 0px)" }}>
                <DeviceFrame screen="studio-cafe-home" size="xs" alt={alt["studio-cafe-home"]} className="story-float" />
              </div>
            </div>
          </div>
        </section>

        <Section>
          <SectionTitle title={text.featuresTitle!} text={text.featuresText} />
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]" data-reveal-group="">
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
            <div className="home-looks flex flex-wrap justify-center gap-x-5 gap-y-8">
              {looks.map((look) => (
                <DeviceFrame key={look.screen} screen={look.screen} size="xs" caption={look.caption} alt={alt[look.screen]} className="story-float" />
              ))}
            </div>
          </div>
          <MoreLink href={lp("/features")}>{h.seeAllFeatures}</MoreLink>
        </Section>

        <Section tinted>
          <SectionTitle title={text.integrationsTitle!} text={text.integrationsText} />
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]" data-reveal-group="">
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
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]" data-reveal-group="">
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
          {/* The plans' limits count up as they come into view (StoryEffects). */}
          <div data-reveal="">
            <PlanCards plans={plans} view={view} headingLevel={3} lang={lang} />
          </div>
          <p data-currency-note="" className="m-0 text-[15px] text-ink-4">
            {currencyNote(view, lang)}
          </p>
          <MoreLink href={lp("/pricing")}>{h.compareFeatures}</MoreLink>
        </Section>

        <Section id="studio-plans">
          <SectionTitle eyebrow={s.studio} title={s.plansTitle} text={s.plansText} />
          <StudioPlans lang={lang} plans={studioPlans} view={view} contact={contact} />
          <MoreLink href={lp("/yallapp-studio")}>{s.homeLink}</MoreLink>
        </Section>

        {/* Customer reviews, only real ones from Admin › Reviews; nothing without any. */}
        <HomeReviews lang={lang} />

        <ContactBand lang={lang} />
      </main>
      <SiteFooter full lang={lang} />
      <StoryEffects root="[data-home]" />
    </div>
  );
}
