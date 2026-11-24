import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/community/site/auth-forms";
import { AuthShell } from "@/components/community/site/auth-shell";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

/** 231 A link to choose a new password, by email. */
export default async function ResetPage() {
  const { lang, w } = await siteContext();
  return (
    <AuthShell w={w} lang={lang}>
      <h1>{w.resetTitle}</h1>
      <ResetForm w={w} />
      <p className="cm-fine"><Link href={cmLinks.signIn()} className="cm-strong">{w.logIn}</Link></p>
    </AuthShell>
  );
}
