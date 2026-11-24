import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { SitePage } from "@/components/community/site/page";
import { notices } from "@/components/community/site/source";
import { ago } from "@/components/community/site/words";
import { readAllAction } from "../trust-actions";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

const ICONS: Record<string, string> = {
  follow: "person_add",
  friend_request: "group_add",
  friend_accepted: "diversity_3",
  answer: "forum",
  answer_accepted: "check_circle",
  official_answer: "verified_user",
  reply: "reply",
  mention: "alternate_email",
  vote_milestone: "trending_up",
  badge_granted: "workspace_premium",
  badge_revoked: "remove_moderator",
  verification_approved: "workspace_premium",
  verification_rejected: "cancel",
  post_approved: "task_alt",
  post_removed: "block",
  report_resolved: "flag",
  yallapp_linked: "link",
};

/** 231 The member's notifications (the same ones are emailed, as they choose in Settings). */
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const sp = await searchParams;
  const { w, viewer } = await siteContext();
  if (!viewer) redirect(cmLinks.signIn(cmLinks.notifications()));
  const list = await notices({ cursor: sp.cursor });
  return (
    <SitePage active="none">
      <div style={{ maxWidth: 760 }}>
        <div className="cm-card cm-head">
          <h1 style={{ flex: 1 }}>{w.notifications}</h1>
          {list.unread ? (
            <form action={readAllAction}>
              <button type="submit" className="cm-btn g"><span className="ms" aria-hidden="true">done_all</span>{w.markAllRead}</button>
            </form>
          ) : null}
          <Link href={cmLinks.settings()} className="cm-link"><span className="ms" aria-hidden="true">settings</span>{w.settings}</Link>
        </div>
        {list.items.length ? (
          <ul className="cm-card cm-notices">
            {list.items.map((n) => (
              <li key={n.id} className={n.read ? "" : "new"}>
                <span className="ic"><span className="ms f" aria-hidden="true">{ICONS[n.kind] ?? "notifications"}</span></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {n.link ? <Link href={n.link}>{n.text}</Link> : n.text}
                  <div className="m">{ago(w, n.createdAt)}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="cm-empty"><span className="ms f" aria-hidden="true">notifications</span>{w.noNotices}</div>
        )}
        {list.next ? (
          <div className="cm-row" style={{ justifyContent: "center" }}>
            <Link href={`${cmLinks.notifications()}?cursor=${encodeURIComponent(list.next)}`} className="cm-btn g">{w.more}</Link>
          </div>
        ) : null}
      </div>
    </SitePage>
  );
}
