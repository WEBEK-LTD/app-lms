import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BuildBadge, BuildStages, BuildStatusText } from "@/components/build-status";
import { Icon } from "@/components/icon";
import { LinkCard } from "@/components/dashboard";
import { EmptyState, Notice, PageHeader, Section, formatDate, formatDateTime } from "@/components/ui";
import { hasStoreKeys, isSetupComplete, nextStep } from "@/lib/app/setup";
import { appLabel, licensePageName, usesPlugin } from "@/lib/app/label";
import { requireClient } from "@/lib/auth/session";
import {
  failureReason,
  fileDescription,
  fileUnavailableReason,
  formatDuration,
  isInProgress,
  isStalled,
  statusExplanation,
  suggestedVersion,
} from "@/lib/builds/view";
import { getContact } from "@/lib/contact";
import { getStore } from "@/lib/data";
import type { ArtifactKind, Build } from "@/lib/data/types";
import { ARTIFACT_LABEL, dashboardFileHref, fileLink } from "@/lib/files";
import { latestRelease } from "@/lib/license/service";
import { hasFeature, lowestPlanWith, planName } from "@/lib/plans";
import { UpgradeHint } from "@/components/upgrade";
import { currentPlanId } from "@/lib/billing/plan-change";
import { effectivePlans } from "@/lib/entitlements";
import { getPlans } from "@/lib/settings/platform";
import { RetryBuildForm, StartBuildForm } from "./start-build";

export const metadata: Metadata = { title: "Builds & downloads" };

const FILES: { kind: ArtifactKind; highlight?: boolean }[] = [{ kind: "apk" }, { kind: "aab" }, { kind: "ipa" }, { kind: "keystore", highlight: true }];

function DownloadRow({
  title,
  text,
  href,
  unavailable,
  highlight,
  last,
}: {
  title: string;
  text: string;
  href: string | null;
  unavailable: string | null;
  highlight?: boolean;
  last?: boolean;
}) {
  const hintId = `na-${title.replace(/\W+/g, "-")}`;
  return (
    <li className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-6 ${last ? "" : "border-b border-line-soft"} ${highlight ? "bg-cream" : ""}`}>
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-0.5">
        <span className="text-[15px] font-bold">{title}</span>
        <span className={`text-[13px] ${highlight ? "text-warn" : "text-muted"}`}>{text}</span>
      </div>
      {href ? (
        <a
          href={href}
          className="flex h-[38px] items-center gap-1.5 rounded-lg border border-line-strong bg-white px-4 text-sm font-semibold text-midnight no-underline hover:border-midnight hover:text-midnight"
        >
          <Icon name="download" size={18} />
          Download<span className="sr-only"> {title}</span>
        </a>
      ) : (
        <span className="flex max-w-[280px] flex-col items-start gap-1 sm:items-end">
          <button type="button" disabled aria-describedby={hintId} className="h-[38px] cursor-not-allowed rounded-lg border border-line bg-sand px-4 text-sm font-semibold text-muted">
            Download<span className="sr-only"> {title}</span>
          </button>
          <span id={hintId} className="text-xs text-muted sm:text-right">
            {unavailable}
          </span>
        </span>
      )}
    </li>
  );
}

/** When a build was queued, started and finished, and how long it took. */
function Times({ build, now }: { build: Build; now: Date }) {
  const took = formatDuration(build.startedAt, build.finishedAt ?? (build.status === "building" ? now : null));
  return (
    <dl className="m-0 flex flex-wrap gap-x-6 gap-y-1 text-sm">
      <div className="flex gap-1.5">
        <dt className="text-muted">Queued</dt>
        <dd className="m-0">{formatDateTime(build.createdAt)}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="text-muted">Started</dt>
        <dd className="m-0">{formatDateTime(build.startedAt)}</dd>
      </div>
      {build.finishedAt ? (
        <div className="flex gap-1.5">
          <dt className="text-muted">Finished</dt>
          <dd className="m-0">{formatDateTime(build.finishedAt)}</dd>
        </div>
      ) : null}
      {took ? (
        <div className="flex gap-1.5">
          <dt className="text-muted">{build.finishedAt ? "Took" : "Running for"}</dt>
          <dd className="m-0">{took}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export default async function BuildsPage({ searchParams }: PageProps<"/dashboard/builds">) {
  const { app, license, state } = await requireClient();
  if (!app) redirect("/dashboard/app-type");
  const { started, download, queued } = await searchParams;
  const contact = await getContact();
  const store = await getStore();
  const plans = await getPlans(store);
  const builds = await store.listBuildsByApp(app.id, 50);
  const current = builds[0] ?? null;
  const lastReady: Build | null = builds.find((b) => b.status === "ready") ?? null;
  const release = latestRelease(await store.listReleases());
  const now = new Date();
  // 13.1 The app's plan as it is now.
  const effective = await effectivePlans(store);
  const plan = license ? currentPlanId(license, now) : null;
  const currentPlan = plan ? effective[plan] : null;
  const autoPublish = currentPlan ? hasFeature(currentPlan, "auto_publish") : false;
  const keys = hasStoreKeys(app);
  const plugin = usesPlugin(app);

  // Each Download button opens a route that signs a fresh 15-minute link when clicked, so it never expires on an open page.
  const fileRow = (kind: ArtifactKind) => {
    const url = lastReady?.artifacts.find((a) => a.kind === kind)?.url;
    const link = url ? fileLink(url, now) : null;
    const unavailable = fileUnavailableReason({ kind, build: lastReady, hasAppStoreKey: keys.appStore, iosOnPlan: currentPlan ? hasFeature(currentPlan, "ios") : true, linkProblem: link?.disabledReason ?? null });
    return { href: unavailable === null && lastReady ? dashboardFileHref(lastReady.id, kind) : null, unavailable };
  };

  const setupDone = isSetupComplete(app, plan, effective);
  const running = isInProgress(current, now);
  const stalled = current !== null && isStalled(current, now);
  const licenseName = licensePageName(app);
  const licenseProblem =
    state === "pending"
      ? `This app isn't activated yet. Pay its plan on ${licenseName}, or message us on WhatsApp.`
      : state === "suspended"
        ? "This account is suspended, so new builds can't start. Message us on WhatsApp."
        : state === "expired"
          ? `This app's plan has ended. Renew it on ${licenseName} to start new builds.`
          : null;
  const disabledReason =
    licenseProblem ??
    (!setupDone
      ? "Finish the app setup to start a build."
      : running
        ? "A build is in progress. You can start another one when it finishes."
        : null);

  return (
    <>
      <PageHeader
        title="Builds & downloads"
        description={
          <>
            Your Android and iOS apps for {appLabel(app)}, built from your setup. Plan: {planName(plan, plans)}.
          </>
        }
        actions={<StartBuildForm suggestedVersion={suggestedVersion(current)} disabledReason={disabledReason} />}
      />

      {started === "auto" ? (
        <Notice tone="success" icon="check_circle" role="status">
          Saved. A new build with your changes is queued automatically. We&apos;ll email you when your files are ready.
        </Notice>
      ) : started ? (
        <Notice tone="success" icon="check_circle" role="status">
          Your app setup is complete and your first build is queued. We&apos;ll email you when your files are ready.
        </Notice>
      ) : null}

      {currentPlan && !hasFeature(currentPlan, "auto_rebuild") && builds.length > 0 ? (
        <UpgradeHint title="Automatic rebuilds" to={lowestPlanWith(effective, (p) => hasFeature(p, "auto_rebuild"), plan)}>
          On your plan, start a new build after you change your app&apos;s name, icon, colors or store details.
        </UpgradeHint>
      ) : null}

      {typeof queued === "string" && /^\d+$/.test(queued) ? (
        <Notice tone="success" icon="check_circle" role="status">
          Build #{queued} is queued. We&apos;ll email you when your files are ready.
        </Notice>
      ) : null}

      {download === "unavailable" ? (
        <Notice tone="warn" icon="warning" role="alert">
          That file isn&apos;t available to download right now. Try again from the list below, or <a href={contact.whatsappUrl}>message us on WhatsApp</a>.
        </Notice>
      ) : null}

      {state === "expired" ? (
        <Notice tone="warn" icon="warning">
          This app&apos;s plan ended on {formatDate(license?.expiresAt)}. New builds need an active plan:{" "}
          <Link href="/dashboard/license#renew">renew it on {licenseName}</Link> or <a href={contact.whatsappUrl}>message us on WhatsApp</a>. Files from
          your earlier builds stay available below.
        </Notice>
      ) : state === "suspended" ? (
        <Notice tone="warn" icon="warning">
          This account is suspended, so new builds can&apos;t start. Files from earlier builds stay available below.
        </Notice>
      ) : null}

      {!setupDone ? (
        <Notice icon="info">
          Your first build starts when the app setup is complete.{" "}
          <Link href={`/dashboard/setup?step=${nextStep(app, plan, effective) ?? "website"}`} className="font-bold">
            Continue the setup
          </Link>
        </Notice>
      ) : null}

      {current ? (
        <section aria-labelledby="h-current" className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-5 sm:p-6">
          {/* The heading's grandparent holds the status badge (tests read it from there). */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-semibold text-muted">Latest build</span>
              <h2 id="h-current" className="m-0 text-lg font-bold">
                Build #{current.number} · App version {current.versionName}
              </h2>
              <span className="text-sm text-muted">Version code {current.versionCode}</span>
            </div>
            <BuildBadge status={current.status} />
          </div>
          <Times build={current} now={now} />
          <BuildStages stages={current.stages} />
          {current.status === "queued" || current.status === "building" ? (
            stalled ? (
              <Notice tone="warn" icon="hourglass_top">
                {statusExplanation(current, now)}
              </Notice>
            ) : (
              <p className="m-0 text-sm text-muted">{statusExplanation(current, now)}</p>
            )
          ) : null}
          {current.status === "ready" && current.message ? (
            <Notice tone={Object.values(current.stages).includes("failed") ? "warn" : "info"} icon={Object.values(current.stages).includes("failed") ? "warning" : "info"}>
              {current.message}
            </Notice>
          ) : null}
          {current.status === "failed" ? (
            <Notice tone="danger" icon="error">
              <span className="font-semibold">{failureReason(current)}</span> Nothing was published from this build. Our team has been told and will look
              into it; you can also try again now.
            </Notice>
          ) : null}
          {(current.status === "failed" || stalled) && !licenseProblem && setupDone ? <RetryBuildForm versionName={current.versionName} /> : null}
        </section>
      ) : setupDone && !licenseProblem ? (
        <EmptyState icon="build" title="No builds yet.">
          Choose Start new build to build your apps; it usually takes 15 to 45 minutes. We email you when your files are ready.
        </EmptyState>
      ) : null}

      <Section
        titleId="h-files"
        title={lastReady ? `Files from build #${lastReady.number} (version ${lastReady.versionName})` : "Files from your latest successful build"}
        description={
          lastReady
            ? `Finished ${formatDateTime(lastReady.finishedAt ?? lastReady.updatedAt)}. Each download link is made when you click it.`
            : "Your files appear here when a build finishes."
        }
        flush
        className="overflow-hidden"
      >
        <ul className="m-0 list-none p-0">
          {FILES.map((file) => (
            <DownloadRow key={file.kind} title={ARTIFACT_LABEL[file.kind]} text={fileDescription(file.kind, autoPublish)} highlight={file.highlight} {...fileRow(file.kind)} />
          ))}
          {plugin ? (
            <DownloadRow
              title="WordPress plugin (.zip)"
              text={release ? `Version ${release.version} · License key on the License page` : "License key on the License page"}
              href={release && state === "active" ? "/api/dashboard/plugin" : null}
              unavailable={!release ? "No plugin release yet" : "Available while this app's plan is active"}
            />
          ) : null}
          <DownloadRow title={ARTIFACT_LABEL.store_assets} text={fileDescription("store_assets", autoPublish)} {...fileRow("store_assets")} last />
        </ul>
      </Section>

      <Notice tone="neutral" icon="phone_iphone">
        Apple&apos;s rule: the iPhone app never shows buy buttons for paid courses or digital products; free enrolment works on both phones. Your Android
        app opens your checkout as usual.
      </Notice>

      <section aria-labelledby="h-next" className="flex flex-col gap-3">
        <h2 id="h-next" className="m-0 text-lg font-bold">
          Get it on the stores
        </h2>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">
          <LinkCard href="/dashboard/publishing" icon="publish" title="Publishing" text="Publish it yourself, or let us publish it for you" />
          <LinkCard href="/docs/google-play" icon="menu_book" title="Publish on Google Play" text="Step-by-step guide" />
          <LinkCard href="/docs/app-store" icon="menu_book" title="Publish on the App Store" text="Step-by-step guide" />
        </div>
      </section>

      <Section titleId="h-history" title="Build history" description={builds.length ? "Every build of this app, newest first." : undefined}>
        {builds.length === 0 ? (
          <p className="m-0 text-sm text-muted">No builds yet.</p>
        ) : (
          // A table from md up; on phones each build is a card (globals.css, .table-cards).
          <table className="table-cards w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th scope="col" className="py-2 pr-4 font-semibold">Build</th>
                <th scope="col" className="py-2 pr-4 font-semibold">App version</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Queued</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Finished</th>
                <th scope="col" className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {builds.map((build) => (
                <tr key={build.id} className="align-top md:border-t md:border-line-soft">
                  <td data-label="Build" className="md:py-2.5 md:pr-4 font-semibold">
                    #{build.number}
                  </td>
                  <td data-label="App version" className="md:py-2.5 md:pr-4">
                    <span>
                      {build.versionName} <span className="text-muted">({build.versionCode})</span>
                    </span>
                  </td>
                  <td data-label="Queued" className="md:py-2.5 md:pr-4">
                    {formatDateTime(build.createdAt)}
                  </td>
                  <td data-label="Finished" className="md:py-2.5 md:pr-4">
                    <span>
                      {build.finishedAt ? formatDateTime(build.finishedAt) : "Not yet"}
                      {formatDuration(build.startedAt, build.finishedAt) ? (
                        <span className="block text-xs text-muted">Took {formatDuration(build.startedAt, build.finishedAt)}</span>
                      ) : null}
                    </span>
                  </td>
                  <td data-label="Status" className="md:py-2.5">
                    <span>
                      <BuildStatusText status={build.status} />
                      {build.status === "failed" ? <span className="block max-w-[260px] text-xs text-muted">{failureReason(build)}</span> : null}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </>
  );
}
