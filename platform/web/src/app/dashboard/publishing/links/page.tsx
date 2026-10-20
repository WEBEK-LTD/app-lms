import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { appUrl } from "@/lib/env";
import { siteLinkBase, yallappLinkBase } from "@/lib/links/table";
import { hasFeature } from "@/lib/plans";
import { AppLinksForm, CheckLinksPanel } from "./forms";
import { dashboardText } from "@/lib/dashboard-lang";

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
  const { app, license } = await requireClient();
  if (!app) redirect("/dashboard/app-type");
  const plan = await appPlan(await getStore(), license, new Date());
  const ios = hasFeature(plan, "ios");
  const site = app.backend === "wordpress" ? siteLinkBase(app.siteUrl) : null;
  const example = EXAMPLE[app.appType] ?? "page/home";
  const { t, k } = await dashboardText();
  return (
    <>
      <PageHeader
        eyebrow={<Link href="/dashboard/publishing">{t("publishing.title")}</Link>}
        title={t("stores.linksTitle")}
        description={t("stores.linksIntro", { app: appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app) })}
      />
      <section aria-labelledby="h-how" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-how" className="m-0 flex items-center gap-2 text-lg font-bold">
          <Icon name="link" size={22} />
          {t("stores.howLinks")}
        </h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{site ? t("stores.howLinksSite") : t("stores.howLinksYallapp")}</p>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 font-mono text-sm break-all" dir="ltr">
          {site ? <li>{`${site}/${example}`}</li> : null}
          <li>{`${yallappLinkBase(appUrl(), app.id)}/${example}`}</li>
        </ul>
        <p className="m-0 text-sm text-muted">{site ? t("stores.filesSite") : t("stores.filesYallapp")}</p>
      </section>

      <section aria-labelledby="h-keys" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-keys" className="m-0 text-lg font-bold">
          {t("stores.filesNeed")}
        </h2>
        <AppLinksForm
          ios={ios}
          reportedTeamId={Boolean(app.appleTeamId)}
          saved={{ playSigningSha256: app.playSigningSha256 ?? "", appleTeamId: app.appleTeamId ?? "" }}
        />
      </section>

      <section aria-labelledby="h-check" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-check" className="m-0 text-lg font-bold">
          {t("stores.linkStatus")}
        </h2>
        <CheckLinksPanel last={app.linksCheck ?? null} />
      </section>
    </>
  );
}
