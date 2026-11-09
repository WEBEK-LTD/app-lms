"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";

/**
 * Admin › Demo apps, when something on it failed (a build or a download
 * that couldn't be saved, or the page itself): what happened in words,
 * rather than the site's general error page. Refreshing the demos says how
 * each one went on the page itself (refresh.tsx).
 */
export default function DemoAppsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex max-w-[640px] flex-col gap-3" role="alert">
      <h1 className="m-0 flex items-center gap-2 text-[22px] font-extrabold">
        <Icon name="error" size={24} className="text-danger" />
        The demo apps page ran into a problem
      </h1>
      <p className="m-0 text-[15px] text-ink-4">
        What was asked may not have finished, or it took too long. Whatever was saved before it stopped is kept, so it&apos;s safe to try again.
        {error.digest ? ` (Reference: ${error.digest})` : ""}
      </p>
      <div className="flex flex-wrap gap-2.5">
        <button type="button" onClick={() => reset()} className={`${btn.primary} h-11`}>
          <Icon name="refresh" size={20} />
          Try again
        </button>
        <Link href="/admin/demos" className={`${btn.secondary} h-11`}>
          Back to Demo apps
        </Link>
      </div>
    </div>
  );
}
