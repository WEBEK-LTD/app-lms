import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { KitBar, KitHeader, KitPage, KitSection } from "@/components/studio-page";
import { appLabel } from "@/lib/app/label";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { appUrl } from "@/lib/env";
import { siteLinkBase, yallappLinkBase } from "@/lib/links/table";
import { hasFeature } from "@/lib/plans";
import { AppLinksForm, CheckLinksPanel } from "./forms";
import { dashboardText } from "@/lib/dashboard-lang";
import { PublishingTabs } from "../tabs";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("stores.linksTitle") };
}

/** An example link of the app's own kind of content. */
const EXAMPLE: Record<string, string> = {
  lms: "course/12",
  store: "product/12",
  booking: "service/12",
  real_estate: "listing/12",
  news: "article/12",
  events: "event/12",
  donations: "campaign/12",
};

/**
 * 46 Links that open the app (Android App Links, iOS Universal Links): what
 * a shared link looks like, the Play App Signing key's fingerprint and the
 * Apple Team ID the link files need, and "Check links".
 */
export default async function AppLinksPage() {
  const { app, license } = await requireClient("settings");
  if (!app) redirect("/dashboard/app-type");
  const plan = await appPlan(await getStore(), license, new Date());
  const ios = hasFeature(plan, "ios");
  const site = app.backend === "wordpress" ? siteLinkBase(app.siteUrl) : null;
  const example = EXAMPLE[app.appType] ?? "page/home";
  const { t, k } = await dashboardText();
  // 132.171 The console's look: Publishing's tabs under the title, the keys and the check, then how links work.
  return (
    <KitPage>
      <KitHeader title={t("stores.linksTitle")} description={t("stores.linksIntro", { app: appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app) })} />
      <KitBar>
        <PublishingTabs more={app.publishingMode === "self"} />
      </KitBar>
      <KitSection titleId="h-keys" title={t("stores.filesNeed")}>
        <AppLinksForm ios={ios} reportedTeamId={Boolean(app.appleTeamId)} saved={{ playSigningSha256: app.playSigningSha256 ?? "", appleTeamId: app.appleTeamId ?? "" }} />
      </KitSection>
      <KitSection titleId="h-check" title={t("stores.linkStatus")}>
        <CheckLinksPanel last={app.linksCheck ?? null} />
      </KitSection>
      <KitSection
        titleId="h-how"
        title={
          <span className="flex items-center gap-2">
            <Icon name="link" size={20} />
            {t("stores.howLinks")}
          </span>
        }
      >
        <p className="m-0 text-sm leading-relaxed text-(--sp-muted)">{site ? t("stores.howLinksSite") : t("stores.howLinksYallapp")}</p>
        <ul className="m-0 flex list-none flex-col gap-1.5 rounded-xl bg-(--sp-soft) p-3 font-mono text-[13px] break-all text-(--sp-ink)" dir="ltr">
          {site ? <li>{`${site}/${example}`}</li> : null}
          <li>{`${yallappLinkBase(appUrl(), app.id)}/${example}`}</li>
        </ul>
        <p className="m-0 text-sm text-(--sp-muted)">{site ? t("stores.filesSite") : t("stores.filesYallapp")}</p>
      </KitSection>
    </KitPage>
  );
}
