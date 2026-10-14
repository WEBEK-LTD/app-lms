import type { Metadata } from "next";
import { deleteReleaseAction, toggleReleaseAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/form";
import { Badge, formatDate } from "@/components/ui";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { latestRelease } from "@/lib/license/service";
import { ReleaseForm } from "../forms";

export const metadata: Metadata = { title: "App & plugin versions" };

export default async function ReleasesPage() {
  const { adminRole } = await requireAdmin();
  const releases = await (await getStore()).listReleases();
  const latest = latestRelease(releases);

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">App &amp; plugin versions</h1>
        <span className="text-[15px] text-muted">
          The newest published plugin version is what sites get from the update API and what clients download.
          {latest ? ` Now: ${latest.version}.` : " Nothing is published yet."}
        </span>
      </div>

      <ReadOnly when={!can(adminRole, "releases.manage")} what="upload or publish releases">
      <div className="flex flex-wrap items-start gap-5">
        <section aria-labelledby="h-upload" className="flex min-w-0 flex-[1_1_380px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-upload" className="m-0 text-[19px] font-bold">
            Upload a plugin release
          </h2>
          <ReleaseForm />
        </section>

        <section aria-labelledby="h-releases" className="min-w-0 flex-[2_1_480px] overflow-x-auto rounded-2xl border border-line bg-white">
          <h2 id="h-releases" className="m-0 border-b border-line-soft px-5 py-4 text-[19px] font-bold">
            Plugin releases
          </h2>
          {releases.length === 0 ? (
            <p className="m-0 p-5 text-[15px] text-muted">No releases yet.</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {releases.map((release) => (
                <li key={release.id} className="flex flex-wrap items-start gap-3 border-b border-line-soft px-5 py-4 last:border-b-0">
                  <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                      {release.version}
                      {release.published ? <Badge tone="success">Published</Badge> : <Badge tone="neutral">Draft</Badge>}
                      {latest?.id === release.id ? <Badge tone="info">Latest</Badge> : null}
                    </span>
                    <span className="text-[13px] text-muted">
                      WordPress {release.requiresWp}+ · PHP {release.requiresPhp}+ · tested {release.testedWp} · {(release.size / 1024).toFixed(0)} KB ·{" "}
                      {formatDate(release.createdAt)}
                    </span>
                    <span className="font-mono text-[11px] break-all text-muted">sha256 {release.sha256}</span>
                    <p className="m-0 mt-1 text-[13px] whitespace-pre-wrap text-ink-4">{release.changelog}</p>
                  </div>
                  <div className="flex gap-2">
                    <form action={toggleReleaseAction}>
                      <input type="hidden" name="releaseId" value={release.id} />
                      <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                        {release.published ? "Unpublish" : "Publish"}
                      </SubmitButton>
                    </form>
                    {release.published ? null : (
                      <form action={deleteReleaseAction}>
                        <input type="hidden" name="releaseId" value={release.id} />
                        <SubmitButton variant="danger" className="h-9 px-3 text-sm">
                          Delete
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      </ReadOnly>
    </>
  );
}
