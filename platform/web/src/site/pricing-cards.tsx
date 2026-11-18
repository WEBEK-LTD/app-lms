import type { ReactNode } from "react";
import { AccountLink } from "@/components/account-link";
import { StoreMarks } from "@/components/brand-marks";
import { Icon } from "@/components/icon";
import { planLimitLinesFor, planPriceFor, planStoresLineFor, storageText } from "@/components/plan-cards";
import { choiceLabels, pagesText } from "@/components/studio-marketing";
import { WhatsAppLink } from "@/components/whatsapp-link";
import type { Contact } from "@/lib/contact";
import { periodPrices } from "@/lib/billing/period-prices";
import type { PeriodKey } from "@/lib/billing/periods";
import { hasFeature, planStores, STUDIO_PLAN_CHOICES, type PlanInfo, type PriceView } from "@/lib/plans";
import { formatMessage, messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";

/**
 * 154 The pricing page's plan cards in their Day and night look (pricing.css):
 * compact, the plan's first highlights and the rest folded under "See
 * everything (+N)", with nothing left out: a regular plan's limits and app
 * stores, a Studio plan's stores and the choices it doesn't include are in
 * the fold. The app's on the day, Studio's on the night band, where "Every
 * Studio plan has" widens to fill the row when there are one or two Studio
 * plans. The regular cards keep `data-pricing-plans`, the Studio cards
 * `data-studio-plans`, and both the price, per month, saving and "Not sold
 * for this period" marks the other pages' cards have.
 */

/** How many highlights a card shows before the fold. */
export const CARD_HIGHLIGHTS = 4;

type Family = "regular" | "studio";

/** A line on a card: its words and, for a Studio choice, that it's one (`data-included`). */
interface Line {
  text: string;
  included?: boolean;
}

/** A card's lines in order: the regular plan's highlights; a Studio plan's pages, phones, choices, highlights and storage. */
export function cardLines(lang: Lang, plan: PlanInfo, family: Family): Line[] {
  if (family === "regular") return plan.highlights.map((text) => ({ text }));
  const words = messagesFor(lang).plans;
  const choices = choiceLabels(lang);
  const on = (id: string) => (plan.features as readonly string[]).includes(id);
  return [
    { text: pagesText(lang, plan) },
    { text: hasFeature(plan, "ios") ? words.androidIos : words.android },
    ...STUDIO_PLAN_CHOICES.filter((id) => choices[id] && on(id)).map((id) => ({ text: choices[id]!.label, included: true })),
    ...plan.highlights.map((text) => ({ text })),
    { text: formatMessage(lang, words.storage, { size: storageText(lang, plan.limits.storageGb) }) },
  ];
}

/** The Studio choices a plan doesn't include. */
export function missingChoices(lang: Lang, plan: PlanInfo): string[] {
  const choices = choiceLabels(lang);
  return STUDIO_PLAN_CHOICES.filter((id) => choices[id] && !(plan.features as readonly string[]).includes(id)).map((id) => choices[id]!.label);
}

function Tick({ off = false }: { off?: boolean }) {
  return <Icon name={off ? "close" : "check"} size={18} className={`pr-tick ${off ? "is-off" : ""}`} />;
}

function LineItem({ line }: { line: Line }) {
  return (
    <li data-included={line.included ? "" : undefined}>
      <Tick />
      <bdi className="min-w-0">{line.text}</bdi>
    </li>
  );
}

/**
 * 154 The picker's hint under a period: "Pay once" for life, else the
 * saving the plans of both products have for it, never more than a plan
 * saves: "Save 20%" when they save about the same (the least of them, as
 * prices rounded to EGP 50 move a saving by a point or two), "Save up to
 * 25%" when they differ more; none when no plan saves on it (monthly).
 */
export function periodHint(lang: Lang, plans: PlanInfo[], view: PriceView, key: PeriodKey): string | null {
  const w = messagesFor(lang).plans;
  if (key === "lifetime") return w.payOnce;
  const savings = plans.flatMap((plan) => periodPrices(plan, view).filter((p) => p.key === key).map((p) => p.saving ?? 0));
  const top = Math.max(0, ...savings);
  if (!top) return null;
  const least = Math.min(...savings);
  return least > 0 && top - least <= 2 ? formatMessage(lang, w.save, { percent: least }) : formatMessage(lang, w.saveUpTo, { percent: top });
}

/** A card's price for the period chosen (else its main one), per month and the saving, or why it isn't sold for it; on request, how it's agreed. */
function CardPrice({ plan, view, lang, period }: { plan: PlanInfo; view: PriceView; lang: Lang; period: PeriodKey | null }) {
  const m = messagesFor(lang).plans;
  const shown = planPriceFor(lang, plan, view, period);
  const chosen = period ? periodPrices(plan, view).find((p) => p.key === period) : null;
  return (
    <div className="pr-plan-money">
      <div className="pr-plan-price" data-plan-price="">
        {shown.period ? (
          <>
            <span dir="ltr" className="pr-amt">
              {shown.price}
            </span>
            <span className="pr-per">{formatMessage(lang, m.perPeriod, { period: shown.period })}</span>
          </>
        ) : (
          <span className="pr-amt is-request">{shown.price}</span>
        )}
      </div>
      {!shown.period ? (
        <div className="pr-plan-sub">
          <span>{m.onRequestNote}</span>
        </div>
      ) : chosen && (chosen.perMonth || chosen.saving) ? (
        <div className="pr-plan-sub" data-per-month="">
          {chosen.perMonth ? <span dir="auto">{formatMessage(lang, m.perMonth, { price: chosen.perMonth })}</span> : null}
          {chosen.saving ? <span className="pr-save">{formatMessage(lang, m.save, { percent: chosen.saving })}</span> : null}
        </div>
      ) : period && !chosen ? (
        <div className="pr-plan-sub">
          <span data-not-in-period="">{m.notInPeriod}</span>
        </div>
      ) : period === "lifetime" ? (
        <div className="pr-plan-sub">
          <span className="pr-life">
            <Icon name="diamond" size={15} filled />
            {m.periodLifetime}
          </span>
        </div>
      ) : (
        <div className="pr-plan-sub" aria-hidden="true">
          {" "}
        </div>
      )}
    </div>
  );
}

/** One compact card. */
function PlanCard({ plan, family, view, lang, period }: { plan: PlanInfo; family: Family; view: PriceView; lang: Lang; period: PeriodKey | null }) {
  const m = messagesFor(lang).plans;
  const night = family === "studio";
  const featured = plan.featured === true;
  const lines = cardLines(lang, plan, family);
  const shown = lines.slice(0, CARD_HIGHLIGHTS);
  const rest = lines.slice(CARD_HIGHLIGHTS);
  const limits = family === "regular" ? planLimitLinesFor(lang, plan) : [];
  const missing = family === "studio" ? missingChoices(lang, plan) : [];
  // Everything in the fold, counted: the other lines, a regular plan's limits, the stores, what a Studio plan doesn't include.
  const more = rest.length + limits.length + 1 + missing.length;
  return (
    <li data-plan={plan.id} className={`pr-plan ${featured ? "is-featured" : ""}`}>
      {featured ? (
        <span className="pr-plan-badge">
          <Icon name="star" size={15} filled />
          {plan.badge || m.mostPopular}
        </span>
      ) : null}
      <div className="pr-plan-head">
        {/* 133 The team's words may be in another script than the page's: each keeps its own direction. */}
        <h3 className="pr-plan-name">
          <bdi>{plan.name}</bdi>
        </h3>
        {plan.tagline ? (
          <p dir="auto" className="pr-plan-tag">
            {plan.tagline}
          </p>
        ) : null}
      </div>
      <CardPrice plan={plan} view={view} lang={lang} period={period} />
      <ul className="pr-plan-list">
        {shown.map((line) => (
          <LineItem key={line.text} line={line} />
        ))}
      </ul>
      <details className="pr-more" data-plan-more="">
        <summary>
          <span>{m.seeEverything}</span>
          <span className="pr-cnt" dir="ltr">
            +{more}
          </span>
          <Icon name="expand_more" size={18} className="pr-chev" />
        </summary>
        {rest.length ? (
          <ul className="pr-plan-list is-more">
            {rest.map((line) => (
              <LineItem key={line.text} line={line} />
            ))}
          </ul>
        ) : null}
        {limits.length ? (
          <ul aria-label={formatMessage(lang, m.limits, { plan: plan.name })} className="pr-limits">
            {limits.map((line) => (
              <li key={line.icon}>
                <Icon name={line.icon} size={18} />
                {line.text}
              </li>
            ))}
          </ul>
        ) : null}
        {/* 41 The stores the plan's apps can be on, and who publishes them. */}
        <div className="pr-stores" data-plan-stores="">
          <span className="pr-stores-label">{m.publishTo}</span>
          <StoreMarks stores={planStores(plan).stores} label={formatMessage(lang, m.stores, { plan: plan.name })} size={14} tone={night ? "dark" : "light"} />
          <span className="pr-stores-line">{planStoresLineFor(lang, plan)}</span>
        </div>
        {/* 146 What a Studio plan doesn't include. */}
        {missing.length ? (
          <div className="pr-missing" data-not-included="">
            <span className="pr-missing-title">{formatMessage(lang, messagesFor(lang).studio.notInPlan, { count: missing.length })}</span>
            <ul className="pr-plan-list is-more">
              {missing.map((label) => (
                <li key={label} className="is-off">
                  <Tick off />
                  <span>
                    {label}
                    <span className="sr-only">{formatMessage(lang, messagesFor(lang).pricing.notIncluded, { plan: plan.name })}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </details>
      <AccountLink
        href={localePath(lang, "/sign-up")}
        // 146 The period chosen on the pricing page goes with it to the dashboard's plan cards; a Studio plan is chosen in Studio.
        signedInHref={night ? "/studio" : `/dashboard/license${period ? `?period=${period}` : ""}#change-plan`}
        signedIn={formatMessage(lang, m.choose, { plan: plan.name })}
        className={`pr-plan-cta ${featured ? "is-primary" : ""}`}
      >
        {formatMessage(lang, m.startWith, { plan: plan.name })}
      </AccountLink>
    </li>
  );
}

/** The regular apps' plans, on the day. */
export function RegularPlanCards({ plans, view, lang, period }: { plans: PlanInfo[]; view: PriceView; lang: Lang; period: PeriodKey | null }) {
  return (
    <ul aria-label={messagesFor(lang).plans.list} data-pricing-plans="" data-currency={view.display} className="pr-grid">
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} family="regular" view={view} lang={lang} period={period} />
      ))}
    </ul>
  );
}

/** Studio's own plans on the night band, or on request; then what every Studio plan has, widened to fill the row. */
export function StudioPlanCards({ plans, view, lang, period, contact }: { plans: PlanInfo[]; view: PriceView; lang: Lang; period: PeriodKey | null; contact: Contact }) {
  const s = messagesFor(lang).studio;
  const wa = (chunk: string): ReactNode => (
    <WhatsAppLink lines={contact.lines} country={contact.country}>
      {chunk}
    </WhatsAppLink>
  );
  return (
    <div data-studio-plans="">
      <ul aria-label={s.plansTitle} className="pr-grid">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} family="studio" view={view} lang={lang} period={period} />
        ))}
        {plans.length ? null : (
          <li className="pr-plan pr-on-request" data-studio-on-request="">
            <Icon name="forum" size={24} className="pr-on-request-icon" />
            <p>{richText(s.plansOnRequest, { link: wa })}</p>
          </li>
        )}
        {/* Grows to fill the row: beside one or two Studio plans its list takes two or three columns (pricing.css). */}
        <li className="pr-plan pr-basics" data-studio-basics="">
          <div className="pr-basics-head">
            <span className="pr-basics-mark">
              <Icon name="dashboard_customize" size={19} />
            </span>
            <h3 className="pr-plan-name">{s.everyPlan}</h3>
          </div>
          <ul className="pr-plan-list">
            {[s.base1, s.base2, s.base3, s.base4, s.base5, s.base6, s.base7, s.base8].map((item) => (
              <li key={item}>
                <Tick />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </div>
  );
}
