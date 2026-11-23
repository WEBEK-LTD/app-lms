import { plansIn } from "@/lib/marketing-lang";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BUILD_STATUS_LABEL, BUILD_TONE, BuildStages } from "@/components/build-status";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { KitCallout, KitEmpty, KitFold, KitHeader, KitHero, KitList, KitMore, KitNext, KitPage, KitRow, KitSection, KitSettingRow, KitSettings, KitStatus, KitThumb, kit } from "@/components/studio-page";
import { KitInspectorBody, KitInspectorHead } from "@/components/studio-page/parts";
import { KitTable } from "@/components/studio-page/table";
import { formatDate, formatDateTime } from "@/components/ui";
import { firebaseListsCourierApp, firebaseListsStaffApp, firebaseListsVendorApp, hasStoreKeys, iosBuildAvailable, isSetupComplete, nextStep } from "@/lib/app/setup";
import { failedApiCheck } from "@/lib/app/api-check-notice";
import { appLabel, licensePageName, usesPlugin } from "@/lib/app/label";
import { wordsOf } from "@/lib/app/kinds";
import { requireClient } from "@/lib/auth/session";
import {
  buildOnly,
  failureReason,
  iphoneOnlyAgain,
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
import { upgradeHref } from "@/components/upgrade";
import { currentPlanId } from "@/lib/billing/plan-change";
import { effectivePlans } from "@/lib/entitlements";
import { getPlans } from "@/lib/settings/platform";
import { clientSeesFailureLog, failureExplanation, noMacRunner } from "@/lib/builds/failures";
import { preflightChecks, renderCheck } from "@/lib/builds/preflight";
import { preflightDeps } from "@/lib/builds/preflight-env";
import { GoBackForm, RebuildForm, RetryBuildForm, RolloutButtons, StagedReleaseForm, StartBuildForm, VersionsForm } from "./start-build";
import { APP_REVIEW_TEXT } from "@/lib/publishing/app-review-submit";
import { versionsInUse } from "@/lib/builds/go-back";
import { FIRST_SHARES, nextFraction } from "@/lib/publishing/rollout";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";
import type { DashKey } from "@/i18n/dashboard";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";
import { courierAppNameOf, courierBundleIdOf, courierPackageOf, hasCourierJobs, secondAppRoleOf } from "@/lib/delivery/courier-app";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { SamplesStoreNotice } from "@/components/samples";
import { TwoApps } from "@/components/two-apps";
import { twoAppsOf } from "@/lib/delivery/two-apps";
import { hasVendorApp, vendorAppNameOf, vendorBundleIdOf, vendorPackageOf } from "@/lib/market/vendor-app";
import { hasStaffApp, staffAppKindOf, staffAppNameOf, staffAppOnPlan, staffBundleIdOf, staffPackageOf } from "@/lib/school/staff-app";
import { isStudioProject, studioPathFor } from "@/lib/studio/section";
import { liveStoreLinks, storeLinkFor } from "@/lib/builds/retention";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("builds.title") };
}

const FILES: { kind: ArtifactKind; highlight?: boolean }[] = [{ kind: "apk" }, { kind: "aab" }, { kind: "ipa" }, { kind: "keystore", highlight: true }];

/** 132.141 Each file's picture on its row. */
const FILE_ICON: Record<ArtifactKind | "plugin", IconName> = { apk: "android", aab: "android", ipa: "phone_iphone", keystore: "key", store_assets: "photo_library", plugin: "code" };

/** One file of a build: its name, what it's for, and Download (or why it can't be downloaded yet). */
function DownloadRow({
  id,
  icon,
  title,
  text,
  href,
  unavailable,
  highlight,
  t,
}: {
  id: string;
  icon: IconName;
  t: DashboardText["t"];
  title: string;
  text: string;
  href: string | null;
  unavailable: string | null;
  highlight?: boolean;
}) {
  const hintId = `na-${id}`;
  const label = richText(t("builds.download", { title }), { sr: (chunk) => <span className="sr-only">{chunk}</span> });
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-(--sp-line-soft) px-3 py-3 first:border-t-0 sm:px-4" data-file={id}>
      <span className="flex min-w-0 flex-[1_1_280px] items-center gap-4">
        <KitThumb icon={icon} size={40} dim={!href} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-semibold text-(--sp-ink)">{title}</span>
          <span className={`text-[13px] ${highlight ? "font-semibold text-warn" : "text-(--sp-muted)"}`}>{text}</span>
        </span>
      </span>
      {href ? (
        <a href={href} className={kit.row}>
          <Icon name="download" size={16} />
          {label}
        </a>
      ) : (
        <span className="flex max-w-[300px] flex-col items-start gap-1 max-sm:ps-14 sm:items-end">
          <button type="button" disabled aria-describedby={hintId} className={kit.row}>
            {label}
          </button>
          <span id={hintId} className="text-xs text-(--sp-muted) sm:text-end">
            {unavailable}
          </span>
        </span>
      )}
    </li>
  );
}

/** 202 The store's page in place of a build's files: the app is live there and this build was uploaded to it. */
function StoreRow({ platform, href, t }: { platform: "android" | "ios"; href: string; t: DashboardText["t"] }) {
  const store = platform === "android" ? "Google Play" : "App Store";
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-(--sp-line-soft) px-3 py-3 first:border-t-0 sm:px-4" data-file={`store-${platform}`} data-store-link={platform}>
      <span className="flex min-w-0 flex-[1_1_280px] items-center gap-4">
        <KitThumb icon="storefront" size={40} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-semibold text-(--sp-ink)">{store}</span>
          <span className="text-[13px] text-(--sp-muted)">{t(platform === "android" ? "builds.onGooglePlay" : "builds.onAppStore")}</span>
        </span>
      </span>
      <a href={href} target="_blank" rel="noopener noreferrer" className={kit.row}>
        <Icon name="open_in_new" size={16} />
        {t("builds.openStore", { store })}
      </a>
    </li>
  );
}

/** When a build was queued, started and finished, and how long it took. */
function Times({ build, now, text }: { build: Build; now: Date; text: DashboardText }) {
  const { t, k, lang } = text;
  const took = formatDuration(build.startedAt, build.finishedAt ?? (build.status === "building" ? now : null));
  return (
    <dl className="m-0 flex flex-wrap gap-x-5 gap-y-1 text-sm">
      <div className="flex gap-1.5">
        <dt className="text-(--sp-muted)">{t("builds.queued")}</dt>
        <dd className="m-0 text-(--sp-ink)">{formatDateTime(build.createdAt, lang)}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="text-(--sp-muted)">{t("builds.started")}</dt>
        <dd className="m-0 text-(--sp-ink)">{formatDateTime(build.startedAt, lang)}</dd>
      </div>
      {build.finishedAt ? (
        <div className="flex gap-1.5">
          <dt className="text-(--sp-muted)">{t("builds.finished")}</dt>
          <dd className="m-0 text-(--sp-ink)">{formatDateTime(build.finishedAt, lang)}</dd>
        </div>
      ) : null}
      {took ? (
        <div className="flex gap-1.5">
          <dt className="text-(--sp-muted)">{build.finishedAt ? t("builds.took") : t("builds.runningFor")}</dt>
          <dd className="m-0 text-(--sp-ink)">{k(took)}</dd>
        </div>
      ) : null}
    </dl>
  );
}

/** A build's status as a pill. */
function BuildPill({ build, text }: { build: Build; text: DashboardText }) {
  return <KitStatus tone={BUILD_TONE[build.status]}>{text.k(BUILD_STATUS_LABEL[build.status])}</KitStatus>;
}

/**
 * 104.6, 105.2, 115.16, 116 A second app of the project (the couriers', the
 * drivers', the vendors' or the staff's): what it is, its notifications'
 * Firebase files, its own Start, its latest build and its files.
 */
function SecondApp({
  kind,
  id,
  titleId,
  title,
  description,
  off,
  firebase,
  start,
  latest,
  latestLabel,
  none,
  retry,
  files,
  now,
  text,
}: {
  kind: "courier" | "vendor" | "staff";
  id: string;
  titleId: string;
  title: string;
  description: string;
  off: string | null;
  firebase: { store: "android" | "ios"; ok: boolean; text: string }[];
  start: ReactNode;
  latest: Build | null;
  latestLabel: string;
  none: string;
  retry: ReactNode;
  files: { title: string; rows: ReactNode } | null;
  now: Date;
  text: DashboardText;
}) {
  const { t, k, lang } = text;
  return (
    <KitSection id={id} titleId={titleId} title={title} help={description} helpLabel={t("studioPage.helpSection")}>
      {off ? (
        <KitCallout tone="warn" icon="info">
          {off}
        </KitCallout>
      ) : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
        {firebase.map((f) => (
          <li key={f.store} className="flex items-start gap-2 text-(--sp-ink)" {...{ [`data-${kind}-firebase`]: f.store }}>
            <Icon name={f.ok ? "check_circle" : "info"} size={20} className={f.ok ? "text-success" : "text-(--sp-muted)"} />
            <span>{f.text}</span>
          </li>
        ))}
      </ul>
      {start}
      {latest ? (
        <div className="flex flex-col gap-4 rounded-2xl bg-(--sp-soft) p-4 sm:p-5" {...{ [`data-${kind}-build`]: "" }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[13px] font-semibold text-(--sp-muted)">{latestLabel}</span>
              <h3 className="m-0 text-base font-bold">{t("builds.buildTitle", { number: latest.number, version: latest.versionName })}</h3>
            </div>
            <BuildPill build={latest} text={text} />
          </div>
          <Times build={latest} now={now} text={text} />
          <BuildStages stages={latest.stages} lang={lang} look="pills" />
          {latest.status === "queued" || latest.status === "building" ? <p className="m-0 text-sm text-(--sp-muted)">{k(statusExplanation(latest, now))}</p> : null}
          {latest.status === "failed" ? (
            <KitCallout tone="danger" icon="error">
              {richText(t("builds.failedNotice", { reason: k(failureReason(latest)) }), { b: (chunk) => <span className="font-semibold">{chunk}</span> })}
            </KitCallout>
          ) : null}
          {retry}
        </div>
      ) : (
        <p className="m-0 text-sm text-(--sp-muted)">{none}</p>
      )}
      {files ? (
        <div className="flex flex-col gap-1">
          <h3 className="m-0 text-[15px] font-bold">{files.title}</h3>
          <ul className="m-0 flex list-none flex-col p-0">{files.rows}</ul>
        </div>
      ) : null}
    </KitSection>
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
  // 142 Each file from the last ready build that made its app: one started for the other platform alone left it as it was.
  const readyFor = (kind: ArtifactKind): Build | null => builds.find((b) => b.status === "ready" && buildOnly(b) !== (kind === "ipa" ? "android" : "ios")) ?? null;
  const fileRow = (kind: ArtifactKind) => {
    const source = readyFor(kind);
    const url = source?.artifacts.find((a) => a.kind === kind)?.url;
    const link = url ? fileLink(url, now) : null;
    const unavailable = fileUnavailableReason({ kind, build: source, hasAppStoreKey: keys.appStore, iosOnPlan: currentPlan ? hasFeature(currentPlan, "ios") : true, linkProblem: link?.disabledReason ?? null, planActive: state === "active", filesRemoved: Boolean(source?.release?.filesRemovedAt) });
    return { href: unavailable === null && source ? dashboardFileHref(source.id, kind) : null, unavailable: unavailable === null ? null : k(unavailable) };
  };
  // 202 The app live on Google Play or the App Store with the latest build there: the store's link in place of its files.
  const storeLinks = liveStoreLinks(await store.getPublishingRequest(app.id));
  const onStore = { android: storeLinkFor(readyFor("apk"), "android", storeLinks), ios: storeLinkFor(readyFor("ipa"), "ios", storeLinks) };

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
  // 132.59 A Studio project is offered Studio's plans, never the regular ones.
  const autoRebuildTo = lowestPlanWith(effective, (p) => hasFeature(p, "auto_rebuild"), plan, isStudioProject(app) ? "studio" : undefined);

  // 104.6 The delivery (105.1.6 or food, 105.2 ride) company's courier app; 112.3 every such company has it.
  const delivery = hasCourierJobs(app) ? deliverySettingsOf(await store.getDeliverySettings(app.id)) : null;
  const twoApps = delivery ? await twoAppsOf(store, app, currentPlan) : null;
  const inFrame = (href: string) => (isStudioProject(app) ? (studioPathFor(href) ?? href) : href);
  const courier =
    delivery && twoApps
      ? {
          name: courierAppNameOf(app, delivery),
          android: app.androidPackage ? courierPackageOf(app.androidPackage, secondAppRoleOf(app)) : "—",
          ios: app.iosBundleId ? courierBundleIdOf(app.iosBundleId, secondAppRoleOf(app)) : "—",
          onPlan: currentPlan ? hasFeature(currentPlan, "courier_app") : false,
          firebaseAndroid: await firebaseListsCourierApp(app, preflightDeps(store)),
          firebaseIos: Boolean(delivery.courierFirebaseIosAssetId),
          builds: await store.listBuildsByApp(app.id, 20, "courier"),
          role: secondAppRoleOf(app),
        }
      : null;
  // 115.16 A marketplace's vendor app, when the owner put its places in an app of their own.
  const vendorApp =
    delivery && hasVendorApp(app, delivery)
      ? {
          name: vendorAppNameOf(app),
          android: app.androidPackage ? vendorPackageOf(app.androidPackage) : "—",
          ios: app.iosBundleId ? vendorBundleIdOf(app.iosBundleId) : "—",
          onPlan: currentPlan ? hasFeature(currentPlan, "food") : false,
          firebaseAndroid: await firebaseListsVendorApp(app, preflightDeps(store)),
          builds: await store.listBuildsByApp(app.id, 20, "vendor"),
        }
      : null;
  const vendorCurrent = vendorApp?.builds[0] ?? null;
  const vendorReady = vendorApp?.builds.find((b) => b.status === "ready") ?? null;
  const vendorStalled = vendorCurrent !== null && isStalled(vendorCurrent, now);
  const vendorFileRow = (kind: ArtifactKind) => {
    const url = vendorReady?.artifacts.find((a) => a.kind === kind)?.url;
    const link = url ? fileLink(url, now) : null;
    const unavailable = fileUnavailableReason({ kind, build: vendorReady, hasAppStoreKey: keys.appStore, iosOnPlan: currentPlan ? hasFeature(currentPlan, "ios") : true, linkProblem: link?.disabledReason ?? null, planActive: state === "active", filesRemoved: Boolean(vendorReady?.release?.filesRemovedAt) });
    return { href: unavailable === null && vendorReady ? dashboardFileHref(vendorReady.id, kind) : null, unavailable: unavailable === null ? null : k(unavailable) };
  };
  // 116 A school's or academy's staff app, when the owner put the staff in an app of their own.
  const staffApp = hasStaffApp(app)
    ? {
        name: staffAppNameOf(app),
        academy: staffAppKindOf(app) === "academy",
        android: app.androidPackage ? staffPackageOf(app.androidPackage) : "—",
        ios: app.iosBundleId ? staffBundleIdOf(app.iosBundleId) : "—",
        onPlan: staffAppOnPlan(app, currentPlan),
        firebaseAndroid: await firebaseListsStaffApp(app, preflightDeps(store)),
        builds: await store.listBuildsByApp(app.id, 20, "staff"),
      }
    : null;
  const staffCurrent = staffApp?.builds[0] ?? null;
  const staffReady = staffApp?.builds.find((b) => b.status === "ready") ?? null;
  const staffStalled = staffCurrent !== null && isStalled(staffCurrent, now);
  const staffFileRow = (kind: ArtifactKind) => {
    const url = staffReady?.artifacts.find((a) => a.kind === kind)?.url;
    const link = url ? fileLink(url, now) : null;
    const unavailable = fileUnavailableReason({ kind, build: staffReady, hasAppStoreKey: keys.appStore, iosOnPlan: currentPlan ? hasFeature(currentPlan, "ios") : true, linkProblem: link?.disabledReason ?? null, planActive: state === "active", filesRemoved: Boolean(staffReady?.release?.filesRemovedAt) });
    return { href: unavailable === null && staffReady ? dashboardFileHref(staffReady.id, kind) : null, unavailable: unavailable === null ? null : k(unavailable) };
  };
  const courierCurrent = courier?.builds[0] ?? null;
  const courierReady = courier?.builds.find((b) => b.status === "ready") ?? null;
  /** The second app's words: the couriers' (104.6) or 105.2 the drivers'. */
  const ck = (key: "Title" | "Text" | "Off" | "FirebaseAndroidOk" | "FirebaseAndroidMissing" | "FirebaseIosOk" | "FirebaseIosMissing" | "Latest" | "None" | "Files"): DashKey => `builds.${courier?.role ?? "courier"}${key}`;
  const courierStalled = courierCurrent !== null && isStalled(courierCurrent, now);
  const courierFileRow = (kind: ArtifactKind) => {
    const url = courierReady?.artifacts.find((a) => a.kind === kind)?.url;
    const link = url ? fileLink(url, now) : null;
    const unavailable = fileUnavailableReason({ kind, build: courierReady, hasAppStoreKey: keys.appStore, iosOnPlan: currentPlan ? hasFeature(currentPlan, "ios") : true, linkProblem: link?.disabledReason ?? null, planActive: state === "active", filesRemoved: Boolean(courierReady?.release?.filesRemovedAt) });
    return { href: unavailable === null && courierReady ? dashboardFileHref(courierReady.id, kind) : null, unavailable: unavailable === null ? null : k(unavailable) };
  };

  // 132.141 The premium kit: the header with Start new build as its one main action; the latest build in one hero card (its
  // status, stages and its one next step: try again, or get the app); what the next build would trip over; the files as rows;
  // the second apps; the stores and guides (the guides folded); how updates are released and which versions people may use as
  // settings rows (their forms folded); then every build as a row with its own actions.
  const failed = current !== null && current.status === "failed";
  // 142 Not for a build of the iPhone app alone: its APK would be an older build's.
  const apkHref = current?.status === "ready" && current.id === lastReady?.id && buildOnly(current) !== "ios" ? fileRow("apk").href : null;
  const filesTitle = lastReady ? t("builds.filesFrom", { number: lastReady.number, version: lastReady.versionName }) : t("builds.filesLatest");
  const secondFiles = (title: string, row: (kind: ArtifactKind) => { href: string | null; unavailable: string | null }, prefix: string) => ({
    title,
    rows: (["apk", "aab", "ipa"] as const).map((kind) => (
      <DownloadRow key={kind} id={`${prefix}-${kind}`} icon={FILE_ICON[kind]} t={t} title={k(ARTIFACT_LABEL[kind])} text={k(fileDescription(kind, autoPublish))} {...row(kind)} />
    )),
  });
  // 138 On when the owner chose something other than everyone at once: a first share, internal testing, or Apple's phased release.
  const stagedOn = Boolean(app.stagedRelease?.androidPercent != null || app.stagedRelease?.androidInternal || app.stagedRelease?.iosPhased);
  const fileRows = (
    <>
      {FILES.map((file) => {
        // 202 One store row for the platform's files; the upload key stays a download.
        const platform = file.kind === "ipa" ? "ios" : "android";
        const storeHref = file.kind === "keystore" ? null : onStore[platform];
        if (storeHref) return file.kind === "aab" ? null : <StoreRow key={file.kind} platform={platform} href={storeHref} t={t} />;
        return <DownloadRow key={file.kind} id={file.kind} icon={FILE_ICON[file.kind]} t={t} title={k(ARTIFACT_LABEL[file.kind])} text={k(fileDescription(file.kind, autoPublish))} highlight={file.highlight} {...fileRow(file.kind)} />;
      })}
      {plugin ? (
        <DownloadRow
          id="plugin"
          icon={FILE_ICON.plugin}
          t={t}
          title={t("builds.plugin")}
          text={release ? t("builds.pluginVersion", { version: release.version }) : t("builds.pluginKey")}
          href={release && state === "active" ? "/api/dashboard/plugin" : null}
          unavailable={!release ? t("builds.noRelease") : t("builds.pluginActive")}
        />
      ) : null}
      {onStore.android ? null : (
        <DownloadRow id="store_assets" icon={FILE_ICON.store_assets} t={t} title={k(ARTIFACT_LABEL.store_assets)} text={k(fileDescription("store_assets", autoPublish))} {...fileRow("store_assets")} />
      )}
    </>
  );
  return (
    <KitPage>
      <KitHeader
        icon="build"
        title={t("builds.title")}
        description={t("builds.intro", { app: appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app), plan: plan ? k(planName(plan, plans)) : t("overview.noPlan") })}
        actions={
          <div className="flex items-start gap-2 max-sm:w-full">
            <StartBuildForm suggestedVersion={suggestedVersion(current)} disabledReason={disabledReason} split={iosBuildAvailable(app, currentPlan)} />
            {/* Level with the button, under the field's label. */}
            <div className="pt-6">
              <KitMore label={t("studioPage.more")}>
                <Link href="/dashboard/publishing" className={kit.menuItem}>
                  <Icon name="publish" size={18} />
                  {t("builds.publishing")}
                </Link>
                <a href="#h-guides" className={kit.menuItem}>
                  <Icon name="menu_book" size={18} />
                  {t("builds.guides")}
                </a>
              </KitMore>
            </div>
          </div>
        }
      />
      {/* 110.2 Sample entries left: nothing goes to the stores. */}
      <SamplesStoreNotice app={app} />
      {/* 112.3 The customers' app and the couriers' (drivers') app. */}
      {twoApps ? <TwoApps text={text} data={twoApps} href={inFrame} /> : null}

      {started === "auto" ? (
        <KitCallout tone="success" icon="check_circle" role="status">
          {t("builds.autoQueued")}
        </KitCallout>
      ) : started ? (
        <KitCallout tone="success" icon="check_circle" role="status">
          {t("builds.firstQueued")}
        </KitCallout>
      ) : null}

      {/* 87.4 The automatic build of the latest saves, and when it starts. */}
      {app.autoBuildDueAt && app.autoBuildDueAt > now && !running ? (
        <KitCallout icon="schedule" role="status">
          {t("builds.autoWaiting", { time: formatDateTime(app.autoBuildDueAt, lang) })}
        </KitCallout>
      ) : null}

      {typeof queued === "string" && /^\d+$/.test(queued) ? (
        <KitCallout tone="success" icon="check_circle" role="status">
          {t("builds.buildQueued", { number: queued })}
          {/* 89.3 Gone back to an earlier build. */}
          {typeof back === "string" && /^\d+$/.test(back) ? ` ${t(pages ? "builds.wentBackPages" : "builds.wentBack", { number: back })}` : ""}
        </KitCallout>
      ) : null}

      {apiProblem ? (
        <KitCallout tone="warn" icon="warning">
          {richText(t("builds.apiProblem", { body: k(apiProblem.body) }), { link: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })}
        </KitCallout>
      ) : null}

      {download === "unavailable" ? (
        <KitCallout tone="warn" icon="warning" role="alert">
          {richText(t("builds.unavailable"), wa)}
        </KitCallout>
      ) : null}
      {/* 187 No plan, no app to download. */}
      {download === "plan" ? (
        <KitCallout tone="warn" icon="lock" role="alert">
          {richText(t("builds.needsPlan"), { plan: (chunk) => <Link href="/dashboard/license#change-plan">{chunk}</Link> })}
        </KitCallout>
      ) : null}

      {state === "expired" ? (
        <KitCallout tone="warn" icon="warning">
          {richText(t("builds.expiredNotice", { date: formatDate(license?.expiresAt, lang), page: licenseName }), {
            ...wa,
            renew: (chunk) => <Link href="/dashboard/license#renew">{chunk}</Link>,
          })}
        </KitCallout>
      ) : state === "suspended" ? (
        <KitCallout tone="warn" icon="warning">
          {t("builds.suspendedNotice")}
        </KitCallout>
      ) : null}

      {!setupDone ? (
        <KitCallout
          icon="info"
          action={
            <Link href={`/dashboard/setup?step=${nextStep(app, plan, effective) ?? "website"}`} className={kit.quiet}>
              {t("builds.continueSetup")}
            </Link>
          }
        >
          {t("builds.firstBuildWhen")}
        </KitCallout>
      ) : null}

      {current ? (
        // The heading's grandparent holds the status pill (tests read it from there).
        <KitHero
          titleId="h-current"
          status={
            <>
              <span className="text-[13px] font-semibold text-(--sp-muted)">
                {twoApps ? `${t(twoApps.role === "driver" ? "builds.ridersApp" : "builds.customersApp")} · ` : null}
                {t("builds.latestBuild")}
              </span>
              <BuildPill build={current} text={text} />
            </>
          }
          title={t("builds.buildTitle", { number: current.number, version: current.versionName })}
          description={
            <span className="flex flex-col gap-1.5">
              <span>{t("builds.versionCode", { code: current.versionCode })}</span>
              <Times build={current} now={now} text={text} />
            </span>
          }
          next={
            (failed || stalled) && !licenseProblem && setupDone ? (
              <KitNext icon="refresh" tone="warn" action={<RetryBuildForm versionName={current.versionName} only={buildOnly(current)} />}>
                {t("builds.retryLine")}
              </KitNext>
            ) : current.status === "ready" && onStore.android && readyFor("apk")?.id === current.id ? (
              // 202 On Google Play, where the app is live: its page in place of the APK.
              <KitNext
                icon="storefront"
                tone="success"
                action={
                  <a href={onStore.android} target="_blank" rel="noopener noreferrer" className={kit.quiet}>
                    <Icon name="open_in_new" size={18} />
                    {t("builds.openStore", { store: "Google Play" })}
                  </a>
                }
              >
                {t("builds.onGooglePlay")}
              </KitNext>
            ) : apkHref ? (
              <KitNext
                icon="task_alt"
                tone="success"
                action={
                  <a href={apkHref} className={kit.quiet}>
                    <Icon name="download" size={18} />
                    {t("builds.getApk")}
                  </a>
                }
              >
                {k(fileDescription("apk", autoPublish))}
              </KitNext>
            ) : current.status === "ready" ? (
              <KitNext
                icon="task_alt"
                tone="success"
                action={
                  <Link href="/dashboard/publishing" className={kit.quiet}>
                    <Icon name="publish" size={18} />
                    {t("builds.publishing")}
                  </Link>
                }
              >
                {t("builds.publishingText")}
              </KitNext>
            ) : undefined
          }
        >
          <BuildStages stages={current.stages} lang={lang} look="pills" />
          {/* 138 Sent to App Review by the platform, or why not yet. */}
          <AppReviewLine build={current} text={text} />
          {current.status === "queued" || current.status === "building" ? (
            stalled ? (
              <KitCallout tone="warn" icon="hourglass_top">
                {k(statusExplanation(current, now))}
              </KitCallout>
            ) : (
              <p className="m-0 text-sm text-(--sp-muted)">{k(statusExplanation(current, now))}</p>
            )
          ) : null}
          {current.status === "ready" && current.message ? (
            <KitCallout tone={Object.values(current.stages).includes("failed") ? "warn" : "info"} icon={Object.values(current.stages).includes("failed") ? "warning" : "info"}>
              {k(current.message)}
            </KitCallout>
          ) : null}
          {/* 151 GitHub had no Mac for the iPhone app: on our side, said without technical words; tried again only when the owner chooses. */}
          {failed && noMacRunner(current) ? (
            <KitCallout tone="warn" icon="schedule" data-no-mac="">
              {k(failureReason(current))}
            </KitCallout>
          ) : failed ? (
            <KitCallout tone="danger" icon="error">
              {richText(t("builds.failedNotice", { reason: k(failureReason(current)) }), { b: (chunk) => <span className="font-semibold">{chunk}</span> })}
            </KitCallout>
          ) : null}
          {/* 87.2 The cause of a store upload that didn't work on a ready build, and where to fix it; 151 the iPhone app not built, with iPhone only. */}
          {current.status === "ready" && failureExplanation(current) ? (
            <KitCallout
              tone="warn"
              icon={noMacRunner(current) ? "schedule" : "info"}
              action={
                iphoneOnlyAgain(current, { canStart: !disabledReason, iosAvailable: iosBuildAvailable(app, currentPlan) }) ? (
                  <RetryBuildForm versionName={current.versionName} only="ios" iphoneOnly />
                ) : undefined
              }
            >
              <span {...(noMacRunner(current) ? { "data-no-mac": "" } : {})}>{k(failureExplanation(current)!.text)}</span>
            </KitCallout>
          ) : null}
          {failureExplanation(current)?.link ? (
            <Link href={failureExplanation(current)!.link!} className={`${kit.quiet} self-start`} data-failure-link>
              {t("builds.checksFix")}
            </Link>
          ) : null}
          {/* 87.2 What the build printed, without its secrets: the client may read it; 151 not the iPhone app's (Xcode's words: the admin has them). */}
          {clientSeesFailureLog(current) && current.failure?.log ? (
            <KitFold summary={t("builds.failureLog")} icon="code" data-failure-log="">
              <p className="m-0 text-xs text-(--sp-muted)">{t("builds.failureLogText")}</p>
              <pre dir="ltr" className="m-0 max-h-[360px] overflow-auto rounded-xl bg-midnight p-3 text-xs leading-relaxed whitespace-pre-wrap text-white">
                {current.failure.log}
              </pre>
            </KitFold>
          ) : null}
        </KitHero>
      ) : setupDone && !licenseProblem ? (
        <div className={kit.card}>
          <KitEmpty icon="build" title={t("builds.noBuilds")}>
            {t("builds.noBuildsText")}
          </KitEmpty>
        </div>
      ) : null}

      {checks.length > 0 ? (
        <KitSection id="checks" titleId="h-checks" title={t("builds.checksTitle")} help={t("builds.checksText")} helpLabel={t("studioPage.helpSection")} flush>
          <KitList>
            {checks.map((check) => (
              <KitRow
                key={check.key}
                data-check={check.key}
                media={
                  <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${check.level === "error" ? "bg-danger-bg text-danger" : "bg-(--sp-tile) text-(--sp-muted)"}`}>
                    <Icon name={check.level === "error" ? "error" : "info"} size={20} />
                  </span>
                }
                title={<span className="text-sm font-normal">{k(renderCheck(check))}</span>}
                badges={check.level === "warning" ? <KitStatus tone="neutral">{t("builds.checksWarning")}</KitStatus> : null}
                actions={
                  <Link href={check.link} className={kit.row}>
                    {t("builds.checksFix")}
                  </Link>
                }
              />
            ))}
          </KitList>
        </KitSection>
      ) : null}

      {/* 132.172 The builds as a table (the version, the platforms, when, the state); a build's details, its stages, what went
          wrong and its log, and making it again, in the inspector. */}
      {builds.length ? (
        <KitTable
          label={t("builds.history")}
          title={t("builds.history")}
          titleId="h-history"
          toolbar={<span className="text-[13px] text-(--sp-muted)">{t("builds.historyText")}</span>}
          columns={[
            { label: t("builds.colVersion"), width: "minmax(0,1fr)" },
            { label: t("builds.colPlatform"), width: "150px", wide: true },
            { label: t("builds.queued"), width: "170px", phone: "sub" },
            { label: t("builds.colState"), width: "140px", phone: "end" },
          ]}
          rows={builds.map((build) => {
            const platforms = (["android", "ios"] as const).filter((key) => build.stages[key] && build.stages[key] !== "skipped");
            const remake = build.status === "ready" && build.sourceCommit && !licenseProblem && !running;
            return {
              id: build.id,
              name: `#${build.number} · ${build.versionName}`,
              data: { "data-build": String(build.number) },
              cells: [
                <span key="name" className="contents">
                  <KitThumb icon={build.status === "ready" ? "task_alt" : build.status === "failed" ? "error" : "schedule"} size={40} />
                  <span className="min-w-0 truncate text-[14.5px] font-bold">
                    #{build.number} · <bdi dir="ltr">{build.versionName}</bdi> <span className="text-[13px] font-normal text-(--sp-muted)">({build.versionCode})</span>
                  </span>
                </span>,
                <span key="platforms" className="flex items-center gap-1.5 text-(--sp-ink-2)">
                  {platforms.map((key) => (
                    <span key={key} className="inline-flex items-center gap-1">
                      <Icon name={key === "android" ? "android" : "phone_iphone"} size={17} className="text-(--sp-muted)" />
                      {key === "android" ? "Android" : "iOS"}
                    </span>
                  ))}
                </span>,
                formatDateTime(build.createdAt, lang),
                <BuildPill key="state" build={build} text={text} />,
              ],
              inspector: {
                title: t("builds.colVersion"),
                // 87.3 A ready build made from known code can be made again as it was; 89.3 an earlier one gone back to.
                footer: remake ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <RebuildForm buildId={build.id} number={build.number} />
                    {build.id !== builds[0]?.id ? <GoBackForm buildId={build.id} number={build.number} /> : null}
                  </div>
                ) : undefined,
                body: (
                  <KitInspectorBody data-inspector-build={String(build.number)}>
                    <KitInspectorHead badges={<BuildPill build={build} text={text} />} title={t("builds.buildTitle", { number: build.number, version: build.versionName })} line={t("builds.versionCode", { code: build.versionCode })} />
                    <Times build={build} now={now} text={text} />
                    <BuildStages stages={build.stages} lang={lang} look="pills" />
                    {build.status === "queued" || build.status === "building" ? <p className="m-0 text-sm text-(--sp-muted)">{k(statusExplanation(build, now))}</p> : null}
                    {build.status === "failed" ? (
                      <KitCallout tone={noMacRunner(build) ? "warn" : "danger"} icon={noMacRunner(build) ? "schedule" : "error"}>
                        {k(failureReason(build))}
                      </KitCallout>
                    ) : null}
                    {build.status === "ready" && build.message ? (
                      <KitCallout tone={Object.values(build.stages).includes("failed") ? "warn" : "info"} icon="info">
                        {k(build.message)}
                      </KitCallout>
                    ) : null}
                    {/* 151 Why a part of a ready build didn't work, as on the latest build. */}
                    {build.status === "ready" && failureExplanation(build) ? (
                      <KitCallout tone="warn" icon={noMacRunner(build) ? "schedule" : "info"}>
                        {k(failureExplanation(build)!.text)}
                      </KitCallout>
                    ) : null}
                    {build.rebuildOf ? <p className="m-0 text-[13px] text-(--sp-muted)">{t("builds.rebuildOf", { number: build.rebuildOf })}</p> : null}
                    {/* 202 Its folder left the files host. */}
                    {build.release?.filesRemovedAt ? (
                      <p className="m-0 flex items-center gap-1.5 text-[13px] text-(--sp-muted)" data-files-removed="">
                        <Icon name="cloud_off" size={16} />
                        {t("builds.filesRemoved", { date: formatDateTime(new Date(build.release.filesRemovedAt), lang) })}
                      </p>
                    ) : null}
                    {clientSeesFailureLog(build) && build.failure?.log ? (
                      <KitFold summary={t("builds.failureLog")} icon="code">
                        <p className="m-0 text-xs text-(--sp-muted)">{t("builds.failureLogText")}</p>
                        <pre dir="ltr" className="m-0 max-h-[320px] overflow-auto rounded-xl bg-midnight p-3 text-xs leading-relaxed whitespace-pre-wrap text-white">
                          {build.failure.log}
                        </pre>
                      </KitFold>
                    ) : null}
                    {build.id === lastReady?.id ? (
                      <a href="#files" className={`${kit.quiet} self-start`}>
                        <Icon name="download" size={18} />
                        {filesTitle}
                      </a>
                    ) : null}
                  </KitInspectorBody>
                ),
              },
            };
          })}
        />
      ) : null}

      {/* The files of the latest ready build; 132.172 folded until a build is ready. */}
      {lastReady ? (
        <KitSection titleId="h-files" id="files" title={filesTitle} description={t("builds.filesFinished", { date: formatDateTime(lastReady.finishedAt ?? lastReady.updatedAt, lang) })} flush>
          <ul className="m-0 flex list-none flex-col px-2 sm:px-4">{fileRows}</ul>
        </KitSection>
      ) : (
        <div id="files" className="scroll-mt-6">
          <KitFold summary={filesTitle} icon="download">
            <p className="m-0 text-[13.5px] text-(--sp-muted)">{t("builds.filesAppear")}</p>
            <ul className="m-0 flex list-none flex-col rounded-xl border border-(--sp-line) bg-(--sp-surface) p-0">{fileRows}</ul>
          </KitFold>
        </div>
      )}

      {courier ? (
        // 105.2 A ride company's second app is its drivers'.
        <SecondApp
          kind="courier"
          id="courier-app"
          titleId="h-courier-app"
          title={t(ck("Title"))}
          description={t(ck("Text"), { name: courier.name, android: courier.android, ios: courier.ios })}
          off={!courier.onPlan ? t(ck("Off")) : null}
          firebase={[
            { store: "android", ok: courier.firebaseAndroid, text: courier.firebaseAndroid ? t(ck("FirebaseAndroidOk")) : t(ck("FirebaseAndroidMissing"), { android: courier.android }) },
            { store: "ios", ok: courier.firebaseIos, text: courier.firebaseIos ? t(ck("FirebaseIosOk")) : t(ck("FirebaseIosMissing")) },
          ]}
          start={<StartBuildForm courier driver={courier.role === "driver"} suggestedVersion={suggestedVersion(courierCurrent)} disabledReason={disabledReason ?? (!courier.onPlan ? t(ck("Off")) : null)} />}
          latest={courierCurrent}
          latestLabel={t(ck("Latest"))}
          none={t(ck("None"))}
          retry={courierCurrent && (courierCurrent.status === "failed" || courierStalled) && !licenseProblem && setupDone && courier.onPlan ? <RetryBuildForm courier versionName={courierCurrent.versionName} /> : null}
          files={courierReady ? secondFiles(t(ck("Files")), courierFileRow, "courier") : null}
          now={now}
          text={text}
        />
      ) : null}

      {vendorApp ? (
        <SecondApp
          kind="vendor"
          id="vendor-app"
          titleId="h-vendor-app"
          title={t("builds.vendorTitle")}
          description={t("builds.vendorText", { name: vendorApp.name, android: vendorApp.android, ios: vendorApp.ios })}
          off={!vendorApp.onPlan ? t("builds.vendorOff") : null}
          firebase={[
            { store: "android", ok: vendorApp.firebaseAndroid, text: vendorApp.firebaseAndroid ? t("builds.vendorFirebaseAndroidOk") : t("builds.vendorFirebaseAndroidMissing", { android: vendorApp.android }) },
            { store: "ios", ok: false, text: t("builds.vendorIos") },
          ]}
          start={<StartBuildForm vendor suggestedVersion={suggestedVersion(vendorCurrent)} disabledReason={disabledReason ?? (!vendorApp.onPlan ? t("builds.vendorOff") : null)} />}
          latest={vendorCurrent}
          latestLabel={t("builds.vendorLatest")}
          none={t("builds.vendorNone")}
          retry={vendorCurrent && (vendorCurrent.status === "failed" || vendorStalled) && !licenseProblem && setupDone && vendorApp.onPlan ? <RetryBuildForm vendor versionName={vendorCurrent.versionName} /> : null}
          files={vendorReady ? secondFiles(t("builds.vendorFiles"), vendorFileRow, "vendor") : null}
          now={now}
          text={text}
        />
      ) : null}

      {staffApp ? (
        <SecondApp
          kind="staff"
          id="staff-app"
          titleId="h-staff-app"
          title={t("builds.staffTitle")}
          description={t(staffApp.academy ? "builds.staffTextAcademy" : "builds.staffText", { name: staffApp.name, android: staffApp.android, ios: staffApp.ios })}
          off={!staffApp.onPlan ? t("builds.staffOff") : null}
          firebase={[
            { store: "android", ok: staffApp.firebaseAndroid, text: staffApp.firebaseAndroid ? t("builds.staffFirebaseAndroidOk") : t("builds.staffFirebaseAndroidMissing", { android: staffApp.android }) },
            { store: "ios", ok: false, text: t("builds.staffIos") },
          ]}
          start={<StartBuildForm staff suggestedVersion={suggestedVersion(staffCurrent)} disabledReason={disabledReason ?? (!staffApp.onPlan ? t("builds.staffOff") : null)} />}
          latest={staffCurrent}
          latestLabel={t("builds.staffLatest")}
          none={t("builds.staffNone")}
          retry={staffCurrent && (staffCurrent.status === "failed" || staffStalled) && !licenseProblem && setupDone && staffApp.onPlan ? <RetryBuildForm staff versionName={staffCurrent.versionName} /> : null}
          files={staffReady ? secondFiles(t("builds.staffFiles"), staffFileRow, "staff") : null}
          now={now}
          text={text}
        />
      ) : null}

      <KitSettings label={t("builds.settings")}>
        {/* 89.2 Staged releases; 138 everyone at once on Google Play unless the owner chooses. */}
        {autoPublish ? (
          <KitSettingRow
            titleId="h-staged"
            icon="rocket_launch"
            title={t("builds.stagedTitle")}
            status={<KitStatus tone={stagedOn ? "success" : "neutral"}>{stagedOn ? t("common.on") : t("common.off")}</KitStatus>}
            help={t("builds.stagedText")}
            helpLabel={t("studioPage.helpSection")}
          >
            <p className="m-0 text-sm leading-relaxed text-(--sp-muted)" data-release-default="">
              {t("builds.stagedDefault")}
            </p>
            {app.rollout?.android && app.rollout.android.status !== "completed" ? (
              <div className="flex flex-col gap-2 rounded-2xl bg-(--sp-soft) p-4" data-rollout="android">
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
              <div className="flex flex-col gap-2 rounded-2xl bg-(--sp-soft) p-4" data-rollout="ios">
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
            <KitFold summary={t("common.edit")} icon="tune">
              <StagedReleaseForm
                current={{
                  androidPercent: app.stagedRelease?.androidInternal ? "internal" : app.stagedRelease?.androidPercent == null ? "" : String(app.stagedRelease.androidPercent),
                  iosPhased: Boolean(app.stagedRelease?.iosPhased),
                }}
                shares={[...FIRST_SHARES]}
              />
            </KitFold>
          </KitSettingRow>
        ) : null}

        {/* 89.1 Which versions people may still use; 89.3 the versions people use, from the app's statistics. */}
        <KitSettingRow
          titleId="h-versions"
          icon="smartphone"
          title={t("builds.versionsTitle")}
          status={
            app.minVersion ? (
              <KitStatus tone="info">
                {t("builds.minVersion")} <bdi dir="ltr">{app.minVersion}</bdi>
              </KitStatus>
            ) : (
              <KitStatus tone="neutral">{t("studioPage.notSet")}</KitStatus>
            )
          }
          help={t("builds.versionsText")}
          helpLabel={t("studioPage.helpSection")}
        >
          {inUse.length > 0 ? (
            <KitFold summary={t("builds.inUse")} icon="smartphone">
              <table className="w-full max-w-[520px] border-collapse text-sm" aria-label={t("builds.inUse")}>
                <caption className="sr-only">{t("builds.inUse")}</caption>
                <thead>
                  <tr className="text-(--sp-muted)">
                    <th scope="col" className="py-1.5 pe-4 text-start font-semibold">
                      {t("builds.colVersion")}
                    </th>
                    <th scope="col" className="py-1.5 pe-4 text-start font-semibold">
                      {t("builds.inUsePhones")}
                    </th>
                    <th scope="col" className="py-1.5 text-start font-semibold">
                      {t("builds.inUseShare")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inUse.map((row) => (
                    <tr key={row.version} className="border-t border-(--sp-line-soft)" data-version={row.version}>
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
            </KitFold>
          ) : (
            <p className="m-0 text-sm text-(--sp-muted)">{t("builds.inUseNone")}</p>
          )}
          <KitFold summary={t("common.edit")} icon="tune">
            <VersionsForm current={{ minVersion: app.minVersion ?? "", recommendedVersion: app.recommendedVersion ?? "" }} />
          </KitFold>
        </KitSettingRow>

        {/* 13.1 Automatic rebuilds: a plan that has them. */}
        {currentPlan && !hasFeature(currentPlan, "auto_rebuild") && builds.length > 0 ? (
          <KitSettingRow
            titleId="h-auto-rebuilds"
            icon="refresh"
            title={t("builds.autoRebuilds")}
            status={<KitStatus tone="neutral">{t("common.off")}</KitStatus>}
            description={t("builds.autoRebuildsText")}
            action={
              autoRebuildTo ? (
                <Link href={upgradeHref(autoRebuildTo.id)} className={kit.quiet} data-upgrade-hint="">
                  <Icon name="upgrade" size={18} />
                  {t("overview.upgradeTo", { plan: autoRebuildTo.name })}
                </Link>
              ) : null
            }
          />
        ) : null}
      </KitSettings>

      {/* The step-by-step guides for each store, and 31 Apple's rules for what this app sells (nothing for apps that sell nothing), folded. */}
      <div id="h-guides" className="flex scroll-mt-6 flex-col gap-2">
        <h2 className="m-0 px-1 text-[13px] font-bold text-(--sp-muted)">{t("builds.stores")}</h2>
        <KitFold summary={t("builds.guides")} icon="menu_book">
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {(
              [
                ["/docs/google-play", "builds.guideGoogle"],
                ["/docs/app-store", "builds.guideApple"],
                ["/docs/galaxy-store", "builds.guideGalaxy"],
                ["/docs/huawei-appgallery", "builds.guideHuawei"],
                ["/docs/xiaomi-getapps", "builds.guideXiaomi"],
              ] as const
            ).map(([href, label]) => (
              <li key={href}>
                <Link href={localePath(lang, href)} className="flex items-center gap-3 rounded-xl px-2 py-2 font-semibold text-(--sp-ink) no-underline hover:bg-(--sp-tile) hover:text-(--sp-ink)">
                  <Icon name="menu_book" size={18} className="text-(--sp-muted)" />
                  <span className="min-w-0 flex-1">
                    {t(label)}
                    <span className="block text-[13px] font-normal text-(--sp-muted)">{t("builds.stepByStep")}</span>
                  </span>
                  <Icon name="chevron_right" size={18} className="text-(--sp-muted)" />
                </Link>
              </li>
            ))}
          </ul>
        </KitFold>
        {wordsOf(app).iphone ? (
          <KitFold summary={t("builds.iphoneRules")} icon="phone_iphone">
            <p className="m-0">{k(wordsOf(app).iphone!)}</p>
          </KitFold>
        ) : null}
      </div>
    </KitPage>
  );
}

/** 138 Where the iPhone version stands with App Review: sent (and when), or what it waits for, in plain words. */
function AppReviewLine({ build, text }: { build: Build; text: Awaited<ReturnType<typeof dashboardText>> }) {
  const { t, k, lang } = text;
  const stage = build.stages.app_review;
  const state = build.release?.appReview ?? null;
  if (build.status !== "ready" || !stage || stage === "skipped" || build.stages.upload_testflight !== "done") return null;
  if (stage === "done" && state?.submittedAt) {
    return (
      <KitCallout tone="success" icon="send" role="status">
        <span data-app-review="submitted">{t(build.release?.iosPhased ? "builds.appReviewSentPhased" : "builds.appReviewSent", { date: formatDateTime(new Date(state.submittedAt), lang) })}</span>
      </KitCallout>
    );
  }
  if (stage !== "pending") return null;
  const reason = state?.reason ?? "processing";
  const blocked = state?.state === "blocked";
  return (
    <KitCallout tone={blocked ? "warn" : "info"} icon={blocked ? "warning" : "schedule"}>
      <span data-app-review={blocked ? `blocked:${reason}` : `waiting:${reason}`}>
        {k(APP_REVIEW_TEXT[reason])}
        {blocked && state?.detail ? ` ${t("builds.appReviewDetail", { detail: state.detail })}` : ""}
      </span>
    </KitCallout>
  );
}
