import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { JsonLdScript } from "@/components/json-ld";
import { analyticsEventsKeepText, analyticsKeepText, currencyNote, periodUnitFor, PlanCards, storageText } from "@/components/plan-cards";
import { StoreName } from "@/components/brand-marks";
import { PhoneFrame } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { CheckList, MarketingPage, MoreLink, Section, SectionTitle } from "@/components/marketing";
import { getSiteContent } from "@/lib/content/get";
import { StudioDifferences, studioPlanChoices, StudioPlans } from "@/components/studio-marketing";
import { cleanLimitDefs, comparisonRows, extraLimitRows, hasFeature, lifetimeNoteOf, pagesLimitOf, plansForSale, planStores, type ComparisonRow, type ComparisonValue, type PlanInfo, type Plan, type PriceView } from "@/lib/plans";
import { periodPrices, periodsAmong, startPeriod } from "@/lib/billing/period-prices";
import { isPeriodKey, periodUnit, type PeriodKey } from "@/lib/billing/periods";
import { platformSetting } from "@/lib/settings/platform";
import type { PlanLimitDef } from "@/lib/plans";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { getVisitorContact } from "@/lib/contact";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { visitorPriceView } from "@/lib/billing/display";
import { planFor, screenAltFor } from "@/lib/marketing-lang";
import type { AppScreen } from "@/lib/marketing";
import { siteMetadata, siteUrl, softwareLd } from "@/lib/seo";
import { APP_STORES, STORE_FACTS } from "@/lib/stores";
import { formatMessage, formatNumber, messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";
import { COMPARE_TEXT } from "@/lib/compare";

export function pricingMetadata(lang: Lang): Metadata {
  const m = messagesFor(lang).meta;
  return siteMetadata(lang, { title: m.pricingTitle, description: m.pricingDescription, path: "/pricing", image: "/pricing/opengraph-image" });
}

/** 55 The comparison table's rows in a language (lib/plans.ts `comparisonRows` is the English); 133 for the plans shown, with the team's own limits. */
function comparisonRowsFor(lang: Lang, plans: Record<Plan, PlanInfo>, shown: PlanInfo[], limitDefs: PlanLimitDef[]): ComparisonRow[] {
  if (lang === "en") return comparisonRows(plans, shown, limitDefs);
  const m = messagesFor(lang).pricing;
  const each = (fn: (p: PlanInfo) => ComparisonValue): Partial<Record<Plan, ComparisonValue>> => Object.fromEntries(shown.map((p) => [p.id, fn(p)]));
  const has = (f: Parameters<typeof hasFeature>[1]) => each((p) => hasFeature(p, f));
  const limit = (value: number | null, unlimited: string) => (value === null ? unlimited : formatNumber(lang, value));
  const support = { email: m.supportEmail, whatsapp: m.supportWhatsapp, priority: m.supportPriority, dedicated: m.supportDedicated };
  const words = messagesFor(lang).plans;
  return [
    { label: m.rowAndroid, values: each(() => true) },
    { label: m.rowIos, values: has("ios") },
    ...APP_STORES.map((id): ComparisonRow => ({ label: STORE_FACTS[id].name, store: id, values: each((p) => planStores(p).stores.includes(id)) })),
    { label: m.rowSources, values: each((p) => limit(p.limits.sources, m.all)) },
    { label: m.rowUsers, values: each((p) => limit(p.limits.appUsers, m.unlimited)) },
    { label: m.rowLanguages, values: each((p) => limit(p.limits.languages, m.all)) },
    { label: m.rowStorage, values: each((p) => (p.limits.storageGb === null ? m.unlimited : storageText(lang, p.limits.storageGb))) },
    // 72 How long analytics are kept.
    { label: m.rowAnalyticsDaily, values: each((p) => analyticsKeepText(lang, p.limits.analyticsMonths)) },
    { label: m.rowAnalyticsEvents, values: each(() => analyticsEventsKeepText(lang)) },
    { label: m.rowPush, values: has("push") },
    { label: m.rowPages, values: each((p) => (hasFeature(p, "page_editor") ? m.fullEditor : hasFeature(p, "page_editor_basic") ? m.basicEditor : m.templates)) },
    { label: m.rowCards, values: has("card_payments") },
    { label: m.rowOffline, values: has("offline_downloads") },
    { label: m.rowRebuilds, values: has("auto_rebuild") },
    { label: m.rowChat, values: has("chat") },
    { label: m.rowLoyalty, values: has("loyalty") },
    // 100.6 Courses and memberships bought in the app through the stores.
    { label: m.rowInAppPurchases, values: has("store_billing") },
    // 138 Every plan: we publish on Google Play and the App Store; the other Android stores update by themselves once connected.
    { label: m.rowPublishing, values: each(() => words.weePublish) },
    { label: m.rowMoreStoresAuto, values: each(() => true) },
    { label: m.rowTeam, values: each((p) => limit(p.limits.teamMembers, m.unlimited)) },
    { label: m.rowManager, values: each((p) => p.limits.accountManager) },
    { label: m.rowCustom, values: each((p) => p.limits.customFeatures) },
    { label: m.rowSupport, values: each((p) => support[p.limits.support]) },
    // 133 Pages, when the team limited them; the team's own limits.
    ...(shown.some((p) => typeof p.limits.pages === "number") ? [{ label: m.rowPagesCount, values: each((p) => limit(pagesLimitOf(p), m.unlimited)) }] : []),
    ...extraLimitRows(shown, limitDefs, lang, (v) => limit(v, m.unlimited)),
  ];
}

function Cell({ value, plan, lang }: { value: ComparisonValue; plan: string; lang: Lang }) {
  const m = messagesFor(lang).pricing;
  if (value === true) {
    return (
      <span role="img" aria-label={formatMessage(lang, m.included, { plan })} className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success-bg text-success">
        <Icon name="check" size={17} />
      </span>
    );
  }
  if (value === false) {
    return (
      <span role="img" aria-label={formatMessage(lang, m.notIncluded, { plan })} className="text-muted">
        —
      </span>
    );
  }
  return <span className="text-sm font-semibold">{value}</span>;
}

/** 146 The two products: the regular app (from a website, a store or a platform) and Yallapp Studio. */
type Product = "regular" | "studio";

/** 146 Each product's look on the page: its icon, its colour, and real screens of apps made with it (public/screens). */
const PRODUCT: Record<Product, { icon: IconName; border: string; badge: string; sample: AppScreen; samples: [AppScreen, AppScreen, AppScreen] }> = {
  regular: {
    icon: "apps",
    border: "border-midnight",
    badge: "bg-midnight text-white",
    // The regular demos: a shop, an academy, a café's menu and a bookings app.
    sample: "store-home",
    samples: ["academy-home", "restaurant-menu", "bookings-services"],
  },
  studio: {
    icon: "dashboard_customize",
    border: "border-ember",
    badge: "bg-ember text-midnight",
    // Studio's demos in their Signature looks: food delivery by night, a live taxi app by night, a school and a flower shop by night.
    sample: "food-delivery-sig-a-home-dark",
    samples: ["taxi-sig-a-home-dark", "school-sig-b-home", "flowers-sig-b-home-dark"],
  },
};

/** A real screen of an app in the site's phone frame. */
function Sample({ screen, alt, className }: { screen: AppScreen; alt: string; className: string }) {
  return (
    <PhoneFrame className={className} data-screen={screen}>
      <Image src={`/screens/${screen}.png`} alt={alt} fill sizes="160px" className="object-cover" />
    </PhoneFrame>
  );
}

/**
 * 146 A product's lowest price for the period the visitor chose, or for its
 * own starting period when none of its plans is sold for that one; null
 * when none of its plans has a price (on request).
 */
function fromPrice(plans: PlanInfo[], view: PriceView, period: PeriodKey | null): { key: PeriodKey; price: string } | null {
  const key = period && periodsAmong(plans, view).includes(period) ? period : startPeriod(plans, view, null);
  return key ? lowestFor(plans, view, key) : null;
}

/** 146 The lowest price among the plans for exactly this period; null when none is sold for it. */
function lowestFor(plans: PlanInfo[], view: PriceView, key: PeriodKey): { key: PeriodKey; price: string } | null {
  const lowest = plans.flatMap((plan) => periodPrices(plan, view).filter((x) => x.key === key)).sort((a, b) => a.shown.cents - b.shown.cents)[0];
  return lowest ? { key, price: lowest.price } : null;
}

/** "/ year", "/ 6 months", or "Pay once" for life, in a language. */
function perPeriodText(lang: Lang, key: PeriodKey): string {
  const w = messagesFor(lang).plans;
  return key === "lifetime" ? w.payOnce : formatMessage(lang, w.perPeriod, { period: periodUnitFor(lang, periodUnit(key)) });
}

/** 146 One of the two products at the top: who it's for, a real screen, its "from" price, and the way to its plans and its explanation. */
function ProductChoice({ product, lang, name, who, from, alt }: { product: Product; lang: Lang; name: string; who: string; from: { key: PeriodKey; price: string } | null; alt: string }) {
  const p = messagesFor(lang).pricing;
  const look = PRODUCT[product];
  return (
    <article aria-labelledby={`product-${product}`} data-product={product} className={`flex gap-4 rounded-[24px] border-2 bg-white p-4 sm:gap-6 sm:p-6 ${look.border}`}>
      <Sample screen={look.sample} alt={alt} className="w-[104px] flex-none self-center sm:w-[136px]" />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${look.badge}`}>
          <Icon name={look.icon} size={22} />
        </span>
        <h2 id={`product-${product}`} className="m-0 text-[22px] leading-tight font-extrabold tracking-[-0.4px] sm:text-[28px]">
          {name}
        </h2>
        <p className="m-0 text-[15px] leading-snug text-ink-4 sm:text-base">{who}</p>
        <p className="m-0 flex flex-wrap items-baseline gap-x-1.5" data-from-price="">
          {from ? (
            <>
              <span className="text-[13px] font-semibold text-muted">{p.from}</span>
              <span dir="ltr" className="text-[22px] font-extrabold tracking-[-0.4px] sm:text-[26px]">
                {from.price}
              </span>
              <span className="text-[13px] font-medium text-muted">{perPeriodText(lang, from.key)}</span>
            </>
          ) : (
            <span className="text-lg font-bold">{messagesFor(lang).plans.onRequest}</span>
          )}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          <a
            href={`#${product}`}
            className="flex h-11 items-center gap-1.5 rounded-xl bg-midnight px-4 text-[15px] font-bold text-white no-underline transition-colors hover:bg-ink-3 hover:text-white"
          >
            {p.seePlans}
            <Icon name="arrow_downward" size={18} />
          </a>
          <a href={`#about-${product}`} className="text-[15px] font-semibold text-midnight underline-offset-4 hover:text-midnight">
            {p.howItWorks}
          </a>
        </div>
      </div>
    </article>
  );
}

/** 146 The heading of a product's plans, with the product's mark. */
function PlansTitle({ product, eyebrow, title, text }: { product: Product; eyebrow: string; title: string; text: string }) {
  const look = PRODUCT[product];
  return (
    <div className="flex items-start gap-4">
      <span className={`mt-1 hidden h-12 w-12 flex-none items-center justify-center rounded-2xl sm:flex ${look.badge}`}>
        <Icon name={look.icon} size={26} />
      </span>
      <div className="flex max-w-[680px] flex-col gap-1.5">
        <span className={`text-[13px] font-bold tracking-[1px] uppercase ${product === "studio" ? "text-accent" : "text-ink-4"}`}>{eyebrow}</span>
        <h2 className="m-0 text-[26px] leading-[1.12] font-extrabold tracking-[-0.6px] text-balance sm:text-[34px] sm:tracking-[-0.8px]">{title}</h2>
        <p className="m-0 text-base leading-relaxed text-ink-4 sm:text-[17px]">{text}</p>
      </div>
    </div>
  );
}

/** 146 A product in detail: real screens, what you get, how it works and who it suits, and where to see more. */
function ProductDetail({
  product,
  lang,
  name,
  who,
  intro,
  get,
  steps,
  suits,
  extra,
  links,
}: {
  product: Product;
  lang: Lang;
  name: string;
  who: string;
  intro: string;
  get: ReactNode;
  steps: string[];
  suits: string;
  extra?: ReactNode;
  links: ReactNode;
}) {
  const p = messagesFor(lang).pricing;
  const look = PRODUCT[product];
  const alt = screenAltFor(lang);
  return (
    <article id={`about-${product}`} aria-labelledby={`about-${product}-title`} data-product-detail={product} className={`flex scroll-mt-6 flex-col gap-6 rounded-[24px] border-2 bg-white p-5 sm:p-7 ${look.border}`}>
      <div className="flex items-center gap-3.5">
        <span className={`flex h-12 w-12 flex-none items-center justify-center rounded-2xl ${look.badge}`}>
          <Icon name={look.icon} size={26} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 id={`about-${product}-title`} className="m-0 text-2xl leading-tight font-extrabold tracking-[-0.4px]">
            {name}
          </h3>
          <span className="text-[15px] leading-snug text-ink-4">{who}</span>
        </div>
      </div>
      <div className="flex justify-center gap-3 rounded-2xl bg-sand px-3 py-5 sm:gap-5" data-product-samples="">
        {look.samples.map((screen) => (
          <Sample key={screen} screen={screen} alt={alt[screen]} className="w-[94px] flex-none sm:w-[128px]" />
        ))}
      </div>
      <p className="m-0 text-base leading-relaxed text-ink-3">{intro}</p>
      <div className="flex flex-col gap-3">
        <h4 className="m-0 text-lg font-bold">{p.whatYouGet}</h4>
        {get}
      </div>
      {extra}
      <div className="flex flex-col gap-3">
        <h4 className="m-0 text-lg font-bold">{p.howItWorks}</h4>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm font-bold ${look.badge}`}>{formatNumber(lang, index + 1)}</span>
              <span className="pt-0.5 text-[15px] leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-col gap-2">
        <h4 className="m-0 text-lg font-bold">{p.whoTitle}</h4>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{suits}</p>
      </div>
      <div className="mt-auto flex flex-wrap gap-x-8 gap-y-3 border-t border-line-soft pt-5">{links}</div>
    </article>
  );
}

/**
 * Plans, prices, features and limits come from the admin (roadmap 9.2 and
 * 13.1). 52 Prices show in pounds in Egypt and in dollars elsewhere: the
 * page is rendered per request and sent with `Vary` (next.config.ts).
 * 55 In any language; the prices are written the same way in each.
 *
 * 146 The app and Studio side by side, short and simple: the two products
 * at the top, each with who it's for, a real screen and its "from" price;
 * one billing period for both (lifetime among them); each product's plans
 * right under it, Studio's with the same periods as the regular ones; each
 * product in detail with real screens; then how they differ, and every
 * feature of the app's plans in a fold.
 */
export async function PricingPage({ lang, period: asked = null }: { lang: Lang; period?: string | null }) {
  const contact = await getVisitorContact();
  const store = await getStore();
  const [all, view, extras] = await Promise.all([effectivePlans(store), visitorPriceView(store), platformSetting(store, "planExtras")]);
  // 133 The regular plans for sale, in the team's order (an archived or hidden one isn't).
  const plans = plansForSale(all, "regular").map((plan) => planFor(lang, plan));
  // 103R Yallapp Studio's own plans, apart: the ones the team offers.
  const studioPlans = plansForSale(all, "studio").map((plan) => planFor(lang, plan));
  const s = messagesFor(lang).studio;
  const limitDefs = cleanLimitDefs(extras?.value);
  const rows = comparisonRowsFor(lang, all, plans, limitDefs);
  // 133 The billing periods the plans offer, and the one the visitor looks at; 146 one choice for both products.
  const both = [...plans, ...studioPlans];
  const periods = periodsAmong(both, view);
  const period = startPeriod(both, view, isPeriodKey(asked) ? (asked as PeriodKey) : null);
  const shownPeriod = periods.length > 1 ? period : null;
  const lifetime = periods.includes("lifetime");
  const w = messagesFor(lang).plans;
  const periodName = (key: PeriodKey) => ({ "1": w.period1, "6": w.period6, "12": w.period12, "24": w.period24, "36": w.period36, lifetime: w.periodLifetime })[key];
  const text = await getSiteContent("pricing", lang);
  const m = messagesFor(lang).pricing;
  const h = messagesFor(lang).home;
  const alt = screenAltFor(lang);
  const lp = (path: string) => localePath(lang, path);
  const strong = { b: (chunk: string) => <strong className="text-ink-2">{chunk}</strong> };
  const from = { regular: fromPrice(plans, view, shownPeriod), studio: fromPrice(studioPlans, view, shownPeriod) };
  // 133 Lifetime on each product: its lowest price for life.
  const lifetimeFrom = { regular: lowestFor(plans, view, "lifetime"), studio: lowestFor(studioPlans, view, "lifetime") };
  const names: Record<Product, string> = { regular: m.appName, studio: s.studio };
  return (
    <MarketingPage current="pricing" eyebrow={text.eyebrow} title={text.title!} intro={text.intro!} lang={lang}>
      <JsonLdScript data={softwareLd(siteUrl(), plans, view, lang === "en" ? undefined : lang)} />
      <Section id="plans" label={w.list}>
        {/* 146 The two products, side by side and alike. */}
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2" role="group" aria-label={m.productsLabel} data-products="">
          <ProductChoice product="regular" lang={lang} name={names.regular} who={m.appWho} from={from.regular} alt={alt[PRODUCT.regular.sample]} />
          <ProductChoice product="studio" lang={lang} name={names.studio} who={m.studioWho} from={from.studio} alt={alt[PRODUCT.studio.sample]} />
        </div>
        <div className="flex flex-col gap-6">
          {/* 133 How long to pay for: each card shows that period's price, per month and the saving. 146 One choice for both products, kept in sight while their plans scroll by. */}
          {periods.length > 1 ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-line bg-white/95 p-3 shadow-[0_14px_30px_-24px_rgba(14,13,36,0.45)] backdrop-blur sm:sticky sm:top-2 sm:z-20 sm:p-2.5 sm:ps-4" data-period-bar="">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <span className="text-sm font-bold text-ink-2">{w.periods}</span>
                <nav aria-label={w.periods} className="flex flex-wrap gap-1.5" data-period-tabs="">
                  {periods.map((key) => (
                    <Link
                      key={key}
                      href={`${lp("/pricing")}?period=${key}#plans`}
                      scroll={false}
                      aria-current={key === period ? "true" : undefined}
                      data-period={key}
                      className={`flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-semibold no-underline sm:h-10 sm:px-4 sm:text-[15px] ${
                        key === "lifetime"
                          ? "on-dark border-ember bg-midnight text-white hover:text-white"
                          : key === period
                            ? "border-midnight bg-midnight text-white hover:text-white"
                            : "border-line bg-white text-ink-2 hover:border-line-strong hover:text-ink"
                      } ${key === "lifetime" && key === period ? "ring-2 ring-ember/50" : ""}`}
                    >
                      {key === "lifetime" ? <Icon name="diamond" size={17} filled className="text-ember" /> : null}
                      {periodName(key)}
                    </Link>
                  ))}
                </nav>
                {/* Straight to either product's plans. */}
                <nav aria-label={w.list} className="ms-auto hidden items-center gap-1 lg:flex" data-product-jump="">
                  {(["regular", "studio"] as const).map((product) => (
                    <a key={product} href={`#${product}`} className="flex h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-ink-2 no-underline hover:bg-sand hover:text-ink-2">
                      <Icon name={PRODUCT[product].icon} size={18} className={product === "studio" ? "text-accent" : "text-ink-4"} />
                      {names[product]}
                    </a>
                  ))}
                </nav>
              </div>
              <p className="m-0 text-[13px] leading-snug text-muted sm:text-[14px]">{m.periodHint}</p>
            </div>
          ) : null}
          {/* 133 Lifetime, to link to (/pricing#lifetime); 146 a choice of the period above, on both products' plans. */}
          {lifetime ? (
            <div id="lifetime-offer" className="scroll-mt-24">
              <section
                id="lifetime"
                aria-labelledby="lifetime-title"
                data-lifetime-offer=""
                className="on-dark relative isolate flex scroll-mt-24 flex-col gap-4 overflow-hidden rounded-[22px] border border-ember/40 bg-midnight p-5 text-white sm:p-6"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-24 -end-20 -z-10 h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(255,90,31,0.4),rgba(255,90,31,0)_70%)]"
                />
                <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                  <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1.5">
                    <span className="flex items-center gap-2 text-xs font-bold tracking-[1.2px] text-ember uppercase">
                      <Icon name="diamond" size={18} filled className="text-ember" />
                      {w.lifetimeEyebrow}
                    </span>
                    <h3 id="lifetime-title" className="m-0 text-[22px] leading-tight font-extrabold tracking-[-0.4px] text-white sm:text-[26px]">
                      {w.lifetimeTitle}
                    </h3>
                    <p className="m-0 text-[15px] leading-relaxed text-night-text">
                      {w.lifetimeText} {m.lifetimeBoth}
                    </p>
                  </div>
                  <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                    {(["regular", "studio"] as const).map((product) =>
                      lifetimeFrom[product] ? (
                        <li key={product} data-lifetime-from={product} className="flex flex-col rounded-xl border border-night-line bg-night-2/70 px-3.5 py-2">
                          <span className="flex items-center gap-1.5 text-[12px] font-bold text-night-text">
                            <Icon name={PRODUCT[product].icon} size={15} className="text-ember" />
                            {names[product]}
                          </span>
                          <span className="flex items-baseline gap-1.5">
                            <span className="text-[12px] text-night-muted">{m.from}</span>
                            <span dir="ltr" className="text-lg font-extrabold text-white">
                              {lifetimeFrom[product]!.price}
                            </span>
                          </span>
                        </li>
                      ) : null,
                    )}
                  </ul>
                  {period !== "lifetime" ? (
                    <Link
                      href={`${lp("/pricing")}?period=lifetime#plans`}
                      scroll={false}
                      className="flex h-11 items-center gap-2 rounded-xl bg-ember px-4 text-[15px] font-bold text-white no-underline transition-colors hover:bg-[#e94e15] hover:text-white"
                    >
                      <Icon name="diamond" size={18} filled />
                      {m.lifetimeSee}
                    </Link>
                  ) : null}
                </div>
                {period === "lifetime" ? (
                  <div className="flex gap-3 rounded-2xl border border-night-line bg-night-2/50 p-4 text-[14px] leading-relaxed text-night-text" data-lifetime-note="">
                    <Icon name="info" size={20} className="mt-0.5 flex-none text-ember" />
                    <div className="flex flex-col gap-1">
                      <strong className="text-white">{w.lifetimeNoteTitle}</strong>
                      <span>{lifetimeNoteOf(extras?.value, lang) ?? w.lifetimeNote}</span>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}
          {/* 103R The regular apps' plans. */}
          <div id="regular" className="flex scroll-mt-24 flex-col gap-6 rounded-[28px] border border-line bg-sand p-4 pt-6 sm:p-8" data-product-plans="regular">
            <PlansTitle product="regular" eyebrow={m.appName} title={s.pricingRegular} text={s.pricingRegularText} />
            <PlanCards plans={plans} view={view} headingLevel={3} lang={lang} period={shownPeriod} />
            <p className="m-0 flex gap-2.5 rounded-2xl bg-white p-4 text-[15px] leading-relaxed text-ink-3">
              <Icon name="dashboard_customize" size={20} className="mt-0.5 flex-none text-accent" />
              <span>{richText(s.pricingStudio, { link: (chunk) => <Link href="#studio">{chunk}</Link> })}</span>
            </p>
          </div>
          {/* 103R Yallapp Studio's own plans; 146 for the same periods. */}
          <div id="studio" className="flex scroll-mt-24 flex-col gap-6 rounded-[28px] border border-ember/40 bg-peach-soft p-4 pt-6 sm:p-8" data-product-plans="studio">
            <PlansTitle product="studio" eyebrow={s.studio} title={s.plansTitle} text={s.plansText} />
            <StudioPlans lang={lang} plans={studioPlans} view={view} contact={contact} period={shownPeriod} basics={false} />
          </div>
          <div className="flex flex-col gap-2 text-[15px] leading-relaxed text-ink-4">
            <p className="m-0">
              <span data-currency-note="">{currencyNote(view, lang)}</span>{" "}
              {richText(m.eachApp, { link: (chunk) => <WhatsAppLink lines={contact.lines} country={contact.country}>{chunk}</WhatsAppLink> })}
            </p>
            <p className="m-0" data-fees="">
              {richText(m.fees, { link: (chunk) => <Link href={lp("/refund")}>{chunk}</Link> })}
            </p>
          </div>
        </div>
      </Section>

      {/* 146 Each product in detail, with real screens of apps made with it. */}
      <Section tinted id="about">
        <SectionTitle title={m.aboutTitle} text={m.aboutText} />
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <ProductDetail
            product="regular"
            lang={lang}
            name={names.regular}
            who={m.appWho}
            intro={m.appIntro}
            get={<CheckList items={[m.appGet1, m.appGet2, m.appGet3, m.appGet4, m.appGet5, w.weePublishPlayApple]} />}
            steps={[m.appStep1, m.appStep2, m.appStep3]}
            suits={m.appWhoText}
            links={
              <>
                <MoreLink href={lp("/how-it-works")}>{h.howInDetail}</MoreLink>
                <MoreLink href={lp("/demo")}>{h.tryDemo}</MoreLink>
              </>
            }
          />
          <ProductDetail
            product="studio"
            lang={lang}
            name={names.studio}
            who={m.studioWho}
            intro={s.intro}
            get={
              <div className="flex flex-col gap-2">
                <span className="text-[15px] font-semibold text-ink-3">{s.everyPlan}</span>
                <CheckList items={[s.base1, s.base2, s.base3, s.base4, s.base5, s.base6, s.base7, s.base8]} />
              </div>
            }
            extra={
              <div className="flex flex-col gap-3" data-studio-choices="">
                <h4 className="m-0 text-lg font-bold">{s.byPlan}</h4>
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {studioPlanChoices(lang).map((choice) => (
                    <li key={choice.label} className="flex items-center gap-1.5 rounded-full border border-line bg-sand px-3 py-1.5 text-[14px] font-semibold text-ink-2">
                      <Icon name={choice.icon} size={17} className="text-accent" />
                      {choice.label}
                    </li>
                  ))}
                </ul>
              </div>
            }
            steps={[m.studioStep1, m.studioStep2, m.studioStep3]}
            suits={m.studioWhoText}
            links={
              <>
                <MoreLink href={lp("/yallapp-studio")}>{s.homeLink}</MoreLink>
                <MoreLink href={lp("/demo/studio")}>{s.seeDemo}</MoreLink>
              </>
            }
          />
        </div>
      </Section>

      {/* 103R How the two differ; 146 then every feature of the app's plans, folded so the page stays short. */}
      <Section id="differences">
        <SectionTitle title={s.diffTitle} text={s.diffText} />
        <StudioDifferences lang={lang} />
        <details id="compare" className="group scroll-mt-6 rounded-2xl border border-line bg-white transition-colors duration-200 open:border-line-strong hover:border-line-strong" data-compare-all="">
          <summary className="flex cursor-pointer items-center gap-4 rounded-2xl px-5 py-[18px] sm:px-6">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-peach text-midnight">
              <Icon name="compare" size={26} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-lg leading-snug font-bold sm:text-xl">{m.compareTitle}</span>
              <span className="text-[15px] leading-snug text-ink-4">{m.compareAllText}</span>
            </span>
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-sand transition-colors group-open:bg-midnight group-open:text-white">
              <Icon name="expand_more" size={22} className="transition-transform duration-200 group-open:rotate-180" />
            </span>
          </summary>
          <div className="flex flex-col gap-6 border-t border-line-soft p-4 sm:p-6">
            <div className="overflow-x-auto rounded-2xl border border-line bg-white" data-pricing-table="">
              <table className="w-full min-w-[720px] border-collapse text-[15px]">
                <caption className="sr-only">{m.caption}</caption>
                <thead>
                  <tr className="border-b border-line text-start">
                    <th scope="col" className="px-5 py-4 text-start font-bold">
                      {m.whatYouGet}
                    </th>
                    {plans.map((plan) => (
                      <th key={plan.id} scope="col" className={`w-[140px] px-4 py-4 text-center font-bold ${plan.featured ? "bg-peach-soft" : ""}`}>
                        <bdi>{plan.name}</bdi>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-b border-line-soft last:border-b-0 hover:bg-sand">
                      <th scope="row" className="px-5 py-3.5 text-start font-normal">
                        {row.store ? <StoreName id={row.store} /> : row.label}
                      </th>
                      {plans.map((plan) => (
                        <td key={plan.id} className={`px-4 py-3.5 text-center ${plan.featured ? "bg-peach-soft" : ""}`}>
                          <Cell value={row.values[plan.id] ?? false} plan={plan.name} lang={lang} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2.5 text-[15px] leading-relaxed text-ink-4">
              <p className="m-0">{richText(m.users, strong)}</p>
              <p className="m-0">{richText(m.platforms, strong)}</p>
              <p className="m-0">{richText(m.changing, strong)}</p>
              <p className="m-0">{richText(m.stores, strong)}</p>
            </div>
          </div>
        </details>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <MoreLink href={lp("/yallapp-studio")}>{s.homeLink}</MoreLink>
          <MoreLink href={lp("/compare")}>{COMPARE_TEXT[lang].title}</MoreLink>
        </div>
      </Section>
    </MarketingPage>
  );
}
