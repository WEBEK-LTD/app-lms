import { plansIn } from "@/lib/marketing-lang";
import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Notice, btn } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey, signingSecret } from "@/lib/env";
import { pickableContent } from "@/lib/hosted/pages/pickable";
import { designById, designFits, designsFor } from "@/lib/pages/designs";
import { designLayout, designSamples, hasUnpublishedChanges, layoutHistory, loadLayout, withoutStrings } from "@/lib/pages/layout";
import { appVersionsInUse } from "@/lib/pages/reach";
import { blockTypesFor, categorySourcesFor, itemSourcesFor, screenOptionsFor } from "@/lib/pages/sources";
import { PagesEditor } from "./editor";
import { currentPlanId } from "@/lib/billing/plan-change";
import { effectivePlans } from "@/lib/entitlements";
import { defaultLayout } from "@/lib/pages/defaults";
import { appDefaults } from "@/lib/pages/layout";
import { allowedSources } from "@/lib/pages/plan";
import { hasFeature, lowestPlanWith } from "@/lib/plans";
import { builtInSuggestions } from "@/lib/pages/builtin";
import { draftPreviewSupported } from "@/lib/preview/config";
import { createPreviewToken, previewAppPath, previewKey } from "@/lib/preview/token";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("pages.title") };
}
export const dynamic = "force-dynamic";

/** 10.4: the app's pages, bottom tabs, look and languages, with a preview, drafts and publishing. */
export default async function PagesPage({ searchParams }: PageProps<"/dashboard/pages">) {
  const { app, license } = await requireClient("settings");
  const query = await searchParams;
  const { t } = await dashboardText();
  if (!app) {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("pages.title")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {richText(t("pages.chooseTypeFirst"), { link: (chunk) => <Link href="/dashboard/app-type">{chunk}</Link> })}
        </p>
      </div>
    );
  }
  const store = await getStore();
  const now = new Date();
  const record = await loadLayout(store, app, now);
  const pickable = await pickableContent(app, { store, key: encryptionKey(), assetUrl, platformUrl: appUrl() }, now);
  // 13.1 What the app's plan allows: the full editor, its languages and content sources.
  const plans = plansIn((await dashboardText()).lang, await effectivePlans(store));
  const planId = license ? currentPlanId(license, now) : null;
  const plan = planId ? plans[planId] : null;
  const sources = plan ? allowedSources(app, plan) : itemSourcesFor(app);
  const ready = defaultLayout(app, await appDefaults(store), app.createdAt);
  const reach =
    app.backend === "hosted"
      ? t("pages.reachHosted")
      : app.backend === "wordpress"
        ? t("pages.reachWordpress")
        : app.backend === "setup_requested"
          ? // 19 The pages reach the app through the plugin on the site our team sets up.
            t("pages.reachSetup")
          : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex max-w-[680px] flex-[1_1_320px] flex-col gap-2">
          <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("pages.title")}</h1>
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("pages.intro")}</p>
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
            {app.backend === "hosted" ? t("pages.previewDraft") : t("pages.previewApp")}
            <Icon name="open_in_new" size={16} />
            <span className="sr-only">{t("common.opensInNewTab")}</span>
          </a>
          {app.backend === "hosted" ? null : <span className="text-[13px] text-muted">{t("pages.showsPublished")}</span>}
        </div>
      </div>
      {/* 81.3 The draft was just made from the website. */}
      {query.from === "site" && app.siteUrl ? (
        <Notice tone="success" icon="check_circle" role="status">
          {richText(t("pages.fromSite", { site: new URL(app.siteUrl).hostname }), { setup: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })}
        </Notice>
      ) : null}
      {reach ? null : (
        <Notice tone="warn" icon="info">
          {t("pages.ownApi")}
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
          history: await layoutHistory(store, app.id),
        }}
        designs={designsFor(app).map((d) => ({ id: d.id, name: d.name, description: d.description, layout: designLayout(app, d, record.draft, now), palettes: d.palettes ?? [] }))}
        app={{
          appType: app.appType,
          name: app.appName ?? t("setup.yourApp"),
          primaryColor: app.primaryColor,
          logoUrl: app.logoAssetId ? assetUrl(app.logoAssetId) : null,
        }}
        sources={sources}
        categorySources={categorySourcesFor(app).filter((s) => sources.includes(s))}
        screens={screenOptionsFor(app)}
        blockTypes={blockTypesFor(app)}
        pickable={pickable}
        versions={await appVersionsInUse(store, app.id, now)}
        reach={reach}
        plan={{
          name: plan?.name ?? "",
          // Before activation the client can try everything; the app gets what its plan allows.
          pageEditor: plan ? hasFeature(plan, "page_editor") : true,
          languages: plan?.limits.languages ?? null,
          upgradeEditor: plan ? lowestPlanWith(plans, (p) => hasFeature(p, "page_editor"), planId) : null,
          upgradeLanguages: plan ? lowestPlanWith(plans, (p) => p.limits.languages === null || p.limits.languages > (plan.limits.languages ?? 0), planId) : null,
        }}
        ready={{ pages: ready.pages, tabs: ready.tabs }}
        // 43 The preview shows Yallapp's Arabic and Turkish where the owner wrote none, as the app does.
        builtin={builtInSuggestions(app.appName ?? null, ["ar", "tr"])}
        // 82.1 The real app with the draft beside the editor (apps on the hosted API).
        live={draftPreviewSupported(app) ? previewAppPath(createPreviewToken({ appId: app.id, draft: true }, previewKey(signingSecret()), now)) : null}
      />
    </div>
  );
}
