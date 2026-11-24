import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/community/site/auth-shell";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { verifyEmail } from "@/components/community/site/source";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false }, referrer: "no-referrer" };

/** 231 The link in the welcome email (?token=): the email is confirmed as the page opens. */
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = ((await searchParams).token ?? "").slice(0, 300);
  const { lang, w } = await siteContext();
  const r = token ? await verifyEmail(token) : { ok: false as const, code: "invalid_token" };
  return (
    <AuthShell w={w} lang={lang}>
      <h1>{w.verifyEmailTitle}</h1>
      <div className={`cm-note ${r.ok ? "ok" : "err"}`} role="status">
        <span className="ms f">{r.ok ? "check_circle" : "error"}</span>
        {r.ok ? w.emailVerified : w.errorResetLink}
      </div>
      <p className="cm-fine"><Link href={cmLinks.home()} className="cm-strong">{w.navHome}</Link></p>
    </AuthShell>
  );
}
