import { plansIn } from "@/lib/marketing-lang";
import type { Metadata } from "next";
import Link from "next/link";
import { cancelScheduledNotificationAction, removeServiceAccountAction } from "@/app/actions/notifications";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { ItemList, ItemRow, LinkCards, Stat, StatRow, Thumb } from "@/components/page-kit";
import { Badge, btn, EmptyState, formatDateTime, Notice, PageHeader, Section } from "@/components/ui";
import { formatDate } from "@/i18n/format";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { getStore } from "@/lib/data";
import { encryptionKey } from "@/lib/env";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX, serviceAccountOf } from "@/lib/hosted/notify";
import { PLAN_ENDED_MESSAGE } from "@/lib/hosted/send-notification";
import { appIsActive } from "@/lib/license/status";
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
  const { t, k, lang } = await dashboardText();
  if (!app || app.backend !== "hosted") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
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
      </div>
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
  const upgrade = lowestPlanWith(plans, (p) => hasFeature(p, "push"), planId);
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

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and New campaign, the numbers, Campaigns, the form and push, then what's waiting and what went out. */}
      <PageHeader
        title={t("notify.title")}
        description={t("notify.intro", { count: customers })}
        actions={
          <Link href="/dashboard/notifications/campaigns/new" className={`${btn.main} h-11`}>
            <Icon name="campaign" size={20} />
            {t("campaigns.newCampaign")}
          </Link>
        }
      />
      {ended ? (
        <Notice tone="warn" icon="warning" role="status">
          {k(PLAN_ENDED_MESSAGE)} <Link href="/dashboard/license">{t("notify.renewPlan")}</Link>
        </Notice>
      ) : null}

      <StatRow label={t("notify.title")}>
        <Stat icon="groups" label={t("notify.statCustomers")} value={customers} />
        <Stat icon="schedule" tone="accent" label={t("notify.scheduled")} value={scheduled.length} />
        <Stat icon="notifications" tone={push && account ? "success" : "warn"} label={t("notify.push")} value={<span className="text-lg">{push && account ? t("notify.statPushOn") : t("notify.statPushOff")}</span>} />
      </StatRow>

      {/* 85.2 Campaigns: to some of the customers, with a picture, a page to open and a weekly time. */}
      <LinkCards label={t("notify.title")} items={[{ href: "/dashboard/notifications/campaigns", icon: "campaign", label: t("campaigns.open"), hint: t("campaigns.openText") }]} />

      <div className="flex flex-wrap items-start gap-6">
        <Section id="send" titleId="h-send" title={t("notify.newNotification")} className="flex-[1_1_440px]">
          <SendNotificationForm titleMax={NOTIFICATION_TITLE_MAX} bodyMax={NOTIFICATION_BODY_MAX} zone={zoneName} today={today} />
        </Section>

        <Section titleId="h-push" title={t("notify.push")} className="flex-[1_1_320px]">
          {push ? null : (
            <UpgradeHint title={t("notify.pushFeature")} to={upgrade} compact cta={upgrade ? t("overview.upgradeTo", { plan: upgrade.name }) : undefined}>
              {t("notify.inboxOnly")}
            </UpgradeHint>
          )}
          {account ? (
            <>
              <p className="m-0 flex items-center gap-2 text-[15px] font-semibold text-success">
                <Icon name="check_circle" size={20} filled />
                <span>{richText(t("notify.pushOn"), { project: () => <bdi dir="ltr">{account.project_id}</bdi> })}</span>
              </p>
              <form action={removeServiceAccountAction}>
                <SubmitButton variant="secondary" className="h-10">
                  {t("notify.removeKey")}
                </SubmitButton>
              </form>
            </>
          ) : (
            <>
              <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("notify.addKey")}</p>
              <ServiceAccountForm />
            </>
          )}
        </Section>
      </div>

      {kinds.length ? (
        <Section titleId="h-auto" title={t("campaigns.autoTitle")} description={t("campaigns.autoIntro")}>
          <AutoNotificationsForm
            kinds={kinds.map((kind) => ({
              kind,
              on: autoOn(app, kind),
              label: t(`campaigns.auto_${kind}`),
              text: t(`campaigns.auto_${kind}_text`),
              numbers: t("campaigns.autoNumbers", { people: counts.get(`sent:${kind}`) ?? 0, opened: counts.get(`type:${kind}`) ?? 0 }),
            }))}
          />
        </Section>
      ) : null}

      <Section titleId="h-scheduled" title={t("notify.scheduled")} flush>
        {scheduled.length === 0 ? (
          <p className="m-0 px-5 py-5 text-[15px] text-muted sm:px-6">{t("notify.nothingScheduled", { zone: zoneName })}</p>
        ) : (
          <ItemList>
            {scheduled.map((n, i) => {
              const local = localSendAt(n, zone);
              return (
                <li key={n.id} className="flex flex-col gap-2.5 border-t border-line-soft px-5 py-4 first:border-t-0 sm:px-6">
                  <div className="flex items-start gap-3.5">
                    <Thumb icon="schedule" shape="square" tint={i} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-bold">{n.title}</span>
                        {n.status === "scheduled" ? null : <Badge tone={n.status === "failed" ? "danger" : "warn"}>{t(n.status === "failed" ? "notify.statusFailed" : "notify.statusSending")}</Badge>}
                      </span>
                      <span className="text-[15px] text-ink-4">{n.body}</span>
                      <span className="text-[13px] font-semibold text-muted">
                        {t("notify.goesOut", { date: formatDate(lang, n.sendAt, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: zone }), time: local.time })}
                      </span>
                      {n.result && n.status === "failed" ? <span className="text-[13px] text-danger">{k(n.result)}</span> : null}
                    </div>
                  </div>
                  {n.status === "scheduled" ? (
                    <div className="flex flex-col gap-2 ps-[58px] max-sm:ps-0">
                      <details className="rounded-xl border border-line-soft bg-sand px-3 py-2">
                        <summary className="cursor-pointer text-[15px] font-semibold">{richText(t("notify.edit", { title: n.title }), { sr: (chunk) => <span className="sr-only">{chunk}</span> })}</summary>
                        <EditScheduledForm item={{ id: n.id, title: n.title, body: n.body, date: local.date, time: local.time }} titleMax={NOTIFICATION_TITLE_MAX} bodyMax={NOTIFICATION_BODY_MAX} zone={zoneName} today={today} />
                      </details>
                      <form action={cancelScheduledNotificationAction}>
                        <input type="hidden" name="id" value={n.id} />
                        <SubmitButton variant="secondary" className="h-9 px-3.5 text-sm" pendingText={t("common.saving")}>
                          {richText(t("notify.cancelScheduled", { title: n.title }), { sr: (chunk) => <span className="sr-only">{chunk}</span> })}
                        </SubmitButton>
                      </form>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ItemList>
        )}
      </Section>

      <Section titleId="h-sent" title={t("notify.sent")} flush>
        {sent.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="notifications" title={t("notify.nothingSent")}>
              {t("notify.nothingSentText")}
            </EmptyState>
          </div>
        ) : (
          <ItemList>
            {sent.map((n, i) => (
              <ItemRow key={n.id} media={<Thumb icon="notifications" shape="square" tint={i} />} title={n.title} meta={n.body} aside={<span className="text-[13px] text-muted">{formatDateTime(n.createdAt, lang)}</span>} />
            ))}
          </ItemList>
        )}
      </Section>
    </div>
  );
}
