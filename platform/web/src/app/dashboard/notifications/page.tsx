import { plansIn } from "@/lib/marketing-lang";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { cancelScheduledNotificationAction, removeServiceAccountAction } from "@/app/actions/notifications";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { KitCallout, KitDrawer, KitEmpty, KitFold, KitHeader, KitHero, KitList, KitMore, KitNext, KitPage, KitRow, KitSection, KitSettingRow, KitSettings, KitStat, KitStatus, KitThumb, kit } from "@/components/studio-page";
import { KitInspectorBody, KitInspectorFacts, KitInspectorHead } from "@/components/studio-page/parts";
import { KitTable, type KitTableRow } from "@/components/studio-page/table";
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
  const { t, k, lang, num, date } = await dashboardText();
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
          <KitSection titleId="h-campaigns" title={t("notify.title")} flush>
            <KitList>
              <KitRow href="/dashboard/notifications/campaigns" media={<KitThumb icon="campaign" />} title={t("campaigns.open")} meta={t("campaigns.wordpressAudience")} />
            </KitList>
          </KitSection>
        ) : null}
      </KitPage>
    );
  }
  const store = await getStore();
  const [customers, sent, scheduled, zone] = await Promise.all([
    store.countHostedUsers(app.id),
    store.listHostedBroadcasts(app.id, 50),
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
  const close = t("common.close");
  const more = t("studioPage.more");

  // 132.160 What went out in the last 30 days and how many opened it: the phones each one reached, and the phones that opened it (Analytics' numbers).
  const pushed = new Map<string, number>();
  const opens = new Map<string, number>();
  for (const row of await store.listAnalyticsDaily(app.id, dayOf(new Date(now.getTime() - 90 * 86_400_000), zone), dayOf(now, zone), ["push_sent", "push_open"])) {
    if (row.metric === "push_sent") pushed.set(row.key, (pushed.get(row.key) ?? 0) + row.value);
    else if (row.key.startsWith("id:")) opens.set(row.key.slice(3), (opens.get(row.key.slice(3)) ?? 0) + row.value);
  }
  const month = now.getTime() - 30 * 86_400_000;
  const recent = sent.filter((n) => n.createdAt.getTime() >= month);
  const reached = recent.reduce((sum, n) => sum + (pushed.get(String(n.id)) ?? 0), 0);
  const opened = recent.reduce((sum, n) => sum + (opens.get(String(n.id)) ?? 0), 0);
  const rate = (open: number, of: number) => (of > 0 ? Math.min(1, open / of) : null);
  const percent = (value: number | null) => (value === null ? "—" : t("notify.openRate", { percent: num(Math.round(value * 100)) }));
  const whenSent = (d: Date) => date(d, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone });

  const sentRows: KitTableRow[] = sent.map((n) => {
    const id = String(n.id);
    const phones = pushed.get(id) ?? 0;
    const opensOf = opens.get(id) ?? 0;
    const icon = n.targeted ? "campaign" : n.data?.type ? "notifications" : "send";
    return {
      id,
      name: n.title,
      text: `${n.title} ${n.body}`,
      data: { "data-notification": id },
      cells: [
        <>
          <KitThumb icon={icon} size={40} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[14.5px] font-bold" dir="auto">
              {n.title}
            </span>
            <span className="truncate text-[12.5px] font-normal text-(--sp-muted)" dir="auto">
              {n.body}
            </span>
          </span>
        </>,
        <span key="w" className="text-[13px]">
          {whenSent(n.createdAt)}
        </span>,
        <span key="p" className="font-sans tabular-nums">
          {num(phones)}
        </span>,
        <span key="o" className="font-sans font-semibold tabular-nums">
          {num(opensOf)}
        </span>,
      ],
      inspector: {
        title: t("notify.notification"),
        body: (
          <KitInspectorBody data-inspector-notification={n.title}>
            <KitInspectorHead
              media={
                n.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- the campaign's own picture, a full address
                  <img src={n.imageUrl} alt="" className="block aspect-[16/9] w-full rounded-[14px] bg-(--sp-soft) object-cover" />
                ) : undefined
              }
              icon={icon}
              title={n.title}
              line={whenSent(n.createdAt)}
              badges={n.targeted ? <KitStatus tone="info">{t("notify.toAudience")}</KitStatus> : <KitStatus tone="neutral">{t("notify.toEveryone")}</KitStatus>}
            />
            <p className="m-0 rounded-[14px] bg-(--sp-soft) px-4 py-3 text-[14.5px] leading-relaxed whitespace-pre-wrap text-(--sp-ink)" dir="auto">
              {n.body}
            </p>
            <KitInspectorFacts
              facts={[
                [t("notify.colSent"), whenSent(n.createdAt)],
                [t("notify.to"), n.targeted ? t("notify.toAudience") : t("notify.toEveryone")],
                [t("notify.reached"), num(phones)],
                [t("notify.opened"), num(opensOf)],
                [t("notify.openRateLabel"), percent(rate(opensOf, phones))],
                ...(n.link ? ([[t("notify.opens"), <bdi key="l" dir="ltr" className="break-all">{n.link}</bdi>]] as [string, ReactNode][]) : []),
              ]}
            />
            {n.targeted ? (
              <Link href="/dashboard/notifications/campaigns" className="text-[13.5px] font-semibold">
                {t("campaigns.open")}
              </Link>
            ) : null}
          </KitInspectorBody>
        ),
      },
    };
  });

  const scheduledRows: KitTableRow[] = scheduled.map((n) => {
    const local = localSendAt(n, zone);
    const goes = t("notify.goesOut", { date: formatDate(lang, n.sendAt, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: zone }), time: local.time });
    const state = n.status === "scheduled" ? <KitStatus tone="info">{t("notify.scheduled")}</KitStatus> : <KitStatus tone={n.status === "failed" ? "danger" : "warn"}>{t(n.status === "failed" ? "notify.statusFailed" : "notify.statusSending")}</KitStatus>;
    return {
      id: String(n.id),
      name: n.title,
      data: { "data-scheduled": String(n.id) },
      cells: [
        <>
          <KitThumb icon="schedule" size={40} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[14.5px] font-bold" dir="auto">
              {n.title}
            </span>
            <span className="truncate text-[12.5px] font-normal text-(--sp-muted)" dir="auto">
              {n.body}
            </span>
          </span>
        </>,
        <span key="g" className="text-[13px]">
          {goes}
        </span>,
        <span key="s">{state}</span>,
      ],
      inspector: {
        title: t("notify.scheduled"),
        body: (
          <KitInspectorBody data-inspector-scheduled={n.title}>
            <KitInspectorHead icon="schedule" title={n.title} line={goes} badges={state} />
            {n.result && n.status === "failed" ? <KitCallout tone="danger" icon="error">{k(n.result)}</KitCallout> : null}
            {n.status === "scheduled" ? (
              <>
                <EditScheduledForm item={{ id: n.id, title: n.title, body: n.body, date: local.date, time: local.time }} titleMax={NOTIFICATION_TITLE_MAX} bodyMax={NOTIFICATION_BODY_MAX} zone={zoneName} today={today} />
                <form action={cancelScheduledNotificationAction} className="border-t border-(--sp-line) pt-4">
                  <input type="hidden" name="id" value={n.id} />
                  <SubmitButton variant="pill" className="h-9 text-danger hover:text-danger" pendingText={t("common.saving")}>
                    {richText(t("notify.cancelScheduled", { title: n.title }), sr)}
                  </SubmitButton>
                </form>
              </>
            ) : (
              <p className="m-0 rounded-[14px] bg-(--sp-soft) px-4 py-3 text-[14.5px] leading-relaxed whitespace-pre-wrap text-(--sp-ink)" dir="auto">
                {n.body}
              </p>
            )}
          </KitInspectorBody>
        ),
      },
    };
  });

  // 132.160 The console's look: New notification as the main action (Campaigns behind "⋯"), what went out and was opened as tiles, what waits and what went out as tables (a notification's details in the inspector), then push and the automatic ones as settings rows.
  return (
    <KitPage>
      <KitHeader
        icon="notifications"
        title={t("notify.title")}
        description={t("notify.intro", { count: customers })}
        actions={
          <>
            {/* 85.2 Campaigns: to some of the customers, with a picture, a page to open and a weekly time. */}
            <KitMore label={more}>
              <Link href="/dashboard/notifications/campaigns" className={kit.menuItem} title={t("campaigns.openText")}>
                <Icon name="campaign" size={18} />
                {t("campaigns.open")}
              </Link>
              <Link href="/dashboard/notifications/campaigns/new" className={kit.menuItem}>
                <Icon name="add" size={18} />
                {t("campaigns.newCampaign")}
              </Link>
            </KitMore>
            <KitDrawer
              title={t("notify.newNotification")}
              closeLabel={close}
              triggerClassName={kit.main}
              trigger={
                <>
                  <Icon name="add" size={20} />
                  {t("notify.newNotification")}
                </>
              }
            >
              <SendNotificationForm titleMax={NOTIFICATION_TITLE_MAX} bodyMax={NOTIFICATION_BODY_MAX} zone={zoneName} today={today} />
            </KitDrawer>
          </>
        }
      />

      <KitHero
        label={t("notify.title")}
        stats={
          <>
            <KitStat icon="send" label={t("notify.sent")} value={num(recent.length)} hint={reached ? t("notify.reachedPhones", { count: reached }) : t("notify.last30")} progress={rate(opened, reached) ?? undefined} />
            <KitStat icon="touch_app" tone="accent" label={t("notify.opened")} value={num(opened)} hint={percent(rate(opened, reached))} />
            <KitStat icon="schedule" label={t("notify.scheduled")} value={num(scheduled.length)} />
            <KitStat icon="groups" label={t("notify.statCustomers")} value={num(customers)} />
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
                  {t("notify.addKeyAction")}
                </a>
              }
            >
              {t("notify.pushOffLine")}
            </KitNext>
          ) : undefined
        }
      />

      <KitTable
        label={t("notify.scheduled")}
        title={t("notify.scheduled")}
        titleId="h-scheduled"
        columns={[
          { label: t("notify.notification"), width: "minmax(0,1fr)" },
          { label: t("notify.goesOutCol"), width: "minmax(180px,auto)", phone: "sub" },
          { label: t("common.status"), width: "minmax(100px,auto)", phone: "end" },
        ]}
        rows={scheduledRows}
        empty={<p className="m-0 px-5 py-4 text-[14px] text-(--sp-muted)">{t("notify.nothingScheduled", { zone: zoneName })}</p>}
      />

      <KitTable
        label={t("notify.sent")}
        title={t("notify.sent")}
        titleId="h-sent"
        search={sent.length > 5 ? t("notify.search") : undefined}
        noMatch={t("notify.noMatch")}
        columns={[
          { label: t("notify.notification"), width: "minmax(0,1fr)" },
          { label: t("notify.colSent"), width: "170px", wide: true },
          { label: t("notify.reached"), width: "80px", wide: true },
          { label: t("notify.opened"), width: "80px", phone: "end" },
        ]}
        rows={sentRows}
        empty={
          <KitEmpty icon="notifications" title={t("notify.nothingSent")}>
            {t("notify.nothingSentText")}
          </KitEmpty>
        }
      />

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
            <KitFold icon="key" summary={t("notify.addKeyAction")} data-fold="push-key">
              <ServiceAccountForm />
            </KitFold>
          )}
        </KitSettingRow>

        {kinds.length ? (
          <KitSettingRow
            titleId="h-auto"
            icon="campaign"
            title={t("campaigns.autoTitle")}
            status={<KitStatus tone={onCount ? "success" : "neutral"}>{t("notify.onOf", { on: onCount, total: kinds.length })}</KitStatus>}
            help={t("campaigns.autoIntro")}
            helpLabel={t("studioPage.helpSection")}
          >
            <KitFold icon="tune" summary={t("notify.autoOpen")} data-fold="auto">
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
    </KitPage>
  );
}
