import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { currentPlanId } from "@/lib/billing/plan-change";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { appUrl, encryptionKey } from "@/lib/env";
import { FREE_FONT_COUNT } from "@/lib/fonts/catalog";
import { pickableContent } from "@/lib/hosted/pages/pickable";
import { loadLayout, withoutStrings } from "@/lib/pages/layout";
import { allowedSources } from "@/lib/pages/plan";
import { categorySourcesFor, itemSourcesFor, screenOptionsFor } from "@/lib/pages/sources";
import { hasFeature } from "@/lib/plans";
import { isStudioProject } from "@/lib/studio/section";
import { StudioEditor } from "./editor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await dashboardText();
  return { title: t("studio.title") };
}
export const dynamic = "force-dynamic";

/** 103R.4 Yallapp Studio's editor: the app's pages, designed element by element, in the layout's draft. */
export default async function StudioEditorPage({ searchParams }: PageProps<"/studio/editor">) {
  const { app, license } = await requireClient("settings");
  // 103R.3 Studio's editor is for Studio projects; a regular app keeps the dashboard's page editor.
  if (!app || !isStudioProject(app)) redirect("/studio");
  const { t } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const plans = await effectivePlans(store);
  const planId = license ? currentPlanId(license, now) : null;
  const plan = planId ? plans[planId] : null;
  const record = await loadLayout(store, app, now);
  const sources = plan ? allowedSources(app, plan) : itemSourcesFor(app);
  const query = await searchParams;
  return (
    <StudioEditor
      initial={{
        draft: withoutStrings(record.draft),
        savedAt: record.draftUpdatedAt.toISOString(),
        published: record.published && record.publishedAt ? { version: record.published.version, at: record.publishedAt.toISOString() } : null,
      }}
      app={{ name: app.appName ?? t("setup.yourApp"), brand: app.primaryColor, logoUrl: app.logoAssetId ? assetUrl(app.logoAssetId) : null }}
      sources={sources}
      categorySources={categorySourcesFor(app).filter((s) => sources.includes(s))}
      screens={screenOptionsFor(app)}
      pickable={await pickableContent(app, { store, key: encryptionKey(), assetUrl, platformUrl: appUrl() }, now)}
      myTemplates={(await store.listStudioTemplates(app.clientId)).map(({ id, name, page }) => ({ id, name, page }))}
      // 17 The real app with the saved draft on the hosted API, else with what's published.
      previewHref={app.backend === "hosted" ? "/studio/project/preview?pages=draft" : "/studio/project/preview"}
      fontCount={FREE_FONT_COUNT}
      startSlug={typeof query.page === "string" ? query.page : null}
      // Designing works on any plan; the app gets the design with Studio on the plan (before activation, everything).
      studioOnPlan={plan ? hasFeature(plan, "studio") : true}
      kind={{ type: app.appType, vertical: app.vertical ?? null }}
    />
  );
}
