import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { formatDateTime } from "@/components/ui";
import { getDashT, type DashKey } from "@/i18n/dashboard";
import { appLabel } from "@/lib/app/label";
import { requireAdmin } from "@/lib/auth/session";
import { appCheckShown } from "@/lib/builds/app-check-run";
import { getStore } from "@/lib/data";
import { appCheckable } from "@/lib/studio/app-check";
import { checkAppOrNull } from "@/lib/studio/app-check-env";
import { fixHref } from "@/lib/studio/app-check-links";
import { isStudioProject } from "@/lib/studio/section";

export const metadata: Metadata = { title: "App check" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 182 The app check of any client's app, for the team: what its customers
 * would see broken now (the published app read as phones read it, in each of
 * its languages), and what the check after each of its last builds found on
 * its screens. Without an app: the apps with an open app check alert.
 */
export default async function AdminAppCheckPage({ searchParams }: PageProps<"/admin/app-check">) {
  await requireAdmin();
  const query = await searchParams;
  const store = await getStore();
  const appId = typeof query.app === "string" && UUID.test(query.app) ? query.app : null;
  const app = appId ? await store.getAppById(appId) : null;
  const t = getDashT("en");

  if (!app) {
    const alerts = (await store.listTeamAlerts({ open: true, limit: 500 })).filter((a) => a.kind === "app_check");
    return (
      <>
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[28px] font-extrabold">App check</h1>
          <span className="text-[15px] text-muted">
            Apps whose customers would see something broken, found on an automatic build or by the check after a build. Open one to see its whole list. Also in{" "}
            <Link href="/admin/watching">Watching</Link>.
          </span>
        </div>
        {alerts.length ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-4">
                <Link href={alert.link ?? "/admin/watching"} className="font-bold">
                  {alert.title}
                </Link>
                <span className="text-xs text-muted">Since {formatDateTime(alert.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-muted">No app has an open app check alert.</p>
        )}
      </>
    );
  }

  const checkable = isStudioProject(app) && appCheckable(app);
  const report = checkable ? await checkAppOrNull(store, app, { draft: false }) : null;
  const builds = (await store.listBuildsByApp(app.id, 5, "app")).filter((b) => b.appCheck);
  const now = new Date();
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">App check: {appLabel(app)}</h1>
        <span className="text-[15px] text-muted">
          Its published app, read the way a phone reads it, in {report?.langs.join(", ") ?? "its languages"}. Errors stop the owner&apos;s Publish and builds; automatic builds go ahead and tell. <Link href="/admin/app-check">Every app</Link>
        </span>
      </div>
      <section aria-labelledby="h-now" className="flex flex-col gap-3" id="app-check">
        <h2 id="h-now" className="m-0 text-[19px] font-bold">
          Now: {report ? `${report.errors} errors, ${report.warnings} warnings` : "not checked"}
        </h2>
        {!report ? (
          <p className="m-0 text-sm text-muted">{checkable ? "The check couldn't run: see its alert in Watching." : "Only Studio projects whose pages Yallapp serves are checked here."}</p>
        ) : report.problems.length === 0 ? (
          <p className="m-0 flex items-center gap-1.5 text-sm font-semibold text-success">
            <Icon name="check_circle" size={18} /> Nothing found.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {report.problems.map((p, i) => (
              <li key={i} data-problem={p.rule} data-severity={p.severity} className="flex items-start gap-3 rounded-2xl border border-line bg-white p-3">
                <Icon name={p.severity === "error" ? "error" : "info"} size={18} className={p.severity === "error" ? "text-danger" : "text-muted"} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm">{t(`appCheck.${p.rule}` as DashKey, p.values)}</span>
                  <code className="text-xs break-all text-muted">
                    {p.severity} · {p.rule}
                    {p.lang ? ` · ${p.lang}` : ""} · {p.path}
                  </code>
                  <code className="text-xs text-muted">Fix (owner): {fixHref(p)}</code>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="h-builds" className="flex flex-col gap-3">
        <h2 id="h-builds" className="m-0 text-[19px] font-bold">
          After its builds
        </h2>
        {builds.length === 0 ? <p className="m-0 text-sm text-muted">No build of this app was checked after it was made yet.</p> : null}
        {builds.map((build) => {
          const check = appCheckShown(build, now)!;
          return (
            <div key={build.id} data-build-app-check={check.status} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-4">
              <span className="font-bold">
                Build #{build.number} ({build.versionName}): {check.status}
                {check.checkMode === false ? ", without the preview's check mode" : ""}
              </span>
              <span className="text-xs text-muted">
                {check.passes.map((p) => `${p.lang} at ${p.scale}: ${p.routes} screens`).join(" · ") || "No pass finished."} {check.message ?? ""}
              </span>
              {check.issues.length ? (
                <pre className="m-0 max-h-[280px] overflow-auto rounded-xl bg-midnight p-3 text-xs whitespace-pre-wrap text-white">
                  {check.issues.map((i) => `${i.kind} [${i.lang} ${i.scale}] ${i.route}: ${i.message}`).join("\n")}
                </pre>
              ) : null}
            </div>
          );
        })}
      </section>
    </>
  );
}
