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
 *
 * 217 The same band on Yallapp Studio's page and its stories (the owner: the
 * stories' plans "look bad"): `id` keeps each page's anchor (the story's
 * Hero links to `#plans`), `head` and `link` the page's own words and link.
 */
export function StudioPlansBand({
  lang,
  plans,
  view,
  contact,
  id = "studio-plans",
  head,
  link,
}: {
  lang: Lang;
  plans: PlanInfo[];
  view: PriceView;
  contact: Contact;
  /** The section's anchor: `studio-plans` on the home page, `plans` on Studio's page and its stories. */
  id?: string;
  /** The heading's words; the home page's when left out. */
  head?: { title: string; text: string };
  /** The link beside the heading; to Yallapp Studio's page when left out. */
  link?: { href: string; label: string };
}) {
  const s = messagesFor(lang).studio;
  const titleId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={titleId} className="pr-night-band" data-studio-plans-band={id}>
      <div className="pr-wrap">
        <div className="pr-sec-head">
          <div>
            <span className="pr-kicker">{s.studio}</span>
            <h2 id={titleId}>{head?.title ?? s.plansTitle}</h2>
            <p>{head?.text ?? s.plansText}</p>
          </div>
          <Link href={link?.href ?? localePath(lang, "/yallapp-studio")} className="pr-lnk-u">
            {link?.label ?? s.homeLink}
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
