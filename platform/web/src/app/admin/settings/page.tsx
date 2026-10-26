import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { smtpConfig } from "@/lib/env";
import { platformSettings } from "@/lib/settings/platform";
import { SmtpMissingNotice } from "../smtp-notice";
import { SETTINGS_PAGES } from "./pages";
import { settingsSummary } from "./summary";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

/**
 * Platform settings. Saved ones replace the matching Netlify variables
 * (secrets stay encrypted and are never shown); the server rows are
 * read-only. 95.1 Each kind has its own page; this one lists them with
 * what's set now.
 */
export default async function SettingsPage() {
  await requireAdmin();
  const settings = await platformSettings(await getStore(), { fresh: true });
  const summary = settingsSummary(settings);
  return (
    <>
      {/* 19 Without SMTP, production drops every email with only a server log line. */}
      {settings.get("smtp") || smtpConfig() ? null : <SmtpMissingNotice what="Emails to the team (new publishing and set-up requests, build problems) aren't sent" />}
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
        {SETTINGS_PAGES.map((page) => {
          const state = summary[page.href];
          return (
            <li key={page.href} data-settings-card="" className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="m-0 text-[17px] font-bold">
                  <Link href={page.href} className="text-midnight">
                    {page.label}
                  </Link>
                </h2>
                {state.attention ? <Badge tone="warn">Check</Badge> : null}
              </div>
              <p className="m-0 text-sm leading-relaxed text-ink-4">{page.text}</p>
              <p className="m-0 text-sm text-muted">Now: {state.now}</p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
