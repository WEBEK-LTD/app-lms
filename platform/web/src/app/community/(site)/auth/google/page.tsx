import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/community/site/auth-shell";
import { siteContext } from "@/components/community/site/context";
import { GoogleReturn } from "@/components/community/site/google-return";
import { cmLinks } from "@/components/community/site/links";

export const metadata: Metadata = { title: "Continue with Google", robots: { index: false }, referrer: "no-referrer" };

/** 231 Where Google's sign-in comes back to. */
export default async function GoogleReturnPage() {
  const { lang, w } = await siteContext();
  return (
    <AuthShell w={w} lang={lang}>
      <h1>{w.continueGoogle}</h1>
      <GoogleReturn w={w} />
      <p className="cm-fine"><Link href={cmLinks.signIn()} className="cm-strong">{w.logIn}</Link></p>
    </AuthShell>
  );
}
