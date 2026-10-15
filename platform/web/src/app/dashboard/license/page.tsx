import type { Metadata } from "next";
import Link from "next/link";
import { cancelScheduledPlanAction, scheduleDowngradeAction } from "@/app/actions/billing";
import { releaseSiteAction } from "@/app/actions/dashboard";
import { CopyButton } from "@/components/copy-button";
import { Icon } from "@/components/icon";
import { SubmitButton } from "@/components/form";
import { Badge, Notice, PageHeader, btn, formatDate, formatDateTime } from "@/components/ui";
import { revealLicenseKey } from "@/lib/admin/clients";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { encryptionKey } from "@/lib/env";
import { latestRelease } from "@/lib/license/service";
import { ACCOUNT_STATE_LABEL } from "@/lib/license/status";
import { comparePlans, formatLimit, hasFeature, isPlan, PLANS, planName, planPrice, SUPPORT_LABEL, type Plan, type PlanInfo } from "@/lib/plans";
import { cardPlanOptions } from "@/lib/billing/card-plans";
import { currentPlanId, planChangeFor, scheduledPlan } from "@/lib/billing/plan-change";
import { effectivePlans } from "@/lib/entitlements";
import { getSwitches } from "@/lib/switches";
import { PlanPaymentForm } from "@/components/plan-payment-form";
import { getPlans, yallappIyzicoKeys } from "@/lib/settings/platform";
import { getContact } from "@/lib/contact";
import { appLabel, licensePageName, usesPlugin } from "@/lib/app/label";
import { siteMatch, siteRunsLine } from "@/lib/app/site-match";

export async function generateMetadata(): Promise<Metadata> {
  const { app } = await requireClient();
  return { title: licensePageName(app) };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-line-soft py-3 first:border-t-0">
      <dt className="w-[150px] flex-none text-sm text-muted">{label}</dt>
      <dd className="m-0 min-w-0 flex-1 text-[15px] font-semibold break-words">{children}</dd>
    </div>
  );
}

/** The few lines that tell the tiers apart, on a plan card. */
function planLines(plan: PlanInfo): string[] {
  return [
    hasFeature(plan, "ios") ? "Android & iOS apps" : "Android app",
    `${formatLimit(plan.limits.appUsers)} app users`,
    `${formatLimit(plan.limits.languages, "All")} app language${plan.limits.languages === 1 ? "" : "s"}`,
    hasFeature(plan, "page_editor") ? "Full page editor" : "Ready-made page templates",
    hasFeature(plan, "auto_publish") ? "We publish for you" : "You publish with our guides",
    SUPPORT_LABEL[plan.limits.support].replace(", with your account manager", ""),
  ];
}

export default async function LicensePage({ searchParams }: PageProps<"/dashboard/license">) {
  const contact = await getContact();
  const { license, state, app, apps, client } = await requireClient();
  const { released, payment, plan: wanted, plan_change: planChange } = await searchParams;
  const store = await getStore();
  const now = new Date();
  const plans = await getPlans(store);
  // 13.1 What each plan includes for apps (switches applied); prices from the admin.
  const effective = await effectivePlans(store);
  const currentId: Plan | null = license ? currentPlanId(license, now) : null;
  const scheduled = scheduledPlan(license, now);
  const payable = (await yallappIyzicoKeys(store, encryptionKey())) ? cardPlanOptions(plans, await getSwitches(store)) : [];
  // 13.3 What paying for each plan does: an upgrade starts today with the old days credited, a downgrade waits for the end of the period.
  const notes = payable.map((p) => {
    const info = plans[p.id];
    const change = planChangeFor(license, info, info.billingMonths, plans, now);
    const note =
      change.kind === "upgrade"
        ? `Upgrade: starts today${change.creditDays ? `, with ${change.creditDays} days credited for your current plan` : ""}. Active until ${formatDate(change.activeUntil)}.`
        : change.kind === "downgrade"
          ? `Starts on ${formatDate(change.nextPlanAt)}, when your current plan ends. Active until ${formatDate(change.activeUntil)}.`
          : change.kind === "renew" && state === "active"
            ? `Adds ${info.billingMonths === 1 ? "a month" : "a year"}: active until ${formatDate(change.activeUntil)}.`
            : null;
    return { ...p, note };
  });
  const selected = isPlan(wanted) ? wanted : (scheduled?.plan ?? currentId);
  const activation = license ? await store.getActivation(license.id) : null;
  const release = latestRelease(await store.listReleases());
  const key = license ? revealLicenseKey(license, encryptionKey()) : null;
  const active = state === "active";
  // Apps on the hosted API or their own API have no plugin: no website activation or plugin download to show.
  const plugin = usesPlugin(app);
  // 30 What the site runs, as its plugin reports it.
  const site = activation && app ? siteMatch(app, activation) : null;

  return (
    <>
      <PageHeader
        title={licensePageName(app)}
        description={
          apps.length > 1 ? (
            <>
              The plan and license of <strong className="text-ink-2">{appLabel(app)}</strong>. Each app has its own plan, license key and website.
            </>
          ) : plugin ? (
            "Your license connects the Yallapp plugin on your website to your plan."
          ) : (
            "Your app's plan, how long it runs and how to change it."
          )
        }
      />

      {released ? (
        <Notice tone="success" icon="check_circle" role="status">
          The license is released. Activate it in the plugin on your new website.
        </Notice>
      ) : null}
      {payment === "paid" ? (
        <Notice tone="success" icon="check_circle" role="status">
          Payment received. Your plan is active until {formatDate(license?.expiresAt)}, and we emailed you the details.
        </Notice>
      ) : null}
      {payment === "failed" ? (
        <Notice tone="danger" icon="error" role="alert">
          The payment didn&apos;t go through, and nothing was charged. Try again, or message us on WhatsApp.
        </Notice>
      ) : null}
      {planChange === "scheduled" && scheduled ? (
        <Notice tone="success" icon="check_circle" role="status">
          Done. {appLabel(app)} moves to {effective[scheduled.plan].name} on {formatDate(scheduled.at)}, when the current period ends. Nothing is charged now.
        </Notice>
      ) : null}
      {planChange === "kept" ? (
        <Notice tone="success" icon="check_circle" role="status">
          {appLabel(app)} stays on {planName(currentId, effective)}.
        </Notice>
      ) : null}
      {planChange === "refused" || planChange === "switched" ? (
        <Notice tone="warn" icon="warning" role="alert">
          {planChange === "switched"
            ? "You switched to another app in the meantime. Check which app you're changing and try again."
            : "That plan change isn't possible now. Choose a lower plan while your plan is active, or pay for a plan below."}
        </Notice>
      ) : null}
      {state === "pending" ? (
        <Notice tone="warn" icon="hourglass_top">
          This app isn&apos;t activated yet. {payable.length ? "Pay its plan by card below, or " : ""}
          <a href={contact.whatsappUrl}>{payable.length ? "message us on WhatsApp" : "Message us on WhatsApp"}</a> to activate it. You get its license key
          as soon as it&apos;s active.
        </Notice>
      ) : null}
      {state === "expired" ? (
        <Notice tone="warn" icon="warning">
          Your plan ended on {formatDate(license?.expiresAt)}. The app is paused: the plugin reports the license as expired, and your app users see that you
          can bring it back. {payable.length ? "Renew it by card below, or " : ""}
          <a href={contact.whatsappUrl}>{payable.length ? "message us on WhatsApp" : "Message us on WhatsApp"}</a> to renew.
        </Notice>
      ) : null}

      <section aria-labelledby="h-license" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="h-license" className="m-0 text-lg font-bold">
            License
          </h2>
          <Badge tone={state === "active" ? "success" : state === "expired" ? "danger" : "warn"}>{ACCOUNT_STATE_LABEL[state]}</Badge>
        </div>
        {app ? (
          <p className="m-0 text-sm text-muted">
            App: <span className="font-semibold text-ink-2">{appLabel(app)}</span>
          </p>
        ) : null}
        {key ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-ivory px-4 py-3">
            <code className="min-w-0 flex-1 font-mono text-lg font-bold tracking-wider break-all" aria-label="License key">
              {key}
            </code>
            <CopyButton value={key} label="Copy key" />
          </div>
        ) : null}
        <dl className="m-0">
          <Row label="Plan">
            {planName(currentId, effective)}
            {scheduled ? (
              <span className="block text-[13px] font-normal text-muted">
                Moves to {effective[scheduled.plan].name} on {formatDate(scheduled.at)}
              </span>
            ) : null}
          </Row>
          <Row label="Active until">{formatDate(license?.expiresAt)}</Row>
          {plugin || activation ? (
          <Row label="Activated on">
            {activation ? (
              <span className="flex flex-col gap-0.5">
                <span>{activation.siteUrl}</span>
                <span className="text-[13px] font-normal text-muted">
                  Plugin {activation.pluginVersion} · last check {formatDateTime(activation.lastCheckedAt)}
                </span>
                {site?.reported ? <span className="text-[13px] font-normal text-muted">{siteRunsLine(site)}</span> : null}
              </span>
            ) : (
              <span className="font-normal text-muted">Not activated on a website yet</span>
            )}
          </Row>
          ) : null}
        </dl>
        {activation ? (
          <form action={releaseSiteAction} className="flex flex-wrap items-center gap-3 border-t border-line-soft pt-4">
            <SubmitButton variant="secondary" className="h-10" pendingText="Releasing…">
              <Icon name="link_off" size={18} />
              Release from this website
            </SubmitButton>
            <span className="text-[13px] text-muted">Do this when you move to a new domain. The plugin on the old site stops working.</span>
          </form>
        ) : null}
      </section>

      <section id="change-plan" aria-labelledby="h-change-plan" className="flex scroll-mt-6 flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-change-plan" className="m-0 text-lg font-bold">
            {currentId ? "Change plan" : "Plans"}
          </h2>
          <p className="m-0 text-sm text-muted">
            {active
              ? "Upgrades start today: you pay the new plan and the days left on your current plan are credited at their value. Moving to a lower plan never loses days: it starts when your current plan ends."
              : "Each app has its own plan. Pay for the plan you choose below."}{" "}
            <Link href="/pricing">Compare every feature</Link>
          </p>
        </div>
        {scheduled && client.status !== "suspended" ? (
          <form action={cancelScheduledPlanAction} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ivory px-4 py-3">
            <input type="hidden" name="appId" value={app?.id ?? ""} />
            <span className="text-[15px]">
              Moving to <strong>{effective[scheduled.plan].name}</strong> on {formatDate(scheduled.at)}.
            </span>
            <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
              Keep {planName(currentId, effective)}
            </SubmitButton>
          </form>
        ) : null}
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr))]">
          {PLANS.map((id) => {
            const plan = effective[id];
            const shown = planPrice(plans[id]);
            const isCurrent = id === currentId;
            const direction = currentId ? comparePlans(currentId, id) : 1;
            const canPay = payable.some((p) => p.id === id);
            return (
              <div
                key={id}
                data-plan={id}
                className={`flex flex-col gap-2.5 rounded-xl border p-4 ${isCurrent ? "border-2 border-midnight bg-ivory" : "border-line"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[17px] font-bold">{plan.name}</span>
                  {isCurrent ? <Badge tone="success">Current plan</Badge> : scheduled?.plan === id ? <Badge tone="warn">From {formatDate(scheduled.at)}</Badge> : null}
                </div>
                <span className="text-[15px] font-bold">
                  {shown.price}
                  {shown.period ? <span className="font-normal text-muted"> / {shown.period}</span> : null}
                </span>
                <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px] text-ink-4">
                  {planLines(plan).map((line) => (
                    <li key={line} className="flex items-start gap-1.5">
                      <Icon name="check" size={16} className="mt-px text-success" />
                      {line}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-1">
                  {isCurrent ? null : active && direction < 0 ? (
                    scheduled?.plan === id ? null : (
                      <form action={scheduleDowngradeAction}>
                        <input type="hidden" name="appId" value={app?.id ?? ""} />
                        <input type="hidden" name="plan" value={id} />
                        <SubmitButton variant="secondary" className="min-h-9 w-full px-3 py-1.5 text-sm leading-snug">
                          Switch when this period ends
                        </SubmitButton>
                      </form>
                    )
                  ) : canPay ? (
                    <Link href={`/dashboard/license?plan=${id}#renew`} className={`${direction > 0 ? btn.primary : btn.secondary} h-9 w-full px-3 text-sm`}>
                      {direction > 0 && currentId ? (
                        <>
                          <Icon name="upgrade" size={18} />
                          Upgrade to {plan.name}
                        </>
                      ) : (
                        `Choose ${plan.name}`
                      )}
                    </Link>
                  ) : (
                    <a href={contact.whatsappUrl} className={`${btn.secondary} h-9 w-full px-3 text-sm`}>
                      Ask us on WhatsApp
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {payable.length ? (
        <section id="renew" aria-labelledby="h-pay" className="flex scroll-mt-6 flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 id="h-pay" className="m-0 text-lg font-bold">
              {state === "pending" ? "Pay by card" : state === "expired" ? "Renew by card" : "Extend by card or change plan"}
            </h2>
            <p className="m-0 text-sm text-muted">
              {state === "pending"
                ? `The payment activates ${appLabel(app)} on the plan you choose. Your other apps keep their own plans.`
                : "Paying for your current plan adds its period to the end of this app's plan, so no days are lost. Your other apps keep their own plans."}
            </p>
          </div>
          <PlanPaymentForm key={selected ?? "none"} plans={notes} current={selected} cta={state === "pending" ? "Pay and activate" : "Pay by card"} appId={app?.id ?? null} />
        </section>
      ) : null}

      {plugin ? (
      <section aria-labelledby="h-plugin" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-plugin" className="m-0 text-lg font-bold">
          WordPress plugin
        </h2>
        {release ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold">Yallapp plugin {release.version}</span>
              <span className="text-[13px] text-muted">
                Requires WordPress {release.requiresWp} and PHP {release.requiresPhp} · released {formatDate(release.createdAt)}
              </span>
            </div>
            {state === "active" ? (
              <a href="/api/dashboard/plugin" className={`${btn.primary} h-11`}>
                <Icon name="download" size={20} />
                Download plugin
              </a>
            ) : (
              <span className="text-sm text-muted">Downloads need an active plan.</span>
            )}
          </div>
        ) : (
          <p className="m-0 text-[15px] text-muted">The plugin download appears here as soon as it&apos;s published.</p>
        )}
        <p className="m-0 text-sm text-muted">
          After you install it, the plugin updates itself from WordPress like any other plugin. See{" "}
          <Link href="/docs/wordpress-plugin">Install the plugin</Link> and <Link href="/docs/wordpress-license">Activate your license</Link>.
        </p>
      </section>
      ) : null}
    </>
  );
}
