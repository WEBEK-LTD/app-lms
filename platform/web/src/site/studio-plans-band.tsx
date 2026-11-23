import Link from "next/link";
import { currencyNote } from "@/components/plan-cards";
import type { Contact } from "@/lib/contact";
import type { PlanInfo, PriceView } from "@/lib/plans";
import { messagesFor, type Lang } from "@/i18n";
import { localePath } from "@/i18n/paths";
import { StudioPlanCards } from "./pricing-cards";
import "./pricing.css";

/**
 * 205 The owner: the home page's Studio plans looked bad ("كل الي طلبته
 * تغيير الشكل"): long cards, every line listed, the button's words on two
 * lines. The pricing page's night band instead (154, chosen by the owner):
 * compact cards, the first lines and the rest folded under "See everything
 * (+N)", the featured plan marked, then what every Studio plan has beside
 * them. Each plan's own main price (the home page has no period picker).
 */
export function StudioPlansBand({ lang, plans, view, contact }: { lang: Lang; plans: PlanInfo[]; view: PriceView; contact: Contact }) {
  const s = messagesFor(lang).studio;
  return (
    <section id="studio-plans" aria-labelledby="studio-plans-title" className="pr-night-band" data-home-studio-plans="">
      <div className="pr-wrap">
        <div className="pr-sec-head">
          <div>
            <span className="pr-kicker">{s.studio}</span>
            <h2 id="studio-plans-title">{s.plansTitle}</h2>
            <p>{s.plansText}</p>
          </div>
          <Link href={localePath(lang, "/yallapp-studio")} className="pr-lnk-u">
            {s.homeLink}
          </Link>
        </div>
        <StudioPlanCards plans={plans} view={view} lang={lang} period={null} contact={contact} />
        {plans.length ? (
          <p className="pr-notes" data-currency-note="">
            {currencyNote(view, lang)}
          </p>
        ) : null}
      </div>
    </section>
  );
}
