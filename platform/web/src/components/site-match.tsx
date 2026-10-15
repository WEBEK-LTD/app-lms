import Link from "next/link";
import { Icon } from "@/components/icon";
import { Notice } from "@/components/ui";
import { siteRunsLine, type SiteMatch } from "@/lib/app/site-match";

/**
 * 30 What the owner's WordPress site runs, and a warning when the app's type
 * can't show it. Nothing for plugins that don't report it.
 */
export function SiteMatchNote({ match, changeType = true }: { match: SiteMatch | null; changeType?: boolean }) {
  if (!match?.reported) return null;
  return (
    <>
      <span className="flex items-center gap-2 text-sm text-ink-4">
        <Icon name="category" size={18} className="text-muted" />
        {siteRunsLine(match)}
      </span>
      {match.warning ? (
        <Notice tone="warn" icon="warning" role="alert">
          {match.warning}
          {match.suggestion ? ` ${match.suggestion}` : ""}
          {changeType ? (
            <>
              {" "}
              <Link href="/dashboard/app-type" className="font-semibold">
                Change the app type
              </Link>
            </>
          ) : null}
        </Notice>
      ) : null}
    </>
  );
}
