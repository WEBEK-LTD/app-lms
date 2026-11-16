import type { ReactNode } from "react";
import { Icon } from "./icon";

/** 133 One plan sold for life: its name, the one price, what it includes, and where to buy it. */
export interface LifetimePlan {
  id: string;
  name: string;
  /** "EGP 60,000" or "$1,200". */
  price: string;
  /** What it includes, a few lines. */
  includes: string[];
  /** The button: a link (the website's sign-up, the dashboard's payment form). */
  cta: { href: string; label: string };
  /** Shown next to the price: "Pay once" in the page's language. */
  once: string;
}

/**
 * 133 The lifetime offer, made to stand out: a dark card with ember accents,
 * "Pay once, yours for life", each plan sold for life with what it includes,
 * and a clear note of what "lifetime" covers. The words come from the page
 * (the website's or the dashboard's language); dark in both themes
 * (`.on-dark`). The section has an id the team can link to.
 */
export function LifetimeOffer({
  id = "lifetime",
  eyebrow,
  title,
  text,
  plans,
  note,
  noteTitle,
  headingLevel = 2,
  link,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  text: string;
  plans: LifetimePlan[];
  /** What "lifetime" covers: the owner's wording. */
  note: ReactNode;
  noteTitle: string;
  headingLevel?: 2 | 3;
  /** A link under the cards, like "Compare every plan". */
  link?: ReactNode;
}) {
  if (!plans.length) return null;
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const Sub = headingLevel === 2 ? "h3" : "h4";
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      data-lifetime-offer=""
      className="on-dark relative isolate scroll-mt-6 overflow-hidden rounded-[26px] border border-ember/40 bg-midnight p-6 text-white shadow-[0_30px_70px_-34px_rgba(255,90,31,0.55)] sm:p-9"
    >
      {/* The ember glow, behind everything. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -end-24 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,90,31,0.45),rgba(255,90,31,0)_70%)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -start-24 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,154,110,0.22),rgba(255,154,110,0)_70%)]"
      />
      <div className="flex flex-col gap-2.5">
        <span className="flex items-center gap-2 text-xs font-bold tracking-[1.2px] text-ember uppercase">
          <Icon name="diamond" size={18} filled className="text-ember" />
          {eyebrow}
        </span>
        <Heading id={`${id}-title`} className="m-0 text-[28px] leading-tight font-extrabold tracking-[-0.5px] text-white sm:text-[34px]">
          {title}
        </Heading>
        <p className="m-0 max-w-[640px] text-[15px] leading-relaxed text-night-text">{text}</p>
      </div>
      <ul className="m-0 mt-7 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
        {plans.map((plan) => (
          <li key={plan.id} data-lifetime-plan={plan.id} className="flex flex-col gap-4 rounded-2xl border border-night-line bg-night-2/70 p-5 backdrop-blur">
            <div className="flex flex-col gap-1">
              <Sub className="m-0 text-lg font-extrabold text-white">{plan.name}</Sub>
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span dir="ltr" className="text-[30px] font-extrabold tracking-[-0.5px] text-white">
                  {plan.price}
                </span>
                <span className="rounded-full bg-ember/15 px-2 py-0.5 text-[12px] font-bold text-ember">{plan.once}</span>
              </span>
            </div>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[14px] text-night-text">
              {plan.includes.map((line) => (
                <li key={line} className="flex gap-2">
                  <Icon name="check" size={17} className="mt-px flex-none text-ember" />
                  {line}
                </li>
              ))}
            </ul>
            <a
              href={plan.cta.href}
              className="mt-auto flex h-12 items-center justify-center gap-2 rounded-xl bg-ember px-4 text-[15px] font-bold text-white no-underline transition-colors hover:bg-[#e94e15] hover:text-white"
            >
              <Icon name="diamond" size={18} filled />
              {plan.cta.label}
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex gap-3 rounded-2xl border border-night-line bg-night-2/50 p-4 text-[14px] leading-relaxed text-night-text" data-lifetime-note="">
        <Icon name="info" size={20} className="mt-0.5 flex-none text-ember" />
        <div className="flex flex-col gap-1">
          <strong className="text-white">{noteTitle}</strong>
          <span>{note}</span>
        </div>
      </div>
      {link ? <div className="mt-4 text-[14px]">{link}</div> : null}
    </section>
  );
}
