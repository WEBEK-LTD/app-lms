"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { demosRefreshedAction, refreshDemoAction } from "@/app/actions/admin-demos";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";

/**
 * Admin › Demo apps: creating or refreshing demo apps one request each, in
 * order, from the page. A request that did every demo ran out of time on
 * the live site (the school's alone is a few hundred queries), so each demo
 * gets its own, its outcome is shown as it comes, and one that fails or
 * times out doesn't stop the others.
 */

export interface DemoToRefresh {
  type: string;
  name: string;
}

type Step = { state: "waiting" | "running" | "done" | "failed"; created?: boolean; error?: string };

/** A request that never answered (it ran out of time, or the connection dropped). */
const NO_ANSWER = "The request didn't finish: it may have taken too long, or the connection dropped. What it saved so far is kept; refresh this demo again.";

function useDemoRefresh(demos: readonly DemoToRefresh[]) {
  const router = useRouter();
  const [steps, setSteps] = useState<Record<string, Step>>({});
  const [running, setRunning] = useState(false);
  const set = (type: string, step: Step) => setSteps((all) => ({ ...all, [type]: step }));

  async function run() {
    if (running) return;
    setRunning(true);
    setSteps(Object.fromEntries(demos.map((d) => [d.type, { state: "waiting" } as Step])));
    // One at a time: each demo is a request of its own.
    for (const demo of demos) {
      set(demo.type, { state: "running" });
      try {
        const outcome = await refreshDemoAction(demo.type);
        set(demo.type, outcome.ok ? { state: "done", created: outcome.created } : { state: "failed", error: outcome.error });
      } catch {
        set(demo.type, { state: "failed", error: NO_ANSWER });
      }
    }
    try {
      await demosRefreshedAction();
    } catch {
      // The page is read again below all the same.
    }
    setRunning(false);
    router.refresh();
  }

  return { steps, running, run };
}

function StepIcon({ step }: { step: Step | undefined }) {
  if (!step || step.state === "waiting") return <Icon name="schedule" size={20} className="text-muted" />;
  if (step.state === "running") return <Icon name="progress_activity" size={20} className="animate-spin text-accent" />;
  if (step.state === "done") return <Icon name="check_circle" size={20} className="text-success" />;
  return <Icon name="error" size={20} className="text-danger" />;
}

function stepText(step: Step | undefined): string {
  if (!step || step.state === "waiting") return "Waiting";
  if (step.state === "running") return "Working on it…";
  if (step.state === "done") return step.created ? "Created" : "Up to date";
  return "Didn't finish";
}

/** "Refresh all": every demo of the tab, one after another, with each one's outcome. */
export function RefreshAllDemos({ demos, label, doneText }: { demos: readonly DemoToRefresh[]; label: string; doneText: string }) {
  const { steps, running, run } = useDemoRefresh(demos);
  const started = Object.keys(steps).length > 0;
  const finished = demos.filter((d) => steps[d.type]?.state === "done" || steps[d.type]?.state === "failed").length;
  const failed = demos.filter((d) => steps[d.type]?.state === "failed").length;
  const current = demos.find((d) => steps[d.type]?.state === "running");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void run()} disabled={running} className={`${btn.primary} h-11`}>
          <Icon name={running ? "progress_activity" : "refresh"} size={20} className={running ? "animate-spin" : ""} />
          {running ? "Working through the demo apps…" : label}
        </button>
        <span className="text-sm text-muted">Safe to run again: it updates the apps and their content, never duplicates them. One demo at a time.</span>
      </div>
      {started ? (
        <p className="m-0 text-sm font-semibold" role="status" aria-live="polite">
          {running
            ? `${finished} of ${demos.length} done${current ? `. Now: ${current.name}` : ""}`
            : failed
              ? `Done, but ${failed} of ${demos.length} didn't finish. Refresh those again on their own.`
              : doneText}
        </p>
      ) : null}
      {started ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm" aria-label="Each demo app">
          {demos.map((d) => {
            const step = steps[d.type];
            return (
              <li key={d.type} className="flex flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <StepIcon step={step} />
                  <span className="font-semibold">{d.name}</span>
                  <span className="text-muted">{stepText(step)}</span>
                </span>
                {step?.state === "failed" && step.error ? <span className="ms-7 text-danger">{step.error}</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** One demo's "Refresh", saying how it went. */
export function RefreshDemoButton({ demo }: { demo: DemoToRefresh }) {
  const { steps, running, run } = useDemoRefresh([demo]);
  const step = steps[demo.type];
  return (
    <span className="flex flex-col gap-1">
      <button type="button" onClick={() => void run()} disabled={running} className={`${btn.secondary} h-10 px-4 text-sm`}>
        {running ? (
          <>
            <Icon name="progress_activity" size={20} className="animate-spin" />
            Refreshing…
          </>
        ) : (
          <>
            Refresh<span className="sr-only"> {demo.name}</span>
          </>
        )}
      </button>
      {step?.state === "done" || step?.state === "failed" ? (
        <span role="status" aria-live="polite" className={`text-sm ${step.state === "done" ? "text-success" : "text-danger"}`}>
          {step.state === "done" ? (step.created ? "Created." : "Up to date.") : step.error}
        </span>
      ) : null}
    </span>
  );
}
