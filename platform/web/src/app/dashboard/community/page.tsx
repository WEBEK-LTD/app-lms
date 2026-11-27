import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KitCallout, KitEmpty, KitHeader, KitList, KitPage, KitRow, KitSection, KitStatus, KitThumb, kit } from "@/components/studio-page";
import { KitSegments } from "@/components/studio-page/parts";
import { appLabel } from "@/lib/app/label";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { decideModerationAction, decideReportAction, memberStatusAction, settingsAction } from "./actions";
import { tenantMembers, tenantModeration, tenantReports, tenantSettings } from "./source";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("appCommunity.title") };
}
export const dynamic = "force-dynamic";

const VIEWS = ["moderation", "reports", "members", "settings"] as const;
type View = (typeof VIEWS)[number];

/**
 * 235 Dashboard › Community: a Community app's own community, whose members
 * are the app's customers. The client moderates it, handles reports,
 * suspends members and sets who may create groups and the spam filter.
 */
export default async function AppCommunityPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; saved?: string; failed?: string }> }) {
  const sp = await searchParams;
  const context = await requireClient("settings");
  const { app } = context;
  if (!app) redirect("/dashboard/app-type");
  const { t, k, date } = await dashboardText();
  const name = appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app);
  const header = <KitHeader icon="forum" title={t("appCommunity.title")} description={t("appCommunity.intro", { app: name })} />;
  if ((app.appType as string) !== "community") {
    return (
      <KitPage>
        {header}
        <KitCallout icon="info">{t("appCommunity.notHere")}</KitCallout>
      </KitPage>
    );
  }
  const view: View = VIEWS.find((v) => v === sp.view) ?? "moderation";
  const [queue, reports] = await Promise.all([tenantModeration(app.id), tenantReports(app.id)]);
  const when = (at: string) => date(new Date(at), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const tabs = (
    <KitSegments
      label={t("appCommunity.title")}
      items={VIEWS.map((v) => ({
        key: v,
        href: `/dashboard/community?view=${v}`,
        label: t(`appCommunity.${v}`),
        count: v === "moderation" && queue.items.length ? queue.items.length : v === "reports" && reports.items.length ? reports.items.length : undefined,
        current: v === view,
      }))}
    />
  );
  const note = sp.saved ? <KitCallout icon="check_circle" tone="success" role="status">{t("appCommunity.saved")}</KitCallout> : sp.failed ? <KitCallout icon="error" tone="danger" role="alert">{t("appCommunity.failed")}</KitCallout> : null;
  let body;
  if (view === "moderation") {
    body = (
      <KitSection title={t("appCommunity.moderation")} titleId="h-cm-moderation" description={t("appCommunity.moderationIntro")}>
        {queue.items.length ? (
          <KitList label={t("appCommunity.moderation")}>
            {queue.items.map((m) => (
              <KitRow
                key={m.id}
                media={<KitThumb src={m.author?.avatar_url} icon="person" size={40} />}
                title={m.author?.display_name ?? "—"}
                badges={<><KitStatus tone="neutral">{m.target_type}</KitStatus><KitStatus tone="warn">{t(`appCommunity.cause_${m.cause}`)}</KitStatus>{m.report_count ? <KitStatus tone="danger">{t("appCommunity.reportsCount", { count: m.report_count })}</KitStatus> : null}</>}
                meta={<><span className="line-clamp-3">{m.preview}</span> · {when(m.created_at)}</>}
                actions={
                  <form action={decideModerationAction} className="flex gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <button type="submit" name="decision" value="approve" className={kit.main}>{t("appCommunity.approve")}</button>
                    <button type="submit" name="decision" value="remove" className={kit.quiet}>{t("appCommunity.remove")}</button>
                  </form>
                }
              />
            ))}
          </KitList>
        ) : (
          <KitEmpty icon="task_alt" title={t("appCommunity.nothingWaiting")}>{t("appCommunity.nothingWaitingText")}</KitEmpty>
        )}
      </KitSection>
    );
  } else if (view === "reports") {
    body = (
      <KitSection title={t("appCommunity.reports")} titleId="h-cm-reports" description={t("appCommunity.reportsIntro")}>
        {reports.items.length ? (
          <KitList label={t("appCommunity.reports")}>
            {reports.items.map((r) => (
              <KitRow
                key={r.id}
                media={<KitThumb src={r.reporter.avatar_url} icon="flag" size={40} />}
                title={`${r.target_type} · ${r.reason}`}
                meta={<>{t("appCommunity.reportedBy", { name: r.reporter.display_name })}{r.note ? ` · ${r.note}` : ""} · {when(r.created_at)}</>}
                actions={
                  <form action={decideReportAction} className="flex gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" name="status" value="actioned" className={kit.main}>{t("appCommunity.remove")}</button>
                    <button type="submit" name="status" value="dismissed" className={kit.quiet}>{t("appCommunity.dismiss")}</button>
                  </form>
                }
              />
            ))}
          </KitList>
        ) : (
          <KitEmpty icon="flag" title={t("appCommunity.noReports")} />
        )}
      </KitSection>
    );
  } else if (view === "members") {
    const members = await tenantMembers(app.id, sp.q);
    body = (
      <KitSection title={t("appCommunity.members")} titleId="h-cm-members" description={t("appCommunity.membersIntro")}>
        <form action="/dashboard/community" className="mb-4 flex gap-2">
          <input type="hidden" name="view" value="members" />
          <input type="search" name="q" defaultValue={sp.q ?? ""} placeholder={t("appCommunity.search")} aria-label={t("appCommunity.search")} className={kit.field} />
        </form>
        {members.items.length ? (
          <KitList label={t("appCommunity.members")}>
            {members.items.map((m) => (
              <KitRow
                key={m.id}
                media={<KitThumb src={m.avatar_url} icon="person" size={40} />}
                title={m.display_name}
                meta={`@${m.username}`}
                actions={
                  <form action={memberStatusAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <input name="reason" placeholder={t("appCommunity.reason")} aria-label={t("appCommunity.reason")} maxLength={1000} className={kit.field} />
                    <button type="submit" name="status" value="suspended" className={kit.quiet}>{t("appCommunity.suspend")}</button>
                    <button type="submit" name="status" value="active" className={kit.quiet}>{t("appCommunity.restore")}</button>
                  </form>
                }
              />
            ))}
          </KitList>
        ) : (
          <KitEmpty icon="group" title={t("appCommunity.noMembers")}>{t("appCommunity.noMembersText")}</KitEmpty>
        )}
      </KitSection>
    );
  } else {
    const s = await tenantSettings(app.id);
    body = (
      <KitSection title={t("appCommunity.settings")} titleId="h-cm-settings" description={t("appCommunity.settingsIntro")}>
        <form action={settingsAction} className="flex max-w-[640px] flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-[14px] font-semibold">
            {t("appCommunity.groupsPolicy")}
            <select name="groups_create_policy" defaultValue={s?.groups_create_policy ?? "everyone"} className={kit.field}>
              <option value="everyone">{t("appCommunity.groupsEveryone")}</option>
              <option value="badge_holders">{t("appCommunity.groupsBadge")}</option>
              <option value="chosen">{t("appCommunity.groupsChosen")}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-[14px] font-semibold">
            <input type="checkbox" name="spam_enabled" value="1" defaultChecked={s?.spam_filter.enabled ?? true} />
            {t("appCommunity.spamOn")}
          </label>
          <label className="flex flex-col gap-1.5 text-[14px] font-semibold">
            {t("appCommunity.blockedWords")}
            <textarea name="blocked_words" rows={4} defaultValue={s?.spam_filter.blocked_words.join("\n") ?? ""} className={`${kit.field} h-auto py-2`} />
          </label>
          <label className="flex flex-col gap-1.5 text-[14px] font-semibold">
            {t("appCommunity.blockedDomains")}
            <textarea name="blocked_domains" rows={4} defaultValue={s?.spam_filter.blocked_domains.join("\n") ?? ""} className={`${kit.field} h-auto py-2`} />
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1.5 text-[14px] font-semibold">
              {t("appCommunity.maxLinks")}
              <input type="number" name="max_links" min={0} max={20} defaultValue={s?.spam_filter.max_links ?? 3} className={kit.field} />
            </label>
            <label className="flex flex-col gap-1.5 text-[14px] font-semibold">
              {t("appCommunity.hideAfter")}
              <input type="number" name="hide_after_reports" min={1} max={50} defaultValue={s?.spam_filter.hide_after_reports ?? 3} className={kit.field} />
            </label>
          </div>
          <div><button type="submit" className={kit.main}>{t("appCommunity.save")}</button></div>
        </form>
      </KitSection>
    );
  }
  return (
    <KitPage>
      {header}
      {tabs}
      {note}
      {body}
    </KitPage>
  );
}
