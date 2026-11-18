import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { appUrl, encryptionKey } from "@/lib/env";
import { pickableContent } from "@/lib/hosted/pages/pickable";
import { appLanguageName } from "@/lib/i18n/language-names";
import { loadLayout } from "@/lib/pages/layout";
import { screenOptionsFor } from "@/lib/pages/sources";
import { appLanguagesOf } from "@/lib/selling/store";
import { ensureStoriesSeeded, STORY_LIMITS, storyLanguages } from "@/lib/stories";
import { storyViewOf } from "@/lib/stories/view";
import { redirect } from "next/navigation";
import { StoriesEditor } from "./stories-editor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await dashboardText();
  return { title: t("stories.title") };
}

/**
 * 165 Dashboard › Stories: the app's full-screen stories and story rings,
 * added, changed, switched on or off, scheduled, reordered and removed,
 * each with a live preview. The first time it opens for an app made from
 * the flower shop's template, the stories its Studio design shows are
 * copied here (lib/stories ensureStoriesSeeded), nothing in the app changing.
 */
export default async function StoriesPage() {
  const { app } = await requireClient("settings");
  if (!app) redirect("/dashboard/app-type");
  const { t, lang } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const copied = await ensureStoriesSeeded(store, app, now);
  const [stories, languages, record, pickable, own] = await Promise.all([
    store.listAppStories(app.id),
    appLanguagesOf(store, app),
    loadLayout(store, app, now),
    pickableContent(app, { store, key: encryptionKey(), assetUrl, platformUrl: appUrl() }, now),
    // A shop managed here: every one of its categories, those without products yet too (the app's list leaves them out).
    app.connector?.kind === "catalog" ? store.listCatalogCategories(app.id) : Promise.resolve([]),
  ]);
  const categories = new Map([...own.map((c) => [String(c.id), c.name] as const), ...(pickable.categories.products ?? []).map((c) => [c.id, c.name] as const)]);
  const main = languages.default;
  const langs = storyLanguages([main, ...languages.available.filter((l) => l !== main)]).map((code) => ({ code, name: appLanguageName(code, lang) }));
  const fromStudio = copied > 0 || stories.some((s) => s.importKey !== null);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("stories.title")} description={t("stories.intro")} />
      <StoriesEditor
        initial={stories.map(storyViewOf)}
        languages={langs}
        max={STORY_LIMITS.stories}
        limits={STORY_LIMITS}
        fromStudio={fromStudio && copied > 0}
        studioHref={app.section === "studio" ? "/studio/editor" : "/dashboard/pages"}
        appName={app.appName ?? ""}
        brand={app.primaryColor}
        pages={record.draft.pages.map((p) => ({ slug: p.slug, title: p.title || p.slug }))}
        screens={screenOptionsFor(app)}
        categories={[...categories].map(([id, name]) => ({ id, name }))}
        products={(pickable.items.products ?? []).map((p) => ({ id: p.id, title: p.title }))}
        hasShop={app.appType === "store"}
      />
    </div>
  );
}
