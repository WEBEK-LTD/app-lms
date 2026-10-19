import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHeader, formatDate } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { requireClient } from "@/lib/auth/session";
import { stabilityOf } from "@/lib/crashes/service";
import { getStore } from "@/lib/data";
import { AppHealthForm } from "./forms";

export const metadata: Metadata = { title: "Stability" };

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
  return (
    <>
      <PageHeader title="Stability" description={<>How well {appLabel(app)} runs on people&apos;s phones over the last 30 days.</>} />
      <section aria-labelledby="h-crash-free" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-crash-free" className="m-0 flex items-center gap-2 text-lg font-bold">
          <Icon name="monitoring" size={22} />
          Crash-free sessions
        </h2>
        {off ? (
          <p className="m-0 text-[15px] text-ink-4">Crash reports are off, so there are no figures. Turn them on below.</p>
        ) : stability.crashFree === null ? (
          <p className="m-0 text-[15px] text-ink-4">No data yet. Figures appear once people use a version of your app built after this page appeared.</p>
        ) : (
          <>
            <span className="text-[32px] leading-none font-extrabold" data-crash-free="">
              {stability.crashFree.toLocaleString("en-GB")}%
            </span>
            <span className="text-sm text-muted">
              Of {stability.sessions.toLocaleString("en-GB")} app {stability.sessions === 1 ? "session" : "sessions"}. Above 99% is good.
            </span>
          </>
        )}
      </section>

      <section aria-labelledby="h-top" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-top" className="m-0 text-lg font-bold">
          Most frequent problems
        </h2>
        {stability.top.length === 0 ? (
          <p className="m-0 text-[15px] text-ink-4">No problems reported in the last 30 days.</p>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col gap-2 p-0" data-top-crashes="">
              {stability.top.map((issue) => (
                <li key={issue.id} className="flex flex-col gap-0.5 border-t border-line-soft pt-2 first:border-t-0 first:pt-0">
                  <span className="font-mono text-[13px] break-words">{issue.title}</span>
                  <span className="text-xs text-muted">
                    {issue.count} {issue.count === 1 ? "time" : "times"} · last on {formatDate(issue.lastSeenAt)} · version {issue.versions[issue.versions.length - 1]}
                  </span>
                </li>
              ))}
            </ul>
            <p className="m-0 text-sm text-muted">Our team gets these reports and fixes what comes from the app in a new version; you don&apos;t need to do anything.</p>
          </>
        )}
      </section>

      <section aria-labelledby="h-switches" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-switches" className="m-0 text-lg font-bold">
          Ratings and crash reports
        </h2>
        <AppHealthForm reviewPrompt={app.reviewPrompt !== false} crashReports={!off} />
      </section>
    </>
  );
}
