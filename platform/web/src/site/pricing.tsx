import type { Metadata } from "next";
import Link from "next/link";
import { JsonLdScript } from "@/components/json-ld";
import { analyticsEventsKeepText, analyticsKeepText, currencyNote, PlanCards, storageText } from "@/components/plan-cards";
import { StoreName } from "@/components/brand-marks";
import { Icon } from "@/components/icon";
import { MarketingPage, MoreLink, Section, SectionTitle } from "@/components/marketing";
import { getSiteContent } from "@/lib/content/get";
import { StudioDifferences, StudioPlans } from "@/components/studio-marketing";
import { cleanLimitDefs, comparisonRows, extraLimitRows, hasFeature, lifetimeNoteOf, pagesLimitOf, planLimitLines, plansForSale, planStores, type ComparisonRow, type ComparisonValue, type PlanInfo, type Plan } from "@/lib/plans";
import { periodPrices, periodsAmong, startPeriod } from "@/lib/billing/period-prices";
import { isPeriodKey, type PeriodKey } from "@/lib/billing/periods";
import { LifetimeOffer } from "@/components/lifetime-offer";
import { planLimitLinesFor } from "@/components/plan-cards";
import { platformSetting } from "@/lib/settings/platform";
import type { PlanLimitDef } from "@/lib/plans";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { getVisitorContact } from "@/lib/contact";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { visitorPriceView } from "@/lib/billing/display";
import { planFor } from "@/lib/marketing-lang";
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
    { label: m.rowPublishing, values: each((p) => (hasFeature(p, "auto_publish") ? words.weePublish : words.youPublish)) },
    { label: m.rowStoreUpdates, values: has("auto_publish") },
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

/**
 * Plans, prices, features and limits come from the admin (roadmap 9.2 and
 * 13.1). 52 Prices show in pounds in Egypt and in dollars elsewhere: the
 * page is rendered per request and sent with `Vary` (next.config.ts).
 * 55 In any language; the prices are written the same way in each.
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
  // 133 The billing periods the plans offer, and the one the visitor looks at.
  const periods = periodsAmong(plans, view);
  const period = startPeriod(plans, view, isPeriodKey(asked) ? (asked as PeriodKey) : null);
  const lifetime = [...plans, ...studioPlans].filter((p) => periodPrices(p, view).some((x) => x.key === "lifetime"));
  const w = messagesFor(lang).plans;
  const periodName = (key: PeriodKey) => ({ "1": w.period1, "6": w.period6, "12": w.period12, "24": w.period24, "36": w.period36, lifetime: w.periodLifetime })[key];
  const text = await getSiteContent("pricing", lang);
  const m = messagesFor(lang).pricing;
  const strong = { b: (chunk: string) => <strong className="text-ink-2">{chunk}</strong> };
  return (
    <MarketingPage current="pricing" eyebrow={text.eyebrow} title={text.title!} intro={text.intro!} lang={lang}>
      <JsonLdScript data={softwareLd(siteUrl(), plans, view, lang === "en" ? undefined : lang)} />
      <Section id="regular">
        <SectionTitle title={s.pricingRegular} text={s.pricingRegularText} />
        {/* 133 How long to pay for: each card shows that period's price, per month and the saving. */}
        {periods.length > 1 ? (
          <nav aria-label={w.periods} className="flex flex-wrap gap-2" data-period-tabs="">
            {periods.map((key) => (
              <Link
                key={key}
                href={`${localePath(lang, "/pricing")}?period=${key}#regular`}
                scroll={false}
                aria-current={key === period ? "true" : undefined}
                data-period={key}
                className={`flex h-10 items-center gap-1.5 rounded-full border px-4 text-[15px] font-semibold no-underline ${
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
        ) : null}
        <PlanCards plans={plans} view={view} headingLevel={3} lang={lang} period={periods.length > 1 ? period : null} />
        <p className="m-0 text-[15px] text-ink-4">
          <span data-currency-note="">{currencyNote(view, lang)}</span>{" "}
          {richText(m.eachApp, { link: (chunk) => <WhatsAppLink lines={contact.lines} country={contact.country}>{chunk}</WhatsAppLink> })}
        </p>
        <p className="m-0 flex gap-2.5 rounded-2xl bg-peach-soft p-4 text-[15px] leading-relaxed text-ink-3">
          <Icon name="dashboard_customize" size={20} className="mt-0.5 flex-none text-accent" />
          <span>{richText(s.pricingStudio, { link: (chunk) => <Link href="#studio">{chunk}</Link> })}</span>
        </p>
      </Section>
      {/* 133 The lifetime offer on its own: /pricing#lifetime. */}
      {lifetime.length ? (
        <Section id="lifetime-offer">
          <LifetimeOffer
            eyebrow={w.lifetimeEyebrow}
            title={w.lifetimeTitle}
            text={w.lifetimeText}
            noteTitle={w.lifetimeNoteTitle}
            note={lifetimeNoteOf(extras?.value, lang) ?? w.lifetimeNote}
            headingLevel={2}
            plans={lifetime.map((plan) => ({
              id: plan.id,
              name: plan.name,
              price: periodPrices(plan, view).find((x) => x.key === "lifetime")!.price,
              once: w.payOnce,
              // What's included as the team wrote it, else the plan's key limits.
              includes: plan.highlights.length ? plan.highlights.slice(0, 7) : (lang === "en" ? planLimitLines(plan) : planLimitLinesFor(lang, plan)).map((l) => l.text),
              cta: { href: localePath(lang, "/sign-up"), label: formatMessage(lang, w.lifetimeChoose, { plan: plan.name }) },
            }))}
            link={<Link href={`${localePath(lang, "/pricing")}#regular`} className="font-semibold text-ember">{w.lifetimeCompare}</Link>}
          />
        </Section>
      ) : null}
      <Section tinted>
        <SectionTitle title={m.compareTitle} />
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
          <p className="m-0">{richText(m.fees, { link: (chunk) => <Link href={localePath(lang, "/refund")}>{chunk}</Link> })}</p>
        </div>
        <MoreLink href={localePath(lang, "/compare")}>{COMPARE_TEXT[lang].title}</MoreLink>
      </Section>
      <Section id="studio">
        <SectionTitle eyebrow={s.studio} title={s.plansTitle} text={s.plansText} />
        <StudioPlans lang={lang} plans={studioPlans} view={view} contact={contact} />
      </Section>
      <Section tinted id="differences">
        <SectionTitle title={s.diffTitle} text={s.diffText} />
        <StudioDifferences lang={lang} />
        <MoreLink href={localePath(lang, "/yallapp-studio")}>{s.homeLink}</MoreLink>
      </Section>
    </MarketingPage>
  );
}
