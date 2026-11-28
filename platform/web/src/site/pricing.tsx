import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import "./pricing.css";
import { JsonLdScript } from "@/components/json-ld";
import { analyticsEventsKeepText, analyticsKeepText, currencyNote, periodUnitFor, storageText } from "@/components/plan-cards";
import { StoreName, WhatsAppMark } from "@/components/brand-marks";
import { PhoneFrame } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { CheckList, MarketingPage, MoreLink } from "@/components/marketing";
import { getSiteContent } from "@/lib/content/get";
import { studioPlanChoices } from "@/components/studio-marketing";
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
import { periodHint, RegularPlanCards, StudioPlanCards } from "./pricing-cards";
import { kindChips, KINDS_SHOWN, type KindChip } from "./pricing-kinds";
import { OpenOnHash } from "./pricing-open";

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
      <span role="img" aria-label={formatMessage(lang, m.included, { plan })} className="pr-ct-yes">
        <Icon name="check" size={19} />
      </span>
    );
  }
  if (value === false) {
    return (
      <span role="img" aria-label={formatMessage(lang, m.notIncluded, { plan })} className="pr-ct-no">
        —
      </span>
    );
  }
  return <span className="pr-ct-value">{value}</span>;
}

/** 146 The two products: the regular app (from a website, a store or a platform) and Yallapp Studio. */
type Product = "regular" | "studio";

/**
 * 146 Each product's mark and real screens of apps made with it
 * (public/screens). 154 Day and night: two fanned phones at the top, the
 * app's three demos in its detail, and Studio's editor beside a school by
 * night in its.
 */
const PRODUCT: Record<Product, { icon: IconName; fan: [AppScreen, AppScreen]; detail: AppScreen[] }> = {
  regular: {
    icon: "apps",
    // An academy behind a shop.
    fan: ["academy-home", "store-home"],
    // A café's menu, an academy and a bookings app.
    detail: ["restaurant-menu", "academy-home", "bookings-services"],
  },
  studio: {
    icon: "dashboard_customize",
    // Lamha Taxi's live map behind Sofra Eats by night (Studio's Signature looks).
    fan: ["lamha-home", "food-delivery-sig-a-home-dark"],
    // Nakhla School by night, beside the Studio editor.
    detail: ["school-sig-b-home-dark"],
  },
};

/** A real screen of an app in the site's phone frame. */
function Phone({ screen, alt, className = "", priority = false }: { screen: AppScreen; alt: string; className?: string; priority?: boolean }) {
  return (
    <PhoneFrame className={className} data-screen={screen}>
      <Image src={`/screens/${screen}.png`} alt={alt} fill sizes="160px" priority={priority} className="object-cover" />
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

/** 146 One of the two products at the top: who it's for, two real screens, its "from" price, and the way to its plans and its explanation. */
function ProductChoice({ product, lang, name, who, tag, from }: { product: Product; lang: Lang; name: string; who: string; tag: string; from: { key: PeriodKey; price: string } | null }) {
  const p = messagesFor(lang).pricing;
  const look = PRODUCT[product];
  const alt = screenAltFor(lang);
  return (
    <article aria-labelledby={`product-${product}`} data-product={product} className={`pr-prod is-${product}`}>
      <div className="pr-prod-text">
        <div className="pr-prod-top">
          <span className="pr-mark">
            <Icon name={look.icon} size={21} />
          </span>
          <span className="pr-tag">{tag}</span>
        </div>
        <h2 id={`product-${product}`}>{name}</h2>
        <p className="pr-who">{who}</p>
        <p className="pr-from" data-from-price="">
          {from ? (
            <>
              <span className="pr-from-label">{p.from}</span>
              <span dir="ltr" className="pr-from-amt">
                {from.price}
              </span>
              <span className="pr-from-per">{perPeriodText(lang, from.key)}</span>
            </>
          ) : (
            <span className="pr-from-amt is-request">{messagesFor(lang).plans.onRequest}</span>
          )}
        </p>
        <div className="pr-prod-actions">
          <a href={`#${product}`} className="pr-btn">
            {p.seePlans}
            <Icon name="arrow_downward" size={18} />
          </a>
          <a href={`#about-${product}`} className="pr-lnk">
            {p.howItWorks}
          </a>
        </div>
      </div>
      <div className="pr-fan">
        <Phone screen={look.fan[0]} alt={alt[look.fan[0]]} className="pr-p1" />
        <Phone screen={look.fan[1]} alt={alt[look.fan[1]]} className="pr-p2" priority />
      </div>
    </article>
  );
}

/** 154 The kinds of apps a product makes, the common ones first and the rest folded under "+N more" (no script: the fold opens them, pricing.css). */
function KindChips({ chips, lang, label }: { chips: KindChip[]; lang: Lang; label: string }) {
  const p = messagesFor(lang).pricing;
  const fold = chips.length > KINDS_SHOWN + 1;
  return (
    <ul className="pr-kinds" aria-label={label} data-kinds="">
      {chips.map((chip, at) => {
        const inner = (
          <>
            <Icon name={chip.icon} size={16} />
            {chip.label}
          </>
        );
        return (
          <li key={chip.id} data-kind={chip.id} data-kind-extra={fold && at >= KINDS_SHOWN ? "" : undefined}>
            {chip.href ? <Link href={chip.href}>{inner}</Link> : <span>{inner}</span>}
          </li>
        );
      })}
      {fold ? (
        <li className="pr-kinds-toggle">
          <details data-kinds-more="">
            <summary>
              <span className="pr-kinds-closed">{formatMessage(lang, p.kindsMore, { count: chips.length - KINDS_SHOWN })}</span>
              <span className="pr-kinds-open">{p.kindsFewer}</span>
            </summary>
          </details>
        </li>
      ) : null}
    </ul>
  );
}

/** 146 A product in detail: real screens, how it works, the kinds of apps it makes, what you get and who it suits (folded), and where to see more. */
function ProductDetail({
  product,
  lang,
  name,
  intro,
  get,
  steps,
  suits,
  chips,
  links,
}: {
  product: Product;
  lang: Lang;
  name: string;
  intro: string;
  get: ReactNode;
  steps: string[];
  suits: string;
  chips: KindChip[];
  links: ReactNode;
}) {
  const p = messagesFor(lang).pricing;
  const look = PRODUCT[product];
  const alt = screenAltFor(lang);
  return (
    <article id={`about-${product}`} aria-labelledby={`about-${product}-title`} data-product-detail={product} className={`pr-about-card ${product === "studio" ? "is-night" : ""}`}>
      <div className={`pr-media is-${product}`} data-product-samples="">
        {product === "studio" ? (
          <>
            {/* The real Studio editor. */}
            <div className="pr-editor">
              <Image src="/screens/studio-editor.png" alt={alt["studio-editor"]} width={1920} height={1200} sizes="(max-width: 1100px) 76vw, 420px" />
            </div>
            <Phone screen={look.detail[0]!} alt={alt[look.detail[0]!]} className="pr-media-phone" />
          </>
        ) : (
          look.detail.map((screen) => <Phone key={screen} screen={screen} alt={alt[screen]} />)
        )}
      </div>
      <div className="pr-about-body">
        <div className="pr-about-head">
          <span className="pr-mark">
            <Icon name={look.icon} size={21} />
          </span>
          <h3 id={`about-${product}-title`}>{name}</h3>
        </div>
        <p className="pr-about-intro">{intro}</p>
        <h4 className="sr-only">{p.howItWorks}</h4>
        <ol className="pr-steps">
          {steps.map((step, index) => (
            <li key={step}>
              <span className="pr-step-n">{formatNumber(lang, index + 1)}</span>
              {step}
            </li>
          ))}
        </ol>
        <KindChips chips={chips} lang={lang} label={messagesFor(lang).home.kindsLabel} />
        {/* What you get and who it suits, folded so the card stays short. */}
        <details className="pr-about-more" data-about-more="">
          <summary>
            <h4>{p.whatYouGet}</h4>
            <Icon name="expand_more" size={18} className="pr-chev" />
          </summary>
          <div className="pr-about-more-body">
            {get}
            <h4>{p.whoTitle}</h4>
            <p>{suits}</p>
          </div>
        </details>
        <div className="pr-about-links">{links}</div>
      </div>
    </article>
  );
}

/** 103R Regular apps next to Studio projects, topic by topic; 154 Studio's column by night, and on phones each topic over the two answers. */
function Versus({ lang }: { lang: Lang }) {
  const s = messagesFor(lang).studio;
  const rows = [
    { topic: s.rowPages, regular: s.rowPagesRegular, studio: s.rowPagesStudio },
    { topic: s.rowContent, regular: s.rowContentRegular, studio: s.rowContentStudio },
    { topic: s.rowKinds, regular: s.rowKindsRegular, studio: s.rowKindsStudio },
    { topic: s.rowPlans, regular: s.rowPlansRegular, studio: s.rowPlansStudio },
    { topic: s.rowAccount, regular: s.rowAccountRegular, studio: s.rowAccountStudio },
    { topic: s.rowPublish, regular: s.rowPublishBoth, studio: s.rowPublishBoth },
  ];
  return (
    <div role="table" aria-label={s.diffTitle} className="pr-vs" data-studio-differences="">
      <div role="row" className="pr-vs-row is-head">
        <span role="columnheader" className="pr-vs-k">
          {s.topic}
        </span>
        <span role="columnheader" className="pr-vs-h">
          <Icon name="apps" size={18} />
          {s.regular}
        </span>
        <span role="columnheader" className="pr-vs-h is-s">
          <Icon name="dashboard_customize" size={18} />
          {s.studio}
        </span>
      </div>
      {rows.map((row) => (
        <div role="row" key={row.topic} className="pr-vs-row">
          <span role="rowheader" className="pr-vs-k">
            {row.topic}
          </span>
          <span role="cell">{row.regular}</span>
          <span role="cell" className="is-s">
            {row.studio}
          </span>
        </div>
      ))}
    </div>
  );
}

/** 154 A note of the page used as a question's answer: its bold label ("Changing plans:") left out, the rest starting with a capital. */
function answerOf(lang: Lang, text: string, tags: Record<string, (chunk: string) => ReactNode>): ReactNode {
  const label = /^<b>[^<]*:<\/b>\s*/.exec(text);
  if (!label) return richText(text, tags);
  const rest = text.slice(label[0].length);
  return richText(rest.charAt(0).toLocaleUpperCase(lang) + rest.slice(1), tags);
}

/**
 * Plans, prices, features and limits come from the admin (roadmap 9.2 and
 * 13.1). 52 Prices show in pounds in Egypt and in dollars elsewhere: the
 * page is rendered per request and sent with `Vary` (next.config.ts).
 * 55 In any language; the prices are written the same way in each.
 *
 * 146 The app and Studio side by side, short and simple. 154 In the Day and
 * night look the owner chose (pricing.css): a night hero with the app as a
 * day panel and Studio glowing beside it, each with two fanned phones; the
 * period picker floating over the hero's edge, a saving under each period,
 * lifetime among them; the app's plans by day and Studio's on a night
 * band, in compact cards; each product in detail, Studio's with its real
 * editor; how they differ, every feature folded, a few questions, and the
 * closing band in the night.
 */
export async function PricingPage({ lang, period: asked = null }: { lang: Lang; period?: string | null }) {
  const contact = await getVisitorContact();
  const store = await getStore();
  const [all, view, extras] = await Promise.all([effectivePlans(store), visitorPriceView(store), platformSetting(store, "planExtras")]);
  // 133 The regular plans for sale, in the team's order (an archived or hidden one isn't).
  const plans = plansForSale(all, "regular").map((plan) => planFor(lang, plan));
  // 103R Yallapp Studio's own plans, apart: the ones the team offers, and only those (never a sample).
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
  const nav = messagesFor(lang).nav;
  const lp = (path: string) => localePath(lang, path);
  const strong = { b: (chunk: string) => <strong>{chunk}</strong> };
  const wa = (chunk: string) => (
    <WhatsAppLink lines={contact.lines} country={contact.country}>
      {chunk}
    </WhatsAppLink>
  );
  const refund = (chunk: string) => <Link href={lp("/refund")}>{chunk}</Link>;
  const from = { regular: fromPrice(plans, view, shownPeriod), studio: fromPrice(studioPlans, view, shownPeriod) };
  // 133 Lifetime on each product: its lowest price for life.
  const lifetimeFrom = { regular: lowestFor(plans, view, "lifetime"), studio: lowestFor(studioPlans, view, "lifetime") };
  const names: Record<Product, string> = { regular: m.appName, studio: s.studio };
  // 154 A few questions, answered with the page's own notes; lifetime's when a plan is sold for life.
  const faq: { id: string; q: string; a: ReactNode }[] = [
    ...(lifetime ? [{ id: "lifetime", q: m.faqLifetime, a: lifetimeNoteOf(extras?.value, lang) ?? w.lifetimeNote }] : []),
    { id: "change", q: m.faqChange, a: answerOf(lang, m.changing, strong) },
    { id: "fees", q: m.faqFees, a: richText(m.fees, { link: refund }) },
    { id: "users", q: m.faqUsers, a: answerOf(lang, m.users, strong) },
  ];

  const hero = (
    <section className="pr-night" data-pricing-hero="">
      <div className="pr-wrap pr-hero">
        <div>
          {text.eyebrow ? <span className="pr-eyebrow">{text.eyebrow}</span> : null}
          <h1>{text.title}</h1>
        </div>
        <p className="pr-lead">{text.intro}</p>
      </div>
      {/* 146 The two products, side by side and alike: the app by day, Studio by night. */}
      <div className="pr-wrap pr-products" role="group" aria-label={m.productsLabel} data-products="">
        {/* Studio first: the owner's rule for every page with prices. */}
        <ProductChoice product="studio" lang={lang} name={names.studio} who={m.studioWho} tag={m.studioTag} from={from.studio} />
        <ProductChoice product="regular" lang={lang} name={names.regular} who={m.appWho} tag={w.androidIos} from={from.regular} />
      </div>
    </section>
  );

  return (
    <MarketingPage current="pricing" eyebrow={text.eyebrow} title={text.title!} intro={text.intro!} lang={lang} hero={hero} closing="glow">
      <JsonLdScript data={softwareLd(siteUrl(), plans, view, lang === "en" ? undefined : lang)} />
      <OpenOnHash ids={["compare"]} />
      <div className="pr">
        <section id="plans" aria-label={w.list} className="pr-plans">
          {/* 133 How long to pay for: each card shows that period's price, per month and the saving. 146 One choice for both products; 154 floating over the hero's edge, kept in sight on computers while the plans scroll by. */}
          {periods.length > 1 ? (
            <div className="pr-wrap pr-bar-wrap">
              <div className="pr-bar" data-period-bar="">
                <div className="pr-bar-label">
                  <b>
                    <Icon name="calendar_month" size={19} />
                    {w.periods}
                  </b>
                  <span>{m.periodHint}</span>
                </div>
                <nav aria-label={w.periods} className="pr-seg" data-period-tabs="">
                  {periods.map((key) => {
                    const hint = periodHint(lang, both, view, key);
                    return (
                      <Link
                        key={key}
                        href={`${lp("/pricing")}?period=${key}#plans`}
                        scroll={false}
                        aria-current={key === period ? "true" : undefined}
                        data-period={key}
                        className={`pr-seg-btn ${key === period ? "is-on" : ""}`}
                      >
                        <span className="pr-seg-label" data-period-label="">
                          {key === "lifetime" ? <Icon name="diamond" size={16} filled className="pr-life-ico" /> : null}
                          {periodName(key)}
                        </span>
                        {hint ? (
                          <span className="pr-seg-hint" data-period-hint="">
                            {hint}
                          </span>
                        ) : (
                          <span className="pr-seg-hint is-empty" aria-hidden="true">
                            {" "}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          ) : null}
          {/* 133 Lifetime, to link to (/pricing#lifetime); 146 a choice of the period above, on both products' plans; 154 a note under the picker, with what it covers once chosen. */}
          {lifetime ? (
            <div id="lifetime-offer" className="pr-wrap pr-life-wrap">
              <section id="lifetime" aria-labelledby="lifetime-title" data-lifetime-offer="" className={`pr-life-note ${period === "lifetime" ? "is-on" : ""}`}>
                <Icon name="diamond" size={22} filled className="pr-life-gem" />
                <div className="pr-life-body">
                  <div className="pr-life-row">
                    <div className="pr-life-text">
                      <div className="pr-life-title">
                        <span className="pr-life-eyebrow">{w.lifetimeEyebrow}</span>
                        <h3 id="lifetime-title">{w.lifetimeTitle}</h3>
                      </div>
                      <p>
                        {w.lifetimeText} {m.lifetimeBoth}
                      </p>
                    </div>
                    <ul className="pr-life-from">
                      {(["studio", "regular"] as const).map((product) =>
                        lifetimeFrom[product] ? (
                          <li key={product} data-lifetime-from={product}>
                            <span className="pr-life-from-name">
                              <Icon name={PRODUCT[product].icon} size={15} />
                              {names[product]}
                            </span>
                            <span className="pr-life-from-price">
                              <span>{m.from}</span>
                              <b dir="ltr">{lifetimeFrom[product]!.price}</b>
                            </span>
                          </li>
                        ) : null,
                      )}
                    </ul>
                    {period !== "lifetime" ? (
                      <Link href={`${lp("/pricing")}?period=lifetime#plans`} scroll={false} className="pr-life-see">
                        <Icon name="diamond" size={17} filled />
                        {m.lifetimeSee}
                      </Link>
                    ) : null}
                  </div>
                  {period === "lifetime" ? (
                    <div className="pr-life-covers" data-lifetime-note="">
                      <strong>{w.lifetimeNoteTitle}</strong>
                      <span>{lifetimeNoteOf(extras?.value, lang) ?? w.lifetimeNote}</span>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          ) : null}

          {/* 103R Yallapp Studio's own plans; 146 for the same periods; 154 on a night band. */}
          <section id="studio" aria-labelledby="studio-title" className="pr-night-band" data-product-plans="studio">
            <div className="pr-wrap">
              <div className="pr-sec-head">
                <div>
                  <span className="pr-kicker">
                    <span className="pr-n">01</span>
                    {s.studio}
                  </span>
                  <h2 id="studio-title">{s.plansTitle}</h2>
                  <p>{s.plansText}</p>
                </div>
                <Link href={lp("/yallapp-studio")} className="pr-lnk-u">
                  {s.homeLink}
                </Link>
              </div>
              <StudioPlanCards plans={studioPlans} view={view} lang={lang} period={shownPeriod} contact={contact} />
            </div>
          </section>
          {/* 103R The regular apps' plans, by day. */}
          <section id="regular" aria-labelledby="regular-title" className="pr-day" data-product-plans="regular">
            <div className="pr-wrap">
              <div className="pr-sec-head">
                <div>
                  <span className="pr-kicker">
                    <span className="pr-n">02</span>
                    {m.appName}
                  </span>
                  <h2 id="regular-title">{s.pricingRegular}</h2>
                  <p>{s.pricingRegularText}</p>
                </div>
                <a href="#compare" className="pr-lnk-u">
                  {m.compareTitle}
                </a>
              </div>
              <RegularPlanCards plans={plans} view={view} lang={lang} period={shownPeriod} />
              <p className="pr-notes pr-studio-apart">
                <Icon name="dashboard_customize" size={18} />
                <span>{richText(s.pricingStudio, { link: (chunk) => <a href="#studio">{chunk}</a> })}</span>
              </p>
              <div className="pr-notes" data-pricing-notes="">
                <p>
                  <span data-currency-note="">{currencyNote(view, lang)}</span> {richText(m.eachApp, { link: wa })}
                </p>
                <p data-fees="">{richText(m.fees, { link: refund })}</p>
              </div>
            </div>
          </section>

        </section>

        {/* 146 Each product in detail, with real screens of apps made with it; 154 Studio's with its real editor, and every kind of app each makes. */}
        <section id="about" aria-labelledby="about-title" className="pr-wrap pr-about">
          <div className="pr-sec-title">
            <h2 id="about-title">{m.aboutTitle}</h2>
            <p>{m.aboutText}</p>
          </div>
          <div className="pr-about-grid">
            <ProductDetail
              product="studio"
              lang={lang}
              name={names.studio}
              intro={s.intro}
              get={
                <>
                  <span className="pr-about-sub">{s.everyPlan}</span>
                  <CheckList items={[s.base1, s.base2, s.base3, s.base4, s.base5, s.base6, s.base7, s.base8]} />
                  <div className="pr-choices" data-studio-choices="">
                    <h4>{s.byPlan}</h4>
                    <ul>
                      {studioPlanChoices(lang).map((choice) => (
                        <li key={choice.label}>
                          <Icon name={choice.icon} size={17} />
                          {choice.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              }
              steps={[m.studioStep1, m.studioStep2, m.studioStep3]}
              suits={m.studioWhoText}
              chips={kindChips(lang, "studio")}
              links={
                <>
                  <MoreLink href={lp("/yallapp-studio")}>{s.homeLink}</MoreLink>
                  <MoreLink href={lp("/demo/studio")}>{s.seeDemo}</MoreLink>
                </>
              }
            />
            <ProductDetail
              product="regular"
              lang={lang}
              name={names.regular}
              intro={m.appIntro}
              get={<CheckList items={[m.appGet1, m.appGet2, m.appGet3, m.appGet4, m.appGet5, w.weePublishPlayApple]} />}
              steps={[m.appStep1, m.appStep2, m.appStep3]}
              suits={m.appWhoText}
              chips={kindChips(lang, "regular")}
              links={
                <>
                  <MoreLink href={lp("/how-it-works")}>{h.howInDetail}</MoreLink>
                  <MoreLink href={lp("/demo")}>{h.tryDemo}</MoreLink>
                </>
              }
            />
          </div>
        </section>

        {/* 103R How the two differ; 146 then every feature of the app's plans, folded so the page stays short. */}
        <section id="differences" aria-labelledby="differences-title" className="pr-wrap pr-diff">
          <div className="pr-sec-title">
            <h2 id="differences-title">{s.diffTitle}</h2>
            <p>{s.diffText}</p>
          </div>
          <Versus lang={lang} />
          <details id="compare" className="pr-fold" data-compare-all="">
            <summary>
              <Icon name="compare" size={24} className="pr-fold-ico" />
              <span className="pr-fold-t">
                <b>{m.compareTitle}</b>
                <span>{m.compareAllText}</span>
              </span>
              <Icon name="expand_more" size={22} className="pr-chev" />
            </summary>
            <div className="pr-fold-body">
              <div className="pr-ct-wrap" data-pricing-table="">
                <table className="pr-ct">
                  <caption className="sr-only">{m.caption}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{m.whatYouGet}</th>
                      {plans.map((plan) => (
                        <th key={plan.id} scope="col" className={plan.featured ? "is-feat" : undefined}>
                          <bdi>{plan.name}</bdi>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.label}>
                        <th scope="row">{row.store ? <StoreName id={row.store} /> : row.label}</th>
                        {plans.map((plan) => (
                          <td key={plan.id} className={plan.featured ? "is-feat" : undefined}>
                            <Cell value={row.values[plan.id] ?? false} plan={plan.name} lang={lang} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pr-ct-notes">
                <p>{richText(m.users, strong)}</p>
                <p>{richText(m.platforms, strong)}</p>
                <p>{richText(m.changing, strong)}</p>
                <p>{richText(m.stores, strong)}</p>
              </div>
            </div>
          </details>
          <div className="pr-diff-links">
            <MoreLink href={lp("/yallapp-studio")}>{s.homeLink}</MoreLink>
            <MoreLink href={lp("/compare")}>{COMPARE_TEXT[lang].title}</MoreLink>
          </div>
        </section>

        {/* 154 A few questions, answered with the page's own words. */}
        <section aria-labelledby="pricing-faq-title" className="pr-wrap pr-faq" data-pricing-faq="">
          <div className="pr-faq-side">
            <span className="pr-eyebrow is-day">{nav.faq}</span>
            <h2 id="pricing-faq-title">{nav.faqText}</h2>
            <WhatsAppLink lines={contact.lines} country={contact.country} className="pr-faq-wa">
              <WhatsAppMark size={18} />
              {messagesFor(lang).common.talkWhatsApp}
            </WhatsAppLink>
          </div>
          <div>
            {faq.map((item, at) => (
              <details key={item.id} className="pr-qa" data-faq={item.id} open={at === 0}>
                <summary>
                  <span>{item.q}</span>
                  <Icon name="expand_more" size={22} />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </MarketingPage>
  );
}
