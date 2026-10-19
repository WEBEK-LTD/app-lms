import Link from "next/link";
import { Icon } from "@/components/icon";
import { Notice } from "@/components/ui";
import { siteRunsLine, type SiteMatch } from "@/lib/app/site-match";

/**
 * 30 What the owner's WordPress site runs, and a warning when the app's type
 * can't show it. Nothing for plugins that don't report it.
 */
export function SiteMatchNote({
  match,
  changeType = true,
  words,
}: {
  match: SiteMatch | null;
  changeType?: boolean;
  /** 56 In the dashboard: its translator and the link's words (the admin shows English). */
  words?: { k: (english: string) => string; changeType: string };
}) {
  if (!match?.reported) return null;
  const k = words?.k ?? ((text: string) => text);
  return (
    <>
      <span className="flex items-center gap-2 text-sm text-ink-4">
        <Icon name="category" size={18} className="text-muted" />
        {k(siteRunsLine(match))}
      </span>
      {match.warning ? (
        <Notice tone="warn" icon="warning" role="alert">
          {k(match.warning)}
          {match.suggestion ? ` ${k(match.suggestion)}` : ""}
          {changeType ? (
            <>
              {" "}
              <Link href="/dashboard/app-type" className="font-semibold">
                {/* i18n-ok: the admin's English; the dashboard passes `words` */ words?.changeType ?? "Change the app type"}
              </Link>
            </>
          ) : null}
        </Notice>
      ) : null}
    </>
  );
}
