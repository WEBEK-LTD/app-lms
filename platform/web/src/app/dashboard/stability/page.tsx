import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { Thumb } from "@/components/page-kit";
import { PageHeader, ProgressBar, Section, formatDate } from "@/components/ui";
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
  const { app } = await requireClient("settings");
  if (!app) redirect("/dashboard/app-type");
  const stability = await stabilityOf(await getStore(), app.id, new Date());
  const off = app.crashReports === false;
  const { t, k, num, lang } = await dashboardText();
  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, the share without a crash, the problems as a list, then the switches. */}
      <PageHeader title={t("health.stability")} description={t("health.stabilityText", { app: appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app) })} />
      <Section
        titleId="h-crash-free"
        title={
          <span className="flex items-center gap-2">
            <Icon name="monitoring" size={22} />
            {t("health.crashFree")}
          </span>
        }
      >
        {off ? (
          <p className="m-0 text-[15px] text-ink-4">{t("health.offText")}</p>
        ) : stability.crashFree === null ? (
          <p className="m-0 text-[15px] text-ink-4">{t("health.noData")}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${stability.crashFree >= 99 ? "bg-success-bg text-success" : "bg-warn-bg text-warn"}`}>
              <Icon name={stability.crashFree >= 99 ? "check_circle" : "warning"} size={30} />
            </span>
            <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2">
              <span className="text-[32px] leading-none font-extrabold tabular-nums" data-crash-free="">
                {t("health.percent", { percent: num(stability.crashFree) })}
              </span>
              <ProgressBar value={stability.crashFree} max={100} label={t("health.crashFree")} tone={stability.crashFree >= 99 ? "success" : "warn"} />
              <span className="text-sm text-muted">{t("health.sessions", { count: stability.sessions })}</span>
            </div>
          </div>
        )}
      </Section>

      <Section titleId="h-top" title={t("health.frequent")} description={stability.top.length ? t("health.teamFixes") : undefined} flush>
        {stability.top.length === 0 ? (
          <p className="m-0 flex items-center gap-2 px-5 py-5 text-[15px] text-ink-4 sm:px-6">
            <Icon name="check_circle" size={20} className="text-success" />
            {t("health.noProblems")}
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0" data-top-crashes="">
            {stability.top.map((issue, i) => (
              <li key={issue.id} className="flex items-start gap-3.5 border-t border-line-soft px-5 py-3.5 first:border-t-0 sm:px-6">
                <Thumb icon="error" shape="square" tint={i} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-mono text-[13px] font-semibold break-words text-midnight" dir="ltr">
                    {issue.title}
                  </span>
                  <span className="text-[13px] text-muted">
                    {t("health.issueLine", { count: issue.count, date: formatDate(issue.lastSeenAt, lang), version: issue.versions[issue.versions.length - 1] ?? "" })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section titleId="h-switches" title={t("health.switches")}>
        <AppHealthForm reviewPrompt={app.reviewPrompt !== false} crashReports={!off} />
      </Section>
    </div>
  );
}
