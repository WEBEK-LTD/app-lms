import type { Metadata } from "next";
import Link from "next/link";
import { BuildBadge } from "@/components/build-status";
import { formatDateTime } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { BuildStatus } from "@/lib/data/types";
import { artifactLinks, FILES_NOT_CONFIGURED } from "@/lib/files";

export const metadata: Metadata = { title: "Build queue" };

const TABS: { id: BuildStatus | "all"; label: string }[] = [
  { id: "queued", label: "Queued" },
  { id: "building", label: "Building" },
  { id: "failed", label: "Failed" },
  { id: "ready", label: "Ready" },
  { id: "all", label: "All" },
];

export default async function BuildQueuePage({ searchParams }: PageProps<"/admin/builds">) {
  await requireAdmin();
  const requested = (await searchParams).status;
  const status = TABS.find((tab) => tab.id === requested)?.id ?? "queued";
  const store = await getStore();
  const builds = await store.listBuilds({ status: status === "all" ? undefined : status, limit: 200 });
  const rows = await Promise.all(
    builds.map(async (build) => {
      const client = await store.getClientById(build.clientId);
      const user = client ? await store.getUserById(client.userId) : null;
      return { build, name: user?.name ?? "Unknown client" };
    }),
  );
  // Download links are signed for this render only (15 minutes) and never stored.
  const now = new Date();

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Build queue</h1>
        <span className="text-[15px] text-muted">
          The build pipeline picks up queued builds from <code>GET /api/v1/builds/queue</code> and reports progress back.
        </span>
      </div>
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
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="bg-sand text-left text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">Client</th>
                <th scope="col" className="px-4 py-3 font-semibold">Build</th>
                <th scope="col" className="px-4 py-3 font-semibold">Version</th>
                <th scope="col" className="px-4 py-3 font-semibold">Queued</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Files</th>
                <th scope="col" className="px-4 py-3 font-semibold">Build ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ build, name }) => (
                <tr key={build.id} className="border-t border-line-soft">
                  <td className="px-4 py-3">
                    <Link href={`/admin/clients/${build.clientId}`}>{name}</Link>
                  </td>
                  <td className="px-4 py-3">#{build.number}{build.autoPublish ? " · auto-publish" : ""}</td>
                  <td className="px-4 py-3">
                    {build.versionName} ({build.versionCode})
                  </td>
                  <td className="px-4 py-3">{formatDateTime(build.createdAt)}</td>
                  <td className="px-4 py-3">
                    <BuildBadge status={build.status} />
                    {build.message ? <span className="mt-1 block text-xs text-muted">{build.message}</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <BuildFiles links={artifactLinks(build.artifacts, now)} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs break-all">{build.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function BuildFiles({ links }: { links: ReturnType<typeof artifactLinks> }) {
  if (links.length === 0) return <span className="text-muted">None yet</span>;
  const disabled = links.some((link) => link.href === null);
  return (
    <div className="flex flex-col gap-1">
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {links.map((link, i) => (
          <li key={`${link.kind}-${i}`}>
            {link.href ? <a href={link.href}>{link.label}</a> : <span className="text-muted">{link.label}</span>}
          </li>
        ))}
      </ul>
      {disabled ? <span className="text-xs text-muted">{FILES_NOT_CONFIGURED}</span> : null}
    </div>
  );
}
