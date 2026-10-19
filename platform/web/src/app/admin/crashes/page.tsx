import type { Metadata } from "next";
import Link from "next/link";
import { setCrashStatusAction } from "@/app/actions/admin-crashes";
import { SubmitButton } from "@/components/form";
import { Badge, formatDateTime } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { adminCan, requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { CrashIssueStatus } from "@/lib/data/types";

export const metadata: Metadata = { title: "Crashes" };

const TABS: { id: CrashIssueStatus | "all"; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "resolved", label: "Resolved" },
  { id: "all", label: "All" },
];

/**
 * 46 Crash reports from every app, grouped by fingerprint: how often, since
 * when, in which versions, with the stack trace. The team marks a group
 * resolved once a build fixed it; a report after that opens it again.
 */
export default async function CrashesPage({ searchParams }: PageProps<"/admin/crashes">) {
  await requireAdmin();
  const query = await searchParams;
  const status = TABS.find((tab) => tab.id === query.status)?.id ?? "open";
  const appId = typeof query.app === "string" && /^[0-9a-f-]{36}$/.test(query.app) ? query.app : undefined;
  const store = await getStore();
  const issues = await store.listCrashIssues({ appId, status: status === "all" ? undefined : status, limit: 200 });
  const mayManage = await adminCan("builds.manage");
  const apps = new Map<string, Awaited<ReturnType<typeof store.getAppById>>>();
  for (const issue of issues) if (!apps.has(issue.appId)) apps.set(issue.appId, await store.getAppById(issue.appId));
  const back = `/admin/crashes?status=${status}${appId ? `&app=${appId}` : ""}`;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Crashes</h1>
        <span className="text-[15px] text-muted">
          What went wrong in the apps, grouped by the error and where it happened in our code. Reports carry no personal data: names, numbers, emails,
          tokens and query strings are removed on the phone and again here.
          {appId ? (
            <>
              {" "}
              Showing {appLabel(apps.get(appId) ?? null)} only. <Link href={`/admin/crashes?status=${status}`}>Every app</Link>
            </>
          ) : null}
        </span>
      </div>
      <nav aria-label="Crash status" className="flex flex-wrap gap-2.5">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/admin/crashes?status=${tab.id}${appId ? `&app=${appId}` : ""}`}
            aria-current={status === tab.id ? "page" : undefined}
            className={`flex h-9 items-center rounded-[18px] px-3.5 text-sm no-underline ${
              status === tab.id ? "bg-midnight font-semibold text-white hover:text-white" : "border border-line bg-white text-midnight hover:border-midnight hover:text-midnight"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {issues.length === 0 ? (
        <p className="m-0 rounded-2xl border border-line bg-white p-6 text-[15px] text-muted">No crashes here.</p>
      ) : (
        <ul aria-label="Crash groups" className="m-0 flex list-none flex-col gap-3 p-0">
          {issues.map((issue) => {
            const app = apps.get(issue.appId) ?? null;
            return (
              <li key={issue.id} data-crash={issue.fingerprint} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-mono text-[14px] font-semibold break-words">{issue.title}</span>
                    <span className="text-xs text-muted">
                      <Link href={`/admin/crashes?status=${status}&app=${issue.appId}`}>{appLabel(app)}</Link>
                      {app ? (
                        <>
                          {" · "}
                          <Link href={`/admin/clients/${app.clientId}#app-${app.id}`}>Client</Link>
                        </>
                      ) : null}
                      {issue.screen ? ` · on ${issue.screen}` : ""}
                      {issue.library ? ` · ${issue.library}` : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {issue.fatal ? <Badge tone="danger">Stopped the app</Badge> : null}
                    <Badge tone={issue.status === "open" ? "warn" : "success"}>{issue.status === "open" ? "Open" : "Resolved"}</Badge>
                  </div>
                </div>
                <dl className="m-0 grid gap-x-5 gap-y-1 text-[13px] sm:grid-cols-[auto_1fr]">
                  <dt className="font-semibold text-muted">Reports</dt>
                  <dd className="m-0" data-count="">
                    {issue.count}
                  </dd>
                  <dt className="font-semibold text-muted">First and last seen</dt>
                  <dd className="m-0">
                    {formatDateTime(issue.firstSeenAt)} · {formatDateTime(issue.lastSeenAt)}
                  </dd>
                  <dt className="font-semibold text-muted">Versions</dt>
                  <dd className="m-0 break-words">{issue.versions.join(", ")}</dd>
                  <dt className="font-semibold text-muted">Systems</dt>
                  <dd className="m-0">
                    {issue.platforms.map((p) => (p === "ios" ? "iOS" : "Android")).join(", ")}
                    {issue.lastOs ? ` · last ${issue.lastOs}` : ""}
                  </dd>
                </dl>
                <details>
                  <summary className="cursor-pointer text-sm font-semibold">Stack trace</summary>
                  <pre className="mt-2 max-h-[360px] overflow-auto rounded-xl bg-sand p-3 text-xs leading-relaxed whitespace-pre">{issue.stack || "No stack trace."}</pre>
                </details>
                {mayManage ? (
                  <form action={setCrashStatusAction}>
                    <input type="hidden" name="issueId" value={issue.id} />
                    <input type="hidden" name="status" value={issue.status === "open" ? "resolved" : "open"} />
                    <input type="hidden" name="back" value={back} />
                    <SubmitButton variant="secondary" className="h-8 px-3 text-[13px]" pendingText="Saving…">
                      {issue.status === "open" ? "Mark resolved" : "Open again"}
                      <span className="sr-only"> ({issue.title.slice(0, 60)})</span>
                    </SubmitButton>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
