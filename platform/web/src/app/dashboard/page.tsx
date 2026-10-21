/* eslint-disable @next/next/no-img-element -- the app icon is a small uploaded PNG served by our own route. */
import { plansIn } from "@/lib/marketing-lang";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BuildBadge } from "@/components/build-status";
import { AppStateBadge, LinkCard } from "@/components/dashboard";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { Badge, Notice, PageHeader, ProgressBar, btn } from "@/components/ui";
import { richText } from "@/i18n/rich";
import { kindOf, wordsOf } from "@/lib/app/kinds";
import { siteMatch, siteRunsLine } from "@/lib/app/site-match";
import { SETUP_STEPS, STEP_LABEL, nextStep, stepStatus, type SetupStep } from "@/lib/app/setup";
import { contextCan, requireClient, type ClientContext } from "@/lib/auth/session";
import { contentNavOf } from "@/lib/app/kinds";
import { pathPermission } from "@/lib/team/permissions";
import type { DashKey } from "@/i18n/dashboard";
import { getStore } from "@/lib/data";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";
import { daysUntil } from "@/lib/license/status";
import { hasFeature, lowestPlanWith, planFeaturesFor, planName } from "@/lib/plans";
import { OwnerNotices } from "@/components/owner-notices";
import { TwoStepRecommendation } from "@/components/two-step-settings";
import { UpgradeHint, UsageMeter, upgradeHref } from "@/components/upgrade";
import { currentPlanId, scheduledPlan } from "@/lib/billing/plan-change";
import { effectivePlans } from "@/lib/entitlements";
import { getPlans } from "@/lib/settings/platform";
import { getContact } from "@/lib/contact";
import { AnnouncementBanner } from "@/components/announcements";
import { appLabel, licensePageName, usesPlugin } from "@/lib/app/label";
import { isInProgress, statusExplanation } from "@/lib/builds/view";
import { dashboardFileHref, fileLink } from "@/lib/files";
import { CLIENT_STATUS_LABEL, isLiveSomewhere, requestStores, statusTone, STORE_ICON, STORE_TITLE, trackOf } from "@/lib/publishing/steps";
import type { App } from "@/lib/data/types";
import { paymentsSetUp } from "@/lib/catalog/settings";
import { stabilityOf } from "@/lib/crashes/service";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("overview.title") };
}

/** One card of the overview: a small heading, what it says, and its links at the bottom. */
function Tile({ id, title, icon, children, actions }: { id: string; title: string; icon: IconName; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3.5 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id={id} className="m-0 flex items-center gap-2 text-[15px] font-bold text-muted">
        <Icon name={icon} size={20} />
        {title}
      </h2>
      <div className="flex flex-1 flex-col gap-2">{children}</div>
      {actions ? <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div> : null}
    </section>
  );
}

/** Where a setup step is edited. */
function stepHref(step: SetupStep): string {
  return step === "app-type" ? "/dashboard/app-type" : `/dashboard/setup?step=${step}`;
}

/** The shortcuts that fit the app: its content, its users, its files and help. */
function shortcuts(app: App, whatsappUrl: string, { t }: DashboardText): { href: string; icon: IconName; title: string; text: string; external?: boolean }[] {
  const content: Record<string, { href: string; icon: IconName; title: string; text: string }> = {
    catalog: { href: "/dashboard/catalog/new", icon: "inventory_2", title: t("overview.addProduct"), text: t("overview.addProductText") },
    courses: { href: "/dashboard/courses", icon: "school", title: t("overview.addCourse"), text: t("overview.addCourseText") },
    bookings: { href: "/dashboard/services", icon: "groups", title: t("overview.addService"), text: t("overview.addServiceText") },
    listings: { href: "/dashboard/listings/new", icon: "home_work", title: t("overview.addProperty"), text: t("overview.addPropertyText") },
  };
  return [
    { href: "/dashboard/pages", icon: "palette", title: t("overview.editPages"), text: t("overview.editPagesText") },
    ...(app.connector && content[app.connector.kind] ? [content[app.connector.kind]!] : []),
    ...(app.backend === "hosted" ? [{ href: "/dashboard/notifications", icon: "notifications" as const, title: t("overview.sendNotification"), text: t("overview.sendNotificationText") }] : []),
    { href: "/dashboard/builds", icon: "download", title: t("overview.getFiles"), text: t("overview.getFilesText") },
    { href: whatsappUrl, icon: "support_agent", title: t("overview.getHelp"), text: t("overview.getHelpText"), external: true },
  ];
}

/**
 * 60 The overview of someone on the team without the app's settings (Staff):
 * who they are here, why they came back from a page (`denied`), the updates
 * banner, and links to what they work on in the current app.
 */
async function MemberOverview({ context, denied }: { context: ClientContext; denied: boolean }) {
  const { t, k } = await dashboardText();
  const { app } = context;
  const me = context.member ?? context.user;
  const business = context.apps[0] ? appLabel(context.apps[0]) : context.user.name;
  const content = app ? (contentNavOf(app)?.items ?? []).map((item) => ({ ...item, label: k(item.label) })) : [];
  const general = [
    { href: "/dashboard/media", label: t("nav.media"), icon: "photo_library" as const },
    { href: "/dashboard/analytics", label: t("nav.analytics"), icon: "monitoring" as const },
    ...(app?.backend === "hosted" ? [{ href: "/dashboard/notifications", label: t("nav.appNotifications"), icon: "notifications" as const }] : []),
    { href: "/dashboard/preview", label: t("nav.preview"), icon: "visibility" as const },
  ];
  const links = app ? [...content, ...general].filter((item, i, all) => all.findIndex((x) => x.href === item.href) === i && contextCan(context, pathPermission(item.href))) : [];
  return (
    <>
      <PageHeader
        title={t("overview.hello", { name: me.name.split(" ")[0] ?? "" })}
        description={t("team.memberOf", { role: t(`team.roles.${context.access.role}` as DashKey), business: business === "Untitled app" ? k(business) : business })}
      />
      {denied ? (
        <Notice tone="warn" icon="lock" role="status">
          {t("team.denied")}
        </Notice>
      ) : null}
      <AnnouncementBanner context={context} />
      <TwoStepRecommendation person={me} staff={context.staff !== null} t={t} />
      {links.length ? (
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3" data-testid="member-links">
          {links.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-white px-5 py-4 font-semibold text-ink no-underline hover:border-line-strong">
                <Icon name={item.icon} size={22} className="text-accent" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Notice icon="info">{t("team.denied")}</Notice>
      )}
    </>
  );
}

export default async function OverviewPage({ searchParams }: PageProps<"/dashboard">) {
  const contact = await getContact();
  const context = await requireClient("dashboard");
  const { user, app, license, state } = context;
  // 60 A page their role doesn't have sent them here.
  const denied = typeof (await searchParams).denied === "string";
  if (!contextCan(context, "settings") || (!app && !contextCan(context, "apps"))) return <MemberOverview context={context} denied={denied} />;
  if (!app) redirect("/dashboard/app-type");
  const canBilling = contextCan(context, "billing");
  const text = await dashboardText();
  const { t, k, lang, date, num } = text;
  const store = await getStore();
  const plans = plansIn(text.lang, await getPlans(store));
  const now = new Date();
  // 13.1 The app's plan as it is now, with what it includes.
  const effective = plansIn(text.lang, await effectivePlans(store));
  const plan = license ? currentPlanId(license, now) : null;
  const current = plan ? effective[plan] : null;
  const scheduled = scheduledPlan(license, now);
  const builds = await store.listBuildsByApp(app.id, 10);
  const latest = builds[0] ?? null;
  const lastReady = builds.find((b) => b.status === "ready") ?? null;
  // 46 Crash-free sessions and the top crashes, once a build is ready.
  const stability = lastReady ? await stabilityOf(store, app.id, now) : null;
  const publishing = app.publishingMode === "managed" ? await store.getPublishingRequest(app.id) : null;
  const plugin = usesPlugin(app);
  const activation = license && plugin ? await store.getActivation(license.id) : null;
  // 30 What the WordPress site runs, and whether the app's type can show it.
  const site = activation && app.backend === "wordpress" ? siteMatch(app, activation) : null;
  const status = stepStatus(app, plan, effective);
  // 19 "Publish it for me" until a store is live: the Publishing step is done, our team isn't yet.
  const teamOnIt = publishing !== null && status.publishing && !isLiveSomewhere(publishing);
  const done = SETUP_STEPS.filter((step) => status[step]).length;
  const next = nextStep(app, plan, effective);
  const daysLeft = license ? daysUntil(license.expiresAt, now) : 0;
  // 31 The plan's features in the words of what this app sells.
  const features = planFeaturesFor(wordsOf(app).cardPayments);
  // 13.2 App users count on the hosted API only: a WordPress site keeps its own users.
  const hosted = app.backend === "hosted";
  const users = hosted ? await store.countHostedUsers(app.id) : 0;
  const userLimit = current?.limits.appUsers ?? null;
  const moreUsers = current ? lowestPlanWith(effective, (p) => p.limits.appUsers === null || (userLimit !== null && p.limits.appUsers > userLimit), plan) : null;
  // 60 As the bell: notices for whoever may change settings, of the apps they may use.
  const notices = contextCan(context, "settings")
    ? (await store.listOwnerNotices({ clientId: context.client.id, open: true, limit: 50 })).filter((n) => context.apps.some((a) => a.id === n.appId)).slice(0, 10)
    : [];
  const licenseName = k(licensePageName(app));
  const name = appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app);
  const step = (s: SetupStep) => k(STEP_LABEL[s]);

  // The latest Android APK, to try the app at once (signed when clicked, like on Builds & downloads).
  const apk = lastReady?.artifacts.find((a) => a.kind === "apk");
  const apkHref = lastReady && apk && fileLink(apk.url, now).disabledReason === null ? dashboardFileHref(lastReady.id, "apk") : null;
  const building = isInProgress(latest, now);

  // The one thing to do next, as the main button of the app card.
  const primary =
    state === "expired" && canBilling
      ? { href: "/dashboard/license#renew", label: t("overview.renewByCard"), icon: "refresh" as const }
      : next
        ? { href: stepHref(next === "app-type" ? "website" : next), label: t("overview.continueStep", { step: step(next === "app-type" ? "website" : next) }), icon: "arrow_forward" as const }
        : state === "pending" && canBilling
          ? { href: "/dashboard/license", label: t("overview.activate"), icon: "key" as const }
          : !latest
            ? { href: "/dashboard/builds", label: t("overview.firstBuild"), icon: "build" as const }
            : !app.publishingMode
              ? { href: "/dashboard/publishing", label: t("overview.choosePublish"), icon: "publish" as const }
              : { href: "/dashboard/pages", label: t("overview.editPages"), icon: "palette" as const };

  // The links inside the notices.
  const links = {
    license: (chunk: string) => <Link href="/dashboard/license">{chunk}</Link>,
    renew: (chunk: string) => <Link href="/dashboard/license#renew">{chunk}</Link>,
    whatsapp: (chunk: string) => <a href={contact.whatsappUrl}>{chunk}</a>,
    link: (chunk: string) => <Link href="/dashboard/catalog#h-payments">{chunk}</Link>,
  };

  return (
    <>
      <PageHeader title={t("overview.hello", { name: (context.member ?? user).name.split(" ")[0] ?? "" })} description={t("overview.stands", { app: name })} />
      {denied ? (
        <Notice tone="warn" icon="lock" role="status">
          {t("team.denied")}
        </Notice>
      ) : null}

      <AnnouncementBanner context={context} />

      <OwnerNotices notices={notices} />

      {/* 70 Two-step sign-in, suggested until it is on. */}
      <TwoStepRecommendation person={context.member ?? user} staff={context.staff !== null} t={t} />

      {state === "pending" ? (
        <Notice tone="warn" icon="hourglass_top">
          {richText(t("overview.pending", { app: name, page: licenseName }), links)}
        </Notice>
      ) : state === "expired" ? (
        <Notice tone="warn" icon="warning">
          {richText(t("overview.expired", { date: date(license!.expiresAt), app: name }), links)}
        </Notice>
      ) : license && daysLeft <= 14 && !notices.some((n) => n.appId === app.id && n.kind.startsWith("plan_ends_")) ? (
        <Notice icon="schedule">
          {richText(
            scheduled
              ? t("overview.endsSoonMoves", { date: date(license.expiresAt), plan: effective[scheduled.plan].name })
              : t("overview.endsSoon", { date: date(license.expiresAt) }),
            links,
          )}
        </Notice>
      ) : null}

      {/* 19 Products managed here show without a cart until the shop can take card payments. */}
      {app.connector?.kind === "catalog" && !paymentsSetUp(app) ? (
        <Notice tone="warn" icon="warning">
          {richText(t("overview.noPayments"), links)}
        </Notice>
      ) : null}

      {site?.warning ? (
        <Notice tone="warn" icon="warning" role="alert">
          {k(site.warning)}
          {site.suggestion ? ` ${k(site.suggestion)}` : ""} <Link href="/dashboard/app-type">{t("overview.changeType")}</Link>
        </Notice>
      ) : null}

      {/* The app at a glance: what it is, its state and plan, and the next thing to do. */}
      <section aria-labelledby="h-app" className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex min-w-0 flex-[1_1_320px] items-center gap-4">
          {app.iconAssetId ? (
            <img src={`/api/v1/assets/${app.iconAssetId}`} alt="" width={64} height={64} className="h-16 w-16 flex-none rounded-2xl border border-line object-cover" />
          ) : (
            <span className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-peach text-accent">
              <Icon name={kindOf(app).icon} size={32} />
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-1.5">
            <h2 id="h-app" className="m-0 text-xl leading-tight font-extrabold break-words">
              {name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <Badge tone="neutral">{k(kindOf(app).name)}</Badge>
              <AppStateBadge state={state} lang={lang} />
              <span>
                {license
                  ? state === "expired"
                    ? t("overview.planEnded", { plan: planName(plan, plans), date: date(license.expiresAt) })
                    : t("overview.planDaysLeft", { plan: planName(plan, plans), days: daysLeft })
                  : t("overview.noPlan")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
          <Link href="/dashboard/preview" className={`${btn.secondary} h-11 w-full sm:w-auto`}>
            <Icon name="visibility" size={20} />
            {t("overview.preview")}
          </Link>
          <Link href={primary.href} className={`${btn.primary} h-11 w-full sm:w-auto`}>
            {primary.label}
            <Icon name={primary.icon} size={20} />
          </Link>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Tile
          id="h-setup"
          title={t("overview.setup")}
          icon="tune"
          actions={
            <Link href={next ? stepHref(next === "app-type" ? "website" : next) : "/dashboard/setup"} className={`${next ? btn.primary : btn.secondary} h-10 px-4 text-sm`}>
              {next ? t("overview.continueSetup") : t("overview.reviewSetup")}
            </Link>
          }
        >
          <span className="text-2xl font-extrabold">{next ? t("overview.stepsDone", { done, total: SETUP_STEPS.length }) : t("overview.complete")}</span>
          <ProgressBar value={done} max={SETUP_STEPS.length} label={t("overview.setupProgress")} tone={next ? "accent" : "success"} />
          <ol className="m-0 mt-1 flex list-none flex-col gap-1.5 p-0 text-sm">
            {SETUP_STEPS.map((s) =>
              s === "publishing" && teamOnIt ? (
                // 19 The step counts as done ("Publish it for me" needs no keys), but nothing is live yet.
                <li key={s} className="flex items-center gap-2 text-ink-4">
                  <Icon name="hourglass_top" size={18} className="text-accent" />
                  {t("overview.teamOnIt", { step: step(s) })}
                </li>
              ) : (
                <li key={s} className={`flex items-center gap-2 ${status[s] ? "text-ink-4" : s === next ? "font-bold" : "text-muted"}`}>
                  <Icon
                    name={status[s] ? "check_circle" : s === next ? "arrow_forward" : "radio_button_unchecked"}
                    size={18}
                    filled={status[s]}
                    className={status[s] ? "text-success" : s === next ? "text-accent" : "text-faint"}
                  />
                  {step(s)}
                  <span className="sr-only">{status[s] ? t("overview.stepDone") : s === next ? t("overview.stepNext") : t("overview.stepTodo")}</span>
                </li>
              ),
            )}
          </ol>
        </Tile>

        <Tile
          id="h-build"
          title={t("overview.latestBuild")}
          icon="build"
          actions={
            <>
              {apkHref ? (
                <a href={apkHref} className={`${btn.primary} h-10 px-4 text-sm`}>
                  <Icon name="download" size={18} />
                  {t("overview.downloadApk")}
                </a>
              ) : null}
              <Link href="/dashboard/builds" className={`${btn.secondary} h-10 px-4 text-sm`}>
                {t("overview.allBuilds")}
              </Link>
            </>
          }
        >
          {latest ? (
            <>
              <span className="flex flex-wrap items-center gap-2 text-2xl font-extrabold">
                #{latest.number} <BuildBadge status={latest.status} lang={lang} />
              </span>
              <span className="text-sm text-muted">{t("overview.buildVersion", { version: latest.versionName, date: date(latest.createdAt) })}</span>
              {building || latest.status === "failed" ? <span className="text-sm leading-relaxed text-ink-4">{k(statusExplanation(latest, now))}</span> : null}
              {lastReady && lastReady.id !== latest.id ? (
                <span className="text-sm text-muted">{t("overview.filesFrom", { number: String(lastReady.number), version: lastReady.versionName })}</span>
              ) : null}
            </>
          ) : (
            <span className="text-[15px] leading-relaxed text-muted">
              {next ? t("overview.firstBuildAfterSetup") : state === "active" ? t("overview.noBuilds") : t("overview.firstBuildWhenActive")}
            </span>
          )}
        </Tile>

        <Tile
          id="h-publishing"
          title={t("overview.publishing")}
          icon="publish"
          actions={
            <Link href="/dashboard/publishing" className={`${btn.secondary} h-10 px-4 text-sm`}>
              {app.publishingMode ? t("overview.publishing") : t("overview.choosePublish")}
            </Link>
          }
        >
          {publishing ? (
            <>
              <span className="text-sm text-muted">{teamOnIt ? t("overview.teamOnItStore") : t("overview.teamPublishes")}</span>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
                {requestStores(publishing).map((which) => (
                  <li key={which} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold">
                      <Icon name={STORE_ICON[which]} size={20} className="text-muted" />
                      {STORE_TITLE[which]}
                    </span>
                    <Badge tone={statusTone(trackOf(publishing, which).status)}>{k(CLIENT_STATUS_LABEL[trackOf(publishing, which).status])}</Badge>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <span className="text-[15px] leading-relaxed text-muted">{app.publishingMode === "self" ? t("overview.selfPublish") : t("overview.publishChoice")}</span>
          )}
        </Tile>

        <Tile
          id="h-plan"
          title={t("overview.plan")}
          icon="workspace_premium"
          actions={
            // 60 Only the owner renews or changes the plan.
            !canBilling ? (
              <span className="flex items-center gap-1.5 text-sm text-muted">
                <Icon name="lock" size={18} />
                {t("team.askOwner")}
              </span>
            ) : (
              <>
                {state === "expired" || (license && daysLeft <= 14) ? (
                <Link href="/dashboard/license#renew" className={`${btn.primary} h-10 px-4 text-sm`}>
                  {t("overview.renew")}
                </Link>
              ) : null}
              {hosted && userLimit !== null && moreUsers ? (
                <Link href={upgradeHref(moreUsers.id)} className={`${btn.secondary} h-10 px-4 text-sm`}>
                  <Icon name="upgrade" size={18} />
                  {t("overview.upgrade")}
                </Link>
              ) : (
                <Link href={license ? "/dashboard/license#change-plan" : "/dashboard/license"} className={`${btn.secondary} h-10 px-4 text-sm`}>
                  {license ? t("overview.changePlan") : licenseName}
                </Link>
              )}
              </>
            )
          }
        >
          <span className="flex flex-wrap items-center gap-2 text-2xl font-extrabold">
            {planName(plan, plans)} <AppStateBadge state={state} lang={lang} />
          </span>
          <span className="text-sm text-muted">
            {license
              ? state === "expired"
                ? t("overview.endedOn", { date: date(license.expiresAt) })
                : t("overview.activeUntil", { date: date(license.expiresAt), days: daysLeft })
              : t("overview.payToActivate")}
          </span>
          {scheduled ? <span className="text-sm text-muted">{t("overview.movesTo", { plan: effective[scheduled.plan].name, date: date(scheduled.at) })}</span> : null}
          {plugin ? (
            <span className="flex items-center gap-1.5 text-sm text-muted">
              <Icon name={activation ? "link" : "link_off"} size={18} />
              {activation ? (
                <span>{richText(t("overview.connectedTo"), { site: () => <bdi dir="ltr">{activation.siteUrl}</bdi> })}</span>
              ) : (
                t("overview.pluginNotConnected")
              )}
            </span>
          ) : null}
          {site?.reported ? <span className="text-sm text-muted">{k(siteRunsLine(site))}</span> : null}
          {/* 13.2 App users against the plan's limit, for apps on the hosted API. */}
          {current && hosted ? (
            <div className="mt-2 flex flex-col gap-1.5 border-t border-line-soft pt-3">
              <span className="text-sm font-semibold text-muted">{t("overview.appUsers")}</span>
              <UsageMeter
                used={users}
                limit={userLimit}
                label={t("overview.appUsersWord")}
                lang={lang}
                words={{ noLimit: t("overview.noLimit"), usage: (used, limit) => t("overview.usage", { label: t("overview.appUsers"), used, limit }) }}
              />
            </div>
          ) : null}
        </Tile>

        {/* 46 How often the app crashes, once it has been built. */}
        {stability ? (
          <Tile
            id="h-stability"
            title={t("overview.stability")}
            icon="monitoring"
            actions={
              <Link href="/dashboard/stability" className={`${btn.secondary} h-10 px-4 text-sm`}>
                {t("overview.stability")}
              </Link>
            }
          >
            {app.crashReports === false ? (
              <span className="text-[15px] leading-relaxed text-muted">{t("overview.crashOff")}</span>
            ) : (
              <>
                <span className="text-2xl font-extrabold" data-crash-free="">
                  {stability.crashFree === null ? t("overview.noData") : t("overview.crashFree", { percent: num(stability.crashFree) })}
                </span>
                <span className="text-sm text-muted">{stability.crashFree === null ? t("overview.figuresLater") : t("overview.sessions", { count: stability.sessions })}</span>
                {stability.top.length ? (
                  <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
                    {stability.top.map((issue) => (
                      <li key={issue.id} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate font-mono text-[13px]" dir="ltr">
                          {issue.title}
                        </span>
                        <span className="flex-none text-muted">{num(issue.count)}×</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </Tile>
        ) : null}
      </div>

      <section aria-labelledby="h-shortcuts" className="flex flex-col gap-3">
        <h2 id="h-shortcuts" className="m-0 text-lg font-bold">
          {t("overview.shortcuts")}
        </h2>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
          {shortcuts(app, contact.whatsappUrl, text).map((s) => (
            <LinkCard key={s.href} {...s} />
          ))}
        </div>
      </section>

      {current ? (
        <section aria-labelledby="h-plan-features" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="h-plan-features" className="m-0 text-lg font-bold">
              {t("overview.inPlan", { plan: current.name })}
            </h2>
            <Link href="/dashboard/license#change-plan" className="text-sm font-semibold">
              {t("overview.comparePlans")}
            </Link>
          </div>
          <ul className="m-0 grid list-none gap-x-6 gap-y-2 p-0 text-[15px] [grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr))]">
            <li className="flex items-center gap-2">
              <Icon name="check" size={18} className="text-success" />
              {current.limits.languages === null ? t("overview.allLanguages") : t("overview.languages", { count: current.limits.languages })}
            </li>
            {features.filter((f) => hasFeature(current, f.id)).map((f) => (
              <li key={f.id} className="flex items-center gap-2">
                <Icon name="check" size={18} className="text-success" />
                {k(f.label)}
              </li>
            ))}
          </ul>
          {features.some((f) => !hasFeature(current, f.id)) ? (
            <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
              <span className="text-sm font-semibold text-muted">{t("overview.notInPlan")}</span>
              {features.filter((f) => !hasFeature(current, f.id)).map((f) => {
                const to = lowestPlanWith(effective, (p) => hasFeature(p, f.id), plan);
                return (
                  <UpgradeHint key={f.id} title={k(f.label)} to={to} compact cta={to ? t("overview.upgradeTo", { plan: to.name }) : undefined}>
                    {k(f.description)}
                  </UpgradeHint>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
