import type { Metadata } from "next";
import Link from "next/link";
import { AccountLink } from "@/components/account-link";
import { WhatsAppMark } from "@/components/brand-marks";
import { BrowserFrame, DASHBOARD_PATHS, DeviceFrame } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { Chip, FeatureIcon, MarketingPage, MoreLink, Section, SectionTitle } from "@/components/marketing";
import { StudioDifferences, StudioPlans } from "@/components/studio-marketing";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { kindById } from "@/lib/app/kinds";
import { visitorPriceView } from "@/lib/billing/display";
import { getVisitorContact } from "@/lib/contact";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { planFor, screenAltFor, solutionsFor } from "@/lib/marketing-lang";
import { planOffered, STUDIO_PLANS } from "@/lib/plans";
import { siteMetadata } from "@/lib/seo";
import { messagesFor, type Lang } from "@/i18n";
import { Notice } from "@/components/ui";
import { STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { DemoAppSection, DemoSignIn, demoDownloads } from "@/site/demo";
import { localePath } from "@/i18n/paths";

export function studioMetadata(lang: Lang): Metadata {
  const m = messagesFor(lang).studio;
  return siteMetadata(lang, { title: m.metaTitle, description: m.metaDescription, path: "/yallapp-studio" });
}

export function studioDemoMetadata(lang: Lang): Metadata {
  const m = messagesFor(lang).studio;
  return siteMetadata(lang, { title: m.demoMetaTitle, description: m.demoMetaDescription, path: "/demo/studio" });
}

const primary = "flex h-[50px] items-center gap-2.5 rounded-xl bg-midnight px-[22px] text-base font-bold text-white no-underline hover:bg-ink-3 hover:text-white";
const secondary = "flex h-[50px] items-center gap-2 rounded-xl border border-line-button bg-white px-[22px] text-base font-semibold text-midnight no-underline hover:border-midnight hover:text-midnight";

/** The Studio plans the team offers, in the page's language, and the visitor's price view. */
async function studioPlans(lang: Lang) {
  const store = await getStore();
  const [all, view] = await Promise.all([effectivePlans(store), visitorPriceView(store)]);
  return { plans: STUDIO_PLANS.map((id) => all[id]).filter(planOffered).map((plan) => planFor(lang, plan)), view };
}

/**
 * 103R /yallapp-studio: Yallapp Studio, the space in a client's account for
 * projects designed freely in the Studio editor, with project types only
 * Studio makes (104 delivery companies; 105 food delivery once it's there),
 * how it differs from regular apps, and its own plans.
 */
export async function StudioPage({ lang }: { lang: Lang }) {
  const [contact, { plans, view }] = await Promise.all([getVisitorContact(), studioPlans(lang)]);
  const m = messagesFor(lang).studio;
  const alt = screenAltFor(lang);
  const lp = (path: string) => localePath(lang, path);
  const elements: { icon: IconName; text: string }[] = [
    { icon: "view_agenda", text: m.el1 },
    { icon: "photo_library", text: m.el2 },
    { icon: "view_carousel", text: m.el3 },
    { icon: "widgets", text: m.el4 },
    { icon: "dark_mode", text: m.el5 },
    { icon: "touch_app", text: m.el6 },
    { icon: "dashboard_customize", text: m.el7 },
    { icon: "layers", text: m.el8 },
  ];
  const onlyStudio: { icon: IconName; title: string; text: string; screen?: "delivery-courier" }[] = [
    { icon: "local_shipping", title: m.deliveryTitle, text: m.deliveryText, screen: "delivery-courier" },
    // 105 Food delivery, once the kind is there.
    ...(kindById("food") ? [{ icon: "restaurant" as IconName, title: m.foodTitle, text: m.foodText }] : []),
  ];
  return (
    <MarketingPage
      current="studio"
      eyebrow={m.eyebrow}
      title={m.title}
      intro={m.intro}
      aside={<DeviceFrame screen="studio-cafe-home" size="md" alt={alt["studio-cafe-home"]} priority />}
      lang={lang}
    >
      <Section>
        <div className="flex flex-wrap gap-3">
          <AccountLink href={lp("/sign-up")} signedInHref="/studio/new" signedIn={m.start} className={primary}>
            <Icon name="dashboard_customize" size={20} />
            {m.start}
          </AccountLink>
          <Link href={lp("/demo/studio")} className={secondary}>
            {m.seeDemo}
            <Icon name="arrow_forward" size={20} />
          </Link>
        </div>
        <SectionTitle title={m.editorTitle} text={m.editorText} />
        <BrowserFrame screen="studio-editor" path={DASHBOARD_PATHS["studio-editor"]} alt={alt["studio-editor"]} />
        <div className="flex flex-col gap-5">
          <h3 className="m-0 text-xl font-bold">{m.elementsTitle}</h3>
          <ul className="m-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr))]">
            {elements.map((el) => (
              <li key={el.text} className="flex items-center gap-3.5 rounded-2xl border border-line bg-white p-4 text-[15px] font-semibold">
                <FeatureIcon name={el.icon} />
                {el.text}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section tinted id="apps">
        <SectionTitle title={m.appsTitle} text={m.appsText} />
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-8">
          {(["studio-cafe-home", "studio-cafe-home-dark", "delivery-send", "delivery-shipment", "delivery-courier"] as const).map((screen) => (
            <DeviceFrame key={screen} screen={screen} size="sm" alt={alt[screen]} />
          ))}
        </div>
        <MoreLink href={lp("/demo/studio")}>{m.seeDemo}</MoreLink>
      </Section>

      <Section id="kinds">
        <SectionTitle title={m.kindsTitle} text={m.kindsText} />
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr))]">
          {onlyStudio.map((kind) => (
            <div key={kind.title} className="flex flex-wrap gap-6 rounded-[20px] border border-line bg-white p-6 sm:p-7" data-studio-only="">
              <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-3">
                <span className="flex items-center gap-1.5 self-start rounded-full bg-midnight px-3 py-1 text-xs font-bold text-white">
                  <Icon name="star" size={14} filled className="text-ember" />
                  {m.onlyStudio}
                </span>
                <span className="flex items-center gap-3">
                  <FeatureIcon name={kind.icon} />
                  <h3 className="m-0 text-xl font-bold">{kind.title}</h3>
                </span>
                <p className="m-0 text-[15px] leading-relaxed text-ink-4">{kind.text}</p>
              </div>
              {kind.screen ? <DeviceFrame screen={kind.screen} size="xs" alt={alt[kind.screen]} className="mx-auto" /> : null}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="m-0 text-lg font-bold">{m.everyKind}</h3>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {solutionsFor(lang).map((s) => (
              <li key={s.id}>
                <Link href={lp(`/solutions/${s.id}`)} className="no-underline">
                  <Chip>
                    <Icon name={s.icon} size={16} className="me-1.5" />
                    {s.name}
                  </Chip>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section tinted id="differences">
        <SectionTitle title={m.diffTitle} text={m.diffText} />
        <StudioDifferences lang={lang} />
      </Section>

      <Section id="plans">
        <SectionTitle eyebrow={m.studio} title={m.plansTitle} text={m.plansText} />
        <StudioPlans lang={lang} plans={plans} view={view} contact={contact} />
        <MoreLink href={lp("/pricing")}>{m.allPlans}</MoreLink>
      </Section>
    </MarketingPage>
  );
}

/**
 * 103R /demo/studio: what a Studio project looks like, apart from the regular
 * demo apps on /demo: Studio's own project types as demo apps to install
 * and try with the demo number (a parcel company, food delivery, rides;
 * 110.5 a live taxi app, a school and an academy with many teachers),
 * then a café's home page designed in the editor (light and dark) and the
 * editor.
 */
export async function StudioDemoPage({ lang, download }: { lang: Lang; download?: string | string[] }) {
  const [contact, ready] = await Promise.all([getVisitorContact(), demoDownloads()]);
  const demo = messagesFor(lang).demo;
  const m = messagesFor(lang).studio;
  const alt = screenAltFor(lang);
  const lp = (path: string) => localePath(lang, path);
  return (
    <MarketingPage
      current="demo"
      eyebrow={m.demoEyebrow}
      title={m.demoTitle}
      intro={m.demoIntro}
      aside={<DeviceFrame screen="studio-cafe-home-dark" size="md" alt={alt["studio-cafe-home-dark"]} priority />}
      lang={lang}
    >
      {/* Studio's own project types, as apps to install and try with the demo number. */}
      <Section>
        {download === "unavailable" ? (
          <Notice tone="warn" icon="info" role="status">
            {demo.unavailable}
          </Notice>
        ) : null}
        <DemoSignIn lang={lang} />
      </Section>
      {STUDIO_DEMO_TYPES.map((type, index) => (
        <DemoAppSection key={type} type={type} lang={lang} ready={ready[type] ?? false} tinted={index % 2 === 0} />
      ))}

      <Section id="cafe">
        <div className="flex flex-wrap items-center gap-10" role="group" aria-labelledby="h-cafe">
          <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-3">
            <span className="flex items-center gap-2 text-[13px] font-bold tracking-[1px] text-accent uppercase">
              <Icon name="restaurant" size={20} />
              {m.studio}
            </span>
            <h2 id="h-cafe" className="m-0 text-[28px] font-extrabold tracking-[-0.5px] sm:text-[34px]">
              {m.demoCafeTitle}
            </h2>
            <p className="m-0 text-[17px] leading-relaxed text-ink-4">{m.demoCafeText}</p>
          </div>
          <div className="flex min-w-0 flex-[1_1_320px] flex-wrap justify-center gap-5">
            <DeviceFrame screen="studio-cafe-home" size="sm" alt={alt["studio-cafe-home"]} />
            <DeviceFrame screen="studio-cafe-home-dark" size="sm" alt={alt["studio-cafe-home-dark"]} />
          </div>
        </div>
      </Section>

      <Section tinted id="editor">
        <SectionTitle title={m.demoEditorTitle} text={m.demoEditorText} />
        <BrowserFrame screen="studio-editor" path={DASHBOARD_PATHS["studio-editor"]} alt={alt["studio-editor"]} />
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
          <BrowserFrame screen="studio-home" path={DASHBOARD_PATHS["studio-home"]} alt={alt["studio-home"]} />
          <BrowserFrame screen="studio-project" path={DASHBOARD_PATHS["studio-project"]} alt={alt["studio-project"]} />
        </div>
      </Section>

      <Section>
        <SectionTitle title={m.demoTryTitle} text={m.demoTryText} />
        <div className="flex flex-wrap gap-3">
          <AccountLink href={lp("/sign-up")} signedInHref="/studio/new" signedIn={m.start} className={primary}>
            <Icon name="dashboard_customize" size={20} />
            {m.start}
          </AccountLink>
          <WhatsAppLink lines={contact.lines} country={contact.country} className={secondary}>
            <WhatsAppMark size={20} />
            {messagesFor(lang).common.talkWhatsApp}
          </WhatsAppLink>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <MoreLink href={lp("/yallapp-studio")}>{m.homeLink}</MoreLink>
          <MoreLink href={lp("/demo")}>{m.regularDemos}</MoreLink>
        </div>
      </Section>
    </MarketingPage>
  );
}
