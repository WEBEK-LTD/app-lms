import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { draftLayout } from "@/lib/pages/layout";
import { studioScreensOn } from "@/lib/studio/screens";
import { appLanguageName } from "@/lib/i18n/language-names";
import { assetUrl } from "@/lib/assets";
import { ScreensEditor } from "./editor";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("studio.screensTitle") };
}
export const dynamic = "force-dynamic";

/**
 * 118.3 Yallapp Studio › Sign-in & account: the sign-in screen's look (four
 * looks, a photo, the welcome in each of the app's languages, the logo) and
 * the account menu (its order, entries hidden or renamed, their icons, the
 * owner's own entries, the top of the menu), with a preview.
 */
export default async function ScreensPage() {
  const { app } = await requireClient("settings");
  const { t, lang } = await dashboardText();
  if (!app || !studioScreensOn(app)) {
    return <PageHeader title={t("studio.screensTitle")} description={t("studio.screensOnlyStudio")} />;
  }
  const layout = await draftLayout(await getStore(), app, new Date());
  const languages = layout.languages.available.map((code) => ({ code, name: appLanguageName(code, lang) }));
  const pages = layout.pages.map((p) => ({ slug: p.slug, title: p.title }));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("studio.screensTitle")} description={t("studio.screensIntro")} />
      <ScreensEditor
        initial={app.hostedSettings?.studioScreens ?? null}
        languages={languages}
        pages={pages}
        appName={app.appName ?? ""}
        color={app.primaryColor ?? "#0E1424"}
        courses={app.appType === "lms"}
        brand={{
          main: layout.appearance.primary_color ?? app.primaryColor ?? "#0E1424",
          second: layout.appearance.secondary_color ?? null,
          appName: app.appName ?? "",
          logoUrl: app.logoAssetId ? assetUrl(app.logoAssetId) : null,
          iconUrl: app.iconAssetId ? assetUrl(app.iconAssetId) : null,
        }}
      />
    </div>
  );
}
