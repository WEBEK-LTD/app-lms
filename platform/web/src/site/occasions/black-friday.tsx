import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { AccountLink } from "@/components/account-link";
import { PhoneFrame } from "@/components/device-frame";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
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
import { LANGS } from "@/i18n/config";
import { formatMessage, messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { BlackFridayMotion, Confetti, CouponTicket, Countdown, GoldDust, Shelf, Tabs } from "./client";
import { blackFridayOccasion } from "./load";
import { occasionPlanPrice, occasionValues, occasionView, percentText, savedText, type OccasionPlanPrice, type OccasionView } from "./offer";
import { FAQ_COUNT, HERO_SCREENS, INCLUDED_GROUPS, KIND_SCREENS, RECEIPT_SCREEN, STEP_ICONS, TERM_ICONS } from "./shape";
import { BLACK_FRIDAY_PATH, type OccasionText, type SceneText } from "./types";
import "./black-friday.css";

/**
 * 124 Black Friday's page, /black-friday in every language, told as one
 * night in scenes (black-friday.css draws them): the opening with the
 * hanging price tag, the price falling, the plans hung on a rack, the shop
 * window of kinds, the four steps printed on a receipt, everything included
 * lifted out of a gift box, the terms on the back of a coupon, the
 * questions on ticket stubs, and the morning after. The offer (its
 * percentage, days, code and plans) is the one the team saved in Admin ›
 * Occasions; the prices are the plans' as the team set them, in the
 * visitor's currency, with the offer worked out as the payment form does
 * (./offer.ts). Upcoming: a countdown to the start, with the day the code
 * works from. Over or turned off: the page still explains everything, at
 * the normal prices, without the code or a countdown. Every word is in the
 * server's HTML; the motion (./client.tsx) only leads to where it rests.
 */

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

const vars = (v: Record<string, string | number>) => v as CSSProperties;

/** A real screen of an app in the site's phone frame, lit like a launch: glare, depth and a reflection under it. */
function Phone({ screen, alt, className = "", priority = false, sizes = "(max-width: 640px) 34vw, 240px", style }: { screen: AppScreen; alt: string; className?: string; priority?: boolean; sizes?: string; style?: CSSProperties }) {
  return (
    <div className={`bf-phone ${className}`} style={style}>
      <div className="bf-phone-float">
        <PhoneFrame className="bf-phone-frame w-full" data-screen={screen}>
          <Image src={`/screens/${screen}.png`} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
          <span aria-hidden="true" className="bf-phone-glare" />
        </PhoneFrame>
      </div>
    </div>
  );
}

/** A scene's moment on the clock and the lines the reader lives in it. */
function SceneStory({ scene, fill, className = "" }: { scene: SceneText; fill: Fill; className?: string }) {
  return (
    <div className={`bf-story ${className}`}>
      <p className="bf-label" data-reveal="">
        <span aria-hidden="true" className="bf-label-dot" />
        {scene.label}
      </p>
      {scene.lines.map((line, i) => (
        <p key={line} className="bf-line" data-reveal="" style={vars({ "--i": i })}>
          {fill(line)}
        </p>
      ))}
    </div>
  );
}

function SectionHead({ id, eyebrow, title, text, center = false }: { id: string; eyebrow?: string; title: string; text?: string; center?: boolean }) {
  return (
    <div className={`bf-head ${center ? "bf-head-center" : ""}`} data-reveal="">
      {eyebrow ? <span className="bf-eyebrow">{eyebrow}</span> : null}
      <h2 id={id} className="bf-h2">
        {title}
      </h2>
      {text ? <p className="bf-sub">{text}</p> : null}
    </div>
  );
}

function StartLink({ lang, t, className = "bf-btn bf-btn-gold", signedInHref = "/start" }: { lang: Lang; t: OccasionText; className?: string; signedInHref?: string }) {
  return (
    <AccountLink href={localePath(lang, "/sign-up")} signedInHref={signedInHref} signedIn={t.hero.startSignedIn} className={className}>
      <Icon name="rocket_launch" size={20} />
      {t.hero.start}
    </AccountLink>
  );
}

/** Deterministic bars for a code: two to four per character, so the same code always draws the same barcode. */
function Barcode({ seed, className = "" }: { seed: string; className?: string }) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (const ch of seed) {
    const c = ch.charCodeAt(0);
    for (let k = 0; k < 3; k++) {
      const w = 1 + ((c >> (k * 2)) & 3);
      bars.push({ x, w });
      x += w + 1 + ((c >> k) & 1);
    }
  }
  return (
    <svg aria-hidden="true" className={`bf-barcode ${className}`} viewBox={`0 0 ${Math.max(1, x)} 40`} preserveAspectRatio="none">
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y={0} width={b.w} height={40} />
      ))}
    </svg>
  );
}

/** The night city under the opening: two rows of towers, their windows lit by a pattern. */
function Skyline() {
  const back = [
    [0, 150], [70, 110], [120, 190], [200, 130], [260, 210], [330, 150], [400, 240], [470, 170], [540, 120], [600, 200], [680, 260], [740, 160], [810, 220], [880, 140], [940, 250], [1010, 180], [1080, 130], [1140, 230], [1210, 170], [1280, 210], [1350, 140],
  ];
  const front = [
    [20, 90], [110, 140], [190, 80], [250, 120], [350, 70], [430, 130], [520, 100], [620, 150], [720, 90], [800, 120], [900, 160], [990, 95], [1070, 140], [1160, 85], [1240, 125], [1330, 100],
  ];
  return (
    <svg aria-hidden="true" className="bf-skyline" data-bleed="" viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice">
      <defs>
        <pattern id="bf-windows" width="13" height="17" patternUnits="userSpaceOnUse">
          <rect x="4" y="5" width="4" height="6" rx="0.6" className="bf-window" />
        </pattern>
        <linearGradient id="bf-skyfade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="bf-skymask">
          <rect width="1440" height="300" fill="url(#bf-skyfade)" />
        </mask>
      </defs>
      <g mask="url(#bf-skymask)">
        {back.map(([x, h]) => (
          <rect key={`b${x}`} x={x} y={300 - h!} width={64} height={h} className="bf-tower-back" />
        ))}
        {front.map(([x, h]) => (
          <g key={`f${x}`}>
            <rect x={x} y={300 - h!} width={74} height={h} className="bf-tower" />
            <rect x={x! + 4} y={300 - h! + 10} width={66} height={h! - 10} fill="url(#bf-windows)" className="bf-tower-lit" />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Sale tape crossing behind the tag: the occasion's name in the three languages, running along the tape. */
function Tapes({ percent }: { percent: string }) {
  const names = LANGS.map((l) => blackFridayCopyFor(l).navName.toLocaleUpperCase(l));
  const run = (
    <>
      {[0, 1, 2].flatMap((r) =>
        names.map((name, i) => (
          <span key={`${r}-${i}`} className="bf-tape-item">
            <span lang={LANGS[i]}>{name}</span>
            <span className="bf-tape-mark" />
            <span>−{percent}</span>
            <span className="bf-tape-mark" />
          </span>
        )),
      )}
    </>
  );
  return (
    <div className="bf-tapes" aria-hidden="true" data-bleed="">
      {["a", "b"].map((k) => (
        <div key={k} className={`bf-tape bf-tape-${k}`}>
          <div className="bf-tape-track" dir="ltr">
            <span className="bf-tape-run">{run}</span>
            <span className="bf-tape-run">{run}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Hero({ lang, t, view, fill, serverNow }: { lang: Lang; t: OccasionText; view: OccasionView; fill: Fill; serverNow: Date }) {
  const alt = screenAltFor(lang);
  const percent = percentText(lang, view.occasion.percent);
  const offWhat = view.occasion.plans === "regular" ? t.hero.offRegular : view.occasion.plans === "studio" ? t.hero.offStudio : t.hero.offAll;
  const scene = view.on ? t.hero.scene : t.hero.sceneOver;
  const offWord = (
    <span key="off" className="bf-tag-off">
      {t.hero.off}
    </span>
  );
  const bigPercent = (
    <span key="percent" dir="ltr" className="bf-tag-percent">
      {percent}
    </span>
  );
  return (
    <section className="bf-hero" aria-labelledby="bf-title" data-occasion-state={view.state} data-progress="exit">
      <div aria-hidden="true" className="bf-hero-sky" data-bleed="">
        <span className="bf-glow bf-glow-a" />
        <span className="bf-glow bf-glow-b" />
        <span className="bf-beam" />
        <span className="bf-grain" />
      </div>
      <GoldDust />
      <Tapes percent={percent} />
      <div className="bf-hero-stage">
        <Skyline />
        <figure className="bf-hero-phones" data-bleed="">
          <Phone screen={HERO_SCREENS[1]} alt={alt[HERO_SCREENS[1]]} className="bf-hp bf-hp-b" style={vars({ "--depth": 0.55 })} />
          <Phone screen={HERO_SCREENS[2]} alt={alt[HERO_SCREENS[2]]} className="bf-hp bf-hp-c" style={vars({ "--depth": 0.3 })} />
          <Phone screen={HERO_SCREENS[0]} alt={alt[HERO_SCREENS[0]]} className="bf-hp bf-hp-a" style={vars({ "--depth": 1 })} priority />
          <figcaption className="bf-hero-note">{t.hero.screensNote}</figcaption>
        </figure>
        <div className="bf-hero-copy">
          <span className="bf-pill">
            <Icon name="local_offer" size={18} />
            {fill(t.hero.eyebrow)}
          </span>
          <h1 id="bf-title" className="bf-h1">
            <span className="bf-h1-name">{t.hero.title}</span>
            {view.on ? (
              <>
                <span className="bf-tag-hang">
                  <span className="bf-tag">
                    <span aria-hidden="true" className="bf-tag-hole" />
                    <span className="bf-tag-face">{t.hero.offBefore ? [offWord, bigPercent] : [bigPercent, offWord]}</span>
                    <span aria-hidden="true" className="bf-tag-sheen" data-bleed="" />
                  </span>
                </span>
                <span className="bf-h1-what">{offWhat}</span>
              </>
            ) : (
              <span className="bf-h1-over">{t.hero.overTitle}</span>
            )}
          </h1>
          <div className="bf-cta-row">
            <StartLink lang={lang} t={t} />
            {view.on ? (
              <a href="#plans" className="bf-btn bf-btn-ghost">
                {t.hero.seePlans}
                <Icon name="arrow_downward" size={20} />
              </a>
            ) : (
              <Link href={localePath(lang, "/pricing")} className="bf-btn bf-btn-ghost">
                {t.hero.seePricing}
                <Icon name="arrow_forward" size={20} />
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="bf-hero-counter">
        <SceneStory scene={scene} fill={fill} className="bf-story-center" />
        <p className="bf-lead" data-reveal="">
          {fill(view.state === "live" ? t.hero.lead : view.state === "upcoming" ? t.hero.leadUpcoming : t.hero.overText)}
        </p>
        <p className="bf-days" data-reveal="">
          <Icon name="calendar_month" size={20} />
          {fill(t.hero.days)}
        </p>
        {view.on ? (
          <div className="bf-counter-row" data-reveal="">
            <Countdown
              lang={lang}
              to={(view.state === "live" ? new Date(view.end.getTime() + 1) : view.start).toISOString()}
              serverNow={serverNow.toISOString()}
              words={{ heading: view.state === "live" ? t.countdown.endsIn : t.countdown.startsIn, days: t.countdown.days, hours: t.countdown.hours, minutes: t.countdown.minutes, seconds: t.countdown.seconds, label: t.countdown.label }}
            />
            {view.codeShown ? (
              <CouponTicket code={view.occasion.couponCode} label={t.hero.codeLabel} copy={t.hero.copy} copied={t.hero.copied}>
                {view.state === "upcoming" ? (
                  <span className="bf-coupon-soon" data-code-from="">
                    <Icon name="schedule" size={18} />
                    {fill(t.hero.codeSoon)}
                  </span>
                ) : null}
              </CouponTicket>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** "You save $48", the amount kept left to right inside a right-to-left sentence. */
function SaveLine({ lang, t, saved }: { lang: Lang; t: OccasionText; saved: string }) {
  const mark = "⁣";
  const [before, after = ""] = formatMessage(lang, t.plans.save, { amount: mark }).split(mark);
  return (
    <>
      {before}
      <bdi dir="ltr">{saved}</bdi>
      {after}
    </>
  );
}

/** The price whose fall the scene shows: the featured plan's, else the first plan with a price with the code. */
function dropPrice(prices: Map<string, OccasionPlanPrice | null>, plans: PlanInfo[]): OccasionPlanPrice | null {
  const priced = plans.map((p) => prices.get(p.id) ?? null).filter((p): p is OccasionPlanPrice => Boolean(p?.offer));
  return priced.find((p) => p.plan.id === FEATURED_PLAN) ?? priced[0] ?? null;
}

/** The pinned scene: the normal price, a gold slash through it, its digits falling away and the offer's price counting down into place. */
function PriceDrop({ lang, t, fill, price, percent }: { lang: Lang; t: OccasionText; fill: Fill; price: OccasionPlanPrice; percent: number }) {
  const m = messagesFor(lang).plans;
  const per = formatMessage(lang, t.plans.period, { period: price.period === "month" ? m.month : m.year });
  const full = formatMoney(price.full);
  const offer = formatMoney(price.offer!);
  const saved = savedText(price);
  return (
    <div className="bf-drop" data-progress="pin">
      <div className="bf-drop-stage" data-mark={`−${percentText(lang, percent)}`}>
        <SceneStory scene={t.plans.scene} fill={fill} className="bf-drop-story" />
        <div className="bf-drop-price" aria-hidden="true" style={vars({ "--chars": Math.max(4, full.length, offer.length) })}>
          <span className="bf-drop-glow" data-bleed="" />
          <span className="bf-drop-plan">
            {price.plan.name} · {per}
            <s dir="ltr" className="bf-drop-struck">
              {full}
            </s>
          </span>
          <span className="bf-drop-was" dir="ltr">
            {[...full].map((ch, i) => (
              <span key={i} style={vars({ "--dx": ((i * 37) % 7) * 22 - 66, "--dy": 160 + ((i * 53) % 5) * 60, "--r": ((i * 29) % 9) * 14 - 56 })}>
                {ch}
              </span>
            ))}
            <span className="bf-drop-slash" />
          </span>
          <span className="bf-drop-now" dir="ltr" data-count-to={offer} data-count-from={full} data-count-start="0.42" data-count-span="0.4">
            {offer}
          </span>
          {saved ? <span className="bf-drop-save"><SaveLine lang={lang} t={t} saved={saved} /></span> : null}
        </div>
      </div>
    </div>
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
      className={`bf-plan ${featured ? "bf-plan-featured" : ""}`}
      data-reveal=""
    >
      <span aria-hidden="true" className="bf-plan-hook" />
      <div className="bf-plan-card">
        <span aria-hidden="true" className="bf-plan-hole" />
        {on && price?.offer ? (
          <span className="bf-plan-badge" dir="ltr">
            −{percentText(lang, percent)}
          </span>
        ) : null}
        <div className="bf-plan-name">
          <h3>{plan.name}</h3>
          {plan.tagline ? <span>{plan.tagline}</span> : null}
        </div>
        {price && on && price.offer ? (
          <div className="bf-plan-price">
            <span className="bf-plan-was">
              <span className="sr-only">{t.plans.was}: </span>
              <s dir="ltr">{formatMoney(price.full)}</s> {per}
            </span>
            <span className="bf-plan-now">
              <span className="sr-only">{t.plans.now}: </span>
              <span dir="ltr" className="bf-plan-amount">
                {formatMoney(price.offer)}
              </span>
              <span className="bf-plan-per">{per}</span>
            </span>
            {saved ? <span className="bf-plan-save"><SaveLine lang={lang} t={t} saved={saved} /></span> : null}
            <span className="bf-plan-first">{formatMessage(lang, t.plans.firstPayment, { price: formatMoney(price.full), period: per ?? "" })}</span>
          </div>
        ) : price ? (
          <div className="bf-plan-price">
            <span className="bf-plan-now">
              <span dir="ltr" className="bf-plan-amount">
                {formatMoney(price.full)}
              </span>
              <span className="bf-plan-per">{per}</span>
            </span>
          </div>
        ) : (
          <div className="bf-plan-price">
            <span className="bf-plan-amount bf-plan-request">{shown.price}</span>
            {on ? <span className="bf-plan-first">{t.plans.onRequest}</span> : null}
          </div>
        )}
        <ul className="bf-plan-limits">
          {lines.map((line) => (
            <li key={line.icon}>
              <Icon name={line.icon} size={20} />
              {line.text}
            </li>
          ))}
          <li>
            <Icon name="storefront" size={20} />
            {planStoresLineFor(lang, plan)}
          </li>
        </ul>
        {plan.highlights.length ? (
          <ul className="bf-plan-highlights">
            {plan.highlights.slice(0, 5).map((item) => (
              <li key={item}>
                <Icon name="check" size={16} />
                {item}
              </li>
            ))}
          </ul>
        ) : null}
        <AccountLink
          href={localePath(lang, "/sign-up")}
          signedInHref={family === "studio" ? "/studio" : "/dashboard/license#change-plan"}
          signedIn={formatMessage(lang, m.choose, { plan: plan.name })}
          className={`bf-btn ${featured ? "bf-btn-gold" : "bf-btn-line"} bf-plan-cta`}
        >
          {formatMessage(lang, m.startWith, { plan: plan.name })}
        </AccountLink>
      </div>
    </li>
  );
}

function PlanList({ lang, t, plans, prices, on, family, percent }: { lang: Lang; t: OccasionText; plans: PlanInfo[]; prices: Map<string, OccasionPlanPrice | null>; on: boolean; family: "regular" | "studio"; percent: number }) {
  return (
    <ul className="bf-rack" data-plan-family={family}>
      {plans.map((plan) => (
        <PlanCard key={plan.id} lang={lang} t={t} plan={plan} price={prices.get(plan.id) ?? null} on={on} family={family} percent={percent} />
      ))}
    </ul>
  );
}

function Plans({ lang, t, view, fill, regular, studio, prices, priceView, contact }: { lang: Lang; t: OccasionText; view: OccasionView; fill: Fill; regular: PlanInfo[]; studio: PlanInfo[]; prices: Map<string, OccasionPlanPrice | null>; priceView: PriceView; contact: Contact }) {
  const plansOn = view.occasion.plans;
  const families = (view.on ? (plansOn === "all" ? ["regular", "studio"] : [plansOn]) : ["regular", "studio"]) as ("regular" | "studio")[];
  const drop = view.on ? dropPrice(prices, families.flatMap((f) => (f === "studio" ? studio : regular))) : null;
  const panel = (family: "regular" | "studio"): ReactNode =>
    family === "studio" && !studio.length ? (
      <p className="bf-note-card" data-studio-on-request="">
        <Icon name="forum" size={22} />
        <span>{t.plans.studioNone}</span>
        <WhatsAppLink lines={contact.lines} country={contact.country} className="bf-note-link">
          WhatsApp
        </WhatsAppLink>
      </p>
    ) : (
      <PlanList lang={lang} t={t} plans={family === "studio" ? studio : regular} prices={prices} on={view.on} family={family} percent={view.occasion.percent} />
    );
  const tabs = families.map((f) => ({ id: f, label: f === "regular" ? t.plans.regular : t.plans.studio, icon: f === "regular" ? ("apps" as const) : ("dashboard_customize" as const), note: f === "regular" ? t.plans.regularText : t.plans.studioText }));
  return (
    <section className="bf-scene bf-plans" aria-labelledby="bf-plans" id="plans">
      {drop ? <PriceDrop lang={lang} t={t} fill={fill} price={drop} percent={view.occasion.percent} /> : null}
      <div className="bf-wrap bf-plans-body">
        {view.on && !drop ? <SceneStory scene={t.plans.scene} fill={fill} /> : null}
        <SectionHead id="bf-plans" eyebrow={t.plans.eyebrow} title={fill(view.on ? t.plans.title : t.plans.titleOver)} text={view.on ? t.plans.text : t.plans.textOver} />
        {families.length > 1 ? <Tabs label={t.plans.switchLabel} items={tabs} panels={families.map(panel)} /> : panel(families[0]!)}
        <p className="bf-small">{currencyNote(priceView, lang)}</p>
        <Link href={localePath(lang, "/pricing")} className="bf-textlink">
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

function Kinds({ lang, t, view }: { lang: Lang; t: OccasionText; view: OccasionView }) {
  const studioIds = new Set(STUDIO_SOLUTIONS.map((s) => s.id));
  const alt = screenAltFor(lang);
  const lp = (path: string) => localePath(lang, path);
  const solutions = allSolutionsFor(lang);
  const percent = percentText(lang, view.occasion.percent);
  return (
    <section className="bf-scene bf-kinds" aria-labelledby="bf-kinds" id="kinds">
      <div className="bf-wrap">
        <div className="bf-split">
          <SceneStory scene={t.kinds.scene} fill={(s) => s} />
          <SectionHead id="bf-kinds" eyebrow={t.kinds.eyebrow} title={t.kinds.title} text={t.kinds.text} />
        </div>
      </div>
      <Shelf label={t.kinds.listLabel} prev={t.kinds.prev} next={t.kinds.next}>
        <ul className="bf-shelf-list">
          {solutions.map((s, i) => {
            const studio = studioIds.has(s.id);
            const screen = KIND_SCREENS[s.id];
            return (
              <li key={s.id} className="bf-shelf-item">
                <article className="bf-display" aria-labelledby={`bf-kind-${s.id}`} data-kind={s.id} style={vars({ "--hue": (i * 47) % 360 })}>
                  <div className="bf-display-window">
                    <span aria-hidden="true" className="bf-display-light" />
                    {screen ? (
                      <Phone screen={screen} alt={alt[screen]} className="bf-display-phone" sizes="(max-width: 640px) 46vw, 200px" />
                    ) : (
                      <span aria-hidden="true" className="bf-emblem">
                        <span className="bf-emblem-ring" />
                        <Icon name={s.icon} size={64} />
                        <span className="bf-emblem-orbit">
                          {s.highlights.slice(0, 3).map((h) => (
                            <Icon key={h.title} name={h.icon} size={20} />
                          ))}
                        </span>
                      </span>
                    )}
                    {view.on ? (
                      <span aria-hidden="true" className="bf-display-tag" dir="ltr">
                        −{percent}
                      </span>
                    ) : null}
                  </div>
                  <div className="bf-display-body">
                    <span className={`bf-chip ${studio ? "bf-chip-hot" : ""}`}>
                      <Icon name={studio ? "dashboard_customize" : "apps"} size={16} />
                      {studio ? t.kinds.inStudio : t.kinds.regularApp}
                    </span>
                    <h3 id={`bf-kind-${s.id}`}>{s.appsTitle}</h3>
                    <p>{s.summary}</p>
                    <details className="bf-display-more">
                      <summary>
                        {t.kinds.more}
                        <Icon name="expand_more" size={20} />
                      </summary>
                      <ul>
                        {s.highlights.slice(0, 3).map((h) => (
                          <li key={h.title}>
                            <Icon name={h.icon} size={20} />
                            <span>
                              <strong>{h.title}</strong>
                              {h.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                    <div className="bf-display-links">
                      <Link href={lp(`/solutions/${s.id}`)} className="bf-btn bf-btn-small bf-btn-gold">
                        {capitalize(lang, formatMessage(lang, t.kinds.solution, { apps: s.apps }))}
                        <Icon name="arrow_forward" size={18} />
                      </Link>
                      <Link href={`${lp(studio ? "/demo/studio" : "/demo")}#${s.demoSlug}`} className="bf-btn bf-btn-small bf-btn-line">
                        <Icon name="smartphone" size={18} />
                        {t.kinds.demo}
                      </Link>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </Shelf>
    </section>
  );
}

function Steps({ lang, t, view, fill }: { lang: Lang; t: OccasionText; view: OccasionView; fill: Fill }) {
  const alt = screenAltFor(lang);
  return (
    <section className="bf-scene bf-steps" aria-labelledby="bf-steps" id="steps">
      <div className="bf-wrap">
        <div className="bf-split">
          <SceneStory scene={t.steps.scene} fill={fill} />
          <SectionHead id="bf-steps" eyebrow={t.steps.eyebrow} title={t.steps.title} text={t.steps.text} />
        </div>
        <div className="bf-receipt-stage">
          <div className="bf-printer">
            <span aria-hidden="true" className="bf-printer-slot" />
            <div className="bf-receipt">
              <p className="bf-r-head" data-print="">
                <Icon name="receipt_long" size={22} />
                <span>{t.steps.receipt}</span>
              </p>
              <p className="bf-r-meta" data-print="">
                <span>{t.navName}</span>
                <span>{fill(t.hero.days)}</span>
              </p>
              <ol className="bf-r-lines">
                {t.steps.items.map(([title, text, time], i) => (
                  <li key={title} data-print="">
                    <h3 className="bf-r-item">
                      <span className="bf-r-no" dir="ltr">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <Icon name={STEP_ICONS[i]!} size={20} />
                      <span className="bf-r-title">{title}</span>
                      <span aria-hidden="true" className="bf-r-leader" />
                      <span className="bf-r-time">{time}</span>
                    </h3>
                    <p className="bf-r-text">{text}</p>
                  </li>
                ))}
              </ol>
              {view.on ? (
                <p className="bf-r-total" data-print="">
                  <span>{t.steps.total}</span>
                  <span aria-hidden="true" className="bf-r-leader" />
                  <span dir="ltr">−{percentText(lang, view.occasion.percent)}</span>
                </p>
              ) : null}
              <p className="bf-r-thanks" data-print="">
                {t.steps.thanks}
              </p>
              <Barcode seed={`${t.navName}${view.occasion.startsOn}`} className="bf-r-barcode" />
            </div>
          </div>
          <Phone screen={RECEIPT_SCREEN} alt={alt[RECEIPT_SCREEN]} className="bf-receipt-phone" sizes="(max-width: 640px) 50vw, 240px" />
        </div>
      </div>
    </section>
  );
}

function Included({ lang, t }: { lang: Lang; t: OccasionText }) {
  return (
    <section className="bf-scene bf-included" aria-labelledby="bf-included" id="included">
      <div className="bf-wrap">
        <div className="bf-split">
          <SceneStory scene={t.included.scene} fill={(s) => s} />
          <SectionHead id="bf-included" eyebrow={t.included.eyebrow} title={t.included.title} text={t.included.text} />
        </div>
        <div aria-hidden="true" className="bf-box" data-progress="pass" data-bleed="">
          <span className="bf-box-rays" />
          <span className="bf-box-lid">
            <span className="bf-box-bow" />
          </span>
          <span className="bf-box-base">
            <span className="bf-box-ribbon" />
          </span>
        </div>
        <div className="bf-groups">
          {INCLUDED_GROUPS.map((group, gi) => {
            const words = t.included.groups[gi]!;
            return (
              <details key={group.id} className="bf-group" data-included={group.id} data-reveal="" style={vars({ "--i": gi % 3 })}>
                <summary>
                  <span className="bf-group-icon">
                    <Icon name={group.icon} size={26} />
                  </span>
                  <span className="bf-group-head">
                    <h3 id={`bf-group-${group.id}`}>{words.title}</h3>
                    <span className="bf-group-text">{words.text}</span>
                  </span>
                  <span className="bf-group-count">
                    {formatMessage(lang, t.included.count, { count: group.items.length })}
                    <Icon name="expand_more" size={20} />
                  </span>
                </summary>
                <ul className="bf-group-items">
                  {group.items.map((icon: IconName, ii) => {
                    const [title, text] = words.items[ii]!;
                    return (
                      <li key={title}>
                        <Icon name={icon} size={20} />
                        <span>
                          <strong>{title}</strong>
                          {text}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Terms({ lang, t, view, fill }: { lang: Lang; t: OccasionText; view: OccasionView; fill: Fill }) {
  return (
    <section className="bf-scene bf-terms" aria-labelledby="bf-terms" id="terms">
      <div className="bf-wrap bf-wrap-narrow">
        <div className="bf-split">
          <SceneStory scene={t.terms.scene} fill={fill} />
          <SectionHead id="bf-terms" eyebrow={t.terms.eyebrow} title={t.terms.title} text={view.on ? t.terms.text : undefined} />
        </div>
        <div className="bf-bigcoupon" data-reveal="">
          <div className="bf-bigcoupon-stub">
            {view.on ? (
              <span className="bf-bigcoupon-percent" dir="ltr">
                −{percentText(lang, view.occasion.percent)}
              </span>
            ) : null}
            <span className="bf-bigcoupon-label">{t.hero.codeLabel}</span>
            {view.codeShown ? (
              <span className="bf-bigcoupon-code" dir="ltr">
                {view.occasion.couponCode}
              </span>
            ) : (
              <span className="bf-stamp">{t.terms.overStamp}</span>
            )}
            <Barcode seed={view.codeShown ? view.occasion.couponCode : `${view.occasion.startsOn}${view.occasion.endsOn}`} />
            <span className="bf-bigcoupon-days">{fill(t.hero.days)}</span>
          </div>
          <div className="bf-bigcoupon-back">
            {view.on ? (
              <ol className="bf-terms-list" data-terms="">
                {[plansLine(view.occasion, t.terms), ...t.terms.items].map((item, i) => (
                  <li key={i}>
                    <Icon name={i === 0 ? "percent" : TERM_ICONS[i - 1]!} size={22} />
                    <span>{fill(item)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="bf-terms-over" data-terms-over="">
                <Icon name="event_busy" size={22} />
                <span>{fill(t.terms.over)}</span>
              </p>
            )}
            <p className="bf-small">
              <Link href={localePath(lang, "/refund")} className="bf-textlink">
                {t.terms.refund}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq({ t, items }: { t: OccasionText; items: { q: string; a: string }[] }) {
  return (
    <section className="bf-scene bf-faq" aria-labelledby="bf-faq" id="faq">
      <div className="bf-wrap">
        <div className="bf-split">
          <SceneStory scene={t.faq.scene} fill={(s) => s} />
          <SectionHead id="bf-faq" title={t.faq.title} />
        </div>
        <div className="bf-tickets">
          {items.map((item, i) => (
            <details key={item.q} className="bf-ticket" data-reveal="" style={vars({ "--i": i % 2 })}>
              <summary>
                <span className="bf-ticket-no" dir="ltr">
                  № {String(i + 1).padStart(2, "0")}
                </span>
                <h3>{item.q}</h3>
                <Icon name="expand_more" size={24} />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Final({ lang, t, view, fill }: { lang: Lang; t: OccasionText; view: OccasionView; fill: Fill }) {
  return (
    <section className="bf-scene bf-final" aria-labelledby="bf-final">
      {view.on ? <Confetti /> : null}
      <span aria-hidden="true" className="bf-final-glow" data-bleed="" />
      <div className="bf-wrap bf-final-body">
        <SceneStory scene={t.final.scene} fill={fill} className="bf-story-center" />
        <h2 id="bf-final" className="bf-h2 bf-final-title" data-reveal="">
          {fill(view.on ? t.final.title : t.final.titleOver)}
        </h2>
        <p className="bf-sub" data-reveal="">
          {fill(view.on ? t.final.text : t.final.textOver)}
        </p>
        {view.codeShown ? (
          <span dir="ltr" className="bf-final-code" data-reveal="">
            {view.occasion.couponCode}
          </span>
        ) : null}
        <div className="bf-cta-row bf-cta-center" data-reveal="">
          <StartLink lang={lang} t={t} />
          <Link href={localePath(lang, "/pricing")} className="bf-btn bf-btn-ghost">
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
    <div className="bf" data-occasion="black_friday" data-bf="">
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
      <BlackFridayMotion />
      <SiteHeader current="black-friday" lang={lang} white={false} />
      <main className="bf-main">
        <Hero lang={lang} t={t} view={view} fill={fill} serverNow={now} />
        <Plans lang={lang} t={t} view={view} fill={fill} regular={regular} studio={studio} prices={prices} priceView={priceView} contact={contact} />
        <Kinds lang={lang} t={t} view={view} />
        <Steps lang={lang} t={t} view={view} fill={fill} />
        <Included lang={lang} t={t} />
        <Terms lang={lang} t={t} view={view} fill={fill} />
        <Faq t={t} items={faq} />
        <Final lang={lang} t={t} view={view} fill={fill} />
        <ContactBand lang={lang} />
      </main>
      <SiteFooter full lang={lang} />
    </div>
  );
}
