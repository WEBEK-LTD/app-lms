import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { getSiteContent } from "@/lib/content/get";
import { MarketingPage, Section, SectionTitle } from "@/components/marketing";
import { comparisonRows, PLANS, planPrice, type ComparisonValue } from "@/lib/plans";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { getContact } from "@/lib/contact";

/** Plans, prices, features and limits come from the admin (roadmap 9.2 and 13.1). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Four plans for your app: Starter, Growth, Pro and Business. Android and iOS apps, push notifications, your own pages, card payments, offline mode, and publishing to Google Play and the App Store done for you.",
};

/** The plan most clients pick, highlighted. */
const FEATURED = "growth";

function Cell({ value, plan }: { value: ComparisonValue; plan: string }) {
  if (value === true) {
    return (
      <span role="img" aria-label={`Included in ${plan}`} className="inline-flex text-success">
        <Icon name="check" size={22} />
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
      <Section>
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]" data-pricing-plans="">
          {plans.map((plan) => {
            const featured = plan.id === FEATURED;
            const shown = planPrice(plan);
            return (
              <div
                key={plan.id}
                data-plan={plan.id}
                className={`flex flex-col gap-[18px] rounded-[20px] p-6 ${featured ? "border-2 border-midnight bg-peach-soft" : "border border-line"}`}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="m-0 text-xl font-bold">{plan.name}</h2>
                    {featured ? <span className="rounded-full bg-midnight px-2.5 py-0.5 text-xs font-bold text-white">Most popular</span> : null}
                  </div>
                  <span className="text-sm text-muted">{plan.tagline}</span>
                </div>
                <span className="text-[30px] font-extrabold">
                  {shown.price}
                  {shown.period ? <span className="text-[15px] font-medium text-muted"> / {shown.period}</span> : null}
                </span>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[15px]">
                  {plan.highlights.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <Icon name="check" size={20} className="flex-none text-success" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className={`mt-auto flex h-[50px] items-center justify-center rounded-xl text-base font-bold no-underline ${
                    featured
                      ? "bg-midnight text-white hover:bg-ink-3 hover:text-white"
                      : "border border-midnight text-midnight hover:bg-ivory hover:text-midnight"
                  }`}
                >
                  Start with {plan.name}
                </Link>
              </div>
            );
          })}
        </div>
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
                  <th key={plan.id} scope="col" className="w-[140px] px-4 py-4 text-center font-bold">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-line-soft last:border-b-0">
                  <th scope="row" className="px-5 py-3.5 text-left font-normal">
                    {row.label}
                  </th>
                  {plans.map((plan) => (
                    <td key={plan.id} className="px-4 py-3.5 text-center">
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
            Google Play and the App Store charge their own developer account fees, paid directly to Google and Apple. You can cancel within 3 days of your
            account being activated for a full refund. See our <Link href="/refund">Refund policy</Link>.
          </p>
        </div>
      </Section>
    </MarketingPage>
  );
}
