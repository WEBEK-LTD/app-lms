import { plansIn } from "@/lib/marketing-lang";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BuildBadge, BuildStages, BuildStatusText } from "@/components/build-status";
import { Icon } from "@/components/icon";
import { LinkCard } from "@/components/dashboard";
import { EmptyState, Notice, PageHeader, Section, formatDate, formatDateTime } from "@/components/ui";
import { hasStoreKeys, isSetupComplete, nextStep } from "@/lib/app/setup";
import { failedApiCheck } from "@/lib/app/api-check-notice";
import { appLabel, licensePageName, usesPlugin } from "@/lib/app/label";
import { wordsOf } from "@/lib/app/kinds";
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
import { getVisitorContact } from "@/lib/contact";
import { getStore } from "@/lib/data";
import type { ArtifactKind, Build } from "@/lib/data/types";
import { ARTIFACT_LABEL, dashboardFileHref, fileLink } from "@/lib/files";
import { latestRelease } from "@/lib/license/service";
import { hasFeature, lowestPlanWith, planName } from "@/lib/plans";
import { UpgradeHint } from "@/components/upgrade";
import { currentPlanId } from "@/lib/billing/plan-change";
import { effectivePlans } from "@/lib/entitlements";
import { getPlans } from "@/lib/settings/platform";
import { failureExplanation } from "@/lib/builds/failures";
import { preflightChecks, renderCheck } from "@/lib/builds/preflight";
import { preflightDeps } from "@/lib/builds/preflight-env";
import { RebuildForm, RetryBuildForm, StartBuildForm } from "./start-build";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("builds.title") };
}

const FILES: { kind: ArtifactKind; highlight?: boolean }[] = [{ kind: "apk" }, { kind: "aab" }, { kind: "ipa" }, { kind: "keystore", highlight: true }];

function DownloadRow({
  title,
  text,
  href,
  unavailable,
  highlight,
  last,
  t,
}: {
  t: DashboardText["t"];
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
          {richText(t("builds.download", { title }), { sr: (chunk) => <span className="sr-only">{chunk}</span> })}
        </a>
      ) : (
        <span className="flex max-w-[280px] flex-col items-start gap-1 sm:items-end">
          <button type="button" disabled aria-describedby={hintId} className="h-[38px] cursor-not-allowed rounded-lg border border-line bg-sand px-4 text-sm font-semibold text-muted">
            {richText(t("builds.download", { title }), { sr: (chunk) => <span className="sr-only">{chunk}</span> })}
          </button>
          <span id={hintId} className="text-xs text-muted sm:text-end">
            {unavailable}
          </span>
        </span>
      )}
    </li>
  );
}

/** When a build was queued, started and finished, and how long it took. */
function Times({ build, now, text }: { build: Build; now: Date; text: DashboardText }) {
  const { t, k, lang } = text;
  const took = formatDuration(build.startedAt, build.finishedAt ?? (build.status === "building" ? now : null));
  return (
    <dl className="m-0 flex flex-wrap gap-x-6 gap-y-1 text-sm">
      <div className="flex gap-1.5">
        <dt className="text-muted">{t("builds.queued")}</dt>
        <dd className="m-0">{formatDateTime(build.createdAt, lang)}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="text-muted">{t("builds.started")}</dt>
        <dd className="m-0">{formatDateTime(build.startedAt, lang)}</dd>
      </div>
      {build.finishedAt ? (
        <div className="flex gap-1.5">
          <dt className="text-muted">{t("builds.finished")}</dt>
          <dd className="m-0">{formatDateTime(build.finishedAt, lang)}</dd>
        </div>
      ) : null}
      {took ? (
        <div className="flex gap-1.5">
          <dt className="text-muted">{build.finishedAt ? t("builds.took") : t("builds.runningFor")}</dt>
          <dd className="m-0">{k(took)}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export default async function BuildsPage({ searchParams }: PageProps<"/dashboard/builds">) {
  const { app, license, state } = await requireClient("settings");
  if (!app) redirect("/dashboard/app-type");
  const { started, download, queued } = await searchParams;
  const text = await dashboardText();
  const { t, k, lang } = text;
  const contact = await getVisitorContact();
  const store = await getStore();
  const plans = plansIn(text.lang, await getPlans(store));
  const builds = await store.listBuildsByApp(app.id, 50);
  const current = builds[0] ?? null;
  const lastReady: Build | null = builds.find((b) => b.status === "ready") ?? null;
  const release = latestRelease(await store.listReleases());
  const now = new Date();
  // 13.1 The app's plan as it is now.
  const effective = plansIn(text.lang, await effectivePlans(store));
  const plan = license ? currentPlanId(license, now) : null;
  const currentPlan = plan ? effective[plan] : null;
  const autoPublish = currentPlan ? hasFeature(currentPlan, "auto_publish") : false;
  const keys = hasStoreKeys(app);
  const plugin = usesPlugin(app);
  // 19 The app's own API failed its last check: builds work, but the app can't load its content.
  const apiProblem = await failedApiCheck(store, app);

  // Each Download button opens a route that signs a fresh 15-minute link when clicked, so it never expires on an open page.
  const fileRow = (kind: ArtifactKind) => {
    const url = lastReady?.artifacts.find((a) => a.kind === kind)?.url;
    const link = url ? fileLink(url, now) : null;
    const unavailable = fileUnavailableReason({ kind, build: lastReady, hasAppStoreKey: keys.appStore, iosOnPlan: currentPlan ? hasFeature(currentPlan, "ios") : true, linkProblem: link?.disabledReason ?? null });
    return { href: unavailable === null && lastReady ? dashboardFileHref(lastReady.id, kind) : null, unavailable: unavailable === null ? null : k(unavailable) };
  };

  // 87.1 What the next build would trip over.
  const checks = currentPlan ? await preflightChecks(preflightDeps(store), app, { ios: hasFeature(currentPlan, "ios"), autoPublish: hasFeature(currentPlan, "auto_publish") }) : [];
  const setupDone = isSetupComplete(app, plan, effective);
  const running = isInProgress(current, now);
  const stalled = current !== null && isStalled(current, now);
  const licenseName = k(licensePageName(app));
  const licenseProblem =
    state === "pending"
      ? t("builds.licensePending", { page: licenseName })
      : state === "suspended"
        ? t("builds.licenseSuspended")
        : state === "expired"
          ? t("builds.licenseExpired", { page: licenseName })
          : null;
  const disabledReason = licenseProblem ?? (!setupDone ? t("builds.finishSetup") : running ? t("builds.inProgress") : null);
  const wa = { wa: (chunk: string) => <a href={contact.whatsappUrl}>{chunk}</a> };
  const autoRebuildTo = lowestPlanWith(effective, (p) => hasFeature(p, "auto_rebuild"), plan);

  return (
    <>
      <PageHeader
        title={t("builds.title")}
        description={t("builds.intro", { app: appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app), plan: k(planName(plan, plans)) })}
        actions={<StartBuildForm suggestedVersion={suggestedVersion(current)} disabledReason={disabledReason} />}
      />

      {started === "auto" ? (
        <Notice tone="success" icon="check_circle" role="status">
          {t("builds.autoQueued")}
        </Notice>
      ) : started ? (
        <Notice tone="success" icon="check_circle" role="status">
          {t("builds.firstQueued")}
        </Notice>
      ) : null}

      {currentPlan && !hasFeature(currentPlan, "auto_rebuild") && builds.length > 0 ? (
        <UpgradeHint title={t("builds.autoRebuilds")} to={autoRebuildTo} cta={autoRebuildTo ? t("overview.upgradeTo", { plan: autoRebuildTo.name }) : undefined}>
          {t("builds.autoRebuildsText")}
        </UpgradeHint>
      ) : null}

      {typeof queued === "string" && /^\d+$/.test(queued) ? (
        <Notice tone="success" icon="check_circle" role="status">
          {t("builds.buildQueued", { number: queued })}
        </Notice>
      ) : null}

      {checks.length > 0 ? (
        <Section id="checks" titleId="h-checks" title={t("builds.checksTitle")} description={t("builds.checksText")}>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {checks.map((check) => (
              <li key={check.key} data-check={check.key} className={`flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 ${check.level === "error" ? "border-danger/30 bg-danger-bg" : "border-line bg-white"}`}>
                <Icon name={check.level === "error" ? "error" : "info"} size={20} className={check.level === "error" ? "text-danger" : "text-ink-4"} />
                <span className="min-w-0 flex-1 text-sm">
                  {check.level === "warning" ? <span className="font-semibold">{t("builds.checksWarning")}: </span> : null}
                  {k(renderCheck(check))}
                </span>
                <Link href={check.link} className="text-sm font-semibold">
                  {t("builds.checksFix")}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {apiProblem ? (
        <Notice tone="warn" icon="warning">
          {richText(t("builds.apiProblem", { body: k(apiProblem.body) }), { link: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })}
        </Notice>
      ) : null}

      {download === "unavailable" ? (
        <Notice tone="warn" icon="warning" role="alert">
          {richText(t("builds.unavailable"), wa)}
        </Notice>
      ) : null}

      {state === "expired" ? (
        <Notice tone="warn" icon="warning">
          {richText(t("builds.expiredNotice", { date: formatDate(license?.expiresAt, lang), page: licenseName }), {
            ...wa,
            renew: (chunk) => <Link href="/dashboard/license#renew">{chunk}</Link>,
          })}
        </Notice>
      ) : state === "suspended" ? (
        <Notice tone="warn" icon="warning">
          {t("builds.suspendedNotice")}
        </Notice>
      ) : null}

      {!setupDone ? (
        <Notice icon="info">
          {t("builds.firstBuildWhen")}{" "}
          <Link href={`/dashboard/setup?step=${nextStep(app, plan, effective) ?? "website"}`} className="font-bold">
            {t("builds.continueSetup")}
          </Link>
        </Notice>
      ) : null}

      {current ? (
        <section aria-labelledby="h-current" className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-5 sm:p-6">
          {/* The heading's grandparent holds the status badge (tests read it from there). */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-semibold text-muted">{t("builds.latestBuild")}</span>
              <h2 id="h-current" className="m-0 text-lg font-bold">
                {t("builds.buildTitle", { number: current.number, version: current.versionName })}
              </h2>
              <span className="text-sm text-muted">{t("builds.versionCode", { code: current.versionCode })}</span>
            </div>
            <BuildBadge status={current.status} lang={lang} />
          </div>
          <Times build={current} now={now} text={text} />
          <BuildStages stages={current.stages} lang={lang} />
          {current.status === "queued" || current.status === "building" ? (
            stalled ? (
              <Notice tone="warn" icon="hourglass_top">
                {k(statusExplanation(current, now))}
              </Notice>
            ) : (
              <p className="m-0 text-sm text-muted">{k(statusExplanation(current, now))}</p>
            )
          ) : null}
          {current.status === "ready" && current.message ? (
            <Notice tone={Object.values(current.stages).includes("failed") ? "warn" : "info"} icon={Object.values(current.stages).includes("failed") ? "warning" : "info"}>
              {k(current.message)}
            </Notice>
          ) : null}
          {current.status === "failed" ? (
            <Notice tone="danger" icon="error">
              {richText(t("builds.failedNotice", { reason: k(failureReason(current)) }), { b: (chunk) => <span className="font-semibold">{chunk}</span> })}
            </Notice>
          ) : null}
          {/* 87.2 The cause of a store upload that didn't work on a ready build, and where to fix it. */}
          {current.status === "ready" && failureExplanation(current) ? <Notice tone="warn" icon="info">{k(failureExplanation(current)!.text)}</Notice> : null}
          {failureExplanation(current)?.link ? (
            <Link href={failureExplanation(current)!.link!} className="self-start text-sm font-semibold" data-failure-link>
              {t("builds.checksFix")}
            </Link>
          ) : null}
          {/* 87.2 What the build printed, without its secrets: the client may read it. */}
          {current.failure?.log ? (
            <details className="text-sm" data-failure-log>
              <summary className="cursor-pointer font-semibold">{t("builds.failureLog")}</summary>
              <p className="m-0 mt-2 text-xs text-muted">{t("builds.failureLogText")}</p>
              <pre dir="ltr" className="mt-2 max-h-[360px] overflow-auto rounded-xl bg-midnight p-3 text-xs leading-relaxed whitespace-pre-wrap text-white">
                {current.failure.log}
              </pre>
            </details>
          ) : null}
          {(current.status === "failed" || stalled) && !licenseProblem && setupDone ? <RetryBuildForm versionName={current.versionName} /> : null}
        </section>
      ) : setupDone && !licenseProblem ? (
        <EmptyState icon="build" title={t("builds.noBuilds")}>
          {t("builds.noBuildsText")}
        </EmptyState>
      ) : null}

      <Section
        titleId="h-files"
        title={lastReady ? t("builds.filesFrom", { number: lastReady.number, version: lastReady.versionName }) : t("builds.filesLatest")}
        description={
          lastReady ? t("builds.filesFinished", { date: formatDateTime(lastReady.finishedAt ?? lastReady.updatedAt, lang) }) : t("builds.filesAppear")
        }
        flush
        className="overflow-hidden"
      >
        <ul className="m-0 list-none p-0">
          {FILES.map((file) => (
            <DownloadRow
              key={file.kind}
              t={t}
              title={k(ARTIFACT_LABEL[file.kind])}
              text={k(fileDescription(file.kind, autoPublish))}
              highlight={file.highlight}
              {...fileRow(file.kind)}
            />
          ))}
          {plugin ? (
            <DownloadRow
              t={t}
              title={t("builds.plugin")}
              text={release ? t("builds.pluginVersion", { version: release.version }) : t("builds.pluginKey")}
              href={release && state === "active" ? "/api/dashboard/plugin" : null}
              unavailable={!release ? t("builds.noRelease") : t("builds.pluginActive")}
            />
          ) : null}
          <DownloadRow t={t} title={k(ARTIFACT_LABEL.store_assets)} text={k(fileDescription("store_assets", autoPublish))} {...fileRow("store_assets")} last />
        </ul>
      </Section>

      {/* 31 Apple's rules for what this app sells; nothing for apps that sell nothing. */}
      {wordsOf(app).iphone ? (
        <Notice tone="neutral" icon="phone_iphone">
          {k(wordsOf(app).iphone!)}
        </Notice>
      ) : null}

      <section aria-labelledby="h-next" className="flex flex-col gap-3">
        <h2 id="h-next" className="m-0 text-lg font-bold">
          {t("builds.stores")}
        </h2>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">
          <LinkCard href="/dashboard/publishing" icon="publish" title={t("builds.publishing")} text={t("builds.publishingText")} />
          <LinkCard href={localePath(lang, "/docs/google-play")} icon="menu_book" title={t("builds.guideGoogle")} text={t("builds.stepByStep")} />
          <LinkCard href={localePath(lang, "/docs/app-store")} icon="menu_book" title={t("builds.guideApple")} text={t("builds.stepByStep")} />
          <LinkCard href={localePath(lang, "/docs/galaxy-store")} icon="menu_book" title={t("builds.guideGalaxy")} text={t("builds.stepByStep")} />
          <LinkCard href={localePath(lang, "/docs/huawei-appgallery")} icon="menu_book" title={t("builds.guideHuawei")} text={t("builds.stepByStep")} />
          <LinkCard href={localePath(lang, "/docs/xiaomi-getapps")} icon="menu_book" title={t("builds.guideXiaomi")} text={t("builds.stepByStep")} />
        </div>
      </section>

      <Section titleId="h-history" title={t("builds.history")} description={builds.length ? t("builds.historyText") : undefined}>
        {builds.length === 0 ? (
          <p className="m-0 text-sm text-muted">{t("builds.noBuilds")}</p>
        ) : (
          // A table from md up; on phones each build is a card (globals.css, .table-cards).
          <table className="table-cards w-full border-collapse text-sm">
            <thead>
              <tr className="text-start text-muted">
                <th scope="col" className="py-2 pe-4 text-start font-semibold">
                  {t("builds.colBuild")}
                </th>
                <th scope="col" className="py-2 pe-4 text-start font-semibold">
                  {t("builds.colVersion")}
                </th>
                <th scope="col" className="py-2 pe-4 text-start font-semibold">
                  {t("builds.queued")}
                </th>
                <th scope="col" className="py-2 pe-4 text-start font-semibold">
                  {t("builds.finished")}
                </th>
                <th scope="col" className="py-2 text-start font-semibold">
                  {t("common.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {builds.map((build) => (
                <tr key={build.id} className="align-top md:border-t md:border-line-soft">
                  <td data-label={t("builds.colBuild")} className="font-semibold md:py-2.5 md:pe-4">
                    #{build.number}
                  </td>
                  <td data-label={t("builds.colVersion")} className="md:py-2.5 md:pe-4">
                    <span>
                      {build.versionName} <span className="text-muted">({build.versionCode})</span>
                    </span>
                  </td>
                  <td data-label={t("builds.queued")} className="md:py-2.5 md:pe-4">
                    {formatDateTime(build.createdAt, lang)}
                  </td>
                  <td data-label={t("builds.finished")} className="md:py-2.5 md:pe-4">
                    <span>
                      {build.finishedAt ? formatDateTime(build.finishedAt, lang) : t("builds.notYet")}
                      {formatDuration(build.startedAt, build.finishedAt) ? (
                        <span className="block text-xs text-muted">{t("builds.tookTime", { time: k(formatDuration(build.startedAt, build.finishedAt)!) })}</span>
                      ) : null}
                    </span>
                  </td>
                  <td data-label={t("common.status")} className="md:py-2.5">
                    <span>
                      <BuildStatusText status={build.status} lang={lang} />
                      {build.status === "failed" ? <span className="block max-w-[260px] text-xs text-muted">{k(failureReason(build))}</span> : null}
                      {build.rebuildOf ? <span className="block text-xs text-muted">{t("builds.rebuildOf", { number: build.rebuildOf })}</span> : null}
                    </span>
                    {/* 87.3 A ready build made from known code can be made again as it was. */}
                    {build.status === "ready" && build.sourceCommit && !licenseProblem && !running ? <RebuildForm buildId={build.id} number={build.number} /> : null}
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
