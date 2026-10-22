import { dismissNoticeAction } from "@/app/actions/billing";
import type { OwnerNotice } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { Icon } from "./icon";
import { btn } from "./ui";

/**
 * 13.2 and 13.4 What the platform told the account's owner (also by email):
 * app users near the plan's limit and plans about to end, for every app of
 * the account, until closed or no longer true. 19 Also: the WordPress site
 * our team set up is ready, and the app's own API failed its last check.
 */
export async function OwnerNotices({ notices }: { notices: OwnerNotice[] }) {
  if (!notices.length) return null;
  // 56 Notices are saved in English; they show in the dashboard's language when their words are known.
  const { t, k } = await dashboardText();
  return (
    <section aria-label={t("nav.noticesLabel")} className="flex flex-col gap-2.5">
      {notices.map((n) => (
        <div
          key={n.id}
          data-notice={n.kind}
          role={n.tone === "warn" ? "alert" : "status"}
          className={`flex flex-wrap items-start gap-3 rounded-xl px-4 py-3.5 text-[15px] leading-relaxed text-ink-2 ${n.tone === "warn" ? "bg-warn-bg" : "bg-peach"}`}
        >
          <Icon
            name={n.kind.startsWith("app_users") ? "group" : n.kind === "wordpress_ready" ? "web" : n.kind === "api_check_failed" ? "warning" : n.kind === "chat_expiring" ? "forum" : n.kind === "integration_failed" ? "link" : "schedule"}
            size={22}
            className={n.tone === "warn" ? "text-warn" : "text-accent"}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <strong>{k(n.title)}</strong>
            <span>{k(n.body)}</span>
          </div>
          <div className="flex items-center gap-2">
            {n.linkUrl ? (
              <a href={n.linkUrl.replace(/^https?:\/\/[^/]+/, "")} className={`${btn.primary} h-9 px-3.5 text-sm`}>
                {n.linkLabel ? k(n.linkLabel) : t("common.open")}
              </a>
            ) : null}
            <form action={dismissNoticeAction}>
              <input type="hidden" name="id" value={n.id} />
              <button type="submit" aria-label={t("nav.closeNotice", { title: k(n.title) })} className={`${btn.ghost} h-9 px-2`}>
                <Icon name="close" size={20} />
              </button>
            </form>
          </div>
        </div>
      ))}
    </section>
  );
}
