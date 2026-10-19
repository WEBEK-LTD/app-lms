import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHeader, formatDate } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { stabilityOf } from "@/lib/crashes/service";
import { getStore } from "@/lib/data";
import { AppHealthForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("health.stability") };
}

/**
 * 46 The owner's simple view of crash reports: the share of app sessions
 * without a crash over 30 days and the most frequent problems (our team sees
 * the details and fixes them), with the rating prompt and crash report switches.
 */
export default async function StabilityPage() {
  const { app } = await requireClient();
  if (!app) redirect("/dashboard/app-type");
  const stability = await stabilityOf(await getStore(), app.id, new Date());
  const off = app.crashReports === false;
  const { t, k, num, lang } = await dashboardText();
  return (
    <>
      <PageHeader title={t("health.stability")} description={t("health.stabilityText", { app: appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app) })} />
      <section aria-labelledby="h-crash-free" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-crash-free" className="m-0 flex items-center gap-2 text-lg font-bold">
          <Icon name="monitoring" size={22} />
          {t("health.crashFree")}
        </h2>
        {off ? (
          <p className="m-0 text-[15px] text-ink-4">{t("health.offText")}</p>
        ) : stability.crashFree === null ? (
          <p className="m-0 text-[15px] text-ink-4">{t("health.noData")}</p>
        ) : (
          <>
            <span className="text-[32px] leading-none font-extrabold" data-crash-free="">
              {t("health.percent", { percent: num(stability.crashFree) })}
            </span>
            <span className="text-sm text-muted">{t("health.sessions", { count: stability.sessions })}</span>
          </>
        )}
      </section>

      <section aria-labelledby="h-top" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-top" className="m-0 text-lg font-bold">
          {t("health.frequent")}
        </h2>
        {stability.top.length === 0 ? (
          <p className="m-0 text-[15px] text-ink-4">{t("health.noProblems")}</p>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col gap-2 p-0" data-top-crashes="">
              {stability.top.map((issue) => (
                <li key={issue.id} className="flex flex-col gap-0.5 border-t border-line-soft pt-2 first:border-t-0 first:pt-0">
                  <span className="font-mono text-[13px] break-words" dir="ltr">
                    {issue.title}
                  </span>
                  <span className="text-xs text-muted">
                    {t("health.issueLine", { count: issue.count, date: formatDate(issue.lastSeenAt, lang), version: issue.versions[issue.versions.length - 1] ?? "" })}
                  </span>
                </li>
              ))}
            </ul>
            <p className="m-0 text-sm text-muted">{t("health.teamFixes")}</p>
          </>
        )}
      </section>

      <section aria-labelledby="h-switches" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-switches" className="m-0 text-lg font-bold">
          {t("health.switches")}
        </h2>
        <AppHealthForm reviewPrompt={app.reviewPrompt !== false} crashReports={!off} />
      </section>
    </>
  );
}
