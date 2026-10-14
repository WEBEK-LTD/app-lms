/* eslint-disable @next/next/no-img-element -- the app icon is a small uploaded PNG served by our own route. */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BuildBadge } from "@/components/build-status";
import { APP_TYPE_ICON, AppStateBadge, LinkCard } from "@/components/dashboard";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { Badge, Notice, PageHeader, ProgressBar, btn, formatDate } from "@/components/ui";
import { APP_TYPE_NAMES, SETUP_STEPS, STEP_LABEL, nextStep, stepStatus, type SetupStep } from "@/lib/app/setup";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { daysUntil } from "@/lib/license/status";
import { formatLimit, hasFeature, lowestPlanWith, PLAN_FEATURES, planName } from "@/lib/plans";
import { OwnerNotices } from "@/components/owner-notices";
import { UpgradeHint, UsageMeter, upgradeHref } from "@/components/upgrade";
import { currentPlanId, scheduledPlan } from "@/lib/billing/plan-change";
import { effectivePlans } from "@/lib/entitlements";
import { getPlans } from "@/lib/settings/platform";
import { getContact } from "@/lib/contact";
import { AnnouncementBanner } from "@/components/announcements";
import { appLabel, licensePageName, usesPlugin } from "@/lib/app/label";
import { isInProgress, statusExplanation } from "@/lib/builds/view";
import { dashboardFileHref, fileLink } from "@/lib/files";
import { CLIENT_STATUS_LABEL, isLiveSomewhere, PUBLISHING_STORES, statusTone, STORE_TITLE } from "@/lib/publishing/steps";
import type { App } from "@/lib/data/types";
import { paymentsSetUp } from "@/lib/catalog/settings";

export const metadata: Metadata = { title: "Overview" };

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
function shortcuts(app: App, whatsappUrl: string): { href: string; icon: IconName; title: string; text: string; external?: boolean }[] {
  const content: Record<string, { href: string; icon: IconName; title: string; text: string }> = {
    catalog: { href: "/dashboard/catalog/new", icon: "inventory_2", title: "Add a product", text: "Price, stock, photos and categories" },
    courses: { href: "/dashboard/courses", icon: "school", title: "Add a course", text: "Sections, lessons and price" },
    bookings: { href: "/dashboard/services", icon: "groups", title: "Add a service", text: "What you offer, who does it and when" },
    listings: { href: "/dashboard/listings/new", icon: "home_work", title: "Add a property", text: "Photos, price, rooms and location" },
  };
  return [
    { href: "/dashboard/pages", icon: "palette", title: "Edit your app's pages", text: "Blocks, bottom tabs, colors and languages" },
    ...(app.connector && content[app.connector.kind] ? [content[app.connector.kind]!] : []),
    ...(app.backend === "hosted" ? [{ href: "/dashboard/notifications", icon: "notifications" as const, title: "Send a notification", text: "A message to everyone who uses your app" }] : []),
    { href: "/dashboard/builds", icon: "download", title: "Get your app files", text: "Builds, downloads and the upload key" },
    { href: whatsappUrl, icon: "support_agent", title: "Get help", text: "Message our team on WhatsApp", external: true },
  ];
}

export default async function OverviewPage() {
  const contact = await getContact();
  const context = await requireClient();
  const { user, app, license, state } = context;
  if (!app) redirect("/dashboard/app-type");
  const store = await getStore();
  const plans = await getPlans(store);
  const now = new Date();
  // 13.1 The app's plan as it is now, with what it includes.
  const effective = await effectivePlans(store);
  const plan = license ? currentPlanId(license, now) : null;
  const current = plan ? effective[plan] : null;
  const scheduled = scheduledPlan(license, now);
  const builds = await store.listBuildsByApp(app.id, 10);
  const latest = builds[0] ?? null;
  const lastReady = builds.find((b) => b.status === "ready") ?? null;
  const publishing = app.publishingMode === "managed" ? await store.getPublishingRequest(app.id) : null;
  const plugin = usesPlugin(app);
  const activation = license && plugin ? await store.getActivation(license.id) : null;
  const status = stepStatus(app, plan, effective);
  // 19 "Publish it for me" until a store is live: the Publishing step is done, our team isn't yet.
  const teamOnIt = publishing !== null && status.publishing && !isLiveSomewhere(publishing);
  const done = SETUP_STEPS.filter((step) => status[step]).length;
  const next = nextStep(app, plan, effective);
  const daysLeft = license ? daysUntil(license.expiresAt, now) : 0;
  // 13.2 App users count on the hosted API only: a WordPress site keeps its own users.
  const hosted = app.backend === "hosted";
  const users = hosted ? await store.countHostedUsers(app.id) : 0;
  const userLimit = current?.limits.appUsers ?? null;
  const moreUsers = current ? lowestPlanWith(effective, (p) => p.limits.appUsers === null || (userLimit !== null && p.limits.appUsers > userLimit), plan) : null;
  const notices = await store.listOwnerNotices({ clientId: context.client.id, open: true, limit: 10 });
  const licenseName = licensePageName(app);

  // The latest Android APK, to try the app at once (signed when clicked, like on Builds & downloads).
  const apk = lastReady?.artifacts.find((a) => a.kind === "apk");
  const apkHref = lastReady && apk && fileLink(apk.url, now).disabledReason === null ? dashboardFileHref(lastReady.id, "apk") : null;
  const building = isInProgress(latest, now);

  // The one thing to do next, as the main button of the app card.
  const primary =
    state === "expired"
      ? { href: "/dashboard/license#renew", label: "Renew by card", icon: "refresh" as const }
      : next
        ? { href: stepHref(next === "app-type" ? "website" : next), label: `Continue setup: ${STEP_LABEL[next === "app-type" ? "website" : next]}`, icon: "arrow_forward" as const }
        : state === "pending"
          ? { href: "/dashboard/license", label: "Activate this app", icon: "key" as const }
          : !latest
            ? { href: "/dashboard/builds", label: "Start your first build", icon: "build" as const }
            : !app.publishingMode
              ? { href: "/dashboard/publishing", label: "Choose how to publish", icon: "publish" as const }
              : { href: "/dashboard/pages", label: "Edit your app's pages", icon: "palette" as const };

  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(" ")[0]}`} description={<>Here&apos;s where {appLabel(app)} stands, and what to do next.</>} />

      <AnnouncementBanner context={context} />

      <OwnerNotices notices={notices} />

      {state === "pending" ? (
        <Notice tone="warn" icon="hourglass_top">
          {appLabel(app)} is waiting for activation. Each app has its own plan: set it up now, then pay its plan on{" "}
          <Link href="/dashboard/license">{licenseName}</Link> or <a href={contact.whatsappUrl}>message us on WhatsApp</a>. Its first build starts once
          it&apos;s active.
        </Notice>
      ) : state === "expired" ? (
        <Notice tone="warn" icon="warning">
          Your plan ended on {formatDate(license?.expiresAt)} and {appLabel(app)} is paused. <Link href="/dashboard/license#renew">Renew by card</Link> or{" "}
          <a href={contact.whatsappUrl}>message us on WhatsApp</a> to bring it back.
        </Notice>
      ) : license && daysLeft <= 14 && !notices.some((n) => n.appId === app.id && n.kind.startsWith("plan_ends_")) ? (
        <Notice icon="schedule">
          Your plan ends on {formatDate(license?.expiresAt)}
          {scheduled ? ` and moves to ${effective[scheduled.plan].name}` : ""}. <Link href="/dashboard/license#renew">Renew by card</Link> or{" "}
          <a href={contact.whatsappUrl}>message us on WhatsApp</a>.
        </Notice>
      ) : null}

      {/* 19 Products managed here show without a cart until the shop can take card payments. */}
      {app.connector?.kind === "catalog" && !paymentsSetUp(app) ? (
        <Notice tone="warn" icon="warning">
          Customers can see your products in the app but can&apos;t pay for them until you set up{" "}
          <Link href="/dashboard/catalog#h-payments">Card payments</Link> on the Products page.
        </Notice>
      ) : null}

      {/* The app at a glance: what it is, its state and plan, and the next thing to do. */}
      <section aria-labelledby="h-app" className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex min-w-0 flex-[1_1_320px] items-center gap-4">
          {app.iconAssetId ? (
            <img src={`/api/v1/assets/${app.iconAssetId}`} alt="" width={64} height={64} className="h-16 w-16 flex-none rounded-2xl border border-line object-cover" />
          ) : (
            <span className="flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-peach text-accent">
              <Icon name={APP_TYPE_ICON[app.appType]} size={32} />
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-1.5">
            <h2 id="h-app" className="m-0 text-xl leading-tight font-extrabold break-words">
              {appLabel(app)}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <Badge tone="neutral">{APP_TYPE_NAMES[app.appType]}</Badge>
              <AppStateBadge state={state} />
              <span>
                {license
                  ? state === "expired"
                    ? `${planName(plan, plans)} plan · ended ${formatDate(license.expiresAt)}`
                    : `${planName(plan, plans)} plan · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`
                  : "No plan yet"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
          <Link href="/dashboard/preview" className={`${btn.secondary} h-11 w-full sm:w-auto`}>
            <Icon name="visibility" size={20} />
            Preview your app
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
          title="App setup"
          icon="tune"
          actions={
            <Link href={next ? stepHref(next === "app-type" ? "website" : next) : "/dashboard/setup"} className={`${next ? btn.primary : btn.secondary} h-10 px-4 text-sm`}>
              {next ? "Continue setup" : "Review setup"}
            </Link>
          }
        >
          <span className="text-2xl font-extrabold">{next ? `${done} of ${SETUP_STEPS.length} steps` : "Complete"}</span>
          <ProgressBar value={done} max={SETUP_STEPS.length} label="Setup progress" tone={next ? "accent" : "success"} />
          <ol className="m-0 mt-1 flex list-none flex-col gap-1.5 p-0 text-sm">
            {SETUP_STEPS.map((step) =>
              step === "publishing" && teamOnIt ? (
                // 19 The step counts as done ("Publish it for me" needs no keys), but nothing is live yet.
                <li key={step} className="flex items-center gap-2 text-ink-4">
                  <Icon name="hourglass_top" size={18} className="text-accent" />
                  {STEP_LABEL[step]}: our team is on it
                </li>
              ) : (
                <li key={step} className={`flex items-center gap-2 ${status[step] ? "text-ink-4" : step === next ? "font-bold" : "text-muted"}`}>
                  <Icon
                    name={status[step] ? "check_circle" : step === next ? "arrow_forward" : "radio_button_unchecked"}
                    size={18}
                    filled={status[step]}
                    className={status[step] ? "text-success" : step === next ? "text-accent" : "text-faint"}
                  />
                  {STEP_LABEL[step]}
                  <span className="sr-only">{status[step] ? " (done)" : step === next ? " (next)" : " (to do)"}</span>
                </li>
              ),
            )}
          </ol>
        </Tile>

        <Tile
          id="h-build"
          title="Latest build"
          icon="build"
          actions={
            <>
              {apkHref ? (
                <a href={apkHref} className={`${btn.primary} h-10 px-4 text-sm`}>
                  <Icon name="download" size={18} />
                  Download APK
                </a>
              ) : null}
              <Link href="/dashboard/builds" className={`${btn.secondary} h-10 px-4 text-sm`}>
                All builds
              </Link>
            </>
          }
        >
          {latest ? (
            <>
              <span className="flex flex-wrap items-center gap-2 text-2xl font-extrabold">
                #{latest.number} <BuildBadge status={latest.status} />
              </span>
              <span className="text-sm text-muted">
                App version {latest.versionName} · {formatDate(latest.createdAt)}
              </span>
              {building || latest.status === "failed" ? <span className="text-sm leading-relaxed text-ink-4">{statusExplanation(latest, now)}</span> : null}
              {lastReady && lastReady.id !== latest.id ? (
                <span className="text-sm text-muted">
                  Files from build #{lastReady.number} (version {lastReady.versionName}) are ready to download.
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-[15px] leading-relaxed text-muted">
              {next ? "Your first build starts when the setup is complete." : state === "active" ? "No builds yet. Start one on Builds & downloads; it takes 15 to 45 minutes." : "Your first build starts once this app is active."}
            </span>
          )}
        </Tile>

        <Tile
          id="h-publishing"
          title="Publishing"
          icon="publish"
          actions={
            <Link href="/dashboard/publishing" className={`${btn.secondary} h-10 px-4 text-sm`}>
              {app.publishingMode ? "Publishing" : "Choose how to publish"}
            </Link>
          }
        >
          {publishing ? (
            <>
              <span className="text-sm text-muted">{teamOnIt ? "Our team is on it: it isn't live on a store yet." : "Our team publishes it for you."}</span>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
                {PUBLISHING_STORES.map((which) => (
                  <li key={which} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold">
                      <Icon name={which === "android" ? "android" : "phone_iphone"} size={20} className="text-muted" />
                      {STORE_TITLE[which]}
                    </span>
                    <Badge tone={statusTone(publishing[which].status)}>{CLIENT_STATUS_LABEL[publishing[which].status]}</Badge>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <span className="text-[15px] leading-relaxed text-muted">
              {app.publishingMode === "self" ? "You publish your app yourself, with our guides." : "Publish it yourself, or let our team publish it for you."}
            </span>
          )}
        </Tile>

        <Tile
          id="h-plan"
          title="Plan"
          icon="workspace_premium"
          actions={
            <>
              {state === "expired" || (license && daysLeft <= 14) ? (
                <Link href="/dashboard/license#renew" className={`${btn.primary} h-10 px-4 text-sm`}>
                  Renew
                </Link>
              ) : null}
              {hosted && userLimit !== null && moreUsers ? (
                <Link href={upgradeHref(moreUsers.id)} className={`${btn.secondary} h-10 px-4 text-sm`}>
                  <Icon name="upgrade" size={18} />
                  Upgrade
                </Link>
              ) : (
                <Link href={license ? "/dashboard/license#change-plan" : "/dashboard/license"} className={`${btn.secondary} h-10 px-4 text-sm`}>
                  {license ? "Change plan" : licenseName}
                </Link>
              )}
            </>
          }
        >
          <span className="flex flex-wrap items-center gap-2 text-2xl font-extrabold">
            {planName(plan, plans)} <AppStateBadge state={state} />
          </span>
          <span className="text-sm text-muted">
            {license
              ? state === "expired"
                ? `Ended on ${formatDate(license.expiresAt)}`
                : `Active until ${formatDate(license.expiresAt)} · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`
              : "Pay its plan or message us to activate it."}
          </span>
          {scheduled ? (
            <span className="text-sm text-muted">
              Moves to {effective[scheduled.plan].name} on {formatDate(scheduled.at)}
            </span>
          ) : null}
          {plugin ? (
            <span className="flex items-center gap-1.5 text-sm text-muted">
              <Icon name={activation ? "link" : "link_off"} size={18} />
              {activation ? `Connected to ${activation.siteUrl}` : "Plugin not connected yet"}
            </span>
          ) : null}
          {/* 13.2 App users against the plan's limit, for apps on the hosted API. */}
          {current && hosted ? (
            <div className="mt-2 flex flex-col gap-1.5 border-t border-line-soft pt-3">
              <span className="text-sm font-semibold text-muted">App users</span>
              <UsageMeter used={users} limit={userLimit} label="app users" />
            </div>
          ) : null}
        </Tile>
      </div>

      <section aria-labelledby="h-shortcuts" className="flex flex-col gap-3">
        <h2 id="h-shortcuts" className="m-0 text-lg font-bold">
          Shortcuts
        </h2>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
          {shortcuts(app, contact.whatsappUrl).map((s) => (
            <LinkCard key={s.href} {...s} />
          ))}
        </div>
      </section>

      {current ? (
        <section aria-labelledby="h-plan-features" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="h-plan-features" className="m-0 text-lg font-bold">
              In your {current.name} plan
            </h2>
            <Link href="/dashboard/license#change-plan" className="text-sm font-semibold">
              Compare plans
            </Link>
          </div>
          <ul className="m-0 grid list-none gap-x-6 gap-y-2 p-0 text-[15px] [grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr))]">
            <li className="flex items-center gap-2">
              <Icon name="check" size={18} className="text-success" />
              {formatLimit(current.limits.languages, "All")} app language{current.limits.languages === 1 ? "" : "s"}
            </li>
            {PLAN_FEATURES.filter((f) => hasFeature(current, f.id)).map((f) => (
              <li key={f.id} className="flex items-center gap-2">
                <Icon name="check" size={18} className="text-success" />
                {f.label}
              </li>
            ))}
          </ul>
          {PLAN_FEATURES.some((f) => !hasFeature(current, f.id)) ? (
            <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
              <span className="text-sm font-semibold text-muted">Not in your plan</span>
              {PLAN_FEATURES.filter((f) => !hasFeature(current, f.id)).map((f) => (
                <UpgradeHint key={f.id} title={f.label} to={lowestPlanWith(effective, (p) => hasFeature(p, f.id), plan)} compact>
                  {f.description}
                </UpgradeHint>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
