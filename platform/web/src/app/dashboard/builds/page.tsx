import { plansIn } from "@/lib/marketing-lang";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BuildBadge, BuildStages, BuildStatusText } from "@/components/build-status";
import { Icon } from "@/components/icon";
import { LinkCard } from "@/components/dashboard";
import { EmptyState, Notice, PageHeader, Section, formatDate, formatDateTime } from "@/components/ui";
import { firebaseListsCourierApp, hasStoreKeys, isSetupComplete, nextStep } from "@/lib/app/setup";
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
import { GoBackForm, RebuildForm, RetryBuildForm, RolloutButtons, StagedReleaseForm, StartBuildForm, VersionsForm } from "./start-build";
import { versionsInUse } from "@/lib/builds/go-back";
import { FIRST_SHARES, nextFraction } from "@/lib/publishing/rollout";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";
import { courierAppNameOf, courierBundleIdOf, courierPackageOf, hasCourierJobs } from "@/lib/delivery/courier-app";
import { deliverySettingsOf } from "@/lib/delivery/settings";

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
  const { started, download, queued, back, pages } = await searchParams;
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
  // 89.3 The versions people use (the app's statistics, last 7 days).
  const inUse = await versionsInUse(store, app, now.toISOString().slice(0, 10));
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
  // 104.6 One build at a time for the app, its courier app's included.
  const running = isInProgress((await store.listBuildsByApp(app.id, 1, "all"))[0] ?? null, now);
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

  // 104.6 The delivery (105.1.6 or food) company's courier app, when it chose one in its own name.
  const delivery = hasCourierJobs(app) ? deliverySettingsOf(await store.getDeliverySettings(app.id)) : null;
  const courier =
    delivery?.courierApp === "bundle"
      ? {
          name: courierAppNameOf(app, delivery),
          android: app.androidPackage ? courierPackageOf(app.androidPackage) : "—",
          ios: app.iosBundleId ? courierBundleIdOf(app.iosBundleId) : "—",
          onPlan: currentPlan ? hasFeature(currentPlan, "courier_app") : false,
          firebaseAndroid: await firebaseListsCourierApp(app, preflightDeps(store)),
          firebaseIos: Boolean(delivery.courierFirebaseIosAssetId),
          builds: await store.listBuildsByApp(app.id, 20, "courier"),
        }
      : null;
  const courierCurrent = courier?.builds[0] ?? null;
  const courierReady = courier?.builds.find((b) => b.status === "ready") ?? null;
  const courierStalled = courierCurrent !== null && isStalled(courierCurrent, now);
  const courierFileRow = (kind: ArtifactKind) => {
    const url = courierReady?.artifacts.find((a) => a.kind === kind)?.url;
    const link = url ? fileLink(url, now) : null;
    const unavailable = fileUnavailableReason({ kind, build: courierReady, hasAppStoreKey: keys.appStore, iosOnPlan: currentPlan ? hasFeature(currentPlan, "ios") : true, linkProblem: link?.disabledReason ?? null });
    return { href: unavailable === null && courierReady ? dashboardFileHref(courierReady.id, kind) : null, unavailable: unavailable === null ? null : k(unavailable) };
  };

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

      {/* 87.4 The automatic build of the latest saves, and when it starts. */}
      {app.autoBuildDueAt && app.autoBuildDueAt > now && !running ? (
        <Notice tone="info" icon="schedule" role="status">
          {t("builds.autoWaiting", { time: formatDateTime(app.autoBuildDueAt, lang) })}
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
          {/* 89.3 Gone back to an earlier build. */}
          {typeof back === "string" && /^\d+$/.test(back) ? ` ${t(pages ? "builds.wentBackPages" : "builds.wentBack", { number: back })}` : ""}
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

      {courier ? (
        <Section id="courier-app" titleId="h-courier-app" title={t("builds.courierTitle")} description={t("builds.courierText", { name: courier.name, android: courier.android, ios: courier.ios })}>
          <div className="flex flex-col gap-4">
            {!courier.onPlan ? (
              <Notice tone="warn" icon="info">
                {t("builds.courierOff")}
              </Notice>
            ) : null}
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
              <li className="flex items-start gap-2" data-courier-firebase="android">
                <Icon name={courier.firebaseAndroid ? "check_circle" : "info"} size={20} className={courier.firebaseAndroid ? "text-success" : "text-ink-4"} />
                <span>{courier.firebaseAndroid ? t("builds.courierFirebaseAndroidOk") : t("builds.courierFirebaseAndroidMissing", { android: courier.android })}</span>
              </li>
              <li className="flex items-start gap-2" data-courier-firebase="ios">
                <Icon name={courier.firebaseIos ? "check_circle" : "info"} size={20} className={courier.firebaseIos ? "text-success" : "text-ink-4"} />
                <span>{courier.firebaseIos ? t("builds.courierFirebaseIosOk") : t("builds.courierFirebaseIosMissing")}</span>
              </li>
            </ul>
            <StartBuildForm
              courier
              suggestedVersion={suggestedVersion(courierCurrent)}
              disabledReason={disabledReason ?? (!courier.onPlan ? t("builds.courierOff") : null)}
            />
            {courierCurrent ? (
              <div className="flex flex-col gap-4 rounded-xl border border-line p-4" data-courier-build>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm font-semibold text-muted">{t("builds.courierLatest")}</span>
                    <h3 className="m-0 text-base font-bold">{t("builds.buildTitle", { number: courierCurrent.number, version: courierCurrent.versionName })}</h3>
                  </div>
                  <BuildBadge status={courierCurrent.status} lang={lang} />
                </div>
                <Times build={courierCurrent} now={now} text={text} />
                <BuildStages stages={courierCurrent.stages} lang={lang} />
                {courierCurrent.status === "queued" || courierCurrent.status === "building" ? (
                  <p className="m-0 text-sm text-muted">{k(statusExplanation(courierCurrent, now))}</p>
                ) : null}
                {courierCurrent.status === "failed" ? (
                  <Notice tone="danger" icon="error">
                    {richText(t("builds.failedNotice", { reason: k(failureReason(courierCurrent)) }), { b: (chunk) => <span className="font-semibold">{chunk}</span> })}
                  </Notice>
                ) : null}
                {(courierCurrent.status === "failed" || courierStalled) && !licenseProblem && setupDone && courier.onPlan ? (
                  <RetryBuildForm courier versionName={courierCurrent.versionName} />
                ) : null}
              </div>
            ) : (
              <p className="m-0 text-sm text-muted">{t("builds.courierNone")}</p>
            )}
            {courierReady ? (
              <div className="overflow-hidden rounded-xl border border-line">
                <h3 className="m-0 border-b border-line-soft px-4 py-3 text-base font-bold sm:px-6">{t("builds.courierFiles")}</h3>
                <ul className="m-0 list-none p-0">
                  {(["apk", "aab", "ipa"] as const).map((kind, i, all) => (
                    <DownloadRow key={kind} t={t} title={k(ARTIFACT_LABEL[kind])} text={k(fileDescription(kind, autoPublish))} last={i === all.length - 1} {...courierFileRow(kind)} />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

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

      {/* 89.2 Staged releases, with "We publish for you". */}
      {autoPublish ? (
        <Section titleId="h-staged" title={t("builds.stagedTitle")} description={t("builds.stagedText")}>
          <div className="flex flex-col gap-5">
            {app.rollout?.android && app.rollout.android.status !== "completed" ? (
              <div className="flex flex-col gap-2 rounded-xl border border-line p-4" data-rollout="android">
                <span className="text-[15px] font-bold">
                  {app.rollout.android.status === "halted"
                    ? t("builds.rolloutAndroidHalted", { version: app.rollout.android.versionName, percent: Math.round(app.rollout.android.fraction * 100) })
                    : t("builds.rolloutAndroid", { version: app.rollout.android.versionName, percent: Math.round(app.rollout.android.fraction * 100) })}
                </span>
                <RolloutButtons
                  store="android"
                  actions={
                    app.rollout.android.status === "halted"
                      ? [
                          { action: "resume", label: t("builds.rolloutResume") },
                          { action: "complete", label: t("builds.rolloutEveryone") },
                        ]
                      : [
                          { action: "continue", label: t("builds.rolloutContinue", { percent: Math.round(nextFraction(app.rollout.android.fraction) * 100) }) },
                          { action: "stop", label: t("builds.rolloutStop") },
                          { action: "complete", label: t("builds.rolloutEveryone") },
                        ]
                  }
                />
              </div>
            ) : null}
            {app.rollout?.ios && app.rollout.ios.state !== "COMPLETE" ? (
              <div className="flex flex-col gap-2 rounded-xl border border-line p-4" data-rollout="ios">
                <span className="text-[15px] font-bold">
                  {app.rollout.ios.state === "PAUSED" ? t("builds.rolloutIosPaused", { version: app.rollout.ios.versionName }) : t("builds.rolloutIos", { version: app.rollout.ios.versionName })}
                </span>
                <RolloutButtons
                  store="ios"
                  actions={
                    app.rollout.ios.state === "PAUSED"
                      ? [
                          { action: "resume", label: t("builds.rolloutResume") },
                          { action: "complete", label: t("builds.rolloutEveryone") },
                        ]
                      : [
                          { action: "stop", label: t("builds.rolloutPause") },
                          { action: "complete", label: t("builds.rolloutEveryone") },
                        ]
                  }
                />
              </div>
            ) : null}
            <StagedReleaseForm
              current={{ androidPercent: app.stagedRelease?.androidPercent == null ? "" : String(app.stagedRelease.androidPercent), iosPhased: Boolean(app.stagedRelease?.iosPhased) }}
              shares={[...FIRST_SHARES]}
            />
          </div>
        </Section>
      ) : null}

      {/* 89.1 Which versions people may still use. */}
      <Section titleId="h-versions" title={t("builds.versionsTitle")} description={t("builds.versionsText")}>
        <div className="flex flex-col gap-5">
          {/* 89.3 The versions people use, from the app's statistics. */}
          {inUse.length > 0 ? (
            <table className="w-full max-w-[520px] border-collapse text-sm" aria-label={t("builds.inUse")}>
              <caption className="pb-2 text-start text-[15px] font-bold">{t("builds.inUse")}</caption>
              <thead>
                <tr className="text-muted">
                  <th scope="col" className="py-1.5 pe-4 text-start font-semibold">{t("builds.colVersion")}</th>
                  <th scope="col" className="py-1.5 pe-4 text-start font-semibold">{t("builds.inUsePhones")}</th>
                  <th scope="col" className="py-1.5 text-start font-semibold">{t("builds.inUseShare")}</th>
                </tr>
              </thead>
              <tbody>
                {inUse.map((row) => (
                  <tr key={row.version} className="border-t border-line-soft" data-version={row.version}>
                    <td className="py-1.5 pe-4">
                      <span dir="ltr">{row.version === "unknown" ? t("builds.inUseUnknown") : row.version}</span>
                      {row.belowMinimum ? <span className="ms-2 text-xs font-semibold text-danger">{t("builds.inUseBelow")}</span> : null}
                    </td>
                    <td className="py-1.5 pe-4">{text.num(row.phones)}</td>
                    <td className="py-1.5">{text.num(row.share, { style: "percent", maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="m-0 text-sm text-muted">{t("builds.inUseNone")}</p>
          )}
          <VersionsForm current={{ minVersion: app.minVersion ?? "", recommendedVersion: app.recommendedVersion ?? "" }} />
        </div>
      </Section>

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
                    {build.status === "ready" && build.sourceCommit && !licenseProblem && !running ? (
                      <>
                        <RebuildForm buildId={build.id} number={build.number} />
                        {build.id !== builds[0]?.id ? <GoBackForm buildId={build.id} number={build.number} /> : null}
                      </>
                    ) : null}
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
