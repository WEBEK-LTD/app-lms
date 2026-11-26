import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProviderButtons } from "@/components/community/site/auth-buttons";
import { SignUpForm } from "@/components/community/site/auth-forms";
import { AuthShell } from "@/components/community/site/auth-shell";
import { CM_DELETE } from "@/components/community/site/privacy-words";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { authProviders } from "@/components/community/site/source";

export const metadata: Metadata = { title: "Sign up", robots: { index: false } };

function nextOf(v: string | undefined): string {
  return v && v.startsWith(cmLinks.home()) && !v.startsWith("//") ? v : cmLinks.home();
}

/** 231 Join: Apple, Google, or email. */
export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = nextOf((await searchParams).next);
  const { lang, w, viewer } = await siteContext();
  if (viewer) redirect(next);
  const d = CM_DELETE[lang];
  return (
    <AuthShell w={w} lang={lang}>
      <h1>{w.signUp}</h1>
      <ProviderButtons w={w} providers={authProviders()} next={next} />
      <div className="cm-or"><span>{w.or}</span></div>
      <SignUpForm
        w={w}
        next={next}
        agree={<>{d.agreeBefore}<Link href={cmLinks.privacy()} className="cm-strong">{d.agreeLink}</Link>{d.agreeAfter}</>}
      />
      <p className="cm-fine">{w.alreadyMember} <Link href={cmLinks.signIn(next)} className="cm-strong">{w.logIn}</Link></p>
    </AuthShell>
  );
}
