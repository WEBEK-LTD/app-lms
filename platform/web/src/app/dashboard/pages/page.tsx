import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Notice, btn } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey } from "@/lib/env";
import { pickableContent } from "@/lib/hosted/pages/pickable";
import { designById, designFits, designsFor } from "@/lib/pages/designs";
import { designLayout, designSamples, hasUnpublishedChanges, loadLayout, withoutStrings } from "@/lib/pages/layout";
import { blockTypesFor, categorySourcesFor, itemSourcesFor, screenOptionsFor } from "@/lib/pages/sources";
import { PagesEditor } from "./editor";
import { currentPlanId } from "@/lib/billing/plan-change";
import { effectivePlans } from "@/lib/entitlements";
import { defaultLayout } from "@/lib/pages/defaults";
import { appDefaults } from "@/lib/pages/layout";
import { allowedSources } from "@/lib/pages/plan";
import { hasFeature, lowestPlanWith } from "@/lib/plans";
import { builtInSuggestions } from "@/lib/pages/builtin";

export const metadata: Metadata = { title: "Pages & look" };
export const dynamic = "force-dynamic";

/** 10.4: the app's pages, bottom tabs, look and languages, with a preview, drafts and publishing. */
export default async function PagesPage() {
  const { app, license } = await requireClient();
  if (!app) {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Pages & look</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
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
        ? "The Yallapp plugin on your site gets published changes within a minute when your site can be reached, otherwise within 15 minutes; Refresh in the plugin settings gets them at once."
        : app.backend === "setup_requested"
          ? // 19 The pages reach the app through the plugin on the site our team sets up.
            "Once our team has set up your WordPress site, the Yallapp plugin on it picks up what you publish here within 15 minutes."
          : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex max-w-[680px] flex-[1_1_320px] flex-col gap-2">
          <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Pages & look</h1>
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">
            Build your app&apos;s pages from blocks, choose its bottom tabs, look and languages. Changes are saved as a draft; your app shows them once you publish.
          </p>
        </div>
        {/* 17 The real app: with the saved draft on the hosted API, else with what's published. A new tab keeps the editor (and its autosave) open. */}
        <div className="flex flex-col items-start gap-1">
          <a
            href={app.backend === "hosted" ? "/dashboard/preview?pages=draft" : "/dashboard/preview"}
            target="_blank"
            rel="noopener"
            className={`${btn.secondary} h-10 px-4 text-sm`}
          >
            <Icon name="visibility" size={18} />
            {app.backend === "hosted" ? "Preview the draft in your app" : "Preview your app"}
            <Icon name="open_in_new" size={16} />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          {app.backend === "hosted" ? null : <span className="text-[13px] text-muted">Shows your published pages.</span>}
        </div>
      </div>
      {reach ? null : (
        <Notice tone="warn" icon="info">
          Apps on your own API don&apos;t get these pages from Yallapp. They reach apps through the Yallapp plugin or the Yallapp hosted API.
        </Notice>
      )}
      <PagesEditor
        initial={{
          draft: withoutStrings(record.draft),
          savedAt: record.draftUpdatedAt.toISOString(),
          published: record.published && record.publishedAt ? { version: record.published.version, at: record.publishedAt.toISOString() } : null,
          changes: hasUnpublishedChanges(record),
          design: designById(app.design) && designFits(designById(app.design)!, app) ? app.design! : null,
          samples: designSamples(app, now),
        }}
        designs={designsFor(app).map((d) => ({ id: d.id, name: d.name, description: d.description, layout: designLayout(app, d, record.draft, now) }))}
        app={{
          appType: app.appType,
          name: app.appName ?? "Your app",
          primaryColor: app.primaryColor,
          logoUrl: app.logoAssetId ? assetUrl(app.logoAssetId) : null,
        }}
        sources={sources}
        categorySources={categorySourcesFor(app).filter((s) => sources.includes(s))}
        screens={screenOptionsFor(app)}
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
        // 43 The preview shows Yallapp's Arabic and Turkish where the owner wrote none, as the app does.
        builtin={builtInSuggestions(app.appName ?? null, ["ar", "tr"])}
      />
    </div>
  );
}
