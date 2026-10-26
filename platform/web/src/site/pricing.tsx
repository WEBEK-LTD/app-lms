import type { Metadata } from "next";
import Link from "next/link";
import { JsonLdScript } from "@/components/json-ld";
import { analyticsEventsKeepText, analyticsKeepText, currencyNote, PlanCards, storageText } from "@/components/plan-cards";
import { StoreName } from "@/components/brand-marks";
import { Icon } from "@/components/icon";
import { MarketingPage, Section, SectionTitle } from "@/components/marketing";
import { getSiteContent } from "@/lib/content/get";
import { comparisonRows, FEATURED_PLAN, hasFeature, PLANS, planStores, type ComparisonRow, type ComparisonValue, type PlanInfo, type Plan } from "@/lib/plans";
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

export function pricingMetadata(lang: Lang): Metadata {
  const m = messagesFor(lang).meta;
  return siteMetadata(lang, { title: m.pricingTitle, description: m.pricingDescription, path: "/pricing", image: "/pricing/opengraph-image" });
}

/** 55 The comparison table's rows in a language (lib/plans.ts `comparisonRows` is the English). */
function comparisonRowsFor(lang: Lang, plans: Record<Plan, PlanInfo>): ComparisonRow[] {
  if (lang === "en") return comparisonRows(plans);
  const m = messagesFor(lang).pricing;
  const each = (fn: (p: PlanInfo) => ComparisonValue): Record<Plan, ComparisonValue> =>
    ({ starter: fn(plans.starter), growth: fn(plans.growth), pro: fn(plans.pro), business: fn(plans.business) });
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
    { label: m.rowPages, values: each((p) => (hasFeature(p, "page_editor") ? m.fullEditor : m.templates)) },
    { label: m.rowCards, values: has("card_payments") },
    { label: m.rowOffline, values: has("offline_downloads") },
    { label: m.rowRebuilds, values: has("auto_rebuild") },
    { label: m.rowChat, values: has("chat") },
    { label: m.rowLoyalty, values: has("loyalty") },
    { label: m.rowPublishing, values: each((p) => (hasFeature(p, "auto_publish") ? words.weePublish : words.youPublish)) },
    { label: m.rowStoreUpdates, values: has("auto_publish") },
    { label: m.rowTeam, values: each((p) => limit(p.limits.teamMembers, m.unlimited)) },
    { label: m.rowManager, values: each((p) => p.limits.accountManager) },
    { label: m.rowCustom, values: each((p) => p.limits.customFeatures) },
    { label: m.rowSupport, values: each((p) => support[p.limits.support]) },
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
export async function PricingPage({ lang }: { lang: Lang }) {
  const contact = await getVisitorContact();
  const store = await getStore();
  const [all, view] = await Promise.all([effectivePlans(store), visitorPriceView(store)]);
  const plans = PLANS.map((id) => planFor(lang, all[id]));
  const rows = comparisonRowsFor(lang, all);
  const text = await getSiteContent("pricing", lang);
  const m = messagesFor(lang).pricing;
  const strong = { b: (chunk: string) => <strong className="text-ink-2">{chunk}</strong> };
  return (
    <MarketingPage current="pricing" eyebrow={text.eyebrow} title={text.title!} intro={text.intro!} lang={lang}>
      <JsonLdScript data={softwareLd(siteUrl(), plans, view, lang === "en" ? undefined : lang)} />
      <Section>
        <PlanCards plans={plans} view={view} lang={lang} />
        <p className="m-0 text-[15px] text-ink-4">
          <span data-currency-note="">{currencyNote(view, lang)}</span>{" "}
          {richText(m.eachApp, { link: (chunk) => <WhatsAppLink lines={contact.lines} country={contact.country}>{chunk}</WhatsAppLink> })}
        </p>
      </Section>
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
                  <th key={plan.id} scope="col" className={`w-[140px] px-4 py-4 text-center font-bold ${plan.id === FEATURED_PLAN ? "bg-peach-soft" : ""}`}>
                    {plan.name}
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
                    <td key={plan.id} className={`px-4 py-3.5 text-center ${plan.id === FEATURED_PLAN ? "bg-peach-soft" : ""}`}>
                      <Cell value={row.values[plan.id]} plan={plan.name} lang={lang} />
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
      </Section>
    </MarketingPage>
  );
}
