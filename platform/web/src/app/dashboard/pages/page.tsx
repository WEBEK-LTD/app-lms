import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey } from "@/lib/env";
import { pickableContent } from "@/lib/hosted/pages/pickable";
import { hasUnpublishedChanges, loadLayout } from "@/lib/pages/layout";
import { blockTypesFor, categorySourcesFor, itemSourcesFor } from "@/lib/pages/sources";
import { PagesEditor } from "./editor";
import { currentPlanId } from "@/lib/billing/plan-change";
import { effectivePlans } from "@/lib/entitlements";
import { defaultLayout } from "@/lib/pages/defaults";
import { appDefaults } from "@/lib/pages/layout";
import { allowedSources } from "@/lib/pages/plan";
import { hasFeature, lowestPlanWith } from "@/lib/plans";

export const metadata: Metadata = { title: "Pages & look" };
export const dynamic = "force-dynamic";

/** 10.4: the app's pages, bottom tabs, look and languages, with a preview, drafts and publishing. */
export default async function PagesPage() {
  const { app, license } = await requireClient();
  if (!app) {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[28px] font-extrabold">Pages & look</h1>
        <p className="m-0 text-[17px] leading-relaxed text-ink-4">
          First <Link href="/dashboard/app-type">choose your app type</Link>. Your app then starts with a home page you can change here.
        </p>
      </div>
    );
  }
  const store = await getStore();
  const now = new Date();
  const record = await loadLayout(store, app, now);
  const pickable = await pickableContent(app, { store, key: encryptionKey(), assetUrl, platformUrl: appUrl() }, now);
  // 13.1 What the app's plan allows: the full editor, its languages and content sources.
  const plans = await effectivePlans(store);
  const planId = license ? currentPlanId(license, now) : null;
  const plan = planId ? plans[planId] : null;
  const sources = plan ? allowedSources(app, plan) : itemSourcesFor(app);
  const ready = defaultLayout(app, await appDefaults(store), app.createdAt);
  const reach =
    app.backend === "hosted"
      ? "Your app gets published changes the next time it opens."
      : app.backend === "wordpress"
        ? "The Yallapp plugin on your site picks up published changes within 15 minutes; Refresh in the plugin settings gets them at once."
        : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[680px] flex-col gap-2">
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.5px] sm:text-[34px]">Pages & look</h1>
        <p className="m-0 text-[17px] leading-relaxed text-ink-4">
          Build your app&apos;s pages from blocks, choose its bottom tabs, look and languages. Changes are saved as a draft; your app shows them once you publish.
        </p>
      </div>
      {reach ? null : (
        <Notice tone="warn" icon="info">
          Apps on your own API don&apos;t get these pages from Yallapp. They reach apps through the Yallapp plugin or the Yallapp hosted API.
        </Notice>
      )}
      <PagesEditor
        initial={{
          draft: record.draft,
          savedAt: record.draftUpdatedAt.toISOString(),
          published: record.published && record.publishedAt ? { version: record.published.version, at: record.publishedAt.toISOString() } : null,
          changes: hasUnpublishedChanges(record),
        }}
        app={{
          appType: app.appType,
          name: app.appName ?? "Your app",
          primaryColor: app.primaryColor,
          logoUrl: app.logoAssetId ? assetUrl(app.logoAssetId) : null,
        }}
        sources={sources}
        categorySources={categorySourcesFor(app).filter((s) => sources.includes(s))}
        blockTypes={blockTypesFor(app)}
        pickable={pickable}
        reach={reach}
        plan={{
          name: plan?.name ?? "current",
          // Before activation the client can try everything; the app gets what its plan allows.
          pageEditor: plan ? hasFeature(plan, "page_editor") : true,
          languages: plan?.limits.languages ?? null,
          upgradeEditor: plan ? lowestPlanWith(plans, (p) => hasFeature(p, "page_editor"), planId) : null,
          upgradeLanguages: plan ? lowestPlanWith(plans, (p) => p.limits.languages === null || p.limits.languages > (plan.limits.languages ?? 0), planId) : null,
        }}
        ready={{ pages: ready.pages, tabs: ready.tabs }}
      />
    </div>
  );
}
