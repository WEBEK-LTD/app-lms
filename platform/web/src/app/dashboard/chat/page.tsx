import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { keepAllChatsAction, resolveChatReportAction } from "@/app/actions/chat";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, Notice, PageHeader, Section } from "@/components/ui";
import { UpgradeHint } from "@/components/upgrade";
import type { DashKey } from "@/i18n/dashboard";
import { appLabel } from "@/lib/app/label";
import { contextCan, requireClient } from "@/lib/auth/session";
import { chatGroupsOn, chatSessionKind, chatSettingsOf, planHasChat } from "@/lib/chat/access";
import { dashboardChatDeps } from "@/lib/chat/dashboard";
import { ownerConversations, ownerReports, type OwnerMessageView } from "@/lib/chat/owner";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { appPlan, effectivePlans } from "@/lib/entitlements";
import { plansIn } from "@/lib/marketing-lang";
import { hasFeature, lowestPlanWith } from "@/lib/plans";
import { AutoRefresh } from "../orders/refresh";
import { ChatSettingsForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("chat.title") };
}
export const dynamic = "force-dynamic";

const WHEN: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" };
const VIEWS = ["all", "unread", "direct", "group", "reports"] as const;
type View = (typeof VIEWS)[number];
const ATTACHMENT: Record<"image" | "video" | "audio" | "file", DashKey> = { image: "chat.photo", video: "chat.video", audio: "chat.voice", file: "chat.file" };

/**
 * 77 Dashboard › Chat: the people using the app and, in an academy, its
 * course groups; the reports; keeping messages another year; the switches.
 */
export default async function ChatPage({ searchParams }: PageProps<"/dashboard/chat">) {
  const context = await requireClient("chat");
  const { app, license } = context;
  if (!app) redirect("/dashboard/app-type");
  const { t, k, lang, date } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const name = appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app);
  const plan = await appPlan(store, license, now);
  const settings = chatSettingsOf(app);
  const canSettings = contextCan(context, "settings");
  const header = <PageHeader title={t("chat.title")} description={t("chat.intro", { app: name })} />;
  const settingsSection = canSettings ? (
    <Section id="settings" title={t("chat.settings")} titleId="h-chat-settings" description={t("chat.settingsIntro")}>
      <ChatSettingsForm enabled={settings.enabled} courseGroups={settings.courseGroups} academy={app.appType === "lms"} />
    </Section>
  ) : null;

  // The app can't have chat, or not on this plan, or the owner turned it off.
  if (!chatSessionKind(app)) {
    return (
      <>
        {header}
        <Notice icon="info">{t("chat.notHere")}</Notice>
      </>
    );
  }
  if (!planHasChat(plan)) {
    const plans = plansIn(lang, await effectivePlans(store));
    const to = lowestPlanWith(plans, (p) => hasFeature(p, "chat"), plan?.id ?? null);
    return (
      <>
        {header}
        {to ? (
          <UpgradeHint title={t("chat.upgradeTitle", { plan: to.name })} to={{ id: to.id, name: to.name }} cta={t("overview.upgradeTo", { plan: to.name })}>
            {t("chat.upgradeText")}
          </UpgradeHint>
        ) : (
          <Notice icon="info">{t("chat.noPlan")}</Notice>
        )}
      </>
    );
  }
  if (!settings.enabled) {
    return (
      <>
        {header}
        <Notice tone="warn" icon="info">
          {canSettings ? t("chat.turnedOff") : t("chat.settingsOnly")}
        </Notice>
        {settingsSection}
      </>
    );
  }

  const query = await searchParams;
  const groups = chatGroupsOn(app);
  const view: View = VIEWS.find((v) => v === query.view && (v !== "group" || groups)) ?? "all";
  const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const deps = dashboardChatDeps(store, app, plan, now);
  const reports = view === "reports" ? await Promise.all([ownerReports(deps, app, "open"), ownerReports(deps, app, "closed")]) : null;
  const inbox = await ownerConversations(deps, app, { kind: view === "direct" || view === "group" ? view : undefined, unread: view === "unread", q, limit: 200 });
  const when = (iso: string) => t("listings.utc", { time: date(new Date(iso), WHEN) });
  const day = (iso: string) => date(new Date(`${iso}T00:00:00Z`));
  const preview = (m: OwnerMessageView | null) => {
    if (!m) return "";
    const text = m.deleted ? t("chat.deleted") : (m.text ?? (m.attachment ? t(ATTACHMENT[m.attachment.kind]) : ""));
    return m.sender.kind === "business" ? t("chat.you", { text }) : groups && m.sender.member_id ? `${m.sender.name}: ${text}` : text;
  };
  const tab = (v: View, label: string) => (
    <Link
      key={v}
      href={v === "all" ? "/dashboard/chat" : `/dashboard/chat?view=${v}`}
      aria-current={view === v ? "page" : undefined}
      className={`rounded-[10px] px-3.5 py-2 text-[15px] no-underline ${view === v ? "bg-midnight font-bold text-white hover:text-white" : "border border-line bg-white text-midnight hover:text-midnight"}`}
    >
      {label}
    </Link>
  );

  const reportItem = (r: Awaited<ReturnType<typeof ownerReports>>["items"][number], actions: boolean) => (
    <li key={r.id} className="flex flex-col gap-2 border-t border-line-soft px-5 py-4 first:border-t-0 sm:px-6">
      <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
        <Icon name="flag" size={16} />
        {t("chat.reportedBy", { name: r.reporter.name, conversation: r.conversation_title || t("chat.group") })} · {t(`chat.reasons.${r.reason}` as DashKey)} · {when(r.created_at)}
        {r.outcome ? <Badge tone="neutral">{t(`chat.outcomes.${r.outcome}` as DashKey)}</Badge> : null}
      </span>
      <p className="m-0 rounded-xl bg-sand px-4 py-3 text-[15px] whitespace-pre-wrap">
        <strong>{r.message.sender.name}: </strong>
        {r.message.deleted ? t("chat.deleted") : (r.message.text ?? (r.message.attachment ? t(ATTACHMENT[r.message.attachment.kind]) : ""))}
      </p>
      {r.note ? <p className="m-0 text-sm text-ink-4">“{r.note}”</p> : null}
      {actions ? (
        <div className="flex flex-wrap gap-2">
          {(["dismiss", "delete_message", "block_sender"] as const).map((action) => (
            <form key={action} action={resolveChatReportAction}>
              <input type="hidden" name="report" value={r.id} />
              <input type="hidden" name="action" value={action} />
              <SubmitButton variant={action === "dismiss" ? "secondary" : "danger"} className="h-9 px-3.5 text-sm" pendingText={t("chat.saving")}>
                {action === "dismiss" ? t("chat.dismiss") : action === "delete_message" ? t("chat.deleteReported") : t("chat.blockSender")}
              </SubmitButton>
            </form>
          ))}
        </div>
      ) : null}
    </li>
  );
  return (
    <>
      <AutoRefresh seconds={15} />
      {header}
      {inbox.expiring.conversations > 0 && inbox.expiring.delete_on ? (
        <Notice tone="warn" icon="schedule" role="status">
          <div className="flex flex-col gap-2.5">
            <span>
              <strong>{t("chat.expiring", { count: inbox.expiring.conversations, date: day(inbox.expiring.delete_on) })}</strong> {t("chat.expiringText")}
            </span>
            <form action={keepAllChatsAction}>
              <SubmitButton variant="secondary" className="h-9 px-3.5 text-sm" pendingText={t("chat.saving")}>
                {t("chat.keepAll")}
              </SubmitButton>
            </form>
          </div>
        </Notice>
      ) : null}

      <nav aria-label={t("chat.views")} className="flex flex-wrap gap-2">
        {tab("all", t("chat.all"))}
        {tab("unread", t("chat.unread"))}
        {groups ? tab("direct", t("chat.people")) : null}
        {groups ? tab("group", t("chat.groups")) : null}
        {tab("reports", inbox.open_reports > 0 ? t("chat.reportsCount", { count: inbox.open_reports }) : t("chat.reports"))}
      </nav>

      {reports ? (
      <>
        <Section title={t("chat.reportsTitle")} titleId="h-chat-reports" description={t("chat.reportsIntro")} flush>
          {reports[0].items.length === 0 ? (
            <p className="m-0 px-5 py-4 text-[15px] text-muted sm:px-6">{t("chat.noReports")}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col p-0">{reports[0].items.map((r) => reportItem(r, true))}</ul>
          )}
        </Section>
        {reports[1].items.length ? (
          <Section title={t("chat.closedReports")} titleId="h-chat-closed" flush>
            <ul className="m-0 flex list-none flex-col p-0">{reports[1].items.slice(0, 50).map((r) => reportItem(r, false))}</ul>
          </Section>
        ) : null}
      </>
      ) : (
        <Section
          title={inbox.unread_count > 0 ? t("chat.unreadCount", { count: inbox.unread_count }) : t("chat.caughtUp")}
          titleId="h-chat-list"
          flush
          actions={
            <form role="search" className="flex gap-2">
              {view !== "all" ? <input type="hidden" name="view" value={view} /> : null}
              <label htmlFor="f-chat-q" className="sr-only">
                {t("chat.search")}
              </label>
              <input id="f-chat-q" name="q" type="search" defaultValue={q} placeholder={t("chat.search")} maxLength={100} className="input h-9 w-56 text-sm" />
              <button type="submit" className="inline-flex h-9 items-center rounded-[10px] border border-line-strong bg-white px-3 text-sm font-semibold">
                {t("chat.searchButton")}
              </button>
            </form>
          }
        >
          {inbox.items.length === 0 ? (
            <div className="p-5 sm:p-6">
              {q || view !== "all" ? (
                <p className="m-0 text-[15px] text-muted">{t("chat.noMatch")}</p>
              ) : (
                <EmptyState icon="forum" title={t("chat.none")}>
                  {t("chat.noneText")}
                </EmptyState>
              )}
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col p-0">
              {inbox.items.map((c) => {
                const soon = c.expires_on && new Date(`${c.expires_on}T00:00:00Z`).getTime() <= now.getTime() + 30 * 86_400_000;
                return (
                  <li key={c.id} className="border-t border-line-soft first:border-t-0">
                    <Link href={`/dashboard/chat/${c.id}`} className="flex items-center gap-3 px-5 py-3 text-midnight no-underline hover:bg-sand sm:px-6">
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-ivory text-ink-3">
                        <Icon name={c.kind === "group" ? "groups" : "person"} size={22} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={`flex items-center gap-2 truncate text-[15px] ${c.unread_count > 0 ? "font-extrabold" : "font-bold"}`}>
                          <span className="truncate">{c.title || t("chat.group")}</span>
                          {c.kind === "group" && c.member_count !== undefined ? <span className="text-[13px] font-normal text-muted">{t("chat.members", { count: c.member_count })}</span> : null}
                          {c.member?.blocked ? <Badge tone="neutral">{t("chat.blocked")}</Badge> : null}
                        </span>
                        <span className="truncate text-[13px] text-muted">{preview(c.last_message)}</span>
                        {soon && c.expires_on ? <span className="text-[13px] text-warn">{t("chat.deletedOn", { date: day(c.expires_on) })}</span> : null}
                      </span>
                      <span className="shrink-0 text-[13px] text-muted">{when(c.updated_at)}</span>
                      {c.unread_count > 0 ? <Badge tone="info">{t("chat.newCount", { count: c.unread_count })}</Badge> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      )}
      {settingsSection}
    </>
  );

}
