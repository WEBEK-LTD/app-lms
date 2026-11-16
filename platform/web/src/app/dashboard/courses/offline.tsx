import { UpgradeHint } from "@/components/upgrade";
import { currentPlanId } from "@/lib/billing/plan-change";
import { downloadsFormValue, offersDownloads } from "@/lib/courses/downloads";
import { getStore } from "@/lib/data";
import type { App, License } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { effectivePlans } from "@/lib/entitlements";
import { plansIn } from "@/lib/marketing-lang";
import { hasFeature, lowestPlanWith } from "@/lib/plans";
import { OfflineDownloadsForm } from "./forms";

/** 45 Offline downloads: on or off for the app's students, with offline mode in the plan. */
export async function OfflineDownloads({ app, license }: { app: App; license: License | null }) {
  if (!offersDownloads(app)) return null;
  const effective = plansIn((await dashboardText()).lang, await effectivePlans(await getStore()));
  const planId = license ? currentPlanId(license, new Date()) : null;
  const plan = planId ? effective[planId] : null;
  const included = hasFeature(plan, "offline_downloads");
  const { t } = await dashboardText();
  const to = lowestPlanWith(effective, (p) => hasFeature(p, "offline_downloads"), planId);
  return (
    <section aria-labelledby="h-offline" className="flex max-w-[760px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id="h-offline" className="m-0 text-lg font-bold">
          {t("courses.offline")}
        </h2>
        <p className="m-0 text-sm leading-relaxed text-muted">{t("courses.offlineText")}</p>
      </div>
      {included ? null : (
        <UpgradeHint title={t("courses.offline")} to={to} cta={to ? t("overview.upgradeTo", { plan: to.name }) : undefined}>
          {t("courses.offlineUpgrade")}
        </UpgradeHint>
      )}
      <OfflineDownloadsForm current={downloadsFormValue(app)} wordpress={app.connector?.kind !== "courses"} disabled={!included} />
    </section>
  );
}

