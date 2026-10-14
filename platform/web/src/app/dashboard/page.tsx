import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BuildBadge } from "@/components/build-status";
import { Icon } from "@/components/icon";
import { Badge, Notice, btn, formatDate } from "@/components/ui";
import { SETUP_STEPS, nextStep, stepStatus } from "@/lib/app/setup";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { ACCOUNT_STATE_LABEL, daysUntil } from "@/lib/license/status";
import { formatLimit, hasFeature, lowestPlanWith, PLAN_FEATURES, planName } from "@/lib/plans";
import { OwnerNotices } from "@/components/owner-notices";
import { UpgradeHint, UsageMeter, upgradeHref } from "@/components/upgrade";
import { currentPlanId, scheduledPlan } from "@/lib/billing/plan-change";
import { effectivePlans } from "@/lib/entitlements";
import { getPlans } from "@/lib/settings/platform";
import { getContact } from "@/lib/contact";
import { AnnouncementBanner } from "@/components/announcements";
import { appLabel } from "@/lib/app/label";
import { CLIENT_STATUS_LABEL, PUBLISHING_STORES, statusTone, STORE_TITLE } from "@/lib/publishing/steps";

export const metadata: Metadata = { title: "Overview" };

function Tile({ title, children, action }: { title: string; children: React.ReactNode; action: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 className="m-0 text-base font-bold text-muted">{title}</h2>
      <div className="flex flex-1 flex-col gap-1.5">{children}</div>
      <div>{action}</div>
    </section>
  );
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
  const [latest] = await store.listBuildsByApp(app.id, 1);
  const publishing = app.publishingMode === "managed" ? await store.getPublishingRequest(app.id) : null;
  const activation = license ? await store.getActivation(license.id) : null;
  const status = stepStatus(app, plan, effective);
  const done = SETUP_STEPS.filter((step) => status[step]).length;
  const next = nextStep(app, plan, effective);
  const daysLeft = license ? daysUntil(license.expiresAt) : 0;
  // 13.2 App users count on the hosted API only: a WordPress site keeps its own users.
  const hosted = app.backend === "hosted";
  const users = hosted ? await store.countHostedUsers(app.id) : 0;
  const userLimit = current?.limits.appUsers ?? null;
  const moreUsers = current ? lowestPlanWith(effective, (p) => p.limits.appUsers === null || (userLimit !== null && p.limits.appUsers > userLimit), plan) : null;
  const notices = await store.listOwnerNotices({ clientId: context.client.id, open: true, limit: 10 });

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Hello, {user.name.split(" ")[0]}</h1>
        <span className="text-[15px] text-muted">
          {app.appName ?? "Your app"} · Plan: {planName(plan, plans)}
        </span>
      </div>

      <AnnouncementBanner context={context} />

      <OwnerNotices notices={notices} />

      {state === "pending" ? (
        <Notice tone="warn" icon="hourglass_top">
          {appLabel(app)} is waiting for activation. Each app has its own plan: set it up now, then pay its plan on{" "}
          <Link href="/dashboard/license">License &amp; plugin</Link> or <a href={contact.whatsappUrl}>message us on WhatsApp</a>. Its first build
          starts once it&apos;s active.
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

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr))]">
        <Tile
          title="App setup"
          action={
            <Link href={next ? `/dashboard/setup?step=${next === "app-type" ? "website" : next}` : "/dashboard/setup"} className={`${btn.secondary} h-10`}>
              {next ? "Continue setup" : "Review setup"}
            </Link>
          }
        >
          <span className="text-2xl font-extrabold">
            {done} of {SETUP_STEPS.length} steps
          </span>
          <div className="h-2 rounded-full bg-ivory" role="progressbar" aria-valuemin={0} aria-valuemax={SETUP_STEPS.length} aria-valuenow={done} aria-label="Setup progress">
            <div className="h-full rounded-full bg-ember" style={{ width: `${(done / SETUP_STEPS.length) * 100}%` }} />
          </div>
        </Tile>

        <Tile
          title="Latest build"
          action={
            <Link href="/dashboard/builds" className={`${btn.secondary} h-10`}>
              Builds &amp; downloads
            </Link>
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
            </>
          ) : (
            <span className="text-[15px] text-muted">Your first build starts when the setup is complete.</span>
          )}
        </Tile>

        <Tile
          title="Publishing"
          action={
            <Link href="/dashboard/publishing" className={`${btn.secondary} h-10`}>
              {app.publishingMode ? "Publishing" : "Choose how to publish"}
            </Link>
          }
        >
          {publishing ? (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[15px]">
              {PUBLISHING_STORES.map((which) => (
                <li key={which} className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{STORE_TITLE[which]}</span>
                  <Badge tone={statusTone(publishing[which].status)}>{CLIENT_STATUS_LABEL[publishing[which].status]}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-[15px] text-muted">
              {app.publishingMode === "self" ? "You publish your app yourself, with our guides." : "Publish it yourself, or let our team publish it for you."}
            </span>
          )}
        </Tile>

        <Tile
          title="License"
          action={
            <Link href="/dashboard/license" className={`${btn.secondary} h-10`}>
              License &amp; plugin
            </Link>
          }
        >
          <span className="flex flex-wrap items-center gap-2 text-2xl font-extrabold">
            {planName(plan, plans)} <Badge tone={state === "active" ? "success" : state === "pending" ? "warn" : "danger"}>{ACCOUNT_STATE_LABEL[state]}</Badge>
          </span>
          <span className="flex items-center gap-1.5 text-sm text-muted">
            <Icon name={activation ? "link" : "link_off"} size={18} />
            {activation ? `Connected to ${activation.siteUrl}` : "Plugin not connected yet"}
          </span>
        </Tile>

        {current ? (
          <Tile
            title="App users"
            action={
              hosted && userLimit !== null && moreUsers ? (
                <Link href={upgradeHref(moreUsers.id)} className={`${btn.secondary} h-10`}>
                  <Icon name="upgrade" size={18} />
                  Upgrade
                </Link>
              ) : null
            }
          >
            {hosted ? (
              <UsageMeter used={users} limit={userLimit} label="app users" />
            ) : (
              <>
                <span className="text-2xl font-extrabold">No limit</span>
                <span className="text-sm text-muted">Your app users sign in on your own website, so your plan doesn&apos;t count them.</span>
              </>
            )}
          </Tile>
        ) : null}
      </div>

      {current ? (
        <section aria-labelledby="h-plan-features" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="h-plan-features" className="m-0 text-base font-bold text-muted">
              In your {current.name} plan
            </h2>
            <Link href="/dashboard/license#change-plan" className="text-sm font-semibold">
              Change plan
            </Link>
          </div>
          <ul className="m-0 grid list-none gap-x-6 gap-y-1.5 p-0 text-[15px] [grid-template-columns:repeat(auto-fill,minmax(min(240px,100%),1fr))]">
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
          <div className="flex flex-col gap-2">
            {PLAN_FEATURES.filter((f) => !hasFeature(current, f.id)).map((f) => (
              <UpgradeHint key={f.id} title={f.label} to={lowestPlanWith(effective, (p) => hasFeature(p, f.id), plan)} compact>
                {f.description}
              </UpgradeHint>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
