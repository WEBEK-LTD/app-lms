import Link from "next/link";
import { Notice } from "@/components/ui";

/**
 * 19 Shown in the admin while SMTP isn't set up: in production, emails are
 * then dropped (only a server log line says so), so clients and the team
 * miss them without anyone noticing.
 */
export function SmtpMissingNotice({ what, settingsLink = true }: { what: string; settingsLink?: boolean }) {
  return (
    <Notice tone="warn" icon="warning">
      Email isn&apos;t set up. {what}, and clients don&apos;t get their emails.{" "}
      {settingsLink ? (
        <>
          Set up SMTP in <Link href="/admin/settings#h-email">Settings › Email</Link>.
        </>
      ) : (
        "Set up SMTP below, in Email."
      )}
    </Notice>
  );
}
