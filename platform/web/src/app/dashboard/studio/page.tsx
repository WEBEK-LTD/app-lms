import type { Metadata } from "next";
import Link from "next/link";
import { requireClient } from "@/lib/auth/session";
import { currentPlanId } from "@/lib/billing/plan-change";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { appUrl, encryptionKey } from "@/lib/env";
import { assetUrl } from "@/lib/assets";
import { pickableContent } from "@/lib/hosted/pages/pickable";
import { loadLayout, withoutStrings } from "@/lib/pages/layout";
import { allowedSources } from "@/lib/pages/plan";
import { itemSourcesFor, screenOptionsFor } from "@/lib/pages/sources";
import { hasFeature } from "@/lib/plans";
import { richText } from "@/i18n/rich";
import { StudioEditor } from "./editor";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("studio.title") };
}
export const dynamic = "force-dynamic";

/** 103 Yallapp Studio: the app's pages designed freely on a canvas, in the Pages & look draft. */
export default async function StudioPage() {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  const header = (
    <div className="flex max-w-[720px] flex-col gap-2">
      <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("studio.title")}</h1>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("studio.intro")}</p>
    </div>
  );
  if (!app) {
    return (
      <div className="flex flex-col gap-3">
        {header}
        <p className="m-0 text-[15px]">{richText(t("pages.chooseTypeFirst"), { link: (chunk) => <Link href="/dashboard/app-type">{chunk}</Link> })}</p>
      </div>
    );
  }
  const store = await getStore();
  const now = new Date();
  const record = await loadLayout(store, app, now);
  const plans = await effectivePlans(store);
  const planId = license ? currentPlanId(license, now) : null;
  const plan = planId ? plans[planId] : null;
  const sources = plan ? allowedSources(app, plan) : itemSourcesFor(app);
  return (
    <div className="flex flex-col gap-6">
      {header}
      <StudioEditor
        initial={withoutStrings(record.draft)}
        app={{ name: app.appName ?? t("setup.yourApp"), primaryColor: app.primaryColor }}
        sources={sources}
        screens={screenOptionsFor(app)}
        pickable={await pickableContent(app, { store, key: encryptionKey(), assetUrl, platformUrl: appUrl() }, now)}
        // Before activation the client can try everything; the app gets what its plan allows.
        studioOnPlan={plan ? hasFeature(plan, "studio") : true}
      />
    </div>
  );
}
