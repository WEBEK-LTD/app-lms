import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KitCallout, KitEmpty, KitHeader, KitHero, KitNext, KitPage, KitSection, KitStat, KitThumb, kit } from "@/components/studio-page";
import { KitInspectorFacts, KitInspectorHead, KitTable, KitTableRow } from "@/components/studio-page/table";
import { formatDate } from "@/components/ui";
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
  const rating = app.reviewPrompt !== false;
  const { t, k, num, lang } = await dashboardText();
  const known = !off && stability.crashFree !== null;
  const good = stability.crashFree !== null && stability.crashFree >= 99;
  const word = (text: string) => <span className="text-[24px] tracking-[-0.3px]">{text}</span>;
  // 132.173 The console's look: the numbers as tiles (the share without a crash first, with its bar), what the team does under them,
  // the problems as a table whose rows open in the inspector, then the two switches as settings rows.
  return (
    <KitPage>
      <KitHeader icon="monitoring" title={t("health.stability")} description={t("health.stabilityText", { app: appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app) })} />
      <KitHero
        label={t("health.crashFree")}
        stats={
          <>
            <KitStat
              icon="verified"
              label={t("health.crashFree")}
              value={known ? <span data-crash-free="">{t("health.percent", { percent: num(stability.crashFree!) })}</span> : "—"}
              hint={off ? t("health.offTitle") : stability.crashFree === null ? t("health.noDataTitle") : good ? t("health.good") : t("health.couldBeBetter")}
              progress={known ? stability.crashFree! / 100 : undefined}
            />
            <KitStat icon="error" tone={stability.open ? "warn" : "success"} label={t("health.problems")} value={num(stability.open)} href="#h-top" />
            <KitStat icon="smartphone" label={t("health.sessionsLabel")} value={num(stability.sessions)} />
            <KitStat icon="star" tone={rating ? "success" : "neutral"} label={t("health.askRating")} value={word(rating ? t("common.on") : t("common.off"))} href="#h-switches" />
          </>
        }
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
              {t("health.offText")}
            </KitNext>
          ) : stability.crashFree === null ? (
            <KitNext icon="schedule">{t("health.noData")}</KitNext>
          ) : (
            <KitNext icon="support_agent" tone="success">
              {t("health.sessions", { count: stability.sessions })}
              {stability.top.length ? ` ${t("health.teamFixes")}` : null}
            </KitNext>
          )
        }
      />

      <KitSection id="h-top" titleId="h-top-title" title={t("health.frequent")} flush>
        {stability.top.length === 0 ? (
          <KitEmpty icon="task_alt" title={t("health.noProblems")} />
        ) : (
          <KitTable
            data-top-crashes=""
            label={t("health.frequent")}
            closeLabel={t("common.close")}
            media
            name={t("health.colProblem")}
            columns={[
              { label: t("health.colTimes"), width: "96px" },
              { label: t("health.lastSeen"), width: "150px", wide: true },
            ]}
            end={{ label: t("health.colVersion"), width: "120px" }}
          >
            {stability.top.map((issue) => {
              const version = issue.versions[issue.versions.length - 1] ?? "";
              return (
                <KitTableRow
                  key={issue.id}
                  id={issue.id}
                  data-crash-issue={issue.id}
                  media={<KitThumb icon="error" size={40} />}
                  name={
                    <span className="min-w-0 truncate font-mono text-[13px]" dir="ltr">
                      {issue.title}
                    </span>
                  }
                  line={t("health.issueLine", { count: issue.count, date: formatDate(issue.lastSeenAt, lang), version })}
                  cells={[<span key="n" className="font-sans font-semibold text-(--sp-ink) tabular-nums">{num(issue.count)}</span>, formatDate(issue.lastSeenAt, lang)]}
                  end={
                    <bdi dir="ltr" className="font-sans text-[13px] font-semibold text-(--sp-ink-2) tabular-nums">
                      {version}
                    </bdi>
                  }
                  inspector={{ label: issue.title, title: t("health.colProblem") }}
                >
                  <div className="flex flex-col gap-4" data-inspector-issue={issue.id}>
                    <KitInspectorHead
                      title={
                        <span dir="ltr" className="font-mono text-[15px] leading-snug">
                          {issue.title}
                        </span>
                      }
                      line={t("health.issueLine", { count: issue.count, date: formatDate(issue.lastSeenAt, lang), version })}
                    />
                    <KitInspectorFacts
                      facts={[
                        [t("health.colTimes"), num(issue.count)],
                        [t("health.firstSeen"), formatDate(issue.firstSeenAt, lang)],
                        [t("health.lastSeen"), formatDate(issue.lastSeenAt, lang)],
                        [t("health.versions"), <bdi key="v" dir="ltr">{issue.versions.join(", ")}</bdi>],
                        issue.screen ? [t("health.screen"), <bdi key="s" dir="ltr">{issue.screen}</bdi>] : null,
                        issue.lastOs ? [t("health.lastPhone"), <bdi key="o" dir="ltr">{issue.lastOs}</bdi>] : null,
                      ]}
                    />
                    <KitCallout icon="support_agent" tone="success">
                      {t("health.teamFixes")}
                    </KitCallout>
                  </div>
                </KitTableRow>
              );
            })}
          </KitTable>
        )}
      </KitSection>

      <div id="h-switches" className="flex scroll-mt-6 flex-col gap-3">
        <h2 className="m-0 px-1 text-[13px] font-bold text-(--sp-muted)">{t("health.switches")}</h2>
        <AppHealthForm reviewPrompt={rating} crashReports={!off} />
      </div>
    </KitPage>
  );
}
