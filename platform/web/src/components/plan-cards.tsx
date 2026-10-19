import Link from "next/link";
import { FEATURED_PLAN, planLimitLines, planPrice, planStores, planStoresLine, type PlanInfo, type PriceView } from "@/lib/plans";

/** 52 The line under the plans: which currency the prices are in, and what a card is charged in. */
export function currencyNote(view: PriceView): string {
  return view.display === "EGP"
    ? "Prices in Egyptian pounds (EGP). Card payments go through Kashier."
    : "Prices in US dollars. Card payments go through Kashier and are charged in Egyptian pounds (EGP); your bank converts the amount.";
}
import { StoreMarks } from "./brand-marks";
import { Icon } from "./icon";

/**
 * 32 The plans side by side, as on the pricing page and the home page: name,
 * price, key limits, the stores (41), highlights and a button. Four columns
 * on wide screens, two on tablets, and a row to swipe through on phones.
 * 52 Prices in the visitor's currency: pounds in Egypt, dollars elsewhere.
 */
export function PlanCards({ plans, view, headingLevel = 2 }: { plans: PlanInfo[]; view: PriceView; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <ul
      aria-label="Plans"
      data-pricing-plans=""
      data-currency={view.display}
      className="-mx-4 flex list-none snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pt-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-4"
    >
      {plans.map((plan) => {
        const featured = plan.id === FEATURED_PLAN;
        const shown = planPrice(plan, view);
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
              <span className="absolute -top-3.5 left-6 flex items-center gap-1 rounded-full bg-midnight py-1 pr-3 pl-2 text-xs font-bold text-white">
                <Icon name="star" size={16} filled className="text-ember" />
                Most popular
              </span>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Heading className="m-0 text-xl font-extrabold tracking-[-0.3px]">{plan.name}</Heading>
              <span className="min-h-[2lh] text-sm leading-snug text-muted">{plan.tagline}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-1.5">
              <span className={`font-extrabold tracking-[-0.5px] ${shown.period ? "text-[34px]" : "text-[26px]"}`}>{shown.price}</span>
              {shown.period ? <span className="text-[15px] font-medium text-muted">/ {shown.period}</span> : null}
            </div>
            <ul aria-label={`${plan.name} limits`} className="m-0 flex list-none flex-col gap-2 rounded-xl bg-sand p-3.5 text-sm font-semibold text-ink-2">
              {planLimitLines(plan).map((line) => (
                <li key={line.icon} className="flex items-center gap-2.5">
                  <Icon name={line.icon} size={20} className="text-ink-4" />
                  {line.text}
                </li>
              ))}
            </ul>
            {/* 41 The stores the plan's apps can be on, and who publishes them. */}
            <div className="flex flex-col gap-2" data-plan-stores="">
              <span className="text-xs font-bold tracking-[0.8px] text-muted uppercase">Publish to</span>
              <StoreMarks stores={stores} label={`${plan.name} app stores`} size={15} />
              <span className="text-[13px] font-semibold text-ink-4">{planStoresLine(plan)}</span>
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
            <Link
              href="/sign-up"
              className={`mt-auto flex h-[50px] items-center justify-center rounded-xl text-base font-bold no-underline transition-colors ${
                featured ? "bg-midnight text-white hover:bg-ink-3 hover:text-white" : "border border-midnight text-midnight hover:bg-midnight hover:text-white"
              }`}
            >
              Start with {plan.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
