import type { Metadata } from "next";
import Link from "next/link";
import { cancelScheduledPlanAction, scheduleDowngradeAction } from "@/app/actions/billing";
import { releaseSiteAction } from "@/app/actions/dashboard";
import { CopyButton } from "@/components/copy-button";
import { Icon } from "@/components/icon";
import { SubmitButton } from "@/components/form";
import { btn, formatDate, formatDateTime } from "@/components/ui";
import { KitCallout, KitFact, KitFacts, KitHeader, KitHero, KitList, KitNext, KitPage, KitRow, KitSection, KitSettingRow, KitSettings, KitStatus, KitThumb, kit } from "@/components/studio-page";
import { localePath } from "@/i18n/paths";
import { richText } from "@/i18n/rich";
import { countryName } from "@/lib/account/country";
import { revealLicenseKey } from "@/lib/admin/clients";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";
import { encryptionKey } from "@/lib/env";
import { latestRelease } from "@/lib/license/service";
import { ACCOUNT_STATE_LABEL } from "@/lib/license/status";
import { comparePlans, formatStorage, hasFeature, isPlan, lowestPlanWith, planFeaturesFor, planName, planOffered, planPrice, plansInOrder, plansOfFamily, STUDIO_ONLY_FEATURES, lifetimeNoteOf, limitDefName, cleanLimitDefs, formatLimit, mainPeriodOf, type Plan, type PlanInfo, type PlanLimitDef } from "@/lib/plans";
import { isLifetimeEnd, isPeriodKey, paymentMonthsOf, PERIOD_KEYS, type PeriodKey } from "@/lib/billing/periods";
import { cardPeriods, startingPeriod } from "@/lib/billing/card-plans";
import { lifetimeLocked } from "@/lib/billing/plan-change";
import { LifetimeOffer } from "@/components/lifetime-offer";
import { packOffers, renewablePacks, renewalLabel } from "@/lib/media/packs";
import { cardPlanOptions } from "@/lib/billing/card-plans";
import { currentPlanId, planChangeFor, scheduledPlan } from "@/lib/billing/plan-change";
import { appPlan, effectivePlans } from "@/lib/entitlements";
import { getSwitches } from "@/lib/switches";
import { PlanPaymentForm } from "@/components/plan-payment-form";
import { analyticsEventsKeepText, analyticsKeepText } from "@/components/plan-cards";
import { addonsPath, licensePath } from "@/lib/studio/section";
import { getPlans, platformSetting, yallappPlanAccount } from "@/lib/settings/platform";
import { priceView } from "@/lib/billing/display";
import { formatAmount } from "@/lib/billing/prices";
import { paymentWhat } from "@/lib/billing/receipt";
import { planFor, plansIn } from "@/lib/marketing-lang";
import { planUsage } from "@/lib/billing/usage";
import { appStorage } from "@/lib/media/usage";
import { wordsOf } from "@/lib/app/kinds";
import { UsageSection, type AccountAppRow } from "./usage";
import { PROVIDER_NAME } from "@/lib/payments/provider";
import { getVisitorContact } from "@/lib/contact";
import { appLabel, licensePageName, usesPlugin } from "@/lib/app/label";
import { siteMatch, siteRunsLine } from "@/lib/app/site-match";

export async function generateMetadata(): Promise<Metadata> {
  const { app } = await requireClient("billing");
  return { title: (await dashboardText()).k(licensePageName(app)) };
}

const SUPPORT_KEY = {
  email: "license.supportEmail",
  whatsapp: "license.supportWhatsapp",
  priority: "license.supportPriority",
  dedicated: "license.supportDedicated",
} as const;

/** The few lines that tell the tiers apart, on a plan card; 133 with its page limit and the team's own limits. */
function planLines(plan: PlanInfo, { t, num, lang }: DashboardText, limitDefs: PlanLimitDef[] = []): string[] {
  const { appUsers, languages, storageGb, analyticsMonths } = plan.limits;
  const extra = limitDefs.filter((d) => plan.extraLimits && d.id in plan.extraLimits).map((d) => t("license.lineExtra", { name: limitDefName(d, lang), value: formatLimit(plan.extraLimits![d.id] ?? null, t("license.unlimited")) }));
  return [
    hasFeature(plan, "ios") ? t("license.lineAndroidIos") : t("license.lineAndroid"),
    appUsers === null ? t("license.lineUsersUnlimited") : t("license.lineUsers", { count: num(appUsers) }),
    languages === null ? t("license.lineLanguagesAll") : t("license.lineLanguages", { count: languages }),
    // 51
    storageGb === null ? t("license.lineStorageUnlimited") : t("license.lineStorage", { size: formatStorage(storageGb) }),
    // 72 How long the app's analytics are kept.
    analyticsMonths === null
      ? t("license.lineAnalyticsForever", { days: analyticsEventsKeepText(lang) })
      : t("license.lineAnalytics", { kept: analyticsKeepText(lang, analyticsMonths), days: analyticsEventsKeepText(lang) }),
    hasFeature(plan, "page_editor") ? t("license.lineEditor") : hasFeature(plan, "page_editor_basic") ? t("license.lineEditorBasic") : t("license.lineTemplates"),
    hasFeature(plan, "auto_publish") ? t("license.lineWePublish") : t("license.lineYouPublish"),
    // 77
    ...(hasFeature(plan, "chat") ? [t("license.lineChat")] : []),
    // 133
    ...(typeof plan.limits.pages === "number" ? [t("license.linePages", { count: plan.limits.pages })] : []),
    ...extra,
    t(SUPPORT_KEY[plan.limits.support]),
  ];
}

export default async function LicensePage({ searchParams }: PageProps<"/dashboard/license">) {
  const contact = await getVisitorContact();
  const { license, state, app, apps, client, licenses } = await requireClient("billing");
  const text = await dashboardText();
  const { t, k, lang } = text;
  const date = (d: Date | null | undefined) => formatDate(d, lang);
  const { released, payment, plan: wanted, plan_change: planChange, period: wantedPeriod } = await searchParams;
  // 133 The period the client looks at on the plan cards (and starts the payment form on).
  const askedPeriod: PeriodKey | null = isPeriodKey(wantedPeriod) ? wantedPeriod : null;
  const store = await getStore();
  const now = new Date();
  // 56 The plans' default taglines in the dashboard's language (the website's translations).
  const plans = plansIn(lang, await getPlans(store));
  // 13.1 What each plan includes for apps (switches applied); prices from the admin.
  const effective = plansIn(lang, await effectivePlans(store));
  const currentId: Plan | null = license ? currentPlanId(license, now) : null;
  const scheduled = scheduledPlan(license, now);
  // 94.1 What you pay for: the plan's limits, what this app uses, what it includes; the account's apps and their plans.
  // 133 With the app's add-ons: their limits are what the app may use.
  const currentPlan = currentId && license ? planFor(lang, (await appPlan(store, license, now)) ?? effective[currentId]) : null;
  const usage = app
    ? await (async () => {
        const hosted = app.backend === "hosted";
        const [users, layout, storage] = await Promise.all([hosted ? store.countHostedUsers(app.id) : 0, store.getAppLayout(app.id), appStorage(store, app, effective, now)]);
        const content = layout?.published ?? layout?.draft;
        const languages = content?.languages.available.length ?? 1;
        const studio = app.section === "studio";
        const pages = { used: content ? (studio ? content.pages.filter((p) => p.studio).length : content.pages.length) : 0, studio };
        return planUsage({ plan: currentPlan, hosted, appUsers: users, languages, storage, pages });
      })()
    : [];
  // 103R A Studio project is on a Studio plan, a regular app on a regular one: each sees its own family's plans and features.
  const family = app?.section === "studio" ? "studio" : "regular";
  const features = app ? planFeaturesFor(wordsOf(app).cardPayments).filter((f) => family === "studio" || !STUDIO_ONLY_FEATURES.includes(f.id)) : [];
  // 52 Paid into Yallapp's account with the gateway the team chose for plans (Kashier, in pounds); prices in the client's currency.
  const yallappAccount = await yallappPlanAccount(store, encryptionKey());
  const view = await priceView(store, client);
  const priceOf = (id: Plan) => {
    const shown = planPrice(plans[id], view);
    return shown.period ? `${shown.price} / ${k(shown.period)}` : shown.price;
  };
  const accountApps: AccountAppRow[] = apps.map((a) => {
    const l = licenses.find((x) => x.appId === a.id) ?? null;
    const id = l ? currentPlanId(l, now) : null;
    return { id: a.id, name: appLabel(a) === "Untitled app" ? k("Untitled app") : appLabel(a), plan: id ? planName(id, effective) : null, until: l ? date(l.expiresAt) : null, price: id ? priceOf(id) : null, current: a.id === app?.id };
  });
  // 133 A lifetime plan is changed by the team: nothing to pay for here.
  const locked = lifetimeLocked(license);
  const payable = yallappAccount && !locked ? cardPlanOptions(plans, await getSwitches(store), yallappAccount.provider, view, family, currentId) : [];
  const extras = (await platformSetting(store, "planExtras"))?.value ?? null;
  const limitDefs = cleanLimitDefs(extras);
  // 52 This app's card payments, with their receipts (before the first app exists, the account's).
  const paid = (await store.listPlanPayments({ clientId: client.id, limit: 50 })).filter((p) => p.status === "paid" && p.appId === (app?.id ?? null)).slice(0, 20);
  // 13.3 What paying for each plan does: an upgrade starts today with the old days credited, a downgrade waits for the end of the period.
  // 133 For each period the plan offers (a lifetime one is "for life").
  const noteFor = (info: PlanInfo, months: number) => {
    const change = planChangeFor(license, info, months, plans, now);
    const until = isLifetimeEnd(change.activeUntil) ? t("license.forLife") : date(change.activeUntil);
    return change.kind === "upgrade"
      ? change.creditDays
        ? t("license.noteUpgradeCredit", { days: change.creditDays, date: until })
        : t("license.noteUpgrade", { date: until })
      : change.kind === "downgrade"
        ? t("license.noteDowngrade", { start: date(change.nextPlanAt), date: until })
        : change.kind === "renew" && state === "active"
          ? months === 1
            ? t("license.noteMonth", { date: until })
            : months === 12
              ? t("license.noteYear", { date: until })
              : t("license.noteUntil", { date: until })
          : null;
  };
  const notes = payable.map((p) => {
    const info = plans[p.id];
    return {
      ...p,
      period: p.period ? k(p.period) : null,
      charge: p.charge ? k(p.charge) : p.charge,
      note: noteFor(info, info.billingMonths),
      periods: p.periods?.map((x) => ({ ...x, charge: x.charge ? k(x.charge) : x.charge, note: noteFor(info, paymentMonthsOf(x.key)) })),
    };
  });
  // 51 The app's storage packs renew with the plan, for each plan's months; 52 shown in the client's currency, charged with the plan.
  const packs = app && yallappAccount ? await store.listStoragePacks(app.id) : [];
  const offers = packs.length ? packOffers((await platformSetting(store, "storagePacks"))?.value) : [];
  const storageRenewal: Partial<Record<string, string>> = {};
  if (yallappAccount && packs.length) {
    for (const p of payable) {
      // 133 Each period but lifetime: a pack runs month by month.
      for (const x of p.periods ?? []) {
        if (x.key === "lifetime") continue;
        const renewal = renewablePacks(packs, offers, { provider: yallappAccount.provider, view, months: paymentMonthsOf(x.key), now });
        if (renewal) storageRenewal[`${p.id}:${x.key}`] = k(renewalLabel(renewal));
      }
    }
  }
  const selected = isPlan(wanted) ? wanted : (scheduled?.plan ?? currentId);
  // 133 The plan cards in the team's order, each with its periods; the period switcher offers each period one of them has.
  const shownIds = plansInOrder(plansOfFamily(family), plans).filter((id) => planOffered(plans[id]) || id === currentId);
  const cardPeriodsOf = new Map(shownIds.map((id) => [id, cardPeriods(plans[id], view)]));
  const periodsOffered = PERIOD_KEYS.filter((key) => shownIds.some((id) => cardPeriodsOf.get(id)!.some((p) => p.key === key)));
  const mainCounts = new Map<PeriodKey, number>();
  for (const id of shownIds) {
    const main = startingPeriod({ periods: cardPeriodsOf.get(id), period: planPrice(plans[id], view).period }, null);
    if (main) mainCounts.set(main, (mainCounts.get(main) ?? 0) + 1);
  }
  const cardsPeriod: PeriodKey | null =
    askedPeriod && periodsOffered.includes(askedPeriod) ? askedPeriod : ([...mainCounts.entries()].sort((a, b) => b[1] - a[1] || PERIOD_KEYS.indexOf(a[0]) - PERIOD_KEYS.indexOf(b[0]))[0]?.[0] ?? null);
  // 133 The plans sold for life, for the lifetime card.
  const lifetimePlans = shownIds.filter((id) => planOffered(plans[id]) && cardPeriodsOf.get(id)!.some((p) => p.key === "lifetime"));
  const periodWord = (key: PeriodKey) => t(`license.period${key === "lifetime" ? "Lifetime" : key}`);
  const activation = license ? await store.getActivation(license.id) : null;
  const release = latestRelease(await store.listReleases());
  // Apps on the hosted API or their own API have no plugin: no website activation or plugin download to show,
  // and (75) no license key: only an app on WordPress uses it.
  const plugin = usesPlugin(app);
  const key = license && plugin ? revealLicenseKey(license, encryptionKey()) : null;
  const active = state === "active";
  // 30 What the site runs, as its plugin reports it.
  const site = activation && app ? siteMatch(app, activation) : null;
  const name = appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app);
  const tags = {
    b: (chunk: string) => <strong className="text-ink-2">{chunk}</strong>,
    whatsapp: (chunk: string) => <a href={contact.whatsappUrl}>{chunk}</a>,
    install: (chunk: string) => <Link href={localePath(lang, "/docs/wordpress-plugin")}>{chunk}</Link>,
    activate: (chunk: string) => <Link href={localePath(lang, "/docs/wordpress-license")}>{chunk}</Link>,
  };

  const payTitle = state === "pending" ? t("license.payByCard") : state === "expired" ? t("license.renewByCard") : t("license.extend");
  const stateTone = state === "active" ? "success" : state === "expired" ? "danger" : "warn";
  // 132.134 The premium kit: the header with paying as its one main action, the plan in one hero card with its next step,
  // what it includes, changing it, paying, then the payments; every long explanation behind "?".
  return (
    <KitPage>
      <KitHeader
        icon="workspace_premium"
        title={k(licensePageName(app))}
        description={apps.length > 1 ? richText(t(plugin ? "license.manyApps" : "license.manyAppsPlan", { app: name }), tags) : plugin ? t("license.pluginText") : t("license.planText")}
        actions={
          payable.length ? (
            <a href="#renew" className={kit.main}>
              <Icon name="credit_card" size={20} />
              {state === "pending" ? t("license.payByCard") : t("license.renewByCard")}
            </a>
          ) : null
        }
      />

      {released ? (
        <KitCallout tone="success" icon="check_circle" role="status">
          {t("license.released")}
        </KitCallout>
      ) : null}
      {payment === "paid" ? (
        <KitCallout tone="success" icon="check_circle" role="status">
          {t("license.paid", { date: date(license?.expiresAt) })}
        </KitCallout>
      ) : null}
      {payment === "failed" ? (
        <KitCallout tone="danger" icon="error" role="alert">
          {t("license.failed")}
        </KitCallout>
      ) : null}
      {payment === "pending" ? (
        <KitCallout icon="schedule" role="status">
          {t("license.pendingPayment")}
        </KitCallout>
      ) : null}
      {planChange === "scheduled" && scheduled ? (
        <KitCallout tone="success" icon="check_circle" role="status">
          {t("license.scheduledDone", { app: name, plan: effective[scheduled.plan].name, date: date(scheduled.at) })}
        </KitCallout>
      ) : null}
      {planChange === "kept" ? (
        <KitCallout tone="success" icon="check_circle" role="status">
          {t("license.kept", { app: name, plan: planName(currentId, effective) })}
        </KitCallout>
      ) : null}
      {planChange === "refused" || planChange === "switched" ? (
        <KitCallout tone="warn" icon="warning" role="alert">
          {planChange === "switched" ? t("license.switched") : t("license.refused")}
        </KitCallout>
      ) : null}

      {/* The plan at a glance: its state, what it is and until when, and the one next step. */}
      <KitHero
        titleId="h-license"
        heading={plugin ? t("license.license") : t("license.plan")}
        status={<KitStatus tone={stateTone}>{k(ACCOUNT_STATE_LABEL[state])}</KitStatus>}
        description={app ? richText(t("license.app", { app: name }), { b: (chunk) => <span className="font-semibold text-(--sp-ink)">{chunk}</span> }) : undefined}
        next={
          state === "pending" ? (
            <KitNext icon="hourglass_top" tone="warn">
              {richText(t(plugin ? (payable.length ? "license.notActivatedPay" : "license.notActivated") : payable.length ? "license.notActivatedPayPlan" : "license.notActivatedPlan"), tags)}
            </KitNext>
          ) : state === "expired" ? (
            <KitNext icon="warning" tone="warn">
              {richText(
                t(plugin ? (payable.length ? "license.expiredPay" : "license.expired") : payable.length ? "license.expiredPayPlan" : "license.expiredPlan", { date: date(license?.expiresAt) }),
                tags,
              )}
            </KitNext>
          ) : activation ? (
            <form action={releaseSiteAction} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
              <span className="min-w-0 flex-[1_1_260px] text-sm text-(--sp-muted)">{t("license.releaseText")}</span>
              <SubmitButton variant="secondary" className="h-10" pendingText={t("license.releasing")}>
                <Icon name="link_off" size={18} />
                {t("license.release")}
              </SubmitButton>
            </form>
          ) : undefined
        }
      >
        {key ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-(--sp-soft) px-4 py-3">
            <code dir="ltr" className="min-w-0 flex-1 font-mono text-lg font-bold tracking-wider break-all" aria-label={t("license.licenseKey")}>
              {key}
            </code>
            <CopyButton value={key} label={t("license.copyKey")} copiedLabel={t("common.copied")} />
          </div>
        ) : null}
        <KitFacts columns>
          <KitFact stacked label={t("license.plan")}>
            <span className="text-[24px] leading-tight tracking-[-0.3px] sm:text-[26px]">{currentId ? planName(currentId, effective) : t("overview.noPlan")}</span>
            {scheduled ? <span className="mt-1 block text-[13px] font-normal text-(--sp-muted)">{t("license.movesTo", { plan: effective[scheduled.plan].name, date: date(scheduled.at) })}</span> : null}
          </KitFact>
          {/* 133 A lifetime plan never ends. */}
          <KitFact stacked label={t("license.activeUntil")}>
            {isLifetimeEnd(license?.expiresAt) ? t("license.forLife") : date(license?.expiresAt)}
          </KitFact>
          {plugin || activation ? (
            <KitFact stacked label={t("license.activatedOn")}>
              {activation ? (
                <span className="flex flex-col gap-0.5">
                  <bdi dir="ltr" className="text-[15px]">
                    {activation.siteUrl}
                  </bdi>
                  <span className="text-[13px] font-normal text-(--sp-muted)">
                    {t("license.pluginCheck", { version: activation.pluginVersion ?? "", date: formatDateTime(activation.lastCheckedAt, lang) })}
                  </span>
                  {site?.reported ? <span className="text-[13px] font-normal text-(--sp-muted)">{k(siteRunsLine(site))}</span> : null}
                </span>
              ) : (
                <span className="text-[15px] font-normal text-(--sp-muted)">{t("license.notActivatedSite")}</span>
              )}
            </KitFact>
          ) : null}
        </KitFacts>
      </KitHero>

      {app ? (
        <UsageSection
          text={text}
          intro={
            currentId
              ? t("license.usageIntro", { plan: planName(currentId, effective), app: appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app), price: priceOf(currentId) })
              : t("license.usageNoPlan")
          }
          rows={usage}
          analyticsMonths={currentPlan ? currentPlan.limits.analyticsMonths : undefined}
          included={currentPlan ? features.filter((f) => hasFeature(currentPlan, f.id)).map((f) => k(f.label)) : []}
          more={features.flatMap((f) => {
            if (hasFeature(currentPlan, f.id)) return [];
            const to = lowestPlanWith(effective, (p) => hasFeature(p, f.id), currentId, family);
            return to ? [{ label: k(f.label), plan: to.name }] : [];
          })}
          apps={accountApps}
        />
      ) : null}

      <KitSection
        id="change-plan"
        titleId="h-change-plan"
        title={currentId ? t("license.changePlan") : t("license.plans")}
        description={
          // 73 The account's country decides the currency shown (52.9).
          <span data-country={client.country ?? ""}>
            {richText(client.country ? t("license.pricesFor", { country: countryName(client.country, lang) }) : t("license.pricesHere"), {
              account: (chunk) => <Link href="/dashboard/account#h-country">{chunk}</Link>,
            })}
          </span>
        }
        help={
          <>
            {active ? t("license.changeActive") : t("license.changeInactive")}{" "}
            {/* 103R The pricing page shows the regular plans only. */}
            {family === "regular" ? <Link href={localePath(lang, "/pricing")}>{t("license.compare")}</Link> : null}
          </>
        }
        helpLabel={t("studioPage.helpSection")}
      >
        {scheduled && client.status !== "suspended" ? (
          <form action={cancelScheduledPlanAction} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-(--sp-soft) px-4 py-3">
            <input type="hidden" name="appId" value={app?.id ?? ""} />
            <span className="text-[15px]">{richText(t("license.movingTo", { plan: effective[scheduled.plan].name, date: date(scheduled.at) }), tags)}</span>
            <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
              {t("license.keep", { plan: planName(currentId, effective) })}
            </SubmitButton>
          </form>
        ) : null}
        {/* 133 How long to pay for: the cards show the period's price, what it comes to per month and the saving. */}
        {periodsOffered.length > 1 ? (
          <nav aria-label={t("license.periodsLabel")} className="flex w-fit max-w-full flex-wrap gap-1 rounded-2xl bg-(--sp-soft) p-1" data-period-tabs="">
            {periodsOffered.map((key) => (
              <Link
                key={key}
                href={licensePath(app, `?period=${key}#change-plan`)}
                scroll={false}
                aria-current={key === cardsPeriod ? "true" : undefined}
                data-period={key}
                className={`flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold no-underline transition-colors ${
                  key === cardsPeriod
                    ? "bg-(--sp-surface) text-(--sp-ink) shadow-[0_1px_3px_rgba(14,13,36,0.12)] hover:text-(--sp-ink)"
                    : "text-(--sp-muted) hover:text-(--sp-ink)"
                } ${key === "lifetime" && key === cardsPeriod ? "ring-1 ring-ember/60" : ""}`}
              >
                {key === "lifetime" ? <Icon name="diamond" size={16} filled className="text-ember" /> : null}
                {periodWord(key)}
              </Link>
            ))}
          </nav>
        ) : null}
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(250px,100%),1fr))]">
          {shownIds.map((id) => {
            const plan = effective[id];
            const periods = cardPeriodsOf.get(id)!;
            const shownPeriod = periods.find((p) => p.key === cardsPeriod) ?? null;
            const shown = shownPeriod ? { price: shownPeriod.price, period: shownPeriod.unit } : planPrice(plans[id], view);
            const isCurrent = id === currentId;
            const direction = currentId ? comparePlans(currentId, id, plans) : 1;
            const canPay = payable.some((p) => p.id === id);
            // The period chosen on the cards, when it isn't the plan's main one (the form starts there anyway).
            const periodQuery = shownPeriod && shownPeriod.key !== mainPeriodOf(plans[id]) ? `&period=${shownPeriod.key}` : "";
            return (
              <div
                key={id}
                data-plan={id}
                className={`flex flex-col gap-3 rounded-3xl p-5 ${isCurrent ? "bg-(--sp-soft) ring-1 ring-(--sp-line)" : "border border-(--sp-edge) bg-(--sp-surface)"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <bdi className="text-[17px] font-bold">{plan.name}</bdi>
                  {isCurrent ? (
                    <KitStatus tone="success">{t("license.currentPlan")}</KitStatus>
                  ) : scheduled?.plan === id ? (
                    <KitStatus tone="warn">{t("license.from", { date: date(scheduled.at) })}</KitStatus>
                  ) : null}
                </div>
                <span className="text-[22px] leading-tight font-bold tracking-[-0.3px]">
                  <bdi dir="ltr">{shown.price}</bdi>
                  {shown.period ? <span className="text-sm font-normal tracking-normal text-(--sp-muted)"> / {k(shown.period)}</span> : null}
                </span>
                {shownPeriod?.perMonth || shownPeriod?.saving ? (
                  <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-(--sp-muted)" data-per-month="">
                    {shownPeriod.perMonth ? <bdi>{t("license.perMonthIs", { price: shownPeriod.perMonth })}</bdi> : null}
                    {shownPeriod.saving ? <span className="rounded-full bg-success-bg px-2 py-0.5 font-bold text-success">{t("license.save", { percent: shownPeriod.saving })}</span> : null}
                  </span>
                ) : null}
                <ul className="m-0 flex list-none flex-col gap-1.5 border-t border-(--sp-line-soft) p-0 pt-3 text-[13px] text-(--sp-muted)">
                  {planLines(plan, text, limitDefs).map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <Icon name="check" size={16} className="mt-px text-success" />
                      {/* 133 A limit the team named in English keeps its order on an Arabic page. */}
                      <bdi className="min-w-0">{line}</bdi>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-1">
                  {isCurrent ? null : active && direction < 0 && !locked ? (
                    scheduled?.plan === id ? null : (
                      <form action={scheduleDowngradeAction}>
                        <input type="hidden" name="appId" value={app?.id ?? ""} />
                        <input type="hidden" name="plan" value={id} />
                        <SubmitButton variant="secondary" className="min-h-10 w-full px-3 py-1.5 text-sm leading-snug">
                          {t("license.switchAtEnd")}
                        </SubmitButton>
                      </form>
                    )
                  ) : canPay ? (
                    <Link href={licensePath(app, `?plan=${id}${periodQuery}#renew`)} className={`${direction > 0 ? btn.primary : btn.secondary} h-10 w-full px-3 text-sm`}>
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
                    <a href={contact.whatsappUrl} className={`${kit.quiet} w-full`}>
                      {t("license.askWhatsapp")}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </KitSection>

      {/* 133 Sold for life: its own card, dark with ember, to stand out. */}
      {lifetimePlans.length && !locked ? (
        <LifetimeOffer
          eyebrow={t("license.lifetimeEyebrow")}
          title={t("license.lifetimeTitle")}
          text={t("license.lifetimeText")}
          noteTitle={t("license.lifetimeNoteTitle")}
          note={lifetimeNoteOf(extras, lang) ?? t("license.lifetimeNote")}
          headingLevel={2}
          plans={lifetimePlans.map((id) => ({
            id,
            name: effective[id].name,
            price: cardPeriodsOf.get(id)!.find((p) => p.key === "lifetime")!.price,
            once: t("license.payOnce"),
            includes: planLines(effective[id], text).slice(0, 6),
            cta: payable.some((p) => p.id === id)
              ? { href: licensePath(app, `?plan=${id}&period=lifetime#renew`), label: t("license.lifetimeChoose", { plan: effective[id].name }) }
              : { href: contact.whatsappUrl, label: t("license.askWhatsapp") },
          }))}
        />
      ) : null}

      {locked ? (
        <KitCallout icon="diamond" role="status">
          {richText(t("license.lifetimeLocked"), tags)}
        </KitCallout>
      ) : null}

      {payable.length ? (
        <KitSection id="renew" titleId="h-pay" title={payTitle} description={state === "pending" ? t("license.payPending", { app: name }) : t("license.payActive")}>
          <PlanPaymentForm
            key={`${selected ?? "none"}:${askedPeriod ?? ""}`}
            plans={notes}
            current={selected}
            currentPeriod={askedPeriod}
            cta={state === "pending" ? t("license.payAndActivate") : t("license.payByCard")}
            appId={app?.id ?? null}
            provider={yallappAccount ? PROVIDER_NAME[yallappAccount.provider] : "iyzico"}
            storageRenewal={storageRenewal}
          />
        </KitSection>
      ) : null}

      {/* 133 Add-ons for the app, 71 the payments with their receipts, and the plugin: short rows. */}
      {app && license ? (
        <KitSettings>
          <KitSettingRow
            titleId="h-addons-link"
            icon="widgets"
            title={t("addons.title")}
            description={t("addons.planLink")}
            action={
              <Link href={addonsPath(app)} className={kit.quiet}>
                {t("addons.open")}
              </Link>
            }
          />
        </KitSettings>
      ) : null}

      {paid.length ? (
        <KitSection titleId="h-payments" title={t("license.payments")} flush>
          <KitList>
            {paid.map((p) => (
              <KitRow
                key={p.id}
                media={<KitThumb icon="receipt_long" size={40} />}
                title={
                  <>
                    {k(paymentWhat(p, planName(p.plan, effective)))} · <bdi dir="ltr">{formatAmount(p.amountCents, p.currency)}</bdi>
                  </>
                }
                meta={t("license.paidOn", { date: date(p.paidAt ?? p.createdAt) })}
                actions={
                  <>
                    <Link href={licensePath(app, `/receipts/${p.id}`)} className={kit.ghost}>
                      <Icon name="receipt_long" size={18} />
                      {t("license.receipt")}
                    </Link>
                    {/* 71 The receipt as a PDF. */}
                    <a href={`/dashboard/license/receipts/${p.id}/pdf`} download className={kit.ghost}>
                      <Icon name="download" size={18} />
                      {t("license.downloadPdf")}
                    </a>
                  </>
                }
              />
            ))}
          </KitList>
        </KitSection>
      ) : null}

      {plugin ? (
        <KitSection titleId="h-plugin" title={t("license.plugin")} help={richText(t("license.pluginUpdates"), tags)} helpLabel={t("studioPage.helpSection")}>
          {release ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px] font-bold">{t("license.pluginVersion", { version: release.version })}</span>
                <span className="text-[13px] text-(--sp-muted)">{t("license.requires", { wp: release.requiresWp, php: release.requiresPhp, date: date(release.createdAt) })}</span>
              </div>
              {state === "active" ? (
                // A file download from an API route, not a page.
                // eslint-disable-next-line @next/next/no-html-link-for-pages
                <a href="/api/dashboard/plugin" className={`${btn.primary} h-11`}>
                  <Icon name="download" size={20} />
                  {t("license.downloadPlugin")}
                </a>
              ) : (
                <span className="text-sm text-(--sp-muted)">{t("license.needsActive")}</span>
              )}
            </div>
          ) : (
            <p className="m-0 text-[15px] text-(--sp-muted)">{t("license.pluginSoon")}</p>
          )}
        </KitSection>
      ) : null}
    </KitPage>
  );
}
