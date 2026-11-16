import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { keepAllChatsAction, resolveChatReportAction } from "@/app/actions/chat";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { KitBar, KitCallout, KitEmpty, KitHeader, KitList, KitPage, KitSection, KitStatus, KitThumb, kit } from "@/components/studio-page";
import { KitInspectorBody, KitInspectorHead, KitSegments } from "@/components/studio-page/parts";
import { KitTable, type KitTableRow } from "@/components/studio-page/table";
import { UpgradeHint } from "@/components/upgrade";
import type { DashKey } from "@/i18n/dashboard";
import { appLabel } from "@/lib/app/label";
import { contextCan, requireClient } from "@/lib/auth/session";
import { chatGroupsOn, chatSessionKind, chatSettingsOf, planHasChat } from "@/lib/chat/access";
import { dashboardChatDeps } from "@/lib/chat/dashboard";
import { ownerConversations, ownerReports, type OwnerMessageView, type ThreadView } from "@/lib/chat/owner";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { appPlan, effectivePlans } from "@/lib/entitlements";
import { plansIn } from "@/lib/marketing-lang";
import { hasFeature, lowestPlanWith } from "@/lib/plans";
import { isStudioProject } from "@/lib/studio/section";
import { AutoRefresh } from "../orders/refresh";
import { adminSchoolConversations, departmentsOf } from "@/lib/school/messages";
import { SchoolForm } from "../school/forms";
import { writeToTeachersAction } from "@/app/actions/chat";
import { ChatSettingsForm } from "./forms";
import { chatThread } from "./thread";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("chat.title") };
}
export const dynamic = "force-dynamic";

const WHEN: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" };
const VIEWS = ["all", "unread", "direct", "group", "teachers", "school", "reports"] as const;
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
  const text = await dashboardText();
  const { t, k, lang, date } = text;
  const store = await getStore();
  const now = new Date();
  const name = appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app);
  const plan = await appPlan(store, license, now);
  const settings = chatSettingsOf(app);
  const canSettings = contextCan(context, "settings");
  const header = <KitHeader icon="forum" title={t("chat.title")} description={t("chat.intro", { app: name })} />;
  // 132.139 The switches in one quiet card at the page's end.
  const settingsSection = canSettings ? (
    <KitSection id="settings" title={t("chat.settings")} titleId="h-chat-settings" help={t("chat.settingsIntro")} helpLabel={t("studioPage.helpSection")}>
      <ChatSettingsForm enabled={settings.enabled} courseGroups={settings.courseGroups} academy={app.appType === "lms"} />
    </KitSection>
  ) : null;

  // The app can't have chat, or not on this plan, or the owner turned it off.
  if (!chatSessionKind(app)) {
    return (
      <KitPage>
        {header}
        <KitCallout icon="info">{t("chat.notHere")}</KitCallout>
      </KitPage>
    );
  }
  if (!planHasChat(plan)) {
    const plans = plansIn(lang, await effectivePlans(store));
    // 132.59 A Studio project is offered Studio's plans, never the regular ones.
    const to = lowestPlanWith(plans, (p) => hasFeature(p, "chat"), plan?.id ?? null, isStudioProject(app) ? "studio" : undefined);
    return (
      <KitPage>
        {header}
        {to ? (
          <UpgradeHint title={t("chat.upgradeTitle", { plan: to.name })} to={{ id: to.id, name: to.name }} cta={t("overview.upgradeTo", { plan: to.name })}>
            {t("chat.upgradeText")}
          </UpgradeHint>
        ) : (
          <KitCallout icon="info">{t("chat.noPlan")}</KitCallout>
        )}
      </KitPage>
    );
  }
  if (!settings.enabled) {
    return (
      <KitPage>
        {header}
        <KitCallout tone="warn" icon="info">
          {canSettings ? t("chat.turnedOff") : t("chat.settingsOnly")}
        </KitCallout>
        {settingsSection}
      </KitPage>
    );
  }

  const query = await searchParams;
  const groups = chatGroupsOn(app);
  // 113.6 A school: its teachers (the administration writes to them) and their conversations with families.
  const school = app.connector?.kind === "school";
  const view: View = VIEWS.find((v) => v === query.view && (v !== "group" || groups) && ((v !== "teachers" && v !== "school") || school)) ?? "all";
  const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const deps = dashboardChatDeps(store, app, plan, now);
  // 132.160 The conversation open in the inspector (`?open=`), read before the list is (opening it marks it read).
  const openId = typeof query.open === "string" && /^[0-9a-f-]{36}$/i.test(query.open) ? query.open : null;
  const thread = openId && view !== "reports" && view !== "school" ? await chatThread({ deps, app, id: openId, before: null, text, inList: true }) : null;
  const reports = view === "reports" ? await Promise.all([ownerReports(deps, app, "open"), ownerReports(deps, app, "closed")]) : null;
  const allInbox = await ownerConversations(deps, app, { kind: view === "direct" || view === "group" ? view : undefined, unread: view === "unread", q, limit: 200 });
  // 113.3 The school's staff too: the administration writes to them as to its teachers.
  const workers = school ? (await store.listSchoolPeople(app.id)).filter((p) => p.active && (p.role === "teacher" || p.role === "staff")) : [];
  const teachers = workers.filter((p) => p.role === "teacher");
  const staff = workers.filter((p) => p.role === "staff");
  const teacherMembers = new Set<string>();
  for (const teacher of teachers) {
    const found = teacher.userId !== null ? await store.findChatMember(app.id, "hosted", String(teacher.userId)) : null;
    if (found) teacherMembers.add(found.id);
  }
  const inbox = view === "teachers" ? { ...allInbox, items: allInbox.items.filter((c) => c.member && teacherMembers.has(c.member.id)) } : allInbox;
  const schoolList = view === "school" ? await adminSchoolConversations(store, app, { q }) : null;
  const schoolIds = new Set(reports && school ? (await store.listSchoolConversations(app.id, { limit: 1000 })).map((c) => c.id) : []);
  const when = (iso: string) => t("listings.utc", { time: date(new Date(iso), WHEN) });
  const day = (iso: string) => date(new Date(`${iso}T00:00:00Z`));
  const preview = (m: OwnerMessageView | null) => {
    if (!m) return "";
    const text = m.deleted ? t("chat.deleted") : (m.text ?? (m.attachment ? t(ATTACHMENT[m.attachment.kind]) : ""));
    return m.sender.kind === "business" ? t("chat.you", { text }) : groups && m.sender.member_id ? `${m.sender.name}: ${text}` : text;
  };
  const listQuery = new URLSearchParams({ ...(view !== "all" ? { view } : {}), ...(q ? { q } : {}) }).toString();
  const views: { v: View; label: string; count?: number }[] = [
    { v: "all", label: t("chat.all") },
    { v: "unread", label: t("chat.unread"), count: allInbox.unread_count || undefined },
    ...(groups ? [{ v: "direct" as const, label: t("chat.people") }, { v: "group" as const, label: t("chat.groups") }] : []),
    ...(school ? [{ v: "teachers" as const, label: t("chat.teachers") }, { v: "school" as const, label: t("chat.schoolConversations") }] : []),
    { v: "reports", label: inbox.open_reports > 0 ? t("chat.reportsCount", { count: inbox.open_reports }) : t("chat.reports") },
  ];

  const reportItem = (r: Awaited<ReturnType<typeof ownerReports>>["items"][number], actions: boolean) => (
    <li key={r.id} className="flex flex-col gap-2.5 border-t border-(--sp-line-soft) px-3 py-4 first:border-t-0 sm:px-4">
      <span className="flex flex-wrap items-center gap-2 text-[13px] text-(--sp-muted)">
        <Icon name="flag" size={16} />
        {t("chat.reportedBy", { name: r.reporter.name, conversation: r.conversation_title || t("chat.group") })} · {t(`chat.reasons.${r.reason}` as DashKey)} · {when(r.created_at)}
        {r.outcome ? <KitStatus tone="neutral">{t(`chat.outcomes.${r.outcome}` as DashKey)}</KitStatus> : null}
      </span>
      <p className="m-0 rounded-2xl bg-(--sp-soft) px-4 py-3 text-[15px] whitespace-pre-wrap text-(--sp-ink)">
        <strong>{r.message.sender.name}: </strong>
        {r.message.deleted ? t("chat.deleted") : (r.message.text ?? (r.message.attachment ? t(ATTACHMENT[r.message.attachment.kind]) : ""))}
      </p>
      {r.note ? <p className="m-0 text-sm text-(--sp-muted)">“{r.note}”</p> : null}
      {schoolIds.has(r.message.conversation_id) ? (
        <Link href={`/dashboard/chat/school/${r.message.conversation_id}`} className="text-sm font-semibold">
          {t("chat.openConversation")}
        </Link>
      ) : null}
      {actions ? (
        <div className="flex flex-wrap gap-2">
          {(["dismiss", "delete_message", "block_sender"] as const).map((action) => (
            <form key={action} action={resolveChatReportAction}>
              <input type="hidden" name="report" value={r.id} />
              <input type="hidden" name="action" value={action} />
              <SubmitButton variant={action === "dismiss" ? "pill" : "danger"} className={action === "dismiss" ? "h-9" : "h-9 rounded-full px-4 text-[13px] font-bold"} pendingText={t("chat.saving")}>
                {action === "dismiss" ? t("chat.dismiss") : action === "delete_message" ? t("chat.deleteReported") : t("chat.blockSender")}
              </SubmitButton>
            </form>
          ))}
        </div>
      ) : null}
    </li>
  );
  // 132.160 A conversation as a row: the person or the group with what's new and the last message; the time at its end. The open one's thread in the inspector.
  const inspectorOf = (title: string, kind: "direct" | "group") =>
    thread
      ? {
          title: t("chat.conversation"),
          body: (
            <KitInspectorBody data-inspector-chat={title}>
              <KitInspectorHead icon={kind === "group" ? "groups" : "person"} title={thread.title} line={thread.line} badges={thread.blocked ? <KitStatus tone="neutral">{t("chat.blocked")}</KitStatus> : null} />
              {thread.body}
            </KitInspectorBody>
          ),
        }
      : undefined;
  const rowOf = (c: ThreadView): KitTableRow => {
    const soon = c.expires_on && new Date(`${c.expires_on}T00:00:00Z`).getTime() <= now.getTime() + 30 * 86_400_000;
    return {
      id: c.id,
      name: c.title || t("chat.group"),
      data: { "data-conversation": c.id },
      cells: [
        <>
          <KitThumb icon={c.kind === "group" ? "groups" : "person"} size={40} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className={`truncate text-[14.5px] ${c.unread_count > 0 ? "font-extrabold" : "font-bold"}`}>{c.title || t("chat.group")}</span>
              {c.unread_count > 0 ? <KitStatus tone="info">{t("chat.newCount", { count: c.unread_count })}</KitStatus> : null}
              {c.kind === "group" && c.member_count !== undefined ? <span className="text-[12.5px] font-normal text-(--sp-muted)">{t("chat.members", { count: c.member_count })}</span> : null}
              {c.member && teacherMembers.has(c.member.id) ? <KitStatus tone="info">{t("chat.teacherBadge")}</KitStatus> : null}
              {c.member?.blocked ? <KitStatus tone="neutral">{t("chat.blocked")}</KitStatus> : null}
            </span>
            <span className="truncate text-[12.5px] font-normal text-(--sp-muted)">{preview(c.last_message)}</span>
            {soon && c.expires_on ? <span className="text-[12.5px] font-normal text-warn">{t("chat.deletedOn", { date: day(c.expires_on) })}</span> : null}
          </span>
        </>,
        <span key="w" className="text-[13px] text-(--sp-muted)">
          {when(c.updated_at)}
        </span>,
      ],
      inspector: c.id === openId ? inspectorOf(c.title || t("chat.group"), c.kind) : undefined,
    };
  };
  const openRow = (id: string): KitTableRow => ({ id, name: thread?.title ?? "", cells: [], inspector: inspectorOf(thread?.title ?? "", thread?.kind ?? "direct") });

  // 132.139 The premium kit: the header, what's about to be deleted as one quiet strip with its action, the views as chips, then the conversations as one list, and the switches.
  return (
    <KitPage>
      <AutoRefresh seconds={thread ? 5 : 15} />
      {header}
      {inbox.expiring.conversations > 0 && inbox.expiring.delete_on ? (
        <KitCallout
          tone="warn"
          icon="schedule"
          role="status"
          title={t("chat.expiring", { count: inbox.expiring.conversations, date: day(inbox.expiring.delete_on) })}
          action={
            <form action={keepAllChatsAction}>
              <SubmitButton variant="pill" className="h-9" pendingText={t("chat.saving")}>
                {t("chat.keepAll")}
              </SubmitButton>
            </form>
          }
        >
          {t("chat.expiringText")}
        </KitCallout>
      ) : null}

      <KitBar>
        <KitSegments label={t("chat.views")} items={views.map(({ v, label, count }) => ({ key: v, href: v === "all" ? "/dashboard/chat" : `/dashboard/chat?view=${v}`, label, count, current: view === v }))} />
      </KitBar>

      {view === "teachers" ? (
        <KitSection title={t("chat.writeTeachers")} titleId="h-chat-teachers" description={t("chat.writeTeachersIntro")}>
          <SchoolForm action={writeToTeachersAction} submit={t("chat.send")} reset>
            <input type="hidden" name="client" value={`staff-${now.getTime()}`} />
            <label className="flex flex-col gap-1.5 text-[15px] font-semibold" htmlFor="f-teachers-to">
              {t("chat.writeTo")}
              <select id="f-teachers-to" name="to" defaultValue="all" className="input h-10">
                <option value="all">{t("chat.allTeachers", { count: teachers.length })}</option>
                {staff.length ? <option value="staff">{t("chat.allStaff", { count: staff.length })}</option> : null}
                {staff.length && teachers.length ? <option value="everyone">{t("chat.everyone", { count: workers.length })}</option> : null}
                {departmentsOf(workers).map((d) => (
                  <option key={d} value={`department:${d}`}>
                    {t("chat.department", { name: d })}
                  </option>
                ))}
                {workers.map((p) => (
                  <option key={p.id} value={`teacher:${p.id}`}>
                    {p.role === "staff" ? t("chat.staffName", { name: p.name }) : p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[15px] font-semibold" htmlFor="f-teachers-text">
              {t("chat.message")}
              <textarea id="f-teachers-text" name="text" rows={4} maxLength={4000} className="input min-h-[110px] py-2" />
            </label>
          </SchoolForm>
        </KitSection>
      ) : null}

      {schoolList ? (
        <>
          <KitCallout icon={schoolList.reads ? "visibility" : "lock"}>{schoolList.reads ? t("chat.schoolReads") : t("chat.schoolPrivate")}</KitCallout>
          <KitTable
            label={t("chat.schoolConversations")}
            title={t("chat.schoolConversations")}
            titleId="h-chat-school"
            columns={[
              { label: t("chat.conversation"), width: "minmax(0,1fr)" },
              { label: t("chat.lastMessage"), width: "minmax(130px,auto)", phone: "end" },
            ]}
            rows={schoolList.items.map(
              (c): KitTableRow => ({
                id: c.conversation.id,
                name: `${c.teacher?.name ?? "—"} · ${c.other?.name ?? "—"}`,
                href: `/dashboard/chat/school/${c.conversation.id}`,
                cells: [
                  <>
                    <KitThumb icon="school" size={40} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-[14.5px] font-bold">{`${c.teacher?.name ?? "—"} · ${c.other?.name ?? "—"}`}</span>
                        {c.reported ? <KitStatus tone="warn">{t("chat.reported")}</KitStatus> : null}
                        {c.conversation.closedAt ? <KitStatus tone="neutral">{t("chat.closed")}</KitStatus> : null}
                      </span>
                      <span className="truncate text-[12.5px] font-normal text-(--sp-muted)">{c.other?.role === "student" ? t("chat.student") : t("chat.parentOf", { names: c.students.join(", ") || "—" })}</span>
                    </span>
                  </>,
                  <span key="w" className="text-[13px]">
                    {when((c.conversation.lastMessageAt ?? c.conversation.createdAt).toISOString())}
                  </span>,
                ],
              }),
            )}
            empty={<p className="m-0 px-5 py-5 text-[15px] text-(--sp-muted)">{t("chat.schoolNone")}</p>}
          />
        </>
      ) : reports ? (
        <>
          <KitSection title={t("chat.reportsTitle")} titleId="h-chat-reports" description={t("chat.reportsIntro")} flush>
            {reports[0].items.length === 0 ? (
              <KitEmpty icon="flag" title={t("chat.noReports")} />
            ) : (
              <KitList>{reports[0].items.map((r) => reportItem(r, true))}</KitList>
            )}
          </KitSection>
          {reports[1].items.length ? (
            <KitSection title={t("chat.closedReports")} titleId="h-chat-closed" flush>
              <KitList>{reports[1].items.slice(0, 50).map((r) => reportItem(r, false))}</KitList>
            </KitSection>
          ) : null}
        </>
      ) : (
        <KitTable
          label={t("chat.title")}
          title={inbox.unread_count > 0 ? t("chat.unreadCount", { count: inbox.unread_count }) : t("chat.caughtUp")}
          titleId="h-chat-list"
          toolbar={
            <form role="search" className="flex min-w-0 flex-[1_1_260px] gap-2 sm:flex-[0_1_340px]">
              {view !== "all" ? <input type="hidden" name="view" value={view} /> : null}
              <label htmlFor="f-chat-q" className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[11px] border border-(--sp-line) bg-(--sp-surface) px-3 text-sm text-(--sp-faint) transition-colors focus-within:border-(--sp-ink) hover:border-(--sp-muted)">
                <Icon name="search" size={19} />
                <span className="sr-only">{t("chat.search")}</span>
                <input id="f-chat-q" name="q" type="search" defaultValue={q} placeholder={t("chat.search")} maxLength={100} className="min-w-0 flex-1 border-0 bg-transparent text-sm text-(--sp-ink) outline-0 placeholder:text-(--sp-faint)" />
              </label>
              <button type="submit" className={kit.quiet}>
                {t("chat.searchButton")}
              </button>
            </form>
          }
          columns={[
            { label: t("chat.conversation"), width: "minmax(0,1fr)" },
            { label: t("chat.lastMessage"), width: "minmax(120px,auto)", phone: "end" },
          ]}
          rows={inbox.items.map(rowOf)}
          open={{ param: "open", query: listQuery, id: thread ? openId : null, row: thread && openId && !inbox.items.some((c) => c.id === openId) ? openRow(openId) : null }}
          empty={
            q || view !== "all" ? (
              <p className="m-0 px-5 py-5 text-[15px] text-(--sp-muted)">{t("chat.noMatch")}</p>
            ) : (
              <KitEmpty icon="forum" title={t("chat.none")}>
                {t("chat.noneText")}
              </KitEmpty>
            )
          }
        />
      )}
      {settingsSection}
    </KitPage>
  );
}
