import type { Metadata } from "next";
import Link from "next/link";
import { resolveAlertAction } from "@/app/actions/admin-watching";
import { Icon } from "@/components/icon";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { TeamAlert } from "@/lib/data/types";
import { deepHealth } from "@/lib/watch/health";
import { healthDeps } from "@/lib/watch/env";
import { JOB_LABEL } from "@/lib/watch/runs";

export const metadata: Metadata = { title: "Watching" };
export const dynamic = "force-dynamic";

const when = (at: Date) => `${at.toISOString().slice(0, 16).replace("T", " ")} UTC`;

function Section({ id, title, text, children }: { id: string; title: string; text?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="m-0 text-[19px] font-bold">
          {title}
        </h2>
        {text ? <p className="m-0 text-sm text-muted">{text}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Status({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${ok ? "text-success" : "text-danger"}`}>
      <Icon name={ok ? "check_circle" : "error"} size={18} />
      {ok ? "Fine" : "Look at it"}
    </span>
  );
}

function AlertCard({ alert, canResolve }: { alert: TeamAlert; canResolve: boolean }) {
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="m-0 text-[16px] font-bold">{alert.title}</h3>
        <span className="text-xs text-muted">
          {alert.count > 1 ? `Seen ${alert.count} times · ` : ""}since {when(alert.createdAt)}
        </span>
      </div>
      <p className="m-0 text-sm">{alert.detail}</p>
      <div className="flex flex-wrap items-center gap-3">
        {alert.link ? (
          <Link href={alert.link} className="text-sm font-semibold">
            Open
          </Link>
        ) : null}
        {canResolve ? (
          <form action={resolveAlertAction}>
            <input type="hidden" name="alertId" value={alert.id} />
            <button type="submit" className="cursor-pointer rounded-full border border-line bg-transparent px-3.5 py-1.5 text-sm font-semibold hover:border-midnight">
              Done
            </button>
          </form>
        ) : null}
      </div>
    </li>
  );
}

/**
 * 78.3 Admin › Watching: what the platform's watch found (open alerts, also
 * emailed when they open), the deep health check run now, and each
 * scheduled job's recent runs.
 */
export default async function WatchingPage() {
  const admin = await requireAdmin();
  const store = await getStore();
  const now = new Date();
  const [open, closed, runs, health] = await Promise.all([
    store.listTeamAlerts({ open: true, limit: 100 }),
    store.listTeamAlerts({ open: false, limit: 20 }),
    store.listJobRuns({ limit: 30 }),
    healthDeps(store, now).then(deepHealth),
  ]);
  const canResolve = can(admin.adminRole, "builds.manage");

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Watching</h1>
        <span className="text-[15px] text-muted">
          The platform checks builds, its scheduled jobs, crashes and pushes every 5 minutes. A new problem is emailed to the team once; it closes by itself when it goes.
        </span>
      </div>

      <Section id="h-alerts" title={open.length ? `Open alerts (${open.length})` : "Open alerts"}>
        {open.length === 0 ? (
          <p className="m-0 rounded-2xl border border-line bg-white p-5 text-[15px] text-muted">Nothing to look at.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {open.map((a) => (
              <AlertCard key={a.id} alert={a} canResolve={canResolve} />
            ))}
          </ul>
        )}
      </Section>

      <Section id="h-health" title="Health" text="Checked now: the database, the media gate, the files host, email, the owners' push key, the build pipeline, the encryption keys and the jobs.">
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <caption className="sr-only">Health checks</caption>
            <thead>
              <tr className="bg-sand text-left text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">Part</th>
                <th scope="col" className="px-4 py-3 font-semibold">State</th>
                <th scope="col" className="px-4 py-3 font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody>
              {health.map((c) => (
                <tr key={c.key} className="border-t border-line-soft align-top">
                  <th scope="row" className="px-4 py-2.5 text-left font-semibold">
                    {c.label}
                  </th>
                  <td className="px-4 py-2.5">
                    <Status ok={c.ok} />
                  </td>
                  <td className="px-4 py-2.5">{c.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="h-runs" title="Recent job runs" text="Kept 30 days.">
        {runs.length === 0 ? (
          <p className="m-0 rounded-2xl border border-line bg-white p-5 text-[15px] text-muted">No runs recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <caption className="sr-only">Recent job runs</caption>
              <thead>
                <tr className="bg-sand text-left text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">Job</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Started</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Took</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Result</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-t border-line-soft align-top">
                    <th scope="row" className="px-4 py-2.5 text-left font-semibold">
                      {JOB_LABEL[r.job]}
                    </th>
                    <td className="px-4 py-2.5 tabular-nums">{when(r.startedAt)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{r.finishedAt ? `${Math.max(0, Math.round((r.finishedAt.getTime() - r.startedAt.getTime()) / 100) / 10)} s` : "Didn't finish"}</td>
                    <td className="px-4 py-2.5">{r.ok === null ? "–" : r.ok ? "Done" : `Failed: ${r.error ?? ""}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {closed.length ? (
        <Section id="h-closed" title="Recently closed">
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
            {closed.map((a) => (
              <li key={a.id}>
                <span className="font-semibold">{a.title}</span>
                <span className="text-muted">
                  {" "}
                  · closed {when(a.resolvedAt!)} {a.resolvedBy === "watch" ? "by itself" : `by ${a.resolvedBy}`}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
