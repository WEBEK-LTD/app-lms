import type { Metadata } from "next";
import Link from "next/link";
import { buildDemoAction, setDemoDownloadAction, setupDemosAction } from "@/app/actions/admin-demos";
import { manageClientAction } from "@/app/actions/admin";
import { BuildBadge } from "@/components/build-status";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Card, Notice, formatDateTime } from "@/components/ui";
import { APP_TYPES, ENGINES } from "@/lib/app/kinds";
import { adminCan, requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { demoClient, isDownloadableBuild, listDemoApps } from "@/lib/demo/apps";
import { DEMO_ACCOUNT, DEMO_RETENTION_HOURS, DEMO_SIGN_IN, DEMO_SLUGS, DEMO_TYPES } from "@/lib/demo/constants";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = { title: "Demo apps" };
export const dynamic = "force-dynamic";

const DONE: Record<string, string> = {
  all: "The demo apps are created and up to date.",
  ...Object.fromEntries(APP_TYPES.map((type) => [type, `The ${ENGINES[type].name} demo is up to date.`])),
  build: "The build is queued. It shows here, and on the build queue, as it runs.",
  download: "The /demo page now offers this build for download.",
  no_download: "The /demo page shows \"Coming soon\" for this app again.",
};

const ERROR: Record<string, string> = {
  setup: `The demo apps couldn't be set up. If ${DEMO_ACCOUNT.email} already has an account that isn't the demo account, remove it first; otherwise try again, one app at a time.`,
  unknown_type: "Choose one of the app types.",
  not_demo: "That isn't a demo app.",
  not_downloadable: "Only a ready build with an Android APK can be the download.",
  setup_incomplete: "The demo app's setup isn't complete. Refresh it first.",
  license_inactive: "The demo app's license isn't active. Refresh it first.",
  build_running: "A build of this app is already in progress.",
  version_too_low: "The version is lower than the last build's.",
  invalid_config: "The build config isn't valid. Refresh the demo app and try again.",
};

/** Admin › Demo apps (roadmap 16): the four apps on /demo. */
export default async function DemoAppsPage({ searchParams }: PageProps<"/admin/demos">) {
  await requireAdmin();
  const query = await searchParams;
  const done = typeof query.done === "string" ? DONE[query.done] : undefined;
  const failed = typeof query.error === "string" ? (ERROR[query.error] ?? "That didn't work. Please try again.") : undefined;
  const store = await getStore();
  const [client, apps, may, mayEdit] = await Promise.all([demoClient(store, { fresh: true }), listDemoApps(store, { fresh: true }), adminCan("demos.manage"), adminCan("clients.edit")]);
  const rows = await Promise.all(
    DEMO_TYPES.map(async (type) => {
      const app = apps.find((a) => a.appType === type) ?? null;
      const builds = app ? await store.listBuildsByApp(app.id, 8) : [];
      return { type, app, builds, download: app ? (builds.find((b) => b.id === app.demoBuildId) ?? (app.demoBuildId ? await store.getBuild(app.demoBuildId) : null)) : null };
    }),
  );

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Demo apps</h1>
        <span className="max-w-[760px] text-[15px] text-muted">
          One app per type on the hosted API, for people to try before they pay. They&apos;re shown on{" "}
          <Link href="/demo">the public demo page</Link>, belong to the account {DEMO_ACCOUNT.email} on the Business plan without an end date, and are left
          out of the overview&apos;s numbers.
        </span>
      </div>

      {done ? (
        <Notice tone="success" icon="check_circle" role="status">
          {done}
        </Notice>
      ) : null}
      {failed ? (
        <Notice tone="danger" icon="error" role="alert">
          {failed}
        </Notice>
      ) : null}

      <Card className="flex flex-col gap-3 p-5">
        <h2 className="m-0 text-[19px] font-bold">How visitors sign in</h2>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          The number <b className="text-midnight">{DEMO_SIGN_IN.display}</b> with the code <b className="text-midnight">{DEMO_SIGN_IN.code}</b>, shown on the
          demo page. No message is sent. It works in the demo apps only, never in a client&apos;s app, and is limited per visitor and per app. Visitors share one
          account; what they add (orders, bookings, messages, favorites, progress) is deleted by the daily job after {DEMO_RETENTION_HOURS} hours. Checkout in a
          demo app never asks for a card.
        </p>
        {may ? (
          <form action={setupDemosAction} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="type" value="all" />
            <SubmitButton className="h-11" pendingText="Setting up the demo apps…">
              <Icon name="refresh" size={20} />
              {client ? "Refresh all demo apps" : "Create the demo apps"}
            </SubmitButton>
            <span className="text-sm text-muted">Safe to run again: it updates the apps and their content, never duplicates them.</span>
          </form>
        ) : null}
      </Card>

      <ul className="m-0 grid list-none gap-4 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(440px,100%),1fr))]">
        {rows.map(({ type, app, builds, download }) => {
          const ready = builds.filter((b) => app && isDownloadableBuild(app, b));
          const live = app && download && isDownloadableBuild(app, download) ? download : null;
          return (
            <li key={type}>
              <Card className="flex h-full flex-col gap-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="m-0 text-[19px] font-bold">{DEMO_BRANDS[type].appName}</h2>
                    <span className="text-sm text-muted">{ENGINES[type].name} demo</span>
                  </div>
                  <span className="text-sm font-semibold">{app ? (live ? "Download live" : "Coming soon on /demo") : "Not created yet"}</span>
                </div>

                {app ? (
                  <div className="flex flex-wrap gap-2.5">
                    {may ? (
                      <form action={setupDemosAction}>
                        <input type="hidden" name="type" value={type} />
                        <SubmitButton variant="secondary" className="h-10 px-4 text-sm" pendingText="Refreshing…">
                          Refresh<span className="sr-only"> {DEMO_BRANDS[type].appName}</span>
                        </SubmitButton>
                      </form>
                    ) : null}
                    {may ? (
                      <form action={buildDemoAction}>
                        <input type="hidden" name="appId" value={app.id} />
                        <SubmitButton variant="secondary" className="h-10 px-4 text-sm" pendingText="Queueing…">
                          Start a build<span className="sr-only"> of {DEMO_BRANDS[type].appName}</span>
                        </SubmitButton>
                      </form>
                    ) : null}
                    {mayEdit && client ? (
                      <form action={manageClientAction}>
                        <input type="hidden" name="clientId" value={client.id} />
                        <input type="hidden" name="appId" value={app.id} />
                        <SubmitButton variant="ghost" className="h-10 px-3 text-sm">
                          Open in the dashboard<span className="sr-only"> ({DEMO_BRANDS[type].appName})</span>
                        </SubmitButton>
                      </form>
                    ) : null}
                  </div>
                ) : null}

                {app ? (
                  <div className="flex flex-col gap-2">
                    <h3 className="m-0 text-[15px] font-bold">Builds</h3>
                    {builds.length === 0 ? (
                      <p className="m-0 text-sm text-muted">No builds yet. Start one once the build setup in build/README.md is done.</p>
                    ) : (
                      <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
                        {builds.map((b) => (
                          <li key={b.id} className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">
                              #{b.number} · {b.versionName}
                            </span>
                            <BuildBadge status={b.status} />
                            <span className="text-muted">{formatDateTime(b.createdAt)}</span>
                            {live?.id === b.id ? <span className="font-bold text-success">On /demo</span> : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}

                {app && may ? (
                  <form action={setDemoDownloadAction} className="flex flex-col gap-2">
                    <input type="hidden" name="appId" value={app.id} />
                    <label htmlFor={`download-${type}`} className="text-[15px] font-bold">
                      Public download
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      <select id={`download-${type}`} name="buildId" defaultValue={live?.id ?? ""} className="input h-10 min-w-0 flex-1">
                        <option value="">None: show &quot;Coming soon&quot;</option>
                        {ready.map((b) => (
                          <option key={b.id} value={b.id}>
                            Build #{b.number} ({b.versionName}), {formatDateTime(b.finishedAt ?? b.createdAt)}
                          </option>
                        ))}
                      </select>
                      <SubmitButton className="h-10 px-4 text-sm">Save<span className="sr-only"> the download of {DEMO_BRANDS[type].appName}</span></SubmitButton>
                    </div>
                    <span className="text-sm text-muted">
                      Ready builds with an APK. Link for everyone: {appUrl()}/demo/download/{DEMO_SLUGS[type]}
                    </span>
                  </form>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
