import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KitEmpty, KitHeader, KitHero, KitList, KitNext, KitPage, KitRow, KitSection, KitStatus, KitThumb, kit } from "@/components/studio-page";
import { Icon } from "@/components/icon";
import { ProgressBar, formatDate } from "@/components/ui";
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
  const good = stability.crashFree !== null && stability.crashFree >= 99;
  // 132.143 The premium kit: the share without a crash in one hero card (its state as a pill, what the team does as its next step),
  // the problems as rows, then the two switches as settings rows with their explanations behind "?".
  return (
    <KitPage>
      <KitHeader icon="monitoring" title={t("health.stability")} description={t("health.stabilityText", { app: appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app) })} />
      <KitHero
        titleId="h-crash-free"
        heading={t("health.crashFree")}
        status={
          off ? (
            <KitStatus tone="neutral">{t("common.off")}</KitStatus>
          ) : stability.crashFree === null ? (
            <KitStatus tone="neutral">{t("health.noDataTitle")}</KitStatus>
          ) : (
            <KitStatus tone={good ? "success" : "warn"}>{good ? t("health.good") : t("health.couldBeBetter")}</KitStatus>
          )
        }
        title={
          off ? (
            t("health.offTitle")
          ) : stability.crashFree === null ? (
            t("health.noDataTitle")
          ) : (
            <span className="text-[40px] leading-none tracking-[-1px] tabular-nums sm:text-[48px]" data-crash-free="">
              {t("health.percent", { percent: num(stability.crashFree) })}
            </span>
          )
        }
        description={off ? t("health.offText") : stability.crashFree === null ? t("health.noData") : t("health.sessions", { count: stability.sessions })}
        next={
          off ? (
            <KitNext
              icon="settings"
              tone="warn"
              action={
                <a href="#h-switches" className={kit.quiet}>
                  {t("health.turnOn")}
                </a>
              }
            >
              {t("health.crashReports")}
            </KitNext>
          ) : stability.top.length ? (
            <KitNext icon="support_agent" tone="success">
              {t("health.teamFixes")}
            </KitNext>
          ) : undefined
        }
      >
        {!off && stability.crashFree !== null ? <ProgressBar value={stability.crashFree} max={100} label={t("health.crashFree")} tone={good ? "success" : "warn"} /> : null}
      </KitHero>

      <KitSection titleId="h-top" title={t("health.frequent")} flush>
        {stability.top.length === 0 ? (
          <KitEmpty icon="task_alt" title={t("health.noProblems")} />
        ) : (
          <div data-top-crashes="">
            <KitList>
              {stability.top.map((issue) => (
                <KitRow
                  key={issue.id}
                  media={<KitThumb icon="error" size={40} />}
                  title={
                    <span className="font-mono text-[13px] break-words" dir="ltr">
                      {issue.title}
                    </span>
                  }
                  meta={t("health.issueLine", { count: issue.count, date: formatDate(issue.lastSeenAt, lang), version: issue.versions[issue.versions.length - 1] ?? "" })}
                  aside={
                    <span className="flex items-center gap-1 text-[13px] font-bold text-(--sp-muted) tabular-nums">
                      <Icon name="trending_up" size={16} />
                      {num(issue.count)}
                    </span>
                  }
                />
              ))}
            </KitList>
          </div>
        )}
      </KitSection>

      <div id="h-switches" className="flex scroll-mt-6 flex-col gap-3">
        <h2 className="m-0 px-1 text-[13px] font-semibold text-(--sp-muted)">{t("health.switches")}</h2>
        <AppHealthForm reviewPrompt={app.reviewPrompt !== false} crashReports={!off} />
      </div>
    </KitPage>
  );
}
