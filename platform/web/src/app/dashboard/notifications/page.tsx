import { plansIn } from "@/lib/marketing-lang";
import type { Metadata } from "next";
import Link from "next/link";
import { cancelScheduledNotificationAction, removeServiceAccountAction } from "@/app/actions/notifications";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { LinkCards } from "@/components/page-kit";
import { formatDateTime } from "@/components/ui";
import { KitEmpty, KitFold, KitHeader, KitHero, KitList, KitNext, KitPage, KitRow, KitSection, KitSettingRow, KitSettings, KitStat, KitStatus, KitThumb, kit } from "@/components/studio-page";
import { formatDate } from "@/i18n/format";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { getStore } from "@/lib/data";
import { encryptionKey } from "@/lib/env";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX, serviceAccountOf } from "@/lib/hosted/notify";
import { PLAN_ENDED_MESSAGE } from "@/lib/hosted/send-notification";
import { appIsActive } from "@/lib/license/status";
import { isStudioProject } from "@/lib/studio/section";
import { AutoNotificationsForm, EditScheduledForm, ServiceAccountForm, SendNotificationForm } from "./forms";
import { autoKindsFor, autoOn } from "@/lib/hosted/auto-notifications";
import { dayOf } from "@/lib/analytics/days";
import { appZone, zoneLabel } from "@/lib/analytics/zone";
import { utcToLocal } from "@/lib/bookings/time";
import { LISTED_STATUSES, localSendAt } from "@/lib/hosted/scheduled-notifications";
import { UpgradeHint } from "@/components/upgrade";
import { currentPlanId } from "@/lib/billing/plan-change";
import { effectivePlans } from "@/lib/entitlements";
import { hasFeature, lowestPlanWith } from "@/lib/plans";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("notify.title") };
}

/** Notifications for apps on the hosted API. Apps on WordPress send them from the plugin. */
export default async function NotificationsPage() {
  const { app, license, client } = await requireClient("notifications");
  const { t, k, lang, num } = await dashboardText();
  if (!app || app.backend !== "hosted") {
    return (
      <KitPage>
        <KitHeader
          icon="notifications"
          title={t("notify.title")}
          description={
            <>
              {t("notify.fromSite")} <Link href="/dashboard/setup">{t("notify.backToSetup")}</Link>
            </>
          }
        />
        {/* 85.4 Campaigns go through the WordPress site. */}
        {app?.backend === "wordpress" ? (
          <LinkCards label={t("notify.title")} items={[{ href: "/dashboard/notifications/campaigns", icon: "campaign", label: t("campaigns.open"), hint: t("campaigns.wordpressAudience") }]} />
        ) : null}
      </KitPage>
    );
  }
  const store = await getStore();
  const [customers, sent, scheduled, zone] = await Promise.all([
    store.countHostedUsers(app.id),
    store.listHostedBroadcasts(app.id, 20),
    store.listScheduledNotifications(app.id, [...LISTED_STATUSES]),
    appZone(store, app),
  ]);
  // 61 Send later: dates and times in the app's time zone (Analytics').
  const now = new Date();
  const today = utcToLocal(now, zone).date;
  const zoneName = zoneLabel(zone, now);
  const account = serviceAccountOf(app, encryptionKey());
  // 13.1 Push comes with the plan; without it, notifications still reach the app's inbox.
  const plans = plansIn(lang, await effectivePlans(store));
  const planId = license ? currentPlanId(license, new Date()) : null;
  const push = planId ? hasFeature(plans[planId], "push") : false;
  // 132.59 A Studio project without a plan yet is offered Studio's plans, never the regular ones.
  const upgrade = lowestPlanWith(plans, (p) => hasFeature(p, "push"), planId, isStudioProject(app) ? "studio" : undefined);
  // 68 Nothing goes out once the app's plan has ended (lib/hosted/send-notification.ts).
  const ended = !appIsActive(license, client, now);
  // 85.3 The automatic ones: on or off, and the last 30 days' people and opens.
  const kinds = autoKindsFor(app);
  const counts = new Map<string, number>();
  if (kinds.length) {
    for (const row of await store.listAnalyticsDaily(app.id, dayOf(new Date(now.getTime() - 30 * 86_400_000), zone), dayOf(now, zone), ["auto_sent", "push_open"])) {
      const key = row.metric === "auto_sent" ? `sent:${row.key}` : row.key;
      counts.set(key, (counts.get(key) ?? 0) + row.value);
    }
  }

  const onCount = kinds.filter((kind) => autoOn(app, kind)).length;
  const pushOn = push && account !== null;
  const sr = { sr: (chunk: string) => <span className="sr-only">{chunk}</span> };

  // 132.139 The premium kit: the header with New campaign (Campaigns beside it), the numbers in one hero card with what stops notifications as its next step, the form, push and the automatic ones as settings rows, then what's waiting and what went out.
  return (
    <KitPage>
      <KitHeader
        icon="notifications"
        title={t("notify.title")}
        description={t("notify.intro", { count: customers })}
        actions={
          <>
            {/* 85.2 Campaigns: to some of the customers, with a picture, a page to open and a weekly time. */}
            <Link href="/dashboard/notifications/campaigns" className={kit.ghost} title={t("campaigns.openText")}>
              <Icon name="campaign" size={20} />
              {t("campaigns.open")}
            </Link>
            <Link href="/dashboard/notifications/campaigns/new" className={kit.main}>
              <Icon name="add" size={20} />
              {t("campaigns.newCampaign")}
            </Link>
          </>
        }
      />

      <KitHero
        label={t("notify.title")}
        stats={
          <>
            <KitStat icon="groups" label={t("notify.statCustomers")} value={num(customers)} />
            <KitStat icon="schedule" tone="accent" label={t("notify.scheduled")} value={num(scheduled.length)} />
            <KitStat icon="notifications" tone={pushOn ? "success" : "warn"} label={t("notify.push")} value={<span className="text-[19px] leading-snug tracking-normal">{pushOn ? t("notify.statPushOn") : t("notify.statPushOff")}</span>} />
          </>
        }
        next={
          ended ? (
            <KitNext icon="warning" tone="warn">
              {/* 132.59 An app that never had a plan isn't told its plan has ended. */}
              <span role="status">
                {license ? (
                  <>
                    {k(PLAN_ENDED_MESSAGE)} <Link href="/dashboard/license">{t("notify.renewPlan")}</Link>
                  </>
                ) : (
                  <>
                    {t("studioKit.notifyNotActive")} <Link href="/dashboard/license">{t("studioKit.seePlan")}</Link>
                  </>
                )}
              </span>
            </KitNext>
          ) : push && !account ? (
            <KitNext
              icon="notifications"
              action={
                <a href="#h-push" className={kit.quiet}>
                  {t("studioPage.notifyAddKey")}
                </a>
              }
            >
              {t("studioPage.notifyPushOff")}
            </KitNext>
          ) : undefined
        }
      />

      <KitSection id="send" titleId="h-send" title={t("notify.newNotification")}>
        <SendNotificationForm titleMax={NOTIFICATION_TITLE_MAX} bodyMax={NOTIFICATION_BODY_MAX} zone={zoneName} today={today} />
      </KitSection>

      <KitSettings>
        <KitSettingRow
          titleId="h-push"
          icon="notifications"
          title={t("notify.push")}
          status={pushOn ? <KitStatus tone="success">{t("notify.statPushOn")}</KitStatus> : <KitStatus tone="neutral">{t("notify.statPushOff")}</KitStatus>}
          description={account ? richText(t("notify.pushOn"), { project: () => <bdi dir="ltr">{account.project_id}</bdi> }) : push ? t("notify.addKey") : t("notify.inboxOnly")}
          action={
            account ? (
              <form action={removeServiceAccountAction}>
                <SubmitButton variant="pill" className="h-9">
                  {t("notify.removeKey")}
                </SubmitButton>
              </form>
            ) : undefined
          }
        >
          {push ? null : (
            <UpgradeHint title={t("notify.pushFeature")} to={upgrade} compact cta={upgrade ? t("overview.upgradeTo", { plan: upgrade.name }) : undefined}>
              {t("notify.inboxOnly")}
            </UpgradeHint>
          )}
          {account ? null : (
            <KitFold icon="key" summary={t("studioPage.notifyAddKey")} data-fold="push-key">
              <ServiceAccountForm />
            </KitFold>
          )}
        </KitSettingRow>

        {kinds.length ? (
          <KitSettingRow
            titleId="h-auto"
            icon="campaign"
            title={t("campaigns.autoTitle")}
            status={<KitStatus tone={onCount ? "success" : "neutral"}>{t("studioPage.onOf", { on: onCount, total: kinds.length })}</KitStatus>}
            help={t("campaigns.autoIntro")}
            helpLabel={t("studioPage.helpSection")}
          >
            <KitFold icon="tune" summary={t("studioPage.notifyAutoOpen")} data-fold="auto">
              <AutoNotificationsForm
                kinds={kinds.map((kind) => ({
                  kind,
                  on: autoOn(app, kind),
                  label: t(`campaigns.auto_${kind}`),
                  text: t(`campaigns.auto_${kind}_text`),
                  numbers: t("campaigns.autoNumbers", { people: counts.get(`sent:${kind}`) ?? 0, opened: counts.get(`type:${kind}`) ?? 0 }),
                }))}
              />
            </KitFold>
          </KitSettingRow>
        ) : null}
      </KitSettings>

      <KitSection titleId="h-scheduled" title={t("notify.scheduled")} flush>
        {scheduled.length === 0 ? (
          <p className="m-0 px-5 pb-5 text-[15px] text-(--sp-muted) sm:px-8">{t("notify.nothingScheduled", { zone: zoneName })}</p>
        ) : (
          <KitList>
            {scheduled.map((n) => {
              const local = localSendAt(n, zone);
              return (
                <li key={n.id} className="flex flex-col gap-3 border-t border-(--sp-line-soft) px-3 py-4 first:border-t-0 sm:px-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <KitThumb icon="schedule" />
                    <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold text-(--sp-ink)">{n.title}</span>
                        {n.status === "scheduled" ? null : <KitStatus tone={n.status === "failed" ? "danger" : "warn"}>{t(n.status === "failed" ? "notify.statusFailed" : "notify.statusSending")}</KitStatus>}
                      </span>
                      <span className="text-sm text-(--sp-muted)">{n.body}</span>
                      <span className="text-[13px] font-semibold text-(--sp-ink)">
                        {t("notify.goesOut", { date: formatDate(lang, n.sendAt, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: zone }), time: local.time })}
                      </span>
                      {n.result && n.status === "failed" ? <span className="text-[13px] text-danger">{k(n.result)}</span> : null}
                    </div>
                    {n.status === "scheduled" ? (
                      <form action={cancelScheduledNotificationAction} className="max-sm:ms-16">
                        <input type="hidden" name="id" value={n.id} />
                        <SubmitButton variant="pill" className="h-9" pendingText={t("common.saving")}>
                          {richText(t("notify.cancelScheduled", { title: n.title }), sr)}
                        </SubmitButton>
                      </form>
                    ) : null}
                  </div>
                  {n.status === "scheduled" ? (
                    <div className="sm:ps-16">
                      <KitFold icon="edit" summary={richText(t("notify.edit", { title: n.title }), sr)}>
                        <EditScheduledForm item={{ id: n.id, title: n.title, body: n.body, date: local.date, time: local.time }} titleMax={NOTIFICATION_TITLE_MAX} bodyMax={NOTIFICATION_BODY_MAX} zone={zoneName} today={today} />
                      </KitFold>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </KitList>
        )}
      </KitSection>

      <KitSection titleId="h-sent" title={t("notify.sent")} flush>
        {sent.length === 0 ? (
          <KitEmpty icon="notifications" title={t("notify.nothingSent")}>
            {t("notify.nothingSentText")}
          </KitEmpty>
        ) : (
          <KitList>
            {sent.map((n) => (
              <KitRow key={n.id} media={<KitThumb icon="send" />} title={n.title} meta={n.body} aside={<span className="text-[13px] text-(--sp-muted)">{formatDateTime(n.createdAt, lang)}</span>} />
            ))}
          </KitList>
        )}
      </KitSection>
    </KitPage>
  );
}
