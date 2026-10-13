import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { MarketingPage, Section, SectionTitle } from "@/components/marketing";
import { planPrice } from "@/lib/plans";
import { getStore } from "@/lib/data";
import { getPlans } from "@/lib/settings/platform";
import { getContact } from "@/lib/contact";

/** Plans and prices come from the admin. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Starter: you publish your apps with our guides. Pro: we publish them to Google Play and the App Store for you.",
};

const COMPARISON: { label: string; starter: boolean; pro: boolean }[] = [
  { label: "Android APK and App Bundle (AAB)", starter: true, pro: true },
  { label: "iOS build (IPA)", starter: true, pro: true },
  { label: "Android upload key and store assets", starter: true, pro: true },
  { label: "WordPress plugin and updates", starter: true, pro: true },
  { label: "Push notifications", starter: true, pro: true },
  { label: "Step-by-step publishing guides", starter: true, pro: true },
  { label: "Upload to Google Play for you", starter: false, pro: true },
  { label: "Upload to TestFlight and the App Store for you", starter: false, pro: true },
  { label: "Priority support", starter: false, pro: true },
];

function Mark({ on, label }: { on: boolean; label: string }) {
  return on ? (
    <span role="img" aria-label={`Included in ${label}`} className="inline-flex text-success">
      <Icon name="check" size={22} />
    </span>
  ) : (
    <span role="img" aria-label={`Not included in ${label}`} className="text-muted">
      —
    </span>
  );
}

export default async function PricingPage() {
  const contact = await getContact();
  const all = await getPlans(await getStore());
  const plans = [all.starter, all.pro];
  return (
    <MarketingPage
      current="pricing"
      eyebrow="Pricing"
      title="Simple plans for your academy"
      intro="Payments are arranged directly with our team on WhatsApp. We activate your account as soon as your plan is confirmed."
    >
      <Section>
        <div className="grid max-w-[900px] gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
          {plans.map((plan) => {
            const featured = plan.id === "pro";
            return (
              <div
                key={plan.id}
                className={`flex flex-col gap-[18px] rounded-[20px] p-7 ${featured ? "border-2 border-midnight bg-peach-soft" : "border border-line"}`}
              >
                <div className="flex flex-col gap-1.5">
                  <h2 className="m-0 text-xl font-bold">{plan.name}</h2>
                  <span className="text-sm text-muted">{plan.tagline}</span>
                </div>
                <span className="text-[34px] font-extrabold">
                  {planPrice(plan).price}
                  {planPrice(plan).period ? <span className="text-[15px] font-medium text-muted"> / {planPrice(plan).period}</span> : null}
                </span>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[15px]">
                  {plan.highlights.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <Icon name="check" size={20} className="flex-none text-success" />
                      {item}
                    </li>
                  ))}
                </ul>
                <a
                  href={contact.whatsappUrl}
                  className={`mt-auto flex h-[50px] items-center justify-center rounded-xl text-base font-bold no-underline ${
                    featured
                      ? "bg-midnight text-white hover:bg-ink-3 hover:text-white"
                      : "border border-midnight text-midnight hover:bg-ivory hover:text-midnight"
                  }`}
                >
                  Contact us on WhatsApp
                </a>
              </div>
            );
          })}
        </div>
      </Section>
      <Section tinted>
        <SectionTitle title="Compare plans" />
        <div className="max-w-[900px] overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[480px] border-collapse text-[15px]">
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className="px-5 py-4 font-bold">What you get</th>
                <th scope="col" className="w-[110px] px-5 py-4 text-center font-bold">Starter</th>
                <th scope="col" className="w-[110px] px-5 py-4 text-center font-bold">Pro</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.label} className="border-b border-line-soft last:border-b-0">
                  <th scope="row" className="px-5 py-3.5 text-left font-normal">{row.label}</th>
                  <td className="px-5 py-3.5 text-center"><Mark on={row.starter} label="Starter" /></td>
                  <td className="px-5 py-3.5 text-center"><Mark on={row.pro} label="Pro" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="m-0 max-w-[900px] text-[15px] leading-relaxed text-ink-4">
          Google Play and the App Store charge their own developer account fees, paid directly to Google and Apple. You can cancel within 3
          days of your account being activated for a full refund. See our <Link href="/refund">Refund policy</Link>.
        </p>
      </Section>
    </MarketingPage>
  );
}
