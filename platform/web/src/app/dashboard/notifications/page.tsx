import { plansIn } from "@/lib/marketing-lang";
import type { Metadata } from "next";
import Link from "next/link";
import { cancelScheduledNotificationAction, removeServiceAccountAction } from "@/app/actions/notifications";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, formatDateTime, Notice } from "@/components/ui";
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
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("notify.title")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {t("notify.fromSite")} <Link href="/dashboard/setup">{t("notify.backToSetup")}</Link>
        </p>
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
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("notify.title")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("notify.intro", { count: customers })}</p>
      </div>
      {/* 85.2 Campaigns: to some of the customers, with a picture, a page to open and a weekly time. */}
      <Link href="/dashboard/notifications/campaigns" className="flex max-w-[620px] items-center gap-3 rounded-2xl border border-line bg-white p-4 no-underline hover:border-midnight">
        <Icon name="campaign" size={24} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[16px] font-bold text-midnight">{t("campaigns.open")}</span>
          <span className="text-[14px] text-ink-4">{t("campaigns.openText")}</span>
        </span>
        <Icon name="chevron_right" size={20} className="rtl:rotate-180" />
      </Link>
      {ended ? (
        <div className="max-w-[620px]">
          <Notice tone="warn" icon="warning" role="status">
            {k(PLAN_ENDED_MESSAGE)} <Link href="/dashboard/license">{t("notify.renewPlan")}</Link>
          </Notice>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="h-send" className="flex min-w-0 flex-[1_1_440px] flex-col gap-[18px] rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-send" className="m-0 text-lg font-bold">
            {t("notify.newNotification")}
          </h2>
          <SendNotificationForm titleMax={NOTIFICATION_TITLE_MAX} bodyMax={NOTIFICATION_BODY_MAX} zone={zoneName} today={today} />
        </section>

        <section aria-labelledby="h-push" className="flex min-w-0 flex-[1_1_320px] flex-col gap-[14px] rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-push" className="m-0 text-lg font-bold">
            {t("notify.push")}
          </h2>
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
        </section>
      </div>

      {kinds.length ? (
        <section aria-labelledby="h-auto" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-auto" className="m-0 text-lg font-bold">
            {t("campaigns.autoTitle")}
          </h2>
          <p className="m-0 text-[15px] text-ink-4">{t("campaigns.autoIntro")}</p>
          <AutoNotificationsForm
            kinds={kinds.map((kind) => ({
              kind,
              on: autoOn(app, kind),
              label: t(`campaigns.auto_${kind}`),
              text: t(`campaigns.auto_${kind}_text`),
              numbers: t("campaigns.autoNumbers", { people: counts.get(`sent:${kind}`) ?? 0, opened: counts.get(`type:${kind}`) ?? 0 }),
            }))}
          />
        </section>
      ) : null}

      <section aria-labelledby="h-scheduled" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-scheduled" className="m-0 text-lg font-bold">
          {t("notify.scheduled")}
        </h2>
        {scheduled.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("notify.nothingScheduled", { zone: zoneName })}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {scheduled.map((n) => {
              const local = localSendAt(n, zone);
              return (
                <li key={n.id} className="flex flex-col gap-1 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[15px] font-bold">{n.title}</span>
                    {n.status === "scheduled" ? null : <Badge tone={n.status === "failed" ? "danger" : "warn"}>{t(n.status === "failed" ? "notify.statusFailed" : "notify.statusSending")}</Badge>}
                  </div>
                  <span className="text-[15px] text-ink-4">{n.body}</span>
                  <span className="text-[13px] text-muted">
                    {t("notify.goesOut", { date: formatDate(lang, n.sendAt, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: zone }), time: local.time })}
                  </span>
                  {n.result && n.status === "failed" ? <span className="text-[13px] text-danger">{k(n.result)}</span> : null}
                  {n.status === "scheduled" ? (
                    <div className="flex flex-col gap-2">
                      <details className="rounded-xl border border-line-soft px-3 py-2">
                        <summary className="cursor-pointer text-[15px] font-semibold">{richText(t("notify.edit", { title: n.title }), { sr: (chunk) => <span className="sr-only">{chunk}</span> })}</summary>
                        <EditScheduledForm item={{ id: n.id, title: n.title, body: n.body, date: local.date, time: local.time }} titleMax={NOTIFICATION_TITLE_MAX} bodyMax={NOTIFICATION_BODY_MAX} zone={zoneName} today={today} />
                      </details>
                      <form action={cancelScheduledNotificationAction}>
                        <input type="hidden" name="id" value={n.id} />
                        <SubmitButton variant="secondary" className="h-10" pendingText={t("common.saving")}>
                          {richText(t("notify.cancelScheduled", { title: n.title }), { sr: (chunk) => <span className="sr-only">{chunk}</span> })}
                        </SubmitButton>
                      </form>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="h-sent" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-sent" className="m-0 text-lg font-bold">
          {t("notify.sent")}
        </h2>
        {sent.length === 0 ? (
          <EmptyState icon="notifications" title={t("notify.nothingSent")}>
            {t("notify.nothingSentText")}
          </EmptyState>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {sent.map((n) => (
              <li key={n.id} className="flex flex-col gap-0.5 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                <span className="text-[15px] font-bold">{n.title}</span>
                <span className="text-[15px] text-ink-4">{n.body}</span>
                <span className="text-[13px] text-muted">{formatDateTime(n.createdAt, lang)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
