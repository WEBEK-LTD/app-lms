import Link from "next/link";
import { FEATURED_PLAN, planLimitLines, planPrice, type PlanInfo } from "@/lib/plans";
import { Icon } from "./icon";

/**
 * 32 The plans side by side, as on the pricing page and the home page: name,
 * price, key limits, highlights and a button. Four columns on wide screens,
 * two on tablets, and a row to swipe through on phones.
 */
export function PlanCards({ plans, headingLevel = 2 }: { plans: PlanInfo[]; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <ul
      aria-label="Plans"
      data-pricing-plans=""
      className="-mx-4 flex list-none snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pt-3 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-4"
    >
      {plans.map((plan) => {
        const featured = plan.id === FEATURED_PLAN;
        const shown = planPrice(plan);
        return (
          <li
            key={plan.id}
            data-plan={plan.id}
            className={`relative flex w-[84%] max-w-[340px] flex-none snap-start flex-col gap-5 rounded-[20px] p-6 sm:w-auto sm:max-w-none ${
              featured ? "border-2 border-midnight bg-peach-soft" : "border border-line bg-white"
            }`}
          >
            {featured ? (
              <span className="absolute -top-3 left-6 rounded-full bg-midnight px-3 py-1 text-xs font-bold text-white">Most popular</span>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Heading className="m-0 text-xl font-bold">{plan.name}</Heading>
              <span className="min-h-[2lh] text-sm leading-snug text-muted">{plan.tagline}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-1.5">
              <span className={`font-extrabold tracking-[-0.5px] ${shown.period ? "text-[32px]" : "text-[26px]"}`}>{shown.price}</span>
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
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[15px]">
              {plan.highlights.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Icon name="check" size={20} className="mt-px flex-none text-success" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/sign-up"
              className={`mt-auto flex h-[50px] items-center justify-center rounded-xl text-base font-bold no-underline ${
                featured ? "bg-midnight text-white hover:bg-ink-3 hover:text-white" : "border border-midnight text-midnight hover:bg-ivory hover:text-midnight"
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
