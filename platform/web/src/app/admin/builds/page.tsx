import { appLabel } from "@/lib/app/label";
import type { Metadata } from "next";
import Link from "next/link";
import { markBuildFailedAction } from "@/app/actions/admin-builds";
import { BuildBadge } from "@/components/build-status";
import { SubmitButton } from "@/components/form";
import { Notice, formatDateTime } from "@/components/ui";
import { adminCan, requireAdmin } from "@/lib/auth/session";
import { failureReason, formatDuration, isStalled } from "@/lib/builds/view";
import { getStore } from "@/lib/data";
import type { BuildStatus } from "@/lib/data/types";
import { adminFileHref, artifactLinks, FILES_NOT_CONFIGURED } from "@/lib/files";

export const metadata: Metadata = { title: "Build queue" };

const TABS: { id: BuildStatus | "all"; label: string }[] = [
  { id: "queued", label: "Queued" },
  { id: "building", label: "Building" },
  { id: "failed", label: "Didn't finish" },
  { id: "ready", label: "Ready" },
  { id: "all", label: "All" },
];

export default async function BuildQueuePage({ searchParams }: PageProps<"/admin/builds">) {
  await requireAdmin();
  const query = await searchParams;
  const status = TABS.find((tab) => tab.id === query.status)?.id ?? "queued";
  const store = await getStore();
  // The queue reads oldest first, like the pipeline; finished builds newest first, so the latest are always on the page.
  const builds = await store.listBuilds({ status: status === "all" ? undefined : status, limit: 200, newestFirst: status !== "queued" && status !== "building" });
  const mayManage = await adminCan("builds.manage");
  const rows = await Promise.all(
    builds.map(async (build) => {
      const client = await store.getClientById(build.clientId);
      const user = client ? await store.getUserById(client.userId) : null;
      const app = await store.getAppById(build.appId);
      return { build, name: user?.name ?? "Unknown client", appName: appLabel(app) };
    }),
  );
  const now = new Date();

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Build queue</h1>
        <span className="text-[15px] text-muted">
          The build pipeline picks up queued builds from <code>GET /api/v1/builds/queue</code> and reports progress back. A build that reports nothing for
          hours has stopped: mark it as not finished so the client can start it again.
        </span>
      </div>
      {query.download === "unavailable" ? (
        <Notice tone="warn" icon="warning" role="alert">
          That file isn&apos;t available: it isn&apos;t in the build, or download links aren&apos;t configured (FILES_SIGNING_SECRET).
        </Notice>
      ) : null}
      <nav aria-label="Build status" className="flex flex-wrap gap-2.5">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/admin/builds?status=${tab.id}`}
            aria-current={status === tab.id ? "page" : undefined}
            className={`flex h-9 items-center rounded-[18px] px-3.5 text-sm no-underline ${
              status === tab.id ? "bg-midnight font-semibold text-white hover:text-white" : "border border-line bg-white text-midnight hover:border-midnight hover:text-midnight"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <section aria-label="Builds" className="overflow-x-auto rounded-2xl border border-line bg-white">
        {rows.length === 0 ? (
          <p className="m-0 p-6 text-[15px] text-muted">No builds here.</p>
        ) : (
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="bg-sand text-left text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">Client</th>
                <th scope="col" className="px-4 py-3 font-semibold">Build</th>
                <th scope="col" className="px-4 py-3 font-semibold">Times</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Files</th>
                <th scope="col" className="px-4 py-3 font-semibold">Build ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ build, name, appName }) => {
                const stalled = isStalled(build, now);
                return (
                  <tr key={build.id} className="border-t border-line-soft align-top">
                    <td className="px-4 py-3">
                      <Link href={`/admin/clients/${build.clientId}#app-${build.appId}`}>{name}</Link>
                      <span className="block text-xs text-muted">{appName}</span>
                    </td>
                    <td className="px-4 py-3">
                      #{build.number} · {build.versionName} ({build.versionCode})
                      {build.autoPublish ? <span className="block text-xs text-muted">Auto-publish</span> : null}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="block">Queued {formatDateTime(build.createdAt)}</span>
                      {build.startedAt ? <span className="block">Started {formatDateTime(build.startedAt)}</span> : null}
                      {build.finishedAt ? <span className="block">Finished {formatDateTime(build.finishedAt)}</span> : null}
                      {formatDuration(build.startedAt, build.finishedAt) ? <span className="block text-muted">Took {formatDuration(build.startedAt, build.finishedAt)}</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <BuildBadge status={build.status} />
                      {stalled ? <span className="mt-1 block text-xs font-semibold text-warn">Stalled: no report for hours</span> : null}
                      {build.status === "failed" ? (
                        <span className="mt-1 block max-w-[280px] text-xs text-muted">{failureReason(build)}</span>
                      ) : build.message ? (
                        <span className="mt-1 block max-w-[280px] text-xs text-muted">{build.message}</span>
                      ) : null}
                      {build.logUrl ? (
                        <a href={build.logUrl} className="mt-1 block text-xs">
                          Build log
                        </a>
                      ) : null}
                      {(build.status === "queued" || build.status === "building") && mayManage ? (
                        <form action={markBuildFailedAction} className="mt-2">
                          <input type="hidden" name="buildId" value={build.id} />
                          <SubmitButton variant="secondary" className="h-8 px-3 text-[13px]" pendingText="Closing…">
                            Mark as not finished<span className="sr-only"> (build #{build.number} of {appName})</span>
                          </SubmitButton>
                        </form>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <BuildFiles buildId={build.id} links={artifactLinks(build.artifacts, now)} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs break-all">{build.id}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

/** Each link is signed when clicked (/api/admin/builds/…), so it never expires on an open page. */
function BuildFiles({ buildId, links }: { buildId: string; links: ReturnType<typeof artifactLinks> }) {
  if (links.length === 0) return <span className="text-muted">None yet</span>;
  const disabled = links.some((link) => link.href === null);
  return (
    <div className="flex flex-col gap-1">
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {links.map((link, i) => (
          <li key={`${link.kind}-${i}`}>
            {link.href ? <a href={adminFileHref(buildId, link.kind)}>{link.label}</a> : <span className="text-muted">{link.label}</span>}
          </li>
        ))}
      </ul>
      {disabled ? <span className="text-xs text-muted">{FILES_NOT_CONFIGURED}</span> : null}
    </div>
  );
}
