import type { Metadata } from "next";
import Link from "next/link";
import { cancelScheduledPlanAction, scheduleDowngradeAction } from "@/app/actions/billing";
import { releaseSiteAction } from "@/app/actions/dashboard";
import { CopyButton } from "@/components/copy-button";
import { Icon } from "@/components/icon";
import { SubmitButton } from "@/components/form";
import { Badge, Notice, PageHeader, btn, formatDate, formatDateTime } from "@/components/ui";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";
import { revealLicenseKey } from "@/lib/admin/clients";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";
import { encryptionKey } from "@/lib/env";
import { latestRelease } from "@/lib/license/service";
import { ACCOUNT_STATE_LABEL } from "@/lib/license/status";
import { comparePlans, formatStorage, hasFeature, isPlan, PLANS, planName, planPrice, type Plan, type PlanInfo } from "@/lib/plans";
import { packOffers, renewablePacks, renewalLabel } from "@/lib/media/packs";
import { cardPlanOptions } from "@/lib/billing/card-plans";
import { currentPlanId, planChangeFor, scheduledPlan } from "@/lib/billing/plan-change";
import { effectivePlans } from "@/lib/entitlements";
import { getSwitches } from "@/lib/switches";
import { PlanPaymentForm } from "@/components/plan-payment-form";
import { getPlans, platformSetting, yallappPlanAccount } from "@/lib/settings/platform";
import { priceView } from "@/lib/billing/display";
import { formatAmount } from "@/lib/billing/prices";
import { paymentWhat } from "@/lib/billing/receipt";
import { plansIn } from "@/lib/marketing-lang";
import { PROVIDER_NAME } from "@/lib/payments/provider";
import { getContact } from "@/lib/contact";
import { appLabel, licensePageName, usesPlugin } from "@/lib/app/label";
import { siteMatch, siteRunsLine } from "@/lib/app/site-match";

export async function generateMetadata(): Promise<Metadata> {
  const { app } = await requireClient("billing");
  return { title: (await dashboardText()).k(licensePageName(app)) };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-line-soft py-3 first:border-t-0">
      <dt className="w-[150px] flex-none text-sm text-muted">{label}</dt>
      <dd className="m-0 min-w-0 flex-1 text-[15px] font-semibold break-words">{children}</dd>
    </div>
  );
}

const SUPPORT_KEY = {
  email: "license.supportEmail",
  whatsapp: "license.supportWhatsapp",
  priority: "license.supportPriority",
  dedicated: "license.supportDedicated",
} as const;

/** The few lines that tell the tiers apart, on a plan card. */
function planLines(plan: PlanInfo, { t, num }: DashboardText): string[] {
  const { appUsers, languages, storageGb } = plan.limits;
  return [
    hasFeature(plan, "ios") ? t("license.lineAndroidIos") : t("license.lineAndroid"),
    appUsers === null ? t("license.lineUsersUnlimited") : t("license.lineUsers", { count: num(appUsers) }),
    languages === null ? t("license.lineLanguagesAll") : t("license.lineLanguages", { count: languages }),
    // 51
    storageGb === null ? t("license.lineStorageUnlimited") : t("license.lineStorage", { size: formatStorage(storageGb) }),
    hasFeature(plan, "page_editor") ? t("license.lineEditor") : t("license.lineTemplates"),
    hasFeature(plan, "auto_publish") ? t("license.lineWePublish") : t("license.lineYouPublish"),
    t(SUPPORT_KEY[plan.limits.support]),
  ];
}

export default async function LicensePage({ searchParams }: PageProps<"/dashboard/license">) {
  const contact = await getContact();
  const { license, state, app, apps, client } = await requireClient("billing");
  const text = await dashboardText();
  const { t, k, lang } = text;
  const date = (d: Date | null | undefined) => formatDate(d, lang);
  const { released, payment, plan: wanted, plan_change: planChange } = await searchParams;
  const store = await getStore();
  const now = new Date();
  // 56 The plans' default taglines in the dashboard's language (the website's translations).
  const plans = plansIn(lang, await getPlans(store));
  // 13.1 What each plan includes for apps (switches applied); prices from the admin.
  const effective = plansIn(lang, await effectivePlans(store));
  const currentId: Plan | null = license ? currentPlanId(license, now) : null;
  const scheduled = scheduledPlan(license, now);
  // 52 Paid into Yallapp's account with the gateway the team chose for plans (Kashier, in pounds); prices in the client's currency.
  const yallappAccount = await yallappPlanAccount(store, encryptionKey());
  const view = await priceView(store, client);
  const payable = yallappAccount ? cardPlanOptions(plans, await getSwitches(store), yallappAccount.provider, view) : [];
  // 52 This app's card payments, with their receipts (before the first app exists, the account's).
  const paid = (await store.listPlanPayments({ clientId: client.id, limit: 50 })).filter((p) => p.status === "paid" && p.appId === (app?.id ?? null)).slice(0, 20);
  // 13.3 What paying for each plan does: an upgrade starts today with the old days credited, a downgrade waits for the end of the period.
  const notes = payable.map((p) => {
    const info = plans[p.id];
    const change = planChangeFor(license, info, info.billingMonths, plans, now);
    const note =
      change.kind === "upgrade"
        ? change.creditDays
          ? t("license.noteUpgradeCredit", { days: change.creditDays, date: date(change.activeUntil) })
          : t("license.noteUpgrade", { date: date(change.activeUntil) })
        : change.kind === "downgrade"
          ? t("license.noteDowngrade", { start: date(change.nextPlanAt), date: date(change.activeUntil) })
          : change.kind === "renew" && state === "active"
            ? info.billingMonths === 1
              ? t("license.noteMonth", { date: date(change.activeUntil) })
              : t("license.noteYear", { date: date(change.activeUntil) })
            : null;
    return { ...p, period: p.period ? k(p.period) : null, charge: p.charge ? k(p.charge) : p.charge, note };
  });
  // 51 The app's storage packs renew with the plan, for each plan's months; 52 shown in the client's currency, charged with the plan.
  const packs = app && yallappAccount ? await store.listStoragePacks(app.id) : [];
  const offers = packs.length ? packOffers((await platformSetting(store, "storagePacks"))?.value) : [];
  const storageRenewal: Partial<Record<Plan, string>> = {};
  if (yallappAccount && packs.length) {
    for (const p of payable) {
      const renewal = renewablePacks(packs, offers, { provider: yallappAccount.provider, view, months: plans[p.id].billingMonths, now });
      if (renewal) storageRenewal[p.id] = k(renewalLabel(renewal));
    }
  }
  const selected = isPlan(wanted) ? wanted : (scheduled?.plan ?? currentId);
  const activation = license ? await store.getActivation(license.id) : null;
  const release = latestRelease(await store.listReleases());
  const key = license ? revealLicenseKey(license, encryptionKey()) : null;
  const active = state === "active";
  // Apps on the hosted API or their own API have no plugin: no website activation or plugin download to show.
  const plugin = usesPlugin(app);
  // 30 What the site runs, as its plugin reports it.
  const site = activation && app ? siteMatch(app, activation) : null;
  const name = appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app);
  const tags = {
    b: (chunk: string) => <strong className="text-ink-2">{chunk}</strong>,
    whatsapp: (chunk: string) => <a href={contact.whatsappUrl}>{chunk}</a>,
    install: (chunk: string) => <Link href={localePath(lang, "/docs/wordpress-plugin")}>{chunk}</Link>,
    activate: (chunk: string) => <Link href={localePath(lang, "/docs/wordpress-license")}>{chunk}</Link>,
  };

  return (
    <>
      <PageHeader
        title={k(licensePageName(app))}
        description={apps.length > 1 ? richText(t("license.manyApps", { app: name }), tags) : plugin ? t("license.pluginText") : t("license.planText")}
      />

      {released ? (
        <Notice tone="success" icon="check_circle" role="status">
          {t("license.released")}
        </Notice>
      ) : null}
      {payment === "paid" ? (
        <Notice tone="success" icon="check_circle" role="status">
          {t("license.paid", { date: date(license?.expiresAt) })}
        </Notice>
      ) : null}
      {payment === "failed" ? (
        <Notice tone="danger" icon="error" role="alert">
          {t("license.failed")}
        </Notice>
      ) : null}
      {payment === "pending" ? (
        <Notice icon="schedule" role="status">
          {t("license.pendingPayment")}
        </Notice>
      ) : null}
      {planChange === "scheduled" && scheduled ? (
        <Notice tone="success" icon="check_circle" role="status">
          {t("license.scheduledDone", { app: name, plan: effective[scheduled.plan].name, date: date(scheduled.at) })}
        </Notice>
      ) : null}
      {planChange === "kept" ? (
        <Notice tone="success" icon="check_circle" role="status">
          {t("license.kept", { app: name, plan: planName(currentId, effective) })}
        </Notice>
      ) : null}
      {planChange === "refused" || planChange === "switched" ? (
        <Notice tone="warn" icon="warning" role="alert">
          {planChange === "switched" ? t("license.switched") : t("license.refused")}
        </Notice>
      ) : null}
      {state === "pending" ? (
        <Notice tone="warn" icon="hourglass_top">
          {richText(payable.length ? t("license.notActivatedPay") : t("license.notActivated"), tags)}
        </Notice>
      ) : null}
      {state === "expired" ? (
        <Notice tone="warn" icon="warning">
          {richText(payable.length ? t("license.expiredPay", { date: date(license?.expiresAt) }) : t("license.expired", { date: date(license?.expiresAt) }), tags)}
        </Notice>
      ) : null}

      <section aria-labelledby="h-license" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="h-license" className="m-0 text-lg font-bold">
            {t("license.license")}
          </h2>
          <Badge tone={state === "active" ? "success" : state === "expired" ? "danger" : "warn"}>{k(ACCOUNT_STATE_LABEL[state])}</Badge>
        </div>
        {app ? <p className="m-0 text-sm text-muted">{richText(t("license.app", { app: name }), { b: (chunk) => <span className="font-semibold text-ink-2">{chunk}</span> })}</p> : null}
        {key ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-ivory px-4 py-3">
            <code dir="ltr" className="min-w-0 flex-1 font-mono text-lg font-bold tracking-wider break-all" aria-label={t("license.licenseKey")}>
              {key}
            </code>
            <CopyButton value={key} label={t("license.copyKey")} copiedLabel={t("common.copied")} />
          </div>
        ) : null}
        <dl className="m-0">
          <Row label={t("license.plan")}>
            {planName(currentId, effective)}
            {scheduled ? (
              <span className="block text-[13px] font-normal text-muted">{t("license.movesTo", { plan: effective[scheduled.plan].name, date: date(scheduled.at) })}</span>
            ) : null}
          </Row>
          <Row label={t("license.activeUntil")}>{date(license?.expiresAt)}</Row>
          {plugin || activation ? (
            <Row label={t("license.activatedOn")}>
              {activation ? (
                <span className="flex flex-col gap-0.5">
                  <bdi dir="ltr">{activation.siteUrl}</bdi>
                  <span className="text-[13px] font-normal text-muted">
                    {t("license.pluginCheck", { version: activation.pluginVersion ?? "", date: formatDateTime(activation.lastCheckedAt, lang) })}
                  </span>
                  {site?.reported ? <span className="text-[13px] font-normal text-muted">{k(siteRunsLine(site))}</span> : null}
                </span>
              ) : (
                <span className="font-normal text-muted">{t("license.notActivatedSite")}</span>
              )}
            </Row>
          ) : null}
        </dl>
        {activation ? (
          <form action={releaseSiteAction} className="flex flex-wrap items-center gap-3 border-t border-line-soft pt-4">
            <SubmitButton variant="secondary" className="h-10" pendingText={t("license.releasing")}>
              <Icon name="link_off" size={18} />
              {t("license.release")}
            </SubmitButton>
            <span className="text-[13px] text-muted">{t("license.releaseText")}</span>
          </form>
        ) : null}
      </section>

      <section id="change-plan" aria-labelledby="h-change-plan" className="flex scroll-mt-6 flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-change-plan" className="m-0 text-lg font-bold">
            {currentId ? t("license.changePlan") : t("license.plans")}
          </h2>
          <p className="m-0 text-sm text-muted">
            {active ? t("license.changeActive") : t("license.changeInactive")} <Link href={localePath(lang, "/pricing")}>{t("license.compare")}</Link>
          </p>
        </div>
        {scheduled && client.status !== "suspended" ? (
          <form action={cancelScheduledPlanAction} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ivory px-4 py-3">
            <input type="hidden" name="appId" value={app?.id ?? ""} />
            <span className="text-[15px]">{richText(t("license.movingTo", { plan: effective[scheduled.plan].name, date: date(scheduled.at) }), tags)}</span>
            <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
              {t("license.keep", { plan: planName(currentId, effective) })}
            </SubmitButton>
          </form>
        ) : null}
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr))]">
          {PLANS.map((id) => {
            const plan = effective[id];
            const shown = planPrice(plans[id], view);
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
                  {isCurrent ? (
                    <Badge tone="success">{t("license.currentPlan")}</Badge>
                  ) : scheduled?.plan === id ? (
                    <Badge tone="warn">{t("license.from", { date: date(scheduled.at) })}</Badge>
                  ) : null}
                </div>
                <span className="text-[15px] font-bold">
                  <bdi dir="ltr">{shown.price}</bdi>
                  {shown.period ? <span className="font-normal text-muted"> / {k(shown.period)}</span> : null}
                </span>
                <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px] text-ink-4">
                  {planLines(plan, text).map((line) => (
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
                          {t("license.switchAtEnd")}
                        </SubmitButton>
                      </form>
                    )
                  ) : canPay ? (
                    <Link href={`/dashboard/license?plan=${id}#renew`} className={`${direction > 0 ? btn.primary : btn.secondary} h-9 w-full px-3 text-sm`}>
                      {direction > 0 && currentId ? (
                        <>
                          <Icon name="upgrade" size={18} />
                          {t("license.upgradeTo", { plan: plan.name })}
                        </>
                      ) : (
                        t("license.choose", { plan: plan.name })
                      )}
                    </Link>
                  ) : (
                    <a href={contact.whatsappUrl} className={`${btn.secondary} h-9 w-full px-3 text-sm`}>
                      {t("license.askWhatsapp")}
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
              {state === "pending" ? t("license.payByCard") : state === "expired" ? t("license.renewByCard") : t("license.extend")}
            </h2>
            <p className="m-0 text-sm text-muted">{state === "pending" ? t("license.payPending", { app: name }) : t("license.payActive")}</p>
          </div>
          <PlanPaymentForm
            key={selected ?? "none"}
            plans={notes}
            current={selected}
            cta={state === "pending" ? t("license.payAndActivate") : t("license.payByCard")}
            appId={app?.id ?? null}
            provider={yallappAccount ? PROVIDER_NAME[yallappAccount.provider] : "iyzico"}
            storageRenewal={storageRenewal}
          />
        </section>
      ) : null}

      {paid.length ? (
        <section aria-labelledby="h-payments" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-payments" className="m-0 text-lg font-bold">
            {t("license.payments")}
          </h2>
          <ul className="m-0 flex list-none flex-col p-0">
            {paid.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft py-3 first:border-t-0">
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">
                    {k(paymentWhat(p, planName(p.plan, effective)))} · <bdi dir="ltr">{formatAmount(p.amountCents, p.currency)}</bdi>
                  </span>
                  <span className="text-[13px] text-muted">{t("license.paidOn", { date: date(p.paidAt ?? p.createdAt) })}</span>
                </span>
                <span className="flex flex-wrap gap-2">
                  <Link href={`/dashboard/license/receipts/${p.id}`} className={`${btn.secondary} h-9 px-3 text-sm`}>
                    <Icon name="receipt_long" size={18} />
                    {t("license.receipt")}
                  </Link>
                  {/* 71 The receipt as a PDF. */}
                  <a href={`/dashboard/license/receipts/${p.id}/pdf`} download className={`${btn.secondary} h-9 px-3 text-sm`}>
                    <Icon name="download" size={18} />
                    {t("license.downloadPdf")}
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {plugin ? (
        <section aria-labelledby="h-plugin" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-plugin" className="m-0 text-lg font-bold">
            {t("license.plugin")}
          </h2>
          {release ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px] font-bold">{t("license.pluginVersion", { version: release.version })}</span>
                <span className="text-[13px] text-muted">{t("license.requires", { wp: release.requiresWp, php: release.requiresPhp, date: date(release.createdAt) })}</span>
              </div>
              {state === "active" ? (
                // A file download from an API route, not a page.
                // eslint-disable-next-line @next/next/no-html-link-for-pages
                <a href="/api/dashboard/plugin" className={`${btn.primary} h-11`}>
                  <Icon name="download" size={20} />
                  {t("license.downloadPlugin")}
                </a>
              ) : (
                <span className="text-sm text-muted">{t("license.needsActive")}</span>
              )}
            </div>
          ) : (
            <p className="m-0 text-[15px] text-muted">{t("license.pluginSoon")}</p>
          )}
          <p className="m-0 text-sm text-muted">{richText(t("license.pluginUpdates"), tags)}</p>
        </section>
      ) : null}
    </>
  );
}
