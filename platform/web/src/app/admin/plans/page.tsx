import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { requireAdmin } from "@/lib/auth/session";
import { PLAN_INFO } from "@/lib/plans";

export const metadata: Metadata = { title: "Plans" };

const FEATURE_LABEL = {
  push: "Push notifications",
  offline_downloads: "Offline downloads",
  auto_publish: "Automatic publishing",
} as const;

export default async function PlansPage() {
  await requireAdmin();
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Plans</h1>
        <span className="text-[15px] text-muted">
          Plans are defined in <code>src/lib/plans.ts</code>. Prices are agreed with each client on WhatsApp; the features below are what the license API reports to the plugin.
        </span>
      </div>
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">
        {Object.values(PLAN_INFO).map((plan) => (
          <section key={plan.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6">
            <h2 className="m-0 text-xl font-bold">{plan.name}</h2>
            <span className="text-sm text-muted">{plan.tagline}</span>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
              {plan.highlights.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Icon name="check" size={20} className="text-success" />
                  {item}
                </li>
              ))}
            </ul>
            <span className="text-sm font-semibold">
              License features: {plan.features.map((feature) => FEATURE_LABEL[feature]).join(", ")}
            </span>
          </section>
        ))}
      </div>
    </>
  );
}
