import type { Metadata } from "next";
import Link from "next/link";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { PLANS } from "@/lib/plans";
import { getPlans } from "@/lib/settings/platform";
import { getSwitches, switchGroups, type SwitchKind } from "@/lib/switches";
import { SwitchesForm } from "./forms";

export const metadata: Metadata = { title: "Switches" };
export const dynamic = "force-dynamic";

const TEXT: Record<SwitchKind, string> = {
  app_type: "Switched-off types disappear from the client's app type choice.",
  website:
    "Switched-off choices disappear from the client's Website step and can't be saved. Apps already using one keep working and see a notice.",
  feature: "Push, offline downloads and automatic publishing leave the license features; selling through Yallapp and paying plans by card stop being offered.",
};

/** App types, websites and features on or off for everyone (roadmap 11.5). Per plan, they're set on the Plans page. */
export default async function SwitchesPage() {
  const { adminRole } = await requireAdmin();
  const store = await getStore();
  const [switches, plans] = await Promise.all([getSwitches(store, { fresh: true }), getPlans(store)]);
  const groups = switchGroups().map((group) => ({
    kind: group.kind,
    title: group.title,
    text: TEXT[group.kind],
    items: group.items.map((item) => ({
      key: item.key,
      label: item.label,
      on: !(switches?.off ?? []).includes(item.key),
      offOn: PLANS.filter((plan) => switches?.offByPlan[plan]?.includes(item.key)).map((plan) => plans[plan].name),
    })),
  }));
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Switches</h1>
        <span className="text-[15px] text-muted">
          Turn app types, websites and platforms, and features on or off for every client. What each plan offers is set on the{" "}
          <Link href="/admin/plans">Plans</Link> page.
        </span>
      </div>
      <ReadOnly when={!can(adminRole, "switches.edit")} what="change switches">
        <SwitchesForm groups={groups} />
      </ReadOnly>
    </>
  );
}
