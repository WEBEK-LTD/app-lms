import { AccountLink } from "./account-link";
import { StoreMarks } from "./brand-marks";
import { Icon } from "./icon";
import { DEFAULT_LANG, formatMessage, formatNumber, messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";
import type { IconName } from "./icon-names";
import { FEATURED_PLAN, hasFeature, PLAN_INFO, planLimitLines, planPrice, planStores, planStoresLine, type PlanInfo, type PriceView } from "@/lib/plans";

/** 52 The line under the plans: which currency the prices are in, and what a card is charged in. */
export function currencyNote(view: PriceView, lang: Lang = DEFAULT_LANG): string {
  const m = messagesFor(lang).plans;
  return view.display === "EGP" ? m.currencyEgp : m.currencyUsd;
}
/** 55 "20 GB", "1 TB", "Unlimited storage" in a language. */
export function storageText(lang: Lang, gb: number | null): string {
  const m = messagesFor(lang).plans;
  if (gb === null) return m.unlimitedStorage;
  if (gb >= 1000 && gb % 1000 === 0) return formatMessage(lang, m.tb, { size: formatNumber(lang, gb / 1000) });
  return formatMessage(lang, m.gb, { size: formatNumber(lang, gb, { maximumFractionDigits: 3 }) });
}

/** 55 A plan's key limits (lib/plans.ts `planLimitLines`) in a language. */
export function planLimitLinesFor(lang: Lang, plan: PlanInfo): { icon: IconName; text: string }[] {
  if (lang === "en") return planLimitLines(plan);
  const m = messagesFor(lang).plans;
  const users = plan.limits.appUsers;
  const languages = plan.limits.languages;
  return [
    { icon: "group", text: users === null ? m.unlimitedUsers : formatMessage(lang, m.upToUsers, { count: formatNumber(lang, users) }) },
    { icon: "language", text: languages === null ? m.allLanguages : formatMessage(lang, m.languages, { count: languages }) },
    { icon: "smartphone", text: hasFeature(plan, "ios") ? m.androidIos : m.android },
    { icon: "photo_library", text: formatMessage(lang, m.storage, { size: storageText(lang, plan.limits.storageGb) }) },
  ];
}

/** 55 "5 app stores · We publish for you" in a language. */
export function planStoresLineFor(lang: Lang, plan: PlanInfo): string {
  if (lang === "en") return planStoresLine(plan);
  const m = messagesFor(lang).plans;
  const { stores, publisher } = planStores(plan);
  return formatMessage(lang, m.storesLine, { count: stores.length, who: publisher === "us" ? m.weePublish : m.youPublish });
}

/** 55 A plan's price and period in a language; the price itself is the same in every language ("EGP 1,500", "$29"). */
export function planPriceFor(lang: Lang, plan: PlanInfo, view: PriceView): { price: string; period: string | null } {
  const shown = planPrice(plan, view);
  if (lang === "en") return shown;
  const m = messagesFor(lang).plans;
  if (!shown.period) return { price: shown.price === PLAN_INFO[plan.id].price ? m.onRequest : shown.price, period: null };
  return { price: shown.price, period: shown.period === "month" ? m.month : m.year };
}

/**
 * 32 The plans side by side, as on the pricing page and the home page: name,
 * price, key limits, the stores (41), highlights and a button. Four columns
 * on wide screens, two on tablets, and a row to swipe through on phones.
 * 52 Prices in the visitor's currency: pounds in Egypt, dollars elsewhere.
 * 55 Words in the page's language (the plans' texts already translated, lib/marketing-lang.ts `planFor`).
 */
export function PlanCards({ plans, view, headingLevel = 2, lang = DEFAULT_LANG }: { plans: PlanInfo[]; view: PriceView; headingLevel?: 2 | 3; lang?: Lang }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const m = messagesFor(lang).plans;
  return (
    <ul
      aria-label={m.list}
      data-pricing-plans=""
      data-currency={view.display}
      className="-mx-4 flex list-none snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pt-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-4"
    >
      {plans.map((plan) => {
        const featured = plan.id === FEATURED_PLAN;
        const shown = planPriceFor(lang, plan, view);
        const { stores } = planStores(plan);
        return (
          <li
            key={plan.id}
            data-plan={plan.id}
            className={`relative flex w-[84%] max-w-[340px] flex-none snap-start flex-col gap-5 rounded-[22px] p-6 transition-[box-shadow,border-color] duration-200 sm:w-auto sm:max-w-none ${
              featured
                ? "border-2 border-midnight bg-white shadow-[0_28px_56px_-30px_rgba(14,13,36,0.45)]"
                : "border border-line bg-white hover:border-line-strong hover:shadow-[0_20px_40px_-28px_rgba(14,13,36,0.35)]"
            }`}
          >
            {featured ? (
              <span className="absolute -top-3.5 start-6 flex items-center gap-1 rounded-full bg-midnight py-1 ps-2 pe-3 text-xs font-bold text-white">
                <Icon name="star" size={16} filled className="text-ember" />
                {m.mostPopular}
              </span>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Heading className="m-0 text-xl font-extrabold tracking-[-0.3px]">{plan.name}</Heading>
              <span className="min-h-[2lh] text-sm leading-snug text-muted">{plan.tagline}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-1.5">
              <span dir={shown.period ? "ltr" : undefined} className={`font-extrabold tracking-[-0.5px] ${shown.period ? "text-[34px]" : "text-[26px]"}`}>
                {shown.price}
              </span>
              {shown.period ? <span className="text-[15px] font-medium text-muted">{formatMessage(lang, m.perPeriod, { period: shown.period })}</span> : null}
            </div>
            <ul aria-label={formatMessage(lang, m.limits, { plan: plan.name })} className="m-0 flex list-none flex-col gap-2 rounded-xl bg-sand p-3.5 text-sm font-semibold text-ink-2">
              {planLimitLinesFor(lang, plan).map((line) => (
                <li key={line.icon} className="flex items-center gap-2.5">
                  <Icon name={line.icon} size={20} className="text-ink-4" />
                  {line.text}
                </li>
              ))}
            </ul>
            {/* 41 The stores the plan's apps can be on, and who publishes them. */}
            <div className="flex flex-col gap-2" data-plan-stores="">
              <span className="text-xs font-bold tracking-[0.8px] text-muted uppercase">{m.publishTo}</span>
              <StoreMarks stores={stores} label={formatMessage(lang, m.stores, { plan: plan.name })} size={15} />
              <span className="text-[13px] font-semibold text-ink-4">{planStoresLineFor(lang, plan)}</span>
            </div>
            <ul className="m-0 flex list-none flex-col gap-2.5 border-t border-line-soft p-0 pt-5 text-[15px]">
              {plan.highlights.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span className="mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full bg-success-bg text-success">
                    <Icon name="check" size={15} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <AccountLink
              href={localePath(lang, "/sign-up")}
              signedInHref="/dashboard/license#change-plan"
              signedIn={formatMessage(lang, m.choose, { plan: plan.name })}
              className={`mt-auto flex h-[50px] items-center justify-center rounded-xl text-base font-bold no-underline transition-colors ${
                featured ? "bg-midnight text-white hover:bg-ink-3 hover:text-white" : "border border-midnight text-midnight hover:bg-midnight hover:text-white"
              }`}
            >
              {formatMessage(lang, m.startWith, { plan: plan.name })}
            </AccountLink>
          </li>
        );
      })}
    </ul>
  );
}
