import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AccountLink } from "@/components/account-link";
import { CopyButton } from "@/components/copy-button";
import { PhoneFrame } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import { JsonLdScript } from "@/components/json-ld";
import { ContactBand } from "@/components/marketing";
import { currencyNote, planLimitLinesFor, planPriceFor, planStoresLineFor, storageText } from "@/components/plan-cards";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { blackFridayCopyFor } from "@/content/occasions";
import { formatMoney } from "@/lib/billing/prices";
import { visitorPriceView } from "@/lib/billing/display";
import { getVisitorContact, type Contact } from "@/lib/contact";
import { getStore } from "@/lib/data";
import type { OccasionRecord, PaymentProviderId } from "@/lib/data/types";
import { effectivePlans } from "@/lib/entitlements";
import { STUDIO_SOLUTIONS, type AppScreen } from "@/lib/marketing";
import { allSolutionsFor, planFor, screenAltFor } from "@/lib/marketing-lang";
import { FEATURED_PLAN, hasFeature, planOffered, REGULAR_PLANS, STUDIO_PLANS, type PlanInfo, type PriceView } from "@/lib/plans";
import { breadcrumbLd, faqLd, siteMetadata, siteUrl, type JsonLd } from "@/lib/seo";
import { yallappBilling } from "@/lib/settings/platform";
import { formatMessage, messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { Countdown, Tabs } from "./client";
import { blackFridayOccasion } from "./load";
import { occasionPlanPrice, occasionValues, occasionView, percentText, savedText, type OccasionPlanPrice, type OccasionView } from "./offer";
import { FAQ_COUNT, HERO_SCREENS, INCLUDED_GROUPS, STEP_ICONS, TERM_ICONS } from "./shape";
import { BLACK_FRIDAY_PATH, type OccasionText } from "./types";

/**
 * 124 Black Friday's page, /black-friday in every language: an offer page
 * to use, not a story. The offer (its percentage, days, code and plans)
 * is the one the team saved in Admin › Occasions; the prices are the
 * plans' as the team set them, in the visitor's currency, with the offer
 * worked out as the payment form does (./offer.ts). Upcoming: a countdown
 * to the start, without the code (a code typed before the first day is
 * refused). Over or turned off: the page still explains everything, at
 * the normal prices, without the code or a countdown.
 */

const primary =
  "inline-flex h-[52px] items-center gap-2.5 rounded-2xl bg-[#FF5A1F] px-6 text-base font-bold text-[#0e0d24] no-underline shadow-[0_12px_30px_-12px_#FF5A1F] transition-transform hover:-translate-y-0.5 hover:text-[#0e0d24] motion-reduce:transition-none motion-reduce:hover:translate-y-0";
const ghost = "inline-flex h-[52px] items-center gap-2 rounded-2xl border border-white/25 px-6 text-base font-semibold text-white no-underline hover:border-white hover:text-white";

type Fill = (text: string, extra?: Record<string, string>) => string;

function filler(lang: Lang, occasion: OccasionRecord): Fill {
  const values = occasionValues(lang, occasion);
  return (text, extra = {}) => formatMessage(lang, text, { ...values, ...extra });
}

/** The plans' line of the terms and the FAQ, by the occasion's plans. */
function plansLine(occasion: OccasionRecord, words: { plansAll: string; plansRegular: string; plansStudio: string }): string {
  return occasion.plans === "regular" ? words.plansRegular : occasion.plans === "studio" ? words.plansStudio : words.plansAll;
}

/**
 * The page's questions and answers, with the occasion's numbers in them (the page and its FAQPage data).
 * Once the offer is over, the ones that name its code are left out: the code no longer works.
 */
export function blackFridayFaq(lang: Lang, occasion: OccasionRecord, on = true): { q: string; a: string }[] {
  const t = blackFridayCopyFor(lang);
  const fill = filler(lang, occasion);
  const plansAnswer = fill(plansLine(occasion, t.faq));
  return t.faq.items
    .slice(0, FAQ_COUNT)
    .filter((item) => on || !`${item.q} ${item.a}`.includes("{code}"))
    .map((item) => ({ q: fill(item.q), a: fill(item.a, { plansAnswer }) }));
}

export async function blackFridayMetadata(lang: Lang, now: Date = new Date()): Promise<Metadata> {
  const view = occasionView(await blackFridayOccasion(now), now);
  const t = blackFridayCopyFor(lang);
  const fill = filler(lang, view.occasion);
  const title = fill(view.on ? t.meta.title : t.meta.titleOver);
  const description = fill(view.state === "live" ? t.meta.description : view.state === "upcoming" ? t.meta.descriptionUpcoming : t.meta.descriptionOver);
  return siteMetadata(lang, { title, description, path: BLACK_FRIDAY_PATH, image: `${BLACK_FRIDAY_PATH}/opengraph-image` });
}

/**
 * The offer as structured data, while it's on or about to start: one
 * schema.org Offer per plan in it with its price with the code (in the
 * page's currency), from the first moment to the last; none once it's over.
 */
export function blackFridayOfferLd(base: string, lang: Lang, view: OccasionView, prices: OccasionPlanPrice[]): JsonLd[] {
  if (!view.on) return [];
  const t = blackFridayCopyFor(lang);
  const fill = filler(lang, view.occasion);
  const url = `${base}${localePath(lang, BLACK_FRIDAY_PATH)}`;
  const shared = {
    "@context": "https://schema.org",
    "@type": "Offer",
    url,
    category: "subscription",
    validFrom: view.start.toISOString(),
    validThrough: view.end.toISOString(),
    availability: view.state === "live" ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
    seller: { "@id": `${base}/#organization` },
  };
  const priced = prices.filter((p) => p.offer);
  if (!priced.length) return [{ ...shared, name: fill(t.og.title), description: fill(t.meta.description) }];
  return priced.map((p) => ({
    ...shared,
    name: `${p.plan.name}: ${fill(t.og.title)}`,
    description: fill(t.meta.description),
    price: (p.offer!.cents / 100).toFixed(2),
    priceCurrency: p.offer!.currency,
    priceValidUntil: view.occasion.endsOn,
    itemOffered: { "@type": "Service", name: `Yallapp ${p.plan.name}`, serviceType: "Mobile app builder subscription" },
  }));
}

/** A real screen of the app in the site's phone frame. */
function Phone({ screen, alt, className = "", priority = false, sizes = "(max-width: 640px) 45vw, 240px" }: { screen: AppScreen; alt: string; className?: string; priority?: boolean; sizes?: string }) {
  return (
    <PhoneFrame className={className} data-screen={screen}>
      <Image src={`/screens/${screen}.png`} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </PhoneFrame>
  );
}

function SectionHead({ id, eyebrow, title, text, dark = false }: { id: string; eyebrow?: string; title: string; text?: string; dark?: boolean }) {
  return (
    <div className="flex max-w-[760px] flex-col gap-3">
      {eyebrow ? <span className={`text-[13px] font-bold tracking-[1px] uppercase ${dark ? "text-[#FF8A5B]" : "text-accent"}`}>{eyebrow}</span> : null}
      <h2 id={id} className="m-0 text-[30px] leading-[1.1] font-extrabold tracking-[-0.8px] text-balance sm:text-[44px] sm:tracking-[-1.2px]">
        {title}
      </h2>
      {text ? <p className={`m-0 text-[17px] leading-relaxed sm:text-lg ${dark ? "text-white/80" : "text-ink-4"}`}>{text}</p> : null}
    </div>
  );
}

function StartLink({ lang, t, className, signedInHref = "/start" }: { lang: Lang; t: OccasionText; className: string; signedInHref?: string }) {
  return (
    <AccountLink href={localePath(lang, "/sign-up")} signedInHref={signedInHref} signedIn={t.hero.startSignedIn} className={className}>
      <Icon name="rocket_launch" size={20} />
      {t.hero.start}
    </AccountLink>
  );
}

function Hero({ lang, t, view, fill, serverNow }: { lang: Lang; t: OccasionText; view: OccasionView; fill: Fill; serverNow: Date }) {
  const alt = screenAltFor(lang);
  const percent = percentText(lang, view.occasion.percent);
  const offWhat = view.occasion.plans === "regular" ? t.hero.offRegular : view.occasion.plans === "studio" ? t.hero.offStudio : t.hero.offAll;
  const offWord = (
    <span key="off" className="text-[34px] leading-none font-extrabold tracking-[-1px] text-white sm:text-[56px]">
      {t.hero.off}
    </span>
  );
  const bigPercent = (
    <span key="percent" dir="ltr" className="text-[96px] leading-[0.85] font-extrabold tracking-[-4px] text-[#FF5A1F] tabular-nums sm:text-[160px] sm:tracking-[-7px]">
      {percent}
    </span>
  );
  return (
    <section className="on-dark relative isolate overflow-hidden bg-[#0b0a1f] text-white" aria-labelledby="bf-title" data-occasion-state={view.state}>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(60%_70%_at_85%_15%,rgba(255,90,31,0.35),transparent_70%),radial-gradient(50%_60%_at_5%_95%,rgba(76,63,209,0.35),transparent_70%)]" />
      <div className="mx-auto flex max-w-[1240px] flex-col gap-12 px-4 pt-14 pb-20 sm:px-6 md:flex-row md:items-center md:gap-8 md:pt-20">
        <div className="flex min-w-0 flex-[1_1_58%] flex-col gap-6">
          <span className="flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[13px] font-bold">
            <Icon name="local_offer" size={18} className="text-[#FF5A1F]" />
            {fill(t.hero.eyebrow)}
          </span>
          <h1 id="bf-title" className="m-0 flex flex-col gap-3">
            <span className="text-[44px] leading-[1.02] font-extrabold tracking-[-1.5px] sm:text-[72px] sm:tracking-[-2.4px]">{t.hero.title}</span>
            {view.on ? (
              <>
                <span className="flex flex-wrap items-end gap-x-4 gap-y-1">{t.hero.offBefore ? [offWord, bigPercent] : [bigPercent, offWord]}</span>
                <span className="max-w-[620px] text-[20px] leading-snug font-bold text-white/90 sm:text-[26px]">{offWhat}</span>
              </>
            ) : (
              <span className="text-[30px] leading-tight font-extrabold text-[#FF8A5B] sm:text-[44px]">{t.hero.overTitle}</span>
            )}
          </h1>
          <p className="m-0 max-w-[620px] text-lg leading-relaxed text-white/85 sm:text-xl">
            {fill(view.state === "live" ? t.hero.lead : view.state === "upcoming" ? t.hero.leadUpcoming : t.hero.overText)}
          </p>
          <p className="m-0 flex items-center gap-2 text-[15px] font-semibold text-white/85">
            <Icon name="calendar_month" size={20} className="text-[#FF5A1F]" />
            {fill(t.hero.days)}
          </p>
          {view.on ? (
            <Countdown
              lang={lang}
              to={(view.state === "live" ? new Date(view.end.getTime() + 1) : view.start).toISOString()}
              serverNow={serverNow.toISOString()}
              words={{ heading: view.state === "live" ? t.countdown.endsIn : t.countdown.startsIn, days: t.countdown.days, hours: t.countdown.hours, minutes: t.countdown.minutes, seconds: t.countdown.seconds, label: t.countdown.label }}
            />
          ) : null}
          {view.codeShown ? (
            <div className="flex max-w-[520px] flex-col gap-3 rounded-2xl border-2 border-dashed border-[#FF5A1F]/70 bg-white/5 p-4" data-coupon-code={view.occasion.couponCode}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-[12px] font-bold tracking-[0.8px] text-white/70 uppercase">{t.hero.codeLabel}</span>
                  <span dir="ltr" className="font-mono text-[24px] font-extrabold tracking-[2px] break-all sm:text-[28px]">
                    {view.occasion.couponCode}
                  </span>
                </span>
                <CopyButton value={view.occasion.couponCode} label={t.hero.copy} copiedLabel={t.hero.copied} />
              </div>
              {view.state === "upcoming" ? (
                <p className="m-0 flex items-center gap-2 text-[14px] text-white/85" data-code-from="">
                  <Icon name="schedule" size={18} className="flex-none text-[#FF5A1F]" />
                  {fill(t.hero.codeSoon)}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3 pt-1">
            <StartLink lang={lang} t={t} className={primary} />
            {view.on ? (
              <a href="#plans" className={ghost}>
                {t.hero.seePlans}
                <Icon name="arrow_downward" size={20} />
              </a>
            ) : (
              <Link href={localePath(lang, "/pricing")} className={ghost}>
                {t.hero.seePricing}
                <Icon name="arrow_forward" size={20} />
              </Link>
            )}
          </div>
        </div>
        <figure className="m-0 flex min-w-0 flex-[1_1_42%] flex-col items-center gap-4">
          <div className="relative h-[400px] w-[300px] sm:h-[540px] sm:w-[420px]">
            <div className="absolute start-0 top-10 w-[150px] -rotate-[5deg] opacity-90 sm:w-[200px]">
              <Phone screen={HERO_SCREENS[1]} alt={alt[HERO_SCREENS[1]]} className="w-full" />
            </div>
            <div className="absolute end-0 top-14 w-[150px] rotate-[5deg] opacity-90 sm:w-[200px]">
              <Phone screen={HERO_SCREENS[2]} alt={alt[HERO_SCREENS[2]]} className="w-full" />
            </div>
            <div className="absolute start-1/2 top-0 w-[176px] -translate-x-1/2 drop-shadow-[0_40px_60px_rgba(0,0,0,0.6)] sm:w-[232px] rtl:translate-x-1/2">
              <Phone screen={HERO_SCREENS[0]} alt={alt[HERO_SCREENS[0]]} className="w-full" priority />
            </div>
          </div>
          <figcaption className="text-[13px] text-white/65">{t.hero.screensNote}</figcaption>
        </figure>
      </div>
    </section>
  );
}

function PlanCard({ lang, t, plan, price, on, family, percent }: { lang: Lang; t: OccasionText; plan: PlanInfo; price: OccasionPlanPrice | null; on: boolean; family: "regular" | "studio"; percent: number }) {
  const m = messagesFor(lang).plans;
  const shown = planPriceFor(lang, plan, { display: price?.full.currency ?? "EGP", egpPerUsd: null });
  const periodWord = price ? (price.period === "month" ? m.month : m.year) : null;
  const per = periodWord ? formatMessage(lang, t.plans.period, { period: periodWord }) : null;
  const saved = price ? savedText(price) : null;
  const featured = plan.id === FEATURED_PLAN;
  const lines =
    family === "regular"
      ? planLimitLinesFor(lang, plan)
      : [
          { icon: "smartphone" as const, text: hasFeature(plan, "ios") ? m.androidIos : m.android },
          { icon: "photo_library" as const, text: formatMessage(lang, m.storage, { size: storageText(lang, plan.limits.storageGb) }) },
        ];
  return (
    <li
      data-plan={plan.id}
      data-offer-price={on && price?.offer ? price.offer.cents : undefined}
      data-full-price={price ? price.full.cents : undefined}
      className={`relative flex flex-col gap-5 rounded-[22px] bg-white p-6 ${featured ? "border-2 border-midnight" : "border border-line"}`}
    >
      {on && price?.offer ? (
        <span className="absolute -top-3.5 end-6 rounded-full bg-[#FF5A1F] px-3 py-1 text-[13px] font-extrabold text-[#0e0d24]" dir="ltr">
          −{percentText(lang, percent)}
        </span>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <h3 className="m-0 text-xl font-extrabold tracking-[-0.3px]">{plan.name}</h3>
        {plan.tagline ? <span className="text-sm leading-snug text-muted">{plan.tagline}</span> : null}
      </div>
      {price && on && price.offer ? (
        <div className="flex flex-col gap-1">
          <span className="text-[15px] text-muted">
            <span className="sr-only">{t.plans.was}: </span>
            <s dir="ltr" className="font-semibold">
              {formatMoney(price.full)}
            </s>{" "}
            {per}
          </span>
          <span className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="sr-only">{t.plans.now}: </span>
            <span dir="ltr" className="text-[36px] font-extrabold tracking-[-0.5px] text-midnight">
              {formatMoney(price.offer)}
            </span>
            <span className="text-[15px] font-medium text-muted">{per}</span>
          </span>
          {saved ? <span className="self-start rounded-lg bg-success-bg px-2.5 py-1 text-[13px] font-bold text-success">{formatMessage(lang, t.plans.save, { amount: saved })}</span> : null}
          <span className="pt-1 text-[13px] leading-snug text-ink-4">{formatMessage(lang, t.plans.firstPayment, { price: formatMoney(price.full), period: per ?? "" })}</span>
        </div>
      ) : price ? (
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span dir="ltr" className="text-[34px] font-extrabold tracking-[-0.5px]">
            {formatMoney(price.full)}
          </span>
          <span className="text-[15px] font-medium text-muted">{per}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-[26px] font-extrabold tracking-[-0.5px]">{shown.price}</span>
          {on ? <span className="text-[14px] leading-snug text-ink-4">{t.plans.onRequest}</span> : null}
        </div>
      )}
      <ul className="m-0 flex list-none flex-col gap-2 rounded-xl bg-sand p-3.5 text-sm font-semibold text-ink-2">
        {lines.map((line) => (
          <li key={line.icon} className="flex items-center gap-2.5">
            <Icon name={line.icon} size={20} className="text-ink-4" />
            {line.text}
          </li>
        ))}
        <li className="flex items-center gap-2.5">
          <Icon name="storefront" size={20} className="text-ink-4" />
          {planStoresLineFor(lang, plan)}
        </li>
      </ul>
      {plan.highlights.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
          {plan.highlights.slice(0, 5).map((item) => (
            <li key={item} className="flex gap-2.5">
              <span className="mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full bg-success-bg text-success">
                <Icon name="check" size={15} />
              </span>
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      <AccountLink
        href={localePath(lang, "/sign-up")}
        signedInHref={family === "studio" ? "/studio" : "/dashboard/license#change-plan"}
        signedIn={formatMessage(lang, m.choose, { plan: plan.name })}
        className={`mt-auto flex h-[50px] items-center justify-center rounded-xl text-base font-bold no-underline transition-colors ${
          featured ? "bg-midnight text-ivory hover:bg-ink-3 hover:text-ivory" : "border border-midnight text-midnight hover:bg-midnight hover:text-ivory"
        }`}
      >
        {formatMessage(lang, m.startWith, { plan: plan.name })}
      </AccountLink>
    </li>
  );
}

function PlanList({ lang, t, plans, prices, on, family, percent }: { lang: Lang; t: OccasionText; plans: PlanInfo[]; prices: Map<string, OccasionPlanPrice | null>; on: boolean; family: "regular" | "studio"; percent: number }) {
  return (
    <ul className="m-0 grid list-none gap-5 p-0 pt-4 [grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr))]" data-plan-family={family}>
      {plans.map((plan) => (
        <PlanCard key={plan.id} lang={lang} t={t} plan={plan} price={prices.get(plan.id) ?? null} on={on} family={family} percent={percent} />
      ))}
    </ul>
  );
}

function Plans({ lang, t, view, fill, regular, studio, prices, priceView, contact }: { lang: Lang; t: OccasionText; view: OccasionView; fill: Fill; regular: PlanInfo[]; studio: PlanInfo[]; prices: Map<string, OccasionPlanPrice | null>; priceView: PriceView; contact: Contact }) {
  const plansOn = view.occasion.plans;
  const families = (view.on ? (plansOn === "all" ? ["regular", "studio"] : [plansOn]) : ["regular", "studio"]) as ("regular" | "studio")[];
  const panel = (family: "regular" | "studio"): ReactNode =>
    family === "studio" && !studio.length ? (
      <p className="m-0 flex flex-wrap items-start gap-3 rounded-2xl border border-line bg-white p-5 text-[16px] leading-relaxed text-ink-3" data-studio-on-request="">
        <Icon name="forum" size={22} className="mt-0.5 flex-none text-accent" />
        <span className="min-w-0 flex-1">{t.plans.studioNone}</span>
        <WhatsAppLink lines={contact.lines} country={contact.country} className="font-bold">
          WhatsApp
        </WhatsAppLink>
      </p>
    ) : (
      <PlanList lang={lang} t={t} plans={family === "studio" ? studio : regular} prices={prices} on={view.on} family={family} percent={view.occasion.percent} />
    );
  const tabs = families.map((f) => ({ id: f, label: f === "regular" ? t.plans.regular : t.plans.studio, icon: f === "regular" ? ("apps" as const) : ("dashboard_customize" as const), note: f === "regular" ? t.plans.regularText : t.plans.studioText }));
  return (
    <section className="bg-ivory" aria-labelledby="bf-plans" id="plans">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-4 py-20 sm:px-6 sm:py-24">
        <SectionHead id="bf-plans" eyebrow={t.plans.eyebrow} title={fill(view.on ? t.plans.title : t.plans.titleOver)} text={view.on ? t.plans.text : t.plans.textOver} />
        {families.length > 1 ? <Tabs label={t.plans.switchLabel} items={tabs} panels={families.map(panel)} variant="segmented" /> : panel(families[0]!)}
        <p className="m-0 text-[15px] text-ink-4">{currencyNote(priceView, lang)}</p>
        <Link href={localePath(lang, "/pricing")} className="flex items-center gap-1.5 self-start text-base font-bold text-midnight no-underline hover:underline">
          {t.plans.details}
          <Icon name="arrow_forward" size={20} />
        </Link>
      </div>
    </section>
  );
}

function capitalize(lang: Lang, text: string): string {
  return lang === "ar" ? text : text.charAt(0).toLocaleUpperCase(lang) + text.slice(1);
}

function Kinds({ lang, t }: { lang: Lang; t: OccasionText }) {
  const studioIds = new Set(STUDIO_SOLUTIONS.map((s) => s.id));
  const alt = screenAltFor(lang);
  const lp = (path: string) => localePath(lang, path);
  const solutions = allSolutionsFor(lang);
  const panels = solutions.map((s) => {
    const studio = studioIds.has(s.id);
    const screen = s.screens[0]!;
    return (
      <article key={s.id} className="grid items-center gap-8 rounded-[28px] border border-line bg-white p-5 sm:p-8 md:grid-cols-[260px_1fr]" aria-labelledby={`bf-kind-${s.id}`} data-kind={s.id}>
        <div className="flex justify-center">
          <Phone screen={screen} alt={alt[screen]} className="w-[200px] sm:w-[240px]" sizes="240px" />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <span className={`flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-[12px] font-bold ${studio ? "bg-peach text-accent" : "bg-sand text-ink-3"}`}>
            <Icon name={studio ? "dashboard_customize" : "apps"} size={16} />
            {studio ? t.kinds.inStudio : t.kinds.regularApp}
          </span>
          <h3 id={`bf-kind-${s.id}`} className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px]">
            {s.appsTitle}
          </h3>
          <p className="m-0 text-[17px] leading-relaxed text-ink-4">{s.summary}</p>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {s.highlights.slice(0, 3).map((h) => (
              <li key={h.title} className="flex gap-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-peach text-midnight">
                  <Icon name={h.icon} size={20} />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-bold">{h.title}</span>
                  <span className="text-[15px] leading-relaxed text-ink-4">{h.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href={lp(`/solutions/${s.id}`)} className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-midnight px-4 text-[15px] font-bold text-ivory no-underline hover:bg-ink-3 hover:text-ivory">
              {capitalize(lang, formatMessage(lang, t.kinds.solution, { apps: s.apps }))}
              <Icon name="arrow_forward" size={18} />
            </Link>
            <Link href={`${lp(studio ? "/demo/studio" : "/demo")}#${s.demoSlug}`} className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-midnight px-4 text-[15px] font-bold text-midnight no-underline hover:bg-midnight hover:text-ivory">
              <Icon name="smartphone" size={18} />
              {t.kinds.demo}
            </Link>
          </div>
        </div>
      </article>
    );
  });
  return (
    <section className="bg-white" aria-labelledby="bf-kinds" id="kinds">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-4 py-20 sm:px-6 sm:py-24">
        <SectionHead id="bf-kinds" eyebrow={t.kinds.eyebrow} title={t.kinds.title} text={t.kinds.text} />
        <Tabs label={t.kinds.listLabel} items={solutions.map((s) => ({ id: s.id, label: s.name, icon: s.icon }))} panels={panels} />
      </div>
    </section>
  );
}

function Steps({ t }: { t: OccasionText }) {
  return (
    <section className="on-dark relative overflow-hidden bg-[#0b0a1f] text-white" aria-labelledby="bf-steps" id="steps">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-10 px-4 py-20 sm:px-6 sm:py-24">
        <SectionHead id="bf-steps" eyebrow={t.steps.eyebrow} title={t.steps.title} text={t.steps.text} dark />
        <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {t.steps.items.map(([title, text, time], i) => (
            <li key={title} className="flex flex-col gap-3 rounded-[22px] border border-white/12 bg-white/6 p-6">
              <span className="flex items-center justify-between gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF5A1F] text-[#0e0d24]">
                  <Icon name={STEP_ICONS[i]!} size={26} />
                </span>
                <span aria-hidden="true" className="text-[40px] leading-none font-extrabold text-white/20 tabular-nums">
                  {i + 1}
                </span>
              </span>
              <h3 className="m-0 text-[20px] leading-snug font-extrabold">{title}</h3>
              <p className="m-0 text-[15px] leading-relaxed text-white/80">{text}</p>
              <p className="m-0 mt-auto flex items-start gap-2 border-t border-white/10 pt-3 text-[14px] font-semibold text-[#FFB08F]">
                <Icon name="schedule" size={18} className="mt-px flex-none" />
                {time}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Included({ t }: { t: OccasionText }) {
  return (
    <section className="bg-ivory" aria-labelledby="bf-included" id="included">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-10 px-4 py-20 sm:px-6 sm:py-24">
        <SectionHead id="bf-included" eyebrow={t.included.eyebrow} title={t.included.title} text={t.included.text} />
        <div className="grid gap-5 lg:grid-cols-2">
          {INCLUDED_GROUPS.map((group, gi) => {
            const words = t.included.groups[gi]!;
            return (
              <article key={group.id} className="flex flex-col gap-5 rounded-[24px] border border-line bg-white p-6 sm:p-7" aria-labelledby={`bf-group-${group.id}`} data-included={group.id}>
                <div className="flex items-start gap-3.5">
                  <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-midnight text-ivory">
                    <Icon name={group.icon} size={26} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 id={`bf-group-${group.id}`} className="m-0 text-[22px] leading-tight font-extrabold">
                      {words.title}
                    </h3>
                    <p className="m-0 text-[15px] leading-relaxed text-ink-4">{words.text}</p>
                  </div>
                </div>
                <ul className="m-0 flex list-none flex-col gap-4 border-t border-line-soft p-0 pt-5">
                  {group.items.map((icon, ii) => {
                    const [title, text] = words.items[ii]!;
                    return (
                      <li key={title} className="flex gap-3">
                        <Icon name={icon} size={20} className="mt-0.5 text-accent" />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-[16px] font-bold">{title}</span>
                          <span className="text-[15px] leading-relaxed text-ink-4">{text}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Terms({ lang, t, view, fill }: { lang: Lang; t: OccasionText; view: OccasionView; fill: Fill }) {
  const refund = (
    <Link href={localePath(lang, "/refund")} className="font-semibold">
      {t.terms.refund}
    </Link>
  );
  return (
    <section className="bg-white" aria-labelledby="bf-terms" id="terms">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-8 px-4 py-20 sm:px-6 sm:py-24">
        <SectionHead id="bf-terms" eyebrow={t.terms.eyebrow} title={t.terms.title} text={view.on ? t.terms.text : undefined} />
        {view.on ? (
          <ol className="m-0 flex list-none flex-col gap-3 p-0" data-terms="">
            {[plansLine(view.occasion, t.terms), ...t.terms.items].map((item, i) => (
              <li key={i} className="flex gap-3.5 rounded-2xl border border-line bg-sand p-4 text-[16px] leading-relaxed text-ink-2">
                <Icon name={i === 0 ? "percent" : TERM_ICONS[i - 1]!} size={22} className="mt-0.5 text-accent" />
                <span>{fill(item)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="m-0 flex gap-3.5 rounded-2xl border border-line bg-sand p-5 text-[17px] leading-relaxed text-ink-2" data-terms-over="">
            <Icon name="event_busy" size={22} className="mt-0.5 text-accent" />
            <span>{fill(t.terms.over)}</span>
          </p>
        )}
        <p className="m-0 text-[15px] text-ink-4">{refund}</p>
      </div>
    </section>
  );
}

function Faq({ t, items }: { t: OccasionText; items: { q: string; a: string }[] }) {
  return (
    <section className="bg-ivory" aria-labelledby="bf-faq" id="faq">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-8 px-4 py-20 sm:px-6 sm:py-24">
        <SectionHead id="bf-faq" title={t.faq.title} />
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <details key={item.q} className="group rounded-2xl border border-line bg-white p-5">
              <summary className="flex items-center justify-between gap-4 text-[17px] font-bold">
                <h3 className="m-0 text-[17px] font-bold">{item.q}</h3>
                <Icon name="expand_more" size={24} className="flex-none transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <p className="m-0 pt-3 text-[16px] leading-relaxed text-ink-4">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Final({ lang, t, view, fill }: { lang: Lang; t: OccasionText; view: OccasionView; fill: Fill }) {
  return (
    <section className="on-dark relative isolate overflow-hidden bg-[#0b0a1f] text-white" aria-labelledby="bf-final">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(60%_90%_at_50%_100%,rgba(255,90,31,0.35),transparent_70%)]" />
      <div className="mx-auto flex max-w-[900px] flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
        <h2 id="bf-final" className="m-0 text-[34px] leading-[1.08] font-extrabold tracking-[-1px] text-balance sm:text-[54px] sm:tracking-[-1.8px]">
          {fill(view.on ? t.final.title : t.final.titleOver)}
        </h2>
        <p className="m-0 max-w-[640px] text-lg leading-relaxed text-white/85">{fill(view.on ? t.final.text : t.final.textOver)}</p>
        {view.codeShown ? (
          <span dir="ltr" className="rounded-xl border-2 border-dashed border-[#FF5A1F]/70 px-4 py-2 font-mono text-[20px] font-extrabold tracking-[2px]">
            {view.occasion.couponCode}
          </span>
        ) : null}
        <div className="flex flex-wrap justify-center gap-3">
          <StartLink lang={lang} t={t} className={primary} />
          <Link href={localePath(lang, "/pricing")} className={ghost}>
            {t.hero.seePricing}
          </Link>
        </div>
      </div>
    </section>
  );
}

/** What the page needs from the store, read once per request. */
async function pageData(lang: Lang, now: Date) {
  const store = await getStore();
  const [occasion, all, priceView, billing, contact] = await Promise.all([blackFridayOccasion(now), effectivePlans(store), visitorPriceView(store), yallappBilling(store), getVisitorContact()]);
  const regular = REGULAR_PLANS.map((id) => planFor(lang, all[id]));
  const studio = STUDIO_PLANS.map((id) => all[id]).filter(planOffered).map((plan) => planFor(lang, plan));
  const provider: PaymentProviderId = billing.planProvider;
  const prices = new Map([...regular, ...studio].map((plan) => [plan.id, occasionPlanPrice(plan, occasion, priceView, provider)] as const));
  return { occasion, regular, studio, priceView, prices, contact };
}

export async function BlackFridayPage({ lang, now = new Date() }: { lang: Lang; now?: Date }) {
  const { occasion, regular, studio, priceView, prices, contact } = await pageData(lang, now);
  const view = occasionView(occasion, now);
  const t = blackFridayCopyFor(lang);
  const fill = filler(lang, occasion);
  const faq = blackFridayFaq(lang, occasion, view.on);
  const base = siteUrl();
  const inLang = lang === "en" ? undefined : lang;
  const offerLd = blackFridayOfferLd(base, lang, view, [...prices.values()].filter((p): p is OccasionPlanPrice => p !== null));
  return (
    <div className="bg-white" data-occasion="black_friday">
      <JsonLdScript
        data={[
          breadcrumbLd(base, [{ name: t.navName, path: BLACK_FRIDAY_PATH }], inLang),
          faqLd(
            faq.map((f) => ({ question: f.q, answer: f.a })),
            inLang,
          ),
          ...offerLd,
        ]}
      />
      <SiteHeader current="black-friday" lang={lang} />
      <main>
        <Hero lang={lang} t={t} view={view} fill={fill} serverNow={now} />
        <Plans lang={lang} t={t} view={view} fill={fill} regular={regular} studio={studio} prices={prices} priceView={priceView} contact={contact} />
        <Kinds lang={lang} t={t} />
        <Steps t={t} />
        <Included t={t} />
        <Terms lang={lang} t={t} view={view} fill={fill} />
        <Faq t={t} items={faq} />
        <Final lang={lang} t={t} view={view} fill={fill} />
        <ContactBand lang={lang} />
      </main>
      <SiteFooter full lang={lang} />
    </div>
  );
}
