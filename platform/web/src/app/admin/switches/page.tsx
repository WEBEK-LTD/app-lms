import type { Metadata } from "next";
import Link from "next/link";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { PLANS } from "@/lib/plans";
import { getPlans } from "@/lib/settings/platform";
import { getSwitches, isStudioSwitch, switchGroups, type SwitchKind } from "@/lib/switches";
import { SwitchesForm } from "./forms";

export const metadata: Metadata = { title: "Switches" };
export const dynamic = "force-dynamic";

const TEXT: Record<SwitchKind, string> = {
  app_type: "Switched-off types disappear from the client's app type choice.",
  website:
    "Switched-off choices disappear from the client's Website step and can't be saved. Apps already using one keep working and see a notice.",
  feature: "Push, offline downloads and automatic publishing leave the license features; paying plans by card stops being offered.",
};

const STUDIO_TEXT: Record<SwitchKind, string> = {
  app_type: "Switched-off types disappear from Yallapp Studio's project type choice.",
  website: "Switched-off content can't be chosen for new Studio projects. Projects already using it keep working and see a notice.",
  feature: "Switched-off features leave every Studio plan's features.",
};

/**
 * App types, websites and features on or off for everyone (roadmap 11.5). Per plan, they're set on the Plans page.
 * Regular apps' switches and Yallapp Studio's own (its project types, their content and its features) are on separate tabs.
 */
export default async function SwitchesPage({ searchParams }: PageProps<"/admin/switches">) {
  const { adminRole } = await requireAdmin();
  const family = (await searchParams).family === "studio" ? "studio" : "regular";
  const store = await getStore();
  const [switches, plans] = await Promise.all([getSwitches(store, { fresh: true }), getPlans(store)]);
  const groups = switchGroups().map((group) => ({
    kind: group.kind,
    title: group.title,
    text: (family === "studio" ? STUDIO_TEXT : TEXT)[group.kind],
    items: group.items
      .filter((item) => isStudioSwitch(item.key) === (family === "studio"))
      .map((item) => ({
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
          {family === "studio" ? " Studio projects of the regular types (a store, a clinic…) follow the regular apps' switches." : ""}
        </span>
      </div>
      <div role="tablist" aria-label="Switch families" className="flex flex-wrap gap-1 border-b border-line">
        {(
          [
            ["regular", "Regular apps", "/admin/switches"],
            ["studio", "Yallapp Studio", "/admin/switches?family=studio"],
          ] as const
        ).map(([key, label, href]) => {
          const on = key === family;
          return (
            <Link
              key={key}
              href={href}
              role="tab"
              aria-selected={on}
              className={`flex h-10 items-center px-4 text-sm no-underline ${on ? "border-b-2 border-midnight font-bold text-ink" : "border-b-2 border-transparent text-muted"}`}
            >
              {label}
            </Link>
          );
        })}
      </div>
      <ReadOnly when={!can(adminRole, "switches.edit")} what="change switches">
        <SwitchesForm key={family} family={family} groups={groups.filter((group) => group.items.length)} />
      </ReadOnly>
    </>
  );
}
