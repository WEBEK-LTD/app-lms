"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";

/**
 * A client's page (Admin › Clients), when it couldn't be made at all (the
 * client, their apps or their licenses couldn't be read; each panel shows
 * its own failure otherwise): what happened in words with the reference
 * the server logged it under, rather than the site's general error page.
 */
export default function ClientPageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex max-w-[640px] flex-col gap-3" role="alert">
      <h1 className="m-0 flex items-center gap-2 text-[22px] font-extrabold">
        <Icon name="error" size={24} className="text-danger" />
        This client&apos;s page couldn&apos;t load
      </h1>
      <p className="m-0 text-[15px] text-ink-4">
        The client&apos;s account, apps or licenses couldn&apos;t be read. Nothing was changed.
        {error.digest ? ` The server log has the error under reference ${error.digest}.` : ""}
      </p>
      <div className="flex flex-wrap gap-2.5">
        <button type="button" onClick={() => reset()} className={`${btn.primary} h-11`}>
          <Icon name="refresh" size={20} />
          Try again
        </button>
        <Link href="/admin/clients" className={`${btn.secondary} h-11`}>
          Back to Clients
        </Link>
      </div>
    </div>
  );
}
