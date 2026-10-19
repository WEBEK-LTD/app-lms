import type { Metadata } from "next";
import { pageMetadata, siteUrl, softwareLd } from "@/lib/seo";
import { JsonLdScript } from "@/components/json-ld";
import { PlanCards } from "@/components/plan-cards";
import { StoreName } from "@/components/brand-marks";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { getSiteContent } from "@/lib/content/get";
import { MarketingPage, Section, SectionTitle } from "@/components/marketing";
import { comparisonRows, FEATURED_PLAN, PLANS, type ComparisonValue } from "@/lib/plans";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { getContact } from "@/lib/contact";

/** Plans, prices, features and limits come from the admin (roadmap 9.2 and 13.1). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "Four plans for your app: Starter, Growth, Pro and Business. Android and iOS apps on Google Play, the App Store, Galaxy Store, AppGallery and GetApps, push notifications, your own pages, card payments, offline mode, and publishing done for you.",
  path: "/pricing",
  image: "/pricing/opengraph-image",
});

function Cell({ value, plan }: { value: ComparisonValue; plan: string }) {
  if (value === true) {
    return (
      <span role="img" aria-label={`Included in ${plan}`} className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success-bg text-success">
        <Icon name="check" size={17} />
      </span>
    );
  }
  if (value === false) {
    return (
      <span role="img" aria-label={`Not included in ${plan}`} className="text-muted">
        —
      </span>
    );
  }
  return <span className="text-sm font-semibold">{value}</span>;
}

export default async function PricingPage() {
  const contact = await getContact();
  const all = await effectivePlans(await getStore());
  const plans = PLANS.map((id) => all[id]);
  const rows = comparisonRows(all);
  const text = await getSiteContent("pricing");
  return (
    <MarketingPage current="pricing" eyebrow={text.eyebrow} title={text.title!} intro={text.intro!}>
      <JsonLdScript data={softwareLd(siteUrl(), plans)} />
      <Section>
        <PlanCards plans={plans} />
        <p className="m-0 text-[15px] text-ink-4">
          Each app has its own plan. Questions about a plan? <a href={contact.whatsappUrl}>Message us on WhatsApp</a>.
        </p>
      </Section>
      <Section tinted>
        <SectionTitle title="Compare plans" />
        <div className="overflow-x-auto rounded-2xl border border-line bg-white" data-pricing-table="">
          <table className="w-full min-w-[720px] border-collapse text-[15px]">
            <caption className="sr-only">Everything each plan includes</caption>
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="px-5 py-4 font-bold">
                  What you get
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
                  <th scope="row" className="px-5 py-3.5 text-left font-normal">
                    {row.store ? <StoreName id={row.store} /> : row.label}
                  </th>
                  {plans.map((plan) => (
                    <td key={plan.id} className={`px-4 py-3.5 text-center ${plan.id === FEATURED_PLAN ? "bg-peach-soft" : ""}`}>
                      <Cell value={row.values[plan.id]} plan={plan.name} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-2.5 text-[15px] leading-relaxed text-ink-4">
          <p className="m-0">
            <strong className="text-ink-2">App users</strong> are the people with an account in your app when we host it for you. Apps connected to your own
            WordPress site keep their users on your site, with no limit. When an app reaches its limit, everyone who already has an account keeps using it.
          </p>
          <p className="m-0">
            <strong className="text-ink-2">Connected platforms</strong> are the sources your app&apos;s pages show: your courses, products, services or
            listings, and on WordPress also your blog.
          </p>
          <p className="m-0">
            <strong className="text-ink-2">Changing plans:</strong> upgrade from your dashboard at any time and pay by card; the days left on your current plan
            are credited to the new one. A move to a lower plan starts when your current period ends.
          </p>
          <p className="m-0">
            <strong className="text-ink-2">App stores:</strong> every plan builds the Android app for Google Play, Samsung Galaxy Store, Huawei AppGallery and
            Xiaomi GetApps; the iOS app for the App Store comes with Growth and up. On Pro and Business we upload every build to each store you use.
          </p>
          <p className="m-0">
            Google Play and the App Store charge their own developer account fees, paid directly to Google and Apple; Samsung, Huawei and Xiaomi accounts are free.
            You can cancel within 3 days of your account being activated for a full refund. See our <Link href="/refund">Refund policy</Link>.
          </p>
        </div>
      </Section>
    </MarketingPage>
  );
}
