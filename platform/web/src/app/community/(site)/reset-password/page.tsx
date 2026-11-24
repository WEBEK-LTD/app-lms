import type { Metadata } from "next";
import Link from "next/link";
import { NewPasswordForm, ResetForm } from "@/components/community/site/auth-forms";
import { AuthShell } from "@/components/community/site/auth-shell";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";

export const metadata: Metadata = { title: "Reset password", robots: { index: false }, referrer: "no-referrer" };

/** 231 A reset link by email; the link from it (?token=) sets the new password. */
export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = ((await searchParams).token ?? "").slice(0, 300);
  const { lang, w } = await siteContext();
  return (
    <AuthShell w={w} lang={lang}>
      <h1>{w.resetTitle}</h1>
      {token ? <NewPasswordForm w={w} token={token} /> : <ResetForm w={w} />}
      <p className="cm-fine"><Link href={cmLinks.signIn()} className="cm-strong">{w.logIn}</Link></p>
    </AuthShell>
  );
}
